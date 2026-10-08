import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {StaticRouter} from 'react-router-dom/server.js'
Object.defineProperty(globalThis,'localStorage',{value:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},configurable:true})
Object.defineProperty(globalThis,'window',{value:{document:{documentElement:{classList:{add:()=>{},remove:()=>{}}}}},configurable:true})
const {LibraryCanvas}=await import('../src/renderer/components/library/canvas/LibraryCanvas')
import {controlledPreview} from '../src/renderer/components/library/canvas/LibraryMedia'
import type{Asset}from'../src/renderer/stores/asset.store'
const noop=()=>{};const base:any={scope:'test',authority:{state:'ready',identity:'lib',generation:'gen'},assets:[],matches:[],tags:[],selected:null,pick:noop,openFocus:noop,query:'',setQuery:noop,tagQueries:[],addTag:noop,removeTag:noop,clearFilters:noop,bulkIds:[],toggleBulk:noop,clearBulk:noop,bulkAction:noop,status:'ready',error:null,loaded:true,retry:async()=>{},controls:null,details:null,work:null,workMode:false,showWork:noop,showAll:noop,register:noop}
const render=(patch:any)=>renderToStaticMarkup(<StaticRouter location="/library"><LibraryCanvas {...base} {...patch}/></StaticRouter>)
assert.match(render({loaded:false,status:'loading'}),/正在读取素材列表/)
assert.doesNotMatch(render({loaded:false,status:'loading'}),/素材库还没有内容/)
assert.match(render({loaded:false,status:'error',error:'无法读取'}),/素材库加载失败/)
assert.match(render({}),/素材库还没有内容/)
assert.match(render({tagQueries:['tag:missing']}),/没有找到匹配素材/)
assert.doesNotMatch(render({tagQueries:['tag:missing']}),/素材库还没有内容/)
assert.doesNotMatch(render({status:'loading'}),/素材库还没有内容/)
assert.match(render({status:'error'}),/暂时无法确认素材列表/)
const asset={id:'asset',title:'fixture',tags:[],fileType:'png',sourceSiteName:'Local File',fileUrl:'dam-preview://preview/library/generation/asset'} as Asset
const retained=render({assets:[asset],matches:[{asset,explanation:null}],status:'error'})
assert.match(retained,/刷新失败，保留已载入素材/);assert.match(retained,/data-asset-id="asset"/)
assert.equal(controlledPreview(asset),asset.fileUrl)
for(const src of ['file:///private/source.png','https://example.invalid/image.png','data:image/png;base64,AAAA','local-file:///source.png'])assert.equal(controlledPreview({...asset,fileUrl:src}),'')
assert.doesNotMatch(render({authority:{state:'closed',identity:null,generation:null},assets:[asset],matches:[{asset,explanation:null}]}),/data-asset-id="asset"/)
console.log('Library Canvas: loading/empty/no-match/error/retained/closed states and preview source restrictions passed')
