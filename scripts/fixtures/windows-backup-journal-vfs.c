/* Synthetic-only named VFS: actual SQLite main, handle-owned DELETE journal.
 * Not installed as the default VFS and never registered by the product. */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winternl.h>
#include <stdint.h>
#include <wchar.h>
#include <string.h>
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1

#define HANDLE_LIMIT 128
#define JOURNAL_LIMIT (2 * 1024 * 1024)
#define SOURCE_LIMIT ((1 + 4) * 1024 * 1024)
#define TRANSACTION_LIMIT 128
#define UNSUPPORTED_STORAGE_ATTRIBUTES (FILE_ATTRIBUTE_SPARSE_FILE | FILE_ATTRIBUTE_COMPRESSED)
#define NO_REPARSE 0x00001000
#define OPEN_REPARSE 0x00200000
#define SYNC_NONALERT 0x00000020
typedef NTSTATUS (NTAPI *NtCreateFileFn)(PHANDLE, ACCESS_MASK, POBJECT_ATTRIBUTES,
 PIO_STATUS_BLOCK, PLARGE_INTEGER, ULONG, ULONG, ULONG, ULONG, PVOID, ULONG);
typedef struct Owner Owner;
typedef struct {sqlite3_file base; Owner *owner;} Journal;
typedef struct {sqlite3_file base;Owner *owner;sqlite3_file *actual;} Main;
struct Owner {
 sqlite3_vfs vfs, *parent;
 HANDLE handles[HANDLE_LIMIT], journal;
 BY_HANDLE_FILE_INFORMATION identities[HANDLE_LIMIT], journalIdentity;
 unsigned count;
 int registered, mainOpen, journalClosed, faultDelete, bootstrapDestroyed, faultCreateCollision, mainCloseUnconfirmed;
 unsigned created, reads, writes, syncs, closes, deleted, refused;
 char name[80], source[32768], journalPath[32768], walPath[32768], shmPath[32768], reason[100];
};
static int reject(Owner *o, const char *reason, int code) {
 ++o->refused; strcpy_s(o->reason,sizeof(o->reason),reason); return code;
}
static int inspect(HANDLE h, BY_HANDLE_FILE_INFORMATION *i) {
 return GetFileInformationByHandle(h,i) && !(i->dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT);
}
static int same(const BY_HANDLE_FILE_INFORMATION *a,const BY_HANDLE_FILE_INFORMATION *b) {
 return a->dwVolumeSerialNumber==b->dwVolumeSerialNumber && a->nFileIndexHigh==b->nFileIndexHigh && a->nFileIndexLow==b->nFileIndexLow;
}
static int stable(Owner *o) {
 unsigned n; BY_HANDLE_FILE_INFORMATION current;
 for(n=0;n<o->count;n++) if(!inspect(o->handles[n],&current) || !same(&current,&o->identities[n]) ||
  !!(current.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY)!=(n+1<o->count) ||
  (n+1==o->count && (current.nNumberOfLinks!=1 || (current.dwFileAttributes&UNSUPPORTED_STORAGE_ATTRIBUTES)))) return 0;
 return o->count>1;
}
static HANDLE relative(Owner *o,const WCHAR *name,int directory,ACCESS_MASK access,ULONG disposition,ULONG share,NTSTATUS *status) {
 UNICODE_STRING text; OBJECT_ATTRIBUTES attributes; IO_STATUS_BLOCK io; HANDLE h=NULL;
 NtCreateFileFn create=(NtCreateFileFn)GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"NtCreateFile");
 size_t n=wcslen(name);
 if(!create || !n || n>255 || !wcscmp(name,L".") || !wcscmp(name,L"..") || wcspbrk(name,L"\\/:")) { *status=(NTSTATUS)0xC000000DL; return NULL; }
 text.Length=(USHORT)(n*sizeof(WCHAR));text.MaximumLength=text.Length;text.Buffer=(PWSTR)name;
 memset(&attributes,0,sizeof(attributes));attributes.Length=sizeof(attributes);
 attributes.RootDirectory=o->handles[o->count-1];attributes.ObjectName=&text;attributes.Attributes=OBJ_CASE_INSENSITIVE|NO_REPARSE;
 *status=create(&h,access,&attributes,&io,NULL,0,share,disposition,
  (directory?FILE_DIRECTORY_FILE:FILE_NON_DIRECTORY_FILE)|SYNC_NONALERT|OPEN_REPARSE,NULL,0);
 return *status<0?NULL:h;
}
static int retain(Owner *o,const WCHAR *name,int directory) {
 NTSTATUS status; BY_HANDLE_FILE_INFORMATION info;
 HANDLE h=relative(o,name,directory,(directory?FILE_READ_ATTRIBUTES:GENERIC_READ)|SYNCHRONIZE,
  FILE_OPEN,FILE_SHARE_READ|FILE_SHARE_WRITE,&status);
 if(!h || o->count==HANDLE_LIMIT) {if(h)CloseHandle(h);return 0;}
 if(!inspect(h,&info) || !!(info.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY)!=!!directory) {CloseHandle(h);return 0;}
 o->handles[o->count]=h;o->identities[o->count++]=info;return 1;
}
static void release(Owner *o) {
 if(o->journal){CloseHandle(o->journal);o->journal=NULL;}
 while(o->count)CloseHandle(o->handles[--o->count]);
}
static int pin(Owner *o,const char *utf8) {
 WCHAR path[32768],temp[MAX_PATH],drive[8],copy[32768],*part,*end,fs[64];
 DWORD size=GetTempPathW(MAX_PATH,temp),serial,maximum,flags;BY_HANDLE_FILE_INFORMATION info;HANDLE root;size_t n,i;
 if(!size || size>=MAX_PATH || !MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,utf8,-1,path,32768))return 0;
 n=wcslen(path);
 if(n<=size+18 || n>=32768 || _wcsnicmp(path,temp,size) || wcsncmp(path+size,L"dam-native-target-",18) || path[1]!=L':' || path[2]!=L'\\')return 0;
 for(i=0;i<n;i++)if(path[i]==L'/' || (path[i]==L':' && i!=1))return 0;
 wcscpy_s(drive,8,L"\\\\?\\X:\\");drive[4]=path[0];
 root=CreateFileW(drive,FILE_READ_ATTRIBUTES|SYNCHRONIZE,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_EXISTING,
  FILE_FLAG_BACKUP_SEMANTICS|FILE_FLAG_OPEN_REPARSE_POINT,NULL);
 if(root==INVALID_HANDLE_VALUE || !inspect(root,&info)){if(root!=INVALID_HANDLE_VALUE)CloseHandle(root);return 0;}
 o->handles[0]=root;o->identities[0]=info;o->count=1;
 wcscpy_s(copy,32768,path+3);part=copy;
 while((end=wcschr(part,L'\\'))!=NULL){*end=0;if(!retain(o,part,1))return 0;part=end+1;}
 if(wcscmp(part,L"library.sqlite") || !retain(o,part,0))return 0;
 info=o->identities[o->count-1];
 if(info.nNumberOfLinks!=1 || !GetVolumeInformationByHandleW(o->handles[o->count-1],NULL,0,&serial,&maximum,&flags,fs,64) ||
  wcscmp(fs,L"NTFS") || serial!=info.dwVolumeSerialNumber || info.nFileSizeHigh || info.nFileSizeLow<100 || info.nFileSizeLow>1024*1024)return 0;
 strcpy_s(o->source,sizeof(o->source),utf8);
 strcpy_s(o->journalPath,sizeof(o->journalPath),utf8);strcat_s(o->journalPath,sizeof(o->journalPath),"-journal");
 strcpy_s(o->walPath,sizeof(o->walPath),utf8);strcat_s(o->walPath,sizeof(o->walPath),"-wal");
 strcpy_s(o->shmPath,sizeof(o->shmPath),utf8);strcat_s(o->shmPath,sizeof(o->shmPath),"-shm");
 return 1;
}
/* Open relative to the retained control directory, never through pathname.
 * Any existing slot is a refusal, including zero bytes and hot journals. */
