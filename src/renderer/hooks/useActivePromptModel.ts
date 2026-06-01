import { useState, useEffect, useCallback } from 'react'
import type { AppSettings } from '../../shared/types/settings.types'

export function useActivePromptModel(settings: AppSettings) {
  const [activeModel, setActiveModel] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const refreshActiveModel = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const api = (window as any).electronAPI
      if (api && api.aiModelList) {
        const list = await api.aiModelList()
        const activeId = settings.selectedPromptModelId || 'qwen3-vl-8b-instruct'
        const matched = list.find((m: any) => m.id === activeId)
        setActiveModel(matched || null)
      }
    } catch (e: any) {
      console.error(e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [settings.selectedPromptModelId])

  useEffect(() => {
    refreshActiveModel()
  }, [refreshActiveModel])

  return {
    activeModel,
    refreshActiveModel,
    loading,
    error
  }
}
