/**
 * Patent PDF page cards — no auto beams.
 * Rays are user-authored (permanent bonds) only.
 */

import type { PageDocument, ResolvedConnection } from '../zigzag/types'

interface PdfSource {
  id: 'connections' | 'intercalation'
  label: string
  short: string
  pageCount: number
}

const SOURCES: PdfSource[] = [
  {
    id: 'connections',
    label: 'US2012/0137202 · Exploring Connections',
    short: 'Connections',
    pageCount: 28,
  },
  {
    id: 'intercalation',
    label: 'US2013/0174003 · Intercalation',
    short: 'Intercalation',
    pageCount: 26,
  },
]

function pageUrl(docId: string, page: number): string {
  return `/pdf-pages/${docId}/page-${String(page).padStart(2, '0')}.png`
}

export function buildPdfPageUniverse(): {
  pages: PageDocument[]
  connections: ResolvedConnection[]
} {
  const pages: PageDocument[] = []

  for (const src of SOURCES) {
    for (let p = 1; p <= src.pageCount; p++) {
      pages.push({
        strandIndex: pages.length,
        title: `${src.short} p.${p}`,
        text: `${src.label}\nPage ${p} of ${src.pageCount}`,
        offsetMap: [],
        imageUrl: pageUrl(src.id, p),
        sourceDoc: src.id,
        sourcePage: p,
      })
    }
  }

  return { pages, connections: [] }
}

export const PDF_SOURCES = SOURCES
