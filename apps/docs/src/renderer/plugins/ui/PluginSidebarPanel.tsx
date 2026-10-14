/**
 * PluginSidebarPanel — renders a collapsible panel beside the Docs canvas.
 *
 * Placed outside the editor (.app-content) as a direct flex child of .app-main,
 * running full height from below the ribbon down to the window bottom (matching Genspark AI).
 * Supports horizontal drag-resizing up to a maximum of 50% of the total screen width.
 */
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DocxPluginContext, DocxPluginManifest } from '../types'

interface Props {
  manifest: DocxPluginManifest
  open: boolean
  context: DocxPluginContext
  onToggle: (open: boolean) => void
}

export function PluginSidebarPanel({ manifest, open, context, onToggle }: Props) {
  const { sidebar } = manifest
  if (!sidebar) return null

  const PanelComponent = sidebar.component
  const HeaderActionsComponent = sidebar.headerActions
  const minWidth = sidebar.minWidth ?? 360
  const storageKey = `docs-plugin-sidebar-width-${manifest.id}`

  function maxPanelWidth(): number {
    return Math.max(minWidth, Math.round(window.innerWidth * 0.5))
  }

  function clampWidth(w: number): number {
    return Math.min(Math.max(w, minWidth), maxPanelWidth())
  }

  function loadPreferredWidth(): number {
    const saved = Number(localStorage.getItem(storageKey))
    return Number.isFinite(saved) && saved > 0 ? clampWidth(saved) : minWidth
  }

  const [panelWidth, setPanelWidth] = useState<number>(loadPreferredWidth)
  const [resizing, setResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const preferredWidthRef = useRef(panelWidth)

  // Ensure width respects the 50% window maximum on window resize
  useEffect(() => {
    const onResize = () => {
      const clamped = clampWidth(preferredWidthRef.current)
      setPanelWidth(clamped)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [minWidth])

  // Horizontal drag resize handler (expands towards the left, up to 50% max)
  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const resizer = e.currentTarget
    setResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: PointerEvent) => {
      const panelEl = panelRef.current
      if (!panelEl) return
      const rect = panelEl.getBoundingClientRect()
      // Dragging leftwards increases panel width from the right window edge
      const rawWidth = rect.right - ev.clientX
      const clamped = clampWidth(rawWidth)
      preferredWidthRef.current = clamped
      setPanelWidth(clamped)
    }

    let done = false
    const cleanup = () => {
      if (done) return
      done = true
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', cleanup)
      window.removeEventListener('pointercancel', cleanup)
      resizer.removeEventListener('lostpointercapture', cleanup)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setResizing(false)
      localStorage.setItem(storageKey, String(Math.round(preferredWidthRef.current)))
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', cleanup)
    window.addEventListener('pointercancel', cleanup)
    resizer.addEventListener('lostpointercapture', cleanup)
    resizer.setPointerCapture(e.pointerId)
  }

  return createPortal(
    <div
      ref={panelRef}
      className={`plugin-sidebar-panel${open ? ' open' : ' collapsed'}${resizing ? ' resizing' : ''}`}
      style={
        {
          '--plugin-sidebar-width': `${panelWidth}px`,
          width: open ? `${panelWidth}px` : '34px',
          maxWidth: '50vw',
        } as React.CSSProperties
      }
      data-plugin-id={manifest.id}
      aria-label={`${manifest.name} panel`}
      role="complementary"
    >
      {!open ? (
        <button
          className="plugin-sidebar-rail"
          onClick={() => onToggle(true)}
          title={`Buka ${manifest.name}`}
          aria-expanded={false}
        >
          <span className="plugin-sidebar-rail-icon" aria-hidden>
            {manifest.icon}
          </span>
          <span className="plugin-sidebar-rail-label">{manifest.name}</span>
        </button>
      ) : (
        <div className="plugin-sidebar-body" aria-hidden={false}>
          {/* Drag handle on the left edge allowing resizing up to 50% max */}
          <div
            className="plugin-sidebar-resizer ai-panel-resizer"
            onPointerDown={startResize}
            role="separator"
            aria-orientation="vertical"
            aria-label="Ubah ukuran sidebar"
          />

          <div className="ai-panel-header plugin-sidebar-header">
            <span className="ai-panel-title plugin-sidebar-title">
              {manifest.icon && (
                <span className="plugin-sidebar-title-icon" aria-hidden>
                  {manifest.icon}
                </span>
              )}
              {manifest.name}
            </span>
            <div className="ai-panel-header-actions plugin-sidebar-header-actions">
              {HeaderActionsComponent && (
                <>
                  <div className="plugin-sidebar-custom-actions">
                    <HeaderActionsComponent context={context} />
                  </div>
                  <span className="plugin-sidebar-header-separator" aria-hidden />
                </>
              )}
              <button
                className="ai-header-btn plugin-sidebar-close"
                onClick={() => onToggle(false)}
                title={`Tutup ${manifest.name}`}
                aria-label={`Tutup ${manifest.name}`}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} width={14} height={14}>
                  <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="plugin-sidebar-content">
            <PanelComponent context={context} />
          </div>
        </div>
      )}
    </div>,
    document.getElementById('plugin-sidebar-slot') ?? document.body,
  )
}