static int absent(Owner *o,const WCHAR *leaf) {
 NTSTATUS status;HANDLE h;
 --o->count;h=relative(o,leaf,0,FILE_READ_ATTRIBUTES|SYNCHRONIZE,FILE_OPEN,FILE_SHARE_READ|FILE_SHARE_WRITE|FILE_SHARE_DELETE,&status);++o->count;
 if(h){CloseHandle(h);return 0;}
 return (uint32_t)status==0xC0000034u; /* STATUS_OBJECT_NAME_NOT_FOUND only. */
}
static int no_slots(Owner *o) {
 return absent(o,L"library.sqlite-journal") && absent(o,L"library.sqlite-wal") && absent(o,L"library.sqlite-shm");
}
static int journal_ok(Owner *o) {
 BY_HANDLE_FILE_INFORMATION info;
 return o->journal && stable(o) && inspect(o->journal,&info) && same(&info,&o->journalIdentity) && info.nNumberOfLinks==1 &&
 !(info.dwFileAttributes&(FILE_ATTRIBUTE_DIRECTORY|UNSUPPORTED_STORAGE_ATTRIBUTES)) && info.nFileSizeHigh==0 && info.nFileSizeLow<=JOURNAL_LIMIT;
}
static int journal_close(sqlite3_file *file) {
 Journal *j=(Journal*)file;j->owner->journalClosed=1;++j->owner->closes;file->pMethods=NULL;return SQLITE_OK;
}
static int seek(Owner *o,sqlite3_int64 offset) {
 LARGE_INTEGER at;at.QuadPart=offset;
 return offset>=0 && offset<=JOURNAL_LIMIT && SetFilePointerEx(o->journal,at,NULL,FILE_BEGIN);
}
static int journal_read(sqlite3_file *file,void *buffer,int amount,sqlite3_int64 offset) {
 Owner *o=((Journal*)file)->owner;DWORD got=0;
 if(amount<0 || offset<0 || offset>JOURNAL_LIMIT-amount || !journal_ok(o) || !seek(o,offset) ||
  !ReadFile(o->journal,buffer,(DWORD)amount,&got,NULL))return reject(o,"JOURNAL_READ_REFUSED",SQLITE_IOERR_READ);
 ++o->reads;if(got!=(DWORD)amount){memset((BYTE*)buffer+got,0,amount-got);return SQLITE_IOERR_SHORT_READ;}return SQLITE_OK;
}
static int journal_write(sqlite3_file *file,const void *buffer,int amount,sqlite3_int64 offset) {
 Owner *o=((Journal*)file)->owner;DWORD written=0;
 if(amount<0 || amount>JOURNAL_LIMIT || offset<0 || offset>JOURNAL_LIMIT-amount)return reject(o,"JOURNAL_BOUND_REFUSED",SQLITE_FULL);
 if(!journal_ok(o) || !seek(o,offset) || !WriteFile(o->journal,buffer,(DWORD)amount,&written,NULL) || written!=(DWORD)amount)
  return reject(o,"JOURNAL_WRITE_REFUSED",SQLITE_IOERR_WRITE);
 ++o->writes;return SQLITE_OK;
}
static int journal_truncate(sqlite3_file *file,sqlite3_int64 size) {
 Owner *o=((Journal*)file)->owner;
 if(size<0 || size>JOURNAL_LIMIT || !journal_ok(o) || !seek(o,size) || !SetEndOfFile(o->journal))return reject(o,"JOURNAL_TRUNCATE_REFUSED",SQLITE_IOERR_TRUNCATE);
 return SQLITE_OK;
}
static int journal_sync(sqlite3_file *file,int flags) {
 Owner *o=((Journal*)file)->owner;(void)flags;
 if(!journal_ok(o) || !FlushFileBuffers(o->journal))return reject(o,"JOURNAL_SYNC_REFUSED",SQLITE_IOERR_FSYNC);
 ++o->syncs;return SQLITE_OK;
}
static int journal_size(sqlite3_file *file,sqlite3_int64 *size) {
 Owner *o=((Journal*)file)->owner;LARGE_INTEGER got;
 if(!journal_ok(o) || !GetFileSizeEx(o->journal,&got))return reject(o,"JOURNAL_SIZE_REFUSED",SQLITE_IOERR_FSTAT);
 *size=got.QuadPart;return SQLITE_OK;
}
static int journal_lock(sqlite3_file *file,int level){(void)file;(void)level;return SQLITE_OK;}
static int journal_reserved(sqlite3_file *file,int *out){(void)file;*out=0;return SQLITE_OK;}
static int journal_control(sqlite3_file *file,int op,void *arg){
 Owner *o=((Journal*)file)->owner;
 if(op==SQLITE_FCNTL_WIN32_GET_HANDLE){*(HANDLE*)arg=o->journal;return SQLITE_OK;}
 if(op==SQLITE_FCNTL_VFS_POINTER){*(sqlite3_vfs**)arg=&o->vfs;return SQLITE_OK;}
 return SQLITE_NOTFOUND;
}
static int journal_sector(sqlite3_file *file){(void)file;return 4096;}
static int journal_characteristics(sqlite3_file *file){(void)file;return SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN;}
static const sqlite3_io_methods journalMethods={1,journal_close,journal_read,journal_write,journal_truncate,journal_sync,journal_size,
 journal_lock,journal_lock,journal_reserved,journal_control,journal_sector,journal_characteristics};
