/**
 * Starter Plugin — Modal Dialog
 *
 * Dialog interaktif yang dipicu oleh ui.openModal('starter-main-modal').
 */
import React, { useState } from 'react'
import type { DocxPluginContext } from '../types'
import '../plugin-system.css'

interface Props {
  context: DocxPluginContext
  initialPayload: unknown
  onClose: () => void
}

export function StarterModal({ context, initialPayload, onClose }: Props) {
  const payload = initialPayload as { title?: string } | undefined

  const { actions, ui, doc } = context
  const [text, setText] = useState('')
  const [format, setFormat] = useState<'plain' | 'html'>('plain')
  const [loading, setLoading] = useState(false)

  async function handleInsert() {
    if (!text.trim()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 300))
    if (format === 'html') {
      actions.insertHtml(text)
    } else {
      actions.insertText(text)
    }
    ui.showToast('Konten berhasil disisipkan dari dialog', 'success')
    setLoading(false)
    onClose()
  }

  return (
    <>
      {/* Header */}
      <div className="plugin-modal-header">
        <span className="plugin-modal-title">
          {payload?.title ?? 'Starter Plugin — Sisipkan Konten'}
        </span>
        <button
          className="plugin-btn-icon"
          onClick={onClose}
          aria-label="Tutup dialog"
          title="Tutup dialog (Esc)"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} width={14} height={14}>
            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="plugin-modal-body">
        {doc?.filePath && (
          <div className="plugin-banner info">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={15} height={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--word-blue)' }}>
              <rect x="2" y="2" width="12" height="12" rx="1.5" />
              <path d="M5 5h6M5 8h6M5 11h3" />
            </svg>
            <span>Target dokumen: <strong>{doc.filePath.split(/[\\/]/).pop()}</strong></span>
          </div>
        )}

        <div className="plugin-field">
          <label className="plugin-label" htmlFor="starter-modal-format">
            Format Masukan
          </label>
          <select
            id="starter-modal-format"
            className="plugin-input plugin-select"
            value={format}
            onChange={(e) => setFormat(e.target.value as 'plain' | 'html')}
          >
            <option value="plain">Teks Biasa (Plain Text)</option>
            <option value="html">Fragmen HTML (Rich Text)</option>
          </select>
        </div>

        <div className="plugin-field">
          <label className="plugin-label" htmlFor="starter-modal-text">
            Isi Konten
          </label>
          <textarea
            id="starter-modal-text"
            className="plugin-input plugin-textarea"
            rows={5}
            placeholder={
              format === 'html'
                ? '<p>Contoh: <strong>Paragraf tebal</strong> atau <em>miring</em>...</p>'
                : 'Ketik atau tempel teks yang ingin disisipkan ke posisi kursor...'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {format === 'html' && (
          <div className="plugin-banner warning">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={14} height={14} style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M8 1L15 14H1L8 1z" />
              <path d="M8 6v4M8 12v.5" />
            </svg>
            HTML akan disanitasi secara aman sebelum disisipkan ke dokumen.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="plugin-modal-footer">
        <button className="plugin-btn-secondary" onClick={onClose} disabled={loading}>
          Batal
        </button>
        <button
          className="plugin-btn-primary"
          onClick={handleInsert}
          disabled={!text.trim() || loading}
        >
          {loading ? (
            <><span className="plugin-spinner" /> Menyisipkan…</>
          ) : (
            'Sisipkan ke Dokumen'
          )}
        </button>
      </div>
    </>
  )
}
