import { create } from 'zustand'

interface BrowserState {
  currentUrl: string
  pageTitle: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
  activeSiteId: string

  setCurrentUrl: (url: string) => void
  setPageTitle: (title: string) => void
  setCanGoBack: (can: boolean) => void
  setCanGoForward: (can: boolean) => void
  setIsLoading: (loading: boolean) => void
  setActiveSiteId: (siteId: string) => void

  loadUrl: (url: string, siteId: string) => Promise<void>
  goBack: () => Promise<void>
  goForward: () => Promise<void>
  reload: () => Promise<void>
  stop: () => Promise<void>
}

const api = (window as any).electronAPI

export const useBrowserStore = create<BrowserState>((set) => {
  // Listen for browser state changes from the main process
  if (api && api.onBrowserStateChange) {
    api.onBrowserStateChange((_event: any, state: any) => {
      set({
        currentUrl: state.url || '',
        pageTitle: state.title || '',
        canGoBack: !!state.canGoBack,
        canGoForward: !!state.canGoForward,
        isLoading: !!state.isLoading
      })
    })
  }

  return {
    currentUrl: '',
    pageTitle: '',
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    activeSiteId: '',

    setCurrentUrl: (url) => set({ currentUrl: url }),
    setPageTitle: (pageTitle) => set({ pageTitle }),
    setCanGoBack: (canGoBack) => set({ canGoBack }),
    setCanGoForward: (canGoForward) => set({ canGoForward }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setActiveSiteId: (activeSiteId) => set({ activeSiteId }),

    loadUrl: async (url, siteId) => {
      console.log('[BrowserStore] loadUrl called for:', url, siteId, 'electronAPI exists:', !!api)
      set({ activeSiteId: siteId, isLoading: true })
      if (api) {
        try {
          console.log('[BrowserStore] Calling api.browserLoadUrl...')
          await api.browserLoadUrl(url, siteId)
        } catch (err) {
          console.error('[BrowserStore] Failed to load URL:', err)
          set({ isLoading: false })
        }
      } else {
        // Mock fallback for web environments
        console.log('[BrowserStore] electronAPI is missing, falling back to mock...')
        set({ currentUrl: url, pageTitle: 'Mock Web Page', isLoading: false })
      }
    },

    goBack: async () => {
      if (api) {
        try {
          await api.browserGoBack()
        } catch (err) {
          console.error('[BrowserStore] Failed to go back:', err)
        }
      }
    },

    goForward: async () => {
      if (api) {
        try {
          await api.browserGoForward()
        } catch (err) {
          console.error('[BrowserStore] Failed to go forward:', err)
        }
      }
    },

    reload: async () => {
      if (api) {
        try {
          await api.browserReload()
        } catch (err) {
          console.error('[BrowserStore] Failed to reload:', err)
        }
      }
    },

    stop: async () => {
      if (api) {
        try {
          await api.browserStop()
        } catch (err) {
          console.error('[BrowserStore] Failed to stop:', err)
        }
      }
    }
  }
})