static void free_owner(Owner *o){release(o);sqlite3_free(o);}
static int main_close(sqlite3_file*f){Main*m=(Main*)f;Owner*o=m->owner;int rc=m->actual->pMethods->xClose(m->actual);f->pMethods=NULL;
 if(rc!=SQLITE_OK){o->mainCloseUnconfirmed=1;return reject(o,"SOURCE_PHYSICAL_CLOSE_UNCONFIRMED",rc);}
 o->mainOpen=0;if(o->bootstrapDestroyed)free_owner(o);return rc;}
/* This is operation-time detection, not atomic isolation from attribute or
 * preexisting byte-writer handles. Recheck the actual delegated file object. */
static int main_ok(Main*m){HANDLE actual=NULL;BY_HANDLE_FILE_INFORMATION info;
 return stable(m->owner) && m->actual->pMethods->xFileControl(m->actual,SQLITE_FCNTL_WIN32_GET_HANDLE,&actual)==SQLITE_OK &&
  inspect(actual,&info) && same(&info,&m->owner->identities[m->owner->count-1]) && info.nNumberOfLinks==1 &&
  !(info.dwFileAttributes&(FILE_ATTRIBUTE_DIRECTORY|UNSUPPORTED_STORAGE_ATTRIBUTES)) &&
  !info.nFileSizeHigh && info.nFileSizeLow<=SOURCE_LIMIT;}
