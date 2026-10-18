import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DocxPluginContext } from '../../../types'
import {
  IconQuickFix,
  IconStripHarakat,
  IconSparkles,
  IconDismiss,
  IconCheck,
  IconRefresh,
  IconCopy,
} from '../icons/ManuscriberIcons'
import { stripHarakatSelection } from '../../services/pegonTranslitService'
import {
  callAiTextPrompt,
  HAROKATI_SYSTEM_PROMPT,
  PEGON_BAKU_SYSTEM_PROMPT,
  MAKNANI_SYSTEM_PROMPT,
} from '../../services/visionService'
import { setInactiveSelectionShown } from '../../../../editor/inactive-selection'

interface Props {
  context: DocxPluginContext
  selectionRect?: DOMRect | null
}

interface AnchorRect {
  left: number
  top: number
  right: number
  bottom: number
}

const POP_WIDTH = 390
const GAP = 8
const EDGE = 10
const EST_HEIGHT = 380

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max)}...` : str
}

export function MaknaGandulFloating({ context, selectionRect }: Props) {
  const [slot, setSlot] = useState<HTMLElement | null>(() =>
    document.getElementById('ai-ask-actions-slot'),
  )
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activePreset, setActivePreset] = useState<
    'none' | 'strip' | 'harokati' | 'pegonBaku' | 'maknani'
  >('none')
  const [previewText, setPreviewText] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [excerpt, setExcerpt] = useState('')
  const [savedRect, setSavedRect] = useState<AnchorRect | null>(null)
  const [savedRange, setSavedRange] = useState<{ from: number; to: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [lastExecuted, setLastExecuted] = useState<{
    type: 'preset' | 'custom'
    presetKey?: 'strip' | 'harokati' | 'pegonBaku' | 'maknani'
    customPrompt?: string
  } | null>(null)

  const popRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Track the presence of `#ai-ask-actions-slot` in DOM
  useEffect(() => {
    const updateSlot = () => {
      setSlot(document.getElementById('ai-ask-actions-slot'))
    }
    updateSlot()
    const observer = new MutationObserver(updateSlot)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setPreviewText('')
    setErrorMsg(null)
    setActivePreset('none')
    setCustomPrompt('')
    setCopied(false)
    if (context.editor) {
      setInactiveSelectionShown(context.editor, false)
    }
  }, [context.editor])

  // Close when user clicks outside the popover
  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (popRef.current?.contains(e.target as Node)) return
      if (triggerRef.current?.contains(e.target as Node)) return
      close()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [isOpen, close])

  // 1. Eksekusi Hapus Harokat (Programatik Instan 100% tanpa AI)
  const handleStripHarakat = (textToProcess: string) => {
    setErrorMsg(null)
    setActivePreset('strip')
    const stripped = stripHarakatSelection(textToProcess)
    setPreviewText(stripped)
    setLastExecuted({ type: 'preset', presetKey: 'strip' })

    // Terapkan langsung in-place ke teks yang diblok di dokumen Word (HANYA teks yang diblok!):
    const editor = context.editor
    if (editor) {
      if (savedRange && savedRange.from < savedRange.to) {
        editor.chain().focus().setTextSelection(savedRange).insertContent(stripped).run()
        // Update savedRange ke range yang baru setelah teks digantikan
        setSavedRange({ from: savedRange.from, to: savedRange.from + stripped.length })
      } else {
        editor.chain().focus().insertContent(stripped).run()
      }
    }
  }

  // 2. Eksekusi Preset AI (Harakati, Pegon Baku, Makna Gandul)
  const handleRunPreset = async (
    preset: 'harokati' | 'pegonBaku' | 'maknani',
    textToProcess: string,
  ) => {
    if (!textToProcess) return
    setActivePreset(preset)
    setErrorMsg(null)
    setIsLoading(true)

    try {
      let sysPrompt = ''
      let instruction = ''

      if (preset === 'harokati') {
        sysPrompt = HAROKATI_SYSTEM_PROMPT
        instruction =
          'Beri tanda baca dan harakat/syakal lengkap yang tepat sesuai kaidah gramatikal pada teks ini.'
      } else if (preset === 'pegonBaku') {
        sysPrompt = PEGON_BAKU_SYSTEM_PROMPT
        instruction =
          'Tuliskan dan sempurnakan teks ini ke dalam ejaan Aksara Pegon Baku Pesantren Nusantara yang paling akurat sesuai kaidah emas Pegon.'
      } else if (preset === 'maknani') {
        sysPrompt = MAKNANI_SYSTEM_PROMPT
        instruction =
          'Berikan pemaknaan gandul tradisi pesantren salaf pada teks ini dengan kaidah pemosisian bacaan lisan yang tepat (kata pengantar seperti (iku), (sopo), (opo), dll diletakkan PERSIS SEBELUM lafadz bersangkutan, contoh: زَيْدٌ (utawi Zaid) (iku) قَائِمٌ (wong kang ngadeg)) tanpa kode singkatan tarkib agar ramah Text-to-Speech (TTS).'
      }

      const res = await callAiTextPrompt(textToProcess, instruction, sysPrompt)
      setPreviewText(res)
      setLastExecuted({ type: 'preset', presetKey: preset })
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memproses dengan AI.')
    } finally {
      setIsLoading(false)
    }
  }

  // 3. Eksekusi Custom Prompt
  const handleRunCustomPrompt = async () => {
    if (!customPrompt.trim() || !excerpt) return
    setErrorMsg(null)
    setIsLoading(true)
    setActivePreset('none')

    try {
      const res = await callAiTextPrompt(
        excerpt,
        customPrompt.trim(),
        'Anda adalah asisten ahli filologi Turats dan naskah Pegon Nusantara. Modifikasi teks sesuai instruksi pengguna secara presisi.',
      )
      setPreviewText(res)
      setLastExecuted({ type: 'custom', customPrompt: customPrompt.trim() })
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memproses dengan AI.')
    } finally {
      setIsLoading(false)
    }
  }

  // 4. Regenerate (Ulangi Proses Terakhir)
  const handleRegenerate = async () => {
    if (!lastExecuted) return
    if (lastExecuted.type === 'preset' && lastExecuted.presetKey) {
      if (lastExecuted.presetKey === 'strip') {
        handleStripHarakat(excerpt)
      } else {
        await handleRunPreset(lastExecuted.presetKey, excerpt)
      }
    } else if (lastExecuted.type === 'custom' && lastExecuted.customPrompt) {
      await handleRunCustomPrompt()
    }
  }

  // Buka Popover dari Seleksi Dokumen
  const handleOpen = () => {
    const editor = context.editor
    let rawText = context.selection.text.trim()
    let selRange: { from: number; to: number } | null = null
    if (editor) {
      const { from, to } = editor.state.selection
      if (from < to) {
        selRange = { from, to }
        if (!rawText) {
          rawText = editor.state.doc.textBetween(from, to, ' ', ' ').trim()
        }
      }
    }
    if (!rawText) return

    setSavedRange(selRange)

    // Hitung posisi floating anchor rect
    if (selectionRect) {
      setSavedRect({
        left: selectionRect.left,
        top: selectionRect.top,
        right: selectionRect.right,
        bottom: selectionRect.bottom,
      })
    } else if (editor) {
      try {
        const { from, to } = editor.state.selection
        const a = editor.view.coordsAtPos(from)
        const b = editor.view.coordsAtPos(to)
        setSavedRect({
          left: Math.min(a.left, b.left),
          top: Math.min(a.top, b.top),
          right: Math.max(a.right, b.right),
          bottom: Math.max(a.bottom, b.bottom),
        })
      } catch {
        // fallback
      }
    }

    setExcerpt(rawText)
    setPreviewText(rawText)
    setActivePreset('none')
    setErrorMsg(null)
    setIsOpen(true)
    if (editor) {
      setInactiveSelectionShown(editor, true)
    }
  }

  // Terapkan Penggantian Teks ke Dokumen (Undo-able via Ctrl+Z)
  const handleReplaceSelection = () => {
    if (!previewText) return
    const editor = context.editor
    if (editor) {
      if (savedRange && savedRange.from < savedRange.to) {
        editor.chain().focus().setTextSelection(savedRange).insertContent(previewText).run()
      } else {
        editor.chain().focus().insertContent(previewText).run()
      }
    }
    close()
  }

  // Sisipkan Sebagai Paragraf Baru di Bawah Seleksi
  const handleInsertBelow = () => {
    if (!previewText) return
    context.actions.insertParagraphAfterSelection(previewText.trim())
    close()
  }

  // Salin ke Clipboard
  const handleCopy = async () => {
    if (!previewText) return
    try {
      await navigator.clipboard.writeText(previewText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  // Hitung Posisi Popover
  let popStyle: React.CSSProperties = {}
  if (isOpen && savedRect) {
    const height = popRef.current?.offsetHeight ?? EST_HEIGHT
    const below = savedRect.bottom + GAP
    const above = savedRect.top - GAP - height
    const top =
      below + height <= window.innerHeight - EDGE
        ? below
        : above >= EDGE
          ? above
          : Math.max(EDGE, window.innerHeight - EDGE - height)

    const left = Math.min(
      Math.max(EDGE, (savedRect.left + savedRect.right) / 2 - POP_WIDTH / 2),
      Math.max(EDGE, window.innerWidth - POP_WIDTH - EDGE),
    )

    popStyle = {
      position: 'fixed',
      left,
      top,
      width: POP_WIDTH,
      zIndex: 99999,
    }
  }

  return (
    <>
      {/* 1. Tombol Trigger Icon-Only di samping Tanya AI */}
      {slot &&
        !isOpen &&
        createPortal(
          <button
            ref={triggerRef}
            type="button"
            className="ai-ask-trigger quick-fix-floating-trigger"
            style={{
              position: 'relative',
              left: 'auto',
              top: 'auto',
              zIndex: 'auto',
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleOpen}
            title="Quick Fix & Tashih (Hapus Harakat, Harakati AI, Pegon Baku, Makna Gandul)"
            aria-label="Quick Fix & Tashih"
          >
            <IconQuickFix size={15} color="#ea580c" />
          </button>,
          slot,
        )}

      {/* 2. Popover Quick Fix Lengkap Portaled ke document.body */}
      {isOpen &&
        createPortal(
          <div
            ref={popRef}
            className="line-ai-prompt-popover quick-fix-floating-popover"
            style={popStyle}
            role="dialog"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                close()
              }
            }}
          >
            {/* Header Popover */}
            <div className="ai-prompt-header">
              <span className="ai-prompt-title">
                <IconQuickFix size={15} color="#ea580c" />
                <span>Quick Fix & Tashih Naskah</span>
              </span>
              <button
                type="button"
                onClick={close}
                className="btn-card-icon"
                title="Tutup (Esc)"
                aria-label="Tutup"
              >
                <IconDismiss size={13} />
              </button>
            </div>

            {/* Kotak Teks Asli yang Diblok */}
            <div
              className="ai-prompt-source-box"
              style={{
                background: 'var(--surface-subtle, #f8f9fa)',
                border: '1px solid var(--border, #e3e6ea)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '14px',
                fontFamily: "'Amiri', 'Traditional Arabic', serif",
                direction: 'rtl',
                textAlign: 'right',
                maxHeight: '62px',
                overflowY: 'auto',
                color: 'var(--text-primary)',
              }}
              title="Teks yang sedang diblok di dokumen"
            >
              {excerpt || '(Teks kosong)'}
            </div>

            {/* Baris Tombol Aksi Preset Quick Fix */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Aksi Cepat:
              </span>
              <div className="ai-prompt-chips-row">
                {/* 1. Hapus Harakat (Programatik Instan 100%) */}
                <button
                  type="button"
                  className={`ai-preset-chip ${activePreset === 'strip' ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleStripHarakat(excerpt)}
                  disabled={isLoading}
                  title="Hilangkan harakat HANYA pada kata/teks yang diblok (Mendukung Undo Ctrl+Z)"
                >
                  <IconStripHarakat size={12} color="#dc2626" />
                  <span>Hapus Harakat (Instan)</span>
                </button>

                {/* 2. Beri Harakat Lengkap (AI) */}
                <button
                  type="button"
                  className={`ai-preset-chip ${activePreset === 'harokati' ? 'active' : ''}`}
                  onClick={() => handleRunPreset('harokati', excerpt)}
                  disabled={isLoading}
                  title="Beri harakat dan syakal lengkap dengan AI"
                >
                  <IconSparkles size={12} color="#16a34a" />
                  <span>Beri Harakat (AI)</span>
                </button>

                {/* 3. Pegon Baku (AI) */}
                <button
                  type="button"
                  className={`ai-preset-chip ${activePreset === 'pegonBaku' ? 'active' : ''}`}
                  onClick={() => handleRunPreset('pegonBaku', excerpt)}
                  disabled={isLoading}
                  title="Sempurnakan ejaan ke Aksara Pegon Baku Pesantren Nusantara dengan AI"
                >
                  <IconSparkles size={12} color="#2563eb" />
                  <span>Pegon Baku (AI)</span>
                </button>

                {/* 4. Makna Gandul (AI) */}
                <button
                  type="button"
                  className={`ai-preset-chip ${activePreset === 'maknani' ? 'active' : ''}`}
                  onClick={() => handleRunPreset('maknani', excerpt)}
                  disabled={isLoading}
                  title="Berikan tanda makna gandul pesantren pada teks dengan AI"
                >
                  <IconSparkles size={12} color="#ea580c" />
                  <span>Makna Gandul (AI)</span>
                </button>
              </div>
            </div>

            {/* Input Instruksi Kustom */}
            <div className="ai-prompt-input-area">
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Instruksi Modifikasi Tambahan:
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <textarea
                  className="ai-prompt-textarea"
                  rows={2}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      handleRunCustomPrompt()
                    }
                  }}
                  placeholder='Ketik instruksi modifikasi (misal: "Ubah ke Jawa Krama", "Beri tasydid", dll)...'
                  style={{ minHeight: '44px', fontSize: '11.5px' }}
                />
                <button
                  type="button"
                  onClick={handleRunCustomPrompt}
                  disabled={isLoading || !customPrompt.trim()}
                  style={{
                    padding: '0 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--word-blue, #185abd)',
                    color: '#ffffff',
                    cursor: isLoading || !customPrompt.trim() ? 'not-allowed' : 'pointer',
                    opacity: isLoading || !customPrompt.trim() ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                    transition: 'all 120ms ease',
                  }}
                  title="Jalankan instruksi AI (Ctrl+Enter)"
                >
                  Kirim
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#dc2626',
                  background: 'rgba(239, 68, 68, 0.08)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Area Preview & Hasil Modifikasi */}
            <div className="ai-prompt-preview-card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Hasil Pratinjau (Dapat Disunting):</span>
                {lastExecuted && !isLoading && (
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'none',
                      border: 'none',
                      fontSize: '10.5px',
                      color: 'var(--word-blue, #185abd)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    title="Buat ulang hasil dengan AI"
                  >
                    <IconRefresh size={11} />
                    <span>Buat Ulang</span>
                  </button>
                )}
              </div>

              {isLoading ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '20px 0',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                  }}
                >
                  <div className="makna-gandul-spinner" />
                  <span>Sedang memproses dengan AI...</span>
                </div>
              ) : (
                <textarea
                  className="ai-prompt-textarea"
                  rows={3}
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Hasil tashih akan muncul di sini..."
                  dir="rtl"
                  style={{
                    fontFamily: "'Amiri', 'Traditional Arabic', serif",
                    fontSize: '14.5px',
                    lineHeight: '1.6',
                    direction: 'rtl',
                    textAlign: 'right',
                    minHeight: '68px',
                  }}
                />
              )}
            </div>

            {/* Footer Aksi: Terapkan / Sisipkan / Salin */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                paddingTop: 4,
                borderTop: '1px solid var(--border, #e3e6ea)',
              }}
            >
              <button
                type="button"
                onClick={handleCopy}
                disabled={!previewText.trim() || isLoading}
                className="ai-preset-chip"
                style={{ padding: '5px 8px', fontSize: '11px' }}
                title="Salin teks hasil ke clipboard"
              >
                {copied ? <IconCheck size={12} color="#16a34a" /> : <IconCopy size={12} />}
                <span>{copied ? 'Tersalin!' : 'Salin'}</span>
              </button>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={handleInsertBelow}
                  disabled={!previewText.trim() || isLoading}
                  className="ai-preset-chip"
                  style={{ padding: '5px 10px', fontSize: '11px' }}
                  title="Sisipkan teks hasil sebagai paragraf baru di bawah teks yang diblok tanpa mengubah teks aslinya"
                >
                  <span>Sisipkan Bawah</span>
                </button>

                <button
                  type="button"
                  onClick={handleReplaceSelection}
                  disabled={!previewText.trim() || isLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    height: '28px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--word-blue, #185abd)',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: !previewText.trim() || isLoading ? 'not-allowed' : 'pointer',
                    opacity: !previewText.trim() || isLoading ? 0.6 : 1,
                    transition: 'all 120ms ease',
                  }}
                  title="Ganti teks yang diblok di dokumen dengan hasil ini (Dapat di-Undo dengan Ctrl+Z)"
                >
                  <IconCheck size={12} color="#ffffff" />
                  <span>Timpa</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

export default MaknaGandulFloating
