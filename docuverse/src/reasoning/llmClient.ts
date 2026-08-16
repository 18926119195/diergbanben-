import { bundleToPrompt } from './bundle'
import { loadDualModelConfig, slotConfigured } from './modelRuntimeConfig'
import type { InstructionBundle, LlmCallResult } from './types'

export function llmConfigStatus(): {
  configured: boolean
  baseUrl: string
  model: string
} {
  const { reason } = loadDualModelConfig()
  return {
    configured: slotConfigured(reason),
    baseUrl: reason.baseUrl || 'https://api.openai.com/v1',
    model: reason.model || 'gpt-4o-mini',
  }
}

function mockInfer(bundle: InstructionBundle): LlmCallResult {
  const forbidNote =
    bundle.forbidDirections.length > 0
      ? `已排除 ${bundle.forbidDirections.length} 条旧方向。`
      : '无负面清单。'
  const edgeNote = bundle.edge
    ? `跨对象边 ${bundle.edge.linkType}（${bundle.edge.relation}/${bundle.edge.adjust ?? '-'}）。`
    : '无跨对象边。'
  const excerpt = bundle.sourceExcerpt.slice(0, 160)
  return {
    ok: true,
    usedMock: true,
    path: [
      '1. 锁定分析对象摘录',
      '2. 应用禁止方向（若有）',
      '3. 在对象内形成结论（演示 mock，未调用远端模型）',
    ].join('\n'),
    conclusion: [
      `【Mock 结论】针对问题「${bundle.question}」。`,
      forbidNote,
      edgeNote,
      `对象摘录节选：${excerpt}${bundle.sourceExcerpt.length > 160 ? '…' : ''}`,
      '（在「模型部署 · 推理」填入 API Key 后可改为真实模型）',
    ].join(' '),
  }
}

function parseModelText(text: string): { path: string; conclusion: string } {
  const pathMatch = text.match(
    /(?:推理路径|路径)\s*[:：]?\s*([\s\S]*?)(?=(?:结论|$))/i,
  )
  const concMatch = text.match(/(?:结论)\s*[:：]?\s*([\s\S]*?)$/i)
  const path = pathMatch?.[1]?.trim() || text.slice(0, 400)
  const conclusion = concMatch?.[1]?.trim() || text.slice(0, 800)
  return { path, conclusion }
}

export async function callLlmWithBundle(
  bundle: InstructionBundle,
): Promise<LlmCallResult> {
  const { reason } = loadDualModelConfig()
  if (!slotConfigured(reason)) {
    return mockInfer(bundle)
  }

  const prompt = bundleToPrompt(bundle)
  const url = `${reason.baseUrl.replace(/\/$/, '')}/chat/completions`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${reason.apiKey}`,
      },
      body: JSON.stringify({
        model: reason.model,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              '你是严谨的教材分析助手。只依据用户提供的分析对象原文作答，不要编造对象外事实。',
          },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      return {
        ok: false,
        usedMock: false,
        path: '',
        conclusion: '',
        error: `LLM HTTP ${res.status}: ${errText.slice(0, 240)}`,
      }
    }
    const data: unknown = await res.json()
    if (
      typeof data !== 'object' ||
      data === null ||
      !('choices' in data) ||
      !Array.isArray((data as { choices: unknown }).choices)
    ) {
      return {
        ok: false,
        usedMock: false,
        path: '',
        conclusion: '',
        error: 'LLM 响应格式异常',
      }
    }
    const choices = (
      data as { choices: Array<{ message?: { content?: string } }> }
    ).choices
    const content = choices[0]?.message?.content ?? ''
    const parsed = parseModelText(content)
    return {
      ok: true,
      usedMock: false,
      path: parsed.path,
      conclusion: parsed.conclusion,
      raw: content,
    }
  } catch (e) {
    return {
      ok: false,
      usedMock: false,
      path: '',
      conclusion: '',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
