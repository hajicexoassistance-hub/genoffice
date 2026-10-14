import React from 'react'
import type { DocxPluginContext } from '../../types'
import { useManuscriberPluginStore } from '../store/manuscriberPluginStore'
import {
  IconWorkbench,
  IconFolderOpen,
  IconSidebar,
  IconKeyboard,
  IconBookOpen,
  IconSettings,
  IconApplyWord,
} from '../components/icons/ManuscriberIcons'

interface ManuscriberRibbonProps {
  context: DocxPluginContext
  onClose: () => void
}

export const ManuscriberRibbon: React.FC<ManuscriberRibbonProps> = ({ context }) => {
  const store = useManuscriberPluginStore()
  const { isKeyboardVisible, pdfFileName, lines } = store

  const handleOpenWorkbench = () => {
    context.ui.openCanvasView()
  }

  const handleToggleKeyboard = () => {
    store.setIsKeyboardVisible(!isKeyboardVisible)
    context.ui.showToast(
      isKeyboardVisible ? 'Keyboard Pegon ditutup' : 'Keyboard Pegon aktif',
      'info'
    )
  }

  const handleApplyToWord = () => {
    if (lines.length === 0) {
      context.ui.showToast('Workspace Staging kosong. Buka Workbench untuk memuat baris naskah.', 'info')
      return
    }

    let html = '<div style="direction: rtl; font-family: Amiri, Arial; font-size: 14pt;">'
    lines.forEach((l) => {
      if (l.text.trim()) {
        html += `<p style="margin: 4px 0; line-height: 1.8;">${l.text.trim()}</p>`
      }
    })
    html += '</div>'

    context.actions.insertHtml(html)
    context.ui.showToast(`${lines.length} baris berhasil disisipkan ke Word!`, 'success')
  }

  return (
    <>
      {/* Group: Workbench */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            type="button"
            className="rb-big"
            onClick={handleOpenWorkbench}
            title="Buka Ruang Kerja Split-Pane Manuscriber (PDF + Staging + Keyboard)"
          >
            <span className="rb-big-icon">
              <IconWorkbench size={22} />
            </span>
            <span>Buka Workbench</span>
          </button>
        </div>
        <div className="ribbon-group-label">Ruang Kerja</div>
      </div>

      <div className="ribbon-sep" />

      {/* Group: Naskah & Proyek */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            type="button"
            className="rb-big"
            onClick={() => context.ui.openCanvasView()}
            title="Buka berkas PDF atau proyek .manus"
          >
            <span className="rb-big-icon">
              <IconFolderOpen size={22} />
            </span>
            <span>Buka Naskah</span>
          </button>
          <button
            type="button"
            className="rb-big"
            onClick={() => {
              context.ui.expandSidebar()
              context.ui.showToast('Panel samping Manuscriber dibuka', 'info')
            }}
            title="Buka Panel Samping Ringkas"
          >
            <span className="rb-big-icon">
              <IconSidebar size={22} />
            </span>
            <span>Panel Samping</span>
          </button>
        </div>
        <div className="ribbon-group-label">Naskah</div>
      </div>

      <div className="ribbon-sep" />

      {/* Group: Aksara Pegon */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            type="button"
            className={`rb-big ${isKeyboardVisible ? 'active' : ''}`}
            onClick={handleToggleKeyboard}
            title="Tampilkan / Sembunyikan Papan Ketik Pegon 3-in-1"
          >
            <span className="rb-big-icon">
              <IconKeyboard size={22} />
            </span>
            <span>Keyboard Pegon</span>
          </button>
          <button
            type="button"
            className="rb-big"
            onClick={() => context.ui.openModal('manuscriber-guide')}
            title="Buka Pedoman Aksara Pegon & Kaidah Vokal Alif"
          >
            <span className="rb-big-icon">
              <IconBookOpen size={22} />
            </span>
            <span>Pedoman Pegon</span>
          </button>
        </div>
        <div className="ribbon-group-label">Aksara & Kaidah</div>
      </div>

      <div className="ribbon-sep" />

      {/* Group: AI Vision & Tashih */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            type="button"
            className="rb-big"
            onClick={() => context.ui.openModal('manuscriber-settings')}
            title="Konfigurasi API AI Vision (SumoPod, KIE AI, OpenRouter)"
          >
            <span className="rb-big-icon">
              <IconSettings size={22} />
            </span>
            <span>Setelan AI</span>
          </button>
          <button
            type="button"
            className="rb-big"
            onClick={handleApplyToWord}
            title="Terapkan hasil tashih staging langsung ke dokumen Word"
          >
            <span className="rb-big-icon">
              <IconApplyWord size={22} />
            </span>
            <span>Terapkan ke Word</span>
          </button>
        </div>
        <div className="ribbon-group-label">AI & Integrasi</div>
      </div>

      {/* Status Info (Optional Pill in ribbon) */}
      {pdfFileName && (
        <>
          <div className="ribbon-sep" />
          <div className="ribbon-group">
            <div className="ribbon-group-items" style={{ padding: '0 4px' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  maxWidth: 140,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-primary)',
                  }}
                  title={pdfFileName}
                >
                  📄 {pdfFileName}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  {lines.length} baris di staging
                </span>
              </div>
            </div>
            <div className="ribbon-group-label">Berkas Aktif</div>
          </div>
        </>
      )}
    </>
  )
}
