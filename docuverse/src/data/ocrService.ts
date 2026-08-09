/**
 * GLM-OCR layout_parsing — returns text blocks with bbox for same-plane compare.
 */

export interface OcrBlock {
  /** Stable id for edit / hover (survives reordering) */
  id: string
  index: number
  label: string
  /** Editable OCR text — changing this never moves the bbox binding */
  content: string
  /** Immutable text from the first OCR pass (provenance / restore) */
  sourceContent: string
  /** Normalized 0–1000 coords: [xmin, ymin, xmax, ymax] — binds to original page */
  bbox: [number, number, number, number]
  /** User has verified this text; required before permanent bond */
  confirmed: boolean
}

export interface OcrPageResult {
  strandIndex: number
  markdown: string
  blocks: OcrBlock[]
  pageWidth: number
  pageHeight: number
  createdAt: number
}

export function newOcrBlockId(): string {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function rebuildOcrMarkdown(blocks: OcrBlock[]): string {
  return blocks
    .map((b) => b.content.trim())
    .filter((t) => t.length > 0)
    .join('\n\n')
}

export function ocrPageHasEdits(result: OcrPageResult): boolean {
  return result.blocks.some((b) => b.content !== b.sourceContent)
}

/** Local page-plane point → small bbox in 0–1000 (for “add block at click”) */
export function localPointToBbox(
  localX: number,
  localY: number,
  pageW: number,
  pageH: number,
  boxW = 200,
  boxH = 70,
): [number, number, number, number] {
  const nx = ((localX + pageW / 2) / pageW) * 1000
  const ny = ((pageH / 2 - localY) / pageH) * 1000
  const halfW = boxW / 2
  const halfH = boxH / 2
  return [
    Math.min(1000, Math.max(0, nx - halfW)),
    Math.min(1000, Math.max(0, ny - halfH)),
    Math.min(1000, Math.max(0, nx + halfW)),
    Math.min(1000, Math.max(0, ny + halfH)),
  ]
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function parseBbox(raw: unknown): [number, number, number, number] | null {
  if (!Array.isArray(raw) || raw.length < 4) return null
  const nums = raw.slice(0, 4).map((x) => Number(x))
  if (nums.some((n) => Number.isNaN(n))) return null
  return [nums[0], nums[1], nums[2], nums[3]]
}

/**
 * GLM MaaS docs: bbox_2d is 0–1. Open-source SDK uses 0–1000.
 * Pixel coords appear when width/height on the item match the image size.
 * Always normalize to 0–1000 for layout.
 */
export function normalizeBboxToThousand(
  bbox: [number, number, number, number],
  pageWidth: number,
  pageHeight: number,
): [number, number, number, number] {
  const [x0, y0, x1, y1] = bbox
  const maxV = Math.max(x0, y0, x1, y1)
  const pw = pageWidth > 0 ? pageWidth : 0
  const ph = pageHeight > 0 ? pageHeight : 0

  let out: [number, number, number, number]
  if (maxV <= 1.0001) {
    // Official layout_parsing: normalized 0–1
    out = [x0 * 1000, y0 * 1000, x1 * 1000, y1 * 1000]
  } else if (
    pw > 1 &&
    ph > 1 &&
    x1 <= pw * 1.02 &&
    y1 <= ph * 1.02 &&
    // Pixel space only when page dims are clearly not a 0–1000 canvas
    // and values sit in the pixel range (avoids treating 0–1000 as px on 1000×1000)
    (pw > 1000.5 || ph > 1000.5 || maxV > 1000.5)
  ) {
    out = [(x0 / pw) * 1000, (y0 / ph) * 1000, (x1 / pw) * 1000, (y1 / ph) * 1000]
  } else if (maxV <= 1000.5) {
    out = [x0, y0, x1, y1]
  } else if (pw > 0 && ph > 0) {
    out = [(x0 / pw) * 1000, (y0 / ph) * 1000, (x1 / pw) * 1000, (y1 / ph) * 1000]
  } else {
    out = [
      (x0 / maxV) * 1000,
      (y0 / maxV) * 1000,
      (x1 / maxV) * 1000,
      (y1 / maxV) * 1000,
    ]
  }

  const ax = Math.min(out[0], out[2])
  const ay = Math.min(out[1], out[3])
  const bx = Math.max(out[0], out[2])
  const by = Math.max(out[1], out[3])
  return [
    Math.min(1000, Math.max(0, ax)),
    Math.min(1000, Math.max(0, ay)),
    Math.min(1000, Math.max(0, bx)),
    Math.min(1000, Math.max(0, by)),
  ]
}

/** Strip OCR markdown / TeX noise for on-plane display */
export function sanitizeOcrDisplayText(raw: string): string {
  return raw
    .replace(/\$\\textcircled\{[^}]*\}\$/g, '©')
    .replace(/\\textcircled\{[^}]*\}/g, '©')
    .replace(/\$[^$]*\$/g, (m) => m.replace(/\$/g, ''))
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseLayoutParsingResponse(
  json: unknown,
  strandIndex: number,
): OcrPageResult {
  const root = asRecord(json) ?? {}
  const dataInfo = asRecord(root.data_info)
  const pages = Array.isArray(dataInfo?.pages) ? dataInfo.pages : []
  const page0 = asRecord(pages[0])
  const pageWidth = Number(page0?.width) || 1000
  const pageHeight = Number(page0?.height) || 1000

  const layoutDetails = root.layout_details
  const firstPageBlocks = Array.isArray(layoutDetails)
    ? Array.isArray(layoutDetails[0])
      ? layoutDetails[0]
      : layoutDetails
    : []

  const blocks: OcrBlock[] = []
  const mdParts: string[] = []

  for (const item of firstPageBlocks) {
    const rec = asRecord(item)
    if (!rec) continue
    const rawBbox = parseBbox(rec.bbox_2d)
    if (!rawBbox) continue
    // Prefer per-block page size when API includes it
    const itemW = Number(rec.width) || pageWidth
    const itemH = Number(rec.height) || pageHeight
    const bbox = normalizeBboxToThousand(rawBbox, itemW, itemH)
    // Degenerate / empty boxes
    if (bbox[2] - bbox[0] < 0.5 || bbox[3] - bbox[1] < 0.5) continue
    const content = typeof rec.content === 'string' ? rec.content.trim() : ''
    const label = typeof rec.label === 'string' ? rec.label : 'text'
    const index = typeof rec.index === 'number' ? rec.index : blocks.length
    blocks.push({
      id: newOcrBlockId(),
      index,
      label,
      content,
      sourceContent: content,
      bbox,
      confirmed: false,
    })
    if (content) mdParts.push(content)
  }

  const mdField =
    typeof root.md_results === 'string'
      ? root.md_results
      : typeof root.markdown === 'string'
        ? root.markdown
        : mdParts.join('\n\n')

  return {
    strandIndex,
    markdown: mdField,
    blocks,
    pageWidth,
    pageHeight,
    createdAt: Date.now(),
  }
}

/** Fetch image as data URI (handles blob:, http(s):, and relative paths) */
export async function imageUrlToDataUri(url: string): Promise<string> {
  if (url.startsWith('data:')) return url
  const res = await fetch(url)
  if (!res.ok) throw new Error(`无法读取页面图像: ${res.status}`)
  const blob = await res.blob()
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const b64 = btoa(binary)
  const mime = blob.type || 'image/png'
  return `data:${mime};base64,${b64}`
}

export async function runGlmOcrOnImage(
  dataUri: string,
  strandIndex: number,
): Promise<OcrPageResult> {
  const res = await fetch('/api/zhipu/layout_parsing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'glm-ocr',
      file: dataUri,
    }),
  })
  const text = await res.text()
  let json: unknown
  try {
    json = JSON.parse(text) as unknown
  } catch {
    throw new Error(`OCR 响应非 JSON: ${text.slice(0, 200)}`)
  }
  if (!res.ok) {
    const err = asRecord(json)
    const msg =
      (typeof err?.error === 'object' &&
        err.error &&
        typeof (err.error as { message?: string }).message === 'string' &&
        (err.error as { message: string }).message) ||
      (typeof err?.msg === 'string' && err.msg) ||
      text.slice(0, 300)
    throw new Error(`OCR 失败: ${msg}`)
  }
  return parseLayoutParsingResponse(json, strandIndex)
}

