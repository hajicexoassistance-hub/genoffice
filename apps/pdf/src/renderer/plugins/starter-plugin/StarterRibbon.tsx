import React from 'react'
import type { PdfPluginContext } from '../types'

interface Props {
  context: PdfPluginContext
  onClose: () => void
}

export function StarterRibbon({ context, onClose }: Props) {
  const { doc, actions, ui } = context
  const curPage = doc?.currentPage ?? 1
  const totalPages = doc?.pageCount ?? 1

  return (
    <>
      {/* ── Group 1: Navigasi Dokumen ─────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="rb-big"
            title="Lompat ke Halaman Pertama"
            onClick={() => {
              actions.goToPage(1)
              ui.showToast('Navigasi ke Halaman 1', 'info')
            }}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
                <path d="m14 18-6-6 6-6" />
                <path d="M6 6v12" />
              </svg>
            </span>
            <span>Hal. Pertama</span>
          </button>

          <button
            className="rb-big"
            title="Halaman Sebelumnya"
            disabled={curPage <= 1}
            onClick={() => actions.goToPage(Math.max(1, curPage - 1))}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
                <path d="m15 18-6-6 6-6" />
              </svg>
            </span>
            <span>Sebelumnya</span>
          </button>

          <button
            className="rb-big"
            title="Halaman Berikutnya"
            disabled={curPage >= totalPages}
            onClick={() => actions.goToPage(Math.min(totalPages, curPage + 1))}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
            <span>Berikutnya</span>
          </button>

          <button
            className="rb-big"
            title="Lompat ke Halaman Terakhir"
            onClick={() => {
              actions.goToPage(totalPages)
              ui.showToast(`Navigasi ke Halaman ${totalPages}`, 'info')
            }}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
                <path d="m10 6 6 6-6 6" />
                <path d="M18 6v12" />
              </svg>
            </span>
            <span>Hal. Akhir</span>
          </button>
        </div>
      </div>

      <div className="ribbon-sep" />

      {/* ── Group 2: Zoom & Skala ─────────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="rb-big"
            title="Perbesar Tampilan"
            onClick={() => actions.zoomIn()}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
                <path d="M11 8v6M8 11h6" />
              </svg>
            </span>
            <span>Zoom In</span>
          </button>
          <button
            className="rb-big"
            title="Perkecil Tampilan"
            onClick={() => actions.zoomOut()}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
                <path d="M8 11h6" />
              </svg>
            </span>
            <span>Zoom Out</span>
          </button>
          <button
            className="rb-big"
            title="Reset Zoom ke 100%"
            onClick={() => actions.setZoom(1.0)}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
                <circle cx="11" cy="11" r="2" fill="currentColor" />
              </svg>
            </span>
            <span>Reset Zoom</span>
          </button>
        </div>
      </div>

      <div className="ribbon-sep" />

      {/* ── Group 3: Plugin Surfaces ─────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="rb-big"
            title="Buka / Tutup Sidebar Starter"
            onClick={() => ui.toggleSidebar()}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M15 3v18" />
              </svg>
            </span>
            <span>Sidebar</span>
          </button>
          <button
            className="rb-big"
            title="Buka Staging Workbench Canvas"
            onClick={() => ui.openCanvasView()}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </span>
            <span>Workbench</span>
          </button>
          <button
            className="rb-big"
            title="Buka Dialog Modal"
            onClick={() => ui.openModal('starter-main-modal', { source: 'Ribbon' })}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 14h6" />
              </svg>
            </span>
            <span>Modal</span>
          </button>
          <button
            className="rb-big"
            title="Tampilkan Toast Demo"
            onClick={() => ui.showToast('Ini adalah notifikasi dari Starter Plugin!', 'success')}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </span>
            <span>Toast Demo</span>
          </button>
        </div>
      </div>

      <div className="ribbon-sep" />

      {/* ── Close Tab ─────────────────────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="rb-big"
            title="Tutup tab ini dan kembali ke Tab Beranda"
            onClick={onClose}
          >
            <span className="rb-big-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
                <path d="M9 14 4 9l5-5" />
                <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
              </svg>
            </span>
            <span>Tutup Tab</span>
          </button>
        </div>
      </div>
    </>
  )
}
