/**
 * OCR emission slot — intrinsic atom: page + k + AABB + T0/T + slot_id.
 * Cut registers geom; T may be edited later without moving AABB.
 */

export type PageBBox = [number, number, number, number]

/** FNV-1a 32-bit → base36 doorplate fragment */
export function stableShortHash(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

/** Canonical slot doorplate (离散 page|k) */
export function makeSlotKey(docId: string, page: number, k: number): string {
  return `${docId}|slot|p${page}|k${k}`
}

/** Cross-slot preselect / circle combo — exact hash over member keys */
export function makeComboKey(docId: string, memberKeys: string[]): string {
  const body = [...memberKeys].sort().join('\0')
  return `${docId}|combo|${stableShortHash(body)}`
}

export interface SlotMemberRef {
  slotId: string
  /** 相对该槽 T0/T 长度的读值起止比例 0–100 */
  pctStart: number
  pctEnd: number
  page: number
  bbox: PageBBox
}

/** Character span → percent on a slot string (T0 preferred). */
export function spanToPct(
  text: string,
  start: number,
  end: number,
): { pctStart: number; pctEnd: number } {
  const L = Math.max(1, text.length)
  const s = Math.max(0, Math.min(L, start))
  const e = Math.max(s, Math.min(L, end))
  return {
    pctStart: (s / L) * 100,
    pctEnd: (e / L) * 100,
  }
}

/** Full-slot member (粗并槽默认). */
export function fullSlotMember(input: {
  slotId: string
  page: number
  bbox: PageBBox
}): SlotMemberRef {
  return {
    slotId: input.slotId,
    pctStart: 0,
    pctEnd: 100,
    page: input.page,
    bbox: input.bbox,
  }
}
