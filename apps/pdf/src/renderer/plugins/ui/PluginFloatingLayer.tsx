/**
 * PluginFloatingLayer — renders floating popovers for a plugin.
 *
 * For 'selection' anchors: positions above the current window selection.
 * For 'fixed' anchors: renders into #plugin-floating-slot or document.body.
 */
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PdfPluginContext, PdfPluginFloatingDecl } from '../types'

interface Props {
  floatings: PdfPluginFloatingDecl[]
  context: PdfPluginContext
}

export function PluginFloatingLayer({ floatings, context }: Props) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const updateCoords = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setCoords(null)
        return
      }
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) {
        setCoords(null)
        return
      }
      setCoords({
        top: Math.max(10, rect.top - 46),
        left: Math.max(10, Math.min(rect.left + rect.width / 2, window.innerWidth - 160)),
      })
    }

    document.addEventListener('selectionchange', updateCoords)
    window.addEventListener('scroll', updateCoords, true)
    return () => {
      document.removeEventListener('selectionchange', updateCoords)
      window.removeEventListener('scroll', updateCoords, true)
    }
  }, [])

  const slot = document.getElementById('plugin-floating-slot') ?? document.body

  return (
    <>
      {floatings.map((decl, idx) => {
        if (!decl.visible(context)) return null
        const Component = decl.component

        if (decl.anchor === 'selection') {
          if (!coords) return null
          return createPortal(
            <div
              key={idx}
              className="plugin-floating-portal"
              style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="plugin-floating-card">
                <Component context={context} />
              </div>
            </div>,
            slot,
          )
        }

        // 'fixed' anchor
        return createPortal(
          <div key={idx} className="plugin-floating-portal">
            <div className="plugin-floating-card">
              <Component context={context} />
            </div>
          </div>,
          slot,
        )
      })}
    </>
  )
}
