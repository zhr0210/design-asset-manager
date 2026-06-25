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
import TagManagerPage from './routes/TagManagerPage'
import AiConsolePage from './routes/AiConsolePage'
import {
  APP_DEFAULT_ROUTE,
  APP_NAVIGATION_ITEMS,
  type AppRouteId
} from '../shared/workflows/app-navigation.workflow'

const routeElements: Record<AppRouteId, React.ReactElement> = {
  dashboard: <Dashboard />,
  sites: <Sites />,
  browser: <BrowserPage />,
  search: <Search />,
  downloads: <DownloadQueue />,
  library: <Library />,
  'tag-manager': <TagManagerPage />,
  'ai-console': <AiConsolePage />,
  settings: <Settings />
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to={APP_DEFAULT_ROUTE.path} replace />} />
          {APP_NAVIGATION_ITEMS.map((item) => (
            <Route key={item.id} path={item.routeSegment} element={routeElements[item.id]} />
          ))}
          <Route path="*" element={<Navigate to={APP_DEFAULT_ROUTE.path} replace />} />
        </Route>
      </Routes>
    </Router>
  )
}
