/**
 * GenOffice Docs Plugin System — Public Contract Types
 *
 * This file defines the full public API surface for Docs plugins.
 * Plugins MUST only depend on types exported here; they must NOT import
 * directly from App.tsx, Ribbon.tsx, or any other upstream file.
 *
 * Coordinate convention: pixel values are CSS pixels at devicePixelRatio=1
 * unless stated otherwise.
 */

import type { ReactNode } from 'react'
import type { Editor } from '@tiptap/core'
import type { Block } from '@genoffice/docx-engine'

// ─────────────────────────────────────────────────────────────────────────────
// 1. Plugin Context — the "world view" passed to every plugin surface
// ─────────────────────────────────────────────────────────────────────────────

/** Read-only snapshot of the currently open document. */
export interface PluginDocState {
  /** Absolute path on disk; null when the document is untitled. */
  readonly filePath: string | null
  /** True when there are unsaved changes. */
  readonly isDirty: boolean
  /** True when the document has no content blocks yet. */
  readonly isEmpty: boolean
  /** Parsed block tree from docx-engine (read-only view). */
  readonly blocks: readonly Block[]
  /** Word count of the body text. */
  readonly wordCount: number
}

/** Read-only snapshot of the current editor selection. */
export interface PluginSelection {
  /** true when nothing is selected. */
  readonly empty: boolean
  /** ProseMirror `from` position. */
  readonly from: number
  /** ProseMirror `to` position. */
  readonly to: number
  /** Plain text of the selected range. Empty string when `empty`. */
  readonly text: string
  /** Block index of the paragraph/heading containing the caret. */
  readonly blockIndex: number | null
}

/** Actions a plugin can trigger on the document editor. */
export interface PluginDocActions {
  /**
   * Insert plain text at the current caret position, collapsing any selection.
   * The editor must be editable; a no-op when it is read-only.
   */
  insertText(text: string): void

  /**
   * Replace the current selection with the given text.
   * If the selection is empty, inserts at the caret.
   */
  replaceSelection(text: string): void

  /**
   * Insert an HTML fragment at the caret. Only a restricted subset of HTML
   * is accepted (the same subset used by docs AI edit ops). Complex styling
   * and block structure beyond paragraphs and basic marks may be simplified.
   */
  insertHtml(html: string): void

  /**
   * Scroll the document canvas to make the block at `blockIndex` visible.
   * No-op when the index is out of range.
   */
  scrollToBlock(blockIndex: number): void

  /**
   * Focus the editor window (brings caret into view, fires Electron focus).
   */
  focusEditor(): void

  /**
   * Insert a new paragraph immediately after the currently selected block,
   * without deleting or replacing the current selection.
   */
  insertParagraphAfterSelection(text: string): void
}

/** Actions a plugin can trigger on the host UI chrome. */
export interface PluginUiActions {
  /**
   * Show a toast notification in the Docs chrome.
   * Messages auto-dismiss after 2 s (info/success) or 4 s (error).
   */
  showToast(message: string, kind?: 'info' | 'success' | 'error'): void

  /**
   * Open a modal registered by this plugin (by `modalId`).
   * The payload is forwarded to the modal component as `initialPayload`.
   */
  openModal(modalId: string, payload?: unknown): void

  /**
   * Close any open modal registered by this plugin.
   */
  closeModal(): void

  /**
   * Expand the plugin's own sidebar panel (if it has one).
   */
  expandSidebar(): void

  /**
   * Collapse the plugin's own sidebar panel (if it has one).
   */
  collapseSidebar(): void

  /**
   * Open the plugin's custom canvas view / workbench (overlaying the Word document paper).
   */
  openCanvasView(): void

  /**
   * Close the plugin's custom canvas view / workbench (returning to the Word document paper).
   */
  closeCanvasView(): void

  /**
   * Toggle the plugin's custom canvas view / workbench.
   */
  toggleCanvasView(): void
}

/**
 * The full context object injected into every plugin surface component.
 * Plugins store nothing in module-level state; they work entirely through
 * this context so that hot-reload and document switches reset them cleanly.
 */
