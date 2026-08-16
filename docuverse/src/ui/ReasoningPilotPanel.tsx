import { useEffect, useMemo, useState } from 'react'
import { useDocuverse } from '../cvs/store'
import { saveBookIndex } from '../reasoning/bookIndexStore'
import { buildInferBundle } from '../reasoning/bundle'
import { useReasoning } from '../reasoning/closureStore'
import { useIndexGate } from '../reasoning/indexGate'
import { formatRLabel } from '../reasoning/intrinsicKey'
import { callLlmWithBundle } from '../reasoning/llmClient'
import {
  loadDualModelConfig,
  saveDualModelConfig,
  dualModelStatus,
  type DualModelConfig,
} from '../reasoning/modelRuntimeConfig'
import { embedConfigStatus } from '../reasoning/embedClient'
import {
  buildBookIndex,
  reembedBookIndex,
  resolveCircleToR,
  resolveVqToCandidates,
} from '../reasoning/pipelineA'
import type { BookIndex, CircleCandidate } from '../reasoning/pipelineA'
import type { LinkType } from '../reasoning/types'

const LEAVE_LINK_OPTIONS: Array<{ id: LinkType; label: string }> = [
  { id: 'none', label: '不继承（只换对象）' },
  { id: 'contrast', label: '对比验证 contrast' },
  { id: 'depend', label: '依赖推导 depend' },
  { id: 'explore', label: '探索发现 explore' },
  { id: 'refine', label: '精炼 refine' },
  { id: 'incremental', label: '增量 incremental' },
]

