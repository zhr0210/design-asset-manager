// Packaged Main-private target. Fixed domain protocol; no test fault or arbitrary action.
using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using Microsoft.Win32.SafeHandles;
using System.Web.Script.Serialization;

public static class DamWindowsBackupTarget {
 const uint ReadAttributes = 0x80, Synchronize = 0x100000, ReadWrite = 0xC0100000;
 const uint Directory = 1, NonDirectory = 0x40, Synchronous = 0x20, OpenReparsePoint = 0x200000, WriteThrough = 2;
 const uint ObjectCaseInsensitive = 0x40, ObjectDontReparse = 0x1000;
 const uint ReparseAttribute = 0x400;
 const int MaxBytes = 4 * 1024 * 1024;
 const int MaxSourceBytes = 8 * 1024 * 1024;
 [StructLayout(LayoutKind.Sequential)] struct UnicodeString {public ushort Length, MaximumLength; public IntPtr Buffer;}
 [StructLayout(LayoutKind.Sequential)] struct ObjectAttributes {public uint Length; public IntPtr RootDirectory, ObjectName; public uint Attributes; public IntPtr SecurityDescriptor, SecurityQualityOfService;}
 [StructLayout(LayoutKind.Sequential)] struct IoStatus {public IntPtr Status, Information;}
 [StructLayout(LayoutKind.Sequential)] struct FileInfo {public uint Attributes;public System.Runtime.InteropServices.ComTypes.FILETIME Creation, Access, Write;public uint VolumeSerial, SizeHigh, SizeLow, Links, IndexHigh, IndexLow;}
 [StructLayout(LayoutKind.Sequential)] struct VolumeSize {public long Total, Available, Actual;public uint Sectors, Bytes;}
 [DllImport("ntdll.dll")] static extern int NtCreateFile(out IntPtr handle, uint access, ref ObjectAttributes attributes, out IoStatus io, IntPtr allocation, uint fileAttributes, uint share, uint disposition, uint options, IntPtr ea, uint eaLength);
 [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateFileW(string path,uint access,uint share,IntPtr security,uint creation,uint flags,IntPtr template);
 [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetFileInformationByHandle(SafeFileHandle handle,out FileInfo info);
 [DllImport("kernel32.dll", SetLastError=true)] static extern bool FlushFileBuffers(SafeFileHandle handle);
 [DllImport("ntdll.dll")] static extern int NtQueryVolumeInformationFile(SafeFileHandle handle,out IoStatus io,out VolumeSize info,uint length,int kind);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool GetVolumeInformationByHandleW(SafeFileHandle handle,IntPtr name,uint nameSize,out uint serial,out uint maximum,out uint flags,StringBuilder filesystem,uint filesystemSize);
 public sealed class Result {public string Outcome, Reason, Hash;public int Bytes;public bool DirectoryReparse, HandlesReleased;public string[] FlushOrder;public SourceEvidence SourceBefore,SourceAfter;public string Binding,Backing,Verified,Finished;}
 public sealed class SourceEvidence {public string volume,file,size,created,written,sha256,available,filesystem;public uint links;}
 static ulong Time(System.Runtime.InteropServices.ComTypes.FILETIME value){return ((ulong)(uint)value.dwHighDateTime<<32)|(uint)value.dwLowDateTime;}
 static string Hash(byte[] bytes){using(var hash=SHA256.Create())return BitConverter.ToString(hash.ComputeHash(bytes)).Replace("-","").ToLowerInvariant();}
 static SourceEvidence Source(FileStream stream,SafeFileHandle handle) {
  FileInfo info=Inspect(handle);VolumeSize size;IoStatus io;
  if(info.Links!=1||(info.Attributes&(ReparseAttribute|0x200|0x800))!=0||stream.Length<100||stream.Length>MaxSourceBytes)throw new InvalidOperationException("SOURCE_KIND_REFUSED");
  int result=NtQueryVolumeInformationFile(handle,out io,out size,(uint)Marshal.SizeOf(typeof(VolumeSize)),7);
  if(result<0||size.Available<0||size.Actual<0||size.Total<=0||size.Sectors==0||size.Bytes==0)throw new InvalidOperationException("SOURCE_VOLUME_SPACE_UNKNOWN");
  ulong available=checked((ulong)Math.Min(size.Available,size.Actual)*size.Sectors*size.Bytes);
  var fs=new StringBuilder(64);uint serial,max,flags;
  if(!GetVolumeInformationByHandleW(handle,IntPtr.Zero,0,out serial,out max,out flags,fs,64))throw new InvalidOperationException("SOURCE_FILESYSTEM_QUERY_REFUSED_"+Marshal.GetLastWin32Error());
  if(fs.ToString()!="NTFS"||serial!=info.VolumeSerial)throw new InvalidOperationException("SOURCE_FILESYSTEM_REFUSED");
  stream.Position=0;byte[] bytes=new byte[(int)stream.Length];int n=0,r;while(n<bytes.Length&&(r=stream.Read(bytes,n,bytes.Length-n))>0)n+=r;
  if(n!=bytes.Length)throw new InvalidOperationException("SOURCE_READ_REFUSED");
  FileInfo after=Inspect(handle);
  if(info.SizeHigh!=after.SizeHigh||info.SizeLow!=after.SizeLow||Time(info.Write)!=Time(after.Write)||info.Links!=after.Links)throw new InvalidOperationException("SOURCE_CHANGED_DURING_READ");
  return new SourceEvidence {volume=info.VolumeSerial.ToString(),file=(((ulong)info.IndexHigh<<32)|info.IndexLow).ToString(),size=(((ulong)info.SizeHigh<<32)|info.SizeLow).ToString(),created=Time(info.Creation).ToString(),written=Time(info.Write).ToString(),links=info.Links,sha256=Hash(bytes),available=available.ToString(),filesystem=fs.ToString()};
 }
 static void Emit(string label,object value){Console.Out.WriteLine(label+" "+new JavaScriptSerializer().Serialize(value));Console.Out.Flush();}
 public static int Main(){
  Result result=Run(Environment.GetEnvironmentVariable("DAM_BACKUP_CONTROL"));
  Console.Out.WriteLine(new JavaScriptSerializer().Serialize(result));return result.HandlesReleased?0:3;
 }
 static readonly List<IntPtr> nativeHandles=new List<IntPtr>();
 [DllImport("kernel32.dll", SetLastError=true)] static extern bool CloseHandle(IntPtr handle);
 static SafeFileHandle Track(IntPtr handle){if(handle==IntPtr.Zero||handle==new IntPtr(-1))throw new InvalidOperationException("HANDLE_OPEN_REFUSED");nativeHandles.Add(handle);return new SafeFileHandle(handle,false);}
 static string BoundControl(string value){if(String.IsNullOrEmpty(value))throw new InvalidOperationException("CONTROL_MISSING");string absolute=Path.GetFullPath(value);if(absolute!=value||absolute.Length>32767||absolute.Length<4||absolute[1]!=':'||absolute[2]!='\\'||absolute.IndexOf('/')>=0||absolute.IndexOf(':',2)>=0)throw new InvalidOperationException("CONTROL_PATH_REFUSED");return absolute;}
 static string Operation(){string name=Environment.GetEnvironmentVariable("DAM_BACKUP_OPERATION");if(name==null||name.Length!=43||!name.StartsWith("tag-intent-",StringComparison.Ordinal))throw new InvalidOperationException("OPERATION_REFUSED");for(int i=11;i<name.Length;i++)if("0123456789abcdef".IndexOf(name[i])<0)throw new InvalidOperationException("OPERATION_REFUSED");return name;}
 static FileInfo Inspect(SafeFileHandle handle) {FileInfo info;if(!GetFileInformationByHandle(handle,out info))throw new InvalidOperationException("HANDLE_INSPECTION_FAILED");return info;}
 static SafeFileHandle Child(SafeFileHandle parent,string name,bool directory,bool create,uint access,uint share,uint disposition=0) {
  if(String.IsNullOrEmpty(name)||name=="."||name==".."||name.IndexOfAny(new char[]{'\\','/',':','\0'})>=0)throw new InvalidOperationException("INVALID_COMPONENT");
  IntPtr text=Marshal.StringToHGlobalUni(name),unicode=IntPtr.Zero;
  try {
   UnicodeString u=new UnicodeString {Length=checked((ushort)(name.Length*2)),MaximumLength=checked((ushort)(name.Length*2+2)),Buffer=text};unicode=Marshal.AllocHGlobal(Marshal.SizeOf(typeof(UnicodeString)));Marshal.StructureToPtr(u,unicode,false);
   ObjectAttributes a=new ObjectAttributes {Length=(uint)Marshal.SizeOf(typeof(ObjectAttributes)),RootDirectory=parent.DangerousGetHandle(),ObjectName=unicode,Attributes=ObjectCaseInsensitive|ObjectDontReparse};
   IoStatus io;IntPtr raw;int status=NtCreateFile(out raw,access,ref a,out io,IntPtr.Zero,0,share,disposition==0?(create?2u:1u):disposition,(directory?Directory:NonDirectory)|Synchronous|OpenReparsePoint|(create&&!directory?WriteThrough:0),IntPtr.Zero,0);
   if(status<0){if(raw!=IntPtr.Zero&&raw!=new IntPtr(-1))Track(raw);throw new InvalidOperationException("NT_CREATE_REFUSED_"+unchecked((uint)status).ToString("X8"));}
   SafeFileHandle child=Track(raw);
   if((Inspect(child).Attributes&ReparseAttribute)!=0){child.Dispose();throw new InvalidOperationException("REPARSE_REFUSED");}
   return child;
  }finally{if(unicode!=IntPtr.Zero)Marshal.FreeHGlobal(unicode);Marshal.FreeHGlobal(text);}
 }
 static SafeFileHandle PinOwnedDirectory(string path,List<SafeFileHandle> retained) {
  string absolute=BoundControl(path);
  SafeFileHandle current=Track(CreateFileW(@"\\?\"+absolute.Substring(0,3),ReadAttributes|Synchronize,3,IntPtr.Zero,3,0x02200000,IntPtr.Zero));
  if(current.IsInvalid){current.Dispose();throw new InvalidOperationException("DRIVE_HANDLE_REFUSED");}retained.Add(current);
  string[] names=absolute.Substring(3).Split('\\');
  for(int i=0;i<names.Length;i++){current=Child(current,names[i],true,false,i==names.Length-1?ReadWrite:ReadAttributes|Synchronize,i==names.Length-1?0u:3u);retained.Add(current);}
  return current;
 }
 static byte[] Image(Stream input) {
  byte[] length=new byte[4];int n=0,r;while(n<4&&(r=input.Read(length,n,4-n))>0)n+=r;
  if(n!=4)throw new InvalidOperationException("TRUNCATED_HEADER");int size=BitConverter.ToInt32(length,0);
  if(size<1||size>MaxBytes)throw new InvalidOperationException("IMAGE_LIMIT");byte[] image=new byte[size];n=0;
  while(n<size&&(r=input.Read(image,n,size-n))>0)n+=r;
  if(n!=size)throw new InvalidOperationException("TRUNCATED_IMAGE");return image;
 }
 static void Status(SafeFileHandle operation,string name,string json,List<string> flushed,string label) {
  SafeFileHandle handle=Child(operation,name,false,true,ReadWrite,0);
  using(var status=new FileStream(handle,FileAccess.ReadWrite,4096,false)) {
   byte[] bytes=Encoding.UTF8.GetBytes(json);status.Write(bytes,0,bytes.Length);status.Flush(true);flushed.Add(label);
  }
 }
 static string ReadStatus(SafeFileHandle operation,string name,bool optional) {
  SafeFileHandle handle;
  try{handle=Child(operation,name,false,false,0x80100000u,0);}catch(InvalidOperationException e){if(optional&&e.Message=="NT_CREATE_REFUSED_C0000034")return null;throw;}
  using(var stream=new FileStream(handle,FileAccess.Read,4096,false)) {
   if(stream.Length<1||stream.Length>4096||Inspect(handle).Links!=1)throw new InvalidOperationException("RECOVERY_STATUS_KIND_REFUSED");
   byte[] bytes=new byte[(int)stream.Length];int n=0,r;while(n<bytes.Length&&(r=stream.Read(bytes,n,bytes.Length-n))>0)n+=r;
   if(n!=bytes.Length)throw new InvalidOperationException("RECOVERY_STATUS_READ_REFUSED");return new UTF8Encoding(false,true).GetString(bytes);
  }
 }
 static void TargetStillHeld(FileStream stream,SafeFileHandle target,int length,string expected){FileInfo info=Inspect(target);if(info.Links!=1||(info.Attributes&(ReparseAttribute|0x200|0x800|0x10))!=0||stream.Length!=length)throw new InvalidOperationException("TARGET_CHANGED_WHILE_HELD");stream.Position=0;byte[] bytes=new byte[length];int offset=0,got;while(offset<length&&(got=stream.Read(bytes,offset,length-offset))>0)offset+=got;if(offset!=length||Hash(bytes)!=expected)throw new InvalidOperationException("TARGET_CHANGED_WHILE_HELD");}
 static string BoundStatus(string phase,string binding,string image,bool? committed) {
  return "{\"protocol\":1,\"phase\":\""+phase+"\",\"bindingSha256\":\""+binding+"\",\"imageSha256\":\""+image+"\""+(committed.HasValue?",\"mainDeclaredCommitted\":"+(committed.Value?"true":"false"):"")+"}";
 }
 public static Result Run(string directory) {
  var retained=new List<SafeFileHandle>();var flushed=new List<string>();FileStream stream=null,sourceStream=null;Result result=new Result {Outcome="refused",FlushOrder=new string[0]};
  try {
   byte[] image=Image(Console.OpenStandardInput());
   SafeFileHandle root=PinOwnedDirectory(directory,retained);
   bool bound=true,retrieve=false,hold=true;string operationName=Operation();
   string binding=null,bindingHash=null,imageHash=Hash(image);SafeFileHandle source=null;
   if(bound) {
    source=Child(root,"library.sqlite",false,false,0x80100000u,3);
    sourceStream=new FileStream(source,FileAccess.Read,4096,false);result.SourceBefore=Source(sourceStream,source);
    if(UInt64.Parse(result.SourceBefore.size)>MaxBytes||result.SourceBefore.sha256!=imageHash)throw new InvalidOperationException("SOURCE_IMAGE_MISMATCH");
    Emit("PINNED",result.SourceBefore);
    byte[] boundBytes=Image(Console.OpenStandardInput());if(boundBytes.Length>4096)throw new InvalidOperationException("BINDING_LIMIT");
    binding=new UTF8Encoding(false,true).GetString(boundBytes);bindingHash=Hash(boundBytes);
   }
   SafeFileHandle parent=root;
   if(hold||retrieve){parent=Child(root,"schema-backups",true,true,ReadWrite,0,3);retained.Add(parent);}
   SafeFileHandle operation=Child(parent,operationName,true,!retrieve,ReadWrite,0);retained.Add(operation);
   if(hold){
    if(bound)Status(operation,"binding.json",binding,flushed,"binding-file");
    Status(operation,"status-backing-up.json",BoundStatus("backing-up",bindingHash,imageHash,null),flushed,"backing-status-file");
    if(!FlushFileBuffers(operation))throw new InvalidOperationException("BACKING_OPERATION_FLUSH_REFUSED");flushed.Add("backing-operation");
    if(!FlushFileBuffers(parent))throw new InvalidOperationException("BACKING_PARENT_FLUSH_REFUSED");flushed.Add("backing-parent");
    if(!FlushFileBuffers(root))throw new InvalidOperationException("BACKING_CONTROL_FLUSH_REFUSED");flushed.Add("backing-control");
   }
      SafeFileHandle target=Child(operation,"library.sqlite",false,!retrieve,retrieve?0x80100000u:ReadWrite,0);
   stream=new FileStream(target,retrieve?FileAccess.Read:FileAccess.ReadWrite,4096,false);
   {
    if(!retrieve){
     stream.Write(image,0,image.Length);
     stream.Flush(true);flushed.Add("file");
    }
    stream.Position=0;byte[] actual=new byte[image.Length];int n=0,r;while(n<actual.Length&&(r=stream.Read(actual,n,actual.Length-n))>0)n+=r;
    if(n!=actual.Length||stream.Length!=image.Length||Inspect(target).Links!=1)throw new InvalidOperationException("READBACK_INVALID");
    using(var hash=SHA256.Create()){string expected=BitConverter.ToString(hash.ComputeHash(image)),got=BitConverter.ToString(hash.ComputeHash(actual));if(expected!=got)throw new InvalidOperationException("HASH_MISMATCH");result.Hash=got.Replace("-","").ToLowerInvariant();}
    result.Bytes=image.Length;
   }
   result.DirectoryReparse=(Inspect(operation).Attributes&ReparseAttribute)!=0;
   if(result.DirectoryReparse)throw new InvalidOperationException("HELD_DIRECTORY_CHANGED");
   if(retrieve){
    if(bound){result.Binding=ReadStatus(operation,"binding.json",false);result.Backing=ReadStatus(operation,"status-backing-up.json",false);result.Verified=ReadStatus(operation,"status-verified.json",false);result.Finished=ReadStatus(operation,"status-finished.json",true);}
    result.Outcome="retrieved-content";return result;
   }
   if(hold){
    Status(operation,"status-verified.json",BoundStatus("target-verified",bindingHash,imageHash,null),flushed,"status-file");
   }
   if(!FlushFileBuffers(operation))throw new InvalidOperationException("OPERATION_FLUSH_REFUSED");flushed.Add("operation");
   if(!FlushFileBuffers(parent))throw new InvalidOperationException("PARENT_FLUSH_REFUSED");flushed.Add("parent");
   if(hold){
    if(!FlushFileBuffers(root))throw new InvalidOperationException("CONTROL_FLUSH_REFUSED");flushed.Add("control");
    Console.Out.WriteLine("HELD "+result.Hash);Console.Out.Flush();
    int decision=Console.OpenStandardInput().ReadByte();
    while(bound&&decision==2){TargetStillHeld(stream,target,image.Length,imageHash);result.SourceAfter=Source(sourceStream,source);Emit("SOURCE",result.SourceAfter);decision=Console.OpenStandardInput().ReadByte();}
    if(decision<0)throw new InvalidOperationException("INTERRUPTED_WITHOUT_DECISION");
    if(decision>1)throw new InvalidOperationException("INVALID_FINISH_DECISION");
    bool committed=decision==1;
    TargetStillHeld(stream,target,image.Length,imageHash);
    Status(operation,"status-finished.json",BoundStatus("finished",bindingHash,imageHash,committed),flushed,"finish-status-file");
    if(!FlushFileBuffers(operation))throw new InvalidOperationException("FINISH_OPERATION_FLUSH_REFUSED");flushed.Add("finish-operation");
    if(!FlushFileBuffers(parent))throw new InvalidOperationException("FINISH_PARENT_FLUSH_REFUSED");flushed.Add("finish-parent");
    if(!FlushFileBuffers(root))throw new InvalidOperationException("FINISH_CONTROL_FLUSH_REFUSED");flushed.Add("finish-control");
    if(!committed)throw new InvalidOperationException("CANCELLED_WHILE_HELD");
   }
   result.Outcome="target-verified";
  }catch(InvalidOperationException e){result.Reason=e.Message;}finally{
   bool released=true;
   try{if(stream!=null)stream.Dispose();if(sourceStream!=null)sourceStream.Dispose();for(int i=retained.Count-1;i>=0;i--)retained[i].Dispose();}catch{released=false;}
   for(int i=nativeHandles.Count-1;i>=0;i--){IntPtr raw=nativeHandles[i];nativeHandles[i]=IntPtr.Zero;if(!CloseHandle(raw))released=false;}
   result.HandlesReleased=released;if(!released){result.Outcome="refused";result.Reason="TARGET_RELEASE_UNKNOWN";}result.FlushOrder=flushed.ToArray();
  }
  return result;
 }
}
