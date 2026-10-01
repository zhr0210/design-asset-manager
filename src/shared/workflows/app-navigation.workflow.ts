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
  | 'about'
  | 'ai-task-models'
  | 'ai-background'
  | 'ai-diagnostics'

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
    path: '/tasks',
    routeSegment: 'tasks',
    sidebarLabel: '任务中心',
    topbarTitle: '任务中心',
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
    path: '/ai/local-models',
    routeSegment: 'ai/local-models',
    sidebarLabel: '模型库',
    topbarTitle: '模型库',
    shell: 'desktop',
    showTopbar: true
  },
  {
    id: 'ai-console',
    path: '/ai/connections',
    routeSegment: 'ai/connections',
    sidebarLabel: 'AI 与模型',
    topbarTitle: 'AI 与模型',
    shell: 'desktop',
    showTopbar: true
  },
  {id:'ai-task-models',path:'/ai/task-models',routeSegment:'ai/task-models',sidebarLabel:'任务用哪个模型',topbarTitle:'AI 与模型',shell:'desktop',showTopbar:true},
  {id:'ai-background',path:'/ai/background',routeSegment:'ai/background',sidebarLabel:'后台分析与资源',topbarTitle:'AI 与模型',shell:'desktop',showTopbar:true},
  {id:'ai-diagnostics',path:'/ai/diagnostics',routeSegment:'ai/diagnostics',sidebarLabel:'高级诊断',topbarTitle:'AI 与模型',shell:'desktop',showTopbar:true},
  {id:'about',path:'/about',routeSegment:'about',sidebarLabel:'帮助与关于',topbarTitle:'帮助与关于',shell:'desktop',showTopbar:true},
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
  'settings',
  'about'
] as const
export const APP_MENU_ROUTE_IDS: readonly AppRouteId[] = [
  'dashboard',
  'downloads',
  'connected-libraries',
  'legacy-library',
  'tag-manager',
  'model-library',
  'ai-console',
  'settings',
  'about'
] as const

export function getAppMenuNavigationItems(): AppNavigationItem[] {
  return APP_MENU_ROUTE_IDS
    .map((id) => APP_NAVIGATION_ITEMS.find((item) => item.id === id))
    .filter((item): item is AppNavigationItem => Boolean(item))
}

export function getAppNavigationItem(pathname: string): AppNavigationItem | undefined {
  return APP_NAVIGATION_ITEMS.find((item) => item.path === resolveAppPath(pathname))
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

/** Display/navigation metadata only; Main remains the authority. */
export const APP_ROUTE_ALIASES: Readonly<Record<string,string>> = {'/ai-console':'/ai/connections','/model-library':'/ai/local-models','/downloads':'/tasks'}
export function resolveAppPath(pathname:string,search=''):string {return pathname==='/settings'&&new URLSearchParams(search).get('section')==='ai'?'/ai/connections':APP_ROUTE_ALIASES[pathname]??pathname}
export function appPath(id:AppRouteId):string {return APP_NAVIGATION_ITEMS.find(item=>item.id===id)!.path}
export const AI_SECTION_ROUTES:readonly AppRouteId[]=['ai-console','ai-task-models','model-library','ai-background','ai-diagnostics']
export function appScope(id:AppRouteId):'app'|'library'{return ['library','tag-manager'].includes(id)?'library':'app'}
