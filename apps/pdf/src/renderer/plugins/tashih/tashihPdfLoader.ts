/**
 * TASHIH-PRO: Real PDF File Loader & IndexedDB Storage
 * Mengelola pemuatan berkas PDF fisik (Master & Vendor Scan) via PDF.js
 * serta penyimpanan persisten binary PDF di IndexedDB lokal browser.
 */

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFDocumentProxy } from 'pdfjs-dist'

const DB_NAME = 'genoffice_tashih_pro_db'
const DB_VERSION = 1
const STORE_NAME = 'pdf_blobs'

interface StoredPdfRecord {
  id: string // `${projectId}::${fileKey}`
  projectId: string
  fileKey: string // 'master' | `vendor-${id}`
  fileName: string
  fileSize: number
  data: ArrayBuffer
  updatedAt: string
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak didukung pada lingkungan ini.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('projectId', 'projectId', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Menyimpan binary PDF (ArrayBuffer) ke IndexedDB
 */
export async function savePdfToStorage(
  projectId: string,
  fileKey: string,
  fileName: string,
  buffer: ArrayBuffer
): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const id = `${projectId}::${fileKey}`

    const record: StoredPdfRecord = {
      id,
      projectId,
      fileKey,
      fileName,
      fileSize: buffer.byteLength,
      data: buffer,
      updatedAt: new Date().toISOString(),
    }

    const request = store.put(record)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Mengambil binary PDF yang tersimpan dari IndexedDB
 */
export async function getPdfFromStorage(
  projectId: string,
  fileKey: string
): Promise<{ data: ArrayBuffer; fileName: string; fileSize: number } | null> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const id = `${projectId}::${fileKey}`

      const request = store.get(id)
      request.onsuccess = () => {
        const result = request.result as StoredPdfRecord | undefined
        if (result && result.data) {
          resolve({
            data: result.data,
            fileName: result.fileName,
            fileSize: result.fileSize,
          })
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('[tashih] Failed to get PDF from IndexedDB:', err)
    return null
  }
}

/**
 * Menghapus binary PDF tertentu dari IndexedDB
 */
export async function deletePdfFromStorage(projectId: string, fileKey: string): Promise<void> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const id = `${projectId}::${fileKey}`
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('[tashih] Failed to delete PDF from IndexedDB:', err)
  }
}

/**
 * Menghapus seluruh file PDF yang berelasi dengan proyek tertentu
 */
export async function clearProjectPdfs(projectId: string): Promise<void> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('projectId')
      const request = index.openCursor(IDBKeyRange.only(projectId))

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('[tashih] Failed to clear project PDFs from IndexedDB:', err)
  }
}

/**
 * Membaca ArrayBuffer menjadi PDFDocumentProxy aktif via PDF.js
 */
export async function loadPdfDocumentFromBuffer(buffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  // Salin buffer agar tidak neutered jika dipindahkan oleh worker
  const bufferCopy = buffer.slice(0)
  const task = getDocument({
    data: new Uint8Array(bufferCopy),
    cMapPacked: true,
  })
  return await task.promise
}

export interface LoadedPdfFileResult {
  pdfDoc: PDFDocumentProxy
  buffer: ArrayBuffer
  fileName: string
  fileSize: number
  pageCount: number
}

/**
 * Memuat objek File HTML5/Electron menjadi PDFDocumentProxy dan ArrayBuffer
 */
export async function loadPdfDocumentFromFile(file: File): Promise<LoadedPdfFileResult> {
  const buffer = await file.arrayBuffer()
  const pdfDoc = await loadPdfDocumentFromBuffer(buffer)
  return {
    pdfDoc,
    buffer,
    fileName: file.name,
    fileSize: file.size,
    pageCount: pdfDoc.numPages,
  }
}

/**
 * Format ukuran byte ke string yang mudah dibaca (e.g. 1.4 MB, 450 KB)
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