export function ReasoningPilotPanel() {
  const corpus = useDocuverse((s) => s.corpus)
  const uploadLabel = useDocuverse((s) => s.uploadLabel)
  const pages = useDocuverse((s) => s.pages)
  const selectedEmphasisId = useDocuverse((s) => s.selectedEmphasisId)
  const emphasisEdges = useDocuverse((s) => s.emphasisEdges)
  const ocrByStrand = useDocuverse((s) => s.ocrByStrand)
  const selectEmphasis = useDocuverse((s) => s.selectEmphasis)
  const swoopToPage = useDocuverse((s) => s.swoopToPage)
  const currentStrand = useDocuverse((s) => s.currentStrand)

  const gatedIndex = useIndexGate((s) => s.bookIndex)
  const indexReady = useIndexGate((s) => s.ready)
  const indexPhase = useIndexGate((s) => s.phase)
  const indexMessage = useIndexGate((s) => s.message)
  const setGatedBookIndex = useIndexGate((s) => s.setBookIndex)

  const setCorpus = useReasoning((s) => s.setCorpus)
  const activateResolved = useReasoning((s) => s.activateResolved)
  const setLockFailure = useReasoning((s) => s.setLockFailure)
  const pickCandidate = useReasoning((s) => s.pickCandidate)
  const clearActive = useReasoning((s) => s.clearActive)
  const activeR = useReasoning((s) => s.activeR)
  const activeKey = useReasoning((s) => s.activeKey)
  const activeExcerpt = useReasoning((s) => s.activeExcerpt)
  const lockCandidates = useReasoning((s) => s.lockCandidates)
  const lockError = useReasoning((s) => s.lockError)
  const closures = useReasoning((s) => s.closures)
  const phase = useReasoning((s) => s.phase)
  const lastMatches = useReasoning((s) => s.lastMatches)
  const pendingQuestion = useReasoning((s) => s.pendingQuestion)
  const setPendingQuestion = useReasoning((s) => s.setPendingQuestion)
  const runLocalMatch = useReasoning((s) => s.runLocalMatch)
  const chooseReuse = useReasoning((s) => s.chooseReuse)
  const toggleForbid = useReasoning((s) => s.toggleForbid)
  const forbidIds = useReasoning((s) => s.forbidIds)
  const beginLeave = useReasoning((s) => s.beginLeave)
  const cancelLeave = useReasoning((s) => s.cancelLeave)
  const confirmLeaveToResolved = useReasoning((s) => s.confirmLeaveToResolved)
  const rememberInferResult = useReasoning((s) => s.rememberInferResult)
  const pushLog = useReasoning((s) => s.pushLog)
  const lastLog = useReasoning((s) => s.lastLog)
  const lastConclusion = useReasoning((s) => s.lastConclusion)
  const lastPath = useReasoning((s) => s.lastPath)
  const lastBundle = useReasoning((s) => s.lastBundle)
  const error = useReasoning((s) => s.error)
  const setError = useReasoning((s) => s.setError)
  const setPhase = useReasoning((s) => s.setPhase)
  const pendingEdge = useReasoning((s) => s.pendingEdge)

  const [linkType, setLinkType] = useState<LinkType>('none')
  const [leavePickKey, setLeavePickKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [vqCandidates, setVqCandidates] = useState<CircleCandidate[]>([])
  const [modelCfg, setModelCfg] = useState<DualModelConfig>(() =>
    loadDualModelConfig(),
  )
  const [embedBusy, setEmbedBusy] = useState(false)
  const embed = embedConfigStatus()
  const modelStatus = dualModelStatus(modelCfg)

  const docId = useMemo(() => {
    if (corpus === 'upload' && uploadLabel) return `upload:${uploadLabel}`
    return `corpus:${corpus}`
  }, [corpus, uploadLabel])

  const baseIndex = useMemo(
    () => buildBookIndex({ docId, pages, ocrByStrand }),
    [docId, pages, ocrByStrand],
  )

  const bookIndex: BookIndex =
    gatedIndex && gatedIndex.docId === docId ? gatedIndex : baseIndex

  useEffect(() => {
    // Keep local fallback in sync when gate empty (e.g. demo corpus)
    if (!gatedIndex || gatedIndex.docId !== docId) {
      saveBookIndex(baseIndex)
    }
  }, [baseIndex, gatedIndex, docId])

  useEffect(() => {
    setCorpus(corpus)
  }, [corpus, setCorpus])

  const indexStats = useMemo(() => {
    let dual = 0
    let figOnly = 0
    let textOnly = 0
    for (const c of bookIndex.chunks) {
      const t = Boolean(c.faces.text)
      const f = Boolean(c.faces.fig)
      if (t && f) dual += 1
      else if (f) figOnly += 1
      else textOnly += 1
    }
    return {
      total: bookIndex.chunks.length,
      dual,
      figOnly,
      textOnly,
    }
  }, [bookIndex])

  const onSaveModels = () => {
    saveDualModelConfig(modelCfg)
    pushLog(
      `模型部署已保存 · OCR=${modelCfg.ocr.model || '空'} · 审计=${modelCfg.embed.model || '空'} · 推理=${modelCfg.reason.model || '空'} · 上传自动OCR=${modelCfg.autoOcrOnUpload ? '开' : '关'}`,
    )
    setError(null)
  }

  const onReembed = async () => {
    setEmbedBusy(true)
    setError(null)
    try {
      const { index, usedApi } = await reembedBookIndex(bookIndex)
      setGatedBookIndex(index, true)
      pushLog(
        usedApi
          ? `审计 Embedding 已重算 V_book · ${index.chunks.length} 原子 · ${modelCfg.embed.model}`
          : `未配置审计 Key，V_book 仍用本地假向量 · ${index.chunks.length} 原子`,
      )
      if (!usedApi) {
        setError(
          '审计 Embedding 未配置 API Key：V_book 仍是假向量。请在下方「模型部署」填写后保存，再点重算。',
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setEmbedBusy(false)
    }
  }

  const focusCandidate = (c: CircleCandidate, list: CircleCandidate[]) => {
    activateResolved({ chosen: c, candidates: list })
    if (c.R.page !== currentStrand) {
      swoopToPage(c.R.page)
    }
    pushLog(`定位锁 · p${c.R.page} · ${c.R.key}`)
  }

  const selectedEdge = selectedEmphasisId
    ? emphasisEdges.find((e) => e.id === selectedEmphasisId)
    : undefined

  useEffect(() => {
    if (useReasoning.getState().phase === 'leave_pick_target') return
    if (!selectedEmphasisId) {
      clearActive()
      return
    }
    const edge = emphasisEdges.find((e) => e.id === selectedEmphasisId)
    if (!edge) return
    const resolved = resolveCircleToR(edge, bookIndex)
    if (!resolved.ok) {
      setLockFailure(resolved.message)
      return
    }
    setVqCandidates([])
    activateResolved({
      chosen: resolved.chosen,
      candidates: resolved.candidates,
    })
  }, [
    selectedEmphasisId,
    emphasisEdges,
    bookIndex,
    activateResolved,
    setLockFailure,
    clearActive,
  ])

  const leaveResolved = useMemo(() => {
    if (phase !== 'leave_pick_target' || !selectedEdge) return null
    return resolveCircleToR(selectedEdge, bookIndex)
  }, [phase, selectedEdge, bookIndex])

  const leaveChosen =
    leaveResolved && leaveResolved.ok
      ? (leaveResolved.candidates.find((c) => c.R.key === leavePickKey) ??
        leaveResolved.chosen)
      : null

  const canAskVq =
    indexReady ||
    (corpus !== 'upload' &&
      bookIndex.chunks.length > 0 &&
      indexPhase !== 'ocr' &&
      indexPhase !== 'embedding' &&
      indexPhase !== 'importing')

  const activeClosure = activeKey ? closures[activeKey] : null
  const locked = Boolean(activeR && activeExcerpt.trim())

  const onMatch = () => {
    const q = pendingQuestion.trim()
    if (!q) {
      setError('请先输入问题')
      return
    }
    if (!locked || !activeR) {
      setError('请先圈定并命中 A 管线原文（分析对象为空则禁止推理）')
      return
    }
    runLocalMatch(q)
  }

  const onVqAnchor = () => {
    void (async () => {
      const q = pendingQuestion.trim()
      if (!q) {
        setError('请先输入问题，再做 V_q 对象锚定')
        return
      }
      if (!canAskVq) {
        setError('索引未就绪：请先完成上传流水线（OCR → Embedding）')
        return
      }
      if (useReasoning.getState().phase === 'leave_pick_target') {
        setError('退房再入中请用圈定选对象')
        return
      }
      setBusy(true)
      try {
        const { candidates: cands, weakFigOnly, usedEmbedApi } =
          await resolveVqToCandidates(bookIndex, q, 5)
        if (cands.length === 0) {
          setVqCandidates([])
          setLockFailure('A1 表为空或问题无效，无法 V_q 锚定')
          return
        }
        setVqCandidates(cands)
        focusCandidate(cands[0], cands)
        pushLog(
          `V_q 锚定 · Top-${cands.length} · 首选 ${cands[0].R.key} · score=${cands[0].score.toFixed(3)} · ${
            usedEmbedApi ? `审计API ${embed.model}` : '假向量probe'
          }${weakFigOnly ? ' · 弱模式：全书仅全页图脸' : ''}`,
        )
        if (weakFigOnly) {
          setError(
            '本书 A1 仍偏「仅图」。点击下方候选可跳页高亮；要内容检索请确保 OCR 成功。',
          )
        } else if (!usedEmbedApi) {
          setError(
            '审计 Embedding 未配置：当前用假向量排序。请在「模型部署」填写 Embedding 并「重算 V_book」。',
          )
        } else {
          setError(null)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    })()
  }

  const onInferStay = async () => {
    const q = pendingQuestion.trim()
    if (!q || !activeR || !activeClosure || !activeExcerpt.trim()) return
    setBusy(true)
    setError(null)
    setPhase('busy')
    try {
      const forbid = activeClosure.directions.filter((d) =>
        forbidIds.includes(d.directionId),
      )
      const bundle = buildInferBundle({
        R: activeR,
        sourceExcerpt: activeExcerpt,
        question: q,
        forbid,
        edge: pendingEdge ?? undefined,
        premise:
          pendingEdge &&
          pendingEdge.linkType !== 'none' &&
          pendingEdge.premiseConclusion
            ? {
                conclusion: pendingEdge.premiseConclusion,
                pathSummary: pendingEdge.premisePath ?? '',
                fromKey: pendingEdge.fromKey,
              }
            : undefined,
      })
      pushLog(
        `打包推理 · R=[${activeR.start},${activeR.end}) · ${activeExcerpt.length}字 · forbid=${forbid.length}`,
      )
      const result = await callLlmWithBundle(bundle)
      if (!result.ok) {
        setError(result.error ?? '调用失败')
        setPhase('in_closure')
        return
      }
      rememberInferResult({
        bundle: {
          ...bundle,
          meta: {
            ...bundle.meta,
            calledModel: !result.usedMock,
          },
        },
        question: q,
        path: result.path,
        conclusion: result.conclusion,
      })
      pushLog(result.usedMock ? '使用 Mock 模型' : '真实 LLM 调用成功')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('in_closure')
    } finally {
      setBusy(false)
    }
  }

  const onConfirmLeaveTarget = () => {
    if (phase !== 'leave_pick_target') return
    if (!leaveChosen) {
      setError(
        leaveResolved && !leaveResolved.ok
          ? leaveResolved.message
          : '新圈定未落到 A 原文，不能再入',
      )
      return
    }
    confirmLeaveToResolved(leaveChosen, linkType)
    if (selectedEdge) selectEmphasis(selectedEdge.id)
    setLeavePickKey(null)
  }

  return (
    <aside className="reasoning-pilot" aria-label="推理驾驭面板">
      <header className="reasoning-pilot-head">
        <div className="reasoning-pilot-title">推理驾驭 · Pilot</div>
        <div className="reasoning-pilot-sub">
          A1 上传即建表 · 圈定/V_q 寻址 ·{' '}
          {modelStatus.ocrReady
            ? `OCR ${modelStatus.ocrModel}`
            : 'OCR=未接'}{' '}
          ·{' '}
          {modelStatus.embedReady
            ? `审计 ${modelStatus.embedModel}`
            : '审计=假向量'}{' '}
          ·{' '}
          {modelStatus.reasonReady
            ? `推理 ${modelStatus.reasonModel}`
            : '推理=Mock'}
        </div>
      </header>

      <section className="reasoning-block">
        <h3>模型部署</h3>
        <p className="reasoning-muted">
          三槽分职：OCR 建文字/图块 → Embedding 审计寻址 → Chat
          留房推理。可同一家 Key；保存写入本机。上传可自动串 OCR。
        </p>
        <p className="reasoning-mono">OCR / 版面（建 A1 字脸）</p>
        <input
          className="reasoning-input"
          placeholder="Base URL（默认 /api/zhipu）"
          value={modelCfg.ocr.baseUrl}
          onChange={(e) =>
            setModelCfg({
              ...modelCfg,
              ocr: { ...modelCfg.ocr, baseUrl: e.target.value },
            })
          }
        />
        <input
          className="reasoning-input"
          placeholder="API Key（空则用 Vite 代理侧 ZHIPU_API_KEY）"
          type="password"
          autoComplete="off"
          value={modelCfg.ocr.apiKey}
          onChange={(e) =>
            setModelCfg({
              ...modelCfg,
              ocr: { ...modelCfg.ocr, apiKey: e.target.value },
            })
          }
        />
        <input
          className="reasoning-input"
          placeholder="Model（如 glm-ocr）"
          value={modelCfg.ocr.model}
          onChange={(e) =>
            setModelCfg({
              ...modelCfg,
              ocr: { ...modelCfg.ocr, model: e.target.value },
            })
          }
        />
        <label className="reasoning-muted" style={{ display: 'block', marginTop: 8 }}>
          <input
            type="checkbox"
            checked={modelCfg.autoOcrOnUpload}
            onChange={(e) =>
              setModelCfg({
                ...modelCfg,
                autoOcrOnUpload: e.target.checked,
              })
            }
          />{' '}
          上传后对无文字层页自动 OCR（最多 40 页）
        </label>
        <p className="reasoning-mono">审计（Embedding）</p>
        <input
          className="reasoning-input"
          placeholder="Base URL"
          value={modelCfg.embed.baseUrl}
          onChange={(e) =>
            setModelCfg({
              ...modelCfg,
              embed: { ...modelCfg.embed, baseUrl: e.target.value },
            })
          }
        />
        <input
          className="reasoning-input"
          placeholder="API Key"
          type="password"
          autoComplete="off"
          value={modelCfg.embed.apiKey}
          onChange={(e) =>
            setModelCfg({
              ...modelCfg,
              embed: { ...modelCfg.embed, apiKey: e.target.value },
            })
          }
        />
        <input
          className="reasoning-input"
          placeholder="Model（如 text-embedding-3-small）"
          value={modelCfg.embed.model}
          onChange={(e) =>
            setModelCfg({
              ...modelCfg,
              embed: { ...modelCfg.embed, model: e.target.value },
            })
          }
        />
        <p className="reasoning-mono">推理（Chat）</p>
        <input
          className="reasoning-input"
          placeholder="Base URL"
          value={modelCfg.reason.baseUrl}
          onChange={(e) =>
            setModelCfg({
              ...modelCfg,
              reason: { ...modelCfg.reason, baseUrl: e.target.value },
            })
          }
        />
        <input
          className="reasoning-input"
          placeholder="API Key"
          type="password"
          autoComplete="off"
          value={modelCfg.reason.apiKey}
          onChange={(e) =>
            setModelCfg({
              ...modelCfg,
              reason: { ...modelCfg.reason, apiKey: e.target.value },
            })
          }
        />
        <input
          className="reasoning-input"
          placeholder="Model（如 gpt-4o-mini）"
          value={modelCfg.reason.model}
          onChange={(e) =>
            setModelCfg({
              ...modelCfg,
              reason: { ...modelCfg.reason, model: e.target.value },
            })
          }
        />
        <div className="reasoning-actions">
          <button type="button" className="upload-btn" onClick={onSaveModels}>
            保存部署
          </button>
          <button
            type="button"
            className="upload-btn"
            onClick={() => void onReembed()}
            disabled={embedBusy || bookIndex.chunks.length === 0}
          >
            {embedBusy ? '重算中…' : '用审计模型重算 V_book'}
          </button>
        </div>
        <p className="reasoning-muted">
          状态：OCR {modelStatus.ocrReady ? '可用' : '未接'} / 审计{' '}
          {modelStatus.embedReady ? '已接' : '未接'} / 推理{' '}
          {modelStatus.reasonReady ? '已接' : 'Mock'}
          {modelStatus.autoOcrOnUpload ? ' · 上传自动 OCR 开' : ''}
        </p>
      </section>

      <section className="reasoning-block">
        <h3>A1 索引</h3>
        <p className="reasoning-muted">
          门控：{indexPhase}
          {indexReady ? ' ✓就绪' : ' · 未就绪'} — {indexMessage}
        </p>
        <p className="reasoning-muted">
          原子 {indexStats.total} · 两面一体 {indexStats.dual} · 仅图{' '}
          {indexStats.figOnly} · 仅字 {indexStats.textOnly}
        </p>
        {indexStats.total > 0 &&
          indexStats.figOnly === indexStats.total && (
            <p className="reasoning-error">
              全书无文字原子：PDF 文字层为空或 OCR 未出字。V_q
              内容检索弱；请检查 OCR 或圈定目标页。
            </p>
          )}
      </section>

      <section className="reasoning-block">
        <h3>当前分析对象</h3>
        {activeR && locked ? (
          <>
            <p className="reasoning-mono">{formatRLabel(activeR)}</p>
            <p className="reasoning-muted">{activeR.key}</p>
            <p className="reasoning-muted">
              方向数：{activeClosure?.directions.length ?? 0} · phase={phase} · A块{' '}
              {activeR.chunkIds.length}
            </p>
          </>
        ) : (
          <p className="reasoning-muted">
            用 H 笔圈选，或先输入问题点「V_q 锚定」。有页图的文字锁强制带图脸。
          </p>
        )}
      </section>

      <section className="reasoning-block">
        <h3>A1 机器读值（审计）</h3>
        {locked && activeR ? (
          <>
            <p className="reasoning-muted">
              kind={activeR.kind}
              {activeR.faces.text ? ' · 文字脸' : ''}
              {activeR.faces.fig
                ? ` · 图脸(${activeR.faces.fig.figId})`
                : ''}{' '}
              · 人侧请看页上绿虚线框（真视觉）
            </p>
            <pre className="reasoning-excerpt">{activeExcerpt}</pre>
          </>
        ) : (
          <p className="reasoning-muted">
            {lockError ?? '尚未锁定。模型不会收到圈外文字或整页 OCR。'}
          </p>
        )}
      </section>

      {lockCandidates.length > 1 &&
        vqCandidates.length === 0 &&
        phase !== 'leave_pick_target' && (
        <section className="reasoning-block">
          <h3>灰度书区 · 确认精确 R*</h3>
          <p className="reasoning-muted">
            圈定命中不相邻的多段原文。进房键必须是精确区间，请点选一段。
          </p>
          <ul className="reasoning-list">
            {lockCandidates.map((c) => (
              <li key={c.R.key}>
                <button
                  type="button"
                  className={
                    c.R.key === activeKey
                      ? 'upload-btn reasoning-cand-on'
                      : 'upload-btn'
                  }
                  onClick={() => focusCandidate(c, lockCandidates)}
                >
                  [{c.R.kind}] {c.R.kind === 'fig' ? c.R.figId : `[${c.R.start},${c.R.end})`} · score={c.score.toFixed(2)}
                </button>
                <p className="reasoning-muted">{c.excerpt.slice(0, 80)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="reasoning-block">
        <h3>提问</h3>
        {!canAskVq && (
          <p className="reasoning-error">
            等待索引就绪后才能 V_q（上传 → OCR → Embedding）。圈定仍可随时用。
          </p>
        )}
        <textarea
          className="reasoning-input"
          rows={3}
          value={pendingQuestion}
          onChange={(e) => setPendingQuestion(e.target.value)}
          placeholder={
            canAskVq
              ? '输入问题 → V_q 锚定 → 点候选跳页高亮…'
              : '索引未就绪，请先完成上传流水线…'
          }
          disabled={!canAskVq || phase === 'leave_pick_target' || busy}
        />
        <div className="reasoning-actions">
          <button
            type="button"
            className="upload-btn"
            onClick={onVqAnchor}
            disabled={!canAskVq || busy || phase === 'leave_pick_target'}
          >
            V_q 锚定对象
          </button>
          <button
            type="button"
            className="upload-btn"
            onClick={onMatch}
            disabled={!locked || busy}
          >
            房内比对方向
          </button>
          <button
            type="button"
            className="upload-btn"
            onClick={() => void onInferStay()}
            disabled={!locked || busy || phase === 'leave_pick_target'}
          >
            {busy ? '推理中…' : '留房推理（可带负面清单）'}
          </button>
        </div>
      </section>

      {vqCandidates.length > 0 && phase !== 'leave_pick_target' && (
        <section className="reasoning-block">
          <h3>V_q 候选 · 点击跳页高亮</h3>
          <p className="reasoning-muted">
            每个候选是一把精确 key*。点击 → 跳到该页并显示绿虚线框（bbox）。
          </p>
          <ul className="reasoning-list">
            {vqCandidates.map((c) => (
              <li key={`vq-${c.R.key}`}>
                <button
                  type="button"
                  className={
                    c.R.key === activeKey
                      ? 'upload-btn reasoning-cand-on'
                      : 'upload-btn'
                  }
                  onClick={() => focusCandidate(c, vqCandidates)}
                >
                  [{c.R.kind}] score={c.score.toFixed(3)} · p{c.R.page} ·{' '}
                  {c.R.kind === 'fig' ? c.R.figId : `[${c.R.start},${c.R.end})`}
                </button>
                <p className="reasoning-muted">{c.excerpt.slice(0, 80)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lastMatches.length > 0 && (
        <section className="reasoning-block">
          <h3>近似方向 · 审核</h3>
          <ul className="reasoning-list">
            {lastMatches.map((m) => (
              <li key={m.direction.directionId}>
                <div className="reasoning-hit">
                  <span className="reasoning-mono">
                    sim={m.score.toFixed(2)}
                  </span>
                  <p>{m.direction.questionText}</p>
                  <p className="reasoning-muted">
                    {m.direction.conclusion.slice(0, 100)}
                  </p>
                  <div className="reasoning-actions">
                    <button
                      type="button"
                      className="upload-btn"
                      onClick={() => chooseReuse(m.direction.directionId)}
                    >
                      复用（停止）
                    </button>
                    <button
                      type="button"
                      className="upload-btn"
                      onClick={() => toggleForbid(m.direction.directionId)}
                    >
                      {forbidIds.includes(m.direction.directionId)
                        ? '已加入排除'
                        : '排除此方向'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="upload-btn" onClick={beginLeave}>
            不留在该闭包 · 退房
          </button>
        </section>
      )}

      {phase === 'leave_pick_target' && (
        <section className="reasoning-block leave">
          <h3>B1 再入 · 选新对象</h3>
          <p className="reasoning-muted">
            再圈/点选另一强调。新对象必须同样命中 A 原文。partial 禁止自动强继承。
          </p>
          {leaveResolved && !leaveResolved.ok && (
            <p className="reasoning-error">{leaveResolved.message}</p>
          )}
          {leaveResolved && leaveResolved.ok && leaveResolved.candidates.length > 1 && (
            <ul className="reasoning-list">
              {leaveResolved.candidates.map((c) => (
                <li key={c.R.key}>
                  <button
                    type="button"
                    className={
                      (leavePickKey ?? leaveResolved.chosen.R.key) === c.R.key
                        ? 'upload-btn reasoning-cand-on'
                        : 'upload-btn'
                    }
                    onClick={() => setLeavePickKey(c.R.key)}
                  >
                    [{c.R.start},{c.R.end}) · {c.excerpt.slice(0, 36)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {leaveChosen && (
            <pre className="reasoning-excerpt">{leaveChosen.excerpt}</pre>
          )}
          <select
            className="reasoning-select"
            value={linkType}
            onChange={(e) => {
              const v = e.target.value
              const hit = LEAVE_LINK_OPTIONS.find((o) => o.id === v)
              if (hit) setLinkType(hit.id)
            }}
          >
            {LEAVE_LINK_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="reasoning-actions">
            <button
              type="button"
              className="upload-btn"
              onClick={onConfirmLeaveTarget}
              disabled={!leaveChosen}
            >
              确认再入所选强调
            </button>
            <button type="button" className="upload-btn" onClick={cancelLeave}>
              取消
            </button>
          </div>
        </section>
      )}

      {(lastConclusion || lastPath) && (
        <section className="reasoning-block">
          <h3>最近结论</h3>
          {lastPath && <pre className="reasoning-pre">{lastPath}</pre>}
          {lastConclusion && <p>{lastConclusion}</p>}
        </section>
      )}

      {lastBundle && (
        <section className="reasoning-block">
          <h3>最近 Bundle 摘要</h3>
          <pre className="reasoning-pre">
            {JSON.stringify(
              {
                key: lastBundle.closureKey,
                interval: [lastBundle.R.start, lastBundle.R.end],
                excerptChars: lastBundle.sourceExcerpt.length,
                forbid: lastBundle.forbidDirections.length,
                edge: lastBundle.edge?.linkType ?? null,
                calledModel: lastBundle.meta.calledModel,
              },
              null,
              2,
            )}
          </pre>
        </section>
      )}

      {error && <p className="reasoning-error">{error}</p>}

      <section className="reasoning-block">
        <h3>日志</h3>
        <ul className="reasoning-log">
          {lastLog.map((line) => {
            const sep = line.indexOf('|')
            const key = sep > 0 ? line.slice(0, sep) : line
            const text = sep > 0 ? line.slice(sep + 1) : line
            return <li key={key}>{text}</li>
          })}
        </ul>
      </section>
    </aside>
  )
}
