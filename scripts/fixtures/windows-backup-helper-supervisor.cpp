// Test-owned Host module. It runs inside the already admitted Electron Host;
// no additional unbounded supervisor process is started. Helpers are atomically
// born in the Job before their initial thread or CLR can execute.
#include <windows.h>
#include <winternl.h>
#include <psapi.h>
#include <bcrypt.h>
#include <node_api.h>
#include <delayimp.h>
#include <string>
#include <vector>
#include <stdexcept>
#include <algorithm>
#include <cstdint>

// The existing cached import library names node.exe; Electron exports the same
// stable N-API from its actual executable. Resolve to the already running Host,
// never load another Node executable or rebuild a product dependency.
static FARPROC WINAPI hostImports(unsigned notification,PDelayLoadInfo info) {
  if(notification==dliNotePreLoadLibrary && _stricmp(info->szDll,"node.exe")==0) return reinterpret_cast<FARPROC>(GetModuleHandleW(nullptr));
  return nullptr;
}
extern "C" const PfnDliHook __pfnDliNotifyHook2 = hostImports;

static const SIZE_T ProcessLimit = 128ULL * 1024 * 1024, JobLimit = 256ULL * 1024 * 1024;
static void require(bool ok, const char* reason) { if (!ok) throw std::runtime_error(std::string(reason) + "_" + std::to_string(GetLastError())); }
struct Owner {
  HANDLE job=nullptr, process=nullptr, input=nullptr, output=nullptr, error=nullptr;
  std::vector<HANDLE> pinned;
  DWORD pid=0; size_t stdoutBytes=0, stderrBytes=0;
  unsigned pendingWrites=0;
  bool exited=false, released=false, killed=false, injectUnknown=false;
  PROCESS_MEMORY_COUNTERS memory{}; JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{}; DWORD exitCode=0;
  ~Owner() {
    for (HANDLE h : pinned) CloseHandle(h);
    for (HANDLE h : {input,output,error,process,job}) if (h) CloseHandle(h);
  }
};
static std::vector<Owner*> unknownOwners;
static bool physicallyEmpty(Owner* current) {
  JOBOBJECT_BASIC_ACCOUNTING_INFORMATION account{};
  return current->pendingWrites==0 && WaitForSingleObject(current->process,0)==WAIT_OBJECT_0 &&
    QueryInformationJobObject(current->job,JobObjectBasicAccountingInformation,&account,sizeof(account),nullptr) && account.ActiveProcesses==0;
}
static bool dispose(Owner* current) {
  if(!current->released && current->process) {
    TerminateJobObject(current->job,1);
    // Unknown physical termination retains all resource handles. Do not close
    // the Job or return an ordinary completed resource receipt after a timeout.
    if(current->injectUnknown){unknownOwners.push_back(current);return false;}
    ULONGLONG deadline=GetTickCount64()+5000;
    while(!physicallyEmpty(current)) {if(GetTickCount64()>=deadline){unknownOwners.push_back(current);return false;}Sleep(10);}
  }
  delete current;return true;
}
static std::wstring text(napi_env env,napi_value value) {
  size_t length=0; require(napi_get_value_string_utf16(env,value,nullptr,0,&length)==napi_ok && length>0 && length<=32767,"HELPER_STRING_REFUSED");
  std::wstring result(length+1,L'\0'); require(napi_get_value_string_utf16(env,value,reinterpret_cast<char16_t*>(&result[0]),length+1,&length)==napi_ok,"HELPER_STRING_READ_FAILED"); result.resize(length); return result;
}
static napi_value property(napi_env env,napi_value object,const char* name) { napi_value value; require(napi_get_named_property(env,object,name,&value)==napi_ok,"HELPER_ARGUMENT_REFUSED"); return value; }
static void number(napi_env env,napi_value object,const char* name,double value) { napi_value result; napi_create_double(env,value,&result); napi_set_named_property(env,object,name,result); }
static void boolean(napi_env env,napi_value object,const char* name,bool value) { napi_value result; napi_get_boolean(env,value,&result); napi_set_named_property(env,object,name,result); }
static void string(napi_env env,napi_value object,const char* name,const std::string& value) { napi_value result; napi_create_string_utf8(env,value.c_str(),value.size(),&result); napi_set_named_property(env,object,name,result); }
static std::string narrow(const std::wstring& value) { int count=WideCharToMultiByte(CP_UTF8,0,value.c_str(),static_cast<int>(value.size()),nullptr,0,nullptr,nullptr); std::string result(count,'\0'); WideCharToMultiByte(CP_UTF8,0,value.c_str(),static_cast<int>(value.size()),&result[0],count,nullptr,nullptr); return result; }
static HANDLE child(HANDLE parent,const std::wstring& name,bool directory) {
  require(!name.empty() && name!=L"." && name!=L".." && name.find_first_of(L"\\/:\0")==std::wstring::npos,"ARTIFACT_COMPONENT_REFUSED");
  UNICODE_STRING unicode{}; unicode.Buffer=const_cast<PWSTR>(name.c_str()); unicode.Length=static_cast<USHORT>(name.size()*sizeof(wchar_t)); unicode.MaximumLength=unicode.Length;
  OBJECT_ATTRIBUTES attributes{}; InitializeObjectAttributes(&attributes,&unicode,OBJ_CASE_INSENSITIVE|0x1000,parent,nullptr);
  IO_STATUS_BLOCK io{}; HANDLE handle=nullptr;
  using NtCreate = NTSTATUS (NTAPI*)(PHANDLE,ACCESS_MASK,POBJECT_ATTRIBUTES,PIO_STATUS_BLOCK,PLARGE_INTEGER,ULONG,ULONG,ULONG,ULONG,PVOID,ULONG);
  auto create=reinterpret_cast<NtCreate>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"),"NtCreateFile")); require(create!=nullptr,"NT_CREATE_MISSING");
  // Deny data-write/delete sharing while retaining normal traversal. Windows
  // metadata/FSCTL operations are not proven blocked by these attribute handles;
  // managed executable pathname and module-load qualification remain false.
  NTSTATUS status=create(&handle,(directory?FILE_READ_ATTRIBUTES:GENERIC_READ)|SYNCHRONIZE,&attributes,&io,nullptr,0,FILE_SHARE_READ,1,(directory?1:0x40)|0x20|0x200000,nullptr,0);
  if (status<0) { if (handle) CloseHandle(handle); throw std::runtime_error("ARTIFACT_COMPONENT_OPEN_REFUSED_"+std::to_string(static_cast<unsigned long>(status))); }
  BY_HANDLE_FILE_INFORMATION info{};
  if (!GetFileInformationByHandle(handle,&info) || (info.dwFileAttributes&FILE_ATTRIBUTE_REPARSE_POINT) || (!directory && (info.nNumberOfLinks!=1 || (info.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY)))) { CloseHandle(handle); throw std::runtime_error("ARTIFACT_KIND_REFUSED"); }
  return handle;
}
static HANDLE pin(Owner& owner,const std::wstring& path) {
  wchar_t temporary[32768]; DWORD count=GetTempPathW(32768,temporary); require(count>0&&count<32768,"TEMP_PATH_REFUSED");
  std::wstring prefix=std::wstring(temporary)+L"dam-backup-helper-",hostPrefix=std::wstring(temporary)+L"dam-native-qualification-build-";
  bool owned=(path.size()>prefix.size()&&_wcsnicmp(path.c_str(),prefix.c_str(),prefix.size())==0)||(path.size()>hostPrefix.size()&&_wcsnicmp(path.c_str(),hostPrefix.c_str(),hostPrefix.size())==0);
  require(path.size()<2048&&owned&&path.size()>3&&path[1]==L':'&&path[2]==L'\\',"ARTIFACT_PATH_NOT_OWNED");
  HANDLE current=CreateFileW((L"\\\\?\\"+path.substr(0,3)).c_str(),FILE_READ_ATTRIBUTES|SYNCHRONIZE,FILE_SHARE_READ,nullptr,OPEN_EXISTING,FILE_FLAG_BACKUP_SEMANTICS|FILE_FLAG_OPEN_REPARSE_POINT,nullptr);
  require(current!=INVALID_HANDLE_VALUE,"ARTIFACT_ROOT_REFUSED"); owner.pinned.push_back(current);
  size_t offset=3;
  while(offset<path.size()) { size_t separator=path.find(L'\\',offset); bool directory=separator!=std::wstring::npos; std::wstring name=path.substr(offset,directory?separator-offset:path.size()-offset); current=child(current,name,directory); owner.pinned.push_back(current); if(!directory)break; offset=separator+1; }
  return current;
}
static std::string digest(HANDLE file) {
  LARGE_INTEGER size{}; require(GetFileSizeEx(file,&size)&&size.QuadPart>0&&size.QuadPart<=1024*1024,"ARTIFACT_SIZE_REFUSED");
  struct HashState {
    BCRYPT_ALG_HANDLE algorithm=nullptr; BCRYPT_HASH_HANDLE hash=nullptr;
    std::vector<unsigned char> object;
    ~HashState() {if(hash)BCryptDestroyHash(hash);if(algorithm)BCryptCloseAlgorithmProvider(algorithm,0);}
  } state;
  auto& algorithm=state.algorithm;auto& hash=state.hash;DWORD objectBytes=0,returned=0;
  require(BCryptOpenAlgorithmProvider(&algorithm,BCRYPT_SHA256_ALGORITHM,nullptr,0)>=0,"HASH_PROVIDER_REFUSED");
  require(BCryptGetProperty(algorithm,BCRYPT_OBJECT_LENGTH,reinterpret_cast<PUCHAR>(&objectBytes),sizeof(objectBytes),&returned,0)>=0&&objectBytes<65536,"HASH_OBJECT_REFUSED");
  state.object.resize(objectBytes); unsigned char buffer[65536],output[32];
  require(BCryptCreateHash(algorithm,&hash,state.object.data(),objectBytes,nullptr,0,0)>=0,"HASH_CREATE_REFUSED");
  LARGE_INTEGER begin{}; require(SetFilePointerEx(file,begin,nullptr,FILE_BEGIN),"ARTIFACT_SEEK_REFUSED");
  DWORD bytes=0; LONGLONG read=0;
  while (ReadFile(file,buffer,sizeof(buffer),&bytes,nullptr)&&bytes) { read+=bytes; require(BCryptHashData(hash,buffer,bytes,0)>=0,"HASH_DATA_REFUSED"); }
  bool ok=read==size.QuadPart&&BCryptFinishHash(hash,output,sizeof(output),0)>=0;
  require(ok,"ARTIFACT_HASH_REFUSED");
  static const char hex[]="0123456789abcdef"; std::string result(64,'0'); for(size_t i=0;i<32;i++){result[2*i]=hex[output[i]>>4];result[2*i+1]=hex[output[i]&15];} return result;
}
static Owner* owner(napi_env env,napi_value value) { void* result=nullptr; require(napi_get_value_external(env,value,&result)==napi_ok&&result,"HELPER_OWNER_REFUSED"); return static_cast<Owner*>(result); }
static void finalize(napi_env,void* data,void*) { dispose(static_cast<Owner*>(data)); }
static void pipe(HANDLE& parent,HANDLE& inherited,bool parentReads) {
  SECURITY_ATTRIBUTES security{sizeof(security),nullptr,TRUE}; HANDLE read=nullptr,write=nullptr;
  require(CreatePipe(&read,&write,&security,65536),"HELPER_PIPE_CREATE_FAILED"); parent=parentReads?read:write; inherited=parentReads?write:read; require(SetHandleInformation(parent,HANDLE_FLAG_INHERIT,0),"HELPER_PIPE_INHERIT_REFUSED");
}
static napi_value launch(napi_env env,napi_callback_info info) {
  Owner* current=new Owner(); HANDLE in=nullptr,out=nullptr,err=nullptr; LPPROC_THREAD_ATTRIBUTE_LIST attributes=nullptr;bool attributesInitialized=false; PROCESS_INFORMATION process{};
  try {
    size_t argc=1; napi_value args[1]; napi_get_cb_info(env,info,&argc,args,nullptr,nullptr); require(argc==1,"HELPER_ARGUMENT_COUNT_REFUSED");
    std::wstring launcher=text(env,property(env,args[0],"launcher")), target=text(env,property(env,args[0],"target")), environment=text(env,property(env,args[0],"environment")),supervisor=text(env,property(env,args[0],"supervisor"));
    std::string launcherExpected=narrow(text(env,property(env,args[0],"launcherSha256"))),targetExpected=narrow(text(env,property(env,args[0],"targetSha256"))),supervisorExpected=narrow(text(env,property(env,args[0],"supervisorSha256")));
    HMODULE module=nullptr;wchar_t modulePath[32768];require(GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS|GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,reinterpret_cast<LPCWSTR>(&launch),&module),"HOST_MODULE_IDENTITY_REFUSED");DWORD moduleLength=GetModuleFileNameW(module,modulePath,32768);require(moduleLength>0&&moduleLength<32768,"HOST_MODULE_PATH_READ_REFUSED");std::wstring loaded(modulePath,moduleLength);if(loaded.rfind(L"\\\\?\\",0)==0)loaded=loaded.substr(4);require(_wcsicmp(loaded.c_str(),supervisor.c_str())==0,"HOST_MODULE_PATH_IDENTITY_REFUSED");
    require(digest(pin(*current,launcher))==launcherExpected&&digest(pin(*current,target))==targetExpected&&digest(pin(*current,supervisor))==supervisorExpected,"ARTIFACT_SAME_HANDLE_SHA_REFUSED");
    current->job=CreateJobObjectW(nullptr,nullptr); require(current->job!=nullptr,"HELPER_JOB_CREATE_FAILED");
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{}; limits.BasicLimitInformation.LimitFlags=JOB_OBJECT_LIMIT_PROCESS_MEMORY|JOB_OBJECT_LIMIT_JOB_MEMORY|JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE|JOB_OBJECT_LIMIT_ACTIVE_PROCESS; limits.BasicLimitInformation.ActiveProcessLimit=2; limits.ProcessMemoryLimit=ProcessLimit; limits.JobMemoryLimit=JobLimit;
    require(SetInformationJobObject(current->job,JobObjectExtendedLimitInformation,&limits,sizeof(limits)),"HELPER_JOB_LIMIT_REFUSED");
    pipe(current->input,in,false); pipe(current->output,out,true); pipe(current->error,err,true);
    SIZE_T bytes=0; InitializeProcThreadAttributeList(nullptr,2,0,&bytes); require(bytes>0&&bytes<=65536,"HELPER_ATTRIBUTE_SIZE_REFUSED");
    attributes=static_cast<LPPROC_THREAD_ATTRIBUTE_LIST>(HeapAlloc(GetProcessHeap(),0,bytes)); require(attributes!=nullptr,"HELPER_ATTRIBUTE_ALLOC_FAILED");
    attributesInitialized=InitializeProcThreadAttributeList(attributes,2,0,&bytes)!=FALSE;require(attributesInitialized,"HELPER_ATTRIBUTE_INIT_FAILED");
    HANDLE handles[]={in,out,err}; require(UpdateProcThreadAttribute(attributes,0,PROC_THREAD_ATTRIBUTE_HANDLE_LIST,handles,sizeof(handles),nullptr,nullptr),"HELPER_HANDLE_LIST_REFUSED");
    // JOB_LIST places the new process in this exact Job atomically at creation,
    // before loader/CLR initialization. Assign-after-create is insufficient.
    require(UpdateProcThreadAttribute(attributes,0,PROC_THREAD_ATTRIBUTE_JOB_LIST,&current->job,sizeof(HANDLE),nullptr,nullptr),"HELPER_ATOMIC_JOB_LIST_REFUSED");
    STARTUPINFOEXW startup{}; startup.StartupInfo.cb=sizeof(startup); startup.StartupInfo.dwFlags=STARTF_USESTDHANDLES; startup.StartupInfo.hStdInput=in;startup.StartupInfo.hStdOutput=out;startup.StartupInfo.hStdError=err;startup.lpAttributeList=attributes;
    std::wstring command=L"\""+launcher+L"\"",directory=launcher.substr(0,launcher.find_last_of(L'\\')); environment.push_back(L'\0');
    require(CreateProcessW(launcher.c_str(),&command[0],nullptr,nullptr,TRUE,CREATE_SUSPENDED|CREATE_NO_WINDOW|CREATE_UNICODE_ENVIRONMENT|EXTENDED_STARTUPINFO_PRESENT,&environment[0],directory.c_str(),&startup.StartupInfo,&process),"HELPER_CREATE_REFUSED");
    current->process=process.hProcess;current->pid=process.dwProcessId; BOOL inside=FALSE; require(IsProcessInJob(process.hProcess,current->job,&inside)&&inside,"HELPER_ATOMIC_JOB_MEMBERSHIP_REFUSED");
    bool injected=false;napi_value injection=property(env,args[0],"injectLaunchUnknown");require(napi_get_value_bool(env,injection,&injected)==napi_ok,"HELPER_FAULT_ARGUMENT_REFUSED");
    if(injected){current->injectUnknown=true;throw std::runtime_error("SYNTHETIC_LAUNCH_FAILURE");}
    require(ResumeThread(process.hThread)!=static_cast<DWORD>(-1),"HELPER_RESUME_REFUSED");CloseHandle(process.hThread);process.hThread=nullptr;
    for(HANDLE h:{in,out,err})CloseHandle(h);in=out=err=nullptr;DeleteProcThreadAttributeList(attributes);HeapFree(GetProcessHeap(),0,attributes);attributes=nullptr;
    napi_value result;require(napi_create_external(env,current,finalize,nullptr,&result)==napi_ok,"HELPER_OWNER_REFERENCE_REFUSED");return result;
  } catch(const std::exception& error) {
    if(process.hThread)CloseHandle(process.hThread);for(HANDLE h:{in,out,err})if(h)CloseHandle(h);
    if(attributes){if(attributesInitialized)DeleteProcThreadAttributeList(attributes);HeapFree(GetProcessHeap(),0,attributes);}bool completed=dispose(current);std::string reason=error.what();if(!completed)reason+="_PHYSICAL_EXIT_UNKNOWN_RETAINED";napi_throw_error(env,nullptr,reason.c_str());return nullptr;
  }
}
static napi_value reapUnknown(napi_env env,napi_callback_info) {
  for(auto i=unknownOwners.begin();i!=unknownOwners.end();) {
    if(physicallyEmpty(*i)){delete *i;i=unknownOwners.erase(i);}else ++i;
  }
  napi_value result;napi_get_boolean(env,unknownOwners.empty(),&result);return result;
}
static std::string readPipe(HANDLE pipe,size_t& total,size_t maximum) {
  DWORD available=0; if(!PeekNamedPipe(pipe,nullptr,0,nullptr,&available,nullptr)) { require(GetLastError()==ERROR_BROKEN_PIPE,"HELPER_PIPE_PEEK_REFUSED");return {}; }
  require(total+available<=maximum,"HELPER_PIPE_OUTPUT_BOUND_REFUSED"); if(!available)return {};
  std::string result(available,'\0');DWORD read=0;require(ReadFile(pipe,&result[0],available,&read,nullptr)&&read==available,"HELPER_PIPE_READ_REFUSED");total+=read;return result;
}
static napi_value poll(napi_env env,napi_callback_info info) {
  try {size_t argc=2;napi_value args[2];napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);Owner* current=owner(env,args[0]);require(!current->released,"HELPER_ALREADY_RELEASED");bool discard=false;if(argc>1)napi_get_value_bool(env,args[1],&discard);
    napi_value result;napi_create_object(env,&result);std::string stdoutText=discard?std::string():readPipe(current->output,current->stdoutBytes,24576),stderrText=discard?std::string():readPipe(current->error,current->stderrBytes,8192);
    DWORD state=WaitForSingleObject(current->process,0);require(state==WAIT_OBJECT_0||state==WAIT_TIMEOUT,"HELPER_WAIT_REFUSED");
    if(state==WAIT_OBJECT_0&&!current->exited) { current->memory.cb=sizeof(current->memory);require(GetProcessMemoryInfo(current->process,&current->memory,sizeof(current->memory)),"HELPER_POSTEXIT_MEMORY_REFUSED");require(GetExitCodeProcess(current->process,&current->exitCode),"HELPER_POSTEXIT_CODE_REFUSED");require(QueryInformationJobObject(current->job,JobObjectExtendedLimitInformation,&current->limits,sizeof(current->limits),nullptr),"HELPER_POSTEXIT_JOB_REFUSED");
      JOBOBJECT_BASIC_ACCOUNTING_INFORMATION account{};require(QueryInformationJobObject(current->job,JobObjectBasicAccountingInformation,&account,sizeof(account),nullptr),"HELPER_JOB_ACCOUNTING_REFUSED");current->exited=account.ActiveProcesses==0;
      // The final pipe write can land between the first Peek and the process
      // signal. Drain again after the signal before declaring physical close.
      if(!discard){stdoutText+=readPipe(current->output,current->stdoutBytes,24576);stderrText+=readPipe(current->error,current->stderrBytes,8192);}
    }
    string(env,result,"stdout",stdoutText);string(env,result,"stderr",stderrText);
    boolean(env,result,"exited",current->exited&&current->pendingWrites==0);number(env,result,"pid",current->pid);
    if(current->exited){number(env,result,"exitCode",current->exitCode);number(env,result,"launcherPeakWorkingSet",current->memory.PeakWorkingSetSize);number(env,result,"launcherPeakCommit",current->memory.PeakPagefileUsage);number(env,result,"jobPeakCommit",current->limits.PeakJobMemoryUsed);number(env,result,"processLimit",current->limits.ProcessMemoryLimit);number(env,result,"jobLimit",current->limits.JobMemoryLimit);boolean(env,result,"jobEmpty",true);boolean(env,result,"killed",current->killed);boolean(env,result,"managedArtifactsPinned",true);}
    return result;
  }catch(const std::exception& error){napi_throw_error(env,nullptr,error.what());return nullptr;}
}
struct InputWrite { Owner* owner; HANDLE input; void* bytes; size_t length; napi_ref ownerReference=nullptr,bufferReference=nullptr,callbackReference=nullptr; napi_async_work work=nullptr; bool ok=false; DWORD error=0; };
static void performWrite(napi_env,void* data) {auto* write=static_cast<InputWrite*>(data);DWORD written=0;write->ok=WriteFile(write->input,write->bytes,static_cast<DWORD>(write->length),&written,nullptr)&&written==write->length;if(!write->ok)write->error=GetLastError();}
static void finishWrite(napi_env env,napi_status status,void* data) {
  auto* write=static_cast<InputWrite*>(data);write->owner->pendingWrites--;
  napi_value callback,receiver,argument;napi_get_reference_value(env,write->callbackReference,&callback);napi_get_undefined(env,&receiver);
  if(status==napi_ok&&write->ok)napi_get_null(env,&argument);else{napi_value message;std::string reason="HELPER_INPUT_WRITE_REFUSED_"+std::to_string(write->error);napi_create_string_utf8(env,reason.c_str(),reason.size(),&message);napi_create_error(env,nullptr,message,&argument);}
  napi_call_function(env,receiver,callback,1,&argument,nullptr);
  napi_delete_reference(env,write->callbackReference);napi_delete_reference(env,write->bufferReference);napi_delete_reference(env,write->ownerReference);napi_delete_async_work(env,write->work);delete write;
}
static napi_value write(napi_env env,napi_callback_info info) {
  InputWrite* pending=nullptr;
  try {size_t argc=3;napi_value args[3];napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);require(argc==3,"HELPER_INPUT_ARGUMENT_REFUSED");Owner* current=owner(env,args[0]);void* bytes=nullptr;size_t length=0;napi_valuetype type;require(napi_typeof(env,args[2],&type)==napi_ok&&type==napi_function,"HELPER_INPUT_CALLBACK_REFUSED");require(current->input&&!current->released&&!current->exited&&current->pendingWrites==0&&napi_get_buffer_info(env,args[1],&bytes,&length)==napi_ok&&length<=1024*1024,"HELPER_INPUT_REFUSED");
    pending=new InputWrite{current,current->input,bytes,length};require(napi_create_reference(env,args[0],1,&pending->ownerReference)==napi_ok&&napi_create_reference(env,args[1],1,&pending->bufferReference)==napi_ok&&napi_create_reference(env,args[2],1,&pending->callbackReference)==napi_ok,"HELPER_INPUT_REFERENCE_REFUSED");
    napi_value label;require(napi_create_string_utf8(env,"owned-backup-input",NAPI_AUTO_LENGTH,&label)==napi_ok,"HELPER_INPUT_LABEL_REFUSED");require(napi_create_async_work(env,nullptr,label,performWrite,finishWrite,pending,&pending->work)==napi_ok,"HELPER_INPUT_WORK_REFUSED");require(napi_queue_async_work(env,pending->work)==napi_ok,"HELPER_INPUT_QUEUE_REFUSED");current->pendingWrites++;
    napi_value result;napi_get_undefined(env,&result);return result;
  }catch(const std::exception& error){if(pending){if(pending->ownerReference)napi_delete_reference(env,pending->ownerReference);if(pending->bufferReference)napi_delete_reference(env,pending->bufferReference);if(pending->callbackReference)napi_delete_reference(env,pending->callbackReference);if(pending->work)napi_delete_async_work(env,pending->work);delete pending;}napi_throw_error(env,nullptr,error.what());return nullptr;}
}
static napi_value end(napi_env env,napi_callback_info info) {size_t argc=1;napi_value args[1];napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);try{Owner* current=owner(env,args[0]);if(current->input){CloseHandle(current->input);current->input=nullptr;}napi_value result;napi_get_undefined(env,&result);return result;}catch(const std::exception& error){napi_throw_error(env,nullptr,error.what());return nullptr;}}
static napi_value kill(napi_env env,napi_callback_info info) {size_t argc=1;napi_value args[1];napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);try{Owner* current=owner(env,args[0]);require(!current->released&&TerminateJobObject(current->job,1),"HELPER_JOB_TERMINATE_REFUSED");current->killed=true;napi_value result;napi_get_boolean(env,true,&result);return result;}catch(const std::exception& error){napi_throw_error(env,nullptr,error.what());return nullptr;}}
static napi_value release(napi_env env,napi_callback_info info) {size_t argc=1;napi_value args[1];napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);try{Owner* current=owner(env,args[0]);require(current->exited&&current->pendingWrites==0,"HELPER_RELEASE_BEFORE_PHYSICAL_EXIT_REFUSED");if(!current->released){for(HANDLE& h:current->pinned){CloseHandle(h);h=nullptr;}current->pinned.clear();for(HANDLE* h:{&current->input,&current->output,&current->error,&current->process,&current->job})if(*h){CloseHandle(*h);*h=nullptr;}current->released=true;}napi_value result;napi_get_undefined(env,&result);return result;}catch(const std::exception& error){napi_throw_error(env,nullptr,error.what());return nullptr;}}
// Private preparation cleanup only. Values come from the owned OS guardian's
// retained pipe after it duplicated disk handles into this exact Host. This is
// not renderer IPC or a general handle-closing business action.
static napi_value closeTransferredHandles(napi_env env,napi_callback_info info) {
  try {
    size_t argc=1;napi_value args[1];require(napi_get_cb_info(env,info,&argc,args,nullptr,nullptr)==napi_ok&&argc==1,"LOAD_HANDLES_ARGUMENT_REFUSED");
    bool array=false;uint32_t count=0;require(napi_is_array(env,args[0],&array)==napi_ok&&array&&napi_get_array_length(env,args[0],&count)==napi_ok&&count>0&&count<=128,"LOAD_HANDLES_BOUND_REFUSED");
    std::vector<HANDLE> handles;
    for(uint32_t i=0;i<count;i++) {
      napi_value value;require(napi_get_element(env,args[0],i,&value)==napi_ok,"LOAD_HANDLE_READ_REFUSED");
      std::wstring digits=text(env,value);require(!digits.empty()&&digits.size()<=20&&digits.find_first_not_of(L"0123456789")==std::wstring::npos&&digits[0]!=L'0',"LOAD_HANDLE_DECIMAL_REFUSED");
      unsigned long long number=std::stoull(digits);require(number<=static_cast<unsigned long long>(UINTPTR_MAX),"LOAD_HANDLE_RANGE_REFUSED");
      HANDLE handle=reinterpret_cast<HANDLE>(static_cast<uintptr_t>(number));
      require(std::find(handles.begin(),handles.end(),handle)==handles.end()&&GetFileType(handle)==FILE_TYPE_DISK,"LOAD_HANDLE_KIND_REFUSED");
      handles.push_back(handle);
    }
    bool complete=true;for(HANDLE handle:handles)if(!CloseHandle(handle))complete=false;
    require(complete,"LOAD_HANDLES_RELEASE_UNKNOWN");napi_value result;require(napi_get_undefined(env,&result)==napi_ok,"LOAD_HANDLES_RESULT_REFUSED");return result;
  } catch(const std::exception& error){napi_throw_error(env,nullptr,error.what());return nullptr;}
}
static unsigned long long unsignedDecimal(napi_env env,napi_value value) {
  std::wstring digits=text(env,value);require(!digits.empty()&&digits.size()<=20&&digits.find_first_not_of(L"0123456789")==std::wstring::npos,"LOAD_PIN_DECIMAL_REFUSED");return std::stoull(digits);
}
// Independent Host validation of the exact handles copied into this process.
// Guardian is waiting for an explicit command, so these synchronous reads do
// not race its hash work. Duplicates share the file pointer: always restore it.
static napi_value verifyTransferredPins(napi_env env,napi_callback_info info) {
  HANDLE leaf=nullptr;LARGE_INTEGER saved{};bool moved=false;
  try {
    size_t argc=2;napi_value args[2];require(napi_get_cb_info(env,info,&argc,args,nullptr,nullptr)==napi_ok&&argc==2,"LOAD_PINS_ARGUMENT_REFUSED");
    bool array=false;uint32_t count=0;require(napi_is_array(env,args[0],&array)==napi_ok&&array&&napi_get_array_length(env,args[0],&count)==napi_ok&&count>1&&count<=128,"LOAD_PINS_BOUND_REFUSED");
    std::vector<HANDLE> handles;
    for(uint32_t i=0;i<count;i++) {
      napi_value pin;require(napi_get_element(env,args[0],i,&pin)==napi_ok,"LOAD_PIN_READ_REFUSED");
      unsigned long long id=unsignedDecimal(env,property(env,pin,"handle"));require(id>0&&id<=UINTPTR_MAX,"LOAD_PIN_HANDLE_RANGE_REFUSED");HANDLE handle=reinterpret_cast<HANDLE>(static_cast<uintptr_t>(id));
      require(std::find(handles.begin(),handles.end(),handle)==handles.end()&&GetFileType(handle)==FILE_TYPE_DISK,"LOAD_PIN_HANDLE_KIND_REFUSED");handles.push_back(handle);
      bool directory=false;require(napi_get_value_bool(env,property(env,pin,"directory"),&directory)==napi_ok,"LOAD_PIN_DIRECTORY_REFUSED");
      BY_HANDLE_FILE_INFORMATION actual{};require(GetFileInformationByHandle(handle,&actual),"LOAD_PIN_INFO_REFUSED");
      napi_value expected=property(env,pin,"identity");uint32_t links=0,attributes=0;
      require(napi_get_value_uint32(env,property(env,expected,"links"),&links)==napi_ok&&napi_get_value_uint32(env,property(env,expected,"attributes"),&attributes)==napi_ok,"LOAD_PIN_METADATA_REFUSED");
      unsigned long long file=(static_cast<unsigned long long>(actual.nFileIndexHigh)<<32)|actual.nFileIndexLow,size=(static_cast<unsigned long long>(actual.nFileSizeHigh)<<32)|actual.nFileSizeLow;
      require(!(actual.dwFileAttributes&FILE_ATTRIBUTE_REPARSE_POINT)&&!!(actual.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY)==directory&&actual.dwFileAttributes==attributes&&actual.nNumberOfLinks==links&&
        actual.dwVolumeSerialNumber==unsignedDecimal(env,property(env,expected,"volume"))&&file==unsignedDecimal(env,property(env,expected,"file"))&&size==unsignedDecimal(env,property(env,expected,"size")),"LOAD_PIN_IDENTITY_MISMATCH");
      if(i+1==count){require(!directory&&actual.nNumberOfLinks==1,"LOAD_PIN_LEAF_REFUSED");leaf=handle;}else require(directory,"LOAD_PIN_ANCESTOR_REFUSED");
    }
    std::string expected=narrow(text(env,args[1]));require(expected.size()==64&&expected.find_first_not_of("0123456789abcdef")==std::string::npos,"LOAD_PIN_SHA_ARGUMENT_REFUSED");
    LARGE_INTEGER zero{};require(SetFilePointerEx(leaf,zero,&saved,FILE_CURRENT),"LOAD_PIN_POSITION_REFUSED");moved=true;
    std::string actual=digest(leaf);require(SetFilePointerEx(leaf,saved,nullptr,FILE_BEGIN),"LOAD_PIN_POSITION_RESTORE_REFUSED");moved=false;
    require(actual==expected,"LOAD_PIN_SHA_MISMATCH");napi_value result;require(napi_create_object(env,&result)==napi_ok,"LOAD_PIN_RESULT_REFUSED");boolean(env,result,"hostPinsMatched",true);string(env,result,"leafSha256",actual);return result;
  }catch(const std::exception& error){if(moved)SetFilePointerEx(leaf,saved,nullptr,FILE_BEGIN);napi_throw_error(env,nullptr,error.what());return nullptr;}
}
static napi_value verifyLoadedModulePath(napi_env env,napi_callback_info info) {
  try {
    size_t argc=1;napi_value args[1];require(napi_get_cb_info(env,info,&argc,args,nullptr,nullptr)==napi_ok&&argc==1,"LOAD_MODULE_ARGUMENT_REFUSED");
    std::wstring expected=text(env,args[0]);HMODULE module=nullptr;wchar_t buffer[32768];
    require(GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS|GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,reinterpret_cast<LPCWSTR>(&verifyLoadedModulePath),&module),"LOAD_MODULE_ADDRESS_REFUSED");
    DWORD length=GetModuleFileNameW(module,buffer,32768);require(length>0&&length<32768,"LOAD_MODULE_PATH_REFUSED");std::wstring actual(buffer,length);if(actual.rfind(L"\\\\?\\",0)==0)actual=actual.substr(4);
    require(_wcsicmp(actual.c_str(),expected.c_str())==0,"LOAD_MODULE_PATH_MISMATCH");napi_value result;napi_get_boolean(env,true,&result);return result;
  }catch(const std::exception& error){napi_throw_error(env,nullptr,error.what());return nullptr;}
}
NAPI_MODULE_INIT() { napi_property_descriptor descriptors[]={{"launch",nullptr,launch,nullptr,nullptr,nullptr,napi_default,nullptr},{"poll",nullptr,poll,nullptr,nullptr,nullptr,napi_default,nullptr},{"write",nullptr,write,nullptr,nullptr,nullptr,napi_default,nullptr},{"end",nullptr,end,nullptr,nullptr,nullptr,napi_default,nullptr},{"kill",nullptr,kill,nullptr,nullptr,nullptr,napi_default,nullptr},{"release",nullptr,release,nullptr,nullptr,nullptr,napi_default,nullptr},{"reapUnknown",nullptr,reapUnknown,nullptr,nullptr,nullptr,napi_default,nullptr},{"closeTransferredHandles",nullptr,closeTransferredHandles,nullptr,nullptr,nullptr,napi_default,nullptr},{"verifyTransferredPins",nullptr,verifyTransferredPins,nullptr,nullptr,nullptr,napi_default,nullptr},{"verifyLoadedModulePath",nullptr,verifyLoadedModulePath,nullptr,nullptr,nullptr,napi_default,nullptr}}; napi_define_properties(env,exports,sizeof(descriptors)/sizeof(descriptors[0]),descriptors);return exports; }
