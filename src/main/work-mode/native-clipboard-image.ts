import {ActiveLibraryHostError} from '../../shared/contracts/active-library.contract'
/** Called only from an explicit owned-window gesture inside the Host's shared permit.
 * Electron's initial readImage has no hard RSS limit; size checks bound accepted data. */
export function createNativeClipboardImageReader(clipboard:{readImage():{isEmpty():boolean;getSize():{width:number;height:number};toPNG():Uint8Array}}):()=>Promise<Uint8Array>{
 return async()=>{
  const image=clipboard.readImage()
  if(image.isEmpty())throw new ActiveLibraryHostError('library-operation-failed','剪贴板里没有可接入的图片。')
  const size=image.getSize()
  if(!Number.isSafeInteger(size.width)||!Number.isSafeInteger(size.height)||size.width<1||size.height<1||size.width*size.height>16_000_000)throw new ActiveLibraryHostError('library-operation-failed','剪贴板图片超过1600万像素，未接入。')
  const bytes=image.toPNG()
  if(!bytes.byteLength||bytes.byteLength>96*1024*1024)throw new ActiveLibraryHostError('library-operation-failed','剪贴板图片超过96 MiB，未接入。')
  return bytes
 }
}
