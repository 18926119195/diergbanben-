/**
 * Interaction semantics for intrinsic-coordinate reasoning control.
 * Place lock key* = OCR slot doorplate (doc|slot|p|k) or combo of member slots.
 * page_norm AABB on the slot is the restore geometry (not re-derived from text).
 */

import type { SlotMemberRef } from './ocrSlot'

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
   * Canonical key* — slot doorplate or combo hash.
   * slot: `${docId}|slot|p${page}|k${k}`
   * combo: `${docId}|combo|${hash(memberKeys)}`
   * legacy fig alias: `${docId}|fig|${figId}` (still accepted)
   */
  key: string
  /** stream alias offsets (audit / legacy); not the primary doorplate */
  start: number
  end: number
  figId?: string
  page: number
  /** page-local OCR step k when key is a single slot */
  slotK?: number
  /** member slot keys when this lock is a cross-slot combo */
  memberKeys?: string[]
  /** audit helpers: pct on each member T + parent AABB */
  members?: SlotMemberRef[]
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
  /** Book/dialog closure = arrangement of slot keys (同构) */
  memberKeys: string[]
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
