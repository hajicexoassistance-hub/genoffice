import React, { useState, useEffect, useRef } from 'react'
import type { DocxPluginContext } from '../../types'
import { useManuscriberPluginStore } from '../store/manuscriberPluginStore'
import { dictationService } from '../services/dictationService'
import { loadPdfDocumentFromBuffer } from '../services/pdfService'
import { deleteDocumentSession } from '../services/documentSessionStore'
import {
  IconManuscript,
  IconWorkbench,
  IconFolderOpen,
  IconSidebar,
  IconKeyboard,
  IconBookOpen,
  IconSettings,
  IconApplyWord,
  IconMic,
  IconSparkles,
  IconCopy,
  IconCheck,
  IconTrash,
  IconDocument,
  IconInfo,
} from '../components/icons/ManuscriberIcons'

interface ManuscriberRibbonProps {
  context: DocxPluginContext
  onClose: () => void
}

export const ManuscriberRibbon: React.FC<ManuscriberRibbonProps> = ({ context }) => {
  const store = useManuscriberPluginStore()
  const { isKeyboardVisible, pdfFileName, lines, activeLineId } = store
  const [isDictating, setIsDictating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    dictationService.onStateChange((listening) => {
      setIsDictating(listening)
    })

    dictationService.onResult((transcript) => {
      // Sisipkan hasil dikte langsung ke kursor Word aktif
      if (transcript) {
        context.actions.insertText(' ' + transcript.trim())
        context.ui.showToast(`Dikte disisipkan: "${transcript.trim().slice(0, 30)}..."`, 'info')
      }
    })

    dictationService.onError((err) => {
      context.ui.showToast(`Dikte error: ${err?.message || err}`, 'error')
      setIsDictating(false)
    })
  }, [context])

  const handleOpenWorkbench = () => {
    context.ui.openCanvasView()
  }

  const handleTriggerPickPdf = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      context.ui.showToast(`Memuat naskah "${file.name}"...`, 'info')
      const buffer = await file.arrayBuffer()
      store.setPdfFileName(file.name)
      store.setPdfBytes(buffer)
      const pdfDoc = await loadPdfDocumentFromBuffer(buffer)
      store.setPdfDocument(pdfDoc)
      store.setTotalPages(pdfDoc.numPages)
      store.setCurrentPage(1)
      context.ui.showToast(
        `Naskah "${file.name}" (${pdfDoc.numPages} hal) berhasil dimuat!`,
        'success',
      )
    } catch (err: any) {
      console.error('Failed to load PDF via ribbon:', err)
      context.ui.showToast(`Gagal memuat PDF: ${err?.message || err}`, 'error')
    } finally {
      e.target.value = ''
    }
  }

  const handleClearDocumentSession = async () => {
    if (
      !window.confirm(
        'Hapus riwayat naskah PDF dan baris tashih yang tertaut pada dokumen Word ini?',
      )
    ) {
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
    context.ui.showToast('Kaitan naskah dokumen Word ini berhasil dihapus.', 'info')
  }

  const handleToggleKeyboard = () => {
    store.setIsKeyboardVisible(!isKeyboardVisible)
    context.ui.showToast(
      isKeyboardVisible ? 'Keyboard Pegon ditutup' : 'Keyboard Pegon aktif',
      'info',
    )
  }

  const handleToggleDictation = () => {
    const cfg = dictationService.getConfig()
    if (isDictating) {
      void dictationService.stop()
      context.ui.showToast('Dikte suara dihentikan', 'info')
    } else {
      void dictationService
        .start()
        .then(() => {
          const engineLabel = cfg.engine === 'groq-whisper' ? 'Groq Whisper Turbo' : 'Web Speech'
          context.ui.showToast(
            `Mendengarkan suara (${engineLabel} - ${cfg.lang})... Silakan bicara!`,
            'info',
          )
        })
        .catch((err) => {
          context.ui.showToast(`Gagal memulai dikte: ${err?.message || err}`, 'error')
        })
    }
  }

  const handleApplyToWord = () => {
    const activePage = store.currentPage || 1
    const targetLines = lines.filter((l) => (l.pageNo || l.pageNumber || 1) === activePage)

    if (targetLines.length === 0) {
      context.ui.showToast(
        `Workspace Staging kosong untuk Halaman ${activePage}. Buka Workbench untuk memuat baris naskah.`,
        'info',
      )
      return
    }

    // Konfirmasi bila masih ada baris yang belum berstatus Shahih
    const unverifiedCount = targetLines.filter((l) => l.status !== 'verified').length
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

    let html = '<div style="direction: rtl; font-family: Amiri, Arial; font-size: 14pt;">'
    targetLines.forEach((l) => {
      if (l.text.trim()) {
        html += `<p style="margin: 4px 0; line-height: 1.8;">${l.text.trim()}</p>`
      }
    })
    html += '</div>'

    context.actions.insertHtml(html)
    store.recordCommit(activePage, targetLines)
    context.ui.showToast(
      `${targetLines.length} baris (Halaman ${activePage}) berhasil disisipkan ke Word!`,
      'success',
    )
    context.ui.closeCanvasView()
  }

  // Pintasan Keyboard:
  // - Ctrl + Shift + Enter : Terapkan ke Word
  // - Ctrl + T             : Buka / Tutup Staging Workbench
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Terapkan ke Word: Ctrl + Shift + Enter
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'Enter' || e.code === 'Enter')) {
        e.preventDefault()
        e.stopImmediatePropagation()
        handleApplyToWord()
        return
      }

      // 2. Buka / Tutup Workbench: Ctrl + T
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (e.key === 't' || e.key === 'T' || e.code === 'KeyT')
      ) {
        e.preventDefault()
        e.stopImmediatePropagation()
        context.ui.toggleCanvasView()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [lines, store.currentPage, context])

  const handleInsertActiveLine = () => {
    if (lines.length === 0) {
      context.ui.showToast('Belum ada baris naskah di staging.', 'info')
      return
    }
    const target = lines.find((l) => l.id === activeLineId) || lines[0]
    if (target && target.text.trim()) {
      context.actions.insertHtml(
        `<p style="direction: rtl; font-family: Amiri, Arial; font-size: 14pt; margin: 4px 0; line-height: 1.8;">${target.text.trim()}</p>`,
      )
      context.ui.showToast('Baris aktif disisipkan ke Word', 'success')
    } else {
      context.ui.showToast('Baris yang dipilih tidak memiliki teks.', 'info')
    }
  }

  const handleCopyAllText = () => {
    if (lines.length === 0) {
      context.ui.showToast('Tidak ada teks naskah untuk disalin.', 'info')
      return
    }
    const allText = lines
      .map((l) => l.text.trim())
      .filter(Boolean)
      .join('\n')

    if (allText) {
      void navigator.clipboard.writeText(allText)
      context.ui.showToast(`${lines.length} baris naskah disalin ke clipboard!`, 'success')
    }
  }

  const handleMarkAllVerified = () => {
    if (lines.length === 0) {
      context.ui.showToast('Belum ada baris naskah untuk diverifikasi.', 'info')
      return
    }
    store.markAllVerified()
    context.ui.showToast(`Semua (${lines.length}) baris naskah ditandai terverifikasi ✓`, 'success')
  }

  return (
    <>
      {/* Hidden File Picker for Direct PDF Opening from Ribbon */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* ── Group 1: Ruang Kerja & Naskah ────────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            type="button"
            className="rb-big"
            onClick={handleOpenWorkbench}
            title="Buka / Tutup Ruang Kerja Staging Workbench Layar Penuh (Ctrl+T)"
          >
            <span className="rb-big-icon">
              <IconWorkbench size={22} color="var(--word-blue, #185abd)" />
            </span>
            <span>Buka Workbench</span>
          </button>

          <div className="rb-col">
            <button
              type="button"
              className="rb-small"
              onClick={() => {
                context.ui.expandSidebar()
                context.ui.showToast('Panel samping Manuscriber dibuka', 'info')
              }}
              title="Buka Penampil Naskah di Panel Samping Dokumen Word"
            >
              <IconSidebar size={14} />
              <span>Panel Samping</span>
            </button>

            <button
              type="button"
              className="rb-small"
              onClick={handleTriggerPickPdf}
              title="Pilih Berkas PDF Naskah Baru dari Komputer"
            >
              <IconFolderOpen size={14} />
              <span>{pdfFileName ? 'Ganti Naskah' : 'Buka PDF'}</span>
            </button>

            <button
              type="button"
              className="rb-small"
              disabled={!pdfFileName && lines.length === 0}
              onClick={handleClearDocumentSession}
              style={{ color: pdfFileName ? 'var(--danger, #dc3545)' : undefined }}
              title="Hapus kaitan naskah & riwayat tashih dari dokumen Word ini"
            >
              <IconTrash size={14} />
              <span>Hapus Naskah</span>
            </button>
          </div>
        </div>
        <div className="ribbon-group-label">Naskah</div>
      </div>

      <div className="ribbon-sep" />

      {/* ── Group 3: AI Vision & Pemindaian ──────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            type="button"
            className="rb-big"
            onClick={() => {
              if (!store.pdfDocument) {
                context.ui.showToast('Silakan buka berkas PDF naskah terlebih dahulu.', 'error')
                context.ui.expandSidebar()
                store.setSidebarActiveTab('pdf')
                return
              }
              context.ui.expandSidebar()
              store.setSidebarActiveTab('pdf')
              const targetPage = store.currentPage || 1
              store.requestTranscribe(targetPage)
            }}
            title="Transkripsi Halaman Naskah Aktif Menggunakan Vision AI"
          >
            <span className="rb-big-icon">
              <IconSparkles size={22} color="var(--word-blue, #185abd)" />
            </span>
            <span>Transkrip AI</span>
          </button>

          <div className="rb-col">
            <button
              type="button"
              className="rb-small"
              onClick={() => context.ui.openModal('manuscriber-settings')}
              title="Setelan Provider AI Vision (SumoPod, Groq, OpenRouter) & Prompt Kustom"
            >
              <IconSettings size={14} />
              <span>Setelan AI</span>
            </button>

            <button
              type="button"
              className="rb-small"
              onClick={() => {
                context.ui.openCanvasView()
                context.ui.showToast('Pilih baris di Workbench untuk tashih bantuan AI', 'info')
              }}
              title="Buka Alat Tashih Ejaan & AI Harakat di Workbench"
            >
              <IconSparkles size={14} />
              <span>Tashih Ejaan</span>
            </button>
          </div>
        </div>
        <div className="ribbon-group-label">AI Vision</div>
      </div>

      <div className="ribbon-sep" />

      {/* ── Group 3: Aksara & Pengetikan Pegon ─────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            type="button"
            className={`rb-big ${isKeyboardVisible ? 'active' : ''}`}
            onClick={handleToggleKeyboard}
            title="Tampilkan / Sembunyikan Papan Ketik Pegon 3-in-1 (Ctrl+Q, Minimize: Ctrl+Shift+Q)"
          >
            <span className="rb-big-icon">
              <IconKeyboard size={22} />
            </span>
            <span>Keyboard Pegon</span>
          </button>

          <div className="rb-col">
            <button
              type="button"
              className={`rb-small ${isDictating ? 'active' : ''}`}
              onClick={handleToggleDictation}
              style={{
                color: isDictating ? 'var(--danger, #dc3545)' : undefined,
                fontWeight: isDictating ? 600 : undefined,
              }}
              title={
                isDictating
                  ? 'Sedang mendengarkan suara... Klik untuk berhenti'
                  : 'Mulai Dikte Suara (Groq Whisper Turbo / Web Speech)'
              }
            >
              <IconMic size={14} color={isDictating ? '#dc3545' : 'currentColor'} />
              <span>{isDictating ? 'Merekam...' : 'Dikte Suara'}</span>
            </button>
          </div>
        </div>
        <div className="ribbon-group-label">Aksara & Suara</div>
      </div>

      <div className="ribbon-sep" />

      {/* ── Group 4: Integrasi Dokumen Word ──────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            type="button"
            className="rb-big"
            onClick={handleApplyToWord}
            disabled={lines.length === 0}
            title="Sisipkan baris staging tashih halaman aktif ke dokumen Word (Ctrl + Shift + Enter)"
          >
            <span className="rb-big-icon">
              <IconApplyWord
                size={22}
                color={lines.length > 0 ? 'var(--success, #10b981)' : undefined}
              />
            </span>
            <span>Terapkan Word</span>
          </button>

          <div className="rb-col">
            <button
              type="button"
              className="rb-small"
              onClick={handleInsertActiveLine}
              disabled={lines.length === 0}
              title="Sisipkan hanya baris yang sedang aktif / dipilih di staging ke Word"
            >
              <IconApplyWord size={14} />
              <span>Sisipkan Baris</span>
            </button>

            <button
              type="button"
              className="rb-small"
              onClick={handleCopyAllText}
              disabled={lines.length === 0}
              title="Salin seluruh teks naskah hasil tashih ke clipboard komputer"
            >
              <IconCopy size={14} />
              <span>Salin Teks</span>
            </button>

            <button
              type="button"
              className="rb-small"
              onClick={handleMarkAllVerified}
              disabled={lines.length === 0}
              title="Tandai semua baris staging sebagai terverifikasi (verified ✓)"
            >
              <IconCheck size={14} />
              <span>Verifikasi Semua</span>
            </button>
          </div>
        </div>
        <div className="ribbon-group-label">Integrasi Word</div>
      </div>

      {/* ── Group 5: Status Monitor Naskah Aktif ─────────────────────────────── */}
      {pdfFileName && (
        <>
          <div className="ribbon-sep" />
          <div className="ribbon-group">
            <div className="ribbon-group-items" style={{ padding: '0 4px' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  maxWidth: 155,
                  lineHeight: 1.25,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title={`Naskah aktif: ${pdfFileName}`}
                >
                  <IconDocument size={12} />
                  <span>{pdfFileName}</span>
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>
                  {lines.length} baris di staging
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--success, #10b981)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <IconCheck size={10} />
                  <span>Tersimpan di DB</span>
                </span>
              </div>
            </div>
            <div className="ribbon-group-label">Naskah Tertaut</div>
          </div>
        </>
      )}

      <div className="ribbon-sep" />

      {/* ── Group: Bantuan & Pintasan ────────────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            type="button"
            className="rb-big"
            onClick={() => context.ui.openModal('manuscriber-app-guide')}
            title="Buka Panduan Pintasan Keyboard Aplikasi Lengkap"
          >
            <span className="rb-big-icon">
              <IconInfo size={22} color="var(--word-blue, #185abd)" />
            </span>
            <span>Panduan App</span>
          </button>
        </div>
        <div className="ribbon-group-label">Bantuan</div>
      </div>
    </>
  )
}
