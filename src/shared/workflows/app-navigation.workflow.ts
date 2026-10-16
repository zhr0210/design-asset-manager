export type AppRouteId =
  | 'dashboard'
  | 'library'
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
}

export const APP_DEFAULT_ROUTE_ID: AppRouteId = 'library'
export const APP_FALLBACK_TITLE = '设计素材管理器'

export const APP_NAVIGATION_ITEMS: readonly AppNavigationItem[] = [
  {
    id: 'dashboard',
    path: '/settings/overview',
    routeSegment: 'settings/overview',
    sidebarLabel: '仪表盘',
    topbarTitle: '仪表盘',
    shell: 'desktop',
    showTopbar: false
  },
  {
    id: 'library',
    path: '/library',
    routeSegment: 'library',
    sidebarLabel: '素材工作区',
    topbarTitle: '素材工作区',
    shell: 'desktop',
    showTopbar: false
  },
  {
    id: 'legacy-library',
    path: '/settings/legacy',
    routeSegment: 'settings/legacy',
    sidebarLabel: '找回旧素材',
    topbarTitle: '旧 DAM 库（只读）',
    shell: 'desktop',
    showTopbar: false
  },
  {
    id: 'tag-manager',
    path: '/settings/tags',
    routeSegment: 'settings/tags',
    sidebarLabel: '标签管理',
    topbarTitle: '标签管理中心',
    shell: 'desktop',
    showTopbar: false
  },
  {
    id: 'model-library',
    path: '/settings/ai/local-models',
    routeSegment: 'settings/ai/local-models',
    sidebarLabel: '模型库',
    topbarTitle: '模型库',
    shell: 'desktop',
    showTopbar: false
  },
  {
    id: 'ai-console',
    path: '/settings/ai/connections',
    routeSegment: 'settings/ai/connections',
    sidebarLabel: 'AI 与模型',
    topbarTitle: 'AI 与模型',
    shell: 'desktop',
    showTopbar: false
  },
  {id:'ai-task-models',path:'/settings/ai/task-models',routeSegment:'settings/ai/task-models',sidebarLabel:'任务用哪个模型',topbarTitle:'AI 与模型',shell:'desktop',showTopbar:false},
  {id:'ai-background',path:'/settings/ai/background',routeSegment:'settings/ai/background',sidebarLabel:'后台分析与资源',topbarTitle:'AI 与模型',shell:'desktop',showTopbar:false},
  {id:'ai-diagnostics',path:'/settings/ai/diagnostics',routeSegment:'settings/ai/diagnostics',sidebarLabel:'高级诊断',topbarTitle:'AI 与模型',shell:'desktop',showTopbar:false},
  {id:'about',path:'/settings/about',routeSegment:'settings/about',sidebarLabel:'帮助与关于',topbarTitle:'帮助与关于',shell:'desktop',showTopbar:false},
  {
    id: 'settings',
    path: '/settings',
    routeSegment: 'settings',
    sidebarLabel: '设置',
    topbarTitle: '系统偏好设置',
    shell: 'desktop',
    showTopbar: false
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
  'library',
  'legacy-library',
  'tag-manager',
  'model-library',
  'ai-console',
  'settings',
  'about'
] as const
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
export const APP_ROUTE_ALIASES: Readonly<Record<string,string>> = {"/dashboard":"/settings/overview","/legacy-library":"/settings/legacy","/tag-manager":"/settings/tags","/ai/local-models":"/settings/ai/local-models","/ai/connections":"/settings/ai/connections","/ai/task-models":"/settings/ai/task-models","/ai/background":"/settings/ai/background","/ai/diagnostics":"/settings/ai/diagnostics","/about":"/settings/about","/ai-console":"/settings/ai/connections","/model-library":"/settings/ai/local-models"}
export function resolveAppPath(pathname:string,search=''):string {return pathname==='/settings'&&new URLSearchParams(search).get('section')==='ai'?'/settings/ai/connections':APP_ROUTE_ALIASES[pathname]??pathname}
export function appPath(id:AppRouteId):string {return APP_NAVIGATION_ITEMS.find(item=>item.id===id)!.path}
export const AI_SECTION_ROUTES:readonly AppRouteId[]=['ai-console','ai-task-models','model-library','ai-background','ai-diagnostics']
export function appScope(id:AppRouteId):'app'|'library'{return ['library','tag-manager'].includes(id)?'library':'app'}
