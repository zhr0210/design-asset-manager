import path from 'node:path'

/** Ordinary macOS GUI launches belong to their own app through LaunchServices.
 * Controlled fixtures retain their direct child/environment lifecycle. */
export function localDamLaunchCommand({platform,synthetic,electronBinary,root,args}) {
  if(platform==='darwin'&&!synthetic) {
    const bundle=path.dirname(path.dirname(path.dirname(electronBinary)))
    if(!bundle.endsWith('.app')||!path.isAbsolute(root))throw Error('MACOS_LAUNCH_TARGET_INVALID')
    return {executable:'/usr/bin/open',args:['-W','-n','-a',bundle,'--args',root,...args.slice(1)]}
  }
  return {executable:electronBinary,args}
}
