import React from 'react'
import ReactDOM from 'react-dom/client'
import { getWorkspaceClient, installWorkspaceClient } from './workspace-client'
import { createWorkspaceClient } from '../shared/client/workspace-client'
import { createBrowserTransport } from './browser-transport'
import './styles/globals.css'

async function startWorkspace() {
  const native = window as Window & { assetCardAPI?: unknown; workWindowAPI?: unknown }
  if (native.assetCardAPI || native.workWindowAPI) {
    const { default: NativeSurface } = native.workWindowAPI
      ? await import('./routes/WorkSetWindow')
      : await import('./routes/AssetCardWindow')
    ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><NativeSurface /></React.StrictMode>)
    return
  }
  const client = getWorkspaceClient() ?? createWorkspaceClient(await createBrowserTransport())
  if (client) installWorkspaceClient(client)
  const { default: App } = await import('./App')
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode><App /></React.StrictMode>
  )
}
void startWorkspace().catch(() => {
  const root = document.getElementById('root')!
  root.textContent = '无法连接本机 DAM。请重新使用 DAM 浏览器版入口启动或授权此界面。'
})
