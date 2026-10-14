import React from 'react'
import type { PdfPluginContext } from '../types'

interface Props {
  context: PdfPluginContext
}

export function StarterFloating({ context }: Props) {
  const { selection, ui } = context
  const textPreview =
    selection.text.length > 20 ? `${selection.text.substring(0, 20)}...` : selection.text

  const handleCopy = () => {
    navigator.clipboard.writeText(selection.text)
    ui.showToast('Teks PDF disalin ke papan klip', 'success')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
      <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={13} height={13}>
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </svg>
        <i>"{textPreview}"</i>
      </span>
      <button
        onClick={handleCopy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '4px',
          border: 'none',
          background: 'var(--accent, #0078d4)',
          color: '#ffffff',
          cursor: 'pointer',
          fontSize: '11px',
        }}
        title="Salin ke papan klip"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={12} height={12}>
          <rect width="14" height="14" x="8" y="8" rx="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
        <span>Salin</span>
      </button>
      <button
        onClick={() =>
          ui.showToast(`Panjang teks terpilih: ${selection.text.length} karakter`, 'info')
        }
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '4px',
          border: '1px solid var(--border, #ccc)',
          background: 'transparent',
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: '11px',
        }}
        title="Informasi seleksi"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={12} height={12}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <span>Info</span>
      </button>
    </div>
  )
}
