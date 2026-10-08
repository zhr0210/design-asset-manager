/* Test-owned SQLite extension. No production registration or external library. */
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <winternl.h>
#include <bcrypt.h>
#include <stdint.h>
#include <wchar.h>
#include <string.h>
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1

#define MAX_SOURCE (1024 * 1024)
#define MAX_HANDLES 128
#define UNSUPPORTED_STORAGE_ATTRIBUTES (FILE_ATTRIBUTE_SPARSE_FILE | FILE_ATTRIBUTE_COMPRESSED)
#define READ_SOURCE (GENERIC_READ | SYNCHRONIZE)
#define ATTR_SOURCE (FILE_READ_ATTRIBUTES | SYNCHRONIZE)
#define NO_REPARSE 0x00001000
#define OPEN_REPARSE 0x00200000
#define SYNC_NONALERT 0x00000020

typedef NTSTATUS (NTAPI *NtCreateFileFn)(PHANDLE, ACCESS_MASK, POBJECT_ATTRIBUTES,
  PIO_STATUS_BLOCK, PLARGE_INTEGER, ULONG, ULONG, ULONG, ULONG, PVOID, ULONG);
typedef NTSTATUS (NTAPI *NtQueryVolumeInformationFileFn)(HANDLE, PIO_STATUS_BLOCK, PVOID, ULONG, int);
typedef struct {LARGE_INTEGER total, available, actual; ULONG sectors, bytes;} VolumeSize;
typedef struct {
  sqlite3 *db;
  HANDLE retained[MAX_HANDLES], duplicate;
  unsigned count;
  DWORD volume, high, low;
} VfsPin;

