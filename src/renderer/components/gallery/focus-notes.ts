export type {NotePoint as Point,NoteElement,NotePage} from '../../../shared/contracts/asset-notebook.contract'
import type {AssetNotebook} from '../../../shared/contracts/asset-notebook.contract'
export type Notebook=Record<string,AssetNotebook>
export function uid(){return globalThis.crypto.randomUUID()}
