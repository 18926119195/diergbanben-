import type { AdjustKind, IntrinsicCoordinate, PlaceFaces, RelationKind } from './types'

export { makeComboKey, makeSlotKey, stableShortHash } from './ocrSlot'

export function makeIntrinsicKey(docId: string, start: number, end: number): string {
  return `${docId}|${start}|${end}`
}

export function makeFigKey(docId: string, figId: string): string {
  return `${docId}|fig|${figId}`
}

/** Prefer slot / combo doorplate; stream interval is alias only. */
export function formatRLabel(R: IntrinsicCoordinate): string {
  const faces: string[] = []
  if (R.faces.text) faces.push('文字脸')
  if (R.faces.fig) faces.push('图脸')
  const faceTag = faces.length ? faces.join('+') : R.kind
  const members = R.memberKeys?.length
    ? ` · ${R.memberKeys.length}槽`
    : ''
  if (R.slotK !== undefined) {
    return `p${R.page} · k${R.slotK}${members} · ${faceTag} · ${R.source}`
  }
  if (R.key.includes('|combo|')) {
    return `p${R.page} · combo${members} · ${faceTag} · ${R.source}`
  }
  if (R.kind === 'fig') {
    return `p${R.page} · FIG ${R.figId ?? '?'} · ${faceTag} · ${R.source}`
  }
  const n = Math.max(0, R.end - R.start)
  return `p${R.page} · [${R.start}, ${R.end}) · ${n}字 · ${faceTag} · ${R.source}`
}

export function classifyIntervalRelation(
  a: IntrinsicCoordinate,
  b: IntrinsicCoordinate,
): { relation: RelationKind; adjust?: AdjustKind } {
  if (a.docId !== b.docId) {
    return { relation: 'disjoint' }
  }
  if (a.key === b.key) {
    return { relation: 'overlap', adjust: 'same' }
  }
  const aMembers = a.memberKeys?.length ? a.memberKeys : [a.key]
  const bMembers = b.memberKeys?.length ? b.memberKeys : [b.key]
  const shared = aMembers.some((k) => bMembers.includes(k))
  if (shared) {
    if (
      aMembers.length === bMembers.length &&
      aMembers.every((k) => bMembers.includes(k))
    ) {
      return { relation: 'overlap', adjust: 'same' }
    }
    return { relation: 'overlap', adjust: 'partial' }
  }
  if (a.kind === 'fig' || b.kind === 'fig') {
    return { relation: 'disjoint' }
  }
  if (a.start === b.start && a.end === b.end) {
    return { relation: 'overlap', adjust: 'same' }
  }
  const disjoint = a.end <= b.start || b.end <= a.start
  if (disjoint) return { relation: 'disjoint' }

  const aInB = a.start >= b.start && a.end <= b.end
  const bInA = b.start >= a.start && b.end <= a.end
  if (aInB && !bInA) return { relation: 'overlap', adjust: 'expand' }
  if (bInA && !aInB) return { relation: 'overlap', adjust: 'shrink' }
  if (aInB && bInA) return { relation: 'overlap', adjust: 'same' }
  return { relation: 'overlap', adjust: 'partial' }
}

/** Machine readout payload for Bundle / audit panel */
export function facesToReadout(faces: PlaceFaces): string {
  const parts: string[] = []
  if (faces.text) {
    parts.push('【文字脸】', faces.text.content)
  }
  if (faces.fig) {
    parts.push(
      '【图脸】',
      `figId=${faces.fig.figId}`,
      faces.fig.note,
      faces.fig.imageRef
        ? faces.fig.imageRef.startsWith('data:')
          ? 'imageRef=(页图已附着)'
          : `imageRef=${faces.fig.imageRef}`
        : '',
    )
  }
  return parts.filter((p) => p.length > 0).join('\n')
}
