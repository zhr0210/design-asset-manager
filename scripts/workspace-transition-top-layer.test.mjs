// Real production ReviewSheet in Chromium, with a retained modal editor below it.
// Internal component regression: does not grant Host/product acceptance.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'esbuild'
import {chromium} from 'playwright'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-transition-top-layer-'))
await build({bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),
  stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
    import React,{useRef,useEffect,useState} from 'react';
    import {createRoot} from 'react-dom/client';
    import {ReviewSheet,Button} from './src/renderer/components/ui/WorkspacePrimitives';
    function App(){
      const editor=useRef(null),[review,setReview]=useState(false),[confirmed,setConfirmed]=useState(false);
      useEffect(()=>{editor.current.showModal()},[]);
      return <>
        <dialog ref={editor} aria-label="Existing work editor" style={{width:600,height:400}}>
          <textarea aria-label="Retained note" defaultValue="Unsaved reference note"/>
          <button onClick={()=>setReview(true)}>Request exit review</button>
        </dialog>
        {review&&<ReviewSheet label="Exit review" transitionSurface onCancel={()=>setReview(false)}>
          <Button onClick={()=>setReview(false)}>Keep editing</Button>
          <Button onClick={()=>{setConfirmed(true);setReview(false)}}>Confirm exit</Button>
        </ReviewSheet>}
        <output aria-label="Confirmed">{String(confirmed)}</output>
      </>
    }
    createRoot(document.getElementById('root')).render(<App/>);
  `},logLevel:'silent'})
await fs.writeFile(path.join(root,'index.html'),`<!doctype html><meta charset="utf-8">
<style>.ui-sheet-backdrop{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0008;z-index:999999}.ui-sheet{background:white;padding:40px}dialog::backdrop{background:#0004}</style>
<div id="root"></div><script src="fixture.js"></script>`)
const browser=await chromium.launch({headless:true})
try {
  const page=await browser.newPage({viewport:{width:900,height:650}})
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto(pathToFileURL(path.join(root,'index.html')).href)
  const note=page.getByRole('textbox',{name:'Retained note'})
  await note.fill('User edit must survive review cancellation')
  await page.getByRole('button',{name:'Request exit review'}).click()
  await page.getByRole('button',{name:'Keep editing'}).click()
  assert.equal(await note.inputValue(),'User edit must survive review cancellation')
  assert.equal(await page.locator('dialog[aria-label="Existing work editor"]').evaluate(el=>el.open),true)
  await page.getByRole('button',{name:'Request exit review'}).click()
  await page.keyboard.press('Escape')
  assert.equal(await note.inputValue(),'User edit must survive review cancellation')
  assert.equal(await page.locator('dialog[aria-label="Existing work editor"]').evaluate(el=>el.open),true)
  await page.getByRole('button',{name:'Request exit review'}).click()
  await page.getByRole('button',{name:'Confirm exit'}).click()
  assert.equal(await page.locator('output').textContent(),'true')
  assert.deepEqual(errors,[])
  console.log('Production transition ReviewSheet overtakes an existing modal editor; click/confirm and Escape cancellation preserve retained editor/input. Chromium regression only.')
} finally { await browser.close();await fs.rm(root,{recursive:true,force:true}) }
