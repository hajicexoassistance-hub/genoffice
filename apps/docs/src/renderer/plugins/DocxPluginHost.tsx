import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/core'
import type { Block } from '@genoffice/docx-engine'
import type {
  DocxPluginContext,
  PluginDocState,
  PluginSelection,
  PluginRuntimeState,
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
import { showToast as emitToast } from '../components/toast-bus'

// ─────────────────────────────────────────────────────────────────────────────
// Internal Context (not exposed to plugin authors)
// ─────────────────────────────────────────────────────────────────────────────

const PluginHostContext = createContext<{
  runtimeStates: PluginRuntimeState[]
  updateRuntime: (pluginId: string, patch: Partial<PluginRuntimeState>) => void
} | null>(null)

export function usePluginHostContext() {
  const ctx = useContext(PluginHostContext)
  if (!ctx) throw new Error('PluginHostContext missing — wrap in DocxPluginHost')
  return ctx
}

// ─────────────────────────────────────────────────────────────────────────────
// Host Props
// ─────────────────────────────────────────────────────────────────────────────

export interface DocxPluginHostProps {
  /** Live Tiptap editor; null before any document is opened. */
  editor: Editor | null
  /** Current document state. */
  doc: {
    filePath: string | null
    isDirty: boolean
    isEmpty: boolean
    blocks: Block[]
    wordCount: number
  } | null
  /** Current editor selection metrics. */
  selection: {
    empty: boolean
    from: number
    to: number
    text: string
    blockIndex: number | null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DocxPluginHost — the single mount point in App.tsx
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mount this component **once** in App.tsx, adjacent to <AiPanel>.
 * It renders all registered plugins' surfaces and manages their lifecycle.
 *
 * In App.tsx:
 *   import { DocxPluginHost } from './plugins/DocxPluginHost'
 *   ...
 *   <DocxPluginHost editor={editor} doc={doc} selection={activeSelection} />
 */
export function DocxPluginHost({ editor, doc, selection: propSelection }: DocxPluginHostProps) {
  // ── Reactive selection state directly tracking TipTap editor events ────────
  const [liveSelection, setLiveSelection] = useState<PluginSelection>(() => {
    if (propSelection && !propSelection.empty) return propSelection
    if (!editor) return { empty: true, from: 0, to: 0, text: '', blockIndex: null }
    const { from, to, empty } = editor.state.selection
    const text = empty ? '' : editor.state.doc.textBetween(from, to, ' ')
    const blockIndex = editor.state.selection.$from.index(0)
    return { empty, from, to, text, blockIndex }
  })

  useEffect(() => {
    if (!editor) return
    const update = () => {
      const { from, to, empty } = editor.state.selection
      const text = empty ? '' : editor.state.doc.textBetween(from, to, ' ')
      const blockIndex = editor.state.selection.$from.index(0)
      setLiveSelection({ empty, from, to, text, blockIndex })
    }
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    editor.on('focus', update)
    editor.on('blur', update)
    update()
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
      editor.off('focus', update)
      editor.off('blur', update)
    }
  }, [editor])

  // ── Runtime state per-plugin (sidebar open, active modal, etc.) ────────────
  const [runtimeStates, setRuntimeStates] = useState<PluginRuntimeState[]>(() =>
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

  const updateRuntime = useCallback((pluginId: string, patch: Partial<PluginRuntimeState>) => {
    setRuntimeStates((prev) =>
      prev.map((rs) => (rs.manifest.id === pluginId ? { ...rs, ...patch } : rs)),
    )
  }, [])

  // ── Global Hotkey: Ctrl + T untuk Buka / Tutup Staging Workbench ──────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (e.key === 't' || e.key === 'T' || e.code === 'KeyT')
      ) {
        e.preventDefault()
        e.stopImmediatePropagation()
        setRuntimeStates((prev) =>
          prev.map((rs) => {
            if (rs.manifest.id === 'manuscriber' || rs.manifest.canvasView) {
              return { ...rs, canvasViewOpen: !rs.canvasViewOpen }
            }
            return rs
          }),
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  // ── Toast target element ────────────────────────────────────────────────────
  const toastRef = useRef<((msg: string, kind?: 'info' | 'success' | 'error') => void) | null>(null)

  // ── Build per-plugin context ────────────────────────────────────────────────
  const buildContext = useCallback(
    (pluginId: string, runtime: PluginRuntimeState): DocxPluginContext => {
      const docState: PluginDocState | null = doc
        ? {
            filePath: doc.filePath,
            isDirty: doc.isDirty,
            isEmpty: doc.isEmpty,
            blocks: doc.blocks,
            wordCount: doc.wordCount,
          }
        : null

      const selState = liveSelection

      return {
        editor,
        doc: docState,
        selection: selState,
        actions: {
          insertText(text) {
            editor?.chain().focus().insertContent(text).run()
          },
          replaceSelection(text) {
            if (!editor) return
            editor.chain().focus().deleteSelection().insertContent(text).run()
          },
          insertHtml(html) {
            editor?.chain().focus().insertContent(html).run()
          },
          scrollToBlock(blockIndex) {
            // Find the block's DOM node via data attribute and scroll to it
            const el = document.querySelector(`[data-block-index="${blockIndex}"]`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          },
          focusEditor() {
            editor?.commands.focus()
          },
          insertParagraphAfterSelection(text) {
            if (!editor) return
            try {
              const { state } = editor
              const { $to } = state.selection
              const depth = $to.depth > 0 ? 1 : 0
              const insertPos =
                depth > 0 ? $to.after(depth) : Math.min(state.selection.to, state.doc.content.size)
              editor
                .chain()
                .focus()
                .insertContentAt(insertPos, {
                  type: 'docParagraph',
                  content: text ? [{ type: 'text', text }] : [],
                })
                .run()
            } catch {
              editor.chain().focus().insertContent(`\n${text}`).run()
            }
          },
        },
        ui: {
          showToast(message, kind = 'info') {
            emitToast(message, kind === 'error' ? 'error' : 'success')
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
    [editor, doc, liveSelection, updateRuntime],
  )

  // ── Collect active sidebar plugins ─────────────────────────────────────────
  const sidebarPlugins = runtimeStates.filter((rs) => rs.manifest.sidebar)

  // ── Collect active ribbon tab plugins ──────────────────────────────────────
  const ribbonPlugins = runtimeStates.filter((rs) => rs.manifest.ribbon)

  // ── Collect active canvas workbench plugins ────────────────────────────────
  const canvasViewPlugins = runtimeStates.filter((rs) => rs.manifest.canvasView)

  // ── Status bar plugins ─────────────────────────────────────────────────────
  const statusBarPlugins = runtimeStates.filter((rs) => rs.manifest.statusBar)

  return (
    <PluginHostContext.Provider value={{ runtimeStates, updateRuntime }}>
      {/* ── Sidebar panels ───────────────────────────────────────── */}
      {sidebarPlugins.map((rs) => (
        <PluginSidebarPanel
          key={rs.manifest.id}
          manifest={rs.manifest}
          open={rs.sidebarOpen}
          context={buildContext(rs.manifest.id, rs)}
          onToggle={(open) => updateRuntime(rs.manifest.id, { sidebarOpen: open })}
        />
      ))}

      {/* ── Ribbon tabs injected via portal into ribbon-bar DOM node ─ */}
      {ribbonPlugins.map((rs) => (
        <PluginRibbonTab
          key={rs.manifest.id}
          manifest={rs.manifest}
          active={rs.activeRibbonTab}
          context={buildContext(rs.manifest.id, rs)}
          onActivate={(active: boolean) =>
            updateRuntime(rs.manifest.id, { activeRibbonTab: active })
          }
        />
      ))}

      {/* ── Canvas workbench overlays (covers document paper) ───── */}
      {canvasViewPlugins.map((rs) => (
        <PluginCanvasView
          key={rs.manifest.id}
          manifest={rs.manifest}
          open={rs.canvasViewOpen}
          context={buildContext(rs.manifest.id, rs)}
          onClose={() => updateRuntime(rs.manifest.id, { canvasViewOpen: false })}
        />
      ))}

      {/* ── Floating overlays (selection popover, fixed panels, etc.) */}
      {runtimeStates
        .filter((rs) => rs.manifest.floatings?.length)
        .map((rs) => (
          <PluginFloatingLayer
            key={rs.manifest.id}
            floatings={rs.manifest.floatings!}
            context={buildContext(rs.manifest.id, rs)}
          />
        ))}

      {/* ── Modal dialogs ────────────────────────────────────────── */}
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

      {/* ── Status bar widgets ───────────────────────────────────── */}
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
    </PluginHostContext.Provider>
  )
}

export type { DocxPluginContext }