static int main_read(sqlite3_file*f,void*b,int n,sqlite3_int64 at){Main*m=(Main*)f;
 if(!main_ok(m))return reject(m->owner,"SOURCE_CURRENT_METADATA_REFUSED",SQLITE_IOERR_READ);
 return m->actual->pMethods->xRead(m->actual,b,n,at);}
static int main_write(sqlite3_file*f,const void*b,int n,sqlite3_int64 at){Main*m=(Main*)f;
 if(n<0 || n>SOURCE_LIMIT || at<0 || at>SOURCE_LIMIT-n)return reject(m->owner,"SOURCE_BOUND_REFUSED",SQLITE_FULL);
 if(!main_ok(m))return reject(m->owner,"SOURCE_CURRENT_METADATA_REFUSED",SQLITE_IOERR_WRITE);
 if(!journal_ok(m->owner) || m->owner->journalClosed)return reject(m->owner,"SOURCE_WRITE_WITHOUT_OWNED_JOURNAL_REFUSED",SQLITE_IOERR_WRITE);
 return m->actual->pMethods->xWrite(m->actual,b,n,at);}
static int main_truncate(sqlite3_file*f,sqlite3_int64 n){Main*m=(Main*)f;
 if(n<0 || n>SOURCE_LIMIT)return reject(m->owner,"SOURCE_BOUND_REFUSED",SQLITE_FULL);
 if(!main_ok(m))return reject(m->owner,"SOURCE_CURRENT_METADATA_REFUSED",SQLITE_IOERR_TRUNCATE);
 if(!journal_ok(m->owner) || m->owner->journalClosed)return reject(m->owner,"SOURCE_WRITE_WITHOUT_OWNED_JOURNAL_REFUSED",SQLITE_IOERR_TRUNCATE);
 return m->actual->pMethods->xTruncate(m->actual,n);}
