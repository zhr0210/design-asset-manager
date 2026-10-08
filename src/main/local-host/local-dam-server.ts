import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import type { BrowserClientContext } from './client-context'
import { workMediaResponse } from '../work-mode/media-response'

interface BrowserSession {
  context: BrowserClientContext
  csrf: string
  expires: number
  streams: Map<http.ServerResponse, BrowserClientContext>
  clients: Map<string, BrowserClientContext>
  seen: Map<string, number>
}

export interface LocalDamServerInput {
  health?(): { buildId: string; platform: string; arch: string; version: string }
  rendererDirectory: string
  channels(): readonly string[]
  invoke(client: BrowserClientContext, command: string, args: unknown[]): Promise<unknown>
  media(client: BrowserClientContext, reference: string): Promise<{ bytes: Uint8Array; type: string }>
  connected?(client: BrowserClientContext): void
  disconnected?(client: BrowserClientContext): void
  revoked?(client: BrowserClientContext): void
}

/** Loopback product adapter. No arbitrary files, Electron events or process API. */
export async function createLocalDamServer(input: LocalDamServerInput) {
  const rendererRoot = await fs.realpath(input.rendererDirectory)
  const sessions = new Map<string, BrowserSession>()
  const authenticated = new Set<BrowserClientContext>()
  // Browsers may retry a POST below fetch when the socket dies before headers.
  // Admission is per document, before effects; no result/credential is cached.
  const invocations = new WeakMap<BrowserClientContext, { highest: number; seen: Set<number> }>()
  const launches = new Map<string, number>()
  let pendingLaunches = 0
  let origin = ''
  let closed = false
  const secret = () => randomBytes(32).toString('hex')
  const sessionCookie = (header: string | undefined) => new RegExp(`(?:^|;\\s*)dam_session_${new URL(origin).port}=([a-f0-9]{64})(?:;|$)`).exec(header ?? '')?.[1]
  const releaseClient = (session: BrowserSession, context: BrowserClientContext) => {
    session.clients.delete(context.id); session.seen.delete(context.id); authenticated.delete(context)
    input.disconnected?.(context)
    input.revoked?.(context)
    for (const [stream, owner] of session.streams) if (owner === context) { session.streams.delete(stream); stream.end() }
  }
  const cleanExpired = () => {
    for (const [grant, expiry] of launches) if (expiry < Date.now()) launches.delete(grant)
    for (const [cookie, session] of sessions) if (session.expires < Date.now()) {
      for (const context of session.clients.values()) { authenticated.delete(context); input.disconnected?.(context); input.revoked?.(context) }
      for (const stream of session.streams.keys()) stream.end()
      sessions.delete(cookie)
    }
    for (const session of sessions.values()) for (const context of session.clients.values()) {
      if (context !== session.context && ![...session.streams.values()].includes(context) && Date.now() - (session.seen.get(context.id) ?? 0) > 60_000) releaseClient(session, context)
    }
  }
  const server = http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'")
    const send = (status: number, value: unknown) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify(value, (_key, item) => {
        if (item instanceof Uint8Array) return { $damBinary: Buffer.from(item).toString('base64') }
        if (item?.type === 'Buffer' && Array.isArray(item.data) && Object.keys(item).length === 2) return { $damBinary: Buffer.from(item.data).toString('base64') }
        return item
      }))
    }
    try {
      cleanExpired()
      if (closed || request.headers.host !== new URL(origin).host ||
        (request.headers.origin && request.headers.origin !== origin) ||
        request.headers['sec-fetch-site'] === 'cross-site') { send(403, { code: 'REQUEST_DENIED' }); return }
      const url = new URL(request.url ?? '/', origin)
      const eventQuery = url.pathname === '/api/events' && [...url.searchParams.keys()].every(key => key === 'client') && url.searchParams.getAll('client').length === 1
      if (url.origin !== origin || (url.search && !eventQuery) || url.username || url.password) { send(403, { code: 'REQUEST_DENIED' }); return }
      if (request.method === 'GET' && url.pathname === '/api/health' && input.health) {
        const health = input.health()
        send(200, { schema: 1, state: 'ready', buildId: health.buildId, platform: health.platform, arch: health.arch, version: health.version })
        return
      }
      if (request.method === 'GET' && url.pathname === '/launch') {
        if (!pendingLaunches) { send(403, { code: 'START_DAM_LAUNCHER' }); return }
        pendingLaunches--
        const grant = secret()
        launches.set(grant, Date.now() + 60_000)
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        response.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>正在打开 DAM</title><body data-dam-grant="${grant}"><p>正在连接本机 DAM…</p><script src="/launch.js"></script></body></html>`)
        return
      }
      if (request.method === 'GET' && url.pathname === '/launch.js') {
        response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
        response.end("fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({grant:document.body.dataset.damGrant})}).then(r=>{if(!r.ok)throw Error();history.replaceState(null,'','/');location.replace('/')}).catch(()=>{document.body.textContent='连接授权已失效，请重新使用 DAM 浏览器版入口。'})")
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/session') {
        if (request.headers.origin !== origin) { send(403, { code: 'REQUEST_DENIED' }); return }
        const body = await readJson(request)
        if (!body || Object.keys(body).join() !== 'grant' || typeof body.grant !== 'string' || !launches.has(body.grant)) { send(403, { code: 'LAUNCH_EXPIRED' }); return }
        launches.delete(body.grant)
        // Opening another ordinary entry in the same browser keeps existing
        // documents valid; document IDs still provide separate command authority.
        const existingCookie = sessionCookie(request.headers.cookie)
        const existing = existingCookie ? sessions.get(existingCookie) : undefined
        if (existing) { send(200, { csrf: existing.csrf, clientId: existing.context.id }); return }
        const cookie = secret()
        const context: BrowserClientContext = Object.freeze({ kind: 'browser-client', id: secret(), role: 'workspace' })
        const session = { context, csrf: secret(), expires: Date.now() + 24 * 60 * 60_000, streams: new Map<http.ServerResponse, BrowserClientContext>(), clients: new Map([[context.id, context]]), seen: new Map([[context.id, Date.now()]]) }
        sessions.set(cookie, session)
        authenticated.add(context)
        // Cookie scope ignores ports; separate ordinary profiles can own separate
        // loopback Hosts in the same browser. Their grants must not overwrite one another.
        response.setHeader('Set-Cookie', `dam_session_${new URL(origin).port}=${cookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`)
        send(200, { csrf: session.csrf, clientId: context.id })
        return
      }
      const cookie = sessionCookie(request.headers.cookie)
      const session = cookie ? sessions.get(cookie) : undefined
      if (!session) {
        if (request.method === 'GET' && url.pathname === '/') {
          response.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' })
          response.end('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>DAM 尚未连接</title><h1>请使用 DAM 浏览器版入口</h1><p>该入口会启动或连接这台电脑的 DAM，并授权此界面。后台重启后，请重新打开入口。</p></html>')
        } else send(403, { code: 'SESSION_EXPIRED' })
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/session-info') {
        // Each document has its own authority even when tabs share the HttpOnly cookie.
        if (session.clients.size >= 64) { send(429, { code: 'TOO_MANY_CLIENTS' }); return }
        const context: BrowserClientContext = Object.freeze({ kind: 'browser-client', id: secret(), role: 'workspace' })
        session.clients.set(context.id, context); session.seen.set(context.id, Date.now()); authenticated.add(context)
        send(200, { csrf: session.csrf, clientId: context.id }); return
      }
      if (request.method === 'POST' && url.pathname === '/api/client-close') {
        if (request.headers.origin !== origin) { send(403, { code: 'REQUEST_DENIED' }); return }
        const body = await readJson(request)
        if (Object.keys(body).sort().join() !== 'clientId,csrf' || body.csrf !== session.csrf || typeof body.clientId !== 'string') { send(403, { code: 'REQUEST_DENIED' }); return }
        const context = session.clients.get(body.clientId)
        if (!context) { send(403, { code: 'SESSION_EXPIRED' }); return }
        releaseClient(session, context); send(200, { closed: true }); return
      }
      if (request.method === 'GET' && url.pathname === '/api/events') {
        const context = session.clients.get(url.searchParams.get('client') ?? '')
        if (!context) { send(403, { code: 'SESSION_EXPIRED' }); return }
        response.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive' })
        response.write('event: connected\ndata: {}\n\n')
        session.streams.set(response, context)
        session.seen.set(context.id, Date.now())
        input.connected?.(context)
        const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 20_000)
        request.once('close', () => {
          clearInterval(heartbeat); session.streams.delete(response)
          if (session.clients.has(context.id)) session.seen.set(context.id, Date.now())
          if (![...session.streams.values()].includes(context)) input.disconnected?.(context)
        })
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/command') {
        if (request.headers.origin !== origin || request.headers['x-dam-csrf'] !== session.csrf) { send(403, { code: 'REQUEST_DENIED' }); return }
        const body = await readJson(request)
        if (!body || Object.keys(body).sort().join() !== 'args,command' || typeof body.command !== 'string' || !Array.isArray(body.args) || body.args.length > 8) { send(400, { code: 'INVALID_COMMAND' }); return }
        if (!input.channels().includes(body.command)) { send(404, { code: 'CAPABILITY_UNAVAILABLE' }); return }
        const context = session.clients.get(String(request.headers['x-dam-client'] ?? ''))
        if (!context) { send(403, { code: 'SESSION_EXPIRED' }); return }
        session.seen.set(context.id, Date.now())
        const invocation = request.headers['x-dam-invocation']
        if (invocation !== undefined) {
          const id = Number(invocation)
          if (typeof invocation !== 'string' || !/^[1-9][0-9]*$/.test(invocation) || !Number.isSafeInteger(id)) { send(400, { code: 'INVALID_INVOCATION' }); return }
          const history = invocations.get(context) ?? { highest: 0, seen: new Set<number>() }
          if (id <= history.highest - 1024 || history.seen.has(id)) {
            send(409, { code: 'COMMAND_RECEIPT_UNKNOWN', error: '操作结果尚未确认。请检查保存结果，勿重复提交。' }); return
          }
          history.highest = Math.max(history.highest, id)
          for (const old of history.seen) if (old <= history.highest - 1024) history.seen.delete(old)
          history.seen.add(id); invocations.set(context, history)
        }
        const value = await input.invoke(context, body.command, body.args)
        send(200, { value })
        return
      }
      if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname.startsWith('/media/')) {
        const media = await input.media(session.context, url.pathname.slice('/media/'.length))
        const result = workMediaResponse(media, request.headers.range)
        response.writeHead(result.status, result.headers)
        response.end(request.method === 'HEAD' ? undefined : result.bytes)
        return
      }
      if (request.method === 'GET' && (url.pathname === '/' || /^\/(?:assets\/)?[a-zA-Z0-9_.-]+\.(?:html|js|css|svg|woff2?)$/.test(url.pathname))) {
        const file = path.resolve(rendererRoot, url.pathname === '/' ? 'index.html' : url.pathname.slice(1))
        const relative = path.relative(rendererRoot, await fs.realpath(file))
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) { send(404, { code: 'NOT_FOUND' }); return }
        const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' }
        response.writeHead(200, { 'Content-Type': `${types[path.extname(file)] ?? 'application/octet-stream'}; charset=utf-8` })
        response.end(await fs.readFile(file))
        return
      }
      send(404, { code: 'NOT_FOUND' })
    } catch (error) { if (!response.headersSent) send(400, { code: 'OPERATION_FAILED', error: publicError(error) }); else response.end() }
  })
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  return Object.freeze({
    origin,
    authorizeLaunch() { pendingLaunches = Math.min(pendingLaunches + 1, 8); return `${origin}/launch` },
    isAuthenticated(context: unknown): context is BrowserClientContext { return authenticated.has(context as BrowserClientContext) },
    publish(name: string, payload: unknown) {
      const data = JSON.stringify({ name, payload })
      for (const session of sessions.values()) for (const stream of session.streams.keys()) {
        try { stream.write(`data: ${data}\n\n`) } catch { session.streams.delete(stream) }
      }
    },
    publishToClient(id: string, name: string, payload: unknown) {
      const data = JSON.stringify({ name, payload })
      for (const session of sessions.values()) for (const [stream, context] of session.streams) if (context.id === id) {
        try { stream.write(`data: ${data}\n\n`) } catch { session.streams.delete(stream) }
      }
    },
    async close() {
      closed = true
      authenticated.clear()
      for (const session of sessions.values()) {
        for (const context of session.clients.values()) { input.disconnected?.(context); input.revoked?.(context) }
        for (const stream of session.streams.keys()) stream.end()
      }
      sessions.clear(); launches.clear()
      server.closeAllConnections()
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })
}

function publicError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  const messages: Record<string,string> = {
    SETTINGS_CONFLICT: '设置已在另一界面变化，输入仍保留。请重新核对后保存。',
    BACKEND_CONFLICT: '连接已在另一界面变化，输入仍保留。请重新核对。',
    RECEIPT_SCOPE_EXPIRED: '本次操作凭据已失效，请重新打开审查。',
    SYNTHETIC_EXECUTION_DENIED: '受控测试尚未登记此执行夹具，当前操作未执行。',
    SYNTHETIC_SCOPE_DENIED: '测试模式只能使用登记的合成目录。',
    SYNTHETIC_ENDPOINT_DENIED: '测试模式只能连接登记的合成服务。',
    DRAFT_OWNER_ACTIVE: '另一界面仍在编辑这项草稿，请关闭原界面后重试。',
    DRAFT_LOCAL_CONFLICT: '此界面已存在同一内容的新草稿，请先保存或取消。'
  }
  const code = message.split(':')[0]
  if (messages[code]) return messages[code]
  // Fixed uppercase product codes carry no paths, URLs, tokens or system error text.
  if (/^(?:MODEL|LOCAL|AI|VISUAL|NATIVE|RETRIEVAL|ASSET_SEARCH)_[A-Z_0-9]{1,80}$/.test(message)) return message
  // Only fixed product messages cross the transport; system errors may contain paths.
  const known = [
    '请先完成或取消当前切库或退出审查。','内容已变化，请重新发起切库。',
    '另一界面仍有尚未保存的表单或笔记编辑，请先保存或取消编辑。',
    '另一个界面未回应，暂未切库或退出。请回到该界面检查连接。',
    '草稿尚未暂存成功，暂未切库或退出。','正在切换素材库或退出，请稍候。',
    '选择已失效，请重新打开选择器。','测试模式只能选择合成测试目录。',
    '测试模式不允许使用链接目录或文件。','请选择绝对目录路径。','请先完成或取消当前文件选择。'
  ]
  return known.includes(message) ? message : '操作未完成，请检查当前状态后重试。'
}

async function readJson(request: http.IncomingMessage): Promise<Record<string, any>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 2 * 1024 * 1024) throw new Error('REQUEST_TOO_LARGE')
    chunks.push(Buffer.from(chunk))
  }
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_REQUEST')
  return value
}
