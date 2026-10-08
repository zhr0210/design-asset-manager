/** Called only after the Host has authorized and verified the requested media.
 * Single byte ranges allow browser/native players to seek without a second
 * file-access path. Slices share the verified buffer rather than copying it. */
export function workMediaResponse(media: {bytes: Uint8Array; type: string}, range?: string | null) {
  const size = media.bytes.byteLength;
  const headers: Record<string, string> = {'Content-Type': media.type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store'};
  if (!range) return {status: 200, headers: {...headers, 'Content-Length': String(size)}, bytes: media.bytes};
  const invalid = () => ({status: 416, headers: {...headers, 'Content-Range': `bytes */${size}`, 'Content-Length': '0'}, bytes: new Uint8Array()});
  const match = /^bytes=([0-9]{0,16})-([0-9]{0,16})$/.exec(range);
  if (!match || !size || !match[1] && !match[2]) return invalid();
  const first = match[1] ? Number(match[1]) : null, last = match[2] ? Number(match[2]) : null;
  if (first !== null && !Number.isSafeInteger(first) || last !== null && !Number.isSafeInteger(last)) return invalid();
  const start = first ?? Math.max(0, size - (last ?? 0));
  const end = first === null ? size - 1 : Math.min(last ?? size - 1, size - 1);
  if (start >= size || end < start || first === null && last === 0) return invalid();
  return {status: 206, headers: {...headers, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}`}, bytes: media.bytes.subarray(start, end + 1)};
}
