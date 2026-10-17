/**
 * Manuscriber Plugin — Lightweight Reactive Store
 * Built with standard React useSyncExternalStore (Zero External Dependencies).
 * Fully compatible with Zustand API pattern.
 */

import { useSyncExternalStore } from 'react'
import type {
  StagingLine,
  PageMeta,
  PageTranscriptionStatus,
  LineStatus,
  KeyboardInputMode,
  VisionProviderConfig,
  SpeechStatus,
  SpeechLanguage,
} from '../types'
import { getVisionConfig, saveVisionConfig } from '../services/visionService'
import type { ManuscriberDocumentSession } from '../services/documentSessionStore'

export interface ScanSession {
  id: string
  pageNo: number
  timestamp: string
  blockCount: number
  verifiedCount: number
  lines: StagingLine[]
}

export interface ManuscriberPluginState {
  // ── Dokumen DOCX & Session Binding ──────────────────────────────────────────
  activeDocKey: string | null
  isRestoringSession: boolean
  lastSavedTimestamp: string | null

  // ── Dokumen PDF ─────────────────────────────────────────────────────────────
  pdfFileName: string
  pdfName: string
  pdfBytes: ArrayBuffer | null
  pdfBuffer: ArrayBuffer | null
  pdfDocument: any
  currentPage: number
  totalPages: number
  zoomScale: number
  zoom: number
  pageStatuses: Record<number, PageTranscriptionStatus>
  pagesMeta: Record<number, PageMeta>

  // ── Staging & Tashih ────────────────────────────────────────────────────────
  lines: StagingLine[]
  activeLineId: string | null
  isFocusMode: boolean
  scanSessions: ScanSession[]

  // ── Papan Ketik Pegon ───────────────────────────────────────────────────────
  isKeyboardVisible: boolean
  isKeyboardOpen: boolean
  keyboardMode: KeyboardInputMode
  activeInputElement: HTMLElement | null

  // ── Narator / TTS ─────────────────────────────────────────────────────────
  speakingLineId: string | null
  speechStatus: SpeechStatus

  // ── Konfigurasi AI Vision ───────────────────────────────────────────────────
  visionConfig: VisionProviderConfig

  // ── Tab Navigasi Sidebar ────────────────────────────────────────────────────
  sidebarActiveTab: 'pdf' | 'history'

  // ── Actions ─────────────────────────────────────────────────────────────────
  setSidebarActiveTab: (tab: 'pdf' | 'history') => void
  setPdfFileName: (name: string) => void
  setPdfBytes: (bytes: ArrayBuffer | null) => void
  setPdfDocument: (doc: any) => void
  setCurrentPage: (page: number) => void
  setTotalPages: (total: number) => void
  setZoomScale: (scale: number) => void
  setZoom: (zoom: number) => void
  setPageStatus: (page: number, status: PageTranscriptionStatus, error?: string) => void
  setLines: (lines: StagingLine[]) => void
  addPageLines: (pageNo: number, newLines: StagingLine[]) => void
  addScanSession: (session: ScanSession) => void
  deleteScanSession: (id: string) => void
  restoreScanSession: (id: string) => void
  addLine: (line: Partial<StagingLine>, afterId?: string) => void
  updateLine: (id: string, updates: Partial<StagingLine>) => void
  updateLineText: (id: string, text: string) => void
  updateLineStatus: (id: string, status: LineStatus) => void
  toggleLineVerified: (id: string) => void
  deleteLine: (id: string) => void
  removeLine: (id: string) => void
  markAllVerified: () => void
  setActiveLineId: (id: string | null, openFocus?: boolean) => void
  setIsFocusMode: (focus: boolean) => void
  setIsKeyboardVisible: (visible: boolean) => void
  setKeyboardOpen: (open: boolean) => void
  setKeyboardMode: (mode: KeyboardInputMode) => void
  setActiveInput: (el: HTMLElement | null) => void
  setVisionConfig: (config: VisionProviderConfig) => void
  setSpeakingState: (lineId: string | null, status: SpeechStatus) => void
  prevPointer: () => void
  nextPointer: () => void
  setActiveDocKey: (key: string | null) => void
  setIsRestoringSession: (loading: boolean) => void
  setLastSavedTimestamp: (ts: string | null) => void
  loadFromSession: (session: ManuscriberDocumentSession, pdfDoc?: any) => void
  resetProjectData: () => void
  clear: () => void
}

/**
 * Lightweight Zero-Dependency Store Factory (Zustand replacement)
 */
