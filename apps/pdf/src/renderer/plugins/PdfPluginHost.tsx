import React, { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type {
  PdfPluginContext,
  PdfPluginDocState,
  PdfPluginSelection,
  PdfPluginRuntimeState,
} from './types'
import { REGISTERED_PLUGINS } from './registry'
import {
  PluginSidebarPanel,
  PluginRibbonTab,
  PluginFloatingLayer,
  PluginModalLayer,
  PluginStatusBar,
  PluginCanvasView,
} from './ui'
import './plugin-system.css'

// ─────────────────────────────────────────────────────────────────────────────
// Internal Context (used internally by host components)
// ─────────────────────────────────────────────────────────────────────────────

const PluginHostContext = createContext<{
  runtimeStates: PdfPluginRuntimeState[]
  updateRuntime: (pluginId: string, patch: Partial<PdfPluginRuntimeState>) => void
} | null>(null)

export function usePluginHostContext() {
  const ctx = useContext(PluginHostContext)
  if (!ctx) throw new Error('PluginHostContext missing — wrap in PdfPluginHost')
  return ctx
}

// ─────────────────────────────────────────────────────────────────────────────
// Host Props
// ─────────────────────────────────────────────────────────────────────────────

export interface PdfPluginHostProps {
  /** Active PDF.js document proxy, null when no document is open */
  doc: PDFDocumentProxy | null
  /** File path on disk, null or empty if untitled */
  filePath: string | null
  /** Current 1-based page number */
  currentPage: number
  /** Total page count */
  pageCount: number
  /** Current zoom scale factor (e.g. 1.0) */
  scale: number
  /** True when there are unsaved edits */
  isDirty: boolean
  /** True when read-only / password encrypted */
  isReadOnly: boolean
  /** Scroll to a given 1-based page */
  scrollToPage: (pageNo: number) => void
  /** Set zoom scale factor */
  setScale: (scale: number) => void
  /** Zoom in */
  zoomIn: () => void
  /** Zoom out */
  zoomOut: () => void
  /** Notifies when any plugin surface (sidebar / workbench canvas) opens or closes */
  onPluginOpenChange?: (open: boolean) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// PdfPluginHost — Single mount point in App.tsx
// ─────────────────────────────────────────────────────────────────────────────

export function PdfPluginHost({
  doc,
  filePath,
  currentPage,
  pageCount,
  scale,
  isDirty,
  isReadOnly,
  scrollToPage,
  setScale,
  zoomIn,
  zoomOut,
  onPluginOpenChange,
}: PdfPluginHostProps) {
  // ── Runtime states per-plugin ──────────────────────────────────────────────
  const [runtimeStates, setRuntimeStates] = useState<PdfPluginRuntimeState[]>(() =>
    REGISTERED_PLUGINS.map((manifest) => ({
      manifest,
      sidebarOpen: manifest.sidebar?.defaultOpen ?? false,
      activeRibbonTab: false,
      canvasViewOpen: manifest.canvasView?.defaultOpen ?? false,
      openModalId: null,
      openModalPayload: undefined,
      initialized: false,
    })),
  )

  const updateRuntime = useCallback(
    (pluginId: string, patch: Partial<PdfPluginRuntimeState>) => {
      setRuntimeStates((prev) =>
        prev.map((rs) => (rs.manifest.id === pluginId ? { ...rs, ...patch } : rs)),
      )
    },
    [],
  )

  // Report plugin open state (sidebar or workbench open)
  const isAnyPluginOpen = runtimeStates.some((rs) => rs.sidebarOpen || rs.canvasViewOpen)
  useEffect(() => {
    onPluginOpenChange?.(isAnyPluginOpen)
  }, [isAnyPluginOpen, onPluginOpenChange])

  // ── Text selection tracking ────────────────────────────────────────────────
  const [selection, setSelection] = useState<PdfPluginSelection>({
    empty: true,
    text: '',
  })

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection()
      const text = sel ? sel.toString().trim() : ''
      setSelection({
        empty: text.length === 0,
        text,
      })
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  // ── Toast notification system ──────────────────────────────────────────────
  const [toast, setToast] = useState<{
    id: number
    message: string
    kind: 'info' | 'success' | 'error'
  } | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const showToast = useCallback((message: string, kind: 'info' | 'success' | 'error' = 'info') => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
    }
    const id = Date.now()
    setToast({ id, message, kind })
    const duration = kind === 'error' ? 4000 : 2500
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, duration)
  }, [])

  // ── Build per-plugin context ───────────────────────────────────────────────
  const buildContext = useCallback(
    (pluginId: string, runtime: PdfPluginRuntimeState): PdfPluginContext => {
      const docState: PdfPluginDocState | null = doc
        ? {
            filePath: filePath || null,
            pageCount,
            currentPage,
            scale,
            isDirty,
            isReadOnly,
            pdfDocument: doc,
            pageSize: null,
          }
        : null

      return {
        doc: docState,
        selection,
        actions: {
          goToPage(pageNo) {
            scrollToPage(pageNo)
          },
          setZoom(s) {
            setScale(s)
          },
          zoomIn() {
            zoomIn()
          },
          zoomOut() {
            zoomOut()
          },
          print() {
            window.print()
          },
        },
        ui: {
          showToast(msg, kind = 'info') {
            showToast(msg, kind)
          },
          openModal(modalId, payload) {
            updateRuntime(pluginId, { openModalId: modalId, openModalPayload: payload })
          },
          closeModal() {
            updateRuntime(pluginId, { openModalId: null, openModalPayload: undefined })
          },
          expandSidebar() {
            updateRuntime(pluginId, { sidebarOpen: true })
          },
          collapseSidebar() {
            updateRuntime(pluginId, { sidebarOpen: false })
          },
          toggleSidebar() {
            updateRuntime(pluginId, { sidebarOpen: !runtime.sidebarOpen })
          },
          openCanvasView() {
            updateRuntime(pluginId, { canvasViewOpen: true })
          },
          closeCanvasView() {
            updateRuntime(pluginId, { canvasViewOpen: false })
          },
          toggleCanvasView() {
            updateRuntime(pluginId, { canvasViewOpen: !runtime.canvasViewOpen })
          },
        },
      }
    },
    [
      doc,
      filePath,
      currentPage,
      pageCount,
      scale,
      isDirty,
      isReadOnly,
      selection,
      scrollToPage,
      setScale,
      zoomIn,
      zoomOut,
      showToast,
      updateRuntime,
    ],
  )

  // ── Initialize plugins on mount ────────────────────────────────────────────
  useEffect(() => {
    runtimeStates.forEach((rs) => {
      if (!rs.initialized && rs.manifest.onInit) {
        try {
          rs.manifest.onInit(buildContext(rs.manifest.id, rs))
          updateRuntime(rs.manifest.id, { initialized: true })
        } catch (err) {
          console.error(`[PluginHost] Error initializing ${rs.manifest.id}:`, err)
        }
      }
    })
  }, [runtimeStates, buildContext, updateRuntime])

  const sidebarPlugins = runtimeStates.filter((rs) => rs.manifest.sidebar)
  const ribbonPlugins = runtimeStates.filter((rs) => rs.manifest.ribbon)
  const canvasViewPlugins = runtimeStates.filter((rs) => rs.manifest.canvasView)
  const statusBarPlugins = runtimeStates.filter((rs) => rs.manifest.statusBar)

  return (
    <PluginHostContext.Provider value={{ runtimeStates, updateRuntime }}>
      {/* ── Sidebar panels (mounted into #plugin-sidebar-slot) ─────── */}
      {sidebarPlugins.map((rs) => (
        <PluginSidebarPanel
          key={rs.manifest.id}
          manifest={rs.manifest}
          open={rs.sidebarOpen}
          context={buildContext(rs.manifest.id, rs)}
          onToggle={(open) => updateRuntime(rs.manifest.id, { sidebarOpen: open })}
        />
      ))}

      {/* ── Ribbon tabs injected into #plugin-ribbon-tab-slot ─────── */}
      {ribbonPlugins.map((rs) => (
        <PluginRibbonTab
          key={rs.manifest.id}
          manifest={rs.manifest}
          active={rs.activeRibbonTab}
          context={buildContext(rs.manifest.id, rs)}
          onActivate={(active) => updateRuntime(rs.manifest.id, { activeRibbonTab: active })}
        />
      ))}

      {/* ── Canvas workbench overlay into #plugin-canvas-slot ─────── */}
      {canvasViewPlugins.map((rs) => (
        <PluginCanvasView
          key={rs.manifest.id}
          manifest={rs.manifest}
          open={rs.canvasViewOpen}
          context={buildContext(rs.manifest.id, rs)}
          onClose={() => updateRuntime(rs.manifest.id, { canvasViewOpen: false })}
        />
      ))}

      {/* ── Floating overlays (selection-anchored popovers) ───────── */}
      {runtimeStates
        .filter((rs) => rs.manifest.floatings?.length)
        .map((rs) => (
          <PluginFloatingLayer
            key={rs.manifest.id}
            floatings={rs.manifest.floatings!}
            context={buildContext(rs.manifest.id, rs)}
          />
        ))}

      {/* ── Modal dialogs ─────────────────────────────────────────── */}
      {runtimeStates
        .filter((rs) => rs.openModalId && rs.manifest.modals?.length)
        .map((rs) => (
          <PluginModalLayer
            key={rs.manifest.id}
            modals={rs.manifest.modals!}
            activeModalId={rs.openModalId!}
            payload={rs.openModalPayload}
            context={buildContext(rs.manifest.id, rs)}
            onClose={() =>
              updateRuntime(rs.manifest.id, { openModalId: null, openModalPayload: undefined })
            }
          />
        ))}

      {/* ── Status bar widgets ────────────────────────────────────── */}
      {statusBarPlugins.length > 0 &&
        document.getElementById('plugin-statusbar-slot') &&
        createPortal(
          <>
            {statusBarPlugins.map((rs) => (
              <PluginStatusBar
                key={rs.manifest.id}
                manifest={rs.manifest}
                context={buildContext(rs.manifest.id, rs)}
              />
            ))}
          </>,
          document.getElementById('plugin-statusbar-slot')!,
        )}

      {/* ── Toast notifications ───────────────────────────────────── */}
      {toast &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              bottom: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 3000,
              padding: '8px 16px',
              borderRadius: '6px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background:
                toast.kind === 'error'
                  ? '#d13438'
                  : toast.kind === 'success'
                    ? '#107c41'
                    : 'var(--surface, #2d2d30)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              {toast.kind === 'error' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : toast.kind === 'success' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </span>
            <span>{toast.message}</span>
          </div>,
          document.body,
        )}
    </PluginHostContext.Provider>
  )
}
