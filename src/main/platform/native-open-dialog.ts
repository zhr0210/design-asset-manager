import type { OpenDialogOptions, OpenDialogReturnValue } from 'electron'

interface DialogOwner {
  isDestroyed(): boolean
  isMinimized(): boolean
  restore(): void
  show(): void
  focus(): void
}

type OpenDialog = (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>

/** Keep native pickers attached to the trusted app window, including after tray activation. */
export function createNativeOpenDialog<Owner extends DialogOwner>(dependencies: {
  getOwner(): Owner | null
  present(owner: Owner, options: OpenDialogOptions): Promise<OpenDialogReturnValue>
}): OpenDialog {
  let pending: Promise<unknown> = Promise.resolve()
  return (options) => {
    const result = pending.then(async () => {
      const owner = dependencies.getOwner()
      if (!owner || owner.isDestroyed()) throw new Error('NATIVE_DIALOG_WINDOW_UNAVAILABLE')
      if (owner.isMinimized()) owner.restore()
      owner.show()
      owner.focus()
      return dependencies.present(owner, options)
    })
    pending = result.catch(() => undefined)
    return result
  }
}

let present: OpenDialog | undefined
let productSelection: OpenDialog | undefined

/** The shared page selector returns paths only inside Main's adapter. */
export function configureProductOpenDialog(selection: OpenDialog): void {
  productSelection = selection
}

export function configureNativeOpenDialog<Owner extends DialogOwner>(dependencies: {
  getOwner(): Owner | null
  present(owner: Owner, options: OpenDialogOptions): Promise<OpenDialogReturnValue>
}): void {
  present = createNativeOpenDialog(dependencies)
}

export function showNativeOpenDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
  if (productSelection) return productSelection(options)
  if (!present) return Promise.reject(new Error('NATIVE_DIALOG_NOT_CONFIGURED'))
  return present(options)
}
