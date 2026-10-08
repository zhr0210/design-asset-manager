// Packaged launcher. An admitted Main native supervisor places
// this entire process in its Job atomically during CreateProcess, before CLR.
using System;
using System.IO;
using System.Text;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public static class DamWindowsBackupHelperLauncher {
 const uint Suspended=4, NoWindow=0x08000000, ExtendedStartup=0x00080000;
 const uint JobProcessMemory=0x100, JobMemory=0x200, KillOnClose=0x2000, ActiveProcess=8;
 const ulong ProcessLimit=128UL*1024*1024, JobLimit=256UL*1024*1024;
 [StructLayout(LayoutKind.Sequential)] struct StartupInfo {public uint Size;public IntPtr Reserved,Desktop,Title;public uint X,Y,XSize,YSize,XChars,YChars,Fill,Flags;public ushort Show,ReservedBytes;public IntPtr ReservedData,Input,Output,Error;}
 [StructLayout(LayoutKind.Sequential)] struct StartupInfoEx {public StartupInfo Info;public IntPtr Attributes;}
 [StructLayout(LayoutKind.Sequential)] struct ProcessInfo {public IntPtr Process,Thread;public uint Id,ThreadId;}
 [StructLayout(LayoutKind.Sequential)] struct BasicLimits {public long ProcessTime,JobTime;public uint Flags;public UIntPtr MinimumWorkingSet,MaximumWorkingSet;public uint ActiveProcesses;public UIntPtr Affinity;public uint Priority,Scheduling;}
 [StructLayout(LayoutKind.Sequential)] struct IoCounters {public ulong ReadOperations,WriteOperations,OtherOperations,ReadBytes,WriteBytes,OtherBytes;}
 [StructLayout(LayoutKind.Sequential)] struct ExtendedLimits {public BasicLimits Basic;public IoCounters Io;public UIntPtr ProcessMemory,JobMemory,PeakProcessMemory,PeakJobMemory;}
 [StructLayout(LayoutKind.Sequential)] struct MemoryCounters {public uint Size,PageFaults;public UIntPtr PeakWorkingSet,WorkingSet,QuotaPeakPaged,QuotaPaged,QuotaPeakNonPaged,QuotaNonPaged,Pagefile,PeakPagefile,Private;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateJobObjectW(IntPtr security,string name);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int type,ref ExtendedLimits info,uint bytes);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr job,int type,out ExtendedLimits info,uint bytes,IntPtr returned);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool IsProcessInJob(IntPtr process,IntPtr job,out bool result);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,uint flags,ref UIntPtr size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,UIntPtr attribute,IntPtr value,UIntPtr bytes,IntPtr old,IntPtr returned);
 [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcessW(string application,StringBuilder command,IntPtr processSecurity,IntPtr threadSecurity,bool inherit,uint flags,IntPtr environment,string directory,ref StartupInfoEx startup,out ProcessInfo info);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool DuplicateHandle(IntPtr sourceProcess,IntPtr source,IntPtr targetProcess,out IntPtr target,uint access,bool inherit,uint options);
 [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
 [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int value);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr handle);
 [DllImport("kernel32.dll",SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
 [DllImport("kernel32.dll",SetLastError=true)] static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateProcess(IntPtr process,uint code);
 [DllImport("psapi.dll",SetLastError=true)] static extern bool GetProcessMemoryInfo(IntPtr process,out MemoryCounters info,uint bytes);
 static void Require(bool value,string reason) {if(!value)throw new InvalidOperationException(reason+"_"+Marshal.GetLastWin32Error());}
 static string BoundTarget(string value){if(String.IsNullOrEmpty(value))throw new InvalidOperationException("TARGET_MISSING");string absolute=Path.GetFullPath(value);string own=System.Reflection.Assembly.GetExecutingAssembly().Location;if(absolute!=value||!String.Equals(Path.GetDirectoryName(absolute),Path.GetDirectoryName(own),StringComparison.OrdinalIgnoreCase)||Path.GetFileName(absolute)!="target.exe")throw new InvalidOperationException("TARGET_BUNDLE_REFUSED");return absolute;}
 static void CheckedClose(ref IntPtr value){if(value==IntPtr.Zero)return;IntPtr original=value;value=IntPtr.Zero;Require(CloseHandle(original),"LAUNCHER_RELEASE_UNKNOWN");}
 static IntPtr DuplicateStandard(int value) {
  IntPtr result,current=GetCurrentProcess(),source=GetStdHandle(value);
  Require(source!=IntPtr.Zero&&source!=new IntPtr(-1),"STANDARD_HANDLE_MISSING");
  Require(DuplicateHandle(current,source,current,out result,0,true,2),"STANDARD_HANDLE_DUPLICATE_FAILED");return result;
 }
 public static int Main() {
  IntPtr job=IntPtr.Zero,attributes=IntPtr.Zero,handleArray=IntPtr.Zero;
  IntPtr input=IntPtr.Zero,output=IntPtr.Zero,error=IntPtr.Zero;
  ProcessInfo child=new ProcessInfo();bool assignedSelf=false,started=false,exited=false,attributesInitialized=false;
  try {
   string target=BoundTarget(Environment.GetEnvironmentVariable("DAM_BACKUP_HELPER_TARGET_PATH"));
   if((File.GetAttributes(target)&FileAttributes.ReparsePoint)!=0)throw new InvalidOperationException("HELPER_ARTIFACT_NOT_FRESH");
   job=CreateJobObjectW(IntPtr.Zero,null);Require(job!=IntPtr.Zero,"JOB_CREATE_FAILED");
   ExtendedLimits limits=new ExtendedLimits();limits.Basic.Flags=JobProcessMemory|JobMemory|KillOnClose|ActiveProcess;limits.Basic.ActiveProcesses=2;limits.ProcessMemory=new UIntPtr(ProcessLimit);limits.JobMemory=new UIntPtr(JobLimit);
   Require(SetInformationJobObject(job,9,ref limits,(uint)Marshal.SizeOf(typeof(ExtendedLimits))),"JOB_LIMIT_FAILED");
   input=DuplicateStandard(-10);output=DuplicateStandard(-11);error=DuplicateStandard(-12);
   UIntPtr size=UIntPtr.Zero;InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref size);
   if(size==UIntPtr.Zero)throw new InvalidOperationException("ATTRIBUTE_SIZE_FAILED");
   attributes=Marshal.AllocHGlobal(checked((int)size.ToUInt64()));Require(InitializeProcThreadAttributeList(attributes,1,0,ref size),"ATTRIBUTE_INITIALIZE_FAILED");attributesInitialized=true;
   handleArray=Marshal.AllocHGlobal(3*IntPtr.Size);Marshal.WriteIntPtr(handleArray,0,input);Marshal.WriteIntPtr(handleArray,IntPtr.Size,output);Marshal.WriteIntPtr(handleArray,2*IntPtr.Size,error);
   Require(UpdateProcThreadAttribute(attributes,0,new UIntPtr(0x00020002),handleArray,new UIntPtr((uint)(3*IntPtr.Size)),IntPtr.Zero,IntPtr.Zero),"HANDLE_LIST_FAILED");
   StartupInfoEx startup=new StartupInfoEx();startup.Info.Size=(uint)Marshal.SizeOf(typeof(StartupInfoEx));startup.Info.Flags=0x100;startup.Info.Input=input;startup.Info.Output=output;startup.Info.Error=error;startup.Attributes=attributes;
   // Join before child creation: assigning the child to a new nested Job first
   // can prevent its parent from subsequently entering that Job (ERROR_ACCESS_DENIED).
   // No breakaway flag is requested; inability to join the inherited hierarchy
   // refuses the launch. The suspended child inherits the already bounded Job.
   Require(AssignProcessToJobObject(job,GetCurrentProcess()),"LAUNCHER_JOB_ASSIGN_FAILED");assignedSelf=true;
   Require(CreateProcessW(target,new StringBuilder("\""+target+"\""),IntPtr.Zero,IntPtr.Zero,true,Suspended|NoWindow|ExtendedStartup,IntPtr.Zero,Path.GetDirectoryName(target),ref startup,out child),"TARGET_CREATE_FAILED");started=true;
   bool inside;Require(IsProcessInJob(child.Process,job,out inside),"TARGET_JOB_QUERY_FAILED");Require(inside,"TARGET_JOB_NOT_INHERITED");
   Require(ResumeThread(child.Thread)!=UInt32.MaxValue,"TARGET_RESUME_FAILED");
   Require(WaitForSingleObject(child.Process,UInt32.MaxValue)==0,"TARGET_WAIT_FAILED");exited=true;
   MemoryCounters memory;Require(GetProcessMemoryInfo(child.Process,out memory,(uint)Marshal.SizeOf(typeof(MemoryCounters))),"TARGET_POSTEXIT_MEMORY_FAILED");
   ExtendedLimits actual;Require(QueryInformationJobObject(job,9,out actual,(uint)Marshal.SizeOf(typeof(ExtendedLimits)),IntPtr.Zero),"JOB_PEAK_FAILED");
   uint code;Require(GetExitCodeProcess(child.Process,out code),"TARGET_EXIT_CODE_FAILED");
   // This kernel high-water mark includes launcher CLR startup, but precedes
   // receipt serialization and launcher teardown. It is not a full-life proof.
   MemoryCounters launcher;Require(GetProcessMemoryInfo(GetCurrentProcess(),out launcher,(uint)Marshal.SizeOf(typeof(MemoryCounters))),"LAUNCHER_MEMORY_FAILED");
   string json="{\"protocol\":1,\"targetPeakWorkingSet\":"+memory.PeakWorkingSet.ToUInt64()+",\"targetPeakCommit\":"+memory.PeakPagefile.ToUInt64()+",\"jobPeakCommit\":"+actual.PeakJobMemory.ToUInt64()+",\"processLimit\":"+actual.ProcessMemory.ToUInt64()+",\"jobLimit\":"+actual.JobMemory.ToUInt64()+",\"startupHardLimited\":false,\"launcherPeakWorkingSetBeforeReceipt\":"+launcher.PeakWorkingSet.ToUInt64()+",\"launcherPeakCommitBeforeReceipt\":"+launcher.PeakPagefile.ToUInt64()+",\"launcherTailUnmeasured\":true,\"targetExited\":true,\"targetExitCode\":"+code+"}";
   // The parent reads this dedicated framed line from the retained pipe, never
   // trusting a mutable receipt pathname. Its own retained process handle fills
   // the remaining receipt/CLR teardown interval after this process exits.
   Console.Out.WriteLine("RESOURCE "+json);Console.Out.Flush();
   return unchecked((int)code);
  }catch(Exception e){Console.Error.WriteLine("BACKUP_HELPER_LAUNCH_REFUSED "+e.Message);return 1;}
  finally {
   if(started&&!exited){TerminateProcess(child.Process,1);WaitForSingleObject(child.Process,UInt32.MaxValue);}
   CheckedClose(ref child.Thread);CheckedClose(ref child.Process);
   CheckedClose(ref input);CheckedClose(ref output);CheckedClose(ref error);
   if(attributesInitialized)DeleteProcThreadAttributeList(attributes);if(attributes!=IntPtr.Zero)Marshal.FreeHGlobal(attributes);if(handleArray!=IntPtr.Zero)Marshal.FreeHGlobal(handleArray);
   // Closing a kill-on-close Job while its owner is a member would kill this
   // launcher before Main returns. Successful ownership ends with process exit.
   if(job!=IntPtr.Zero&&!assignedSelf)CheckedClose(ref job);
  }
 }
}
