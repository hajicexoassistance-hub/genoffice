import React, { useState } from 'react'
import type { PdfPluginContext } from '../types'

interface Props {
  context: PdfPluginContext
}

export function StarterSidebar({ context }: Props) {
  const { doc, actions, ui } = context
  const [targetPage, setTargetPage] = useState('')

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault()
    const p = parseInt(targetPage, 10)
    if (!Number.isNaN(p) && p >= 1 && doc && p <= doc.pageCount) {
      actions.goToPage(p)
      ui.showToast(`Melompat ke Halaman ${p}`, 'info')
    } else {
      ui.showToast('Nomor halaman di luar jangkauan', 'error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
      {/* ── Document Stats Card ─────────────────────────────────────── */}
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          background: 'var(--hover, rgba(0,0,0,0.03))',
          border: '1px solid var(--border, rgba(0,0,0,0.08))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={16} height={16}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
          <span>Ringkasan Dokumen</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Halaman:</span>{' '}
            <b>{doc?.currentPage ?? 1}</b> / {doc?.pageCount ?? 1}
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Skala:</span>{' '}
            <b>{Math.round((doc?.scale ?? 1) * 100)}%</b>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Status:</span>{' '}
            <span>{doc?.isDirty ? 'Belum disimpan' : 'Tersimpan'}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Akses:</span>{' '}
            <span>{doc?.isReadOnly ? 'Read-only' : 'Dapat diedit'}</span>
          </div>
        </div>
        {doc?.filePath && (
          <div
            style={{
              marginTop: '8px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              wordBreak: 'break-all',
            }}
          >
            <b>Path:</b> {doc.filePath}
          </div>
        )}
      </div>

      {/* ── Page Navigation Card ────────────────────────────────────── */}
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          background: 'var(--hover, rgba(0,0,0,0.03))',
          border: '1px solid var(--border, rgba(0,0,0,0.08))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={16} height={16}>
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span>Lompat Cepat Halaman</span>
        </div>
        <form onSubmit={handleJump} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            min={1}
            max={doc?.pageCount ?? 1}
            placeholder={`1-${doc?.pageCount ?? 1}`}
            value={targetPage}
            onChange={(e) => setTargetPage(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border, #ccc)',
              background: 'var(--surface, #fff)',
              color: 'var(--text, #000)',
              fontSize: '12px',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: 'var(--accent, #0078d4)',
              color: '#ffffff',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Lompat
          </button>
        </form>
      </div>

      {/* ── Action Buttons ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '12px' }}>
          Aksi & Eksplorasi Surface
        </div>

        <button
          onClick={() => ui.openCanvasView()}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border, #ccc)',
            background: 'var(--surface, #fff)',
            color: 'var(--text)',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={16} height={16}>
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          <span>Buka Workbench Canvas Staging</span>
        </button>

        <button
          onClick={() => ui.openModal('starter-main-modal', { source: 'Sidebar' })}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border, #ccc)',
            background: 'var(--surface, #fff)',
            color: 'var(--text)',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={16} height={16}>
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 14h6" />
          </svg>
          <span>Buka Modal Dialog</span>
        </button>

        <button
          onClick={() => ui.showToast('Halo dari Sidebar Starter Plugin!', 'success')}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border, #ccc)',
            background: 'var(--surface, #fff)',
            color: 'var(--text)',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={16} height={16}>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span>Uji Notifikasi Toast</span>
        </button>
      </div>
    </div>
  )
}

/**
 * Custom action buttons rendered in the sidebar header app bar
 * (to the left of the close button, separated by a subtle divider).
 */
export function StarterSidebarHeaderActions({ context }: Props) {
  return (
    <>
      <button
        type="button"
        className="ai-header-btn"
        onClick={() => context.ui.openCanvasView()}
        title="Buka Workbench Staging Penuh"
        aria-label="Buka Workbench Staging"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={14} height={14}>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      </button>
      <button
        type="button"
        className="ai-header-btn"
        onClick={() => context.ui.openModal('starter-main-modal', { source: 'Sidebar Header' })}
        title="Buka Modal Dialog"
        aria-label="Modal Dialog"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={14} height={14}>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 14h6" />
        </svg>
      </button>
    </>
  )
}
