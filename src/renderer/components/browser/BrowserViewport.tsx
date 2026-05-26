import React, { useEffect, useRef } from 'react'

const api = (window as any).electronAPI

export default function BrowserViewport() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!api) return

    const updateBounds = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      
      // Send layout coordinates directly in DIPs (CSS pixels) to main process
      api.browserResize({
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }).catch(console.error)
    }

    // Show native browser view
    api.browserShow().then(() => {
      // Small tick to ensure React layout styles have settled
      setTimeout(updateBounds, 100)
    }).catch(console.error)

    // Sync on window resizes
    window.addEventListener('resize', updateBounds)

    // Sync on container resizing (e.g. sidebar collapse, panel resizing)
    const resizeObserver = new ResizeObserver(() => {
      updateBounds()
    })
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', updateBounds)
      resizeObserver.disconnect()
      if (api) {
        api.browserHide().catch(console.error)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-slate-50 border border-slate-200/60 rounded-2xl overflow-hidden shadow-inner relative flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-slate-100/50 flex items-center justify-center">
        <div className="text-center space-y-2 pointer-events-none select-none">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-[12px] font-semibold tracking-wide">
            正在载入内嵌浏览器视图...
          </p>
        </div>
      </div>
    </div>
  )
}
