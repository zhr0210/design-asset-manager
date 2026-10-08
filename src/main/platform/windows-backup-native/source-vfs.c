/* Main-private actual SQLite MAIN binding. Not an OS writer isolation claim. */
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <winternl.h>
#include <bcrypt.h>
#include <stdint.h>
#include <stddef.h>
#include <wchar.h>
#include <string.h>
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1

#define MAX_SOURCE (5 * 1024 * 1024)
#define MAX_HANDLES 128
#define UNSUPPORTED_STORAGE_ATTRIBUTES (FILE_ATTRIBUTE_SPARSE_FILE | FILE_ATTRIBUTE_COMPRESSED)
#define READ_SOURCE (GENERIC_READ | SYNCHRONIZE)
#define READ_WRITE_JOURNAL (GENERIC_READ | GENERIC_WRITE | SYNCHRONIZE)
#define ATTR_SOURCE (FILE_READ_ATTRIBUTES | SYNCHRONIZE)
#define NO_REPARSE 0x00001000
#define OPEN_REPARSE 0x00200000
#define SYNC_NONALERT 0x00000020

typedef NTSTATUS (NTAPI *NtCreateFileFn)(PHANDLE, ACCESS_MASK, POBJECT_ATTRIBUTES,
  PIO_STATUS_BLOCK, PLARGE_INTEGER, ULONG, ULONG, ULONG, ULONG, PVOID, ULONG);
typedef NTSTATUS (NTAPI *NtQueryVolumeInformationFileFn)(HANDLE, PIO_STATUS_BLOCK, PVOID, ULONG, int);
typedef struct {LARGE_INTEGER total, available, actual; ULONG sectors, bytes;} VolumeSize;
typedef struct VfsPin {
  sqlite3 *db;
  HANDLE retained[MAX_HANDLES], duplicate;
  unsigned count; int closeUnknown;
  DWORD volume, high, low;
  HANDLE journalGuard;
  BY_HANDLE_FILE_INFORMATION journalIdentity;
  char latestSourceSha[65], journalSourceSha[65];
  int journalReserved, journalHandedOff, journalCleanupAttempted;
  sqlite3_file *journalFile;
  const sqlite3_io_methods *journalOriginalMethods;
  sqlite3_io_methods journalMethods;
  int journalCloseObserved;
} VfsPin;

