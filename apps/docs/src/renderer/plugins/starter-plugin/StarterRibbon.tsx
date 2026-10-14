/** Starter Plugin — Ribbon Tab Content */
import React from 'react'
import type { DocxPluginContext } from '../types'
import '../plugin-system.css'

interface Props {
  context: DocxPluginContext
  onClose: () => void
}

export function StarterRibbon({ context, onClose }: Props) {
  const { actions, ui, selection, doc } = context

  function insertTimestamp() {
    const ts = new Date().toLocaleString()
    actions.insertText(`[${ts}]`)
    ui.showToast('Timestamp inserted', 'success')
  }

  function insertHorizontalRule() {
    actions.insertHtml('<hr />')
    ui.showToast('Separator inserted', 'success')
  }

  function wrapSelectionInBrackets() {
    if (selection.empty) {
      ui.showToast('Select some text first', 'error')
      return
    }
    actions.replaceSelection(`[${selection.text}]`)
    ui.showToast('Selection wrapped', 'success')
  }

  function openFullDialog() {
    ui.openModal('starter-main-modal', { title: 'Opened from Ribbon' })
  }

  return (
    <>
      {/* Group: Sisipkan / Insert */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button className="rb-big" onClick={insertTimestamp} data-tip="Sisipkan waktu saat ini ke dokumen">
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={26} height={26}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
            </span>
            <span>Waktu</span>
          </button>
          <button className="rb-big" onClick={insertHorizontalRule} data-tip="Sisipkan garis pemisah horizontal">
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={26} height={26}>
                <path d="M3 12h18" strokeWidth={2.5} />
              </svg>
            </span>
            <span>Pemisah</span>
          </button>
        </div>
        <div className="ribbon-group-label">Sisipkan</div>
      </div>

      <div className="ribbon-sep" />

      {/* Group: Edit Seleksi */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="rb-big"
            onClick={wrapSelectionInBrackets}
            disabled={selection.empty}
            data-tip={selection.empty ? 'Pilih teks di dokumen terlebih dahulu' : 'Bungkus teks terpilih dengan [ ]'}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={26} height={26}>
                <path d="M8 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" />
                <path d="M16 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" />
                <path d="M9 12h6" strokeDasharray="2 2" />
              </svg>
            </span>
            <span>Bungkus [ ]</span>
          </button>
        </div>
        <div className="ribbon-group-label">Teks Terpilih</div>
      </div>

      <div className="ribbon-sep" />

      {/* Group: Alat / Tools */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="rb-big"
            onClick={() => ui.toggleCanvasView()}
            data-tip="Buka tampilan Staging / Workbench custom (menutupi lembar Word)"
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={26} height={26}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </span>
            <span>Staging View</span>
          </button>
          <button className="rb-big" onClick={openFullDialog} data-tip="Buka dialog penuh Starter Plugin">
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={26} height={26}>
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M8 12h8M12 8v8" />
              </svg>
            </span>
            <span>Dialog…</span>
          </button>
        </div>
        <div className="ribbon-group-label">Alat</div>
      </div>
    </>
  )
}
