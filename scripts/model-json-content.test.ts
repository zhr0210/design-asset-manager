import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseCaption } from '../src/main/visual-ai/caption-recipe'
import { parseIndependentTags } from '../src/main/independent-tags/tag-recipe'
const response = (content:string,finish_reason='stop') => ({choices:[{message:{content},finish_reason}]})

test('Qwen 2B complete fenced JSON response preserves the validated caption and tag contracts', () => {
  const caption = '一杯深棕色的浓缩咖啡，盛在红白相间的陶瓷杯中，置于同色系的碟子上，旁边放着一把银色小勺，整个画面置于温暖的木质桌面上。'
  assert.equal(parseCaption(response('```json\n{\n  "caption": '+JSON.stringify(caption)+'\n}\n```')),caption)
  assert.deepEqual(parseIndependentTags(response('```json\n{"tags":["咖啡杯","木质桌面"]}\n```')),['咖啡杯','木质桌面'])
})
test('fences cannot bypass truncation, extra prose, unknown fields or limits', () => {
  for (const content of ['说明\n```json\n{"caption":"咖啡"}\n```','```json\n{"caption":"咖啡"}\n```\n另一段',
    '```json\n{"caption":"咖啡","prompt":"未知"}\n```','```json\n{"caption":"咖啡"}',
    '```json\n{"caption":"'+ '杯'.repeat(241)+'"}\n```']) assert.throws(()=>parseCaption(response(content)),/CAPTION_OUTPUT_INVALID/)
  assert.throws(()=>parseCaption(response('```json\n{"caption":"咖啡"}\n```','length')),/CAPTION_OUTPUT_TRUNCATED/)
  assert.throws(()=>parseIndependentTags(response('```json\n{"tags":["咖啡"],"caption":"额外"}\n```')),/TAG_OUTPUT_INVALID/)
})