function createStore<T extends object>(
  initializer: (
    set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
    get: () => T
  ) => T
) {
  let state: T
  const listeners = new Set<() => void>()

  const get = () => state
  const set = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    const next = typeof partial === 'function' ? (partial as any)(state) : partial
    state = Object.assign({}, state, next)
    listeners.forEach((l) => l())
  }

  state = initializer(set, get)

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function useStore<U = T>(selector?: (s: T) => U): U {
    return useSyncExternalStore(
      subscribe,
      () => (selector ? selector(state) : (state as unknown as U)),
      () => (selector ? selector(state) : (state as unknown as U))
    )
  }

  useStore.getState = get
  useStore.setState = set
  useStore.subscribe = subscribe

  return useStore
}

export const useManuscriberPluginStore = createStore<ManuscriberPluginState>((set, get) => ({
  // Session defaults
  activeDocKey: null,
  isRestoringSession: false,
  lastSavedTimestamp: null,

  // Defaults
  pdfFileName: '',
  pdfName: '',
  pdfBytes: null,
  pdfBuffer: null,
  pdfDocument: null,
  currentPage: 1,
  totalPages: 1,
  zoomScale: 1.0,
  zoom: 1.0,
  pageStatuses: {},
  pagesMeta: {},

  lines: [],
  activeLineId: null,
  isFocusMode: false,
  scanSessions: [],

  isKeyboardVisible: false,
  isKeyboardOpen: false,
  keyboardMode: 'pegon',
  activeInputElement: null,

  speakingLineId: null,
  speechStatus: 'idle' as SpeechStatus,

  visionConfig: getVisionConfig(),

  sidebarActiveTab: 'pdf',
  setSidebarActiveTab: (tab) => set({ sidebarActiveTab: tab }),

  setPdfFileName: (name) => set({ pdfFileName: name, pdfName: name }),
  setPdfBytes: (bytes) => set({ pdfBytes: bytes, pdfBuffer: bytes }),
  setPdfDocument: (doc) => set({ pdfDocument: doc }),
  setCurrentPage: (page) => {
    const total = get().totalPages || 1
    set({ currentPage: Math.max(1, Math.min(page, total)) })
  },
  setTotalPages: (total) => set({ totalPages: Math.max(1, total) }),
  setZoomScale: (scale) => {
    const clamped = Math.max(0.4, Math.min(scale, 3.0))
    set({ zoomScale: clamped, zoom: clamped })
  },
  setZoom: (zoom) => {
    const clamped = Math.max(0.4, Math.min(zoom, 3.0))
    set({ zoomScale: clamped, zoom: clamped })
  },

  setPageStatus: (page, status, error) => {
    set((s) => ({
      pageStatuses: { ...s.pageStatuses, [page]: status },
      pagesMeta: {
        ...s.pagesMeta,
        [page]: {
          pageNumber: page,
          status,
          linesCount: s.lines.filter((l) => (l.pageNo || l.pageNumber) === page).length,
          verifiedCount: s.lines.filter((l) => (l.pageNo || l.pageNumber) === page && l.status === 'verified').length,
          error,
        },
      },
    }))
  },

  setLines: (newLines) => {
    set({ lines: newLines })
  },

  addPageLines: (pageNo, newLines) => {
    const { lines } = get()
    const otherPages = lines.filter((l) => (l.pageNo || l.pageNumber) !== pageNo)
    const combined = [...otherPages, ...newLines].sort((a, b) => {
      const pA = a.pageNo || a.pageNumber || 0
      const pB = b.pageNo || b.pageNumber || 0
      if (pA !== pB) return pA - pB
      return (a.order || 0) - (b.order || 0)
    })
    set({
      lines: combined,
      activeLineId: newLines[0]?.id || get().activeLineId,
    })
  },

  addScanSession: (session) => {
    set((s) => ({
      scanSessions: [session, ...s.scanSessions.filter((x) => x.id !== session.id)],
    }))
  },

  deleteScanSession: (id) => {
    set((s) => ({
      scanSessions: s.scanSessions.filter((x) => x.id !== id),
    }))
  },

  restoreScanSession: (id) => {
    const target = get().scanSessions.find((x) => x.id === id)
    if (target && target.lines) {
      get().addPageLines(target.pageNo, target.lines)
      get().setCurrentPage(target.pageNo)
    }
  },

  addLine: (lineData, afterId) => {
    const { lines } = get()
    const newLine: StagingLine = {
      id: lineData.id || `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pageNo: lineData.pageNo || get().currentPage,
      pageNumber: lineData.pageNo || get().currentPage,
      text: lineData.text || '',
      correctedText: lineData.correctedText || lineData.text || '',
      transliteration: lineData.transliteration || '',
      status: lineData.status || 'unverified',
      type: lineData.type || 'matan',
      bbox: lineData.bbox,
    }

    if (afterId) {
      const idx = lines.findIndex((l) => l.id === afterId)
      if (idx !== -1) {
        const next = [...lines.slice(0, idx + 1), newLine, ...lines.slice(idx + 1)]
        set({ lines: next, activeLineId: newLine.id })
        return
      }
    }
    set({ lines: [...lines, newLine], activeLineId: newLine.id })
  },

  updateLine: (id, updates) => {
    set((s) => ({
      lines: s.lines.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }))
  },

  updateLineText: (id, text) => {
    set((s) => ({
      lines: s.lines.map((l) => (l.id === id ? { ...l, text, correctedText: text } : l)),
    }))
  },

  updateLineStatus: (id, status) => {
    set((s) => ({
      lines: s.lines.map((l) => (l.id === id ? { ...l, status } : l)),
    }))
  },

  toggleLineVerified: (id) => {
    const { lines, updateLine } = get()
    const target = lines.find((l) => l.id === id)
    if (target) {
      const nextStatus = target.status === 'verified' ? 'unverified' : 'verified'
      updateLine(id, { status: nextStatus })
    }
  },

  deleteLine: (id) => {
    const { lines, activeLineId } = get()
    const nextLines = lines.filter((l) => l.id !== id)
    set({
      lines: nextLines,
      activeLineId: activeLineId === id ? nextLines[0]?.id || null : activeLineId,
    })
  },

  removeLine: (id) => {
    get().deleteLine(id)
  },

  markAllVerified: () => {
    set((s) => ({
      lines: s.lines.map((l) => ({ ...l, status: 'verified' as const })),
    }))
  },

  setActiveLineId: (id, openFocus = false) => {
    set({
      activeLineId: id,
      isFocusMode: openFocus ? true : get().isFocusMode,
    })
  },

  setIsFocusMode: (isFocusMode) => set({ isFocusMode }),
  setIsKeyboardVisible: (visible) => set({ isKeyboardVisible: visible, isKeyboardOpen: visible }),
  setKeyboardOpen: (open) => set({ isKeyboardVisible: open, isKeyboardOpen: open }),
  setKeyboardMode: (mode) => set({ keyboardMode: mode }),
  setActiveInput: (el) => set({ activeInputElement: el }),
  setVisionConfig: (config) => {
    saveVisionConfig(config)
    set({ visionConfig: config })
  },

  setSpeakingState: (lineId, status) => {
    set({ speakingLineId: lineId, speechStatus: status })
  },

  prevPointer: () => {
    const { lines, activeLineId } = get()
    const idx = lines.findIndex((l) => l.id === activeLineId)
    if (idx > 0) {
      set({ activeLineId: lines[idx - 1].id })
    }
  },

  nextPointer: () => {
    const { lines, activeLineId } = get()
    const idx = lines.findIndex((l) => l.id === activeLineId)
    if (idx >= 0 && idx < lines.length - 1) {
      set({ activeLineId: lines[idx + 1].id })
    }
  },

  setActiveDocKey: (key) => set({ activeDocKey: key }),
  setIsRestoringSession: (loading) => set({ isRestoringSession: loading }),
  setLastSavedTimestamp: (ts) => set({ lastSavedTimestamp: ts }),

  loadFromSession: (session, pdfDoc) => {
    const pagesMeta = session.pagesMeta || {}
    const pageStatuses: Record<number, PageTranscriptionStatus> = {}
    Object.entries(pagesMeta).forEach(([p, meta]) => {
      pageStatuses[Number(p)] = meta.status
    })

    set({
      activeDocKey: session.docKey,
      pdfFileName: session.pdfFileName,
      pdfName: session.pdfFileName,
      pdfBytes: session.pdfBytes || null,
      pdfBuffer: session.pdfBytes || null,
      pdfDocument: pdfDoc || null,
      currentPage: session.currentPage || 1,
      totalPages: pdfDoc?.numPages || 1,
      zoomScale: session.zoomScale || 1.0,
      zoom: session.zoomScale || 1.0,
      lines: session.lines || [],
      pagesMeta,
      pageStatuses,
      scanSessions: session.scanSessions || [],
      lastSavedTimestamp: session.updatedAt,
      isRestoringSession: false,
    })
  },

  resetProjectData: () => {
    set({
      pdfFileName: '',
      pdfName: '',
      pdfBytes: null,
      pdfBuffer: null,
      pdfDocument: null,
      currentPage: 1,
      totalPages: 1,
      lines: [],
      pagesMeta: {},
      pageStatuses: {},
      scanSessions: [],
      activeLineId: null,
      isFocusMode: false,
      lastSavedTimestamp: null,
    })
  },

  clear: () => {
    set({
      activeDocKey: null,
      isRestoringSession: false,
      lastSavedTimestamp: null,
      pdfFileName: '',
      pdfName: '',
      pdfBytes: null,
      pdfBuffer: null,
      pdfDocument: null,
      currentPage: 1,
      totalPages: 1,
      lines: [],
      pagesMeta: {},
      pageStatuses: {},
      activeLineId: null,
      isFocusMode: false,
    })
  },
}))

export const manuscriberPluginStore = useManuscriberPluginStore
