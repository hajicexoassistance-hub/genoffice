import React from 'react'
import type { DocxPluginContext } from '../../types'
import { useManuscriberPluginStore } from '../store/manuscriberPluginStore'
import { StagingPanel } from '../components/staging/StagingPanel'
import {
  IconArrowLeft,
  IconManuscript,
  IconDocument,
  IconKeyboard,
  IconSettings,
  IconBookOpen,
  IconApplyWord,
  IconPlus,
  IconCheck,
  IconList,
  IconFocus,
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
  } = store

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

  return (
    <div className="manuscriber-workbench-container">
      {/* Clean Compact Ultra-Minimalist Workbench Header */}
      <div className="manuscriber-workbench-header">
        {/* Left: Navigation, Title & File Badge */}
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
            <span>Staging</span>
          </span>

          {pdfFileName && (
            <span className="workbench-file-badge" title={`Naskah Sumber: ${pdfFileName}`}>
              <IconDocument size={12} />
              <span className="workbench-file-name">{pdfFileName}</span>
            </span>
          )}

          <span
            className={`workbench-stats-pill ${verifiedCount === lines.length && lines.length > 0 ? 'all-verified' : ''}`}
            title={`${verifiedCount} dari ${lines.length} baris telah berstatus Shahih`}
          >
            {verifiedCount}/{lines.length} Shahih
          </span>
        </div>

        {/* Right: Quick Tools (Icon-only, hover-to-know) & Word Commit */}
        <div className="workbench-actions-group">
          {/* Dual-Mode Toggle Switcher (Saklar Mode Daftar / Fokus) */}
          <button
            type="button"
            className={`btn-workbench-icon btn-mode-switch ${store.isFocusMode ? 'focus-active' : 'list-active'}`}
            onClick={() => store.setIsFocusMode(!store.isFocusMode)}
            title={
              store.isFocusMode
                ? 'Mode Fokus Aktif (Periksa baris satu per satu) — Klik untuk beralih ke Mode Daftar'
                : 'Mode Daftar Aktif (Tampilkan seluruh baris) — Klik untuk beralih ke Mode Fokus'
            }
            aria-label={store.isFocusMode ? 'Mode Fokus' : 'Mode Daftar'}
          >
            {store.isFocusMode ? <IconFocus size={15} /> : <IconList size={15} />}
          </button>

          <span className="workbench-header-divider" />

          {/* Quick Line Creation (Hover to know) */}
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

          {/* Mark All Verified (Hover to know) */}
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() => {
              store.markAllVerified()
              context.ui.showToast('Semua baris ditandai Shahih ✓', 'success')
            }}
            disabled={lines.length === 0 || verifiedCount === lines.length}
            title="Tandai Semua Baris Shahih ✓"
            aria-label="Semua Shahih"
          >
            <IconCheck size={14} />
          </button>

          <span className="workbench-header-divider" />

          {/* Virtual Pegon Keyboard Toggle (Hover to know) */}
          <button
            type="button"
            className={`btn-workbench-icon ${isKeyboardVisible ? 'active' : ''}`}
            onClick={() => store.setIsKeyboardVisible(!isKeyboardVisible)}
            title={isKeyboardVisible ? 'Sembunyikan Papan Ketik Pegon' : 'Tampilkan Papan Ketik Pegon 3-in-1'}
            aria-label="Keyboard Pegon"
          >
            <IconKeyboard size={15} />
          </button>


          {/* Pegon Guide Modal (Hover to know) */}
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() => context.ui.openModal('manuscriber-guide')}
            title="Pedoman Aksara Pegon & Kaidah Vokal Alif"
            aria-label="Pedoman Pegon"
          >
            <IconBookOpen size={14} />
          </button>

          {/* AI Settings Modal (Hover to know) */}
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() => context.ui.openModal('manuscriber-settings')}
            title="Pengaturan Model AI Vision & Prompt"
            aria-label="Pengaturan AI"
          >
            <IconSettings size={14} />
          </button>

          {/* Clear Staging / Trash (Hover to know) */}
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

      {/* Main Dedicated Staging & Tashih Workspace */}
      <div className="manuscriber-workbench-body" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <div
          className="manuscriber-pane workbench-staging-fullscreen"
          style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--canvas, var(--surface-subtle))',
            position: 'relative',
          }}
        >
          <div className="workbench-staging-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Top scrollable cards area */}
            <div
              className="workbench-staging-cards-area"
              style={{
                flex: 1,
                overflowY: 'auto',
                paddingBottom: 48,
              }}
            >
              <StagingPanel context={context} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

