import { useEffect } from 'react'
import { useDocuverse } from '../cvs/store'
import { EmphasisPanel } from './EmphasisPanel'
import { BondBeamPanel } from './BondBeamPanel'
import { EmphasisAgentPanel } from './EmphasisAgentPanel'
import { isTextEditingTarget } from './textEditing'

/**
 * Spacebar floating workbench: 强调笔 · 用户射线/评论 · Agent
 * Fixed layer above WebGL canvas (z-index 200+).
 */
export function WorkbenchPalette() {
  const open = useDocuverse((s) => s.workbenchOpen)
  const tab = useDocuverse((s) => s.workbenchTab)
  const setWorkbenchOpen = useDocuverse((s) => s.setWorkbenchOpen)
  const setWorkbenchTab = useDocuverse((s) => s.setWorkbenchTab)
  const toggleWorkbench = useDocuverse((s) => s.toggleWorkbench)
  const overviewOpen = useDocuverse((s) => s.overviewOpen)
  const openOverview = useDocuverse((s) => s.openOverview)
  const emphasisEdges = useDocuverse((s) => s.emphasisEdges)
  const currentStrand = useDocuverse((s) => s.currentStrand)
  const lastAgentHitIds = useDocuverse((s) => s.lastAgentHitIds)
  const selectedEmphasisId = useDocuverse((s) => s.selectedEmphasisId)
  const emphasizeMode = useDocuverse((s) => s.emphasizeMode)
  const setEmphasizeMode = useDocuverse((s) => s.setEmphasizeMode)
  const clearEmphasisDraft = useDocuverse((s) => s.clearEmphasisDraft)
  const draftLen = useDocuverse((s) => s.emphasisDraftPoints.length)
  const emphasisLinkFromId = useDocuverse((s) => s.emphasisLinkFromId)
  const setEmphasisLinkFrom = useDocuverse((s) => s.setEmphasisLinkFrom)
  const enterTetrahedronLens = useDocuverse((s) => s.enterTetrahedronLens)
  const runAiProposeAndLinkDemo = useDocuverse((s) => s.runAiProposeAndLinkDemo)
  const aiDemoRunning = useDocuverse((s) => s.aiDemoRunning)
  const pages = useDocuverse((s) => s.pages)
  const linkFrom = emphasisEdges.find((e) => e.id === emphasisLinkFromId)

  // 开笔即全局十字圈瞄准（不依赖悬停页卡）
  useEffect(() => {
    document.body.classList.toggle('emphasize-pen-on', emphasizeMode)
    if (!emphasizeMode) {
      document.body.style.cursor = ''
    }
    return () => {
      document.body.classList.remove('emphasize-pen-on')
    }
  }, [emphasizeMode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTextEditingTarget(e.target)) return

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        if (useDocuverse.getState().overviewOpen) {
          useDocuverse.getState().closeOverview()
          return
        }
        if (useDocuverse.getState().linkFocusId) {
          useDocuverse.getState().closeLinkFocus()
          return
        }
        toggleWorkbench()
        return
      }
      if (e.key === 'Escape') {
        if (useDocuverse.getState().emphasisLinkFromId) {
          e.preventDefault()
          useDocuverse.getState().setEmphasisLinkFrom(null)
          return
        }
        if (useDocuverse.getState().linkFocusId) {
          return
        }
        if (useDocuverse.getState().overviewOpen) {
          return
        }
        if (emphasizeMode) {
          e.preventDefault()
          clearEmphasisDraft()
          setEmphasizeMode(false)
          return
        }
        if (open) {
          e.preventDefault()
          setWorkbenchOpen(false)
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [
    toggleWorkbench,
    emphasizeMode,
    open,
    clearEmphasisDraft,
    setEmphasizeMode,
    setWorkbenchOpen,
  ])

  if (overviewOpen) return null

  const pageIds = emphasisEdges
    .filter((e) => e.strandIndex === currentStrand)
    .map((e) => e.id)

  return (
    <div className="workbench-root" aria-live="polite">
      {emphasisLinkFromId && !open && (
        <div className="workbench-chip link-waiting-chip" role="status">
          <span>建联 · 等待端点 B</span>
          <span className="meta">
            A 在 s{linkFrom?.strandIndex ?? '?'} · 右下角星图左键点另一颗星
          </span>
          <button
            type="button"
            className="corpus-chip"
            onClick={() => setEmphasisLinkFrom(null)}
          >
            取消 A Esc
          </button>
          <button
            type="button"
            className="corpus-chip"
            onClick={() => setWorkbenchOpen(true)}
          >
            工作台
          </button>
        </div>
      )}

      {emphasizeMode && !open && (
        <div className="workbench-chip" role="status">
          <span>强调笔 · 开</span>
          <span className="meta">
            {emphasisLinkFromId
              ? '笔仍开 · 瞄准页再画对端（同一份页数据）'
              : '瞄准选定页 → 左键落笔 · 拉链并行 · H 关'}
            {draftLen > 0 ? ` · ${draftLen} 点` : ''}
          </span>
          <button
            type="button"
            className="corpus-chip"
            onClick={() => {
              clearEmphasisDraft()
              setEmphasizeMode(false)
            }}
          >
            关闭笔 H / Esc
          </button>
          <button
            type="button"
            className="corpus-chip"
            onClick={() => setWorkbenchOpen(true)}
          >
            工作台 Space
          </button>
          {emphasisEdges.length >= 1 && (
            <button
              type="button"
              className="upload-btn"
              onClick={() => enterTetrahedronLens(0)}
              title="用四面体四角机位共面全览所有强调中心"
            >
              四面体全览
            </button>
          )}
        </div>
      )}

      {!open && !emphasizeMode && !emphasisLinkFromId && (
        <div className="workbench-chip-row">
          {emphasisEdges.length >= 1 && (
            <button
              type="button"
              className="workbench-hint"
              onClick={() => enterTetrahedronLens(0)}
              title="四面体共面全览所有强调"
            >
              四面体全览 · {emphasisEdges.length}
            </button>
          )}
          <button
            type="button"
            className="workbench-hint"
            onClick={() => setWorkbenchOpen(true)}
            title="空格打开工作台"
          >
            Space · 工作台
          </button>
        </div>
      )}

      {open && (
        <div
          className="workbench-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setWorkbenchOpen(false)
          }}
        >
          <div
            className="workbench-palette"
            role="dialog"
            aria-modal="true"
            aria-label="文档宇宙工作台"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="workbench-head">
              <div>
                <div className="workbench-title">工作台</div>
                <p className="meta">
                  空格开关 · Esc 关闭 · 建联：Enter 锁 A → 星图点 B
                </p>
              </div>
              <button
                type="button"
                className="corpus-chip workbench-close"
                onClick={() => setWorkbenchOpen(false)}
              >
                关闭
              </button>
            </header>

            <div className="workbench-quick">
              <button
                type="button"
                className={`upload-btn${emphasizeMode ? ' active' : ''}`}
                onClick={() => setEmphasizeMode(!emphasizeMode)}
              >
                {emphasizeMode ? '强调笔已开（H 关）' : '开启强调笔 · H'}
              </button>
              <button
                type="button"
                className="upload-btn"
                style={{ marginTop: 8 }}
                disabled={aiDemoRunning || pages.length < 2}
                onClick={() => {
                  setWorkbenchTab('agent')
                  void runAiProposeAndLinkDemo()
                }}
              >
                {aiDemoRunning
                  ? 'Agent 画圈中…'
                  : '演示 · Agent 画圈并建联'}
              </button>
              {selectedEmphasisId && (
                <button
                  type="button"
                  className="corpus-chip"
                  style={{ marginTop: 8 }}
                  onClick={() => setEmphasisLinkFrom(selectedEmphasisId)}
                >
                  选中 → 端点 A
                </button>
              )}
              <div className="overview-seed-row" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="corpus-chip"
                  disabled={emphasisEdges.length === 0}
                  onClick={() =>
                    openOverview(emphasisEdges.map((e) => e.id))
                  }
                >
                  关联台 · 全部
                </button>
                <button
                  type="button"
                  className="corpus-chip"
                  disabled={pageIds.length === 0}
                  onClick={() => openOverview(pageIds)}
                >
                  本页
                </button>
                <button
                  type="button"
                  className="corpus-chip"
                  disabled={lastAgentHitIds.length === 0}
                  onClick={() => openOverview(lastAgentHitIds)}
                >
                  Agent
                </button>
              </div>
            </div>

            <nav className="workbench-tabs" aria-label="工作台分区">
              {(
                [
                  ['emphasis', '强调 · 建联'],
                  ['beams', '用户射线'],
                  ['agent', 'Agent'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={tab === id ? 'active' : ''}
                  onClick={() => setWorkbenchTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="workbench-body">
              {tab === 'emphasis' && <EmphasisPanel />}
              {tab === 'beams' && <BondBeamPanel />}
              {tab === 'agent' && <EmphasisAgentPanel />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