static int main_sync(sqlite3_file*f,int flags){Main*m=(Main*)f;if(!main_ok(m))return reject(m->owner,"SOURCE_CURRENT_METADATA_REFUSED",SQLITE_IOERR_FSYNC);return m->actual->pMethods->xSync(m->actual,flags);}
static int main_size(sqlite3_file*f,sqlite3_int64*n){Main*m=(Main*)f;if(!main_ok(m))return reject(m->owner,"SOURCE_CURRENT_METADATA_REFUSED",SQLITE_IOERR_FSTAT);return m->actual->pMethods->xFileSize(m->actual,n);}
static int main_lock(sqlite3_file*f,int n){Main*m=(Main*)f;if(!main_ok(m))return reject(m->owner,"SOURCE_CURRENT_METADATA_REFUSED",SQLITE_IOERR_LOCK);return m->actual->pMethods->xLock(m->actual,n);}
static int main_unlock(sqlite3_file*f,int n){Main*m=(Main*)f;return m->actual->pMethods->xUnlock(m->actual,n);}
static int main_reserved(sqlite3_file*f,int*n){Main*m=(Main*)f;return m->actual->pMethods->xCheckReservedLock(m->actual,n);}
static int main_control(sqlite3_file*f,int op,void*arg){Main*m=(Main*)f;
 if(op==SQLITE_FCNTL_VFS_POINTER){*(sqlite3_vfs**)arg=&m->owner->vfs;return SQLITE_OK;}
 /* Keep native handle replacement, no-I/O and unbounded chunk growth out of
  * this private resource seam even if another test extension asks for them. */
 if(op==SQLITE_FCNTL_CHUNK_SIZE || op==SQLITE_FCNTL_WIN32_SET_HANDLE || op==SQLITE_FCNTL_NULL_IO)return SQLITE_NOTFOUND;
 if(op==SQLITE_FCNTL_SIZE_HINT && (*(sqlite3_int64*)arg<0 || *(sqlite3_int64*)arg>SOURCE_LIMIT))return reject(m->owner,"SOURCE_SIZE_HINT_BOUND_REFUSED",SQLITE_FULL);
 if(op==SQLITE_FCNTL_SIZE_HINT && !main_ok(m))return reject(m->owner,"SOURCE_CURRENT_METADATA_REFUSED",SQLITE_IOERR);
 return m->actual->pMethods->xFileControl(m->actual,op,arg);}
static int main_sector(sqlite3_file*f){Main*m=(Main*)f;return m->actual->pMethods->xSectorSize(m->actual);}
static int main_characteristics(sqlite3_file*f){Main*m=(Main*)f;return m->actual->pMethods->xDeviceCharacteristics(m->actual);}
static int main_shmmap(sqlite3_file*f,int a,int b,int c,void volatile**p){(void)f;(void)a;(void)b;(void)c;(void)p;return SQLITE_IOERR_SHMMAP;}
static int main_shmlock(sqlite3_file*f,int a,int b,int c){(void)f;(void)a;(void)b;(void)c;return SQLITE_IOERR_SHMLOCK;}
static void main_shmbarrier(sqlite3_file*f){(void)f;}
static int main_shmunmap(sqlite3_file*f,int n){(void)f;(void)n;return SQLITE_OK;}
static int main_fetch(sqlite3_file*f,sqlite3_int64 at,int n,void**p){Main*m=(Main*)f;if(!main_ok(m))return reject(m->owner,"SOURCE_CURRENT_METADATA_REFUSED",SQLITE_IOERR_READ);if(m->actual->pMethods->iVersion>=3 && m->actual->pMethods->xFetch)return m->actual->pMethods->xFetch(m->actual,at,n,p);*p=NULL;return SQLITE_OK;}
static int main_unfetch(sqlite3_file*f,sqlite3_int64 at,void*p){Main*m=(Main*)f;if(m->actual->pMethods->iVersion>=3 && m->actual->pMethods->xUnfetch)return m->actual->pMethods->xUnfetch(m->actual,at,p);return SQLITE_OK;}
static const sqlite3_io_methods mainMethods={3,main_close,main_read,main_write,main_truncate,main_sync,main_size,main_lock,main_unlock,
 main_reserved,main_control,main_sector,main_characteristics,main_shmmap,main_shmlock,main_shmbarrier,main_shmunmap,main_fetch,main_unfetch};
