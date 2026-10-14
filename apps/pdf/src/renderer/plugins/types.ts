/**
 * GenOffice PDF Plugin System — Public Contract Types
 *
 * This file defines the full public API surface for PDF plugins.
 * Plugins MUST only depend on types exported here; they must NOT import
 * directly from App.tsx or any other upstream file.
 */

import type { ReactNode } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// ─────────────────────────────────────────────────────────────────────────────
// 1. Plugin Context — the "world view" passed to every plugin surface
// ─────────────────────────────────────────────────────────────────────────────

/** Read-only snapshot of the currently open PDF document. */
export interface PdfPluginDocState {
  /** Absolute path on disk; null when no file is loaded. */
  readonly filePath: string | null
  /** Total page count in document. */
  readonly pageCount: number
  /** Currently focused page number (1-based). */
  readonly currentPage: number
  /** Current zoom scale factor (e.g., 1.0 = 100%). */
  readonly scale: number
  /** True when there are unsaved annotations or edits. */
  readonly isDirty: boolean
  /** True when the document is password-protected or read-only. */
  readonly isReadOnly: boolean
  /** Read-only PDF.js proxy instance, null if not yet loaded. */
  readonly pdfDocument: PDFDocumentProxy | null
  /** Current page dimensions in points (if available). */
  readonly pageSize: { width: number; height: number } | null
}

/** Read-only snapshot of current text selection in the PDF text layer. */
export interface PdfPluginSelection {
  /** True when nothing is selected. */
  readonly empty: boolean
  /** Plain text string of the selected range. Empty when empty. */
  readonly text: string
}

/** Actions a plugin can trigger on the PDF document view. */
export interface PdfPluginDocActions {
  /** Scroll/navigate directly to a specific 1-based page number. */
  goToPage(pageNo: number): void

  /** Set the zoom scale factor directly (e.g. 1.25 for 125%). */
  setZoom(scale: number): void

  /** Increment zoom to next zoom step. */
  zoomIn(): void

  /** Decrement zoom to previous zoom step. */
  zoomOut(): void

  /** Trigger system print dialog. */
  print(): void
}

/** Actions a plugin can trigger on the host UI chrome. */
export interface PdfPluginUiActions {
  /**
   * Show a toast notification in the PDF chrome.
   * Auto-dismisses after 2 s (info/success) or 4 s (error).
   */
  showToast(message: string, kind?: 'info' | 'success' | 'error'): void

  /**
   * Open a modal registered by this plugin (by modalId).
   * The payload is forwarded to the modal component as initialPayload.
   */
  openModal(modalId: string, payload?: unknown): void

  /** Close any open modal registered by this plugin. */
  closeModal(): void

  /** Expand the plugin's own sidebar panel (if declared). */
  expandSidebar(): void

  /** Collapse the plugin's own sidebar panel. */
  collapseSidebar(): void

  /** Toggle the plugin's own sidebar panel. */
  toggleSidebar(): void

  /** Open the plugin's custom canvas view / workbench overlay. */
  openCanvasView(): void

  /** Close the plugin's custom canvas view / workbench overlay. */
  closeCanvasView(): void

  /** Toggle the plugin's custom canvas view / workbench overlay. */
  toggleCanvasView(): void
}

/**
 * The full context object injected into every PDF plugin surface component.
 * Plugins store nothing in module-level state; they work entirely through
 * this context so that document switches reset them cleanly.
 */
