import { useEffect, useRef } from 'react'
import type { DocxPluginContext } from '../../types'
import { useManuscriberPluginStore } from '../store/manuscriberPluginStore'
import {
  loadDocumentSession,
  saveDocumentSession,
  migrateDraftSession,
  type ManuscriberDocumentSession,
} from '../services/documentSessionStore'
import { loadPdfDocumentFromBuffer } from '../services/pdfService'

declare global {
  interface Window {
    __manuscriber_draft_id?: string
  }
}

function getOrCreateDraftKey(): string {
  if (!window.__manuscriber_draft_id) {
    const stored = sessionStorage.getItem('manuscriber_active_draft_id')
    if (stored) {
      window.__manuscriber_draft_id = stored
    } else {
      const generated = `draft:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      window.__manuscriber_draft_id = generated
      sessionStorage.setItem('manuscriber_active_draft_id', generated)
    }
  }
  return window.__manuscriber_draft_id
}

export function useDocumentSessionSync(context: DocxPluginContext) {
  const store = useManuscriberPluginStore()
  const docFilePath = context.doc?.filePath || null
  const draftKeyRef = useRef<string>(getOrCreateDraftKey())
  const activeDocKey = docFilePath || draftKeyRef.current

  const isRestoringRef = useRef(false)
  const previousDocKeyRef = useRef<string | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 1. Auto-Restore & Document Switching ────────────────────────────────────
  useEffect(() => {
    let isCancelled = false
    const targetKey = activeDocKey

    async function syncDocumentSession() {
      // Handle Draft to Saved File Migration
      if (
        docFilePath &&
        previousDocKeyRef.current &&
        previousDocKeyRef.current.startsWith('draft:') &&
        previousDocKeyRef.current !== docFilePath
      ) {
        try {
          await migrateDraftSession(previousDocKeyRef.current, docFilePath)
        } catch (err) {
          console.warn('[Manuscriber] Failed to migrate draft session:', err)
        }
      }

      // If document key hasn't changed and already active, do nothing
      if (targetKey === previousDocKeyRef.current && targetKey === store.activeDocKey) {
        return
      }

      previousDocKeyRef.current = targetKey
      isRestoringRef.current = true
      store.setIsRestoringSession(true)

      try {
        const session = await loadDocumentSession(targetKey)
        if (isCancelled) return

        if (session && (session.pdfBytes || session.lines?.length || session.pdfFileName)) {
          let pdfDoc = null
          if (session.pdfBytes && session.pdfBytes.byteLength > 0) {
            try {
              pdfDoc = await loadPdfDocumentFromBuffer(session.pdfBytes)
            } catch (pdfErr) {
              console.warn('[Manuscriber] Gagal membaca ulang biner PDF dari IndexedDB:', pdfErr)
            }
          }

          if (isCancelled) return
          store.loadFromSession(session, pdfDoc)

          if (session.pdfFileName) {
            context.ui.showToast(
              `Naskah tertaut "${session.pdfFileName}" otomatis dimuat (${session.lines?.length || 0} baris).`,
              'info',
            )
          }
        } else {
          // No session found for this document: reset to fresh state
          store.resetProjectData()
          store.setActiveDocKey(targetKey)
        }
      } catch (err) {
        console.error('[Manuscriber] Error loading document session:', err)
      } finally {
        if (!isCancelled) {
          isRestoringRef.current = false
          store.setIsRestoringSession(false)
        }
      }
    }

    syncDocumentSession()

    return () => {
      isCancelled = true
    }
  }, [activeDocKey, docFilePath])

  // ── 2. Debounced Auto-Save (800ms) ──────────────────────────────────────────
  useEffect(() => {
    // Skip saving while restoring or if no doc key is assigned
    if (isRestoringRef.current || store.isRestoringSession || !store.activeDocKey) {
      return
    }

    // Only save if there is something meaningful to persist
    const hasData =
      Boolean(store.pdfFileName) ||
      Boolean(store.pdfBytes) ||
      (store.lines && store.lines.length > 0)

    if (!hasData) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload: ManuscriberDocumentSession = {
          docKey: store.activeDocKey!,
          docxFilePath: docFilePath,
          pdfFileName: store.pdfFileName,
          pdfBytes: store.pdfBytes,
          currentPage: store.currentPage,
          zoomScale: store.zoomScale,
          lines: store.lines,
          pagesMeta: store.pagesMeta,
          scanSessions: store.scanSessions,
          createdAt: store.lastSavedTimestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        await saveDocumentSession(payload)
        store.setLastSavedTimestamp(payload.updatedAt)
      } catch (err) {
        console.error('[Manuscriber] Auto-save error:', err)
      }
    }, 800)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [
    store.activeDocKey,
    store.pdfFileName,
    store.pdfBytes,
    store.currentPage,
    store.zoomScale,
    store.lines,
    store.pagesMeta,
    store.scanSessions,
    store.isRestoringSession,
    docFilePath,
  ])
}