static int wrapped_open(sqlite3_vfs *vfs,const char *name,sqlite3_file *file,int flags,int *out) {
 Owner *o=(Owner*)vfs->pAppData;int type=flags&0x000fff00,rc;HANDLE actual=NULL;BY_HANDLE_FILE_INFORMATION info;NTSTATUS status;
 file->pMethods=NULL;
 if(!stable(o) || !name)return reject(o,"SOURCE_ANCESTRY_REFUSED",SQLITE_CANTOPEN);
 if(type==SQLITE_OPEN_MAIN_DB && !_stricmp(name,o->source)) {
  Main *main=(Main*)file;sqlite3_file *delegate=(sqlite3_file*)((BYTE*)file+sizeof(Main));
  int openedFlags=0;
  if(o->mainOpen || !no_slots(o))return reject(o,"SOURCE_EXISTING_SLOT_REFUSED",SQLITE_CANTOPEN);
  memset(file,0,sizeof(Main)+o->parent->szOsFile);
  rc=o->parent->xOpen(o->parent,name,delegate,flags,&openedFlags);if(rc!=SQLITE_OK)return rc;
  if(out)*out=openedFlags;
  if(delegate->pMethods->xFileControl(delegate,SQLITE_FCNTL_WIN32_GET_HANDLE,&actual)!=SQLITE_OK || !inspect(actual,&info) ||
   !same(&info,&o->identities[o->count-1]) || info.nNumberOfLinks!=1 ||
   (openedFlags&(SQLITE_OPEN_READONLY|SQLITE_OPEN_READWRITE))!=(flags&(SQLITE_OPEN_READONLY|SQLITE_OPEN_READWRITE))) {
   delegate->pMethods->xClose(delegate);return reject(o,"SOURCE_MAIN_BINDING_REFUSED",SQLITE_CANTOPEN);
  }
  main->owner=o;main->actual=delegate;file->pMethods=&mainMethods;
  o->mainOpen=1;return SQLITE_OK;
 }
 if(type!=SQLITE_OPEN_MAIN_JOURNAL || _stricmp(name,o->journalPath) ||
  (flags&(SQLITE_OPEN_READWRITE|SQLITE_OPEN_CREATE))!=(SQLITE_OPEN_READWRITE|SQLITE_OPEN_CREATE) || o->journal || !no_slots(o))
  return reject(o,"JOURNAL_OPEN_REFUSED",SQLITE_CANTOPEN);
 if(o->created>=TRANSACTION_LIMIT)return reject(o,"JOURNAL_TRANSACTION_BOUND_REFUSED",SQLITE_FULL);
 if(o->faultCreateCollision) {
  HANDLE collision;DWORD written;const char bytes[]="owned collision";
  --o->count;collision=relative(o,L"library.sqlite-journal",0,GENERIC_READ|GENERIC_WRITE|SYNCHRONIZE,FILE_CREATE,FILE_SHARE_READ|FILE_SHARE_WRITE,&status);++o->count;
  if(!collision)return reject(o,"JOURNAL_COLLISION_FIXTURE_FAILED",SQLITE_CANTOPEN);
  WriteFile(collision,bytes,sizeof(bytes)-1,&written,NULL);CloseHandle(collision);o->faultCreateCollision=0;
 }
 --o->count;o->journal=relative(o,L"library.sqlite-journal",0,GENERIC_READ|GENERIC_WRITE|DELETE|SYNCHRONIZE,
  FILE_CREATE,FILE_SHARE_READ,&status);++o->count;
 if(!o->journal)return reject(o,"JOURNAL_CREATE_NEW_REFUSED",SQLITE_CANTOPEN);
 if(!inspect(o->journal,&o->journalIdentity) || (o->journalIdentity.dwFileAttributes&UNSUPPORTED_STORAGE_ATTRIBUTES) || o->journalIdentity.nNumberOfLinks!=1 || o->journalIdentity.nFileSizeLow || o->journalIdentity.nFileSizeHigh) {
  CloseHandle(o->journal);o->journal=NULL;return reject(o,"JOURNAL_NEW_KIND_REFUSED",SQLITE_CANTOPEN);
 }
 memset(file,0,sizeof(Journal));((Journal*)file)->owner=o;file->pMethods=&journalMethods;
 o->journalClosed=0;++o->created;if(out)*out=flags;return SQLITE_OK;
}
static int wrapped_delete(sqlite3_vfs *vfs,const char *name,int syncDir) {
 Owner *o=(Owner*)vfs->pAppData;FILE_DISPOSITION_INFO disposition;(void)syncDir;
 if(!name || _stricmp(name,o->journalPath) || !o->journalClosed || !journal_ok(o) || o->faultDelete)
  return reject(o,"JOURNAL_HANDLE_DELETE_REFUSED",SQLITE_IOERR_DELETE);
 disposition.DeleteFile=TRUE;
 if(!SetFileInformationByHandle(o->journal,FileDispositionInfo,&disposition,sizeof(disposition)))return reject(o,"JOURNAL_HANDLE_DELETE_FAILED",SQLITE_IOERR_DELETE);
 CloseHandle(o->journal);o->journal=NULL;o->journalClosed=0;++o->deleted;return SQLITE_OK;
}
static int wrapped_access(sqlite3_vfs *vfs,const char *name,int flags,int *out) {
 Owner *o=(Owner*)vfs->pAppData;const WCHAR *leaf=NULL;
 if(!stable(o) || !name)return reject(o,"SOURCE_ACCESS_REFUSED",SQLITE_IOERR_ACCESS);
 if(!_stricmp(name,o->journalPath)) {
  if(o->journal){if(!journal_ok(o))return reject(o,"JOURNAL_IDENTITY_REFUSED",SQLITE_IOERR_ACCESS);*out=1;return SQLITE_OK;}
  leaf=L"library.sqlite-journal";
 } else if(!_stricmp(name,o->walPath))leaf=L"library.sqlite-wal";
 else if(!_stricmp(name,o->shmPath))leaf=L"library.sqlite-shm";
 else if(!_stricmp(name,o->source))return o->parent->xAccess(o->parent,name,flags,out);
 else return reject(o,"UNEXPECTED_SLOT_ACCESS_REFUSED",SQLITE_IOERR_ACCESS);
 if(!absent(o,leaf))return reject(o,"SOURCE_EXISTING_SLOT_REFUSED",SQLITE_IOERR_ACCESS);
 *out=0;return SQLITE_OK;
}
static int fullpath(sqlite3_vfs *v,const char *n,int size,char *out){Owner*o=v->pAppData;return o->parent->xFullPathname(o->parent,n,size,out);}
static void *dlopen(sqlite3_vfs*v,const char*n){Owner*o=v->pAppData;return o->parent->xDlOpen(o->parent,n);}
static void dlerror(sqlite3_vfs*v,int n,char*b){Owner*o=v->pAppData;o->parent->xDlError(o->parent,n,b);}
static void(*dlsym(sqlite3_vfs*v,void*h,const char*n))(void){Owner*o=v->pAppData;return o->parent->xDlSym(o->parent,h,n);}
static void dlclose(sqlite3_vfs*v,void*h){Owner*o=v->pAppData;o->parent->xDlClose(o->parent,h);}
static int randombytes(sqlite3_vfs*v,int n,char*b){Owner*o=v->pAppData;return o->parent->xRandomness(o->parent,n,b);}
static int sleepmicros(sqlite3_vfs*v,int n){Owner*o=v->pAppData;return o->parent->xSleep(o->parent,n);}
static int currenttime(sqlite3_vfs*v,double*t){Owner*o=v->pAppData;return o->parent->xCurrentTime(o->parent,t);}
static int geterror(sqlite3_vfs*v,int n,char*b){Owner*o=v->pAppData;return o->parent->xGetLastError(o->parent,n,b);}
static int currenttime64(sqlite3_vfs*v,sqlite3_int64*t){Owner*o=v->pAppData;return o->parent->xCurrentTimeInt64(o->parent,t);}
static void destroy(void *data){Owner*o=data;if(o->registered)sqlite3_vfs_unregister(&o->vfs);o->bootstrapDestroyed=1;if(!o->mainOpen)free_owner(o);}
static void dispatch(sqlite3_context *ctx,int argc,sqlite3_value **args) {
 Owner *o=sqlite3_user_data(ctx);const char*op=argc==2?(const char*)sqlite3_value_text(args[0]):NULL;const char*value=(const char*)sqlite3_value_text(args[1]);char*json;
 if(!op || strlen(op)!=(size_t)sqlite3_value_bytes(args[0])){sqlite3_result_error(ctx,"JOURNAL_OPERATION_REFUSED",-1);return;}
 if(!strcmp(op,"register")) {
  if(o->registered || !value || strlen(value)!=(size_t)sqlite3_value_bytes(args[1]) || !pin(o,value) || !stable(o) || !no_slots(o)) {
   release(o);sqlite3_result_error(ctx,"JOURNAL_REGISTER_SOURCE_REFUSED",-1);return;
  }
  o->parent=sqlite3_vfs_find("win32");if(!o->parent){release(o);sqlite3_result_error(ctx,"JOURNAL_PARENT_VFS_REFUSED",-1);return;}
  o->vfs=*o->parent;o->vfs.iVersion=2;o->vfs.szOsFile=sizeof(Main)+o->parent->szOsFile;
  sqlite3_snprintf(sizeof(o->name),o->name,"dam-journal-%p",o);o->vfs.zName=o->name;o->vfs.pAppData=o;o->vfs.pNext=NULL;
  o->vfs.xOpen=wrapped_open;o->vfs.xDelete=wrapped_delete;o->vfs.xAccess=wrapped_access;o->vfs.xFullPathname=fullpath;
  o->vfs.xDlOpen=dlopen;o->vfs.xDlError=dlerror;o->vfs.xDlSym=dlsym;o->vfs.xDlClose=dlclose;o->vfs.xRandomness=randombytes;
  o->vfs.xSleep=sleepmicros;o->vfs.xCurrentTime=currenttime;o->vfs.xGetLastError=geterror;o->vfs.xCurrentTimeInt64=currenttime64;
  if(sqlite3_vfs_register(&o->vfs,0)!=SQLITE_OK){release(o);sqlite3_result_error(ctx,"JOURNAL_REGISTER_VFS_REFUSED",-1);return;}
  o->registered=1;sqlite3_result_text(ctx,o->name,-1,SQLITE_TRANSIENT);return;
 }
 if(!strcmp(op,"fault-delete")){o->faultDelete=sqlite3_value_int(args[1])!=0;sqlite3_result_int(ctx,1);return;}
 if(!strcmp(op,"fault-create-collision")){o->faultCreateCollision=sqlite3_value_int(args[1])!=0;sqlite3_result_int(ctx,1);return;}
 if(!strcmp(op,"receipt")) {
  json=sqlite3_mprintf("{\"created\":%u,\"reads\":%u,\"writes\":%u,\"syncs\":%u,\"closes\":%u,\"deleted\":%u,\"refused\":%u,\"journalRetained\":%s,\"mainCloseUnconfirmed\":%s,\"sourceBytesLimit\":%u,\"journalBytesLimit\":%u,\"transactionLimit\":%u,\"reason\":\"%s\",\"productionQualified\":false,\"directoryDurabilityQualified\":false}",
   o->created,o->reads,o->writes,o->syncs,o->closes,o->deleted,o->refused,o->journal?"true":"false",o->mainCloseUnconfirmed?"true":"false",SOURCE_LIMIT,JOURNAL_LIMIT,TRANSACTION_LIMIT,o->reason);
  if(json)sqlite3_result_text(ctx,json,-1,sqlite3_free);else sqlite3_result_error_nomem(ctx);return;
 }
 sqlite3_result_error(ctx,"JOURNAL_OPERATION_REFUSED",-1);
}
__declspec(dllexport) int sqlite3_damjournal_init(sqlite3 *db,char **error,const sqlite3_api_routines *api) {
 Owner*o;SQLITE_EXTENSION_INIT2(api);(void)error;o=sqlite3_malloc(sizeof(*o));if(!o)return SQLITE_NOMEM;memset(o,0,sizeof(*o));
 {int rc=sqlite3_create_function_v2(db,"dam_windows_backup_journal",2,SQLITE_UTF8|SQLITE_DIRECTONLY,o,dispatch,NULL,NULL,destroy);
  /* VFS methods can outlive bootstrap. This test DLL remains loaded until
   * the owned Electron test process exits; owner handles still close normally. */
  return rc==SQLITE_OK?SQLITE_OK_LOAD_PERMANENTLY:rc;}
}
