import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
// @ts-ignore
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// Configure PDF.js worker
GlobalWorkerOptions.workerSrc = workerUrl
const ASSET_BASE = new URL('pdfjs/', document.baseURI).href
export const DOC_OPTS = {
  cMapUrl: `${ASSET_BASE}cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${ASSET_BASE}standard_fonts/`,
  wasmUrl: `${ASSET_BASE}wasm/`,
}

/**
 * Loads a PDFDocumentProxy from an ArrayBuffer safely
 */
export async function loadPdfDocumentFromBuffer(
  buffer: ArrayBuffer,
): Promise<PDFDocumentProxy> {
  const workerData = buffer.slice(0)
  const loadingTask = getDocument({
    data: new Uint8Array(workerData),
    ...DOC_OPTS,
  })
  return loadingTask.promise
}
