/**
 * Layer-0 A1: place atoms at import/OCR time (before any circle).
 * One physical place → one key* with text∪fig faces (两面一体).
 * Compound circle runs are B-side only — never written back into this index.
 */

import type { EmphasisEdge, PagePoint, RegionSelector } from '../data/emphasis'
import type { OcrPageResult } from '../data/ocrService'
import type { PageDocument, PageTextChunk } from '../zigzag/types'
import {
  facesToReadout,
  makeFigKey,
  makeIntrinsicKey,
} from './intrinsicKey'
import { cosine, textToProbe } from './lexicalProbe'
import { embedOne, embedTexts } from './embedClient'
import type {
  AChunkSource,
  IntrinsicCoordinate,
  PlaceFaces,
  PlaceKind,
} from './types'

export interface AChunk {
  ord: number
  id: string
  page: number
  bbox: [number, number, number, number]
  start: number
  end: number
  source: AChunkSource
  kind: PlaceKind
  key: string
  faces: PlaceFaces
  content: string
  figId?: string
  /** CPU lightweight embedding ↔ key* (spec V_book) */
  vBook: number[]
}

export interface BookIndex {
  docId: string
  stream: string
  chunks: AChunk[]
  builtAt: number
}

const SEP = '\n\n'

const FIG_LABEL_RE =
  /^(figure|fig|image|img|picture|photo|chart|diagram|graphic|illustration|table|公式|图片|插图|图表|表格|图)$/i

export function isFigLayoutLabel(label: string): boolean {
  const t = label.trim()
  if (!t) return false
  if (FIG_LABEL_RE.test(t)) return true
  return /图|表|插画|照片/.test(t) && !/标题|页眉|页脚|正文|段落/.test(t)
}

function sortByReadingOrder<T extends { bbox: [number, number, number, number] }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const dy = a.bbox[1] - b.bbox[1]
    if (Math.abs(dy) > 12) return dy
    return a.bbox[0] - b.bbox[0]
  })
}

function aabbArea(b: [number, number, number, number]): number {
  return Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1])
}

function aabbOverlapArea(
  a: [number, number, number, number],
  b: [number, number, number, number],
): number {
  const x0 = Math.max(a[0], b[0])
  const y0 = Math.max(a[1], b[1])
  const x1 = Math.min(a[2], b[2])
  const y1 = Math.min(a[3], b[3])
  if (x1 <= x0 || y1 <= y0) return 0
  return (x1 - x0) * (y1 - y0)
}

/** Intersection over union — used to merge co-referent text∪fig on same territory */
export function aabbIoU(
  a: [number, number, number, number],
  b: [number, number, number, number],
): number {
  const inter = aabbOverlapArea(a, b)
  if (inter <= 0) return 0
  const uni = aabbArea(a) + aabbArea(b) - inter
  return uni > 0 ? inter / uni : 0
}

function paragraphsAsChunks(page: PageDocument): PageTextChunk[] {
  const paras = page.text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const parts = paras.length > 0 ? paras : page.text.trim() ? [page.text.trim()] : []
  if (parts.length === 0) return []
  const pad = 48
  const usable = 1000 - pad * 2
  const weights = parts.map((p) => Math.max(24, p.length))
  const sum = weights.reduce((a, b) => a + b, 0)
  let y = pad
  return parts.map((content, i) => {
    const h = (weights[i] / sum) * usable
    const bbox: [number, number, number, number] = [pad, y, 1000 - pad, y + h]
    y += h
    return { id: `page_s${page.strandIndex}_p${i}`, content, bbox }
  })
}

