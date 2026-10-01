export type AppRouteId =
  | 'dashboard'
  | 'downloads'
  | 'library'
  | 'connected-libraries'
  | 'legacy-library'
  | 'tag-manager'
  | 'model-library'
  | 'ai-console'
  | 'settings'

export type AppShellKind = 'desktop'

export interface AppNavigationItem {
  id: AppRouteId
  path: `/${string}`
  routeSegment: string
  sidebarLabel: string
  topbarTitle: string
  shell: AppShellKind
  showTopbar: boolean
  showDownloadBadge?: boolean
}

export const APP_DEFAULT_ROUTE_ID: AppRouteId = 'library'
export const APP_FALLBACK_TITLE = '设计素材管理器'

export const APP_NAVIGATION_ITEMS: readonly AppNavigationItem[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    routeSegment: 'dashboard',
    sidebarLabel: '仪表盘',
    topbarTitle: '仪表盘',
    shell: 'desktop',
    showTopbar: true
  },
  {
    id: 'downloads',
    path: '/downloads',
    routeSegment: 'downloads',
    sidebarLabel: '下载队列',
    topbarTitle: '下载队列',
    shell: 'desktop',
    showTopbar: true,
    showDownloadBadge: true
  },
  {
    id: 'library',
    path: '/library',
    routeSegment: 'library',
    sidebarLabel: '素材工作区',
    topbarTitle: '素材工作区',
    shell: 'desktop',
    showTopbar: true
  },
  {
    id: 'connected-libraries',
    path: '/connected-libraries',
    routeSegment: 'connected-libraries',
    sidebarLabel: 'Eagle 连接库',
    topbarTitle: 'Eagle 连接库',
    shell: 'desktop',
    showTopbar: true
  },
  {
    id: 'legacy-library',
    path: '/legacy-library',
    routeSegment: 'legacy-library',
    sidebarLabel: '找回旧素材',
    topbarTitle: '旧 DAM 库（只读）',
    shell: 'desktop',
    showTopbar: true
  },
  {
    id: 'tag-manager',
    path: '/tag-manager',
    routeSegment: 'tag-manager',
    sidebarLabel: '标签管理',
    topbarTitle: '标签管理中心',
    shell: 'desktop',
    showTopbar: true
  },
  {
    id: 'model-library',
    path: '/model-library',
    routeSegment: 'model-library',
    sidebarLabel: '模型库',
    topbarTitle: '模型库',
    shell: 'desktop',
    showTopbar: true
  },
  {
    id: 'ai-console',
    path: '/ai-console',
    routeSegment: 'ai-console',
    sidebarLabel: 'AI 控制台',
    topbarTitle: 'AI 控制台',
    shell: 'desktop',
    showTopbar: true
  },
  {
    id: 'settings',
    path: '/settings',
    routeSegment: 'settings',
    sidebarLabel: '设置',
    topbarTitle: '系统偏好设置',
    shell: 'desktop',
    showTopbar: true
  }
] as const

export const APP_DEFAULT_ROUTE = APP_NAVIGATION_ITEMS.find((item) => item.id === APP_DEFAULT_ROUTE_ID)!
export const APP_HOME_ROUTE = APP_DEFAULT_ROUTE
export const APP_LIBRARY_DOCK_ROUTE = APP_NAVIGATION_ITEMS.find((item) => item.id === 'library')!
export const APP_MODEL_LIBRARY_ROUTE = APP_NAVIGATION_ITEMS.find(
  (item) => item.id === 'model-library'
)!
export const APP_OVERLAY_ROUTE_IDS: readonly AppRouteId[] = [
  'dashboard',
  'downloads',
  'library',
  'connected-libraries',
  'legacy-library',
  'tag-manager',
  'model-library',
  'ai-console',
  'settings'
] as const
export const APP_MENU_ROUTE_IDS: readonly AppRouteId[] = [
  'dashboard',
  'downloads',
  'connected-libraries',
  'legacy-library',
  'tag-manager',
  'model-library',
  'ai-console',
  'settings'
] as const

export function getAppMenuNavigationItems(): AppNavigationItem[] {
  return APP_MENU_ROUTE_IDS
    .map((id) => APP_NAVIGATION_ITEMS.find((item) => item.id === id))
    .filter((item): item is AppNavigationItem => Boolean(item))
}

export function getAppNavigationItem(pathname: string): AppNavigationItem | undefined {
  return APP_NAVIGATION_ITEMS.find((item) => item.path === pathname)
}

export function getAppTopbarTitle(pathname: string): string {
  return getAppNavigationItem(pathname)?.topbarTitle ?? APP_FALLBACK_TITLE
}


export function isAppOverlayRoute(pathname: string): boolean {
  const item = getAppNavigationItem(pathname)
  return Boolean(item && APP_OVERLAY_ROUTE_IDS.includes(item.id))
}

export function shouldShowAppTopbar(pathname: string): boolean {
  return getAppNavigationItem(pathname)?.showTopbar ?? true
}
