import React, { useEffect, useCallback, useRef } from 'react'
import type { DocxPluginContext } from '../../types'
import { useManuscriberPluginStore } from '../store/manuscriberPluginStore'
import { StagingPanel } from '../components/staging/StagingPanel'
import { StagingFontSizeControl } from '../components/staging/StagingFontSizeControl'
import {
  IconArrowLeft,
  IconManuscript,
  IconDocument,
  IconKeyboard,
  IconSettings,
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

export const ManuscriberCanvasView: React.FC<ManuscriberCanvasViewProps> = ({
  context,
  onClose,
}) => {
  const store = useManuscriberPluginStore()
  const { isKeyboardVisible, pdfFileName, lines, currentPage, totalPages } = store

  const activePage = currentPage || 1
  const pageSessions = store.scanSessions.filter((s) => s.pageNo === activePage)
  const currentLines = lines.filter((l) => (l.pageNo || l.pageNumber || 1) === activePage)
  const verifiedCount = currentLines.filter((l) => l.status === 'verified').length

  const currentSessionId = store.activeSessionId || pageSessions[0]?.id || ''
  const currentSessionIdx = pageSessions.findIndex((s) => s.id === currentSessionId)
  const currentVNum =
    currentSessionIdx >= 0 ? pageSessions.length - currentSessionIdx : pageSessions.length || 1
  const isCurrentLatest = currentSessionIdx <= 0

  // Buka halaman dari riwayat generate terbaru secara default jika tersedia saat mount
  const hasInitializedPageRef = useRef(false)
  useEffect(() => {
    if (hasInitializedPageRef.current) return
    if (store.scanSessions && store.scanSessions.length > 0) {
      const latestSession = store.scanSessions[0]
      if (latestSession && latestSession.pageNo) {
        hasInitializedPageRef.current = true
        store.setCurrentPage(latestSession.pageNo)
        if (latestSession.id) {
          store.setActiveSessionId(latestSession.id)
        }
      }
    }
  }, [])

  const handleCommitToWord = useCallback(() => {
    if (currentLines.length === 0) {
      context.ui.showToast(
        `Tidak ada baris naskah untuk Halaman ${activePage} untuk diterapkan`,
        'info',
      )
      return
    }

    // Konfirmasi bila masih ada baris yang belum berstatus Shahih
    const unverifiedCount = currentLines.filter((l) => l.status !== 'verified').length
    if (unverifiedCount > 0) {
      const proceed = window.confirm(
        `Perhatian: Masih ada ${unverifiedCount} baris naskah (Halaman ${activePage}) yang belum berstatus Shahih.\n\nTetap terapkan ke Dokumen Word?`,
      )
      if (!proceed) {
        context.ui.showToast(
          'Penyisipan ke Word dibatalkan untuk memeriksa baris yang belum Shahih.',
          'info',
        )
        return
      }
    }

    let htmlOutput =
      '<div class="manuscriber-turats-block" style="direction: rtl; font-family: Amiri, Arial; font-size: 14pt;">'
    currentLines.forEach((line) => {
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
    store.recordCommit(activePage, currentLines)
    context.ui.showToast(
      `Berhasil menerapkan ${currentLines.length} baris (Halaman ${activePage}) ke Dokumen Word!`,
      'success',
    )
    onClose()
  }, [currentLines, activePage, context, onClose, store])

  // Pintasan Keyboard Workbench:
  // - Ctrl + Shift + Enter : Terapkan ke Word & Tutup Workbench
  // - Ctrl + T / Escape    : Tutup Workbench kembali ke Dokumen Word
  // - Alt + Left / Right   : Pindah ke Halaman Sebelumnya / Berikutnya
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Terapkan ke Word: Ctrl + Shift + Enter
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'Enter' || e.code === 'Enter')) {
        e.preventDefault()
        e.stopImmediatePropagation()
        handleCommitToWord()
        return
      }

      // 2. Tutup Workbench: Escape atau Ctrl + T
      if (
        e.key === 'Escape' ||
        ((e.ctrlKey || e.metaKey) &&
          !e.shiftKey &&
          !e.altKey &&
          (e.key === 't' || e.key === 'T' || e.code === 'KeyT'))
      ) {
        e.preventDefault()
        e.stopImmediatePropagation()
        onClose()
        context.ui.closeCanvasView()
        return
      }

      // 3. Pindah Halaman Naskah: Alt + Panah Kanan (Berikutnya) / Alt + Panah Kiri (Sebelumnya)
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopImmediatePropagation()
        const maxP = Math.max(1, totalPages || 1)
        if (activePage < maxP) {
          store.setCurrentPage(activePage + 1)
          context.ui.showToast(`Pindah ke Halaman ${activePage + 1} dari ${maxP}`, 'info')
        }
        return
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (activePage > 1) {
          store.setCurrentPage(activePage - 1)
          context.ui.showToast(`Pindah ke Halaman ${activePage - 1}`, 'info')
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [handleCommitToWord, onClose, context, activePage, totalPages, store])

  return (
    <div
      className="manuscriber-workbench-container"
      style={{ '--staging-font-size': `${store.stagingFontSize || 16}px` } as React.CSSProperties}
    >
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

          {/* {pdfFileName && (
            <span className="workbench-file-badge" title={`Naskah Sumber: ${pdfFileName}`}>
              <IconDocument size={11} />
              <span className="workbench-file-name">{pdfFileName}</span>
            </span>
          )} */}

          {/* Compact Version Selector Chip (jika terdapat riwayat versi untuk halaman aktif) */}
          {pageSessions.length > 0 && (
            <div
              className="workbench-version-chip"
              style={{
                background: 'var(--surface-subtle, rgba(0, 0, 0, 0.04))',
                border: '1px solid var(--color-border-default, rgba(0, 0, 0, 0.08))',
                borderRadius: 5,
                height: 24,
                padding: '0 6px',
              }}
              title={`Pilih Versi Transkripsi Halaman ${activePage}. Klik untuk berganti versi.`}
            >
              <span className="version-chip-label">
                <span className="version-tag">v{currentVNum}</span>
                {isCurrentLatest && <span className="version-latest-badge">Terbaru</span>}
                <svg
                  width="7"
                  height="7"
                  viewBox="0 0 10 10"
                  fill="currentColor"
                  style={{ opacity: 0.6, marginLeft: 2 }}
                >
                  <path d="M2 3.5 L5 6.5 L8 3.5 Z" />
                </svg>
              </span>
              <select
                className="workbench-version-native-select"
                value={currentSessionId}
                onChange={(e) => {
                  const sId = e.target.value
                  if (sId) {
                    store.restoreScanSession(sId)
                    const chosenIdx = pageSessions.findIndex((x) => x.id === sId)
                    const vNum = chosenIdx >= 0 ? pageSessions.length - chosenIdx : 1
                    context.ui.showToast(`Memuat Versi ${vNum} (Halaman ${activePage})`, 'info')
                  }
                }}
              >
                {pageSessions.map((session, idx) => {
                  const vNumber = pageSessions.length - idx
                  const isLatest = idx === 0
                  const timeStr =
                    session.timestamp?.split(',')[1]?.trim() || session.timestamp || ''
                  return (
                    <option key={session.id} value={session.id}>
                      v{vNumber}
                      {isLatest ? ' (Terbaru)' : ''} • {session.blockCount} blok{' '}
                      {timeStr ? `(${timeStr})` : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          <span
            className={`workbench-stats-pill ${verifiedCount === currentLines.length && currentLines.length > 0 ? 'all-verified' : ''}`}
            title={`${verifiedCount} dari ${currentLines.length} baris telah berstatus Shahih pada Halaman ${activePage}`}
          >
            {verifiedCount}/{currentLines.length} Shahih
          </span>

          {(() => {
            const currentSession = store.scanSessions.find((s) => s.pageNo === activePage)
            if (currentSession?.commitCount && currentSession.commitCount > 0) {
              return (
                <span
                  className="workbench-file-badge"
                  style={{
                    background: 'rgba(196, 62, 28, 0.12)',
                    color: 'var(--accent, #c43e1c)',
                    borderColor: 'rgba(196, 62, 28, 0.28)',
                    fontWeight: 700,
                    fontSize: 10,
                    height: 22,
                    boxSizing: 'border-box',
                    padding: '1px 5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                  title={`Halaman ${activePage} telah diterapkan ke Dokumen Word sebanyak ${currentSession.commitCount} kali`}
                >
                  <IconApplyWord size={10} color="var(--accent, #c43e1c)" />
                  <span>{currentSession.commitCount}x</span>
                </span>
              )
            }
            return null
          })()}
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
                ? 'Kembali ke Mode Daftar (Tampilkan seluruh baris) [Ctrl+D / Esc]'
                : 'Beralih ke Mode Fokus (Periksa baris satu per satu) [Ctrl+D]'
            }
            aria-label={store.isFocusMode ? 'Kembali ke Mode Daftar' : 'Beralih ke Mode Fokus'}
          >
            {store.isFocusMode ? <IconList size={15} /> : <IconFocus size={15} />}
          </button>

          <span className="workbench-header-divider" />

          {/* Stepper Pengubah Ukuran Huruf (Font Size) */}
          <StagingFontSizeControl />

          <span className="workbench-header-divider" />

          {/* Quick Line Creation (Hover to know) */}
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() =>
              store.addLine({
                pageNo: activePage,
                pageNumber: activePage,
                text: '',
                status: 'unverified',
                type: 'matan',
              })
            }
            title={`Tambah Baris Baru pada Halaman ${activePage} (+)`}
            aria-label="Tambah Baris Baru"
          >
            <IconPlus size={13} />
          </button>

          {/* Mark All Verified for Active Page (Hover to know) */}
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() => {
              store.markPageVerified(activePage)
              context.ui.showToast(`Semua baris Halaman ${activePage} ditandai Shahih ✓`, 'success')
            }}
            disabled={currentLines.length === 0 || verifiedCount === currentLines.length}
            title={`Tandai Semua Baris Halaman ${activePage} Shahih ✓`}
            aria-label="Semua Shahih"
          >
            <IconCheck size={13} />
          </button>

          {/* Virtual Pegon Keyboard Toggle (Hover to know) */}
          <button
            type="button"
            className={`btn-workbench-icon ${isKeyboardVisible ? 'active' : ''}`}
            onClick={() => store.setIsKeyboardVisible(!isKeyboardVisible)}
            title={
              isKeyboardVisible
                ? 'Sembunyikan Papan Ketik Pegon'
                : 'Tampilkan Papan Ketik Pegon 3-in-1 (Ctrl+Q)'
            }
            aria-label="Keyboard Pegon"
          >
            <IconKeyboard size={14} />
          </button>

          {/* AI Settings Modal (Hover to know) */}
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() => context.ui.openModal('manuscriber-settings')}
            title="Pengaturan Model AI Vision & Prompt"
            aria-label="Pengaturan AI"
          >
            <IconSettings size={13} />
          </button>

          {/* Clear Staging / Trash for Active Page (Hover to know) */}
          <button
            type="button"
            className="btn-workbench-icon danger"
            onClick={() => {
              if (currentLines.length === 0) return
              if (
                window.confirm(`Kosongkan baris workspace staging untuk Halaman ${activePage}?`)
              ) {
                store.clearPageLines(activePage)
                context.ui.showToast(`Workspace staging Halaman ${activePage} dikosongkan`, 'info')
              }
            }}
            disabled={currentLines.length === 0}
            title={`Kosongkan Seluruh Baris Staging Halaman ${activePage}`}
            aria-label="Kosongkan Staging"
          >
            <IconTrash size={13} />
          </button>

          <span className="workbench-header-divider" />

          {/* Single Primary Action: Terapkan */}
          <button
            type="button"
            className="btn-workbench-commit"
            onClick={handleCommitToWord}
            disabled={currentLines.length === 0}
            title={`Terapkan ${currentLines.length} baris naskah Halaman ${activePage} ke Dokumen Word aktif (Ctrl+Shift+Enter)`}
            aria-label="Terapkan ke Dokumen Word (Ctrl+Shift+Enter)"
          >
            <IconApplyWord size={13} />
            <span>Terapkan</span>
          </button>
        </div>
      </div>

      {/* Main Dedicated Staging & Tashih Workspace */}
      <div
        className="manuscriber-workbench-body"
        style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}
      >
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
          <div
            className="workbench-staging-main"
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
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