function splitOcrBlocks(ocr: OcrPageResult): {
  text: PageTextChunk[]
  figs: Array<PageTextChunk & { label: string }>
} {
  const text: PageTextChunk[] = []
  const figs: Array<PageTextChunk & { label: string }> = []
  const blocks = [...ocr.blocks].sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index
    const dy = a.bbox[1] - b.bbox[1]
    if (Math.abs(dy) > 8) return dy
    return a.bbox[0] - b.bbox[0]
  })
  for (const b of blocks) {
    if (isFigLayoutLabel(b.label)) {
      figs.push({
        id: b.id,
        content: b.content.trim(),
        bbox: b.bbox,
        label: b.label,
      })
      continue
    }
    if (b.content.trim().length > 0) {
      text.push({
        id: b.id,
        content: b.content.trim(),
        bbox: b.bbox,
      })
    }
  }
  return { text, figs }
}

type PageAtoms =
  | {
      mode: 'dual'
      source: AChunkSource
      text: PageTextChunk[]
      /** layout figs not yet merged into text */
      figs: Array<PageTextChunk & { label?: string }>
    }
  | { mode: 'fig_only'; figs: Array<PageTextChunk & { label?: string }> }
  | null

function pageAtoms(
  page: PageDocument,
  ocr: OcrPageResult | undefined,
): PageAtoms {
  const hasPageImage = Boolean(page.imageUrl)

  if (ocr && ocr.blocks.length > 0) {
    const { text, figs } = splitOcrBlocks(ocr)
    if (text.length > 0 || figs.length > 0) {
      return { mode: 'dual', source: 'ocr', text, figs }
    }
  }

  if (page.textChunks && page.textChunks.length > 0) {
    const text = sortByReadingOrder(
      page.textChunks.filter((c) => c.content.trim().length > 0),
    ).map((c) => ({
      id: c.id,
      content: c.content.trim(),
      bbox: c.bbox,
    }))
    if (text.length > 0) {
      return { mode: 'dual', source: 'pdf_text', text, figs: [] }
    }
  }

  // Weak-path convergence: image page without text blocks → fig only (no fake paragraph boxes)
  if (hasPageImage) {
    return {
      mode: 'fig_only',
      figs: [
        {
          id: `full_p${page.strandIndex}`,
          content: '',
          bbox: [0, 0, 1000, 1000],
          label: 'page',
        },
      ],
    }
  }

  const derived = paragraphsAsChunks(page)
  if (derived.length === 0) return null
  return { mode: 'dual', source: 'page_text', text: derived, figs: [] }
}

/** Merge layout figs into overlapping text atoms (两面一体); leftover figs stay fig-primary. */
function mergeFigsIntoText(
  text: PageTextChunk[],
  figs: Array<PageTextChunk & { label?: string }>,
  iouThreshold = 0.25,
): {
  textFigIds: Map<string, string>
  orphanFigs: Array<PageTextChunk & { label?: string }>
} {
  const textFigIds = new Map<string, string>()
  const orphanFigs: Array<PageTextChunk & { label?: string }> = []
  const usedText = new Set<string>()

  for (const fig of figs) {
    let bestId: string | null = null
    let bestIoU = 0
    for (const t of text) {
      if (usedText.has(t.id)) continue
      const iou = aabbIoU(fig.bbox, t.bbox)
      // also accept high coverage of fig by text (fig inside text block)
      const figArea = Math.max(1, aabbArea(fig.bbox))
      const cov = aabbOverlapArea(fig.bbox, t.bbox) / figArea
      const score = Math.max(iou, cov >= 0.5 ? cov : 0)
      if (score > bestIoU) {
        bestIoU = score
        bestId = t.id
      }
    }
    if (bestId && bestIoU >= iouThreshold) {
      textFigIds.set(bestId, `layout:${fig.id}`)
      usedText.add(bestId)
    } else {
      orphanFigs.push(fig)
    }
  }
  return { textFigIds, orphanFigs }
}

function probeForFaces(faces: PlaceFaces): number[] {
  return textToProbe(facesToReadout(faces))
}

