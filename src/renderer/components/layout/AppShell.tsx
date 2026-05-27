import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell() {
  const location = useLocation()
  const isBrowserRoute = location.pathname === '/browser'

  if (isBrowserRoute) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans flex flex-col">
        <main className="flex-1 w-full h-full relative">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar Panel Left */}
      <Sidebar />

      {/* Main Panel Right */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Top */}
        <Topbar />

        {/* Dynamic Route Canvas */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