static void release_pin(VfsPin *p) {
  if (p->duplicate) {CloseHandle(p->duplicate); p->duplicate = NULL;}
  while (p->count) CloseHandle(p->retained[--p->count]);
}
static void destroy_pin(void *data) {VfsPin *p = data; release_pin(p); sqlite3_free(p);}
static int refusal(sqlite3_context *ctx, const char *reason) {
  sqlite3_result_error(ctx, reason, -1); return 0;
}
static int inspect(HANDLE handle, BY_HANDLE_FILE_INFORMATION *info) {
  return GetFileInformationByHandle(handle, info) && !(info->dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT);
}
static int same_file(const BY_HANDLE_FILE_INFORMATION *a, const BY_HANDLE_FILE_INFORMATION *b) {
  return a->dwVolumeSerialNumber == b->dwVolumeSerialNumber &&
    a->nFileIndexHigh == b->nFileIndexHigh && a->nFileIndexLow == b->nFileIndexLow;
}
static uint64_t pair(DWORD high, DWORD low) {return ((uint64_t)high << 32) | low;}
static uint64_t stamp(FILETIME f) {return pair(f.dwHighDateTime, f.dwLowDateTime);}
static int same_state(const BY_HANDLE_FILE_INFORMATION *a, const BY_HANDLE_FILE_INFORMATION *b) {
  return same_file(a,b) && a->nNumberOfLinks == b->nNumberOfLinks && a->dwFileAttributes == b->dwFileAttributes &&
    pair(a->nFileSizeHigh,a->nFileSizeLow) == pair(b->nFileSizeHigh,b->nFileSizeLow) &&
    stamp(a->ftCreationTime) == stamp(b->ftCreationTime) && stamp(a->ftLastWriteTime) == stamp(b->ftLastWriteTime);
}
static int get_vfs(VfsPin *p, HANDLE *out) {
  *out = NULL;
  return sqlite3_file_control(p->db, "main", SQLITE_FCNTL_WIN32_GET_HANDLE, out) == SQLITE_OK &&
    *out && *out != INVALID_HANDLE_VALUE;
}
static int child(VfsPin *p, const WCHAR *name, int directory) {
  UNICODE_STRING text; OBJECT_ATTRIBUTES attributes; IO_STATUS_BLOCK io;
  HANDLE handle = NULL; BY_HANDLE_FILE_INFORMATION info;
  NtCreateFileFn create = (NtCreateFileFn)GetProcAddress(GetModuleHandleW(L"ntdll.dll"), "NtCreateFile");
  size_t length = wcslen(name);
  if (!create || !length || length > 255 || !wcscmp(name,L".") || !wcscmp(name,L"..") ||
      wcspbrk(name,L"\\/:") || p->count == MAX_HANDLES) return 0;
  text.Length = (USHORT)(length * sizeof(WCHAR)); text.MaximumLength = text.Length; text.Buffer = (PWSTR)name;
  memset(&attributes,0,sizeof(attributes)); attributes.Length = sizeof(attributes);
  attributes.RootDirectory = p->retained[p->count - 1]; attributes.ObjectName = &text;
  attributes.Attributes = OBJ_CASE_INSENSITIVE | NO_REPARSE;
  if (create(&handle, directory ? ATTR_SOURCE : READ_SOURCE, &attributes, &io, NULL, 0,
      FILE_SHARE_READ | FILE_SHARE_WRITE, FILE_OPEN,
      (directory ? FILE_DIRECTORY_FILE : FILE_NON_DIRECTORY_FILE) | SYNC_NONALERT | OPEN_REPARSE,
      NULL,0) < 0) return 0;
  if (!inspect(handle,&info) || !!(info.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) != !!directory) {
    CloseHandle(handle); return 0;
  }
  p->retained[p->count++] = handle; return 1;
}
static int pin_path(VfsPin *p, const WCHAR *path) {
  WCHAR temp[MAX_PATH], drive[8], copy[32768], *current, *end;
  DWORD temp_size = GetTempPathW(MAX_PATH,temp); size_t n = wcslen(path), i;
  BY_HANDLE_FILE_INFORMATION info; HANDLE root;
  if (!temp_size || temp_size >= MAX_PATH || n >= 32768 || n <= temp_size + 18 ||
      _wcsnicmp(path,temp,temp_size) || wcsncmp(path+temp_size,L"dam-native-target-",18) ||
      path[1] != L':' || path[2] != L'\\') return 0;
  for (i=0;i<n;i++) if (path[i] == L'/' || (path[i] == L':' && i != 1)) return 0;
  drive[0]=L'\\';drive[1]=L'\\';drive[2]=L'?';drive[3]=L'\\';drive[4]=path[0];drive[5]=L':';drive[6]=L'\\';drive[7]=0;
  root = CreateFileW(drive,ATTR_SOURCE,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_EXISTING,
    FILE_FLAG_BACKUP_SEMANTICS|FILE_FLAG_OPEN_REPARSE_POINT,NULL);
  if (root == INVALID_HANDLE_VALUE) return 0;
  if (!inspect(root,&info)) {CloseHandle(root);return 0;}
  p->retained[p->count++] = root;
  wcscpy_s(copy,32768,path+3); current=copy;
  while ((end = wcschr(current,L'\\')) != NULL) {
    *end=0; if (!child(p,current,1)) return 0; current=end+1;
  }
  if (wcscmp(current,L"library.sqlite") || !child(p,current,0)) return 0;
  return 1;
}
static int evidence(sqlite3_context *ctx, VfsPin *p) {
  HANDLE native; BY_HANDLE_FILE_INFORMATION info, vfs_info, after, current;
  VolumeSize space; IO_STATUS_BLOCK io; WCHAR fs[64]; DWORD volume, maximum, flags;
  NtQueryVolumeInformationFileFn query = (NtQueryVolumeInformationFileFn)GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"NtQueryVolumeInformationFile");
  BCRYPT_ALG_HANDLE algorithm=NULL; BCRYPT_HASH_HANDLE hash=NULL; BYTE digest[32], buffer[65536];
  char hex[65], *json; DWORD got; size_t i; LARGE_INTEGER zero; uint64_t size, available, units;
  int valid=0;
  if (!p->count || !get_vfs(p,&native) || !inspect(native,&vfs_info) || !inspect(p->duplicate,&after) ||
      !same_state(&vfs_info,&after) || !inspect(p->retained[p->count-1],&info) || !same_state(&info,&vfs_info) ||
      info.dwVolumeSerialNumber != p->volume || info.nFileIndexHigh != p->high || info.nFileIndexLow != p->low)
    return refusal(ctx,"BACKUP_VFS_SOURCE_IDENTITY_CHANGED");
  size = pair(info.nFileSizeHigh,info.nFileSizeLow);
  if (info.nNumberOfLinks != 1 || vfs_info.nNumberOfLinks != 1 || (info.dwFileAttributes & UNSUPPORTED_STORAGE_ATTRIBUTES) ||
      (vfs_info.dwFileAttributes & UNSUPPORTED_STORAGE_ATTRIBUTES) || !pair(info.nFileIndexHigh,info.nFileIndexLow) ||
      size < 100 || size > MAX_SOURCE || !stamp(info.ftCreationTime) || !stamp(info.ftLastWriteTime))
    return refusal(ctx,"BACKUP_VFS_SOURCE_KIND_REFUSED");
  if (!query || query(p->retained[p->count-1],&io,&space,sizeof(space),7) < 0 ||
      space.total.QuadPart <= 0 || space.available.QuadPart < 0 || space.actual.QuadPart < 0 || !space.sectors || !space.bytes)
    return refusal(ctx,"BACKUP_VFS_SPACE_UNKNOWN");
  units=(uint64_t)(space.available.QuadPart < space.actual.QuadPart ? space.available.QuadPart : space.actual.QuadPart);
  if (units > UINT64_MAX / space.sectors || units * space.sectors > UINT64_MAX / space.bytes)
    return refusal(ctx,"BACKUP_VFS_SPACE_UNKNOWN");
  available=units*space.sectors*space.bytes;
  if (!GetVolumeInformationByHandleW(p->retained[p->count-1],NULL,0,&volume,&maximum,&flags,fs,64) ||
      wcscmp(fs,L"NTFS") || volume != info.dwVolumeSerialNumber) return refusal(ctx,"BACKUP_VFS_FILESYSTEM_REFUSED");
  zero.QuadPart=0;
  if (!SetFilePointerEx(p->retained[p->count-1],zero,NULL,FILE_BEGIN) ||
      BCryptOpenAlgorithmProvider(&algorithm,BCRYPT_SHA256_ALGORITHM,NULL,0) < 0 ||
      BCryptCreateHash(algorithm,&hash,NULL,0,NULL,0,0) < 0) goto done;
  {
    uint64_t remaining=size;
    while (remaining) {
      DWORD wanted=remaining > sizeof(buffer) ? sizeof(buffer) : (DWORD)remaining;
      if (!ReadFile(p->retained[p->count-1],buffer,wanted,&got,NULL) || got != wanted || BCryptHashData(hash,buffer,got,0) < 0) goto done;
      remaining-=got;
    }
    if (!ReadFile(p->retained[p->count-1],buffer,1,&got,NULL) || got || BCryptFinishHash(hash,digest,sizeof(digest),0) < 0 ||
        !inspect(p->retained[p->count-1],&after) || !same_state(&info,&after) ||
        !get_vfs(p,&native) || !inspect(native,&vfs_info) || !same_state(&after,&vfs_info) ||
        !inspect(p->duplicate,&current) || !same_state(&after,&current)) goto done;
  }
  for (i=0;i<32;i++) {hex[i*2]="0123456789abcdef"[digest[i]>>4];hex[i*2+1]="0123456789abcdef"[digest[i]&15];}hex[64]=0;
  json=sqlite3_mprintf("{\"volume\":\"%llu\",\"file\":\"%llu\",\"size\":\"%llu\",\"created\":\"%llu\",\"written\":\"%llu\",\"links\":1,\"sha256\":\"%s\",\"available\":\"%llu\",\"filesystem\":\"NTFS\"}",
    (unsigned long long)info.dwVolumeSerialNumber,(unsigned long long)pair(info.nFileIndexHigh,info.nFileIndexLow),
    (unsigned long long)size,(unsigned long long)stamp(info.ftCreationTime),(unsigned long long)stamp(info.ftLastWriteTime),hex,(unsigned long long)available);
  if (!json) {sqlite3_result_error_nomem(ctx); goto done;}
  sqlite3_result_text(ctx,json,-1,sqlite3_free); valid=1;