static void release_pin(VfsPin *p) {
  if(p->journalFile&&!p->journalCloseObserved)p->closeUnknown=1;
  if(p->journalGuard){HANDLE h=p->journalGuard;p->journalGuard=NULL;if(!CloseHandle(h))p->closeUnknown=1;}
  if (p->duplicate) {HANDLE h=p->duplicate;p->duplicate=NULL;if(!CloseHandle(h))p->closeUnknown=1;}
  while (p->count) {HANDLE h=p->retained[--p->count];p->retained[p->count]=NULL;if(!CloseHandle(h))p->closeUnknown=1;}
}
static void destroy_pin(void *data) {
  VfsPin *p=data;
  if(p->journalReserved&&!p->journalHandedOff)p->closeUnknown=1;
  release_pin(p);
  if(!p->closeUnknown)sqlite3_free(p);
}
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
    if(!CloseHandle(handle))p->closeUnknown=1; return 0;
  }
  p->retained[p->count++] = handle; return 1;
}
static int pin_path(VfsPin *p, const WCHAR *path) {
  WCHAR drive[8], copy[32768], *current, *end;
  size_t n = wcslen(path), i;
  BY_HANDLE_FILE_INFORMATION info; HANDLE root;
  if (n >= 32768 || n <= 3 || path[1] != L':' || path[2] != L'\\') return 0;
  for (i=0;i<n;i++) if (path[i] == L'/' || (path[i] == L':' && i != 1)) return 0;
  drive[0]=L'\\';drive[1]=L'\\';drive[2]=L'?';drive[3]=L'\\';drive[4]=path[0];drive[5]=L':';drive[6]=L'\\';drive[7]=0;
  root = CreateFileW(drive,ATTR_SOURCE,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_EXISTING,
    FILE_FLAG_BACKUP_SEMANTICS|FILE_FLAG_OPEN_REPARSE_POINT,NULL);
  if (root == INVALID_HANDLE_VALUE) return 0;
  if (!inspect(root,&info)) {if(!CloseHandle(root))p->closeUnknown=1;return 0;}
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
  if (p->closeUnknown || !p->count || !get_vfs(p,&native) || !inspect(native,&vfs_info) || !inspect(p->duplicate,&after) ||
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
  if (hash && BCryptDestroyHash(hash) < 0) p->closeUnknown=1;
  if (algorithm && BCryptCloseAlgorithmProvider(algorithm,0) < 0) p->closeUnknown=1;
  if (p->closeUnknown) return refusal(ctx,"BACKUP_SOURCE_CLOSE_UNKNOWN");
  if (valid) memcpy(p->latestSourceSha,hex,sizeof(hex));
  return valid ? 1 : refusal(ctx,"BACKUP_VFS_READ_REFUSED");
}

static NTSTATUS journal_component(VfsPin *p,const WCHAR *name,ACCESS_MASK access,ULONG disposition,HANDLE *handle) {
  UNICODE_STRING text; OBJECT_ATTRIBUTES attributes; IO_STATUS_BLOCK io;
  NtCreateFileFn create=(NtCreateFileFn)GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"NtCreateFile");
  size_t length=wcslen(name);
  *handle=NULL;
  if(!create||p->count<2)return (NTSTATUS)0xC0000001L;
  text.Length=(USHORT)(length*sizeof(WCHAR));text.MaximumLength=text.Length;text.Buffer=(PWSTR)name;
  memset(&attributes,0,sizeof(attributes));attributes.Length=sizeof(attributes);
  attributes.RootDirectory=p->retained[p->count-2];attributes.ObjectName=&text;attributes.Attributes=OBJ_CASE_INSENSITIVE|NO_REPARSE;
  return create(handle,access,&attributes,&io,NULL,FILE_ATTRIBUTE_NORMAL,FILE_SHARE_READ|FILE_SHARE_WRITE,
    disposition,FILE_NON_DIRECTORY_FILE|SYNC_NONALERT|OPEN_REPARSE,NULL,0);
}
static int regular_journal(HANDLE handle,BY_HANDLE_FILE_INFORMATION *info) {
  return inspect(handle,info)&&!(info->dwFileAttributes&(FILE_ATTRIBUTE_DIRECTORY|UNSUPPORTED_STORAGE_ATTRIBUTES))&&
    info->nNumberOfLinks==1&&pair(info->nFileIndexHigh,info->nFileIndexLow)&&stamp(info->ftCreationTime);
}
static int exact_journal(const BY_HANDLE_FILE_INFORMATION *a,const BY_HANDLE_FILE_INFORMATION *b) {
  return same_file(a,b)&&stamp(a->ftCreationTime)==stamp(b->ftCreationTime);
}
static int exact_win32(VfsPin *p) {
  sqlite3_vfs *vfs=NULL;
  return sqlite3_file_control(p->db,"main",SQLITE_FCNTL_VFS_POINTER,&vfs)==SQLITE_OK&&
    vfs&&vfs==sqlite3_vfs_find("win32")&&vfs->zName&&!strcmp(vfs->zName,"win32");
}
static void reserve_journal_fn(sqlite3_context *ctx,VfsPin *p) {
  const WCHAR *sidecars[]={L"library.sqlite-wal",L"library.sqlite-shm"};
  size_t i;HANDLE existing=NULL;NTSTATUS status;
  if(p->closeUnknown||!p->count||p->journalReserved||!sqlite3_get_autocommit(p->db)||!exact_win32(p)||!p->latestSourceSha[0]){
    refusal(ctx,"BACKUP_SOURCE_JOURNAL_RESERVATION_REFUSED");return;
  }
  for(i=0;i<2;i++){
    status=journal_component(p,sidecars[i],ATTR_SOURCE,FILE_OPEN,&existing);
    if(existing){HANDLE h=existing;existing=NULL;if(!CloseHandle(h))p->closeUnknown=1;}
    if(status!=(NTSTATUS)0xC0000034L){refusal(ctx,p->closeUnknown?"BACKUP_SOURCE_CLOSE_UNKNOWN":"BACKUP_SOURCE_SIDECAR_REFUSED");return;}
  }
  // Snapshot the actual source at reservation time without a SQLite read that
  // could consume a preexisting sidecar. Final Main checks still reject drift
  // relative to the original backup image before granting any domain write.
  if(!evidence(ctx,p))return;
  status=journal_component(p,L"library.sqlite-journal",READ_WRITE_JOURNAL,FILE_CREATE,&p->journalGuard);
  if(status<0){
    if(p->journalGuard){HANDLE h=p->journalGuard;p->journalGuard=NULL;if(!CloseHandle(h))p->closeUnknown=1;}
    refusal(ctx,p->closeUnknown?"BACKUP_SOURCE_CLOSE_UNKNOWN":"BACKUP_SOURCE_JOURNAL_RESERVATION_REFUSED");return;
  }
  p->journalReserved=1;
  if(!regular_journal(p->journalGuard,&p->journalIdentity)||pair(p->journalIdentity.nFileSizeHigh,p->journalIdentity.nFileSizeLow)!=0){
    p->closeUnknown=1;refusal(ctx,"BACKUP_SOURCE_JOURNAL_RESERVATION_REFUSED");return;
  }
  memcpy(p->journalSourceSha,p->latestSourceSha,sizeof(p->journalSourceSha));
  sqlite3_result_int(ctx,1);
}
static int journal_close(sqlite3_file *file) {
  // This method table belongs only to this actual journal object. No shared
  // VFS, original method table or unrelated connection is mutated.
  VfsPin *p=(VfsPin*)((char*)file->pMethods - offsetof(VfsPin,journalMethods));
  int result;
  if(p->journalFile!=file||p->journalCloseObserved||!p->journalOriginalMethods||!p->journalOriginalMethods->xClose)return SQLITE_IOERR_CLOSE;
  p->journalCloseObserved=1;
  file->pMethods=p->journalOriginalMethods;
  result=p->journalOriginalMethods->xClose(file);
  if(result!=SQLITE_OK)p->closeUnknown=1;
  return result;
}
static void handoff_journal_fn(sqlite3_context *ctx,VfsPin *p) {
  sqlite3_file *journal=NULL;HANDLE native=NULL;BY_HANDLE_FILE_INFORMATION guarded,current;
  if(p->closeUnknown||!p->journalReserved||p->journalHandedOff||!p->journalGuard||sqlite3_get_autocommit(p->db)||!exact_win32(p)||
      sqlite3_file_control(p->db,"main",SQLITE_FCNTL_JOURNAL_POINTER,&journal)!=SQLITE_OK||!journal||!journal->pMethods||
      !journal->pMethods->xClose||!journal->pMethods->xFileControl||journal->pMethods->xFileControl(journal,SQLITE_FCNTL_WIN32_GET_HANDLE,&native)!=SQLITE_OK||
      !native||native==INVALID_HANDLE_VALUE||!regular_journal(native,&current)||!regular_journal(p->journalGuard,&guarded)||
      !exact_journal(&current,&p->journalIdentity)||!exact_journal(&guarded,&p->journalIdentity)||
      pair(current.nFileSizeHigh,current.nFileSizeLow)==0){refusal(ctx,"BACKUP_SOURCE_JOURNAL_HANDOFF_REFUSED");return;}
  p->journalFile=journal;p->journalOriginalMethods=journal->pMethods;p->journalMethods=*journal->pMethods;
  p->journalMethods.xClose=journal_close;p->journalCloseObserved=0;journal->pMethods=&p->journalMethods;
  {HANDLE h=p->journalGuard;p->journalGuard=NULL;if(!CloseHandle(h)){p->closeUnknown=1;refusal(ctx,"BACKUP_SOURCE_CLOSE_UNKNOWN");return;}}
  p->journalHandedOff=1;sqlite3_result_int(ctx,1);
}
static int cleanup_reserved_journal(sqlite3_context *ctx,VfsPin *p) {
  HANDLE deletion=NULL;BY_HANDLE_FILE_INFORMATION current;FILE_DISPOSITION_INFO disposition;NTSTATUS status;int ok=0;
  if(!p->journalReserved)return 1;
  if(p->journalHandedOff){
    if(p->closeUnknown||!p->journalCloseObserved)return 0;
    // SQLite's successful xClose is distinct from journal pathname deletion.
    // Observe only; never delete any post-handoff pathname ourselves.
    status=journal_component(p,L"library.sqlite-journal",ATTR_SOURCE,FILE_OPEN,&deletion);
    if(deletion){HANDLE h=deletion;deletion=NULL;if(!CloseHandle(h))p->closeUnknown=1;}
    if(status!=(NTSTATUS)0xC0000034L||p->closeUnknown){p->closeUnknown=1;return 0;}
    return 1;
  }
  if(p->journalCleanupAttempted||p->closeUnknown||!p->journalGuard)return 0;
  p->journalCleanupAttempted=1;
  if(!regular_journal(p->journalGuard,&current)||!exact_journal(&current,&p->journalIdentity)||
      pair(current.nFileSizeHigh,current.nFileSizeLow)!=0||!sqlite3_get_autocommit(p->db)||!evidence(ctx,p)||
      strcmp(p->latestSourceSha,p->journalSourceSha))goto done;
  {HANDLE h=p->journalGuard;p->journalGuard=NULL;if(!CloseHandle(h)){p->closeUnknown=1;goto done;}}
  // Reopen only this retained parent's component. Never use DELETE_ON_CLOSE:
  // identity, link count and emptiness must pass before deletion is requested.
  status=journal_component(p,L"library.sqlite-journal",DELETE|ATTR_SOURCE,FILE_OPEN,&deletion);
  if(status<0||!regular_journal(deletion,&current)||!exact_journal(&current,&p->journalIdentity)||
      pair(current.nFileSizeHigh,current.nFileSizeLow)!=0)goto done;
  disposition.DeleteFile=TRUE;
  if(!SetFileInformationByHandle(deletion,FileDispositionInfo,&disposition,sizeof(disposition)))goto done;
  ok=1;
done:
  if(deletion){HANDLE h=deletion;deletion=NULL;if(!CloseHandle(h)){p->closeUnknown=1;ok=0;}}
  if(!ok)p->closeUnknown=1;
  else p->journalReserved=0;
  return ok;
}
static void pin_fn(sqlite3_context *ctx, int count, sqlite3_value **args) {
  VfsPin *p=sqlite3_user_data(ctx); WCHAR path[32768],actual[32768]; HANDLE native;
  const char *file=sqlite3_db_filename(p->db,"main"), *request=(const char *)sqlite3_value_text(args[0]);
  BY_HANDLE_FILE_INFORMATION independent, current;
  if (count != 1 || p->closeUnknown || p->count || !file || !request || strlen(request) != (size_t)sqlite3_value_bytes(args[0]) ||
      !MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,request,-1,path,32768) ||
      !MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,file,-1,actual,32768) || _wcsicmp(path,actual) ||
      !get_vfs(p,&native) || !inspect(native,&current)) {refusal(ctx,"BACKUP_VFS_PIN_REFUSED");return;}
  if (!DuplicateHandle(GetCurrentProcess(),native,GetCurrentProcess(),&p->duplicate,READ_SOURCE,FALSE,0) ||
      !pin_path(p,path) || !inspect(p->retained[p->count-1],&independent) || !same_file(&independent,&current)) {
    release_pin(p);refusal(ctx,p->closeUnknown?"BACKUP_SOURCE_CLOSE_UNKNOWN":"BACKUP_VFS_PATH_REFUSED");return;
  }
  p->volume=current.dwVolumeSerialNumber;p->high=current.nFileIndexHigh;p->low=current.nFileIndexLow;
  if (!evidence(ctx,p)) release_pin(p);
}
static void read_fn(sqlite3_context *ctx,int count,sqlite3_value **args) {(void)count;(void)args;evidence(ctx,sqlite3_user_data(ctx));}
static void close_fn(sqlite3_context *ctx,int count,sqlite3_value **args) {(void)count;(void)args;VfsPin *p=sqlite3_user_data(ctx);cleanup_reserved_journal(ctx,p);release_pin(p);if(p->closeUnknown)refusal(ctx,"BACKUP_SOURCE_CLOSE_UNKNOWN");else{p->journalReserved=p->journalHandedOff=p->journalCleanupAttempted=0;p->journalFile=NULL;p->journalOriginalMethods=NULL;p->journalCloseObserved=0;p->latestSourceSha[0]=0;sqlite3_result_int(ctx,1);}}
static void dispatch_fn(sqlite3_context *ctx,int count,sqlite3_value **args) {
  VfsPin *p=sqlite3_user_data(ctx);
  const char *operation = count == 2 ? (const char *)sqlite3_value_text(args[0]) : NULL;
  if (!operation || strlen(operation) != (size_t)sqlite3_value_bytes(args[0])) {refusal(ctx,"BACKUP_VFS_OPERATION_REFUSED");return;}
  if (!strcmp(operation,"pin")) pin_fn(ctx,1,args+1);
  else if (!strcmp(operation,"read")) read_fn(ctx,0,NULL);
  else if (!strcmp(operation,"close")) close_fn(ctx,0,NULL);
  else if (!strcmp(operation,"reserve-journal")) reserve_journal_fn(ctx,p);
  else if (!strcmp(operation,"handoff-journal")) handoff_journal_fn(ctx,p);
  else refusal(ctx,"BACKUP_VFS_OPERATION_REFUSED");
}
__declspec(dllexport) int sqlite3_source_init(sqlite3 *db,char **error,const sqlite3_api_routines *api) {
  VfsPin *p; int code;
  SQLITE_EXTENSION_INIT2(api); (void)error;
  p=sqlite3_malloc(sizeof(*p));if(!p)return SQLITE_NOMEM;memset(p,0,sizeof(*p));p->db=db;
  code=sqlite3_create_function_v2(db,"dam_windows_backup_source",2,SQLITE_UTF8|SQLITE_DIRECTONLY,p,dispatch_fn,NULL,NULL,destroy_pin);
  return code;
}
