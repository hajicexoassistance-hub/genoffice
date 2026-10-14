/** Starter Plugin — Sidebar Panel */
import React, { useState } from 'react'
import type { DocxPluginContext } from '../types'
import '../plugin-system.css'

export function StarterSidebar({ context }: { context: DocxPluginContext }) {
  const { doc, selection, actions, ui } = context
  const [inputText, setInputText] = useState('')

  // ── Derived state ───────────────────────────────────────────────────────────
  const hasDoc = !!doc
  const selText = selection.text
  const wordCount = doc?.wordCount ?? 0
  const blockCount = doc?.blocks.length ?? 0
  const fileName = doc?.filePath ? doc.filePath.split(/[\\/]/).pop() : 'Dokumen Tanpa Judul'

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleInsert() {
    if (!inputText.trim()) return
    actions.insertText(inputText)
    ui.showToast('Teks berhasil disisipkan', 'success')
    setInputText('')
  }

  function handleReplaceSelection() {
    if (!selText || !inputText.trim()) return
    actions.replaceSelection(inputText)
    ui.showToast('Teks terpilih berhasil diganti', 'success')
    setInputText('')
  }

  function handleOpenModal() {
    ui.openModal('starter-main-modal', { title: 'Starter Plugin — Dialog Interaktif' })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!hasDoc) {
    return (
      <div className="plugin-empty">
        <span className="plugin-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={36} height={36}>
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 8h8M8 12h8M8 16h4" />
          </svg>
        </span>
        <span className="plugin-empty-title">Tidak ada dokumen terbuka</span>
        <span className="plugin-empty-desc">Buka atau buat dokumen untuk menggunakan plugin ini.</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Document Stats ────────────────────────────────────────── */}
      <section className="plugin-section">
        <h4 className="plugin-section-title">Dokumen</h4>
        <div className="plugin-stats-grid">
          <div className="plugin-stat-card">
            <span className="plugin-stat-value">{wordCount.toLocaleString()}</span>
            <span className="plugin-stat-label">Kata</span>
          </div>
          <div className="plugin-stat-card">
            <span className="plugin-stat-value">{blockCount.toLocaleString()}</span>
            <span className="plugin-stat-label">Blok Paragraf</span>
          </div>
        </div>

        <div className="plugin-file-badge" title={doc.filePath ?? undefined}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={13} height={13}>
            <rect x="2" y="2" width="12" height="12" rx="1.5" />
            <path d="M5 5h6M5 8h6M5 11h3" />
          </svg>
          <span>{fileName}</span>
        </div>
      </section>

      <hr className="plugin-divider" />

      {/* ── Selection Info ────────────────────────────────────────── */}
      <section className="plugin-section">
        <h4 className="plugin-section-title">Seleksi Teks</h4>
        {selText ? (
          <div className="plugin-banner accent">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={14} height={14} style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 7.5v3.5M8 5v.5" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 600 }}>{selText.length} karakter dipilih</span>
              {selText.length < 140 && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', wordBreak: 'break-word' }}>
                  "{selText}"
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="plugin-banner info">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={14} height={14} style={{ flexShrink: 0, opacity: 0.7 }}>
              <rect x="3" y="3" width="10" height="10" rx="1.5" strokeDasharray="2 2" />
            </svg>
            <span>Tidak ada teks yang dipilih di dokumen.</span>
          </div>
        )}
      </section>

      <hr className="plugin-divider" />

      {/* ── Insert / Replace Actions ──────────────────────────────── */}
      <section className="plugin-section">
        <h4 className="plugin-section-title">Sisipkan / Ganti</h4>

        <div className="plugin-field">
          <label className="plugin-label" htmlFor="starter-input">
            Teks masukan
          </label>
          <textarea
            id="starter-input"
            className="plugin-input plugin-textarea"
            rows={3}
            placeholder="Ketik teks yang ingin disisipkan..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleInsert()
            }}
          />
        </div>

        <div className="plugin-btn-group">
          <button
            className="plugin-btn-primary"
            onClick={handleInsert}
            disabled={!inputText.trim()}
            style={{ flex: 1 }}
          >
            Sisipkan
          </button>
          <button
            className="plugin-btn-secondary"
            onClick={handleReplaceSelection}
            disabled={!selText || !inputText.trim()}
            style={{ flex: 1 }}
            title={!selText ? 'Pilih teks di dokumen terlebih dahulu' : 'Ganti teks terpilih'}
          >
            Ganti Seleksi
          </button>
        </div>
      </section>

      <hr className="plugin-divider" />

      {/* ── More Actions ─────────────────────────────────────────── */}
      <section className="plugin-section">
        <h4 className="plugin-section-title">Fitur Tambahan</h4>
        <button
          className="plugin-btn-secondary"
          style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}
          onClick={() => ui.openCanvasView()}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={13} height={13}>
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <path d="M2 6h12M6 14V6" />
            </svg>
            Buka Mode Staging (Canvas)…
          </span>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={13} height={13}>
            <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          className="plugin-btn-secondary"
          style={{ width: '100%', justifyContent: 'space-between' }}
          onClick={handleOpenModal}
        >
          <span>Buka Dialog Penuh…</span>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={13} height={13}>
            <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </section>
    </div>
  )
}
