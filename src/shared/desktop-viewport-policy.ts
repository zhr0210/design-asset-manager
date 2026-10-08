export type DesktopViewportPolicy = {
  window: {
    defaultWidth: number
    defaultHeight: number
    minOuterWidth: number
    minOuterHeight: number
  }
  shell: {
    minContentWidth: number
    minContentHeight: number
    mainContentMinWidth: number
  }
}

export const DESKTOP_WINDOW_FRAME_ALLOWANCE = {
  width: 16,
  height: 40
} as const

export const DESKTOP_VIEWPORT_POLICY = {
  window: {
    defaultWidth: 1280,
    defaultHeight: 832,
    minOuterWidth: 1120 + DESKTOP_WINDOW_FRAME_ALLOWANCE.width,
    minOuterHeight: 720 + DESKTOP_WINDOW_FRAME_ALLOWANCE.height
  },
  shell: {
    minContentWidth: 1120,
    minContentHeight: 720,
    mainContentMinWidth: 1040
  }
} as const satisfies DesktopViewportPolicy
