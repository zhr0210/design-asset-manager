import AboutPage from './routes/AboutPage'
import WorkSetWindow from './routes/WorkSetWindow'
import React from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Dashboard from './routes/Dashboard'
import Library from './routes/Library'
import Settings from './routes/Settings'
import TagManagerPage from './routes/TagManagerPage'
import AiConsolePage from './routes/AiConsolePage'
import LegacyLibraryPage from './routes/LegacyLibraryPage'
import AssetCardWindow from './routes/AssetCardWindow'
import {
  APP_DEFAULT_ROUTE,
  APP_NAVIGATION_ITEMS,
  APP_ROUTE_ALIASES,
  type AppRouteId
} from '../shared/workflows/app-navigation.workflow'

const routeElements: Record<AppRouteId, React.ReactElement> = {
  dashboard: <Dashboard />,
  library: <Library />,
  'legacy-library': <LegacyLibraryPage />,
  'tag-manager': <TagManagerPage />,
  'model-library': <AiConsolePage embedded />,
  'ai-console': <AiConsolePage embedded />,
  settings: <Settings />,
  about: <AboutPage embedded />,
  'ai-task-models':<AiConsolePage embedded />,
  'ai-background':<AiConsolePage embedded />,
  'ai-diagnostics':<AiConsolePage embedded />
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/work-window" element={<WorkSetWindow />} />
        <Route path="/asset-card" element={<AssetCardWindow />} />
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to={APP_DEFAULT_ROUTE.path} replace />} />
          <Route path="library" element={<Library />} />
          <Route path="settings" element={<Settings />}>
            {APP_NAVIGATION_ITEMS.filter(item => item.id !== 'library' && item.id !== 'settings').map(item =>
              <Route key={item.id} path={item.routeSegment.slice('settings/'.length)} element={routeElements[item.id]} />
            )}
          </Route>
          {Object.entries(APP_ROUTE_ALIASES).map(([from,to])=><Route key={from} path={from.slice(1)} element={<Navigate to={to} replace/>}/>)}
          <Route path="*" element={<Navigate to={APP_DEFAULT_ROUTE.path} replace />} />
        </Route>
      </Routes>
    </Router>
  )
}
