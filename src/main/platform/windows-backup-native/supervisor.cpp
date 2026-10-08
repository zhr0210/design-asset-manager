// Main-private packaged module. Caller admission precedes its first load;
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
  bool exited=false, released=false, killed=false, closeUnknown=false;
  PROCESS_MEMORY_COUNTERS memory{}; JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{}; DWORD exitCode=0;
  ~Owner() = default;
};
static std::vector<Owner*> unknownOwners;
static bool closeOne(Owner* o,HANDLE& h){if(!h)return true;HANDLE original=h;h=nullptr;if(!CloseHandle(original)){o->closeUnknown=true;return false;}return true;}
static bool closeAll(Owner* o){for(HANDLE& h:o->pinned)closeOne(o,h);o->pinned.clear();for(HANDLE* h:{&o->input,&o->output,&o->error,&o->process,&o->job})closeOne(o,*h);return !o->closeUnknown;}
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
    ULONGLONG deadline=GetTickCount64()+5000;
    while(!physicallyEmpty(current)) {if(GetTickCount64()>=deadline){unknownOwners.push_back(current);return false;}Sleep(10);}
  }
  if(!closeAll(current)){unknownOwners.push_back(current);return false;}
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
static HANDLE child(Owner& owner,HANDLE parent,const std::wstring& name,bool directory) {
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
  if (status<0) { if (handle)closeOne(&owner,handle); throw std::runtime_error("ARTIFACT_COMPONENT_OPEN_REFUSED_"+std::to_string(static_cast<unsigned long>(status))); }
  BY_HANDLE_FILE_INFORMATION info{};
  if (!GetFileInformationByHandle(handle,&info) || (info.dwFileAttributes&FILE_ATTRIBUTE_REPARSE_POINT) || (!directory && (info.nNumberOfLinks!=1 || (info.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY)))) {closeOne(&owner,handle);throw std::runtime_error("ARTIFACT_KIND_REFUSED");}
  return handle;
}
static HANDLE pin(Owner& owner,const std::wstring& path) {
  require(path.size()<32768&&path.size()>3&&path[1]==L':'&&path[2]==L'\\',"ARTIFACT_PATH_REFUSED");
  HANDLE current=CreateFileW((L"\\\\?\\"+path.substr(0,3)).c_str(),FILE_READ_ATTRIBUTES|SYNCHRONIZE,FILE_SHARE_READ,nullptr,OPEN_EXISTING,FILE_FLAG_BACKUP_SEMANTICS|FILE_FLAG_OPEN_REPARSE_POINT,nullptr);
  require(current!=INVALID_HANDLE_VALUE,"ARTIFACT_ROOT_REFUSED"); owner.pinned.push_back(current);
  size_t offset=3;
  while(offset<path.size()) { size_t separator=path.find(L'\\',offset); bool directory=separator!=std::wstring::npos; std::wstring name=path.substr(offset,directory?separator-offset:path.size()-offset); current=child(owner,current,name,directory); owner.pinned.push_back(current); if(!directory)break; offset=separator+1; }
  return current;
}
static std::string digest(Owner& owner,HANDLE file) {
  LARGE_INTEGER size{}; require(GetFileSizeEx(file,&size)&&size.QuadPart>0&&size.QuadPart<=1024*1024,"ARTIFACT_SIZE_REFUSED");
  struct HashState {
    Owner& owner;
    BCRYPT_ALG_HANDLE algorithm=nullptr; BCRYPT_HASH_HANDLE hash=nullptr;
    bool close() {
      if(hash){BCRYPT_HASH_HANDLE original=hash;hash=nullptr;if(BCryptDestroyHash(original)<0)owner.closeUnknown=true;}
      if(algorithm){BCRYPT_ALG_HANDLE original=algorithm;algorithm=nullptr;if(BCryptCloseAlgorithmProvider(original,0)<0)owner.closeUnknown=true;}
      return !owner.closeUnknown;
    }
    ~HashState() {close();}
  } state{owner};
  auto& algorithm=state.algorithm;auto& hash=state.hash;DWORD objectBytes=0,returned=0;
  require(BCryptOpenAlgorithmProvider(&algorithm,BCRYPT_SHA256_ALGORITHM,nullptr,0)>=0,"HASH_PROVIDER_REFUSED");
  require(BCryptGetProperty(algorithm,BCRYPT_OBJECT_LENGTH,reinterpret_cast<PUCHAR>(&objectBytes),sizeof(objectBytes),&returned,0)>=0&&objectBytes<65536,"HASH_OBJECT_REFUSED");
  unsigned char buffer[65536],output[32];
  // CNG owns this bounded SHA256 hash object's backing allocation. An unknown
  // destroy must not leave a live native hash referencing a freed C++ vector.
  require(BCryptCreateHash(algorithm,&hash,nullptr,0,nullptr,0,0)>=0,"HASH_CREATE_REFUSED");
  LARGE_INTEGER begin{}; require(SetFilePointerEx(file,begin,nullptr,FILE_BEGIN),"ARTIFACT_SEEK_REFUSED");
  DWORD bytes=0; LONGLONG read=0;
  while (ReadFile(file,buffer,sizeof(buffer),&bytes,nullptr)&&bytes) { read+=bytes; require(BCryptHashData(hash,buffer,bytes,0)>=0,"HASH_DATA_REFUSED"); }
  bool ok=read==size.QuadPart&&BCryptFinishHash(hash,output,sizeof(output),0)>=0;
  require(ok,"ARTIFACT_HASH_REFUSED");
  require(state.close(),"ARTIFACT_HASH_CLOSE_UNKNOWN");
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
    require(digest(*current,pin(*current,launcher))==launcherExpected&&digest(*current,pin(*current,target))==targetExpected&&digest(*current,pin(*current,supervisor))==supervisorExpected,"ARTIFACT_SAME_HANDLE_SHA_REFUSED");
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
    require(ResumeThread(process.hThread)!=static_cast<DWORD>(-1),"HELPER_RESUME_REFUSED");require(closeOne(current,process.hThread),"HELPER_THREAD_CLOSE_UNKNOWN");
    require(closeOne(current,in)&&closeOne(current,out)&&closeOne(current,err),"HELPER_INHERITED_CLOSE_UNKNOWN");DeleteProcThreadAttributeList(attributes);HeapFree(GetProcessHeap(),0,attributes);attributes=nullptr;
    napi_value result;require(napi_create_external(env,current,finalize,nullptr,&result)==napi_ok,"HELPER_OWNER_REFERENCE_REFUSED");return result;
  } catch(const std::exception& error) {
    closeOne(current,process.hThread);closeOne(current,in);closeOne(current,out);closeOne(current,err);
    if(attributes){if(attributesInitialized)DeleteProcThreadAttributeList(attributes);HeapFree(GetProcessHeap(),0,attributes);}bool completed=dispose(current);std::string reason=error.what();if(!completed)reason+="_PHYSICAL_EXIT_UNKNOWN_RETAINED";napi_throw_error(env,nullptr,reason.c_str());return nullptr;
  }
}
static napi_value reapUnknown(napi_env env,napi_callback_info) {
  for(auto i=unknownOwners.begin();i!=unknownOwners.end();) {
    if(!(*i)->closeUnknown&&physicallyEmpty(*i)&&closeAll(*i)){delete *i;i=unknownOwners.erase(i);}else ++i;
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
  try {size_t argc=3;napi_value args[3];napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);require(argc==3,"HELPER_INPUT_ARGUMENT_REFUSED");Owner* current=owner(env,args[0]);void* bytes=nullptr;size_t length=0;napi_valuetype type;require(napi_typeof(env,args[2],&type)==napi_ok&&type==napi_function,"HELPER_INPUT_CALLBACK_REFUSED");require(current->input&&!current->released&&!current->exited&&current->pendingWrites==0&&napi_get_buffer_info(env,args[1],&bytes,&length)==napi_ok&&length<=4*1024*1024,"HELPER_INPUT_REFUSED");
    pending=new InputWrite{current,current->input,bytes,length};require(napi_create_reference(env,args[0],1,&pending->ownerReference)==napi_ok&&napi_create_reference(env,args[1],1,&pending->bufferReference)==napi_ok&&napi_create_reference(env,args[2],1,&pending->callbackReference)==napi_ok,"HELPER_INPUT_REFERENCE_REFUSED");
    napi_value label;require(napi_create_string_utf8(env,"owned-backup-input",NAPI_AUTO_LENGTH,&label)==napi_ok,"HELPER_INPUT_LABEL_REFUSED");require(napi_create_async_work(env,nullptr,label,performWrite,finishWrite,pending,&pending->work)==napi_ok,"HELPER_INPUT_WORK_REFUSED");require(napi_queue_async_work(env,pending->work)==napi_ok,"HELPER_INPUT_QUEUE_REFUSED");current->pendingWrites++;
    napi_value result;napi_get_undefined(env,&result);return result;
  }catch(const std::exception& error){if(pending){if(pending->ownerReference)napi_delete_reference(env,pending->ownerReference);if(pending->bufferReference)napi_delete_reference(env,pending->bufferReference);if(pending->callbackReference)napi_delete_reference(env,pending->callbackReference);if(pending->work)napi_delete_async_work(env,pending->work);delete pending;}napi_throw_error(env,nullptr,error.what());return nullptr;}
}
static napi_value end(napi_env env,napi_callback_info info) {size_t argc=1;napi_value args[1];napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);try{Owner* current=owner(env,args[0]);require(closeOne(current,current->input),"HELPER_INPUT_CLOSE_UNKNOWN");napi_value result;napi_get_undefined(env,&result);return result;}catch(const std::exception& error){napi_throw_error(env,nullptr,error.what());return nullptr;}}
static napi_value kill(napi_env env,napi_callback_info info) {size_t argc=1;napi_value args[1];napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);try{Owner* current=owner(env,args[0]);require(!current->released&&TerminateJobObject(current->job,1),"HELPER_JOB_TERMINATE_REFUSED");current->killed=true;napi_value result;napi_get_boolean(env,true,&result);return result;}catch(const std::exception& error){napi_throw_error(env,nullptr,error.what());return nullptr;}}
static napi_value release(napi_env env,napi_callback_info info) {size_t argc=1;napi_value args[1];napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);try{Owner* current=owner(env,args[0]);require(current->exited&&current->pendingWrites==0,"HELPER_RELEASE_BEFORE_PHYSICAL_EXIT_REFUSED");if(!current->released){require(closeAll(current),"HELPER_KNOWN_CLOSE_UNKNOWN");current->released=true;}napi_value result;napi_get_undefined(env,&result);return result;}catch(const std::exception& error){napi_throw_error(env,nullptr,error.what());return nullptr;}}
static napi_value verifyLoadedModulePath(napi_env env,napi_callback_info info) {
  try {
    size_t argc=1;napi_value args[1];require(napi_get_cb_info(env,info,&argc,args,nullptr,nullptr)==napi_ok&&argc==1,"LOAD_MODULE_ARGUMENT_REFUSED");
    std::wstring expected=text(env,args[0]);HMODULE module=nullptr;wchar_t buffer[32768];
    require(GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS|GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,reinterpret_cast<LPCWSTR>(&verifyLoadedModulePath),&module),"LOAD_MODULE_ADDRESS_REFUSED");
    DWORD length=GetModuleFileNameW(module,buffer,32768);require(length>0&&length<32768,"LOAD_MODULE_PATH_REFUSED");std::wstring actual(buffer,length);if(actual.rfind(L"\\\\?\\",0)==0)actual=actual.substr(4);
    require(_wcsicmp(actual.c_str(),expected.c_str())==0,"LOAD_MODULE_PATH_MISMATCH");napi_value result;napi_get_boolean(env,true,&result);return result;
  }catch(const std::exception& error){napi_throw_error(env,nullptr,error.what());return nullptr;}
}
NAPI_MODULE_INIT() { napi_property_descriptor descriptors[]={{"launch",nullptr,launch,nullptr,nullptr,nullptr,napi_default,nullptr},{"poll",nullptr,poll,nullptr,nullptr,nullptr,napi_default,nullptr},{"write",nullptr,write,nullptr,nullptr,nullptr,napi_default,nullptr},{"end",nullptr,end,nullptr,nullptr,nullptr,napi_default,nullptr},{"kill",nullptr,kill,nullptr,nullptr,nullptr,napi_default,nullptr},{"release",nullptr,release,nullptr,nullptr,nullptr,napi_default,nullptr},{"reapUnknown",nullptr,reapUnknown,nullptr,nullptr,nullptr,napi_default,nullptr},{"verifyLoadedModulePath",nullptr,verifyLoadedModulePath,nullptr,nullptr,nullptr,napi_default,nullptr}}; napi_define_properties(env,exports,sizeof(descriptors)/sizeof(descriptors[0]),descriptors);return exports; }
