import React, { useState } from 'react'
import type { DocxPluginContext } from '../../types'
import { useManuscriberPluginStore } from '../store/manuscriberPluginStore'
import { PdfViewer } from '../components/pdf/PdfViewer'
import {
  IconManuscript,
  IconDocument,
  IconWorkbench,
  IconKeyboard,
  IconSettings,
  IconCheck,
  IconCircle,
  IconPlus,
  IconList,
  IconApplyWord,
} from '../components/icons/ManuscriberIcons'

interface ManuscriberSidebarProps {
  context: DocxPluginContext
}

type SidebarTab = 'pdf' | 'staging'

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
        title="Buka Workbench Penuh (Layar Penuh)"
        aria-label="Buka Workbench Penuh"
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
  const { lines } = store

  const [activeTab, setActiveTab] = useState<SidebarTab>('pdf')

  const verifiedCount = lines.filter((l) => l.status === 'verified').length

  const handleOpenWorkbench = () => {
    context.ui.openCanvasView()
  }

  const handleInsertLine = (text: string) => {
    context.actions.insertText(text + '\n')
    context.ui.showToast('Baris disisipkan ke dokumen', 'success')
  }

  const handleToggleStatus = (id: string) => {
    const target = lines.find((l) => l.id === id)
    if (target) {
      const nextStatus = target.status === 'verified' ? 'unverified' : 'verified'
      store.updateLine(id, { status: nextStatus })
    }
  }

  const handleInsertAll = () => {
    if (lines.length === 0) return
    let html = '<div style="direction: rtl; font-family: Amiri, Arial; font-size: 14pt;">'
    lines.forEach((l) => {
      if (l.text.trim()) {
        html += `<p style="margin: 4px 0; line-height: 1.8;">${l.text.trim()}</p>`
      }
    })
    html += '</div>'
    context.actions.insertHtml(html)
    context.ui.showToast(`Seluruh ${lines.length} baris disisipkan!`, 'success')
  }

  return (
    <div className="manuscriber-sidebar-panel">
      {/* Segmented Switcher Tabs (Directly under the single appbar) */}
      <div className="sidebar-segmented-tabs">
        <button
          type="button"
          className={`sidebar-tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
          onClick={() => setActiveTab('pdf')}
          title="Tampilkan Penampil Naskah PDF"
          aria-label="Tab Naskah PDF"
        >
          <IconDocument size={13} />
          <span>Naskah PDF</span>
        </button>

        <button
          type="button"
          className={`sidebar-tab-btn ${activeTab === 'staging' ? 'active' : ''}`}
          onClick={() => setActiveTab('staging')}
          title={`Tampilkan Baris Staging (${lines.length} baris)`}
          aria-label="Tab Baris Staging"
        >
          <IconList size={13} />
          <span>Baris Staging</span>
          {lines.length > 0 && <span className="sidebar-tab-badge">{lines.length}</span>}
        </button>
      </div>

      {/* Main Tab Surface */}
      <div className="sidebar-tab-body">
        {activeTab === 'pdf' ? (
          <div className="sidebar-pdf-wrapper">
            <PdfViewer context={context} compact={true} onOpenWorkbench={handleOpenWorkbench} />
          </div>
        ) : (
          <div className="sidebar-staging-wrapper">
            {/* Staging Summary Header */}
            <div className="sidebar-staging-header">
              <div className="staging-header-status">
                <span className="staging-status-pill" title={`${verifiedCount} dari ${lines.length} baris shahih`}>
                  {verifiedCount}/{lines.length} Shahih
                </span>
              </div>
              <div className="staging-header-actions">
                {lines.length > 0 && (
                  <button
                    type="button"
                    className="btn-sidebar-action-icon primary"
                    onClick={handleInsertAll}
                    title="Sisipkan Semua Baris ke Dokumen Word"
                    aria-label="Sisipkan Semua Baris ke Word"
                  >
                    <IconApplyWord size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className="btn-sidebar-action-icon"
                  onClick={handleOpenWorkbench}
                  title="Buka Ruang Kerja Workbench untuk Tashih Penuh"
                  aria-label="Buka Workbench"
                >
                  <IconWorkbench size={14} />
                </button>
              </div>
            </div>

            {/* Lines List */}
            <div className="sidebar-lines-scroll">
              {lines.length === 0 ? (
                <div className="sidebar-empty-staging">
                  <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                    <IconManuscript size={36} color="var(--text-tertiary, #909499)" />
                  </div>
                  <p>Belum ada baris naskah.</p>
                  <p className="subtext">
                    Buka tab <strong>Naskah PDF</strong> untuk memuat naskah atau lakukan Transkripsi AI.
                  </p>
                </div>
              ) : (
                lines.map((line, idx) => (
                  <div key={line.id} className="sidebar-line-card">
                    <div className="sidebar-line-card-header">
                      <span className="sidebar-line-num">#{idx + 1}</span>
                      <div className="sidebar-line-header-right">
                        <button
                          type="button"
                          className={`btn-sidebar-status-icon ${line.status}`}
                          onClick={() => handleToggleStatus(line.id)}
                          title={line.status === 'verified' ? 'Status: Shahih ✓ (Klik untuk ubah)' : 'Status: Belum Tashih (Klik untuk verifikasi)'}
                          aria-label="Toggle status"
                        >
                          {line.status === 'verified' ? <IconCheck size={11} /> : <IconCircle size={10} />}
                        </button>
                        <button
                          type="button"
                          className="btn-sidebar-insert-icon"
                          onClick={() => handleInsertLine(line.text)}
                          title="Sisipkan baris ini ke kursor dokumen Word"
                          aria-label="Sisipkan Baris"
                        >
                          <IconPlus size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="sidebar-line-text pegon-font" dir="rtl">
                      {line.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
