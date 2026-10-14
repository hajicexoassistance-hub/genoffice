/**
 * Manuscriber Project (.manus) Pack & Unpack Utilities
 * Bundles the Word document (content.docx), the source PDF (source.pdf),
 * and project metadata (project.json) into a single portable zip archive.
 */
import JSZip from 'jszip'
import type { StagingLine, StagingHistorySession } from './ManuscriberStagingStore'

export type PageTranscriptionStatus = 'idle' | 'transcribing' | 'done' | 'error'

export interface ManusProjectMetadata {
  version: string
  projectType: 'manuscriber'
  name: string
  createdAt: string
  updatedAt: string
  pdf: {
    originalName: string
    totalPages: number
    lastActivePage: number
    lastZoom: number
    pageStatuses: Record<number, PageTranscriptionStatus>
    pageErrors?: Record<number, string>
  }
  settings?: {
    promptPreset?: string
    syncMode?: string
    [key: string]: unknown
  }
  stagingState?: {
    isOpen: boolean
    activeLineId: string | null
    pageNo: number
    lines: StagingLine[]
    history?: StagingHistorySession[]
  }
}

export interface UnpackedManusProject {
  docxData: ArrayBuffer
  pdfData: ArrayBuffer
  metadata: ManusProjectMetadata
}

export function isManusProjectFile(fileNameOrPath: string): boolean {
  const lower = fileNameOrPath.toLowerCase()
  return (
    lower.endsWith('.manus') ||
    lower.endsWith('.manuscriber') ||
    lower.endsWith('.mnsproj')
  )
}

export async function packManusProject(params: {
  docxBytes: Uint8Array | ArrayBuffer
  pdfBytes: Uint8Array | ArrayBuffer
  metadata: ManusProjectMetadata
}): Promise<Uint8Array> {
  const zip = new JSZip()

  // 1. Project Manifest
  zip.file('project.json', JSON.stringify(params.metadata, null, 2))

  // 2. Active Word Document
  const docxData =
    params.docxBytes instanceof Uint8Array
      ? params.docxBytes.slice(0)
      : new Uint8Array(params.docxBytes).slice(0)
  zip.file('content.docx', docxData)

  // 3. Source PDF Manuscript
  const pdfData =
    params.pdfBytes instanceof Uint8Array
      ? params.pdfBytes.slice(0)
      : new Uint8Array(params.pdfBytes).slice(0)
  zip.file('source.pdf', pdfData)

  const content = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return content
}

export async function unpackManusProject(data: ArrayBuffer | Uint8Array): Promise<UnpackedManusProject> {
  const byteLen = data instanceof Uint8Array ? data.byteLength : data?.byteLength ?? 0
  if (byteLen < 20) {
    throw new Error('File proyek .manus kosong atau tidak valid (0 bytes).')
  }

  const zip = await JSZip.loadAsync(data)

  // 1. Recover Metadata
  let metadata: ManusProjectMetadata = {
    version: '1.0.0',
    projectType: 'manuscriber',
    name: 'Manuskrip',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pdf: {
      originalName: 'manuskrip.pdf',
      totalPages: 1,
      lastActivePage: 1,
      lastZoom: 1.0,
      pageStatuses: {},
    },
  }

  const manifestFile = zip.file('project.json')
  if (manifestFile) {
    try {
      const manifestText = await manifestFile.async('text')
      const parsed = JSON.parse(manifestText) as ManusProjectMetadata
      if (parsed && typeof parsed === 'object') {
        metadata = { ...metadata, ...parsed }
      }
    } catch (manifestErr) {
      console.warn('Gagal membaca project.json dari paket .manus, menggunakan metadata bawaan:', manifestErr)
    }
  }

  // 2. Recover Word Document (content.docx)
  let docxData: ArrayBuffer = new ArrayBuffer(0)
  const docxFile = zip.file('content.docx')
  if (docxFile) {
    try {
      const raw = await docxFile.async('arraybuffer')
      docxData = raw.slice(0)
    } catch (docxErr) {
      console.warn('Gagal mengekstrak content.docx dari paket .manus:', docxErr)
    }
  }

  // 3. Recover Source PDF Manuscript (source.pdf)
  let pdfData: ArrayBuffer = new ArrayBuffer(0)
  const pdfFile = zip.file('source.pdf')
  if (pdfFile) {
    try {
      const raw = await pdfFile.async('arraybuffer')
      pdfData = raw.slice(0)
    } catch (pdfErr) {
      console.warn('Gagal mengekstrak source.pdf dari paket .manus:', pdfErr)
    }
  }

  return {
    docxData,
    pdfData,
    metadata,
  }
}
