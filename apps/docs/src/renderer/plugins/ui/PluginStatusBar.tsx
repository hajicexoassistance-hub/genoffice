/**
 * PluginStatusBar — renders a plugin's status-bar widget.
 */
import React from 'react'
import { createPortal } from 'react-dom'
import type { DocxPluginContext, DocxPluginManifest } from '../types'

interface Props {
  manifest: DocxPluginManifest
  context: DocxPluginContext
}

export function PluginStatusBar({ manifest, context }: Props) {
  if (!manifest.statusBar) return null
  const StatusComponent = manifest.statusBar.component
  return (
    <span className="plugin-statusbar-widget" data-plugin-id={manifest.id}>
      <StatusComponent context={context} />
    </span>
  )
}
