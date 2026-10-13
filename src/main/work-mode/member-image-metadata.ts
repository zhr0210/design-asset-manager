import sharp from 'sharp'
import type {ActiveLibraryHost,ActiveLibraryAssetProjection} from '../../shared/contracts/active-library.contract'
/** Dimensions come from a verified Original, never from a scaled required preview. */
export async function memberImageMetadata(host:ActiveLibraryHost,asset:ActiveLibraryAssetProjection):Promise<{width:number|null;height:number|null}> {
 if(asset.width&&asset.height)return{width:asset.width,height:asset.height}
 if(asset.fileType==='mp4')return{width:null,height:null}
 const original=await host.readManagedOriginal(asset.id,asset.revision,asset.thumbnailRef)
 const m=await sharp(Buffer.from(original.bytes),{limitInputPixels:40_000_000}).metadata()
 if(!m.width||!m.height)return{width:null,height:null}
 return [5,6,7,8].includes(m.orientation??1)?{width:m.height,height:m.width}:{width:m.width,height:m.height}
}
