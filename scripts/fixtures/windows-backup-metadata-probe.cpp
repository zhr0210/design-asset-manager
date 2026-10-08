// Private synthetic NTFS adversary. Not a product Adapter or a permission grant.
// Its retained handle shares all access; it must not improve the tested pins.
#include <windows.h>
#include <winternl.h>
#include <winioctl.h>
#include <bcrypt.h>
#include <node_api.h>
#include <delayimp.h>
#include <string>
#include <vector>
#include <memory>
#include <stdexcept>
#include <cstdint>
#include <cstring>
#include <unordered_set>

static FARPROC WINAPI imports(unsigned notification,PDelayLoadInfo info) {
  if(notification==dliNotePreLoadLibrary && _stricmp(info->szDll,"node.exe")==0)
    return reinterpret_cast<FARPROC>(GetModuleHandleW(nullptr));
  return nullptr;
}
extern "C" const PfnDliHook __pfnDliNotifyHook2 = imports;
static const LONGLONG FileLimit=1024*1024;
static unsigned liveSessions=0;
static bool retainedUnknown=false;
struct Session;
static std::unordered_set<Session*> ownedSessions;
static void demand(bool ok,const char* reason){if(!ok)throw std::runtime_error(reason);}
static napi_value prop(napi_env e,napi_value o,const char* key){napi_value v;demand(napi_get_named_property(e,o,key,&v)==napi_ok,"METADATA_ARGUMENT_REFUSED");return v;}
static bool has(napi_env e,napi_value o,const char* key){bool yes=false;demand(napi_has_named_property(e,o,key,&yes)==napi_ok,"METADATA_ARGUMENT_REFUSED");return yes;}
static std::wstring text(napi_env e,napi_value v){size_t n=0;demand(napi_get_value_string_utf16(e,v,nullptr,0,&n)==napi_ok&&n>0&&n<=2048,"METADATA_STRING_REFUSED");std::wstring s(n+1,L'\0');demand(napi_get_value_string_utf16(e,v,reinterpret_cast<char16_t*>(&s[0]),n+1,&n)==napi_ok,"METADATA_STRING_REFUSED");s.resize(n);demand(s.find(L'\0')==std::wstring::npos,"METADATA_NUL_REFUSED");return s;}
static std::string ascii(const std::wstring&s){std::string r;for(wchar_t c:s){demand(c>=32&&c<=126,"METADATA_OPERATION_REFUSED");r.push_back(static_cast<char>(c));}return r;}
static void number(napi_env e,napi_value o,const char*k,double n){napi_value v;napi_create_double(e,n,&v);napi_set_named_property(e,o,k,v);}
static void boolean(napi_env e,napi_value o,const char*k,bool b){napi_value v;napi_get_boolean(e,b,&v);napi_set_named_property(e,o,k,v);}
static void str(napi_env e,napi_value o,const char*k,const std::string&s){napi_value v;napi_create_string_utf8(e,s.c_str(),s.size(),&v);napi_set_named_property(e,o,k,v);}
static void nullValue(napi_env e,napi_value o,const char*k){napi_value v;napi_get_null(e,&v);napi_set_named_property(e,o,k,v);}
static unsigned option(napi_env e,napi_value o,const char*k,unsigned fallback,unsigned ceiling){if(!has(e,o,k))return fallback;double n=0;demand(napi_get_value_double(e,prop(e,o,k),&n)==napi_ok&&n>=0&&n<=ceiling&&n==static_cast<unsigned>(n),"METADATA_BOUND_REFUSED");return static_cast<unsigned>(n);}
static bool enabled(napi_env e,napi_value o){if(!has(e,o,"enabled"))return true;bool b=false;demand(napi_get_value_bool(e,prop(e,o,"enabled"),&b)==napi_ok,"METADATA_BOOL_REFUSED");return b;}
static std::string decimal(ULONGLONG n){return std::to_string(n);}
static ULONGLONG timeValue(FILETIME v){return(static_cast<ULONGLONG>(v.dwHighDateTime)<<32)|v.dwLowDateTime;}
static DWORD statusError(NTSTATUS s){using Convert=ULONG(WINAPI*)(NTSTATUS);auto c=reinterpret_cast<Convert>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"RtlNtStatusToDosError"));return c?c(s):ERROR_GEN_FAILURE;}
static bool component(const std::wstring& s){return!s.empty()&&s.size()<=255&&s!=L"."&&s!=L".."&&s.find_first_of(L"\\/:")==std::wstring::npos;}
static bool within(const std::wstring&root,const std::wstring&target){return _wcsicmp(root.c_str(),target.c_str())==0||(target.size()>root.size()&&_wcsnicmp(root.c_str(),target.c_str(),root.size())==0&&target[root.size()]==L'\\');}
static void scope(const std::wstring& root,const std::wstring& target){
  wchar_t temp[32768];DWORD n=GetTempPathW(32768,temp);demand(n>3&&n<32768,"METADATA_TEMP_REFUSED");
  demand(root.size()>n&&root.size()<=2048&&root[1]==L':'&&root[2]==L'\\'&&_wcsnicmp(root.c_str(),temp,n)==0,"METADATA_ROOT_SCOPE_REFUSED");
  std::wstring name=root.substr(n);demand(component(name),"METADATA_ROOT_COMPONENT_REFUSED");
  const wchar_t* prefixes[]={L"dam-native-target-",L"dam-native-qualification-build-",L"dam-backup-helper-build-",L"dam-backup-metadata-"};
  bool owned=false;for(const wchar_t*p:prefixes){size_t len=wcslen(p);if(name.size()>len&&name.compare(0,len,p)==0)owned=true;}
  demand(owned&&within(root,target)&&target.size()<=2048&&target[1]==L':'&&target[2]==L'\\',"METADATA_TARGET_SCOPE_REFUSED");
  for(size_t i=0;i<target.size();++i)demand(target[i]!=L'/'&&(target[i]!=L':'||i==1),"METADATA_PATH_REFUSED");
  size_t at=3,count=0;while(at<target.size()){size_t end=target.find(L'\\',at);demand(component(target.substr(at,end==std::wstring::npos?target.size()-at:end-at))&&++count<=64,"METADATA_COMPONENT_REFUSED");if(end==std::wstring::npos)break;at=end+1;}
}
struct Session {
  HANDLE handle=nullptr;std::vector<HANDLE> parents;std::wstring root,path;std::string access;
  DWORD desired=0;bool directory=false,closed=false,counted=false,cleanupUnknown=false;
  // Scope permits at most 64 components plus the drive. Allocate before any
  // native open so adopting a newly opened HANDLE cannot allocate or throw.
  Session(){parents.reserve(65);}
  ~Session(){
    ownedSessions.erase(this);
    if(handle&&!CloseHandle(handle))cleanupUnknown=true;
    for(HANDLE h:parents)if(!CloseHandle(h))cleanupUnknown=true;
    // Neither finalization nor an explicit failed close retries an uncertain
    // numeric handle. Unknown remains charged and blocks further adversaries.
    if(cleanupUnknown){retainedUnknown=true;if(!counted)++liveSessions;}
    else if(counted)--liveSessions;
  }
};
static HANDLE relative(HANDLE parent,const std::wstring&name,bool directory,DWORD access,DWORD&error){
  using Create=NTSTATUS(NTAPI*)(PHANDLE,ACCESS_MASK,POBJECT_ATTRIBUTES,PIO_STATUS_BLOCK,PLARGE_INTEGER,ULONG,ULONG,ULONG,ULONG,PVOID,ULONG);
  auto f=reinterpret_cast<Create>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"NtCreateFile"));demand(f!=nullptr,"METADATA_NT_CREATE_MISSING");
  UNICODE_STRING u{};u.Buffer=const_cast<PWSTR>(name.c_str());u.Length=static_cast<USHORT>(name.size()*2);u.MaximumLength=u.Length;
  OBJECT_ATTRIBUTES a{};InitializeObjectAttributes(&a,&u,OBJ_CASE_INSENSITIVE|0x1000,parent,nullptr);IO_STATUS_BLOCK io{};HANDLE h=nullptr;
  NTSTATUS s=f(&h,access,&a,&io,nullptr,0,FILE_SHARE_READ|FILE_SHARE_WRITE|FILE_SHARE_DELETE,FILE_OPEN,(directory?FILE_DIRECTORY_FILE:FILE_NON_DIRECTORY_FILE)|0x20|0x200000,nullptr,0);
  if(s<0){error=statusError(s);if(h)CloseHandle(h);return nullptr;}error=0;return h;
}
static bool noReparse(HANDLE h,bool directory){BY_HANDLE_FILE_INFORMATION i{};return GetFileInformationByHandle(h,&i)&&!(i.dwFileAttributes&FILE_ATTRIBUTE_REPARSE_POINT)&&!!(i.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY)==directory;}
static bool destinationDirectory(const std::wstring&path,DWORD&error){
  // Validate every component before using this controlled directory as a
  // mount-point destination. Sharing stays ALL and never adds a data-reader.
  Session temporary;HANDLE h=CreateFileW((L"\\\\?\\"+path.substr(0,3)).c_str(),FILE_READ_ATTRIBUTES|SYNCHRONIZE,7,nullptr,OPEN_EXISTING,FILE_FLAG_BACKUP_SEMANTICS|FILE_FLAG_OPEN_REPARSE_POINT,nullptr);
  if(h==INVALID_HANDLE_VALUE){error=GetLastError();return false;}temporary.parents.push_back(h);if(!noReparse(h,true)){error=ERROR_REPARSE_TAG_INVALID;return false;}
  size_t at=3;while(at<path.size()){size_t end=path.find(L'\\',at);std::wstring part=path.substr(at,end==std::wstring::npos?path.size()-at:end-at);h=relative(h,part,true,FILE_READ_ATTRIBUTES|SYNCHRONIZE,error);if(!h)return false;temporary.parents.push_back(h);if(!noReparse(h,true)){error=ERROR_REPARSE_TAG_INVALID;return false;}if(end==std::wstring::npos)break;at=end+1;}
  error=0;return true;
}
static std::string digest(HANDLE h,LONGLONG size){
  struct State{BCRYPT_ALG_HANDLE alg=nullptr;BCRYPT_HASH_HANDLE hash=nullptr;std::vector<BYTE> object;~State(){if(hash)BCryptDestroyHash(hash);if(alg)BCryptCloseAlgorithmProvider(alg,0);}}s;
  DWORD n=0,returned=0;demand(BCryptOpenAlgorithmProvider(&s.alg,BCRYPT_SHA256_ALGORITHM,nullptr,0)>=0,"METADATA_HASH_PROVIDER_FAILED");
  demand(BCryptGetProperty(s.alg,BCRYPT_OBJECT_LENGTH,reinterpret_cast<PUCHAR>(&n),sizeof(n),&returned,0)>=0&&n>0&&n<=65536,"METADATA_HASH_BOUND_REFUSED");s.object.resize(n);
  demand(BCryptCreateHash(s.alg,&s.hash,s.object.data(),n,nullptr,0,0)>=0,"METADATA_HASH_CREATE_FAILED");
  LARGE_INTEGER zero{},old{},after{};demand(SetFilePointerEx(h,zero,&old,FILE_CURRENT)&&SetFilePointerEx(h,zero,nullptr,FILE_BEGIN),"METADATA_HASH_SEEK_FAILED");
  BYTE buffer[65536],bytes[32];LONGLONG total=0;bool ok=true;
  while(total<size){DWORD got=0,want=static_cast<DWORD>((size-total)<sizeof(buffer)?size-total:sizeof(buffer));if(!ReadFile(h,buffer,want,&got,nullptr)||got==0||BCryptHashData(s.hash,buffer,got,0)<0){ok=false;break;}total+=got;}
  demand(SetFilePointerEx(h,old,&after,FILE_BEGIN),"METADATA_HASH_RESTORE_FAILED");demand(ok&&total==size&&BCryptFinishHash(s.hash,bytes,32,0)>=0,"METADATA_HASH_READ_FAILED");
  const char hex[]="0123456789abcdef";std::string r(64,'0');for(unsigned i=0;i<32;i++){r[2*i]=hex[bytes[i]>>4];r[2*i+1]=hex[bytes[i]&15];}return r;
}
static napi_value snapshot(napi_env e,Session*s){
  napi_value out;napi_create_object(e,&out);BY_HANDLE_FILE_INFORMATION i{};
  BOOL ok=GetFileInformationByHandle(s->handle,&i);DWORD error=ok?0:GetLastError();boolean(e,out,"available",!!ok);number(e,out,"win32Error",error);
  str(e,out,"access",s->access);number(e,out,"desiredAccess",s->desired);number(e,out,"shareMode",7);boolean(e,out,"sameHandle",true);
  if(!ok)return out;
  ULONGLONG size=(static_cast<ULONGLONG>(i.nFileSizeHigh)<<32)|i.nFileSizeLow;
  str(e,out,"volume",decimal(i.dwVolumeSerialNumber));str(e,out,"file",decimal((static_cast<ULONGLONG>(i.nFileIndexHigh)<<32)|i.nFileIndexLow));str(e,out,"size",decimal(size));
  number(e,out,"links",i.nNumberOfLinks);number(e,out,"attributes",i.dwFileAttributes);boolean(e,out,"directory",!!(i.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY));boolean(e,out,"reparse",!!(i.dwFileAttributes&FILE_ATTRIBUTE_REPARSE_POINT));
  str(e,out,"creationTime",decimal(timeValue(i.ftCreationTime)));str(e,out,"lastWriteTime",decimal(timeValue(i.ftLastWriteTime)));str(e,out,"lastAccessTime",decimal(timeValue(i.ftLastAccessTime)));
  FILE_ATTRIBUTE_TAG_INFO tag{};if(GetFileInformationByHandleEx(s->handle,FileAttributeTagInfo,&tag,sizeof(tag)))number(e,out,"reparseTag",tag.ReparseTag);else number(e,out,"reparseTagWin32Error",GetLastError());
  FILE_STANDARD_INFO standard{};if(GetFileInformationByHandleEx(s->handle,FileStandardInfo,&standard,sizeof(standard)))boolean(e,out,"deletePending",!!standard.DeletePending);else number(e,out,"deletePendingWin32Error",GetLastError());
  if(s->directory){nullValue(e,out,"fullHash");str(e,out,"hashUnavailable","DIRECTORY");}
  else if(!(s->desired&FILE_READ_DATA)&&!(s->desired&GENERIC_READ)){nullValue(e,out,"fullHash");str(e,out,"hashUnavailable","NO_READ_DATA_ACCESS");}
  else if(size>FileLimit){nullValue(e,out,"fullHash");str(e,out,"hashUnavailable","SIZE_BOUND_REFUSED");}
  else{str(e,out,"fullHash",digest(s->handle,static_cast<LONGLONG>(size)));}
  return out;
}
static Session* session(napi_env e,napi_value v){void*p=nullptr;demand(napi_get_value_external(e,v,&p)==napi_ok&&p,"METADATA_SESSION_REFUSED");auto*s=static_cast<Session*>(p);demand(ownedSessions.find(s)!=ownedSessions.end(),"METADATA_SESSION_PROVENANCE_REFUSED");demand(!s->closed&&s->handle,"METADATA_SESSION_CLOSED");return s;}
static void finalize(napi_env,void*p,void*){delete static_cast<Session*>(p);}
static napi_value open(napi_env e,napi_callback_info info){try{
  size_t argc=1;napi_value args[1];napi_get_cb_info(e,info,&argc,args,nullptr,nullptr);demand(!retainedUnknown,"METADATA_RETAINED_UNKNOWN");demand(argc==1&&liveSessions<64,"METADATA_SESSION_LIMIT_REFUSED");
  auto s=std::make_unique<Session>();s->root=text(e,prop(e,args[0],"root"));s->path=text(e,prop(e,args[0],"target"));scope(s->root,s->path);
  s->access=ascii(text(e,prop(e,args[0],"access")));if(has(e,args[0],"directory"))demand(napi_get_value_bool(e,prop(e,args[0],"directory"),&s->directory)==napi_ok,"METADATA_DIRECTORY_REFUSED");
  if(s->access=="attributes")s->desired=FILE_READ_ATTRIBUTES|FILE_WRITE_ATTRIBUTES|SYNCHRONIZE;
  else if(s->access=="read")s->desired=GENERIC_READ|SYNCHRONIZE;
  else if(s->access=="read-write")s->desired=GENERIC_READ|GENERIC_WRITE|SYNCHRONIZE;
  else if(s->access=="delete")s->desired=DELETE|FILE_READ_ATTRIBUTES|FILE_WRITE_ATTRIBUTES|SYNCHRONIZE;
  else throw std::runtime_error("METADATA_ACCESS_REFUSED");
  DWORD error=0;HANDLE h=CreateFileW((L"\\\\?\\"+s->path.substr(0,3)).c_str(),FILE_READ_ATTRIBUTES|SYNCHRONIZE,7,nullptr,OPEN_EXISTING,FILE_FLAG_BACKUP_SEMANTICS|FILE_FLAG_OPEN_REPARSE_POINT,nullptr);
  if(h==INVALID_HANDLE_VALUE)error=GetLastError();else{s->parents.push_back(h);demand(noReparse(h,true),"METADATA_ROOT_REPARSE_REFUSED");size_t at=3;
    while(at<s->path.size()){size_t end=s->path.find(L'\\',at);bool leaf=end==std::wstring::npos;std::wstring part=s->path.substr(at,leaf?s->path.size()-at:end-at);h=relative(h,part,leaf?s->directory:true,leaf?s->desired:FILE_READ_ATTRIBUTES|SYNCHRONIZE,error);if(!h)break;
      if(leaf)s->handle=h;else s->parents.push_back(h);demand(noReparse(h,leaf?s->directory:true),"METADATA_REPARSE_REFUSED");if(leaf)break;at=end+1;}}
  napi_value out;napi_create_object(e,&out);boolean(e,out,"opened",s->handle!=nullptr);number(e,out,"win32Error",error);number(e,out,"desiredAccess",s->desired);number(e,out,"shareMode",7);str(e,out,"access",s->access);
  if(!s->handle)return out;
  wchar_t fs[32];demand(GetFileType(s->handle)==FILE_TYPE_DISK&&GetVolumeInformationByHandleW(s->handle,nullptr,0,nullptr,nullptr,nullptr,fs,32)&&wcscmp(fs,L"NTFS")==0,"METADATA_NTFS_REFUSED");
  BY_HANDLE_FILE_INFORMATION i{};demand(GetFileInformationByHandle(s->handle,&i)&& (s->directory || (i.nFileSizeHigh==0&&i.nFileSizeLow<=FileLimit)),"METADATA_INITIAL_SIZE_REFUSED");
  napi_value initial=snapshot(e,s.get());napi_set_named_property(e,out,"snapshot",initial);
  // Registry allocation must finish before a GC finalizer can own this
  // address. On create_external failure the unique owner erases/releases it;
  // after success transfer immediately, with no further throwing C++ work.
  ownedSessions.insert(s.get());s->counted=true;++liveSessions;
  napi_value token;demand(napi_create_external(e,s.get(),finalize,nullptr,&token)==napi_ok,"METADATA_TOKEN_FAILED");s.release();napi_set_named_property(e,out,"token",token);return out;
}catch(const std::exception&ex){napi_throw_error(e,nullptr,ex.what());return nullptr;}}
static napi_value inspect(napi_env e,napi_callback_info info){try{size_t argc=1;napi_value a[1];napi_get_cb_info(e,info,&argc,a,nullptr,nullptr);demand(argc==1,"METADATA_ARGUMENT_COUNT_REFUSED");return snapshot(e,session(e,a[0]));}catch(const std::exception&ex){napi_throw_error(e,nullptr,ex.what());return nullptr;}}
static bool mutate(Session*s,napi_env e,napi_value input,const std::string&op,DWORD&error,DWORD&code){
  BOOL ok=FALSE;DWORD returned=0;code=0;SetLastError(ERROR_SUCCESS);
  if(op=="set-attributes"||op=="set-time"){
    FILE_BASIC_INFO basic{};demand(GetFileInformationByHandleEx(s->handle,FileBasicInfo,&basic,sizeof(basic)),"METADATA_BASIC_READ_FAILED");
    if(op=="set-attributes"){const unsigned allowed=FILE_ATTRIBUTE_READONLY|FILE_ATTRIBUTE_HIDDEN|FILE_ATTRIBUTE_SYSTEM|FILE_ATTRIBUTE_ARCHIVE|FILE_ATTRIBUTE_NORMAL|FILE_ATTRIBUTE_NOT_CONTENT_INDEXED;unsigned attrs=option(e,input,"attributes",(basic.FileAttributes&allowed)|FILE_ATTRIBUTE_HIDDEN,allowed);demand((attrs&~allowed)==0&&attrs!=0,"METADATA_ATTRIBUTES_REFUSED");basic.FileAttributes=attrs;}
    else{demand(basic.LastWriteTime.QuadPart>0&&basic.LastWriteTime.QuadPart<INT64_MAX-10000000,"METADATA_TIME_BOUND_REFUSED");basic.LastWriteTime.QuadPart+=10000000;}
    ok=SetFileInformationByHandle(s->handle,FileBasicInfo,&basic,sizeof(basic));
  }else if(op=="set-sparse"){FILE_SET_SPARSE_BUFFER b{};b.SetSparse=enabled(e,input);code=FSCTL_SET_SPARSE;ok=DeviceIoControl(s->handle,code,&b,sizeof(b),nullptr,0,&returned,nullptr);}
  else if(op=="set-compression"){USHORT format=enabled(e,input)?COMPRESSION_FORMAT_DEFAULT:COMPRESSION_FORMAT_NONE;code=FSCTL_SET_COMPRESSION;ok=DeviceIoControl(s->handle,code,&format,sizeof(format),nullptr,0,&returned,nullptr);}
  else if(op=="zero-data"){unsigned offset=option(e,input,"offset",0,FileLimit),length=option(e,input,"length",64,4096);demand(length>0&&offset<=FileLimit-length,"METADATA_ZERO_BOUND_REFUSED");FILE_ZERO_DATA_INFORMATION b{};b.FileOffset.QuadPart=offset;b.BeyondFinalZero.QuadPart=offset+length;code=FSCTL_SET_ZERO_DATA;ok=DeviceIoControl(s->handle,code,&b,sizeof(b),nullptr,0,&returned,nullptr);}
  else if(op=="write-data"){unsigned offset=option(e,input,"offset",0,FileLimit);void*bytes=nullptr;size_t length=0;demand(napi_get_buffer_info(e,prop(e,input,"bytes"),&bytes,&length)==napi_ok&&length>0&&length<=4096&&offset<=FileLimit-length,"METADATA_WRITE_BOUND_REFUSED");LARGE_INTEGER at{};at.QuadPart=offset;DWORD written=0;ok=SetFilePointerEx(s->handle,at,nullptr,FILE_BEGIN)&&WriteFile(s->handle,bytes,static_cast<DWORD>(length),&written,nullptr)&&written==length;}
  else if(op=="set-reparse"){
    demand(s->directory,"METADATA_REPARSE_DIRECTORY_ONLY");std::wstring destination=text(e,prop(e,input,"destination"));scope(s->root,destination);demand(_wcsicmp(destination.c_str(),s->path.c_str())!=0,"METADATA_REPARSE_SELF_REFUSED");
    if(!destinationDirectory(destination,error))return false;
    // Mount-point tag only, no symlinks/privilege change and no raw volume target.
    struct Reparse {DWORD tag;USHORT length,reserved,subOffset,subLength,printOffset,printLength;wchar_t paths[4096];} b{};
    std::wstring sub=L"\\??\\"+destination;demand(sub.size()+destination.size()+2<=4096,"METADATA_REPARSE_BOUND_REFUSED");
    b.tag=IO_REPARSE_TAG_MOUNT_POINT;b.subLength=static_cast<USHORT>(sub.size()*2);b.printOffset=static_cast<USHORT>((sub.size()+1)*2);b.printLength=static_cast<USHORT>(destination.size()*2);
    memcpy(b.paths,sub.c_str(),(sub.size()+1)*2);memcpy(reinterpret_cast<BYTE*>(b.paths)+b.printOffset,destination.c_str(),(destination.size()+1)*2);
    b.length=static_cast<USHORT>(8+(sub.size()+destination.size()+2)*2);code=FSCTL_SET_REPARSE_POINT;ok=DeviceIoControl(s->handle,code,&b,8+b.length,nullptr,0,&returned,nullptr);
  }else if(op=="remove-reparse"){demand(s->directory,"METADATA_REPARSE_DIRECTORY_ONLY");struct{DWORD tag;USHORT length,reserved;} b{IO_REPARSE_TAG_MOUNT_POINT,0,0};code=FSCTL_DELETE_REPARSE_POINT;ok=DeviceIoControl(s->handle,code,&b,sizeof(b),nullptr,0,&returned,nullptr);}
  else if(op=="link"||op=="rename"){
    std::wstring destination=text(e,prop(e,input,"destination"));scope(s->root,destination);demand(destination.substr(0,destination.find_last_of(L'\\'))==s->path.substr(0,s->path.find_last_of(L'\\')),"METADATA_SAME_PARENT_REQUIRED");
    if(op=="link"){demand(!s->directory,"METADATA_LINK_DIRECTORY_REFUSED");for(HANDLE parent:s->parents)demand(noReparse(parent,true),"METADATA_LINK_ANCESTRY_REFUSED");demand(noReparse(s->handle,false),"METADATA_LINK_TARGET_REPARSE_REFUSED");ok=CreateHardLinkW(destination.c_str(),s->path.c_str(),nullptr);}
    else{
      const std::wstring leaf=destination.substr(destination.find_last_of(L'\\')+1);size_t bytes=sizeof(FILE_RENAME_INFO)+leaf.size()*2;std::vector<BYTE> buffer(bytes,0);auto*b=reinterpret_cast<FILE_RENAME_INFO*>(buffer.data());b->ReplaceIfExists=FALSE;b->RootDirectory=s->parents.back();b->FileNameLength=static_cast<DWORD>(leaf.size()*2);memcpy(b->FileName,leaf.data(),leaf.size()*2);
      // This Windows build's Win32 wrapper refuses a non-null RootDirectory
      // with ERROR_INVALID_PARAMETER. Keep relative kernel resolution rather
      // than replacing this test with an absolute-path rename.
      using Set=NTSTATUS(NTAPI*)(HANDLE,PIO_STATUS_BLOCK,PVOID,ULONG,ULONG);
      auto set=reinterpret_cast<Set>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"NtSetInformationFile"));demand(set!=nullptr,"METADATA_NT_SET_MISSING");IO_STATUS_BLOCK io{};
      NTSTATUS status=set(s->handle,&io,b,static_cast<ULONG>(bytes),10);ok=status>=0;SetLastError(ok?ERROR_SUCCESS:statusError(status));if(ok)s->path=destination;
    }
  }else if(op=="delete"){FILE_DISPOSITION_INFO b{TRUE};ok=SetFileInformationByHandle(s->handle,FileDispositionInfo,&b,sizeof(b));}
  else throw std::runtime_error("METADATA_OPERATION_REFUSED");
  error=ok?0:GetLastError();if(!ok&&!error)error=ERROR_GEN_FAILURE;return!!ok;
}
static napi_value attempt(napi_env e,napi_callback_info info){try{
  size_t argc=2;napi_value a[2];napi_get_cb_info(e,info,&argc,a,nullptr,nullptr);demand(!retainedUnknown,"METADATA_RETAINED_UNKNOWN");demand(argc==2,"METADATA_ARGUMENT_COUNT_REFUSED");Session*s=session(e,a[0]);std::string op=ascii(text(e,prop(e,a[1],"operation")));
  napi_value out,before=snapshot(e,s);napi_create_object(e,&out);DWORD error=0,code=0;bool ok=mutate(s,e,a[1],op,error,code);
  str(e,out,"operation",op);str(e,out,"authority",op=="link"?"PATHNAME_CREATE_HARD_LINK":"RETAINED_HANDLE");boolean(e,out,"succeeded",ok);number(e,out,"win32Error",error);number(e,out,"fsctlCode",code);
  napi_set_named_property(e,out,"before",before);napi_set_named_property(e,out,"after",snapshot(e,s));boolean(e,out,"productionQualified",false);return out;
}catch(const std::exception&ex){napi_throw_error(e,nullptr,ex.what());return nullptr;}}
static napi_value close(napi_env e,napi_callback_info info){try{
  size_t argc=1;napi_value a[1];napi_get_cb_info(e,info,&argc,a,nullptr,nullptr);demand(argc==1,"METADATA_ARGUMENT_COUNT_REFUSED");Session*s=session(e,a[0]);s->closed=true;
  bool ok=true;DWORD error=0;HANDLE leaf=s->handle;s->handle=nullptr;if(!CloseHandle(leaf)){ok=false;error=GetLastError();}
  for(HANDLE h:s->parents)if(!CloseHandle(h)){ok=false;error=GetLastError();}s->parents.clear();
  if(!ok){s->cleanupUnknown=true;retainedUnknown=true;throw std::runtime_error("METADATA_HANDLE_CLOSE_UNKNOWN_"+std::to_string(error));}
  if(s->counted){--liveSessions;s->counted=false;}napi_value value;napi_get_undefined(e,&value);return value;
}catch(const std::exception&ex){napi_throw_error(e,nullptr,ex.what());return nullptr;}}
static napi_value verifyModule(napi_env e,napi_callback_info info){try{
  size_t argc=1;napi_value a[1];napi_get_cb_info(e,info,&argc,a,nullptr,nullptr);demand(argc==1,"METADATA_ARGUMENT_COUNT_REFUSED");std::wstring expected=text(e,a[0]);HMODULE module=nullptr;wchar_t actual[32768];
  demand(GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS|GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,reinterpret_cast<LPCWSTR>(&attempt),&module),"METADATA_MODULE_IDENTITY_REFUSED");DWORD length=GetModuleFileNameW(module,actual,32768);demand(length>0&&length<32768,"METADATA_MODULE_PATH_REFUSED");std::wstring loaded(actual,length);if(loaded.rfind(L"\\\\?\\",0)==0)loaded=loaded.substr(4);demand(_wcsicmp(loaded.c_str(),expected.c_str())==0,"METADATA_MODULE_PATH_MISMATCH");napi_value yes;napi_get_boolean(e,true,&yes);return yes;
}catch(const std::exception&ex){napi_throw_error(e,nullptr,ex.what());return nullptr;}}
static napi_value init(napi_env e,napi_value exports){napi_property_descriptor d[]={{"open",nullptr,open,nullptr,nullptr,nullptr,napi_default,nullptr},{"snapshot",nullptr,inspect,nullptr,nullptr,nullptr,napi_default,nullptr},{"attempt",nullptr,attempt,nullptr,nullptr,nullptr,napi_default,nullptr},{"close",nullptr,close,nullptr,nullptr,nullptr,napi_default,nullptr},{"verifyLoadedModulePath",nullptr,verifyModule,nullptr,nullptr,nullptr,napi_default,nullptr}};napi_define_properties(e,exports,5,d);return exports;}
NAPI_MODULE(NODE_GYP_MODULE_NAME,init)
