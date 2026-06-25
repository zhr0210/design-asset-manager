export type AppRouteId =
  | 'dashboard'
  | 'sites'
  | 'browser'
  | 'search'
  | 'downloads'
  | 'library'
  | 'tag-manager'
  | 'ai-console'
  | 'settings'

export type AppShellKind = 'desktop' | 'browser'

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

export const APP_DEFAULT_ROUTE_ID: AppRouteId = 'dashboard'
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
    id: 'sites',
    path: '/sites',
    routeSegment: 'sites',
    sidebarLabel: '网站账号',
    topbarTitle: '网站账号管理',
    shell: 'desktop',
    showTopbar: true
  },
  {
    id: 'browser',
    path: '/browser',
    routeSegment: 'browser',
    sidebarLabel: '素材浏览器',
    topbarTitle: '素材浏览器',
    shell: 'browser',
    showTopbar: false
  },
  {
    id: 'search',
    path: '/search',
    routeSegment: 'search',
    sidebarLabel: '传统搜索',
    topbarTitle: '全网素材检索',
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
    sidebarLabel: '本地素材库',
    topbarTitle: '本地素材库',
    shell: 'desktop',
    showTopbar: false
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

export function getAppNavigationItem(pathname: string): AppNavigationItem | undefined {
  return APP_NAVIGATION_ITEMS.find((item) => item.path === pathname)
}

export function getAppTopbarTitle(pathname: string): string {
  return getAppNavigationItem(pathname)?.topbarTitle ?? APP_FALLBACK_TITLE
}

export function isAppBrowserShellRoute(pathname: string): boolean {
  return getAppNavigationItem(pathname)?.shell === 'browser'
}

export function shouldShowAppTopbar(pathname: string): boolean {
  return getAppNavigationItem(pathname)?.showTopbar ?? true
}
