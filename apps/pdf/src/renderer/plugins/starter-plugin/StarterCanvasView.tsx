import React from 'react'
import type { PdfPluginContext } from '../types'
import { StarterIcon } from './StarterIcon'

interface Props {
  context: PdfPluginContext
  onClose: () => void
}

export function StarterCanvasView({ context, onClose }: Props) {
  const { doc, ui } = context
  const fileName = doc?.filePath ? doc.filePath.split(/[\\/]/).pop() : null

  return (
    <div className="plugin-workbench-container">
      {/* ── Manuscriber-Standard Unified Workbench Header (Single 47px Bar) ── */}
      <div className="plugin-workbench-header">
        <div className="workbench-title-group">
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={onClose}
            title="Kembali ke Dokumen PDF (Esc)"
            aria-label="Kembali ke Dokumen PDF"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={16} height={16}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="workbench-header-divider" />

          <span className="workbench-title">
            <span className="workbench-title-icon" aria-hidden>
              <StarterIcon size={14} />
            </span>
            <span>PDF Workbench Staging</span>
          </span>

          {fileName && (
            <span className="workbench-file-badge" title={fileName}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={12} height={12}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              <span className="workbench-file-name">{fileName}</span>
            </span>
          )}

          <span
            className="workbench-stats-pill"
            title={`Halaman aktif: ${doc?.currentPage ?? 1} dari total ${doc?.pageCount ?? 1} halaman`}
          >
            Hal. {doc?.currentPage ?? 1} / {doc?.pageCount ?? 1}
          </span>
        </div>

        <div className="workbench-actions-group">
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() => ui.showToast('Uji aksi cepat di Workbench', 'info')}
            title="Notifikasi Demo"
            aria-label="Notifikasi Demo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={15} height={15}>
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>

          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() => ui.openModal('starter-main-modal', { source: 'Workbench' })}
            title="Buka Dialog Modal"
            aria-label="Buka Dialog Modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={15} height={15}>
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18M9 14h6" />
            </svg>
          </button>

          <button
            type="button"
            className="btn-workbench-commit"
            onClick={onClose}
            title="Tutup Workbench dan kembali ke dokumen PDF"
          >
            <span>Kembali ke Dokumen</span>
          </button>
        </div>
      </div>

      {/* ── Workbench Body ──────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '800px',
            width: '100%',
            background: 'var(--surface, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--border, rgba(0,0,0,0.1))',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--text)' }}>
            Selamat Datang di Template PDF Workbench
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
            Surface ini adalah kanvas kosong independen yang dapat Anda gunakan untuk membangun
            antarmuka khusus, seperti:
          </p>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.8 }}>
            <li><b>Batch OCR Processor</b>: Memproses teks dari banyak halaman sekaligus.</li>
            <li><b>Visual Page Organizer</b>: Menata urutan halaman secara visual drag-and-drop.</li>
            <li><b>Form Builder & Visual Designer</b>: Merancang formulir interaktif khusus.</li>
            <li><b>Document Comparison / Diff View</b>: Membandingkan dua PDF secara berdampingan.</li>
          </ul>

          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              borderRadius: '8px',
              background: 'var(--hover, rgba(0,0,0,0.03))',
              border: '1px solid var(--border, rgba(0,0,0,0.08))',
              fontSize: '12px',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>Status Dokumen Saat Ini:</div>
            <div>File: <code>{doc?.filePath ?? 'Belum ada file'}</code></div>
            <div>Halaman Aktif: <code>{doc?.currentPage ?? 1} dari {doc?.pageCount ?? 1}</code></div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => ui.showToast('Aksi dijalankan di Workbench!', 'success')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border, #ccc)',
                background: 'var(--surface, #fff)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Uji Notifikasi
            </button>
            <button
              onClick={() => ui.openModal('starter-main-modal', { source: 'Workbench' })}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border, #ccc)',
                background: 'var(--surface, #fff)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Buka Modal dari Sini
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
