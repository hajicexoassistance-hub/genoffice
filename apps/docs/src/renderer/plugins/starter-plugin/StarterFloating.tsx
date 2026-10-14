/**
 * Starter Plugin — Floating Selection Popover
 *
 * Popover yang muncul saat ada teks dipilih di dokumen.
 */
import React from 'react'
import type { DocxPluginContext } from '../types'
import '../plugin-system.css'

interface Props {
  context: DocxPluginContext
  selectionRect: DOMRect | null
}

export function StarterFloating({ context, selectionRect }: Props) {
  const { selection, actions, ui } = context

  if (!selectionRect || selection.empty) return null

  const wordCount = selection.text.trim().split(/\s+/).filter(Boolean).length

  function handleUpperCase() {
    actions.replaceSelection(selection.text.toUpperCase())
    ui.showToast('Diubah ke HURUF BESAR', 'success')
  }

  function handleLowerCase() {
    actions.replaceSelection(selection.text.toLowerCase())
    ui.showToast('Diubah ke huruf kecil', 'success')
  }

  function handleCopy() {
    navigator.clipboard.writeText(selection.text).catch(() => {})
    ui.showToast('Teks disalin ke papan klip', 'success')
  }

  return (
    <div className="plugin-floating-card" role="toolbar" aria-label="Aksi cepat seleksi">
      {/* Word count badge */}
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        padding: '0 6px 0 2px',
        borderRight: '1px solid var(--border)',
        marginRight: 2,
        whiteSpace: 'nowrap',
      }}>
        {wordCount} kata
      </span>

      {/* Action buttons */}
      <button
        className="plugin-btn-icon"
        onClick={handleUpperCase}
        title="Ubah ke HURUF BESAR"
        aria-label="HURUF BESAR"
        style={{ width: 24, height: 24, fontSize: 10, fontWeight: 700 }}
      >
        AA
      </button>

      <button
        className="plugin-btn-icon"
        onClick={handleLowerCase}
        title="Ubah ke huruf kecil"
        aria-label="huruf kecil"
        style={{ width: 24, height: 24, fontSize: 10, fontWeight: 500 }}
      >
        aa
      </button>

      <button
        className="plugin-btn-icon"
        onClick={handleCopy}
        title="Salin ke papan klip"
        aria-label="Salin"
        style={{ width: 24, height: 24 }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={13} height={13}>
          <rect x="5" y="5" width="9" height="9" rx="1.5" />
          <path d="M11 5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1" />
        </svg>
      </button>
    </div>
  )
}
