import type {
  DirectionRecord,
  InstructionBundle,
  IntrinsicCoordinate,
  ReasonEdge,
} from './types'

export function buildInferBundle(input: {
  R: IntrinsicCoordinate
  sourceExcerpt: string
  question: string
  forbid: DirectionRecord[]
  edge?: ReasonEdge
  premise?: InstructionBundle['premise']
}): InstructionBundle {
  const excerpt = input.sourceExcerpt.trim()
  if (!excerpt) {
    throw new Error('禁止打包：分析对象机器读值为空（未落到 A1 原子）')
  }
  if (!input.R.faces.text && !input.R.faces.fig) {
    throw new Error('禁止打包：位置锁缺少文字脸与图脸')
  }
  if (input.R.kind === 'text' && input.R.end <= input.R.start) {
    throw new Error('禁止打包：文字脸内禀坐标区间无效')
  }
  if (input.R.kind === 'fig' && !input.R.figId) {
    throw new Error('禁止打包：图主锁缺少 figId')
  }

  return {
    R: input.R,
    sourceExcerpt: excerpt,
    closureKey: input.R.key,
    question: input.question.trim(),
    forbidDirections: input.forbid.map((d) => ({
      directionId: d.directionId,
      questionSummary: d.questionText.slice(0, 80),
      conclusionSummary: d.conclusion.slice(0, 120),
    })),
    edge: input.edge,
    premise: input.premise,
    policy: {
      mustGroundToExcerpt: true,
      disallowOutsideR: true,
    },
    meta: {
      mode: 'infer',
      calledModel: true,
      at: Date.now(),
    },
  }
}

export function bundleToPrompt(bundle: InstructionBundle): string {
  const forbidBlock =
    bundle.forbidDirections.length === 0
      ? '（无）'
      : bundle.forbidDirections
          .map(
            (f, i) =>
              `${i + 1}. 勿沿此方向：问「${f.questionSummary}」→ 旧结论「${f.conclusionSummary}」`,
          )
          .join('\n')

  const edgeBlock = bundle.edge
    ? [
        `推理边: ${bundle.edge.fromKey} → ${bundle.edge.toKey}`,
        `relation=${bundle.edge.relation} adjust=${bundle.edge.adjust ?? '-'} linkType=${bundle.edge.linkType}`,
        bundle.edge.premiseConclusion
          ? `边前提结论: ${bundle.edge.premiseConclusion}`
          : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '（无跨对象边）'

  const premiseBlock = bundle.premise
    ? `增量/继承前提（来自 ${bundle.premise.fromKey}）:\n${bundle.premise.conclusion}\n路径: ${bundle.premise.pathSummary}`
    : '（无）'

  const faceTags = [
    bundle.R.faces.text ? '文字脸' : null,
    bundle.R.faces.fig ? '图脸' : null,
  ]
    .filter((x): x is string => Boolean(x))
    .join('+')

  const imageRef = bundle.R.faces.fig?.imageRef
  const imageLine = imageRef
    ? `【图脸载荷 imageRef】${imageRef.startsWith('data:') ? '(页图 data URI，已附着于会话页)' : imageRef}`
    : bundle.R.faces.fig
      ? '【图脸载荷】无独立 URL；请对照用户可见的同页版面（与文字脸同锁）。'
      : null

  const objectBlock = [
    `【位置锁 kind】${bundle.R.kind}（决定 key* 公式）`,
    `【脸】${faceTags || '（无）'}`,
    bundle.R.kind === 'fig'
      ? `【figId】${bundle.R.figId ?? ''}`
      : `【字符区间】[${bundle.R.start}, ${bundle.R.end})`,
    `【页】${bundle.R.page}`,
    imageLine,
    '【机器读值 · 一锁两脸】',
    bundle.sourceExcerpt,
    '',
    '必须只依据上述读值作答。禁止离开该 key* 引用圈外段落、页标题或未提供的文字；有图脸时勿编造未给出的图内文字。OCR 与图不一致时以同锁对照说明，勿另起分析对象。',
  ]
    .filter((line): line is string => line !== null && line !== undefined)
    .join('\n')

  return [
    '你是教材分析助手。',
    `【分析对象坐标 key*】${bundle.R.key}`,
    objectBlock,
    '若依据不足，明确说依据不足，不要离开该锁编造。',
    '',
    '【禁止重复的旧方向】',
    forbidBlock,
    '',
    '【跨对象推理边】',
    edgeBlock,
    '',
    '【前提】',
    premiseBlock,
    '',
    `【用户问题】${bundle.question}`,
    '',
    '请输出：',
    '1) 推理路径（简短步骤）',
    '2) 结论（面向教师，可执行）',
  ].join('\n')
}
