import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { DESKTOP_VIEWPORT_POLICY } from '../../../shared/desktop-viewport-policy'

export default function AppShell() {
  const location = useLocation()
  const isBrowserRoute = location.pathname === '/browser'
  const shouldShowTopbar = location.pathname !== '/library'

  if (isBrowserRoute) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <main className="relative h-full w-full flex-1">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="scrollbar-none h-screen w-screen overflow-auto bg-slate-50 font-sans text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div
        className="flex h-full"
        style={{
          minWidth: DESKTOP_VIEWPORT_POLICY.shell.minContentWidth,
          minHeight: DESKTOP_VIEWPORT_POLICY.shell.minContentHeight
        }}
      >
        <Sidebar />

        <div className="ml-3 flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          {shouldShowTopbar && <Topbar />}

          <main className="scrollbar-none relative flex-1 overflow-auto bg-slate-50 p-8 dark:bg-slate-950">
            <div
              className="flex min-h-full flex-col"
              style={{ minWidth: DESKTOP_VIEWPORT_POLICY.shell.mainContentMinWidth }}
            >
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
