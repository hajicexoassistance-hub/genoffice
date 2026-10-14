/**
 * PluginStatusBar — renders status bar widgets registered by plugins.
 */
import React from 'react'
import type { PdfPluginContext, PdfPluginManifest } from '../types'

interface Props {
  manifest: PdfPluginManifest
  context: PdfPluginContext
}

export function PluginStatusBar({ manifest, context }: Props) {
  const { statusBar } = manifest
  if (!statusBar) return null

  const StatusBarComponent = statusBar.component

  return (
    <div
      className="plugin-statusbar-item"
      data-plugin-id={manifest.id}
      title={`${manifest.name} status`}
    >
      <StatusBarComponent context={context} />
    </div>
  )
}
