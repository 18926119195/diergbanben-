/**
 * Interaction semantics for intrinsic-coordinate reasoning control (vendor spec V3.1).
 * One place lock (key*) may carry text and/or fig faces; page_norm ink is entry only.
 */

export type LinkType =
  | 'incremental'
  | 'refine'
  | 'contrast'
  | 'depend'
  | 'explore'
  | 'none'

export type RelationKind = 'overlap' | 'disjoint'
export type AdjustKind = 'expand' | 'shrink' | 'same' | 'partial'

export type AChunkSource =
  | 'ocr'
  | 'pdf_text'
  | 'page_text'
  | 'layout_fig'

/** Primary face that determines key* formula */
export type PlaceKind = 'text' | 'fig'

export interface TextFace {
  start: number
  end: number
  content: string
}

export interface FigFace {
  figId: string
  /** short machine readout / placeholder */
  note: string
  /** page image URL / data URI for audit or multimodal bundle */
  imageRef?: string
}

export interface PlaceFaces {
  text?: TextFace
  fig?: FigFace
}

export interface IntrinsicCoordinate {
  docId: string
  /** which face owns key* formula */
  kind: PlaceKind
  /**
   * Canonical key* — hash entry identity.
   * text-primary: `${docId}|${start}|${end}`
   * fig-primary:  `${docId}|fig|${figId}`
   */
  key: string
  /** inclusive start (text span or fig placeholder span in stream) */
  start: number
  end: number
  figId?: string
  page: number
  emphasisId: string
  chunkIds: string[]
  source: AChunkSource
  /** both faces may be present on one lock */
  faces: PlaceFaces
}

export interface DirectionRecord {
  directionId: string
  questionText: string
  probe: number[]
  path: string
  conclusion: string
  createdAt: number
  variants: string[]
}

export interface DialogueClosure {
  key: string
  R: IntrinsicCoordinate
  excerpt: string
  directions: DirectionRecord[]
  createdAt: number
  updatedAt: number
}

export interface ReasonEdge {
  fromKey: string
  toKey: string
  relation: RelationKind
  adjust?: AdjustKind
  linkType: LinkType
  premiseConclusion?: string
  premisePath?: string
  forbidDirectionIds?: string[]
}

export interface InstructionBundle {
  R: IntrinsicCoordinate
  sourceExcerpt: string
  closureKey: string
  question: string
  forbidDirections: Array<{
    directionId: string
    questionSummary: string
    conclusionSummary: string
  }>
  edge?: ReasonEdge
  premise?: {
    conclusion: string
    pathSummary: string
    fromKey: string
  }
  policy: {
    mustGroundToExcerpt: true
    disallowOutsideR: true
  }
  meta: {
    mode: 'infer' | 'reuse'
    calledModel: boolean
    at: number
  }
}

export interface LlmCallResult {
  ok: boolean
  conclusion: string
  path: string
  raw?: string
  error?: string
  usedMock: boolean
}

export interface LockBox {
  page: number
  bbox: [number, number, number, number]
}
