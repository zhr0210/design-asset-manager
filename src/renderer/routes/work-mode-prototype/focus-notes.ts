// Synthetic-prototype annotations only. No image bytes or production library writes.
import type{Notebook}from'../../components/gallery/focus-notes'
export type{Point,NoteElement,NotePage,Notebook}from'../../components/gallery/focus-notes'
export const NOTE_KEY='dam-focus-notes-prototype-v1'
let session:Notebook|undefined;let dirty=false
export function loadNotebook():Notebook{if(session)return session;try{const raw=JSON.parse(localStorage.getItem(NOTE_KEY)||'null');if(raw?.version===1&&raw.books&&typeof raw.books==='object'&&!Array.isArray(raw.books)){const safe:Notebook={};for(const [id,book]of Object.entries(raw.books)){const b=book as Notebook[string];if(!Array.isArray(b?.pages))continue;safe[id]={active:typeof b.active==='string'?b.active:null,pages:b.pages.filter(p=>typeof p.id==='string'&&typeof p.name==='string'&&Array.isArray(p.elements)).map(p=>({...p,elements:p.elements.filter(e=>['pen','rect','ellipse','text','sticky'].includes(e.kind)&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&typeof e.color==='string')}))}}session=safe;return safe}}catch{}session={};return session}
export function holdNotebook(next:Notebook){session=next;dirty=true}
export function notebookDirty(){return dirty}
export function saveNotebook(next:Notebook){localStorage.setItem(NOTE_KEY,JSON.stringify({version:1,books:next}));session=next;dirty=false}
export function uid(){return globalThis.crypto.randomUUID()}
