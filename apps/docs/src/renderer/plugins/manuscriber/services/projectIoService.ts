/**
 * Manuscriber Plugin — Project I/O Service
 * Mengelola ekspor dan impor file proyek naskah (.manus)
 * serta sanitasi status transient agar tidak terjadi infinite loading.
 */
import type { ManuscriptProjectFile, PageMeta, StagingLine } from '../types'

export function isManusProjectFile(fileName: string): boolean {
  return /\.(manus|manuscriber|mnsproj)$/i.test(fileName)
}

/**
 * Sanitasi pagesMeta: memastikan status transient 'transcribing' dinetralkan
 * saat disimpan atau dimuat kembali.
 */
export function sanitizePagesMeta(
  meta: Record<number, PageMeta>,
  lines: StagingLine[],
): Record<number, PageMeta> {
  const sanitized: Record<number, PageMeta> = {}

  Object.entries(meta).forEach(([key, val]) => {
    const pageNum = parseInt(key, 10)
    const pageLines = lines.filter((l) => l.pageNumber === pageNum)
    const verifiedCount = pageLines.filter((l) => l.status === 'verified').length

    let status = val.status
    if (status === 'transcribing') {
      status = pageLines.length > 0 ? 'done' : 'idle'
    }

    sanitized[pageNum] = {
      pageNumber: pageNum,
      status,
      error: val.error,
      linesCount: pageLines.length,
      verifiedCount,
    }
  })

  return sanitized
}

export function serializeProject(
  name: string,
  pdfBuffer: ArrayBuffer | null,
  lines: StagingLine[],
  pagesMeta: Record<number, PageMeta>,
): string {
  let pdfBase64: string | undefined
  if (pdfBuffer && pdfBuffer.byteLength > 0) {
    const bytes = new Uint8Array(pdfBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    pdfBase64 = btoa(binary)
  }

  const cleanMeta = sanitizePagesMeta(pagesMeta, lines)

  const proj: ManuscriptProjectFile = {
    version: '1.0.0',
    name,
    pdfBufferBase64: pdfBase64,
    pagesMeta: cleanMeta,
    lines,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return JSON.stringify(proj, null, 2)
}

export function deserializeProject(jsonStr: string): {
  name: string
  pdfBuffer: ArrayBuffer | null
  lines: StagingLine[]
  pagesMeta: Record<number, PageMeta>
} {
  const parsed = JSON.parse(jsonStr) as ManuscriptProjectFile

  let pdfBuffer: ArrayBuffer | null = null
  if (parsed.pdfBufferBase64) {
    const binary = atob(parsed.pdfBufferBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    pdfBuffer = bytes.buffer
  }

  const lines = parsed.lines || []
  const pagesMeta = sanitizePagesMeta(parsed.pagesMeta || {}, lines)

  return {
    name: parsed.name || 'Proyek Manuscriber',
    pdfBuffer,
    lines,
    pagesMeta,
  }
}

/**
 * Menyimpan file proyek (.manus) via Electron dialog atau Browser Blob download fallback
 */
export async function saveProjectFile(
  defaultName: string,
  pdfBuffer: ArrayBuffer | null,
  lines: StagingLine[],
  pagesMeta: Record<number, PageMeta>,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  try {
    const jsonStr = serializeProject(defaultName, pdfBuffer, lines, pagesMeta)
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(jsonStr)

    const desktopApi = (window as any).desktop
    if (desktopApi?.saveManusProjectAs) {
      const res = await desktopApi.saveManusProjectAs(
        defaultName,
        dataBytes.buffer,
        null,
      )
      return res
    }

    // Browser Native Blob Download Fallback
    const blob = new Blob([dataBytes], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultName.endsWith('.manus') ? defaultName : `${defaultName}.manus`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return { ok: true, path: a.download }
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) }
  }
}

export const packManusProject = serializeProject
export const unpackManusProject = deserializeProject
export const isManusFile = isManusProjectFile

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
