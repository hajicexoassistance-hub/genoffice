/** Starter Plugin — Status Bar Widget */
import React from 'react'
import type { DocxPluginContext } from '../types'

import { StarterIcon } from './StarterIcon'

export function StarterStatusBar({ context }: { context: DocxPluginContext }) {
  const { doc, ui } = context
  if (!doc) return null
  return (
    <button
      className="status-item status-btn"
      title="Starter Plugin — klik untuk membuka dialog"
      onClick={() => ui.openModal('starter-main-modal', {})}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 4px' }}
    >
      <StarterIcon size={12} />
      <span>Starter</span>
    </button>
  )
}