export interface PdfPluginContext {
  /** Document state snapshot; updates on doc-state change. */
  readonly doc: PdfPluginDocState | null
  /** Current selection; updates on text-layer selection change. */
  readonly selection: PdfPluginSelection
  /** Document navigation and zoom actions. */
  readonly actions: PdfPluginDocActions
  /** UI chrome helpers (sidebar, modal, toast, canvas view). */
  readonly ui: PdfPluginUiActions
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Plugin Surface Declarations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A sidebar panel rendered beside the PDF document viewport.
 */
export interface PdfPluginSidebarDecl {
  /** Minimum panel width in pixels (default: 320). */
  minWidth?: number
  /** Default open state on first mount (default: false). */
  defaultOpen?: boolean
  /** React component rendered inside the panel. */
  component: React.ComponentType<{ context: PdfPluginContext }>
  /** Optional custom header action buttons beside the close button. */
  headerActions?: React.ComponentType<{ context: PdfPluginContext }>
}

/**
 * A custom ribbon tab added to the PDF ribbon tab strip.
 */
export interface PdfPluginRibbonDecl {
  /** Display label on the tab button (e.g. "Review", "Tools"). */
  label: string
  /** Optional icon shown beside the label on the tab button. */
  icon?: ReactNode
  /**
   * The toolbar panel rendered beneath the tab strip when this tab is active.
   * Receives `onClose` so buttons can return to the Home tab.
   */
  component: React.ComponentType<{
    context: PdfPluginContext
    onClose: () => void
  }>
}

/**
 * Full workbench canvas overlay covering the PDF scroll container.
 */
export interface PdfPluginCanvasViewDecl {
  /** Title or label for accessibility. */
  title: string
  /** Default open state on mount (default: false). */
  defaultOpen?: boolean
  /** React component rendered in the canvas overlay. */
  component: React.ComponentType<{
    context: PdfPluginContext
    onClose: () => void
  }>
}

/**
 * A floating overlay panel anchored to the selection or viewport.
 */
export interface PdfPluginFloatingDecl {
  /** Anchor point: 'selection' (anchored to selected text) or 'fixed'. */
  anchor: 'selection' | 'fixed'
  /** Condition under which this floating panel is visible. */
  visible: (context: PdfPluginContext) => boolean
  /** React component rendered inside the floating popover. */
  component: React.ComponentType<{ context: PdfPluginContext }>
}

/**
 * A full modal dialog.
 */
export interface PdfPluginModalDecl {
  /** Unique ID matching the modalId passed to `ui.openModal(modalId)`. */
  id: string
  /** React component rendered inside the modal dialog. */
  component: React.ComponentType<{
    context: PdfPluginContext
    payload?: unknown
    onClose: () => void
  }>
}

/**
 * A persistent widget in the PDF footer status bar.
 */
export interface PdfPluginStatusBarDecl {
  /** React component rendered inside the status bar slot. */
  component: React.ComponentType<{ context: PdfPluginContext }>
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Plugin Manifest
// ─────────────────────────────────────────────────────────────────────────────

export interface PdfPluginManifest {
  /** Reverse-domain unique identifier (e.g. 'com.example.pdf-annotator'). */
  id: string
  /** Human-readable display name. */
  name: string
  /** Semantic version string (e.g. '1.0.0'). */
  version: string
  /** Short description of plugin functionality. */
  description: string
  /** Optional SVG icon used in headers and tabs. */
  icon?: ReactNode

  /** Optional workbench overlay covering the PDF document viewport. */
  canvasView?: PdfPluginCanvasViewDecl

  /** Optional collapsible sidebar panel. */
  sidebar?: PdfPluginSidebarDecl

  /** Optional custom ribbon tab. */
  ribbon?: PdfPluginRibbonDecl

  /** Optional floating overlays. */
  floatings?: PdfPluginFloatingDecl[]

  /** Optional modal dialogs. */
  modals?: PdfPluginModalDecl[]

  /** Optional status bar widget. */
  statusBar?: PdfPluginStatusBarDecl

  /** Called when the plugin is mounted. */
  onInit?: (context: PdfPluginContext) => void
  /** Called when the plugin is unmounted. */
  onDestroy?: () => void
}

/** Internal state tracked by PdfPluginHost for each plugin. */
export interface PdfPluginRuntimeState {
  manifest: PdfPluginManifest
  sidebarOpen: boolean
  activeRibbonTab: boolean
  canvasViewOpen: boolean
  openModalId: string | null
  openModalPayload: unknown
  initialized: boolean
}