function pushTextAtom(
  docId: string,
  state: { stream: string; chunks: AChunk[]; ord: number },
  page: number,
  atom: PageTextChunk,
  source: AChunkSource,
  pageImageUrl: string | undefined,
  layoutFigId: string | undefined,
): void {
  if (state.stream.length > 0) state.stream += SEP
  const start = state.stream.length
  state.stream += atom.content
  const end = state.stream.length
  const key = makeIntrinsicKey(docId, start, end)
  const faces: PlaceFaces = {
    text: { start, end, content: atom.content },
  }
  // 两面一体: page image ⇒ always attach fig face on text lock
  if (pageImageUrl || layoutFigId) {
    const figId = layoutFigId ?? `crop:${atom.id}`
    faces.fig = {
      figId,
      note: layoutFigId
        ? `与文字同区的版面 figure（防 OCR 漂移审计）。页=${page}`
        : `与文字脸同框的页图像裁剪区。页=${page}`,
      imageRef: pageImageUrl,
    }
  }
  state.chunks.push({
    ord: state.ord,
    id: atom.id,
    page,
    bbox: atom.bbox,
    start,
    end,
    source,
    kind: 'text',
    key,
    faces,
    content: atom.content,
    figId: faces.fig?.figId,
    vBook: probeForFaces(faces),
  })
  state.ord += 1
}

function pushFigAtom(
  docId: string,
  state: { stream: string; chunks: AChunk[]; ord: number },
  page: number,
  fig: PageTextChunk & { label?: string },
  pageImageUrl: string | undefined,
  pageTitle: string,
): void {
  const isFullPage =
    fig.bbox[0] <= 1 &&
    fig.bbox[1] <= 1 &&
    fig.bbox[2] >= 999 &&
    fig.bbox[3] >= 999
  const figId = isFullPage ? `p${page}:full` : `p${page}:layout:${fig.id}`

  const caption = fig.content.trim()
  const titleBit = pageTitle.trim() || `strand ${page}`
  // Page-specific note so V_book differs across full-page figs (lexical probe stand-in).
  // Real semantic retrieval still needs OCR/caption or a true embedding API.
  const note = caption
    ? `图脸 · 页${page} · ${titleBit} · ${fig.label ?? 'figure'} · ${caption}`
    : `图脸 · 页${page} · ${titleBit} · ${figId} · 无文字层/未OCR；仅全页图像锚点。请依据可见版面回答；勿编造未提供的文字。`
  const placeholder = caption
    ? `[FIG:${figId}] ${caption}`
    : `[FIG:${figId}] ${titleBit}`
  if (state.stream.length > 0) state.stream += SEP
  const start = state.stream.length
  state.stream += placeholder
  const end = state.stream.length
  const key = makeFigKey(docId, figId)
  const faces: PlaceFaces = {
    fig: {
      figId,
      note,
      imageRef: pageImageUrl,
    },
  }
  if (caption) {
    faces.text = { start, end, content: caption }
  }
  state.chunks.push({
    ord: state.ord,
    id: `fig_${figId.replace(/[^a-zA-Z0-9_:-]/g, '_')}`,
    page,
    bbox: fig.bbox,
    start,
    end,
    source: 'layout_fig',
    kind: 'fig',
    key,
    faces,
    content: placeholder,
    figId,
    vBook: probeForFaces(faces),
  })
  state.ord += 1
}

/**
 * A1 index: built from uploaded pages + OCR/layout, independent of user circling.
 */
export function buildBookIndex(input: {
  docId: string
  pages: PageDocument[]
  ocrByStrand: Record<number, OcrPageResult>
}): BookIndex {
  const state = { stream: '', chunks: [] as AChunk[], ord: 0 }
  const pages = [...input.pages].sort((a, b) => a.strandIndex - b.strandIndex)

  for (const page of pages) {
    const pageImageUrl = page.imageUrl
    const atoms = pageAtoms(page, input.ocrByStrand[page.strandIndex])
    if (!atoms) continue

    if (atoms.mode === 'fig_only') {
      for (const fig of atoms.figs) {
        pushFigAtom(
          input.docId,
          state,
          page.strandIndex,
          fig,
          pageImageUrl,
          page.title,
        )
      }
      continue
    }

    const { textFigIds, orphanFigs } = mergeFigsIntoText(atoms.text, atoms.figs)
    for (const atom of atoms.text) {
      pushTextAtom(
        input.docId,
        state,
        page.strandIndex,
        atom,
        atoms.source,
        pageImageUrl,
        textFigIds.get(atom.id),
      )
    }
    for (const fig of orphanFigs) {
      pushFigAtom(
        input.docId,
        state,
        page.strandIndex,
        fig,
        pageImageUrl,
        page.title,
      )
    }
  }

  return {
    docId: input.docId,
    stream: state.stream,
    chunks: state.chunks,
    builtAt: Date.now(),
  }
}

