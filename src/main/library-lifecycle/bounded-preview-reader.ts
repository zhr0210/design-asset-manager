import type {FileHandle} from 'node:fs/promises'

/** Caller opens its guarded preview O_NOFOLLOW. Never reads or allocates past a qualified size. */
export async function readBoundedPreviewBytes(handle:Pick<FileHandle,'stat'|'read'>,maxBytes:number):Promise<Uint8Array>{
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>32*1024*1024)throw Error('VISUAL_SOURCE_LIMIT_INVALID')
 const before=await handle.stat({bigint:true})
 if(!before.isFile()||before.nlink!==1n||before.size<1n||before.size>BigInt(maxBytes))throw Error('VISUAL_SOURCE_TOO_LARGE')
 const bytes=Buffer.allocUnsafe(Number(before.size));let offset=0
 while(offset<bytes.length){const r=await handle.read(bytes,offset,bytes.length-offset,offset);if(r.bytesRead===0)throw Error('VISUAL_SOURCE_CHANGED');offset+=r.bytesRead}
 const after=await handle.stat({bigint:true})
 if(after.dev!==before.dev||after.ino!==before.ino||after.size!==before.size||after.mtimeNs!==before.mtimeNs||after.nlink!==1n)throw Error('VISUAL_SOURCE_CHANGED')
 return bytes
}
