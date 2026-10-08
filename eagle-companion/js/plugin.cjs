/* Design Asset Manager Eagle Companion — bounded local handler, no arbitrary execution. */
(function (root, factory) {
    const exported = factory();
    if (typeof module === 'object' && module.exports)
        module.exports = exported;
    if (root)
        root.DamEagleCompanion = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const ITEM_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,255}$/;
    const IDENTITY = /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/;
    const FINGERPRINT = /^[a-f0-9]{64}$/;
    function createHandler(options) {
        const eagle = options.eagle;
        const fs = options.fs || require('node:fs/promises');
        const path = options.path || require('node:path');
        const crypto = options.crypto || require('node:crypto');
        const session = {
            token: requireToken(options.sessionToken),
            libraryIdentity: requireIdentity(options.libraryIdentity),
            stagingRoot: path.resolve(options.stagingRoot),
            active: true
        };
        let serial = Promise.resolve();
        const invalidate = () => { session.active = false; };
        function assertActive(request) {
            if (!session.active || request.libraryIdentity !== session.libraryIdentity) {
                throw tagged('LIBRARY_CHANGED');
            }
        }
        async function execute(request) {
            if (!isPlainRecord(request) || request.sessionToken !== session.token)
                return failure('UNAUTHORIZED');
            if (!session.active || request.libraryIdentity !== session.libraryIdentity)
                return failure('LIBRARY_CHANGED');
            try {
                if (request.kind === 'negotiate') {
                    if (!exactKeys(request, ['kind', 'sessionToken', 'libraryIdentity']))
                        return failure('INVALID_REQUEST');
                    return { ok: true, kind: 'capabilities', fileReplace: true, libraryIdentity: session.libraryIdentity };
                }
                if (request.kind === 'snapshot-item') {
                    if (!exactItemRequest(request))
                        return failure('INVALID_REQUEST');
                    const item = await requireItem(eagle, request.itemId);
                    assertActive(request);
                    const snapshot = await fingerprintItem(item, fs, crypto);
                    assertActive(request);
                    return { ok: true, kind: 'item-snapshot', itemId: item.id, contentFingerprint: snapshot.digest, size: snapshot.size };
                }
                if (request.kind === 'read-preview') {
                    if (!exactKeys(request, ['kind', 'sessionToken', 'libraryIdentity', 'itemId', 'maxBytes']) || !ITEM_ID.test(request.itemId) || !Number.isSafeInteger(request.maxBytes) || request.maxBytes <= 0 || request.maxBytes > 32 * 1024 * 1024)
                        return failure('INVALID_REQUEST');
                    const item = await requireItem(eagle, request.itemId);
                    assertActive(request);
                    const candidate = typeof item.thumbnailPath === 'string' && item.thumbnailPath ? item.thumbnailPath : item.filePath;
                    const bytes = await readItemOwnedFile(candidate, item, fs, path, request.maxBytes);
                    assertActive(request);
                    return { ok: true, kind: 'preview', itemId: item.id, mimeType: previewMime(item.ext), bytesBase64: Buffer.from(bytes).toString('base64') };
                }
                if (request.kind === 'replace-file') {
                    if (!exactKeys(request, ['kind', 'sessionToken', 'libraryIdentity', 'itemId', 'stagedFilePath', 'expectedFingerprint', 'desiredFingerprint']) || !ITEM_ID.test(request.itemId) || typeof request.stagedFilePath !== 'string' || !FINGERPRINT.test(request.expectedFingerprint) || !FINGERPRINT.test(request.desiredFingerprint))
                        return failure('INVALID_REQUEST');
                    const stagedPath = await requireStagedPath(request.stagedFilePath, session.stagingRoot, fs, path);
                    assertActive(request);
                    const staged = await fingerprintPath(stagedPath, fs, crypto);
                    assertActive(request);
                    if (staged.digest !== request.desiredFingerprint)
                        return failure('STAGING_PATH_REJECTED');
                    let item = await requireItem(eagle, request.itemId);
                    assertActive(request);
                    const before = await fingerprintItem(item, fs, crypto);
                    assertActive(request);
                    if (before.digest !== request.expectedFingerprint)
                        return { ok: true, kind: 'replace-result', itemId: item.id, state: 'conflict', contentFingerprint: before.digest };
                    try {
                        assertActive(request);
                        const applied = await item.replaceFile(stagedPath);
                        assertActive(request);
                        if (applied !== true)
                            return failure('OPERATION_FAILED');
                    }
                    catch {
                        item = await requireItem(eagle, request.itemId);
                        assertActive(request);
                        const uncertain = await fingerprintItem(item, fs, crypto);
                        assertActive(request);
                        return { ok: true, kind: 'replace-result', itemId: item.id, state: uncertain.digest === request.desiredFingerprint ? 'applied' : 'uncertain', contentFingerprint: uncertain.digest };
                    }
                    item = await requireItem(eagle, request.itemId);
                    assertActive(request);
                    const after = await fingerprintItem(item, fs, crypto);
                    assertActive(request);
                    return { ok: true, kind: 'replace-result', itemId: item.id, state: after.digest === request.desiredFingerprint ? 'applied' : 'uncertain', contentFingerprint: after.digest };
                }
                return failure('INVALID_REQUEST');
            }
            catch (error) {
                return failure(error && ['ITEM_UNAVAILABLE', 'STAGING_PATH_REJECTED', 'LIBRARY_CHANGED'].includes(error.code) ? error.code : 'OPERATION_FAILED');
            }
        }
        function handle(request) {
            const result = serial.then(() => execute(request));
            serial = result.then(() => undefined, () => undefined);
            return result;
        }
        return Object.freeze({ handle, invalidate });
    }
    function registerLifecycle(eagle, handler) {
        if (eagle && typeof eagle.onLibraryChanged === 'function')
            eagle.onLibraryChanged(() => handler.invalidate());
        if (eagle && typeof eagle.onPluginBeforeExit === 'function')
            eagle.onPluginBeforeExit(() => handler.invalidate());
    }
    async function startLoopbackServer(options) {
        const http = options.http || require('node:http');
        const handler = options.handler;
        const server = http.createServer((request, response) => {
            if (request.method !== 'POST' || request.url !== '/v1/dam-eagle-companion' || !isLoopback(request.socket.remoteAddress)) {
                response.writeHead(404);
                response.end();
                return;
            }
            let size = 0;
            const chunks = [];
            request.on('data', (chunk) => { size += chunk.length; if (size > 48 * 1024 * 1024)
                request.destroy();
            else
                chunks.push(chunk); });
            request.on('end', async () => { try {
                const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                const result = await handler.handle(body);
                const bytes = Buffer.from(JSON.stringify(result));
                response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': String(bytes.length), 'Cache-Control': 'no-store' });
                response.end(bytes);
            }
            catch {
                response.writeHead(400);
                response.end();
            } });
        });
        await new Promise((resolve, reject) => { server.once('error', reject); server.listen(options.port, '127.0.0.1', resolve); });
        return Object.freeze({ port: server.address().port, close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) });
    }
    async function requireItem(eagle, id) { if (!ITEM_ID.test(id) || !eagle || !eagle.item || typeof eagle.item.getById !== 'function')
        throw tagged('ITEM_UNAVAILABLE'); const item = await eagle.item.getById(id); if (!item || item.id !== id)
        throw tagged('ITEM_UNAVAILABLE'); return item; }
    async function fingerprintItem(item, fs, crypto) { if (typeof item.filePath !== 'string' || !item.filePath)
        throw tagged('ITEM_UNAVAILABLE'); return fingerprintPath(item.filePath, fs, crypto); }
    async function fingerprintPath(filePath, fs, crypto) {
        const before = await fs.lstat(filePath);
        if (!before.isFile() || before.isSymbolicLink() || !Number.isSafeInteger(before.size)) throw tagged('ITEM_UNAVAILABLE');
        const file = await fs.open(filePath, 'r');
        try {
            const opened = await file.stat();
            if (opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size) throw tagged('ITEM_UNAVAILABLE');
            const digest = crypto.createHash('sha256');
            const buffer = Buffer.alloc(1024 * 1024);
            let total = 0;
            while (total < before.size) {
                const result = await file.read(buffer, 0, Math.min(buffer.length, before.size - total), total);
                if (!result.bytesRead) throw tagged('ITEM_UNAVAILABLE');
                digest.update(buffer.subarray(0, result.bytesRead));
                total += result.bytesRead;
            }
            const after = await file.stat();
            if (after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs) throw tagged('ITEM_UNAVAILABLE');
            return { digest: digest.digest('hex'), size: total };
        } finally { await file.close(); }
    }
    async function requireStagedPath(candidate, root, fs, path) { const resolved = await fs.realpath(path.resolve(candidate)); const realRoot = await fs.realpath(root); const relative = path.relative(realRoot, resolved); if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
        throw tagged('STAGING_PATH_REJECTED'); const stat = await fs.lstat(resolved); if (!stat.isFile() || stat.isSymbolicLink())
        throw tagged('STAGING_PATH_REJECTED'); return resolved; }
    async function readItemOwnedFile(candidate, item, fs, path, maxBytes) { const resolved = await fs.realpath(candidate); const allowed = []; for (const value of [item.filePath, item.thumbnailPath])
        if (typeof value === 'string' && value)
            allowed.push(await fs.realpath(value)); if (!allowed.includes(resolved))
        throw tagged('ITEM_UNAVAILABLE'); const stat = await fs.lstat(resolved); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes)
        throw tagged('ITEM_UNAVAILABLE'); const bytes = await fs.readFile(resolved); if (bytes.length !== stat.size)
        throw tagged('ITEM_UNAVAILABLE'); return bytes; }
    function exactItemRequest(value) { return exactKeys(value, ['kind', 'sessionToken', 'libraryIdentity', 'itemId']) && ITEM_ID.test(value.itemId); }
    function exactKeys(value, keys) { return isPlainRecord(value) && Object.keys(value).sort().join('\0') === [...keys].sort().join('\0'); }
    function isPlainRecord(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)); }
    function requireToken(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9._~-]{16,512}$/.test(value))
        throw new Error('INVALID_SESSION'); return value; }
    function requireIdentity(value) { if (typeof value !== 'string' || !IDENTITY.test(value))
        throw new Error('INVALID_IDENTITY'); return value; }
    function isLoopback(value) { return value === '127.0.0.1' || value === '::1' || value === '::ffff:127.0.0.1'; }
    function previewMime(ext) { const value = String(ext || '').toLowerCase(); if (value === 'png')
        return 'image/png'; if (value === 'webp')
        return 'image/webp'; if (value === 'gif')
        return 'image/gif'; return 'image/jpeg'; }
    function tagged(code) { const error = new Error(code); error.code = code; return error; }
    function failure(code) { return { ok: false, code }; }
    return Object.freeze({ createHandler, registerLifecycle, startLoopbackServer });
});
if (typeof eagle !== 'undefined' && eagle && typeof eagle.onPluginCreate === 'function') {
    eagle.onPluginCreate(() => {
        const status = typeof document !== 'undefined' ? document.querySelector('#status') : null;
        if (status)
            status.textContent = 'Pairing required. The companion remains idle until Design Asset Manager creates a reviewed local session.';
    });
}
