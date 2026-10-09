declare module 'archiver' {
    import { Readable } from 'node:stream';
    interface BufferArchive extends Readable {
        append(bytes: Uint8Array, entry: { name: string; date: Date; mode: number }): BufferArchive;
        finalize(): Promise<void>;
        abort(): BufferArchive;
    }
    export default function archiver(format: 'zip', options: { zlib: { level: number } }): BufferArchive;
}