export function pointInPolygon(
  x: number,
  y: number,
  polygon: PagePoint[],
): boolean {
  const n = polygon.length
  if (n < 3) return false
  let inside = false
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yj === yi) continue
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function chunkHitScore(
  bbox: [number, number, number, number],
  region: RegionSelector,
): { hit: boolean; score: number } {
  const [x0, y0, x1, y1] = bbox
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const inPoly =
    region.polygon.length >= 3 ? pointInPolygon(cx, cy, region.polygon) : false
  const chunkArea = Math.max(1, (x1 - x0) * (y1 - y0))
  const coverage = aabbOverlapArea(bbox, region.aabb) / chunkArea
  const pageFig =
    x0 <= 1 && y0 <= 1 && x1 >= 999 && y1 >= 999
      ? aabbOverlapArea(bbox, region.aabb) > 0 || inPoly
      : false
  // Small layout figs: lower coverage bar so circle can lock them
  const covNeed = chunkArea < 80_000 ? 0.18 : 0.35
  const hit = inPoly || coverage >= covNeed || pageFig
  const score = inPoly
    ? Math.max(0.7, coverage)
    : pageFig
      ? 0.55
      : coverage
  return { hit, score }
}

export interface CircleCandidate {
  R: IntrinsicCoordinate
  excerpt: string
  score: number
  chunkIds: string[]
  boxes: Array<{ page: number; bbox: [number, number, number, number] }>
}

export type CircleResolveResult =
  | {
      ok: true
      chosen: CircleCandidate
      candidates: CircleCandidate[]
      source: AChunkSource
    }
  | {
      ok: false
      reason: 'no_chunks' | 'no_hit'
      message: string
    }

function atomToCandidate(
  docId: string,
  run: Array<AChunk & { score: number }>,
  emphasisId: string,
): CircleCandidate {
  const first = run[0]
  const last = run[run.length - 1]
  const score = run.reduce((s, c) => s + c.score, 0)

  if (first.kind === 'fig' || !first.faces.text) {
    const faces = first.faces
    return {
      R: {
        docId,
        kind: 'fig',
        key: first.key,
        start: first.start,
        end: first.end,
        figId: first.figId,
        page: first.page,
        emphasisId,
        chunkIds: run.map((c) => c.id),
        source: first.source,
        faces,
      },
      excerpt: facesToReadout(faces),
      score,
      chunkIds: run.map((c) => c.id),
      boxes: run.map((c) => ({ page: c.page, bbox: c.bbox })),
    }
  }

  // B-side only: merge contiguous text run into a span key* (not written back to A1)
  const start = first.start
  const end = last.end
  const key = makeIntrinsicKey(docId, start, end)
  const content = run.map((c) => c.faces.text?.content ?? c.content).join('\n\n')
  const faces: PlaceFaces = {
    text: { start, end, content },
  }
  if (first.faces.fig) {
    faces.fig = first.faces.fig
  } else {
    const withFig = run.find((c) => c.faces.fig)
    if (withFig?.faces.fig) faces.fig = withFig.faces.fig
  }

  return {
    R: {
      docId,
      kind: 'text',
      key,
      start,
      end,
      figId: faces.fig?.figId,
      page: first.page,
      emphasisId,
      chunkIds: run.map((c) => c.id),
      source: first.source,
      faces,
    },
    excerpt: facesToReadout(faces),
    score,
    chunkIds: run.map((c) => c.id),
    boxes: run.map((c) => ({ page: c.page, bbox: c.bbox })),
  }
}

