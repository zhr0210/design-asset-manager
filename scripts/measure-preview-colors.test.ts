import assert from 'node:assert/strict'
import sharp from 'sharp'
import {measurePreviewColors,measurePreviewHistogram} from '../src/main/library-lifecycle/measure-preview-colors'
import {matchPreviewColor} from '../src/main/asset-search/color-match'
const pixels=Buffer.from([255,0,0,255,255,0,0,255,0,0,255,255,0,255,0,0])
const png=await sharp(pixels,{raw:{width:4,height:1,channels:4}}).png().toBuffer()
const first=await measurePreviewColors(png);assert.deepEqual(first,await measurePreviewColors(png));assert.equal(first.colors.reduce((n,c)=>n+c.percentage,0),100);assert.equal(first.colors.length,2);assert.equal(first.colors[0].hex,'#FF0000');assert.equal(first.colors[0].percentage,66.67);assert.equal(first.colors[1].percentage,33.33)
const empty=await sharp({create:{width:2,height:2,channels:4,background:'#00000000'}}).png().toBuffer();assert.deepEqual((await measurePreviewColors(empty)).colors,[])
await assert.rejects(measurePreviewColors(Buffer.from('not an image')))
console.log('Preview colors: deterministic ratios, alpha exclusion, total 100%, empty alpha and decode failure passed')
const histogram=await measurePreviewHistogram(png)
assert.equal(histogram.visibleWeight,3)
assert.ok(matchPreviewColor(histogram,{hex:'#FF0000',minimumPercentage:66,tolerance:15}))
assert.equal(matchPreviewColor(histogram,{hex:'#FF0000',minimumPercentage:67,tolerance:15}),null)
assert.equal(matchPreviewColor(histogram,{hex:'#00FF00',minimumPercentage:1,tolerance:45}),null)
assert.equal(matchPreviewColor(await measurePreviewHistogram(empty),{hex:'#000000',minimumPercentage:1,tolerance:45}),null)
const half=await sharp(Buffer.from([255,0,0,255,0,0,255,128]),{raw:{width:2,height:1,channels:4}}).png().toBuffer()
const measuredHalf=await measurePreviewHistogram(half)
assert.ok(matchPreviewColor(measuredHalf,{hex:'#FF0000',minimumPercentage:66,tolerance:15})?.label.includes('66.58%'))
assert.equal(matchPreviewColor(measuredHalf,{hex:'#FF0000',minimumPercentage:67,tolerance:15}),null)
