/**
 * Manuscriber Plugin — In-App Document Session Store
 * Zero-dependency IndexedDB engine that binds Turats manuscripts,
 * PDF binary cache, and tashih transcription history directly
 * to active GenOffice DOCX document file paths.
 */

import type { PageMeta, StagingLine, ScanSession, PageTranscriptionStatus } from '../types'

export interface ManuscriberDocumentSession {
  /** Unique document identifier: either absolute docx filePath, or 'draft:UUID' */
  docKey: string
  /** Absolute path to the .docx file (null if unsaved) */
  docxFilePath: string | null
  /** PDF file name e.g. 'Fathul-Qorib.pdf' */
  pdfFileName: string
  /** Absolute path to the PDF on user disk (if available) */
  pdfFilePath?: string
  /** Cached binary ArrayBuffer of the PDF */
  pdfBytes?: ArrayBuffer | null
  /** Last active page number in the viewer */
  currentPage: number
  /** Last zoom scale e.g. 1.0 */
  zoomScale: number
  /** All transcription and tashih lines */
  lines: StagingLine[]
  /** Transcription status and metadata per page */
  pagesMeta: Record<number, PageMeta>
  /** Historical OCR spotlight scan sessions */
  scanSessions?: ScanSession[]
  /** ISO timestamp when created */
  createdAt: string
  /** ISO timestamp when last updated */
  updatedAt: string
}

const DB_NAME = 'manuscriber_sessions_db'
const DB_VERSION = 1
const STORE_NAME = 'document_sessions'

let dbPromise: Promise<IDBDatabase> | null = null

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB tidak didukung pada environment ini.'))
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'docKey' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })

  return dbPromise
}

/**
 * Saves or updates a document session in IndexedDB
 */
export async function saveDocumentSession(
  session: ManuscriberDocumentSession,
): Promise<void> {
  if (!session.docKey) return

  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Ensure clean dates
    const record: ManuscriberDocumentSession = {
      ...session,
      updatedAt: new Date().toISOString(),
      createdAt: session.createdAt || new Date().toISOString(),
    }

    const request = store.put(record)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Loads a document session by its docKey (filePath or draft:id)
 */
export async function loadDocumentSession(
  docKey: string,
): Promise<ManuscriberDocumentSession | null> {
  if (!docKey) return null

  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(docKey)

    request.onsuccess = () => {
      const result = request.result as ManuscriberDocumentSession | undefined
      resolve(result || null)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Deletes a document session by docKey
 */
export async function deleteDocumentSession(docKey: string): Promise<void> {
  if (!docKey) return

  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(docKey)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Migrates a draft session ('draft:UUID') to a concrete file path once saved
 */
export async function migrateDraftSession(
  draftKey: string,
  targetFilePath: string,
): Promise<void> {
  if (!draftKey || !targetFilePath || draftKey === targetFilePath) return

  const draftSession = await loadDocumentSession(draftKey)
  if (!draftSession) return

  const newSession: ManuscriberDocumentSession = {
    ...draftSession,
    docKey: targetFilePath,
    docxFilePath: targetFilePath,
    updatedAt: new Date().toISOString(),
  }

  await saveDocumentSession(newSession)
  await deleteDocumentSession(draftKey)
}

/**
 * Lists all existing sessions in the database (for history or debugging)
 */
export async function listAllDocumentSessions(): Promise<
  Array<{ docKey: string; docxFilePath: string | null; pdfFileName: string; updatedAt: string }>
> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const all = (request.result as ManuscriberDocumentSession[]) || []
      const summaries = all.map((item) => ({
        docKey: item.docKey,
        docxFilePath: item.docxFilePath,
        pdfFileName: item.pdfFileName,
        updatedAt: item.updatedAt,
      }))
      resolve(summaries)
    }
    request.onerror = () => reject(request.error)
  })
}