export interface DocxPluginContext {
  /** Live Tiptap editor instance. Null before the first document is opened. */
  readonly editor: Editor | null
  /** Document state snapshot; updates on every doc-state change. */
  readonly doc: PluginDocState | null
  /** Current editor selection; updates on every cursor/selection change. */
  readonly selection: PluginSelection
  /** Document mutation helpers. */
  readonly actions: PluginDocActions
  /** UI chrome helpers. */
  readonly ui: PluginUiActions
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Plugin Surface Declarations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A sidebar panel rendered beside the Docs canvas.
 * It can be toggled open/closed by the user or by `ui.expandSidebar()`.
 */
export interface PluginSidebarDecl {
  /** Minimum panel width in pixels (default: 280). */
  minWidth?: number
  /** Default open state on first mount (default: false). */
  defaultOpen?: boolean
  /** The React component rendered inside the panel. */
  component: React.ComponentType<{ context: DocxPluginContext }>
  /** Optional custom header action buttons rendered to the left of the close button. */
  headerActions?: React.ComponentType<{ context: DocxPluginContext }>
}

/**
 * A ribbon tab added to the Docs ribbon bar.
 * The tab appears after all upstream tabs; the user can activate it.
 */
export interface PluginRibbonDecl {
  /** Tab label shown in the ribbon bar. */
  label: string
  /** Optional icon element shown next to the label. */
  icon?: ReactNode
  /**
   * The React component rendered as the tab band content.
   * It receives the plugin context and a close-tab callback.
   */
  component: React.ComponentType<{
    context: DocxPluginContext
    onClose: () => void
  }>
}

/**
 * A floating overlay rendered inside the editor scroll area, above the page.
 * Use for: selection-context toolbars, inline suggestion chips, ruler overlays.
 * The overlay is unmounted when `visible` returns false.
 */
export interface PluginFloatingDecl {
  /** Optional identifier for the floating declaration. */
  id?: string
  /**
   * Whether the overlay should be visible. Evaluated on every context update.
   * The Host will mount/unmount the component when the value transitions.
   */
  visible: (ctx: DocxPluginContext) => boolean
  /**
   * Determines where the overlay is anchored:
   * - 'selection': positioned relative to the current selection bounding box.
   * - 'fixed': uses CSS fixed positioning — the component controls its own
   *   placement via inline styles.
   * - 'ai-ask': anchored alongside the native "Tanya AI" selection button.
   */
  anchor: 'selection' | 'fixed' | 'ai-ask'
  /** The React component rendered as the floating overlay. */
  component: React.ComponentType<{
    context: DocxPluginContext
    selectionRect: DOMRect | null
  }>
}

/**
 * A full-screen modal dialog triggered by `ui.openModal(modalId)`.
 * Multiple modals may be declared; each needs a unique `id`.
 */
export interface PluginModalDecl {
  /** Unique id within the plugin; must match the id passed to `openModal`. */
  id: string
  /** React component rendered in the modal overlay. */
  component: React.ComponentType<{
    context: DocxPluginContext
    /** Arbitrary data forwarded from `openModal(id, payload)`. */
    initialPayload: unknown
    onClose: () => void
  }>
}

/**
 * A status-bar widget rendered in the bottom status bar of the Docs window.
 * Useful for showing live state (word count, plugin status, connection info).
 */
export interface PluginStatusBarDecl {
  /** React component rendered as an inline chip in the status bar. */
  component: React.ComponentType<{ context: DocxPluginContext }>
}

/**
 * A custom canvas view / workbench overlay that covers the Word document paper area.
 * Useful for: staging views, block transcription, manuscript comparison, rich forms, diff viewer.
 */
export interface PluginCanvasViewDecl {
  /** Optional title for the canvas view / workbench */
  title?: string
  /** Whether the canvas view is open by default on document load (default: false) */
  defaultOpen?: boolean
  /**
   * The React component rendered inside the canvas view overlay.
   * Receives the plugin context and an onClose callback to return to the Word document.
   */
  component: React.ComponentType<{
    context: DocxPluginContext
    onClose: () => void
  }>
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Plugin Manifest — the public declaration of a plugin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete declaration of a single plugin.
 * Export one object implementing this interface as the default export of
 * your plugin's `index.ts` and register it in `plugins/registry.ts`.
 */
export interface DocxPluginManifest {
  /**
   * Unique plugin identifier. Use reverse-domain notation:
   *   e.g. "com.mycompany.contract-generator"
   * Must be stable across versions; used as a persistence key.
   */
  id: string

  /** Human-readable display name (used in Settings and tooltips). */
  name: string

  /** Semver string, e.g. "1.0.0". */
  version: string

  /** Short description shown in the plugin settings page. */
  description?: string

  /**
   * Icon element. Use a 20×20 SVG for best results.
   * Shown in the ribbon bar tab, sidebar toggle, and settings list.
   */
  icon?: ReactNode

  // ── Optional surfaces ──────────────────────────────────────────────────────

  /** Declares a sidebar panel. Optional. */
  sidebar?: PluginSidebarDecl

  /** Declares a ribbon tab. Optional. */
  ribbon?: PluginRibbonDecl

  /** Declares floating overlays. Optional. Multiple allowed. */
  floatings?: PluginFloatingDecl[]

  /** Declares modal dialogs. Optional. Multiple allowed. */
  modals?: PluginModalDecl[]

  /** Declares a status-bar widget. Optional. */
  statusBar?: PluginStatusBarDecl

  /** Declares a custom canvas view / workbench overlay covering the Word paper. Optional. */
  canvasView?: PluginCanvasViewDecl

  // ── Lifecycle hooks ────────────────────────────────────────────────────────

  /**
   * Called once when the plugin is loaded (after the first document is ready).
   * Use for one-time setup: registering IPC listeners, initialising state, etc.
   * Must not mutate the document or trigger renders at this stage.
   */
  onInit?: (context: DocxPluginContext) => void | Promise<void>

  /**
   * Called when the plugin is unloaded (app close or plugin disabled in Settings).
   * Must cancel any timers, subscriptions, or IPC listeners set up in `onInit`.
   */
  onDestroy?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Host-internal helpers (not part of the plugin author's API)
// ─────────────────────────────────────────────────────────────────────────────

/** Internal; used by DocxPluginHost to track mounted plugin state. */
export interface PluginRuntimeState {
  manifest: DocxPluginManifest
  sidebarOpen: boolean
  activeRibbonTab: boolean
  canvasViewOpen: boolean
  openModalId: string | null
  openModalPayload: unknown
  initialized: boolean
}

