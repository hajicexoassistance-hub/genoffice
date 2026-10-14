/**
 * PluginCanvasView — renders a full canvas view / workbench overlay
 * directly covering the Word document paper area (#plugin-canvas-slot).
 */
import React from 'react'
import { createPortal } from 'react-dom'
import type { DocxPluginContext, DocxPluginManifest } from '../types'

interface Props {
  manifest: DocxPluginManifest
  open: boolean
  context: DocxPluginContext
  onClose: () => void
}

export function PluginCanvasView({ manifest, open, context, onClose }: Props) {
  const { canvasView } = manifest
  if (!canvasView || !open) return null

  const CanvasComponent = canvasView.component
  const targetSlot = document.getElementById('plugin-canvas-slot')
  if (!targetSlot) return null

  return createPortal(
    <div
      className="plugin-canvas-view"
      data-plugin-id={manifest.id}
      role="region"
      aria-label={`${manifest.name} Workbench`}
    >
      <CanvasComponent context={context} onClose={onClose} />
    </div>,
    targetSlot,
  )
}
