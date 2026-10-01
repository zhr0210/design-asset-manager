import AboutPage from './routes/AboutPage'
import WorkSetWindow from './routes/WorkSetWindow'
import React from 'react'
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Dashboard from './routes/Dashboard'
import DownloadQueue from './routes/DownloadQueue'
import Library from './routes/Library'
import Settings from './routes/Settings'
import TagManagerPage from './routes/TagManagerPage'
import ModelLibraryPage from './routes/ModelLibraryPage'
import AiConsolePage from './routes/AiConsolePage'
import ConnectedLibrariesPage from './routes/ConnectedLibrariesPage'
import LegacyLibraryPage from './routes/LegacyLibraryPage'
import AssetCardWindow from './routes/AssetCardWindow'
import {
  APP_DEFAULT_ROUTE,
  APP_NAVIGATION_ITEMS,
  APP_ROUTE_ALIASES,
  resolveAppPath,
  type AppRouteId
} from '../shared/workflows/app-navigation.workflow'

const routeElements: Record<AppRouteId, React.ReactElement> = {
  dashboard: <Dashboard />,
  downloads: <DownloadQueue />,
  library: <Library />,
  'connected-libraries': <ConnectedLibrariesPage />,
  'legacy-library': <LegacyLibraryPage />,
  'tag-manager': <TagManagerPage />,
  'model-library': <AiConsolePage />,
  'ai-console': <AiConsolePage />,
  settings: <SettingsEntry />,
  about: <AboutPage />,
  'ai-task-models':<AiConsolePage />,
  'ai-background':<AiConsolePage />,
  'ai-diagnostics':<AiConsolePage />
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/work-window" element={<WorkSetWindow />} />
        <Route path="/asset-card" element={<AssetCardWindow />} />
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to={APP_DEFAULT_ROUTE.path} replace />} />
          {APP_NAVIGATION_ITEMS.map((item) => (
            <Route key={item.id} path={item.routeSegment} element={routeElements[item.id]} />
          ))}
          {Object.entries(APP_ROUTE_ALIASES).map(([from,to])=><Route key={from} path={from.slice(1)} element={<Navigate to={to} replace/>}/>)}
          <Route path="*" element={<Navigate to={APP_DEFAULT_ROUTE.path} replace />} />
        </Route>
      </Routes>
    </Router>
  )
}

function SettingsEntry(){const location=useLocation();const target=resolveAppPath(location.pathname,location.search);return target!==location.pathname?<Navigate to={target} replace/>:<Settings/>}
