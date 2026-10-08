/* Local pairing gateway. Secrets stay in process; only explicit Eagle consent activates access. */
(function (root, factory) {
    const exported = factory();
    if (typeof module === 'object' && module.exports) module.exports = exported;
    if (root) root.DamEaglePairing = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const crypto = require('node:crypto');
    const fs = require('node:fs/promises');
    const path = require('node:path');
    const PROTOCOL = 1;
    const TOKEN = /^[a-f0-9]{64}$/;
    const digest = value => crypto.createHash('sha256').update(value).digest('hex');
    const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
        Object.keys(value).sort().join('\0') === keys.slice().sort().join('\0');

    function createPairingGateway(options) {
        const eagle = options.eagle;
        const providerIdentity = options.providerIdentity;
        const core = options.core;
        let pending = null;
        let active = null;
        let serial = Promise.resolve();
        async function observeLibrary() {
            const libraryPath = await fs.realpath(eagle.library.path);
            const stat = await fs.stat(libraryPath, { bigint: true });
            if (!stat.isDirectory() || stat.ino === 0n || stat.dev === 0n) throw Error('IDENTITY_UNAVAILABLE');
            return {
                identity: { providerIdentity,
                    libraryIdentity: 'eagle-library:' + digest(`${stat.dev}:${stat.ino}:${stat.birthtimeNs}`),
                    volumeIdentity: 'eagle-volume:' + digest(String(stat.dev)) },
                libraryPath, displayName: String(eagle.library.name)
            };
        }
        function revoke() {
            if (active) active.handler.invalidate();
            active = null; pending = null;
            options.changed({ state: 'unpaired' });
        }
        async function requireActive(token, identity) {
            if (!active || active.token !== token || identity && active.library.identity.libraryIdentity !== identity) throw Error('UNAUTHORIZED');
            const library = await observeLibrary();
            if (!active || active.token !== token || JSON.stringify(library.identity) !== JSON.stringify(active.library.identity)) {
                revoke(); throw Error('LIBRARY_CHANGED');
            }
            return active;
        }
        async function pairing(request) {
            if (!request || !TOKEN.test(request.sessionToken)) return { state: 'unpaired' };
            if (request.kind === 'begin') {
                if (!exact(request, ['kind', 'sessionToken', 'requestedGrant', 'stagingRoot']) ||
                    !['read-only', 'read-write'].includes(request.requestedGrant) ||
                    typeof request.stagingRoot !== 'string' || !path.isAbsolute(request.stagingRoot)) return { state: 'unpaired' };
                if (active) return { state: active.token === request.sessionToken ? 'paired' : 'busy' };
                if (pending && pending.expires > Date.now()) return { state: pending.token === request.sessionToken ? 'pending' : 'busy' };
                const root = await fs.realpath(request.stagingRoot);
                if (!(await fs.stat(root)).isDirectory()) return { state: 'unpaired' };
                pending = { token: request.sessionToken, requestedGrant: request.requestedGrant,
                    stagingRoot: root, library: await observeLibrary(), expires: Date.now() + 120000 };
                options.changed({ state: 'pending', displayName: pending.library.displayName, requestedGrant: pending.requestedGrant });
                return { state: 'pending', protocolVersion: PROTOCOL };
            }
            if (!exact(request, ['kind', 'sessionToken'])) return { state: 'unpaired' };
            if (request.kind === 'revoke') {
                if (active && active.token === request.sessionToken || pending && pending.token === request.sessionToken) revoke();
                return { state: 'unpaired' };
            }
            if (request.kind !== 'observe') return { state: 'unpaired' };
            if (pending && pending.token === request.sessionToken && pending.expires > Date.now()) return { state: 'pending', protocolVersion: PROTOCOL };
            try {
                const session = await requireActive(request.sessionToken);
                return { state: 'paired', protocolVersion: PROTOCOL, requestedGrant: session.requestedGrant, ...session.library };
            } catch { return { state: 'unpaired' }; }
        }
        async function approve() {
            const reviewed = pending;
            if (!reviewed || reviewed.expires <= Date.now()) { revoke(); return false; }
            const current = await observeLibrary();
            if (pending !== reviewed || JSON.stringify(current.identity) !== JSON.stringify(reviewed.library.identity)) { revoke(); return false; }
            active = { ...reviewed, handler: core.createHandler({ eagle, sessionToken: reviewed.token,
                libraryIdentity: current.identity.libraryIdentity, stagingRoot: reviewed.stagingRoot }) };
            pending = null;
            options.changed({ state: 'paired', displayName: current.displayName, requestedGrant: active.requestedGrant });
            return true;
        }
        async function invoke(request) {
            const session = await requireActive(request.sessionToken, request.libraryIdentity);
            if (request.kind === 'replace-file' && session.requestedGrant !== 'read-write') return { ok: false, code: 'UNAUTHORIZED' };
            const result = await session.handler.handle(request);
            await requireActive(request.sessionToken, request.libraryIdentity);
            if (result.ok === true && result.kind === 'capabilities') result.fileReplace = session.requestedGrant === 'read-write';
            return result;
        }
        async function webApi(request) {
            if (!exact(request, ['sessionToken', 'libraryIdentity', 'method', 'endpoint', 'payload'])) throw Error('INVALID_REQUEST');
            const session = await requireActive(request.sessionToken, request.libraryIdentity);
            const reads = { '/api/v2/app/info': 'GET', '/api/v2/library/info': 'GET', '/api/v2/item/get': 'POST' };
            const writes = ['/api/v2/item/update', '/api/v2/item/add'];
            if (reads[request.endpoint] !== request.method && !(session.requestedGrant === 'read-write' && request.method === 'POST' && writes.includes(request.endpoint))) throw Error('UNAUTHORIZED');
            if (request.method === 'GET' && request.payload !== null) throw Error('INVALID_REQUEST');
            if (request.method === 'POST') {
                const allowed = request.endpoint === '/api/v2/item/get' ? ['ids', 'fields', 'offset', 'limit'] :
                    request.endpoint === '/api/v2/item/update' ? ['id', 'name', 'tags', 'folders', 'annotation', 'star', 'isDeleted'] :
                    ['id', 'path', 'name', 'tags', 'folders', 'annotation'];
                if (!request.payload || typeof request.payload !== 'object' || Array.isArray(request.payload) || Object.keys(request.payload).some(key => !allowed.includes(key))) throw Error('INVALID_REQUEST');
                if (request.endpoint === '/api/v2/item/add') {
                    const resolved = await fs.realpath(request.payload.path);
                    const relative = path.relative(session.stagingRoot, resolved);
                    const stat = await fs.lstat(request.payload.path);
                    if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || !stat.isFile() || stat.isSymbolicLink()) throw Error('STAGING_PATH_REJECTED');
                }
            }
            await requireActive(request.sessionToken, request.libraryIdentity);
            const response = await (options.fetch || fetchOfficial)('http://127.0.0.1:41595' + request.endpoint, {
                method: request.method, headers: { 'Content-Type': 'application/json' },
                body: request.payload === null ? undefined : JSON.stringify(request.payload),
                signal: AbortSignal.timeout(5000), redirect: 'error'
            });
            const text = await response.text();
            if (!response.ok || Buffer.byteLength(text) > 8 * 1024 * 1024) throw Error('PROVIDER_UNAVAILABLE');
            await requireActive(request.sessionToken, request.libraryIdentity);
            return JSON.parse(text);
        }
        function dispatch(route, request) {
            const result = serial.then(() => route === '/v1/dam-eagle-pairing' ? pairing(request) :
                route === '/v1/dam-eagle-companion' ? invoke(request) :
                route === '/v1/dam-eagle-web-api' ? webApi(request) : Promise.reject(Error('INVALID_REQUEST')));
            serial = result.catch(() => undefined);
            return result;
        }
        return { dispatch, approve, revoke };
    }
    // Node HTTP avoids renderer Origin/referrer behavior. Origin/port/endpoint are fixed above.
    function fetchOfficial(url, input) {
        return new Promise((resolve, reject) => {
            const request = require('node:http').request(url, { method: input.method, headers: input.headers }, response => {
                let size = 0;
                const chunks = [];
                response.on('data', chunk => {
                    size += chunk.length;
                    if (size > 8 * 1024 * 1024) request.destroy(Error('RESPONSE_TOO_LARGE'));
                    else chunks.push(chunk);
                });
                response.on('error', reject);
                response.on('end', () => resolve({ ok: response.statusCode >= 200 && response.statusCode < 300,
                    text: async () => Buffer.concat(chunks).toString('utf8') }));
            });
            request.setTimeout(5000, () => request.destroy(Error('PROVIDER_TIMEOUT')));
            request.on('error', reject);
            if (input.body) request.write(input.body);
            request.end();
        });
    }
    async function startServer(gateway, port = 41596) {
        const server = require('node:http').createServer((request, response) => {
            if (request.method !== 'POST' || request.headers.origin || request.headers['sec-fetch-site'] ||
                !['127.0.0.1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress) ||
                request.headers.host !== '127.0.0.1:' + server.address().port ||
                request.headers['content-type'] !== 'application/json') {
                response.writeHead(403); response.end(); return;
            }
            let size = 0;
            const chunks = [];
            request.on('data', chunk => { size += chunk.length; if (size > 65536) request.destroy(); else chunks.push(chunk); });
            request.on('end', async () => {
                try {
                    const result = await gateway.dispatch(request.url, JSON.parse(Buffer.concat(chunks).toString('utf8')));
                    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
                    response.end(JSON.stringify(result));
                } catch { response.writeHead(503); response.end('{"ok":false,"code":"OPERATION_FAILED"}'); }
            });
        });
        server.requestTimeout = 10000;
        await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
        return { port: server.address().port, close: () => new Promise(resolve => { gateway.revoke(); server.close(resolve); }) };
    }
    return { createPairingGateway, startServer };
});

