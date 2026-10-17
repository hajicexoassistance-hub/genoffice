import React from 'react'
import type { DocxPluginContext } from '../../types'
import { useManuscriberPluginStore } from '../store/manuscriberPluginStore'
import { deleteDocumentSession } from '../services/documentSessionStore'
import { PdfViewer } from '../components/pdf/PdfViewer'
import {
  IconDocument,
  IconWorkbench,
  IconKeyboard,
  IconSettings,
  IconHistory,
  IconCheck,
  IconTrash,
} from '../components/icons/ManuscriberIcons'

interface ManuscriberSidebarProps {
  context: DocxPluginContext
}

type SidebarTab = 'pdf' | 'history'

/**
 * Custom action buttons rendered in the main sidebar header (app bar)
 * to the left of the close button, separated by a subtle divider.
 */
export const ManuscriberSidebarHeaderActions: React.FC<{ context: DocxPluginContext }> = ({ context }) => {
  const store = useManuscriberPluginStore()
  const { isKeyboardVisible } = store

  return (
    <>
      <button
        type="button"
        className="ai-header-btn"
        onClick={() => context.ui.openCanvasView()}
        title="Buka Workbench Pengeditan Naskah (Layar Penuh)"
        aria-label="Buka Workbench Pengeditan"
      >
        <IconWorkbench size={14} />
      </button>
      <button
        type="button"
        className={`ai-header-btn ${isKeyboardVisible ? 'active' : ''}`}
        onClick={() => store.setIsKeyboardVisible(!isKeyboardVisible)}
        title={isKeyboardVisible ? 'Sembunyikan Keyboard Pegon' : 'Tampilkan Papan Ketik Pegon 3-in-1'}
        aria-label="Papan Ketik Pegon"
      >
        <IconKeyboard size={14} />
      </button>
      <button
        type="button"
        className="ai-header-btn"
        onClick={() => context.ui.openModal('manuscriber-settings')}
        title="Setelan AI Vision & Model"
        aria-label="Setelan"
      >
        <IconSettings size={14} />
      </button>
    </>
  )
}

