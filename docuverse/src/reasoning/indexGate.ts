/**
 * Post-upload gate: OCR → A1 build → V_book embed → ready for V_q questions.
 */

import { create } from 'zustand'
import { saveBookIndex } from './bookIndexStore'
import {
  buildBookIndex,
  reembedBookIndex,
  type BookIndex,
} from './pipelineA'
import type { OcrPageResult } from '../data/ocrService'
import type { PageDocument } from '../zigzag/types'

export type IndexPhase =
  | 'idle'
  | 'importing'
  | 'ocr'
  | 'embedding'
  | 'ready'
  | 'error'

interface IndexGateState {
  phase: IndexPhase
  message: string
  ready: boolean
  bookIndex: BookIndex | null
  lastError: string | null

  reset: () => void
  setImporting: (msg?: string) => void
  /**
   * After pages (+ OCR) are in the doc store: build A1 and embed.
   * Caller should run OCR first if needed.
   */
  finalizeIndex: (input: {
    docId: string
    pages: PageDocument[]
    ocrByStrand: Record<number, OcrPageResult>
  }) => Promise<BookIndex>
  setError: (msg: string) => void
  setBookIndex: (index: BookIndex, ready?: boolean) => void
}

export const useIndexGate = create<IndexGateState>((set) => ({
  phase: 'idle',
  message: '尚未导入文献',
  ready: false,
  bookIndex: null,
  lastError: null,

  reset: () =>
    set({
      phase: 'idle',
      message: '尚未导入文献',
      ready: false,
      bookIndex: null,
      lastError: null,
    }),

  setImporting: (msg) =>
    set({
      phase: 'importing',
      message: msg ?? '正在导入…',
      ready: false,
      lastError: null,
    }),

  setError: (msg) =>
    set({
      phase: 'error',
      message: msg,
      ready: false,
      lastError: msg,
    }),

  setBookIndex: (index, ready = true) => {
    saveBookIndex(index)
    set({
      bookIndex: index,
      ready,
      phase: ready ? 'ready' : 'embedding',
      message: ready
        ? `文献就绪 · ${index.chunks.length} 段可检索`
        : '文献整理中…',
      lastError: null,
    })
  },

  finalizeIndex: async (input) => {
    set({
      phase: 'embedding',
      message: '正在整理文献…',
      ready: false,
      lastError: null,
    })
    try {
      const raw = buildBookIndex(input)
      const { index } = await reembedBookIndex(raw)
      saveBookIndex(index)
      set({
        bookIndex: index,
        ready: true,
        phase: 'ready',
        message: `文献就绪 · ${index.chunks.length} 段可检索`,
        lastError: null,
      })
      return index
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      set({
        phase: 'error',
        message: msg,
        ready: false,
        lastError: msg,
      })
      throw e
    }
  },
}))
