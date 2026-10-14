import React from 'react'
import type { PdfPluginContext } from '../types'

interface Props {
  context: PdfPluginContext
  payload?: unknown
  onClose: () => void
}

export function StarterModal({ context, payload, onClose }: Props) {
  const { doc, ui } = context
  const source = (payload as { source?: string })?.source ?? 'Aplikasi'

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── Dialog Header ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)' }}>
          Dialog Modal Starter Plugin
        </div>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px',
          }}
          aria-label="Tutup dialog"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} width={14} height={14}>
            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* ── Dialog Content ────────────────────────────────────────── */}
      <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>
        <p style={{ marginTop: 0 }}>
          Ini adalah contoh dialog modal yang dipicu dari: <b>{source}</b>.
        </p>
        <p style={{ color: 'var(--text-secondary)' }}>
          Anda dapat menggunakan modal layer untuk form isian kompleks, export wizard,
          pengaturan plugin khusus, atau dialog konfirmasi.
        </p>
        <div
          style={{
            padding: '12px',
            borderRadius: '6px',
            background: 'var(--hover, rgba(0,0,0,0.03))',
            border: '1px solid var(--border, rgba(0,0,0,0.08))',
            fontSize: '12px',
          }}
        >
          <div><b>Info Dokumen:</b></div>
          <div>Halaman: {doc?.currentPage ?? 1} / {doc?.pageCount ?? 1}</div>
          <div>File: {doc?.filePath ?? 'Belum ada file'}</div>
        </div>
      </div>

      {/* ── Dialog Actions ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          padding: '14px 20px',
          borderTop: '1px solid var(--border, rgba(0,0,0,0.08))',
          background: 'var(--hover, rgba(0,0,0,0.02))',
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: '6px 14px',
            borderRadius: '4px',
            border: '1px solid var(--border, #ccc)',
            background: 'var(--surface, #fff)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Batal
        </button>
        <button
          onClick={() => {
            ui.showToast('Perubahan dari dialog modal diterapkan!', 'success')
            onClose()
          }}
          style={{
            padding: '6px 16px',
            borderRadius: '4px',
            border: 'none',
            background: 'var(--accent, #0078d4)',
            color: '#ffffff',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Terapkan
        </button>
      </div>
    </div>
  )
}
