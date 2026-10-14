import React, { useState } from 'react'
import type { DocxPluginContext } from '../../types'
import { useManuscriberPluginStore } from '../store/manuscriberPluginStore'
import { StagingPanel } from '../components/staging/StagingPanel'
import { StagingHistoryDrawer } from '../components/staging/StagingHistoryDrawer'
import { PegonKeyboardDock } from '../components/keyboard/PegonKeyboardDock'
import {
  IconArrowLeft,
  IconManuscript,
  IconDocument,
  IconKeyboard,
  IconSettings,
  IconBookOpen,
  IconApplyWord,
  IconHistory,
  IconPlus,
  IconCheck,
  IconList,
  IconTrash,
} from '../components/icons/ManuscriberIcons'

interface ManuscriberCanvasViewProps {
  context: DocxPluginContext
  onClose: () => void
}

export const ManuscriberCanvasView: React.FC<ManuscriberCanvasViewProps> = ({ context, onClose }) => {
  const store = useManuscriberPluginStore()
  const {
    isKeyboardVisible,
    pdfFileName,
    lines,
    scanSessions,
    restoreScanSession,
    deleteScanSession,
  } = store

  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const verifiedCount = lines.filter((l) => l.status === 'verified').length

  const handleCommitToWord = () => {
    if (lines.length === 0) {
      context.ui.showToast('Tidak ada baris naskah untuk diterapkan', 'info')
      return
    }

    let htmlOutput = '<div class="manuscriber-turats-block" style="direction: rtl; font-family: Amiri, Arial; font-size: 14pt;">'
    lines.forEach((line) => {
      const text = line.text.trim()
      if (!text) return

      if (line.type === 'nadzom') {
        htmlOutput += `<p style="text-align: center; margin: 4px 0; font-weight: bold; color: #1a1a1a;">${text}</p>`
      } else if (line.type === 'syarah') {
        htmlOutput += `<p style="margin: 4px 0; text-indent: 20px; line-height: 1.8; color: #242424;">(شرح) ${text}</p>`
      } else if (line.type === 'hasyiah') {
        htmlOutput += `<p style="margin: 3px 0 3px 30px; font-size: 11pt; color: #555555; border-right: 2px solid #881798; padding-right: 8px;">[حاشية] ${text}</p>`
      } else if (line.type === 'header') {
        htmlOutput += `<h3 style="text-align: center; margin: 12px 0 6px 0; color: #0f6cbd;">${text}</h3>`
      } else {
        htmlOutput += `<p style="margin: 4px 0; line-height: 1.8;">${text}</p>`
      }
    })
    htmlOutput += '</div>'

    context.actions.insertHtml(htmlOutput)
    context.ui.showToast(`Berhasil menerapkan ${lines.length} baris ke Dokumen Word!`, 'success')
  }

  const handleRestoreSession = (id: string) => {
    restoreScanSession(id)
    context.ui.showToast('Sesi pemindaian berhasil dipulihkan ke Staging', 'success')
  }

  const handleDeleteSession = (id: string) => {
    deleteScanSession(id)
    context.ui.showToast('Sesi pemindaian dihapus dari riwayat', 'info')
  }

  return (
    <div className="manuscriber-workbench-container">
      {/* Ultra-Compact Fluent Unified Workbench Header (Single 36px bar) */}
      <div className="manuscriber-workbench-header">
        <div className="workbench-title-group">
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={onClose}
            title="Kembali ke Dokumen Word (Esc)"
            aria-label="Kembali ke Dokumen Word"
          >
            <IconArrowLeft size={16} />
          </button>

          <span className="workbench-header-divider" />

          <span className="workbench-title">
            <span className="workbench-title-icon" aria-hidden>
              <IconManuscript size={14} color="#ffffff" />
            </span>
            <span>Staging Workbench</span>
          </span>

          {pdfFileName && (
            <span className="workbench-file-badge" title={pdfFileName}>
              <IconDocument size={12} />
              <span className="workbench-file-name">{pdfFileName}</span>
            </span>
          )}

          <span
            className="workbench-stats-pill"
            title={`${verifiedCount} dari ${lines.length} baris telah berstatus Shahih`}
          >
            {verifiedCount}/{lines.length} Shahih
          </span>
        </div>

        <div className="workbench-actions-group">
          {/* Quick Line Creation */}
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() =>
              store.addLine({
                pageNo: store.currentPage,
                text: '',
                status: 'unverified',
                type: 'matan',
              })
            }
            title="Tambah Baris Naskah Baru (+)"
            aria-label="Tambah Baris Baru"
          >
            <IconPlus size={14} />
          </button>

          {/* Mark All Verified */}
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() => {
              store.markAllVerified()
              context.ui.showToast('Semua baris ditandai Shahih ✓', 'success')
            }}
            disabled={lines.length === 0}
            title="Tandai Semua Baris Shahih ✓"
            aria-label="Semua Shahih"
          >
            <IconCheck size={14} />
          </button>

          {/* Toggle Focus Mode vs List Mode */}
          <button
            type="button"
            className={`btn-workbench-icon ${store.isFocusMode ? 'active' : ''}`}
            onClick={() => store.setIsFocusMode(!store.isFocusMode)}
            title={store.isFocusMode ? 'Beralih ke Tampilan Seluruh Daftar' : 'Mode Fokus Satu Per Satu (Fokus Tashih)'}
            aria-label="Mode Fokus"
          >
            <IconList size={14} />
          </button>

          <span className="workbench-header-divider" />

          {/* Virtual Pegon Keyboard Toggle */}
          <button
            type="button"
            className={`btn-workbench-icon ${isKeyboardVisible ? 'active' : ''}`}
            onClick={() => store.setIsKeyboardVisible(!isKeyboardVisible)}
            title={isKeyboardVisible ? 'Sembunyikan Papan Ketik Pegon' : 'Tampilkan Papan Ketik Pegon 3-in-1'}
            aria-label="Keyboard Pegon"
          >
            <IconKeyboard size={14} />
          </button>

          {/* History Drawer Toggle */}
          <button
            type="button"
            className={`btn-workbench-icon ${isHistoryOpen ? 'active' : ''}`}
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            title={isHistoryOpen ? 'Tutup Riwayat Sesi' : `Riwayat Sesi Staging (${scanSessions.length})`}
            aria-label="Riwayat Sesi"
          >
            <IconHistory size={14} />
          </button>

          {/* AI Settings Modal */}
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() => context.ui.openModal('manuscriber-settings')}
            title="Pengaturan Model AI Vision & Prompt"
            aria-label="Pengaturan AI"
          >
            <IconSettings size={14} />
          </button>

          {/* Pegon Guide Modal */}
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() => context.ui.openModal('manuscriber-guide')}
            title="Pedoman Aksara Pegon & Kaidah Vokal Alif"
            aria-label="Pedoman Pegon"
          >
            <IconBookOpen size={14} />
          </button>

          {/* Clear Staging (Trash) */}
          <button
            type="button"
            className="btn-workbench-icon danger"
            onClick={() => {
              if (lines.length === 0) return
              if (window.confirm('Kosongkan seluruh baris di workspace staging ini?')) {
                store.setLines([])
                context.ui.showToast('Workspace staging dikosongkan', 'info')
              }
            }}
            disabled={lines.length === 0}
            title="Kosongkan Seluruh Baris Staging"
            aria-label="Kosongkan Staging"
          >
            <IconTrash size={14} />
          </button>

          <span className="workbench-header-divider" />

          {/* Single Primary Action: Terapkan ke Word */}
          <button
            type="button"
            className="btn-workbench-commit"
            onClick={handleCommitToWord}
            disabled={lines.length === 0}
            title="Terapkan seluruh baris naskah terverifikasi ke Dokumen Word aktif"
            aria-label="Terapkan ke Dokumen Word"
          >
            <IconApplyWord size={14} />
            <span>Terapkan ke Word</span>
          </button>
        </div>
      </div>

      {/* Main Staging & Tashih Workspace Body (100% Staging Focus) */}
      <div className="workbench-staging-body">
        <div className="workbench-staging-main">
          {/* Top scrollable cards area */}
          <div className="workbench-staging-cards-area">
            <StagingPanel context={context} />
          </div>

          {/* Bottom Docked Pegon Virtual Keyboard (Exact match to Pegon Studio reference) */}
          {isKeyboardVisible && (
            <div className="workbench-keyboard-dock-wrapper">
              <PegonKeyboardDock
                onClose={() => store.setIsKeyboardVisible(false)}
                onOpenGuide={() => context.ui.openModal('manuscriber-guide')}
              />
            </div>
          )}
        </div>

        {/* Right Slide Drawer: Staging History (Image 5) */}
        {isHistoryOpen && (
          <div className="workbench-history-wrapper">
            <StagingHistoryDrawer
              sessions={scanSessions}
              onRestore={handleRestoreSession}
              onDelete={handleDeleteSession}
              onClose={() => setIsHistoryOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
