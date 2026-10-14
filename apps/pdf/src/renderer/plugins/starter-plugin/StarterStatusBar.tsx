import React from 'react'
import type { PdfPluginContext } from '../types'
import { StarterIcon } from './StarterIcon'

interface Props {
  context: PdfPluginContext
}

export function StarterStatusBar({ context }: Props) {
  const { ui } = context

  return (
    <button
      onClick={() => ui.toggleSidebar()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        border: 'none',
        background: 'transparent',
        color: 'inherit',
        cursor: 'pointer',
        fontSize: '11px',
        padding: '0 4px',
      }}
      title="Klik untuk membuka / menutup Starter Sidebar"
    >
      <StarterIcon size={12} />
      <span>Starter</span>
    </button>
  )
}
