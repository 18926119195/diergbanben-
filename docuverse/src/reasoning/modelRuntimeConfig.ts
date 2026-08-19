/**
 * Triple model deployment (project default stack):
 * - OCR: 智谱 glm-ocr（本地 Vite / Vercel `/api/zhipu` 代理 + ZHIPU_API_KEY）
 * - Embed + Chat: 硅基流动同一 Key/Base（推理 DeepSeek-V4-Flash；向量 BAAI/bge-m3）
 * Runtime overrides in localStorage; env = defaults.
 */

export interface ModelSlotConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface DualModelConfig {
  /** 版面/OCR → A1 文字脸与 figure 框 */
  ocr: ModelSlotConfig
  /** 审计 / V_q×V_book 寻址 */
  embed: ModelSlotConfig
  /** 推理 / InstructionBundle → 主模型 */
  reason: ModelSlotConfig
  /** 上传后对「无文字层」页自动跑 OCR */
  autoOcrOnUpload: boolean
}

/** v3: 默认栈改为智谱 OCR + 硅基流动 embed/reason，丢弃旧 OpenAI 本地覆盖 */
const STORAGE_KEY = 'docuverse.models.v3'

const SILICONFLOW_BASE = 'https://api.siliconflow.cn/v1'
const DEFAULT_REASON_MODEL = 'deepseek-ai/DeepSeek-V4-Flash'
/** DeepSeek-V4-Flash 是 Chat；同账号审计向量用硅基流动 embedding 模型 */
const DEFAULT_EMBED_MODEL = 'Qwen/Qwen3-VL-Embedding-8B'

function env(name: string): string {
  const v = import.meta.env[name]
  return typeof v === 'string' ? v.trim() : ''
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function parseSlot(v: unknown, fallback: ModelSlotConfig): ModelSlotConfig {
  if (!isRecord(v)) return fallback
  // Empty localStorage fields fall back to env defaults (so .env.local applies).
  return {
    baseUrl:
      typeof v.baseUrl === 'string' && v.baseUrl.trim()
        ? v.baseUrl.trim()
        : fallback.baseUrl,
    apiKey:
      typeof v.apiKey === 'string' && v.apiKey.trim()
        ? v.apiKey.trim()
        : fallback.apiKey,
    model:
      typeof v.model === 'string' && v.model.trim()
        ? v.model.trim()
        : fallback.model,
  }
}

export function defaultDualModelConfig(): DualModelConfig {
  const siliconBase =
    env('VITE_LLM_BASE_URL') || env('VITE_EMBED_BASE_URL') || SILICONFLOW_BASE
  const siliconKey = env('VITE_LLM_API_KEY') || env('VITE_EMBED_API_KEY') || ''
  return {
    ocr: {
      // 本地 Vite / 线上 Vercel 均走 /api/zhipu；Key 用服务端 ZHIPU_API_KEY
      baseUrl: env('VITE_OCR_BASE_URL') || '/api/zhipu',
      apiKey: env('VITE_OCR_API_KEY') || '',
      model: env('VITE_OCR_MODEL') || 'glm-ocr',
    },
    embed: {
      baseUrl: env('VITE_EMBED_BASE_URL') || siliconBase,
      apiKey: env('VITE_EMBED_API_KEY') || siliconKey,
      model: env('VITE_EMBED_MODEL') || DEFAULT_EMBED_MODEL,
    },
    reason: {
      baseUrl: siliconBase,
      apiKey: siliconKey,
      model: env('VITE_LLM_MODEL') || DEFAULT_REASON_MODEL,
    },
    autoOcrOnUpload: true,
  }
}

function migrateV1(parsed: Record<string, unknown>): DualModelConfig {
  const fallback = defaultDualModelConfig()
  return {
    ocr: fallback.ocr,
    embed: parseSlot(parsed.embed, fallback.embed),
    reason: parseSlot(parsed.reason, fallback.reason),
    autoOcrOnUpload: true,
  }
}

export function loadDualModelConfig(): DualModelConfig {
  const fallback = defaultDualModelConfig()
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY)
    if (rawV2) {
      const parsed: unknown = JSON.parse(rawV2)
      if (!isRecord(parsed)) return fallback
      return {
        ocr: parseSlot(parsed.ocr, fallback.ocr),
        embed: parseSlot(parsed.embed, fallback.embed),
        reason: parseSlot(parsed.reason, fallback.reason),
        autoOcrOnUpload:
          typeof parsed.autoOcrOnUpload === 'boolean'
            ? parsed.autoOcrOnUpload
            : fallback.autoOcrOnUpload,
      }
    }
    const rawV1 = localStorage.getItem('docuverse.models.v1')
    if (rawV1) {
      const parsed: unknown = JSON.parse(rawV1)
      if (isRecord(parsed)) return migrateV1(parsed)
    }
    return fallback
  } catch {
    return fallback
  }
}

export function saveDualModelConfig(cfg: DualModelConfig): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ocr: {
        baseUrl: cfg.ocr.baseUrl.trim(),
        apiKey: cfg.ocr.apiKey.trim(),
        model: cfg.ocr.model.trim(),
      },
      embed: {
        baseUrl: cfg.embed.baseUrl.trim(),
        apiKey: cfg.embed.apiKey.trim(),
        model: cfg.embed.model.trim(),
      },
      reason: {
        baseUrl: cfg.reason.baseUrl.trim(),
        apiKey: cfg.reason.apiKey.trim(),
        model: cfg.reason.model.trim(),
      },
      autoOcrOnUpload: cfg.autoOcrOnUpload,
    }),
  )
}

export function slotConfigured(slot: ModelSlotConfig): boolean {
  return slot.apiKey.trim().length > 0 && slot.model.trim().length > 0
}

/** OCR may use Vite proxy without browser key (server ZHIPU_API_KEY). */
export function ocrEndpointReady(slot: ModelSlotConfig): boolean {
  if (slot.model.trim().length === 0) return false
  if (slot.apiKey.trim().length > 0) return true
  const base = slot.baseUrl.trim()
  return base.startsWith('/api/zhipu') || base.length === 0
}

export function dualModelStatus(cfg: DualModelConfig = loadDualModelConfig()): {
  ocrReady: boolean
  embedReady: boolean
  reasonReady: boolean
  ocrModel: string
  embedModel: string
  reasonModel: string
  autoOcrOnUpload: boolean
} {
  return {
    ocrReady: ocrEndpointReady(cfg.ocr),
    embedReady: slotConfigured(cfg.embed),
    reasonReady: slotConfigured(cfg.reason),
    ocrModel: cfg.ocr.model || '(未设)',
    embedModel: cfg.embed.model || '(未设)',
    reasonModel: cfg.reason.model || '(未设)',
    autoOcrOnUpload: cfg.autoOcrOnUpload,
  }
}
