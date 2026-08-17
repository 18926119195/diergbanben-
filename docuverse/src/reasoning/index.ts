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
  makeComboKey,
  makeFigKey,
  makeIntrinsicKey,
  makeSlotKey,
  stableShortHash,
} from './intrinsicKey'
export {
  fullSlotMember,
  spanToPct,
} from './ocrSlot'
export type { SlotMemberRef } from './ocrSlot'
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
export {
  atomSearchText,
  hybridRank,
  isRetrievableAtom,
  scoreGapAllowsAutoLock,
  tokenizeQuery,
} from './hybridRetrieve'
export {
  structureChunkBlocks,
  externalBlocksToPageChunks,
} from './structureChunk'
export type { ExternalLayoutBlock, StructureChunkOptions } from './structureChunk'
export {
  expandQueryForRetrieval,
  shouldExpandQuery,
} from './queryExpand'
export type { QueryExpandResult } from './queryExpand'
export {
  refineCandidateBoxes,
  refineCandidateBoxesAsync,
  resolveInkBoxes,
  normalizeInkText,
} from './inkHighlight'
export type { InkRefineResult } from './inkHighlight'
export {
  collectPageSlotRows,
  exportPageSlotDataset,
} from './slotDatasetExport'
export type { SlotLabelRow } from './slotDatasetExport'
