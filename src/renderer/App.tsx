import React from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Dashboard from './routes/Dashboard'
import Sites from './routes/Sites'
import BrowserPage from './routes/BrowserPage'
import Search from './routes/Search'
import DownloadQueue from './routes/DownloadQueue'
import Library from './routes/Library'
import Settings from './routes/Settings'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sites" element={<Sites />} />
          <Route path="browser" element={<BrowserPage />} />
          <Route path="search" element={<Search />} />
          <Route path="downloads" element={<DownloadQueue />} />
          <Route path="library" element={<Library />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}
