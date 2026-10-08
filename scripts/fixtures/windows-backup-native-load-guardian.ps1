$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$hostProcess=[IntPtr]::Zero
$transferred=New-Object 'System.Collections.Generic.List[IntPtr]'
$hostPins=New-Object 'System.Collections.Generic.List[object]'
$directoryHandles=New-Object 'System.Collections.Generic.List[IntPtr]'
$handles=New-Object 'System.Collections.Generic.List[IntPtr]'
$pins=New-Object 'System.Collections.Generic.List[object]'
$assemblyName=New-Object Reflection.AssemblyName('DamOwnedPinGuardian')
$assembly=[AppDomain]::CurrentDomain.DefineDynamicAssembly($assemblyName,[Reflection.Emit.AssemblyBuilderAccess]::Run)
$module=$assembly.DefineDynamicModule('InMemoryOnly')
$type=$module.DefineType('DamOwnedPinNative',[Reflection.TypeAttributes]::Public)
function Define-Native([string]$name,[string]$dll,[Type]$returns,[Type[]]$parameters) {
  $method=$type.DefinePInvokeMethod($name,$dll,[Reflection.MethodAttributes]'Public,Static,PinvokeImpl',[Reflection.CallingConventions]::Standard,$returns,$parameters,[Runtime.InteropServices.CallingConvention]::Winapi,[Runtime.InteropServices.CharSet]::Unicode)
  $method.SetImplementationFlags([Reflection.MethodImplAttributes]::PreserveSig)
}
Define-Native 'CreateFileW' 'kernel32.dll' ([IntPtr]) @([string],[uint32],[uint32],[IntPtr],[uint32],[uint32],[IntPtr])
Define-Native 'NtCreateFile' 'ntdll.dll' ([int]) @([IntPtr].MakeByRefType(),[uint32],[IntPtr],[IntPtr],[IntPtr],[uint32],[uint32],[uint32],[uint32],[IntPtr],[uint32])
Define-Native 'GetFileInformationByHandle' 'kernel32.dll' ([bool]) @([IntPtr],[IntPtr])
Define-Native 'GetFinalPathNameByHandleW' 'kernel32.dll' ([uint32]) @([IntPtr],[Text.StringBuilder],[uint32],[uint32])
Define-Native 'CloseHandle' 'kernel32.dll' ([bool]) @([IntPtr])
Define-Native 'OpenProcess' 'kernel32.dll' ([IntPtr]) @([uint32],[bool],[uint32])
Define-Native 'GetCurrentProcess' 'kernel32.dll' ([IntPtr]) @()
Define-Native 'GetProcessTimes' 'kernel32.dll' ([bool]) @([IntPtr],[IntPtr],[IntPtr],[IntPtr],[IntPtr])
Define-Native 'NtQueryInformationProcess' 'ntdll.dll' ([int]) @([IntPtr],[int],[IntPtr],[uint32],[IntPtr])
Define-Native 'QueryFullProcessImageNameW' 'kernel32.dll' ([bool]) @([IntPtr],[uint32],[Text.StringBuilder],[uint32].MakeByRefType())
Define-Native 'DuplicateHandle' 'kernel32.dll' ([bool]) @([IntPtr],[IntPtr],[IntPtr],[IntPtr].MakeByRefType(),[uint32],[bool],[uint32])
$native=$type.CreateType()
function Call-Native([string]$name,[object[]]$arguments) {
  $plain=New-Object object[] $arguments.Length
  for($i=0;$i-lt $arguments.Length;$i++){$plain[$i]=$arguments[$i].PSObject.BaseObject}
  return $native.GetMethod($name).Invoke($null,$plain)
}
function Handle-Info([IntPtr]$handle,[bool]$directory) {
  $memory=[Runtime.InteropServices.Marshal]::AllocHGlobal(52)
  try {
    if(-not (Call-Native 'GetFileInformationByHandle' @($handle,$memory))){throw 'GUARDIAN_FILE_INFO_REFUSED'}
    $bytes=New-Object byte[] 52
    [Runtime.InteropServices.Marshal]::Copy($memory,$bytes,0,52)
    $attributes=[BitConverter]::ToUInt32($bytes,0)
    $links=[BitConverter]::ToUInt32($bytes,40)
    if(($attributes -band 0x400)-ne 0){throw 'GUARDIAN_REPARSE_REFUSED'}
    if((($attributes -band 0x10)-ne 0)-ne $directory){throw 'GUARDIAN_KIND_REFUSED'}
    if(-not $directory -and $links-ne 1){throw 'GUARDIAN_LINKS_REFUSED'}
    return @{volume=[BitConverter]::ToUInt32($bytes,28).ToString();file=([uint64][BitConverter]::ToUInt32($bytes,44)*4294967296+[BitConverter]::ToUInt32($bytes,48)).ToString();links=$links;size=([uint64][BitConverter]::ToUInt32($bytes,32)*4294967296+[BitConverter]::ToUInt32($bytes,36)).ToString();attributes=$attributes}
  }finally{[Runtime.InteropServices.Marshal]::FreeHGlobal($memory)}
}
function Open-Component([IntPtr]$parent,[string]$component,[bool]$directory) {
  if($component.Length-eq 0 -or $component-eq '.' -or $component-eq '..' -or $component.IndexOfAny([char[]]'\/:')-ge 0){throw 'GUARDIAN_COMPONENT_REFUSED'}
  $name=[Runtime.InteropServices.Marshal]::StringToHGlobalUni($component)
  $unicode=[Runtime.InteropServices.Marshal]::AllocHGlobal(16)
  $attributes=[Runtime.InteropServices.Marshal]::AllocHGlobal(48)
  $io=[Runtime.InteropServices.Marshal]::AllocHGlobal(16)
  try {
    foreach($buffer in @(@($unicode,16),@($attributes,48),@($io,16))){for($i=0;$i-lt $buffer[1];$i++){[Runtime.InteropServices.Marshal]::WriteByte($buffer[0],$i,0)}}
    [Runtime.InteropServices.Marshal]::WriteInt16($unicode,0,[int16]($component.Length*2))
    [Runtime.InteropServices.Marshal]::WriteInt16($unicode,2,[int16]($component.Length*2))
    [Runtime.InteropServices.Marshal]::WriteIntPtr($unicode,8,$name)
    [Runtime.InteropServices.Marshal]::WriteInt32($attributes,0,48)
    [Runtime.InteropServices.Marshal]::WriteIntPtr($attributes,8,$parent)
    [Runtime.InteropServices.Marshal]::WriteIntPtr($attributes,16,$unicode)
    [Runtime.InteropServices.Marshal]::WriteInt32($attributes,24,4160)
    $options=if($directory){[uint32]2097185}else{[uint32]2097248}
    $arguments=[object[]]@([IntPtr]::Zero,[uint32]2148532224,$attributes,$io,[IntPtr]::Zero,[uint32]0,[uint32]1,[uint32]1,$options,[IntPtr]::Zero,[uint32]0)
    $status=$native.GetMethod('NtCreateFile').Invoke($null,$arguments)
    $handle=[IntPtr]$arguments[0]
    if($status-lt 0){if($handle-ne [IntPtr]::Zero){[void](Call-Native 'CloseHandle' @($handle))};throw ('GUARDIAN_NT_OPEN_REFUSED_'+$status)}
    $handles.Add($handle)
    if($handles.Count-gt 128){throw 'GUARDIAN_HANDLE_BOUND_REFUSED'}
    if($directory){$directoryHandles.Add($handle)}
    [void](Handle-Info $handle $directory)
    return $handle
  }finally{foreach($buffer in @($name,$unicode,$attributes,$io)){[Runtime.InteropServices.Marshal]::FreeHGlobal($buffer)}}
}
function Hash-Handle([IntPtr]$handle) {
  $safe=New-Object Microsoft.Win32.SafeHandles.SafeFileHandle($handle,$false)
  $stream=New-Object IO.FileStream($safe,[IO.FileAccess]::Read,4096,$false)
  $algorithm=[Security.Cryptography.SHA256]::Create()
  try {if($stream.Length-lt 1 -or $stream.Length-gt 1048576){throw 'GUARDIAN_ARTIFACT_SIZE_REFUSED'};$stream.Position=0;return ([BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-','').ToLowerInvariant()}
  finally{$algorithm.Dispose();$stream.Dispose()}
}
function Pin-Artifact($entry) {
  $absolute=[IO.Path]::GetFullPath([string]$entry.path)
  $temporary=[IO.Path]::GetFullPath([IO.Path]::GetTempPath())
  if(-not $absolute.StartsWith(($temporary+'dam-native-qualification-build-'),[StringComparison]::OrdinalIgnoreCase)){throw 'GUARDIAN_PATH_NOT_OWNED'}
  if($absolute.Length-ge 2048 -or $absolute[1]-ne ':' -or $absolute[2]-ne '\' -or [string]$entry.sha256-notmatch '^[a-f0-9]{64}$'){throw 'GUARDIAN_PATH_INPUT_REFUSED'}
  $root='\\?\'+$absolute.Substring(0,3)
  $current=Call-Native 'CreateFileW' @($root,[uint32]2148532224,[uint32]1,[IntPtr]::Zero,[uint32]3,[uint32]35651584,[IntPtr]::Zero)
  if($current-eq [IntPtr]::new(-1)){throw 'GUARDIAN_ROOT_REFUSED'}
  $handles.Add($current)
  if($handles.Count-gt 128){throw 'GUARDIAN_HANDLE_BOUND_REFUSED'}
  $directoryHandles.Add($current)
  [void](Handle-Info $current $true)
  $components=$absolute.Substring(3).Split('\')
  if($components.Length-gt 64){throw 'GUARDIAN_COMPONENT_COUNT_REFUSED'}
  for($i=0;$i-lt $components.Length;$i++){$current=Open-Component $current $components[$i] ($i-lt ($components.Length-1))}
  $info=Handle-Info $current $false
  $digest=Hash-Handle $current
  if($digest-ne [string]$entry.sha256){throw 'GUARDIAN_SHA_REFUSED'}
  $final=New-Object Text.StringBuilder 32768
  $length=Call-Native 'GetFinalPathNameByHandleW' @($current,$final,[uint32]32768,[uint32]0)
  if($length-eq 0 -or $length-ge 32768){throw 'GUARDIAN_FINAL_PATH_REFUSED'}
  if($final.ToString()-ine ('\\?\'+$absolute)){throw 'GUARDIAN_FINAL_PATH_MISMATCH'}
  $pins.Add(@{handle=$current;entry=$entry;before=$info;sha256=$digest})
  return @{name=[IO.Path]::GetFileName($absolute);sha256=$digest;identity=$info;ancestors=$components.Length;genericRead=$true;shareReadOnly=$true;noDeleteSharing=$true;finalPathMatches=$true}
}
function Process-Created([IntPtr]$handle) {
  $memory=[Runtime.InteropServices.Marshal]::AllocHGlobal(32)
  try {
    if(-not (Call-Native 'GetProcessTimes' @($handle,$memory,[IntPtr]::Add($memory,8),[IntPtr]::Add($memory,16),[IntPtr]::Add($memory,24)))){throw 'GUARDIAN_PROCESS_TIMES_REFUSED'}
    $bytes=New-Object byte[] 8;[Runtime.InteropServices.Marshal]::Copy($memory,$bytes,0,8)
    return [BitConverter]::ToUInt64($bytes,0)
  }finally{[Runtime.InteropServices.Marshal]::FreeHGlobal($memory)}
}
function Bind-Host($request) {
  if([IntPtr]::Size-ne 8 -or $request.hostPid-lt 1 -or $request.hostPid-gt [uint32]::MaxValue){throw 'GUARDIAN_HOST_INPUT_REFUSED'}
  $current=Call-Native 'GetCurrentProcess' @()
  $basic=[Runtime.InteropServices.Marshal]::AllocHGlobal(48)
  try {
    if((Call-Native 'NtQueryInformationProcess' @($current,[int]0,$basic,[uint32]48,[IntPtr]::Zero))-lt 0){throw 'GUARDIAN_PARENT_QUERY_REFUSED'}
    $actualParent=[Runtime.InteropServices.Marshal]::ReadIntPtr($basic,40).ToInt64()
    if($actualParent-ne [long]$request.hostPid){throw 'GUARDIAN_PARENT_PID_MISMATCH'}
  }finally{[Runtime.InteropServices.Marshal]::FreeHGlobal($basic)}
  $script:hostProcess=Call-Native 'OpenProcess' @([uint32]1052736,$false,[uint32]$request.hostPid)
  if($hostProcess-eq [IntPtr]::Zero){throw 'GUARDIAN_HOST_OPEN_REFUSED'}
  $created=Process-Created $hostProcess
  if($created-ge (Process-Created $current)){throw 'GUARDIAN_HOST_CREATION_MISMATCH'}
  $image=New-Object Text.StringBuilder 32768
  $arguments=[object[]]@($hostProcess,[uint32]0,$image.PSObject.BaseObject,[uint32]32768)
  if(-not $native.GetMethod('QueryFullProcessImageNameW').Invoke($null,$arguments)){throw 'GUARDIAN_HOST_IMAGE_REFUSED'}
  $expected=[IO.Path]::GetFullPath([string]$request.hostExecutable)
  if($image.ToString()-ine $expected){throw 'GUARDIAN_HOST_EXECUTABLE_MISMATCH'}
  return @{pid=$request.hostPid;creationTime=$created.ToString();parentPidMatched=$true;executableMatched=$true}
}
function Transfer-Pins {
  $current=Call-Native 'GetCurrentProcess' @()
  foreach($handle in $handles) {
    $arguments=[object[]]@($current,$handle,$hostProcess,[IntPtr]::Zero,[uint32]0,$false,[uint32]2)
    if(-not $native.GetMethod('DuplicateHandle').Invoke($null,$arguments)){throw 'GUARDIAN_HOST_TRANSFER_REFUSED'}
    $transferred.Add([IntPtr]$arguments[3])
    $directory=$directoryHandles.Contains($handle)
    $hostPins.Add(@{handle=([IntPtr]$arguments[3]).ToInt64().ToString();directory=$directory;identity=(Handle-Info $handle $directory)})
  }
}
function Reclaim-Pins {
  $current=Call-Native 'GetCurrentProcess' @()
  while($transferred.Count-gt 0) {
    $handle=$transferred[0]
    # DUPLICATE_CLOSE_SOURCE closes even on failure. Remove before attempting;
    # never retry a numeric source that may have been reused by the Host.
    $transferred.RemoveAt(0)
    $arguments=[object[]]@($hostProcess,$handle,$current,[IntPtr]::Zero,[uint32]0,$false,[uint32]3)
    if(-not $native.GetMethod('DuplicateHandle').Invoke($null,$arguments)){throw 'GUARDIAN_HOST_RECLAIM_REFUSED'}
    [void](Call-Native 'CloseHandle' @([IntPtr]$arguments[3]))
  }
}
$resultCode=1
try {
  $line=[Console]::In.ReadLine()
  if($null-eq $line -or $line.Length-gt 32768){throw 'GUARDIAN_REQUEST_SIZE_REFUSED'}
  $request=$line|ConvertFrom-Json
  if($request.protocol-ne 1 -or $request.artifacts.Count-lt 1 -or $request.artifacts.Count-gt 4){throw 'GUARDIAN_REQUEST_REFUSED'}
  $ready=@()
  foreach($entry in $request.artifacts){$ready+=Pin-Artifact $entry}
  $hostBinding=Bind-Host $request
  Transfer-Pins
  [Console]::Out.WriteLine((@{phase='PINNED';artifacts=$ready;bootstrap='OS PowerShell + in-memory Reflection.Emit';noAddType=$true;host=$hostBinding;hostHandles=@($transferred|ForEach-Object {$_.ToInt64().ToString()});hostPins=$hostPins.ToArray();hostHandlePins=$true}|ConvertTo-Json -Depth 8 -Compress))
  [Console]::Out.Flush()
  $command=[Console]::In.ReadLine()
  if($command-eq 'HOST_CLOSED'){$transferred.Clear()}
  elseif($command-eq 'RECLAIM'){Reclaim-Pins}
  elseif($command-eq 'ABANDON_UNKNOWN'){throw 'GUARDIAN_HOST_RELEASE_UNKNOWN'}
  else{throw 'GUARDIAN_RELEASE_REFUSED'}
  foreach($directory in $directoryHandles){[void](Handle-Info $directory $true)}
  foreach($pin in $pins){$after=Handle-Info $pin.handle $false;foreach($key in @('volume','file','links','size','attributes')){if($after[$key]-ne $pin.before[$key]){throw 'GUARDIAN_FINAL_IDENTITY_RECHECK_REFUSED'}};if((Hash-Handle $pin.handle)-ne $pin.sha256){throw 'GUARDIAN_FINAL_RECHECK_REFUSED'}}
  [Console]::Out.WriteLine('{"phase":"RELEASE_READY","sameHandleRecheck":true,"hostPinsReleased":true}')
  [Console]::Out.Flush()
  $resultCode=0
}catch {
  [Console]::Out.WriteLine((@{phase='REFUSED';reason=$_.Exception.Message}|ConvertTo-Json -Depth 4 -Compress))
  [Console]::Out.Flush()
}finally{
  if($transferred.Count-gt 0){[Console]::Out.WriteLine('{"phase":"HOST_PIN_RELEASE_UNKNOWN"}')}
  else{[Console]::Out.WriteLine('{"phase":"HOST_PINS_CLOSED"}')}
  for($i=$handles.Count-1;$i-ge 0;$i--){[void](Call-Native 'CloseHandle' @($handles[$i]))}
  if($hostProcess-ne [IntPtr]::Zero){[void](Call-Native 'CloseHandle' @($hostProcess))}
}
exit $resultCode