export const ManuscriberSidebar: React.FC<ManuscriberSidebarProps> = ({ context }) => {
  const store = useManuscriberPluginStore()
  const { scanSessions, restoreScanSession, deleteScanSession } = store

  const activeTab = store.sidebarActiveTab || 'pdf'
  const setActiveTab = (tab: SidebarTab) => store.setSidebarActiveTab(tab)

  const handleOpenWorkbench = () => {
    context.ui.openCanvasView()
  }

  const handleTranscriptionSuccess = (_pageNo: number, count: number) => {
    // Otomatis buka Workbench di tengah saat transkripsi selesai
    context.ui.openCanvasView()
    context.ui.showToast(`Transkripsi selesai (${count} blok). Membuka Workbench Pengeditan...`, 'success')
  }

  const handleRestoreSession = (id: string, pageNo: number) => {
    restoreScanSession(id)
    // Pindah tab ke penampil PDF
    setActiveTab('pdf')
    if (pageNo) {
      store.setCurrentPage(pageNo)
    }
    // Buka Workbench pengeditan di kanvas tengah
    context.ui.openCanvasView()
    context.ui.showToast(`Sesi Halaman ${pageNo} dipulihkan ke Workbench`, 'success')
  }

  const handleDeleteSession = (id: string) => {
    deleteScanSession(id)
    context.ui.showToast('Sesi dihapus dari riwayat', 'info')
  }

  const handleClearDocumentSession = async () => {
    if (!window.confirm('Hapus riwayat naskah PDF dan baris tashih yang tertaut pada dokumen Word ini?')) {
      return
    }
    if (store.activeDocKey) {
      try {
        await deleteDocumentSession(store.activeDocKey)
      } catch (err) {
        console.error('Failed to delete document session:', err)
      }
    }
    store.resetProjectData()
    context.ui.showToast('Riwayat naskah dokumen ini berhasil dihapus.', 'info')
  }

  const tabSwitcher = (
    <div className="sidebar-unified-tabs">
      <button
        type="button"
        className={`sidebar-tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
        onClick={() => setActiveTab('pdf')}
        title="Tampilkan Penampil Naskah PDF Acuan"
        aria-label="Tab Naskah PDF"
      >
        <IconDocument size={12} />
        <span>Naskah PDF</span>
      </button>

      <button
        type="button"
        className={`sidebar-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => setActiveTab('history')}
        title={`Tampilkan Riwayat Transkripsi (${scanSessions.length} sesi)`}
        aria-label="Tab Riwayat Transkripsi"
      >
        <IconHistory size={12} />
        <span>Riwayat</span>
        {scanSessions.length > 0 && <span className="sidebar-tab-badge">{scanSessions.length}</span>}
      </button>
    </div>
  )

  return (
    <div className="manuscriber-sidebar-panel">
      {/* Linked Document Session Strip */}
      {store.pdfFileName ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '5px 10px',
            background: 'var(--surface-active, rgba(0,0,0,0.03))',
            borderBottom: '1px solid var(--border)',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <span style={{ color: 'var(--success, #10b981)', fontSize: '10px' }}>●</span>
            <span
              style={{
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 160,
              }}
              title={`Naskah tertaut: ${store.pdfFileName}`}
            >
              {store.pdfFileName}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '10.5px' }}>
              ({store.lines.length} baris)
            </span>
          </div>

          <button
            type="button"
            onClick={handleClearDocumentSession}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--danger, #dc3545)',
              fontSize: '10.5px',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '3px',
            }}
            title="Hapus keterikatan naskah dan riwayat untuk dokumen Word ini"
          >
            Hapus Naskah
          </button>
        </div>
      ) : store.isRestoringSession ? (
        <div
          style={{
            padding: '6px 12px',
            background: 'var(--surface-active, rgba(0,0,0,0.03))',
            borderBottom: '1px solid var(--border)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
          }}
        >
          Memulihkan naskah tertaut...
        </div>
      ) : null}

      {/* Jika tab Riwayat aktif, tampilkan single bar terpadu */}
      {activeTab === 'history' && (
        <div className="sidebar-unified-topbar">
          {tabSwitcher}
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {scanSessions.length} Sesi
          </span>
        </div>
      )}

      {/* Main Tab Surface */}
      <div className="sidebar-tab-body">
        {activeTab === 'pdf' ? (
          <div className="sidebar-pdf-wrapper">
            <PdfViewer
              context={context}
              compact={true}
              headerPrefix={tabSwitcher}
              onTranscriptionSuccess={handleTranscriptionSuccess}
            />
          </div>
        ) : (
          <div className="sidebar-history-wrapper" style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            {/* History Summary Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {scanSessions.length} Sesi Pemindaian
              </span>
              <button
                type="button"
                className="btn-pdf-tool"
                onClick={handleOpenWorkbench}
                style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                title="Buka Workbench Staging & Tashih Layar Penuh"
              >
                <IconWorkbench size={12} />
                <span>Buka Workbench</span>
              </button>
            </div>

            {/* Sessions List */}
            {scanSessions.length === 0 ? (
              <div className="sidebar-empty-staging" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, opacity: 0.6 }}>
                  <IconHistory size={36} />
                </div>
                <p style={{ fontWeight: 600, fontSize: '13px', margin: '0 0 4px' }}>Belum Ada Riwayat Transkripsi</p>
                <p style={{ fontSize: '11.5px', margin: 0, opacity: 0.85, lineHeight: 1.5 }}>
                  Buka tab <strong>Naskah PDF</strong> lalu klik tombol <strong>Transkripsi</strong> pada halaman naskah fisik Anda.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {scanSessions.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                        Halaman {session.pageNo}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        {session.timestamp}
                      </span>
                    </div>

                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{session.blockCount} blok teks naskah</span>
                      <span>•</span>
                      <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <IconCheck size={11} />
                        <span>Tersimpan</span>
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleRestoreSession(session.id, session.pageNo)}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: 'var(--accent, #c43e1c)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Pulihkan ke Workbench
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(session.id)}
                        title="Hapus sesi ini dari riwayat"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          background: 'transparent',
                          color: 'var(--danger, #dc3545)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <IconTrash size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

