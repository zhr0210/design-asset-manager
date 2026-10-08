// Private synthetic release diagnostic. No system-wide enumeration, process
// termination, handle reclamation, retry or production permission is exported.
#define _WIN32_WINNT 0x0A00
#include <windows.h>
#include <winternl.h>
#include <processsnapshot.h>
#include <node_api.h>
#include <delayimp.h>
#include <string>
#include <vector>
#include <unordered_set>
#include <stdexcept>

static FARPROC WINAPI imports(unsigned notification,PDelayLoadInfo info) {
  if(notification==dliNotePreLoadLibrary && _stricmp(info->szDll,"node.exe")==0)
    return reinterpret_cast<FARPROC>(GetModuleHandleW(nullptr));
  return nullptr;
}
extern "C" const PfnDliHook __pfnDliNotifyHook2 = imports;
static bool retainedUnknown=false;
static unsigned liveProcesses=0;
static void demand(bool ok,const char* reason){if(!ok)throw std::runtime_error(reason);}
static void check(){demand(!retainedUnknown,"RELEASE_DIAGNOSTIC_RETAINED_UNKNOWN");}
static napi_value prop(napi_env e,napi_value o,const char* key){napi_value v;demand(napi_get_named_property(e,o,key,&v)==napi_ok,"RELEASE_ARGUMENT_REFUSED");return v;}
static std::wstring text(napi_env e,napi_value v){size_t n=0;demand(napi_get_value_string_utf16(e,v,nullptr,0,&n)==napi_ok&&n>0&&n<=2048,"RELEASE_STRING_REFUSED");std::wstring s(n+1,L'\0');demand(napi_get_value_string_utf16(e,v,reinterpret_cast<char16_t*>(&s[0]),n+1,&n)==napi_ok,"RELEASE_STRING_REFUSED");s.resize(n);demand(s.find(L'\0')==std::wstring::npos,"RELEASE_NUL_REFUSED");return s;}
static void number(napi_env e,napi_value o,const char*k,double n){napi_value v;napi_create_double(e,n,&v);napi_set_named_property(e,o,k,v);}
static void boolean(napi_env e,napi_value o,const char*k,bool b){napi_value v;napi_get_boolean(e,b,&v);napi_set_named_property(e,o,k,v);}
static void str(napi_env e,napi_value o,const char*k,const std::string&s){napi_value v;napi_create_string_utf8(e,s.c_str(),s.size(),&v);napi_set_named_property(e,o,k,v);}
static std::string decimal(ULONGLONG n){return std::to_string(n);}
static ULONGLONG times(FILETIME f){return(static_cast<ULONGLONG>(f.dwHighDateTime)<<32)|f.dwLowDateTime;}
static bool component(const std::wstring& s){return!s.empty()&&s.size()<=255&&s!=L"."&&s!=L".."&&s.find_first_of(L"\\/:")==std::wstring::npos;}
static void rootScope(const std::wstring& root){
  wchar_t temp[32768];DWORD n=GetTempPathW(32768,temp);
  demand(n>3&&n<32768&&root.size()>n&&root.size()<=2048&&root[1]==L':'&&root[2]==L'\\'&&_wcsnicmp(root.c_str(),temp,n)==0,"RELEASE_ROOT_SCOPE_REFUSED");
  std::wstring name=root.substr(n);
  demand(component(name)&&name.size()>31&&name.compare(0,31,L"dam-native-qualification-build-")==0,"RELEASE_ROOT_COMPONENT_REFUSED");
}
static void onceClose(HANDLE h){if(h&&!CloseHandle(h)){retainedUnknown=true;throw std::runtime_error("RELEASE_CLOSE_UNKNOWN_"+std::to_string(GetLastError()));}}
struct Process {HANDLE handle=nullptr;DWORD pid=0;ULONGLONG created=0;bool closed=false,counted=false,cleanupUnknown=false;};
static std::unordered_set<Process*> processes;
static void finalize(napi_env,void*p,void*){auto*s=static_cast<Process*>(p);processes.erase(s);HANDLE h=s->handle;s->handle=nullptr;if(h&&!CloseHandle(h))s->cleanupUnknown=true;if(s->cleanupUnknown)retainedUnknown=true;else if(s->counted)--liveProcesses;delete s;}
static Process* process(napi_env e,napi_value v){void*p=nullptr;demand(napi_get_value_external(e,v,&p)==napi_ok&&p,"RELEASE_PROCESS_TOKEN_REFUSED");auto*s=static_cast<Process*>(p);demand(processes.find(s)!=processes.end()&&!s->closed&&s->handle,"RELEASE_PROCESS_CLOSED");return s;}
static napi_value processState(napi_env e,Process*s){
  DWORD result=WaitForSingleObject(s->handle,0),error=result==WAIT_FAILED?GetLastError():0,code=0;
  BOOL codeAvailable=GetExitCodeProcess(s->handle,&code);
  napi_value out;napi_create_object(e,&out);number(e,out,"pid",s->pid);str(e,out,"creationTime",decimal(s->created));
  number(e,out,"waitResult",result);number(e,out,"win32Error",error);boolean(e,out,"kernelSignaled",result==WAIT_OBJECT_0);boolean(e,out,"exitCodeAvailable",codeAvailable!=FALSE);number(e,out,"exitCode",code);boolean(e,out,"productionQualified",false);return out;
}
static napi_value retain(napi_env e,napi_callback_info info){try{
  check();demand(liveProcesses<64,"RELEASE_PROCESS_BOUND_REFUSED");size_t argc=1;napi_value a[1];napi_get_cb_info(e,info,&argc,a,nullptr,nullptr);double pid=0;
  demand(argc==1&&napi_get_value_double(e,a[0],&pid)==napi_ok&&pid>=1&&pid<=0xffffffff&&pid==static_cast<DWORD>(pid),"RELEASE_PID_REFUSED");
  HANDLE h=OpenProcess(PROCESS_QUERY_INFORMATION|SYNCHRONIZE,FALSE,static_cast<DWORD>(pid));demand(h!=nullptr,"RELEASE_OWNED_PROCESS_OPEN_REFUSED");
  try{
    using Query=NTSTATUS(NTAPI*)(HANDLE,PROCESSINFOCLASS,PVOID,ULONG,PULONG);
    auto query=reinterpret_cast<Query>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"NtQueryInformationProcess"));
    PROCESS_BASIC_INFORMATION basic{};demand(query&&query(h,ProcessBasicInformation,&basic,sizeof(basic),nullptr)>=0,"RELEASE_PARENT_QUERY_REFUSED");
    // The SDK reserves the final pointer, whose documented native basic layout
    // is the inherited parent PID. Restrict it to this already owned test Host.
    demand(reinterpret_cast<ULONG_PTR>(basic.Reserved3)==GetCurrentProcessId(),"RELEASE_PARENT_MISMATCH");
    wchar_t image[32768];DWORD length=32768;demand(QueryFullProcessImageNameW(h,0,image,&length),"RELEASE_IMAGE_QUERY_REFUSED");
    demand(_wcsicmp(std::wstring(image,length).c_str(),L"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe")==0,"RELEASE_IMAGE_MISMATCH");
    FILETIME created{},exited{},kernel{},user{},hostCreated{},hostExit{},hostKernel{},hostUser{};
    demand(GetProcessTimes(h,&created,&exited,&kernel,&user)&&GetProcessTimes(GetCurrentProcess(),&hostCreated,&hostExit,&hostKernel,&hostUser)&&times(created)>times(hostCreated),"RELEASE_CREATION_MISMATCH");
    demand(GetProcessId(h)==static_cast<DWORD>(pid),"RELEASE_PID_MISMATCH");
    auto*s=new Process();s->handle=h;s->pid=static_cast<DWORD>(pid);s->created=times(created);
    try{processes.insert(s);}catch(...){delete s;throw;}
    napi_value token;auto status=napi_create_external(e,s,finalize,nullptr,&token);
    if(status!=napi_ok){processes.erase(s);delete s;throw std::runtime_error("RELEASE_TOKEN_CREATION_REFUSED");}
    s->counted=true;++liveProcesses;h=nullptr;return token;
  }catch(...){HANDLE failed=h;h=nullptr;onceClose(failed);throw;}
}catch(const std::exception&ex){napi_throw_error(e,nullptr,ex.what());return nullptr;}}
static napi_value inspectProcess(napi_env e,napi_callback_info info){try{check();size_t argc=1;napi_value a[1];napi_get_cb_info(e,info,&argc,a,nullptr,nullptr);demand(argc==1,"RELEASE_ARGUMENT_COUNT_REFUSED");return processState(e,process(e,a[0]));}catch(const std::exception&ex){napi_throw_error(e,nullptr,ex.what());return nullptr;}}
static napi_value closeProcess(napi_env e,napi_callback_info info){try{size_t argc=1;napi_value a[1];napi_get_cb_info(e,info,&argc,a,nullptr,nullptr);demand(argc==1,"RELEASE_ARGUMENT_COUNT_REFUSED");auto*s=process(e,a[0]);s->closed=true;HANDLE h=s->handle;s->handle=nullptr;try{onceClose(h);}catch(...){s->cleanupUnknown=true;throw;}if(s->counted){s->counted=false;--liveProcesses;}napi_value v;napi_get_undefined(e,&v);return v;}catch(const std::exception&ex){napi_throw_error(e,nullptr,ex.what());return nullptr;}}
static napi_value moveRoot(napi_env e,napi_callback_info info){try{
  check();size_t argc=1;napi_value a[1];napi_get_cb_info(e,info,&argc,a,nullptr,nullptr);demand(argc==1,"RELEASE_ARGUMENT_COUNT_REFUSED");
  std::wstring root=text(e,prop(e,a[0],"root"));rootScope(root);std::wstring saved=root+L"-owned-release-diagnostic";
  napi_value wait=processState(e,process(e,prop(e,a[0],"process")));
  BOOL ok=MoveFileExW(root.c_str(),saved.c_str(),0);DWORD error=ok?0:GetLastError();
  napi_value out;napi_create_object(e,&out);boolean(e,out,"succeeded",ok!=FALSE);number(e,out,"win32Error",error);napi_set_named_property(e,out,"ownedGuardianBeforeMove",wait);boolean(e,out,"productionQualified",false);return out;
}catch(const std::exception&ex){napi_throw_error(e,nullptr,ex.what());return nullptr;}}
static napi_value ownHandles(napi_env e,napi_callback_info info){try{
  check();size_t argc=1;napi_value a[1];napi_get_cb_info(e,info,&argc,a,nullptr,nullptr);demand(argc==1,"RELEASE_ARGUMENT_COUNT_REFUSED");std::wstring root=text(e,a[0]);rootScope(root);
  wchar_t device[32768];std::wstring drive=root.substr(0,2);DWORD deviceLength=QueryDosDeviceW(drive.c_str(),device,32768);demand(deviceLength>0,"RELEASE_DEVICE_NAME_REFUSED");std::wstring owned=std::wstring(device)+root.substr(2);
  DWORD count=0;demand(GetProcessHandleCount(GetCurrentProcess(),&count)&&count<=4096,"RELEASE_HANDLE_SNAPSHOT_BOUND_REFUSED");
  HPSS snapshot=nullptr;HPSSWALK marker=nullptr;DWORD capture=PssCaptureSnapshot(GetCurrentProcess(),PSS_CAPTURE_HANDLES|PSS_CAPTURE_HANDLE_NAME_INFORMATION|PSS_CAPTURE_HANDLE_BASIC_INFORMATION,0,&snapshot);
  napi_value out,matches;napi_create_object(e,&out);napi_create_array(e,&matches);number(e,out,"hostPid",GetCurrentProcessId());number(e,out,"hostHandleCount",count);number(e,out,"captureError",capture);boolean(e,out,"currentHostOnly",true);boolean(e,out,"productionQualified",false);
  if(capture!=ERROR_SUCCESS){boolean(e,out,"available",false);return out;}
  unsigned index=0,walked=0,named=0,unnamed=0,typed=0,fileTyped=0,unnamedFileTyped=0,queriedFiles=0,fileQueryUnavailable=0,fileDuplicateUnavailable=0,fileTypeUnavailable=0;DWORD walkError=0;
  try{
    demand(PssWalkMarkerCreate(nullptr,&marker)==ERROR_SUCCESS,"RELEASE_WALK_MARKER_REFUSED");
    for(;;){PSS_HANDLE_ENTRY entry{};walkError=PssWalkSnapshot(snapshot,PSS_WALK_HANDLES,marker,&entry,sizeof(entry));if(walkError==ERROR_NO_MORE_ITEMS)break;demand(walkError==ERROR_SUCCESS,"RELEASE_SNAPSHOT_WALK_REFUSED");demand(++walked<=4096,"RELEASE_HANDLE_WALK_BOUND_REFUSED");
      bool fileType=false;if((entry.Flags&PSS_HANDLE_HAVE_TYPE)&&entry.TypeName){++typed;std::wstring typeName(entry.TypeName,entry.TypeNameLength/sizeof(wchar_t));fileType=_wcsicmp(typeName.c_str(),L"File")==0;if(fileType)++fileTyped;}
      bool namedEntry=(entry.Flags&PSS_HANDLE_HAVE_NAME)&&entry.ObjectName&&entry.ObjectNameLength>0;
      if(namedEntry)++named;else{++unnamed;if(fileType)++unnamedFileTyped;}
      if(!fileType)continue;
      // PSS on this Windows build omits names for File entries. Query only a
      // temporary SAME_ACCESS duplicate of the captured current-Host handle.
      // Never close the captured numeric source; it may already have changed.
      HANDLE duplicate=nullptr;
      if(!DuplicateHandle(GetCurrentProcess(),entry.Handle,GetCurrentProcess(),&duplicate,0,FALSE,DUPLICATE_SAME_ACCESS)){++fileDuplicateUnavailable;continue;}
      std::wstring name;BY_HANDLE_FILE_INFORMATION identity{};bool identityAvailable=false;
      try{
        if(GetFileType(duplicate)!=FILE_TYPE_DISK)++fileTypeUnavailable;
        else{
          wchar_t finalPath[32768];DWORD length=GetFinalPathNameByHandleW(duplicate,finalPath,32768,VOLUME_NAME_NT);
          if(length>0&&length<32768){name.assign(finalPath,length);++queriedFiles;identityAvailable=GetFileInformationByHandle(duplicate,&identity)!=FALSE;}
          else ++fileQueryUnavailable;
        }
      }catch(...){HANDLE old=duplicate;duplicate=nullptr;onceClose(old);throw;}
      HANDLE oldDuplicate=duplicate;duplicate=nullptr;onceClose(oldDuplicate);
      bool exact=_wcsicmp(name.c_str(),owned.c_str())==0;
      bool below=name.size()>owned.size()&&_wcsnicmp(name.c_str(),owned.c_str(),owned.size())==0&&name[owned.size()]==L'\\';
      if(!exact&&!below)continue;
      napi_value match;napi_create_object(e,&match);boolean(e,match,"root",exact);number(e,match,"capturedGrantedAccess",entry.GrantedAccess);number(e,match,"capturedHandleCount",entry.HandleCount);boolean(e,match,"identityAvailable",identityAvailable);boolean(e,match,"afterCaptureDuplicateObject",true);if(identityAvailable){str(e,match,"volume",decimal(identity.dwVolumeSerialNumber));str(e,match,"file",decimal((static_cast<ULONGLONG>(identity.nFileIndexHigh)<<32)|identity.nFileIndexLow));}napi_set_element(e,matches,index++,match);
    }
  }catch(...){if(marker){HPSSWALK old=marker;marker=nullptr;if(PssWalkMarkerFree(old)!=ERROR_SUCCESS)retainedUnknown=true;}HPSS old=snapshot;snapshot=nullptr;if(PssFreeSnapshot(GetCurrentProcess(),old)!=ERROR_SUCCESS)retainedUnknown=true;throw;}
  HPSSWALK oldMarker=marker;marker=nullptr;DWORD markerClosed=PssWalkMarkerFree(oldMarker);HPSS oldSnapshot=snapshot;snapshot=nullptr;DWORD snapshotClosed=PssFreeSnapshot(GetCurrentProcess(),oldSnapshot);
  if(markerClosed!=ERROR_SUCCESS||snapshotClosed!=ERROR_SUCCESS){retainedUnknown=true;throw std::runtime_error("RELEASE_SNAPSHOT_CLOSE_UNKNOWN");}
  boolean(e,out,"available",true);number(e,out,"walkedHandleCount",walked);number(e,out,"namedHandleCount",named);number(e,out,"unnamedHandleCount",unnamed);number(e,out,"typedHandleCount",typed);number(e,out,"fileTypedHandleCount",fileTyped);number(e,out,"unnamedFileTypedHandleCount",unnamedFileTyped);number(e,out,"queriedFilePathCount",queriedFiles);number(e,out,"filePathQueryUnavailableCount",fileQueryUnavailable);number(e,out,"fileDuplicateUnavailableCount",fileDuplicateUnavailable);number(e,out,"currentDuplicateNotDiskCount",fileTypeUnavailable);number(e,out,"untypedHandleCount",walked-typed);number(e,out,"matchedCount",index);str(e,out,"queryAuthority","SAME_ACCESS_DUPLICATE_OF_CURRENT_HOST_CAPTURED_FILE_HANDLES");napi_set_named_property(e,out,"matches",matches);return out;
}catch(const std::exception&ex){napi_throw_error(e,nullptr,ex.what());return nullptr;}}
static napi_value verifyModule(napi_env e,napi_callback_info info){try{size_t argc=1;napi_value a[1];napi_get_cb_info(e,info,&argc,a,nullptr,nullptr);demand(argc==1,"RELEASE_ARGUMENT_COUNT_REFUSED");std::wstring expected=text(e,a[0]);HMODULE module=nullptr;wchar_t actual[32768];demand(GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS|GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,reinterpret_cast<LPCWSTR>(&moveRoot),&module),"RELEASE_MODULE_IDENTITY_REFUSED");DWORD length=GetModuleFileNameW(module,actual,32768);demand(length>0&&length<32768,"RELEASE_MODULE_PATH_REFUSED");std::wstring loaded(actual,length);if(loaded.rfind(L"\\\\?\\",0)==0)loaded=loaded.substr(4);demand(_wcsicmp(loaded.c_str(),expected.c_str())==0,"RELEASE_MODULE_PATH_MISMATCH");napi_value yes;napi_get_boolean(e,true,&yes);return yes;}catch(const std::exception&ex){napi_throw_error(e,nullptr,ex.what());return nullptr;}}
static napi_value init(napi_env e,napi_value exports){napi_property_descriptor d[]={{"retainGuardian",nullptr,retain,nullptr,nullptr,nullptr,napi_default,nullptr},{"inspectGuardian",nullptr,inspectProcess,nullptr,nullptr,nullptr,napi_default,nullptr},{"closeGuardian",nullptr,closeProcess,nullptr,nullptr,nullptr,napi_default,nullptr},{"firstMoveRoot",nullptr,moveRoot,nullptr,nullptr,nullptr,napi_default,nullptr},{"inspectOwnRootHandles",nullptr,ownHandles,nullptr,nullptr,nullptr,napi_default,nullptr},{"verifyLoadedModulePath",nullptr,verifyModule,nullptr,nullptr,nullptr,napi_default,nullptr}};napi_define_properties(e,exports,6,d);return exports;}
NAPI_MODULE(NODE_GYP_MODULE_NAME,init)
