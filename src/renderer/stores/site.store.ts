import { create } from 'zustand'

export interface Site {
  id: string
  name: string
  baseUrl: string
  searchUrlTemplate: string
  requiresAuth: boolean
  authStatePath?: string
  authStatus: 'unlogged' | 'logged' | 'expired' | 'reauth' | 'logging_in'
  notes?: string
}

interface SiteState {
  sites: Site[]
  loading: boolean
  loadSites: () => Promise<void>
  addSite: (site: Omit<Site, 'id' | 'authStatus'>) => Promise<void>
  deleteSite: (id: string) => Promise<void>
  updateSiteStatus: (id: string, status: Site['authStatus']) => void
  startLogin: (id: string) => Promise<void>
  completeLogin: (id: string) => Promise<void>
}

const api = (window as any).electronAPI

function mapDbSiteToSite(dbSite: any): Site {
  return {
    id: dbSite.id,
    name: dbSite.name,
    baseUrl: dbSite.base_url,
    searchUrlTemplate: dbSite.search_url_template,
    requiresAuth: dbSite.requires_auth === 1,
    authStatePath: dbSite.auth_state_path,
    authStatus: dbSite.auth_status,
    notes: dbSite.notes
  }
}

export const useSiteStore = create<SiteState>((set, get) => ({
  sites: [],
  loading: false,

  loadSites: async () => {
    set({ loading: true })
    if (api) {
      try {
        const dbSites = await api.listSites()
        set({ sites: dbSites.map(mapDbSiteToSite) })
      } catch (err) {
        console.error('[Store] Failed to load sites from DB:', err)
      }
    }
    set({ loading: false })
  },

  addSite: async (siteData) => {
    set({ loading: true })
    const newSite = {
      id: Math.random().toString(36).substr(2, 9),
      name: siteData.name,
      base_url: siteData.baseUrl,
      search_url_template: siteData.searchUrlTemplate,
      requires_auth: siteData.requiresAuth ? 1 : 0,
      auth_status: siteData.requiresAuth ? 'unlogged' : 'logged',
      notes: siteData.notes
    }

    if (api) {
      try {
        const res = await api.saveSite(newSite)
        if (res.success) {
          await get().loadSites()
        }
      } catch (err) {
        console.error('[Store] Failed to save site via IPC:', err)
      }
    }
    set({ loading: false })
  },

  deleteSite: async (id) => {
    if (api) {
      try {
        const res = await api.deleteSite(id)
        if (res.success) {
          await get().loadSites()
        }
      } catch (err) {
        console.error('[Store] Failed to delete site via IPC:', err)
      }
    }
  },

  updateSiteStatus: (id, status) => {
    set((state) => ({
      sites: state.sites.map((s) => (s.id === id ? { ...s, authStatus: status } : s))
    }))
  },

  startLogin: async (id) => {
    const site = get().sites.find((s) => s.id === id)
    if (!site) return

    // Set card status to 'logging_in' immediately to trigger the "I have completed login" UI
    get().updateSiteStatus(id, 'logging_in')

    if (api) {
      try {
        await api.startLoginSite(id)
      } catch (err) {
        console.error('[Store] startLoginSite IPC error:', err)
        get().updateSiteStatus(id, 'unlogged')
      }
    }
  },

  completeLogin: async (id) => {
    const site = get().sites.find((s) => s.id === id)
    if (!site) return

    set({ loading: true })
    if (api) {
      try {
        const res = await api.completeLoginSite(id)
        if (res.success) {
          await get().loadSites()
        } else {
          console.error('[Store] completeLoginSite failed:', res.error)
          get().updateSiteStatus(id, 'unlogged')
        }
      } catch (err) {
        console.error('[Store] completeLoginSite IPC error:', err)
        get().updateSiteStatus(id, 'unlogged')
      }
    }
    set({ loading: false })
  }
}))

// Auto load
useSiteStore.getState().loadSites()
