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

export interface VisionProviderConfig {
  baseUrl: string
  apiKey: string
  model: string
  provider?: 'sumopod' | 'openrouter' | 'ollama' | 'custom' | string
  providerName?: string
  providerId?: string
  userPrompt?: string
  activePreset?: string
  promptPreset?: string
  temperature?: number
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

export type KeyboardInputMode = 'pegon' | 'translit' | 'arabic'

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