function contiguousRuns(
  hits: Array<AChunk & { score: number }>,
): Array<Array<AChunk & { score: number }>> {
  if (hits.length === 0) return []
  const sorted = [...hits].sort((a, b) => a.ord - b.ord)
  const runs: Array<Array<AChunk & { score: number }>> = []
  let cur: Array<AChunk & { score: number }> = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const prev = cur[cur.length - 1]
    if (sorted[i].ord === prev.ord + 1 && sorted[i].kind === prev.kind) {
      cur.push(sorted[i])
    } else {
      runs.push(cur)
      cur = [sorted[i]]
    }
  }
  runs.push(cur)
  return runs
}

export function resolveCircleToR(
  edge: EmphasisEdge,
  index: BookIndex,
): CircleResolveResult {
  const pageChunks = index.chunks.filter((c) => c.page === edge.strandIndex)
  if (pageChunks.length === 0) {
    return {
      ok: false,
      reason: 'no_chunks',
      message:
        '本页尚无 A1 原子。请等待导入解析/OCR；扫描无字页应已自动登记图脸。',
    }
  }

  const textHits: Array<AChunk & { score: number }> = []
  const figHits: Array<AChunk & { score: number }> = []
  for (const chunk of pageChunks) {
    const { hit, score } = chunkHitScore(chunk.bbox, edge.region)
    if (!hit) continue
    if (chunk.kind === 'text') textHits.push({ ...chunk, score })
    else figHits.push({ ...chunk, score })
  }

  // Prefer text-primary (already carries fig face when page has image)
  const primaryHits = textHits.length > 0 ? textHits : figHits
  if (primaryHits.length === 0) {
    return {
      ok: false,
      reason: 'no_hit',
      message:
        '圈定未命中任何已建 A1 原子。位置锁在上传/OCR 时已建立；请圈在文字块或图区上。',
    }
  }

  const runs = contiguousRuns(primaryHits)
  const candidates = runs
    .map((run) => atomToCandidate(index.docId, run, edge.id))
    .sort((a, b) => b.score - a.score)

  return {
    ok: true,
    chosen: candidates[0],
    candidates,
    source: primaryHits[0].source,
  }
}

/**
 * B-side object anchoring: V_q × A-side V_book → Top-K exact key* candidates.
 * Uses 审计 Embedding API when configured; else lexical probe.
 */
export async function resolveVqToCandidates(
  index: BookIndex,
  question: string,
  topK = 5,
): Promise<{
  candidates: CircleCandidate[]
  weakFigOnly: boolean
  usedEmbedApi: boolean
}> {
  const q = question.trim()
  if (!q || index.chunks.length === 0) {
    return { candidates: [], weakFigOnly: false, usedEmbedApi: false }
  }
  const weakFigOnly =
    index.chunks.length > 0 && index.chunks.every((c) => c.kind === 'fig')
  const { vector: vq, usedApi } = await embedOne(q)
  const scored = index.chunks.map((chunk) => {
    const score = cosine(vq, chunk.vBook)
    return { chunk, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const candidates = scored.slice(0, topK).map(({ chunk, score }) =>
    atomToCandidate(
      index.docId,
      [{ ...chunk, score: Math.max(0.01, score) }],
      'vq_anchor',
    ),
  )
  return { candidates, weakFigOnly, usedEmbedApi: usedApi }
}

/** Recompute V_book with 审计 Embedding (or probe). Mutates and returns index. */
export async function reembedBookIndex(index: BookIndex): Promise<{
  index: BookIndex
  usedApi: boolean
}> {
  const texts = index.chunks.map((c) => facesToReadout(c.faces))
  const { vectors, usedApi } = await embedTexts(texts)
  const chunks = index.chunks.map((c, i) => ({
    ...c,
    vBook: vectors[i] ?? c.vBook,
  }))
  return {
    index: { ...index, chunks, builtAt: Date.now() },
    usedApi,
  }
}