done:
  if (hash) BCryptDestroyHash(hash); if (algorithm) BCryptCloseAlgorithmProvider(algorithm,0);
  return valid ? 1 : refusal(ctx,"BACKUP_VFS_READ_REFUSED");
}
static void pin_fn(sqlite3_context *ctx, int count, sqlite3_value **args) {
  VfsPin *p=sqlite3_user_data(ctx); WCHAR path[32768],actual[32768]; HANDLE native;
  const char *file=sqlite3_db_filename(p->db,"main"), *request=(const char *)sqlite3_value_text(args[0]);
  BY_HANDLE_FILE_INFORMATION independent, current;
  if (count != 1 || p->count || !file || !request || strlen(request) != (size_t)sqlite3_value_bytes(args[0]) ||
      !MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,request,-1,path,32768) ||
      !MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,file,-1,actual,32768) || _wcsicmp(path,actual) ||
      !get_vfs(p,&native) || !inspect(native,&current)) {refusal(ctx,"BACKUP_VFS_PIN_REFUSED");return;}
  if (!DuplicateHandle(GetCurrentProcess(),native,GetCurrentProcess(),&p->duplicate,READ_SOURCE,FALSE,0) ||
      !pin_path(p,path) || !inspect(p->retained[p->count-1],&independent) || !same_file(&independent,&current)) {
    release_pin(p);refusal(ctx,"BACKUP_VFS_PATH_REFUSED");return;
  }
  p->volume=current.dwVolumeSerialNumber;p->high=current.nFileIndexHigh;p->low=current.nFileIndexLow;
  if (!evidence(ctx,p)) release_pin(p);
}
static void read_fn(sqlite3_context *ctx,int count,sqlite3_value **args) {(void)count;(void)args;evidence(ctx,sqlite3_user_data(ctx));}
static void close_fn(sqlite3_context *ctx,int count,sqlite3_value **args) {(void)count;(void)args;release_pin(sqlite3_user_data(ctx));sqlite3_result_int(ctx,1);}
static void dispatch_fn(sqlite3_context *ctx,int count,sqlite3_value **args) {
  const char *operation = count == 2 ? (const char *)sqlite3_value_text(args[0]) : NULL;
  if (!operation || strlen(operation) != (size_t)sqlite3_value_bytes(args[0])) {refusal(ctx,"BACKUP_VFS_OPERATION_REFUSED");return;}
  if (!strcmp(operation,"pin")) pin_fn(ctx,1,args+1);
  else if (!strcmp(operation,"read")) read_fn(ctx,0,NULL);
  else if (!strcmp(operation,"close")) close_fn(ctx,0,NULL);
  else refusal(ctx,"BACKUP_VFS_OPERATION_REFUSED");
}
__declspec(dllexport) int sqlite3_damvfspin_init(sqlite3 *db,char **error,const sqlite3_api_routines *api) {
  VfsPin *p; int code;
  SQLITE_EXTENSION_INIT2(api); (void)error;
  p=sqlite3_malloc(sizeof(*p));if(!p)return SQLITE_NOMEM;memset(p,0,sizeof(*p));p->db=db;
  code=sqlite3_create_function_v2(db,"dam_windows_backup_vfs",2,SQLITE_UTF8|SQLITE_DIRECTONLY,p,dispatch_fn,NULL,NULL,destroy_pin);
  return code;
}
