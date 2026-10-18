/**
 * Manuscriber Plugin — Internal Contract Types
 * Mendefinisikan struktur data naskah, blok teks, staging, dan konfigurasi AI Vision.
 */

export type BlockType =
  | 'matan'
  | 'syarah'
  | 'hasyiah'
  | 'margin'
  | 'nadzom'
  | 'heading'
  | 'header'
  | 'commentary'
  | 'biasa'
  | string

export type LineStatus = 'verified' | 'unverified' | 'review' | 'pending'

export type SpeechStatus = 'idle' | 'playing' | 'paused'
export type SpeechLanguage = 'ar-SA' | 'id-ID' | 'en-US'

export interface BoundingBoxObject {
  ymin: number
  xmin: number
  ymax: number
  xmax: number
}

export type BoundingBox = [number, number, number, number] | BoundingBoxObject

export interface StagingLine {
  id: string
  pageNumber?: number
  pageNo?: number
  bbox?: BoundingBox
  box_2d?: [number, number, number, number]
  originalText?: string
  text: string
  correctedText?: string
  tag?: string
  type?: BlockType
  status: LineStatus
  transliteration?: string
  confidence?: number
  notes?: string
  isRtl?: boolean
  order?: number
}

export type PageTranscriptionStatus = 'idle' | 'transcribing' | 'done' | 'error'

export interface PageMeta {
  pageNumber: number
  status: PageTranscriptionStatus
  error?: string
  linesCount: number
  verifiedCount: number
}

export type { ScanSession } from './store/manuscriberPluginStore'

export interface DictationConfig {
  engine: 'webspeech' | 'groq-whisper'
  lang: 'ar-SA' | 'id-ID' | 'en-US'
  groqApiKey?: string
  groqModel?: string // default 'whisper-large-v3-turbo'
  turatsVocabularyPrompt?: string
}

export interface QuickFixCandidate {
  word: string
  candidates: string[]
  definition?: string
}

export interface VisionProviderConfig {
  baseUrl: string
  apiKey: string
  model: string
  provider?: 'sumopod' | 'groq' | 'openrouter' | 'ollama' | 'custom' | string
  providerName?: string
  providerId?: string
  userPrompt?: string
  activePreset?: string
  promptPreset?: string
  temperature?: number
  /** Jika true (default), otomatis menggunakan Penyedia Analisis Gambar dari Pengaturan GenOffice */
  useGenOfficeSettings?: boolean
}

export interface PromptPresetItem {
  id: string
  title: string
  name?: string
  description: string
  prompt: string
}

export interface TranscriptionResult {
  ok: boolean
  text: string
  html: string
  error?: string
  isRtl?: boolean
}

export type KeyboardInputMode = 'pegon' | 'arabic' | 'harokat'

export interface ManuscriptProjectFile {
  version: string
  name: string
  pdfBufferBase64?: string
  pagesMeta: Record<number, PageMeta>
  lines: StagingLine[]
  history?: {
    past: StagingLine[][]
    future: StagingLine[][]
  }
  createdAt: string
  updatedAt: string
}

// ── Digitizer Studio 1:1 Types ─────────────────────────────────────────────

export type DigitizerLanguageProfile = 'ar' | 'jawa_pegon' | 'sunda_pegon' | 'melayu_klasik' | 'id'

export interface PageMarginLengths {
  top: string
  bottom: string
  left: string
  right: string
}

export interface PageGeometrySpec {
  paperSize: 'B5' | 'A4' | 'Letter' | 'Custom'
  orientation: 'portrait' | 'landscape'
  margins: PageMarginLengths
  hasBorder: boolean
  borderStyle: 'single' | 'double' | 'ornate' | 'none'
  borderColor?: string
  hasShading: boolean
  shadingTone?: string
  nadzomStructure: 'none' | 'two_column_symmetric' | 'multi_couplet'
  estimatedHeadingFontSize: number
  estimatedBodyFontSize: number
  estimatedMarginFontSize: number
  aspectRatio?: number // height / width
  jadwalInsetPercent?: { top: number; bottom: number; left: number; right: number }
  rawAnalysisNotes?: string
}

export interface DigitizerBlock {
  id: string
  pageNo: number
  type: BlockType
  bbox: [number, number, number, number] // [ymin, xmin, ymax, xmax] in 0-1000
  rawOcrText: string
  tahqiqText: string
  confidence?: number
  diffNotes?: string
  status: 'raw' | 'tahqiq_done' | 'verified'
  isRtl?: boolean
}

export interface DigitizerPageData {
  pageNo: number
  status: 'idle' | 'layout_detecting' | 'ocr_extracting' | 'tahqiq_running' | 'completed' | 'error'
  geometry: PageGeometrySpec | null
  blocks: DigitizerBlock[]
  language: DigitizerLanguageProfile
  lastUpdated?: string
  error?: string
}
