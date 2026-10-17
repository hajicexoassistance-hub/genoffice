/**
 * PluginFloatingLayer — renders floating overlays above the editor canvas.
 *
 * Supports two anchor modes:
 *   - 'selection': positions relative to the current selection's bounding box.
 *   - 'fixed': the plugin component controls its own CSS positioning.
 */
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DocxPluginContext, PluginFloatingDecl } from '../types'

interface Props {
  floatings: PluginFloatingDecl[]
  context: DocxPluginContext
}

/** Gets the bounding rect of the current selection from TipTap or browser window. */
function getSelectionRect(editor: any): DOMRect | null {
  if (editor?.view && !editor.state.selection.empty) {
    try {
      const { from, to } = editor.state.selection
      const a = editor.view.coordsAtPos(from)
      const b = editor.view.coordsAtPos(to)
      const left = Math.min(a.left, b.left)
      const top = Math.min(a.top, b.top)
      const right = Math.max(a.right, b.right)
      const bottom = Math.max(a.bottom, b.bottom)
      return new DOMRect(left, top, Math.max(right - left, 1), Math.max(bottom - top, 1))
    } catch {
      // fallback to window.getSelection
    }
  }
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null
  try {
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    return (rect.width > 0 || rect.height > 0) ? rect : null
  } catch {
    return null
  }
}

export function PluginFloatingLayer({ floatings, context }: Props) {
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(() => getSelectionRect(context.editor))
  const rafRef = useRef(0)

  useEffect(() => {
    function update() {
      setSelectionRect(getSelectionRect(context.editor))
    }
    update()

    document.addEventListener('selectionchange', update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)

    if (context.editor) {
      context.editor.on('selectionUpdate', update)
      context.editor.on('transaction', update)
      context.editor.on('focus', update)
      context.editor.on('blur', update)
    }

    return () => {
      document.removeEventListener('selectionchange', update)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
      if (context.editor) {
        context.editor.off('selectionUpdate', update)
        context.editor.off('transaction', update)
        context.editor.off('focus', update)
        context.editor.off('blur', update)
      }
      cancelAnimationFrame(rafRef.current)
    }
  }, [context.editor, context.selection])

  const floatingRoot = document.getElementById('plugin-floating-slot') ?? document.body

  return (
    <>
      {floatings.map((decl, idx) => {
        const isVisible = decl.visible(context)
        if (!isVisible) return null
        const FloatComponent = decl.component

        if (decl.anchor === 'selection' && selectionRect) {
          const style: React.CSSProperties = {
            position: 'fixed',
            top: selectionRect.bottom + 8,
            left: selectionRect.left + selectionRect.width / 2,
            transform: 'translateX(-50%)',
            zIndex: 99999,
            pointerEvents: 'auto',
          }
          return createPortal(
            <div key={idx} style={style} className="plugin-floating-anchor-selection">
              <FloatComponent context={context} selectionRect={selectionRect} />
            </div>,
            floatingRoot,
          )
        }

        if (decl.anchor === 'fixed') {
          return createPortal(
            <div key={decl.id || idx} className="plugin-floating-anchor-fixed" style={{ zIndex: 99999, pointerEvents: 'auto' }}>
              <FloatComponent context={context} selectionRect={selectionRect} />
            </div>,
            floatingRoot,
          )
        }

        if (decl.anchor === 'ai-ask') {
          return (
            <FloatComponent
              key={decl.id || idx}
              context={context}
              selectionRect={selectionRect}
            />
          )
        }

        return null
      })}
    </>
  )
}
