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

/** Gets the bounding rect of the current browser selection, or null. */
function getSelectionRect(): DOMRect | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  return range.getBoundingClientRect()
}

export function PluginFloatingLayer({ floatings, context }: Props) {
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    function update() {
      setSelectionRect(getSelectionRect())
    }
    // Update on selection changes
    document.addEventListener('selectionchange', update)
    // Also update on scroll so position tracks the page
    window.addEventListener('scroll', update, true)
    update()
    return () => {
      document.removeEventListener('selectionchange', update)
      window.removeEventListener('scroll', update, true)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

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
            zIndex: 9000,
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
            <div key={idx} className="plugin-floating-anchor-fixed" style={{ zIndex: 9000 }}>
              <FloatComponent context={context} selectionRect={selectionRect} />
            </div>,
            floatingRoot,
          )
        }

        return null
      })}
    </>
  )
}
