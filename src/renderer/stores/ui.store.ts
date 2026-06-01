import { create } from 'zustand'

export type AppTheme = 'light' | 'dark'
export type AppLanguage = 'zh' | 'en'

interface UIState {
  theme: AppTheme
  language: AppLanguage
  toggleTheme: () => void
  setLanguage: (lang: AppLanguage) => void
  t: (key: string) => string
}

// Global dictionary for core interface translation
const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  zh: {
    // Sidebar
    'menu.dashboard': '仪表盘',
    'menu.sites': '网站账号',
    'menu.browser': '素材浏览器',
    'menu.search': '传统搜索',
    'menu.downloads': '下载队列',
    'menu.library': '本地素材库',
    'menu.tags': '标签管理',
    'menu.aiConsole': 'AI 控制台',
    'menu.settings': '设置',
    // Tooltips
    'tooltip.theme.light': '切换至白天模式',
    'tooltip.theme.dark': '切换至黑夜模式',
    'tooltip.lang.en': 'Switch to English',
    'tooltip.lang.zh': '切换至中文',
  },
  en: {
    // Sidebar
    'menu.dashboard': 'Dashboard',
    'menu.sites': 'Accounts',
    'menu.browser': 'Browser',
    'menu.search': 'Search',
    'menu.downloads': 'Downloads',
    'menu.library': 'Library',
    'menu.tags': 'Tags',
    'menu.aiConsole': 'AI Console',
    'menu.settings': 'Settings',
    // Tooltips
    'tooltip.theme.light': 'Switch to Day Mode',
    'tooltip.theme.dark': 'Switch to Night Mode',
    'tooltip.lang.en': 'Switch to English',
    'tooltip.lang.zh': '切换至中文',
  }
}

// Initial side-effects for class list on startup
const getInitialTheme = (): AppTheme => {
  const saved = localStorage.getItem('app-theme') as AppTheme
  if (saved === 'dark' || saved === 'light') {
    return saved
  }
  return 'light'
}

const applyTheme = (theme: AppTheme) => {
  const root = window.document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

const getInitialLanguage = (): AppLanguage => {
  const saved = localStorage.getItem('app-lang') as AppLanguage
  if (saved === 'en' || saved === 'zh') {
    return saved
  }
  return 'zh'
}

// Perform initial styling side-effect immediately
applyTheme(getInitialTheme())

export const useUIStore = create<UIState>((set, get) => ({
  theme: getInitialTheme(),
  language: getInitialLanguage(),

  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('app-theme', nextTheme)
    applyTheme(nextTheme)
    set({ theme: nextTheme })
  },

  setLanguage: (lang) => {
    localStorage.setItem('app-lang', lang)
    set({ language: lang })
  },

  t: (key) => {
    const lang = get().language
    return TRANSLATIONS[lang][key] || key
  }
}))
