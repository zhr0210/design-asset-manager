import { create } from 'zustand'
import { useAssetStore } from './asset.store'

export interface DownloadTask {
  id: string
  assetTitle: string
  sourceSiteId: string
  sourceSiteName: string
  sourcePageUrl: string
  downloadUrl: string
  savePath: string
  status: 'waiting' | 'downloading' | 'completed' | 'failed'
  progress: number
  errorMessage?: string
  retryCount: number
  fileSize?: number
  thumbnailUrl: string
  browserPageTitle?: string
  captureMethod?: string
}

interface DownloadState {
  tasks: DownloadTask[]
  activeDownloadsCount: number
  loadDownloads: () => Promise<void>
  enqueueDownload: (item: {
    title: string
    sourceSite: string
    sourcePageUrl: string
    downloadUrl: string
    thumbnailUrl: string
    captureMethod?: string
    browserPageTitle?: string
  }) => Promise<void>
  retryTask: (id: string) => Promise<void>
  clearCompleted: () => Promise<void>
}

const api = (window as any).electronAPI

// Mapper to map database snake_case structures to camelCase
function mapDbTaskToTask(dbTask: any): DownloadTask {
  return {
    id: dbTask.id,
    assetTitle: dbTask.asset_title,
    sourceSiteId: dbTask.source_site_id,
    sourceSiteName: dbTask.source_site_name || (dbTask.source_site_id === 'tapnow' ? 'TapNow' : dbTask.source_site_id.charAt(0).toUpperCase() + dbTask.source_site_id.slice(1)),
    sourcePageUrl: dbTask.source_page_url || '',
    downloadUrl: dbTask.download_url,
    savePath: dbTask.save_path,
    status: dbTask.status,
    progress: dbTask.progress,
    errorMessage: dbTask.error_message,
    retryCount: dbTask.retry_count,
    fileSize: 1024 * 1024 * 1.5, // Default mock size 1.5MB
    thumbnailUrl: dbTask.download_url, // Pre-populate with standard image url
    browserPageTitle: dbTask.browser_page_title || '',
    captureMethod: dbTask.capture_method || 'search'
  }
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  tasks: [],
  activeDownloadsCount: 0,

  loadDownloads: async () => {
    if (api) {
      try {
        const dbTasks = await api.listDownloads()
        set({
          tasks: dbTasks.map(mapDbTaskToTask),
          activeDownloadsCount: dbTasks.filter((t: any) => t.status === 'downloading').length
        })
      } catch (err) {
        console.error('[Store] Failed to load download tasks from DB:', err)
      }
    }
  },

  enqueueDownload: async (item) => {
    const taskId = `dl-${Math.random().toString(36).substr(2, 9)}`
    const newTask: DownloadTask = {
      id: taskId,
      assetTitle: item.title,
      sourceSiteId: item.sourceSite.toLowerCase(),
      sourceSiteName: item.sourceSite,
      sourcePageUrl: item.sourcePageUrl,
      downloadUrl: item.downloadUrl,
      savePath: `~/DesignAssetManager/library/${item.title.toLowerCase().replace(/\s+/g, '-')}.jpg`,
      status: 'waiting',
      progress: 0,
      retryCount: 0,
      fileSize: Math.floor(Math.random() * 5 * 1024 * 1024) + 500 * 1024,
      thumbnailUrl: item.thumbnailUrl,
      browserPageTitle: item.browserPageTitle,
      captureMethod: item.captureMethod || 'search'
    }

    set((state) => ({
      tasks: [newTask, ...state.tasks]
    }))

    if (api) {
      try {
        const dbTask = {
          id: newTask.id,
          asset_title: newTask.assetTitle,
          source_site_id: newTask.sourceSiteId,
          source_site_name: newTask.sourceSiteName,
          source_page_url: newTask.sourcePageUrl,
          download_url: newTask.downloadUrl,
          save_path: newTask.savePath,
          status: newTask.status,
          progress: newTask.progress,
          retry_count: newTask.retryCount,
          browser_page_title: newTask.browserPageTitle || null,
          capture_method: newTask.captureMethod || 'search'
        }
        await api.saveDownload(dbTask)
      } catch (err) {
        console.error('[Store] Failed to save download queue task:', err)
      }
    }

    await get().retryTask(taskId)
  },

  retryTask: async (id) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: 'downloading', progress: 0, errorMessage: undefined } : t
      )
    }))

    if (api) {
      try {
        const task = get().tasks.find((t) => t.id === id)
        if (task) {
          await api.saveDownload({
            id: task.id,
            asset_title: task.assetTitle,
            source_site_id: task.sourceSiteId,
            source_site_name: task.sourceSiteName,
            source_page_url: task.sourcePageUrl,
            download_url: task.downloadUrl,
            save_path: task.savePath,
            status: 'downloading',
            progress: 0,
            retry_count: task.retryCount,
            browser_page_title: task.browserPageTitle || null,
            capture_method: task.captureMethod || 'search'
          })
        }
      } catch (err) {
        console.error(err)
      }
    }

    // Simulate progress ticks
    const interval = setInterval(async () => {
      let isDone = false

      set((state) => {
        const tasks = state.tasks.map((t) => {
          if (t.id === id) {
            const nextProgress = Math.min(t.progress + Math.floor(Math.random() * 15) + 5, 100)
            const nextStatus: DownloadTask['status'] = nextProgress === 100 ? 'completed' : 'downloading'
            
            if (nextProgress === 100) {
              isDone = true
              // Trigger save into local assets DB
              setTimeout(async () => {
                await useAssetStore.getState().addAsset({
                  title: t.assetTitle,
                  fileName: `${t.assetTitle.toLowerCase().replace(/\s+/g, '-')}.jpg`,
                  filePath: t.savePath,
                  thumbnailPath: t.thumbnailUrl,
                  sourceSiteId: t.sourceSiteId,
                  sourceSiteName: t.sourceSiteName,
                  sourcePageUrl: t.sourcePageUrl,
                  originalUrl: t.downloadUrl,
                  width: 1920,
                  height: 1080,
                  fileSize: t.fileSize || 1024 * 1024,
                  fileType: 'JPG',
                  tags: ['Scraped', t.sourceSiteName],
                  browserPageTitle: t.browserPageTitle,
                  captureMethod: t.captureMethod
                })
              }, 50)
            }

            // Sync to SQLite in background
            if (api) {
              api.saveDownload({
                id: t.id,
                asset_title: t.assetTitle,
                source_site_id: t.sourceSiteId,
                source_site_name: t.sourceSiteName,
                source_page_url: t.sourcePageUrl,
                download_url: t.downloadUrl,
                save_path: t.savePath,
                status: nextStatus,
                progress: nextProgress,
                retry_count: t.retryCount,
                browser_page_title: t.browserPageTitle || null,
                capture_method: t.captureMethod || 'search'
              }).catch(console.error)
            }

            return {
              ...t,
              progress: nextProgress,
              status: nextStatus
            }
          }
          return t
        })

        const activeCount = tasks.filter((t) => t.status === 'downloading').length
        return { tasks, activeDownloadsCount: activeCount }
      })

      if (isDone) {
        clearInterval(interval)
      }
    }, 300)
  },

  clearCompleted: async () => {
    if (api) {
      try {
        await api.clearDownloads()
        await get().loadDownloads()
      } catch (err) {
        console.error(err)
      }
    } else {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.status !== 'completed')
      }))
    }
  }
}))

// Auto load downloads on execution
useDownloadStore.getState().loadDownloads()
