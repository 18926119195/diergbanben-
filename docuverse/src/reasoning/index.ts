export type {
  AChunkSource,
  AdjustKind,
  DialogueClosure,
  DirectionRecord,
  FigFace,
  InstructionBundle,
  IntrinsicCoordinate,
  LinkType,
  LlmCallResult,
  LockBox,
  PlaceFaces,
  PlaceKind,
  ReasonEdge,
  RelationKind,
  TextFace,
} from './types'
export {
  classifyIntervalRelation,
  facesToReadout,
  formatRLabel,
  makeFigKey,
  makeIntrinsicKey,
} from './intrinsicKey'
export { textToProbe, cosine } from './lexicalProbe'
export { buildInferBundle, bundleToPrompt } from './bundle'
export { callLlmWithBundle, llmConfigStatus } from './llmClient'
export { useReasoning } from './closureStore'
export {
  aabbIoU,
  buildBookIndex,
  isFigLayoutLabel,
  reembedBookIndex,
  resolveCircleToR,
  resolveVqToCandidates,
} from './pipelineA'
export type { BookIndex, CircleCandidate, CircleResolveResult } from './pipelineA'
export { clearBookIndex, loadBookIndex, saveBookIndex } from './bookIndexStore'
export {
  defaultDualModelConfig,
  dualModelStatus,
  loadDualModelConfig,
  ocrEndpointReady,
  saveDualModelConfig,
} from './modelRuntimeConfig'
export type { DualModelConfig, ModelSlotConfig } from './modelRuntimeConfig'
export { useIndexGate } from './indexGate'
export type { IndexPhase } from './indexGate'