/**
 * Map normalized 0–1000 bbox → local page plane coords (origin at page center).
 * inset=0 keeps OCR twin and source highlights on the exact same grid.
 */
export function bboxToLocalRect(
  bbox: [number, number, number, number],
  pageW: number,
  pageH: number,
  inset = 0,
): { x: number; y: number; w: number; h: number } {
  const [x0, y0, x1, y1] = bbox
  const nx0 = x0 / 1000
  const ny0 = y0 / 1000
  const nx1 = x1 / 1000
  const ny1 = y1 / 1000
  const minX = -pageW / 2 + inset
  const maxX = pageW / 2 - inset
  const minY = -pageH / 2 + inset
  const maxY = pageH / 2 - inset
  let left = -pageW / 2 + nx0 * pageW
  let right = -pageW / 2 + nx1 * pageW
  let top = pageH / 2 - ny0 * pageH
  let bottom = pageH / 2 - ny1 * pageH
  if (inset > 0) {
    left = Math.min(maxX, Math.max(minX, left))
    right = Math.min(maxX, Math.max(minX, right))
    top = Math.min(maxY, Math.max(minY, top))
    bottom = Math.min(maxY, Math.max(minY, bottom))
  }
  if (right < left) [left, right] = [right, left]
  if (top < bottom) [top, bottom] = [bottom, top]
  return {
    x: (left + right) / 2,
    y: (top + bottom) / 2,
    w: Math.max(0.04, right - left),
    h: Math.max(0.04, top - bottom),
  }
}

/** Pick a font size that fits content inside a bbox without spilling neighbors */
export function fitOcrFontSize(
  text: string,
  boxW: number,
  boxH: number,
): number {
  const padW = boxW * 0.92
  const padH = boxH * 0.88
  if (padW < 0.05 || padH < 0.04) return 0.06
  const chars = Math.max(1, text.length)
  // Start from height, then shrink so wrapped lines fit
  let fs = Math.min(0.2, padH * 0.72)
  for (let i = 0; i < 8; i++) {
    const charsPerLine = Math.max(4, Math.floor(padW / (fs * 0.52)))
    const lines = Math.ceil(chars / charsPerLine)
    const needH = lines * fs * 1.15
    if (needH <= padH) break
    fs *= padH / needH
  }
  return Math.min(0.2, Math.max(0.055, fs))
}
