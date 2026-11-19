import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'

const source = new URL('../src/', import.meta.url).href
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.startsWith(source) && specifier.startsWith('.') && !/\.[mc]?[jt]sx?$/.test(specifier)) {
      return next(`${specifier}.ts`, context)
    }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url === `${source}reasoning/modelRuntimeConfig.ts`) {
      return { format: 'module-typescript', shortCircuit: true, source: readFileSync(new URL(url), 'utf8').replace('import.meta.env[name]', '({})[name]') }
    }
    return next(url, context)
  },
})

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}
const { buildBookIndex, resolveCircleToR, resolveVqToCandidates } = await import(`${source}reasoning/pipelineA.ts`)
const { makeSlotKey } = await import(`${source}reasoning/intrinsicKey.ts`)
const { buildInferBundle, bundleToPrompt } = await import(`${source}reasoning/bundle.ts`)
const { callLlmWithBundle } = await import(`${source}reasoning/llmClient.ts`)
const { saveBookIndex, loadBookIndex } = await import(`${source}reasoning/bookIndexStore.ts`)
const { saveDualModelConfig } = await import(`${source}reasoning/modelRuntimeConfig.ts`)

const sourceText = '机械分子研究记录说明分子无意识判断'
const outsideText = '另有植物发生、生命与家畜分类经验'
const docId = 'offline:fixture'
const pages = [{
  strandIndex: 3,
  title: 'Fixture PDF text page',
  text: `${sourceText}\n${outsideText}`,
  offsetMap: [],
  imageUrl: '/sample.png',
  textChunks: [
    { id: 'on-topic', content: sourceText, bbox: [10, 10, 200, 75] },
    { id: 'excluded', content: outsideText, bbox: [10, 150, 200, 230] },
  ],
}, {
  strandIndex: 5,
  title: 'Fixture image-only page',
  text: 'must not become an unlocated text block',
  offsetMap: [],
  imageUrl: '/figure.png',
}]
const index = buildBookIndex({ docId, pages, ocrByStrand: {} })
assert.equal(index.chunks.length, 3)
assert.equal(index.chunks[0].key, makeSlotKey(docId, 3, 0))
assert.equal(index.chunks[0].faces.fig.imageRef, '/sample.png')
assert.equal(index.chunks[2].kind, 'fig')
assert.equal(index.chunks[2].faces.text, undefined)
console.log('PASS A1 真实文本框双脸 + 图像专页无伪文本')

const result = await resolveVqToCandidates(index, '分子无意识', 3, { skipExpand: true })
assert.equal(result.usedEmbedApi, false)
assert.equal(result.candidates[0].R.key, index.chunks[0].key)
assert.deepEqual(result.candidates[0].boxes, [{ page: 3, bbox: [10, 10, 200, 75] }])
console.log('PASS 离线词法 probe + BM25；检索命中同一 A1 key 与盒')

const edge = { id: 'circle-fixture', strandIndex: 3, region: {
  polygon: [[4, 4], [205, 4], [205, 80], [4, 80]],
  aabb: [4, 4, 205, 80],
} }
const lock = resolveCircleToR(edge, index)
assert.equal(lock.ok, true)
assert.equal(lock.chosen.R.key, result.candidates[0].R.key)
assert.deepEqual(lock.chosen.boxes, result.candidates[0].boxes)
console.log('PASS 圈选锁和问题检索锁同一 A1 key 与盒')

saveBookIndex(index)
const restored = loadBookIndex(docId)
assert.ok(restored)
assert.equal(restored.chunks[0].key, index.chunks[0].key)
assert.equal(restored.chunks[0].faces.text.content, sourceText)
console.log('PASS localStorage 索引保存、还原与锁定文本')

const bundle = buildInferBundle({ R: lock.chosen.R, sourceExcerpt: sourceText, question: '是否提到分子无意识？', forbid: [] })
assert.equal(bundle.closureKey, index.chunks[0].key)
assert.match(bundleToPrompt(bundle), new RegExp(sourceText))
assert.ok(!bundleToPrompt(bundle).includes(outsideText))
const modelMockResult = await callLlmWithBundle(bundle)
assert.equal(modelMockResult.usedMock, true)
assert.match(modelMockResult.conclusion, /Mock 结论/)
console.log('PASS 基础单锁 bundle 无圈外材料且无凭据返回演示 Mock')

const fakeSlot = { baseUrl: 'https://model.fixture.invalid/v1', apiKey: 'mock-test-key', model: 'local-fixture' }
saveDualModelConfig({ ocr: fakeSlot, reason: fakeSlot, embed: fakeSlot })
let outbound
const fetchOriginal = globalThis.fetch
globalThis.fetch = async (url, init) => {
  assert.equal(url, `${fakeSlot.baseUrl}/chat/completions`)
  outbound = JSON.parse(init.body)
  return new Response(JSON.stringify({ choices: [{ message: { content: '路径：命中原文\n结论：确有提到。' } }] }))
}
try {
  const liveBranchResult = await callLlmWithBundle(bundle)
  assert.equal(liveBranchResult.ok, true)
  assert.equal(liveBranchResult.usedMock, false)
  assert.equal(liveBranchResult.conclusion, '确有提到。')
  assert.equal(outbound.messages[1].content, bundleToPrompt(bundle))
  assert.ok(!JSON.stringify(outbound).includes(outsideText))
  console.log('PASS 已配置分支 HTTP 请求体及结果解析（fetch 桩，无外部请求）')
} finally {
  globalThis.fetch = fetchOriginal
}