if (typeof eagle !== 'undefined' && eagle && typeof eagle.onPluginCreate === 'function') {
    eagle.onPluginCreate(async () => {
        const status = document.querySelector('#status');
        const approve = document.querySelector('#approve');
        const reject = document.querySelector('#reject');
        let installId = localStorage.getItem('dam-companion-install-id');
        if (!/^[a-f0-9]{32}$/.test(installId || '')) {
            installId = require('node:crypto').randomBytes(16).toString('hex');
            localStorage.setItem('dam-companion-install-id', installId);
        }
        const gateway = DamEaglePairing.createPairingGateway({ eagle, core: DamEagleCompanion,
            providerIdentity: 'eagle-companion:' + installId,
            changed: state => {
                if (state.state === 'pending' && eagle.window && typeof eagle.window.show === 'function') void eagle.window.show();
                approve.hidden = state.state !== 'pending';
                reject.hidden = state.state === 'unpaired';
                status.textContent = state.state === 'pending' ? `DAM 请求连接「${state.displayName}」。权限：${state.requestedGrant === 'read-write' ? '读取、元数据编辑、添加、回收/恢复和文件替换' : '只读索引与预览'}。仅在你刚从 DAM 发起配对且已选对库时允许。请求两分钟后失效。` :
                    state.state === 'paired' ? `已连接「${state.displayName}」。切库、退出插件或撤销会立即停止会话；不会保存配对秘密。` :
                    '等待 DAM 发起配对。请选择要连接的库，再在 DAM 的 Eagle 连接库页面发起请求。';
            }
        });
        approve.addEventListener('click', () => gateway.approve().catch(() => gateway.revoke()));
        reject.addEventListener('click', () => gateway.revoke());
        eagle.onLibraryChanged(() => gateway.revoke());
        try {
            const server = await DamEaglePairing.startServer(gateway);
            eagle.onPluginBeforeExit(() => { void server.close(); });
            gateway.revoke();
        } catch { status.textContent = '无法启动本机配对服务（41596）。请检查是否已运行另一个伴随插件实例。'; }
    });
}
