import { useState, useEffect, useCallback } from 'react'
import { useAssetStore } from '../stores/asset.store'

export function usePromptReverse(selectedAssetId?: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const run = useCallback(async (assetId: string, modelId: string, localPath?: string, options?: { promptTemplateId?: string; promptTemplateText?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const { runPromptReverse } = useAssetStore.getState()
      const res = await runPromptReverse(assetId, modelId, localPath || '', options)
      if (!res.success && res.error) {
        setError(res.error)
        return res
      }
      return res
    } catch (err: any) {
      const wrappedError = { code: 'EXCEPTION', message: String(err) }
      setError(wrappedError)
      return { success: false, error: wrappedError }
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto clear error when selectedAsset changes
  useEffect(() => {
    setError(null)
  }, [selectedAssetId])

  return {
    run,
    loading,
    error,
    clearError
  }
}
