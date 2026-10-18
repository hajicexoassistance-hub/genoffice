import React, { useRef, useState, useEffect } from 'react'
import type { StagingLine } from '../../types'
import { useManuscriberPluginStore } from '../../store/manuscriberPluginStore'
import { dictationService } from '../../services/dictationService'
import { narratorService } from '../../services/narratorService'
import {
  getPegonChar,
  getArabic101Char,
  getHarokatChar,
  applyHarokatAtCursor,
  skipToNextConsonant,
  stepBackToPrevConsonantAndStrip,
} from '../../services/pegonTranslitService'
import {
  IconCheck,
  IconCopy,
  IconSoundOn,
  IconPlay,
  IconPause,
  IconStop,
  IconTrash,
  IconLightning,
  IconStripHarakat,
  IconSparkles,
} from '../icons/ManuscriberIcons'
import { QuickFixPopover } from '../popover/QuickFixPopover'
import { stripHarakat, stripHarakatSelection } from '../../services/pegonTranslitService'
import type { DocxPluginContext } from '../../../types'

interface StagingLineCardProps {
  line: StagingLine
  index: number
  isActive: boolean
  isFocusMode: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onUpdateText: (id: string, text: string) => void
  onToggleStatus: (id: string) => void
  onSplit?: (id: string, offset: number) => void
  onMergeWithPrev?: (id: string) => void
  context?: DocxPluginContext
}

export const StagingLineCard: React.FC<StagingLineCardProps> = ({
  line,
  index,
  isActive,
  isFocusMode,
  onSelect,
  onDelete,
  onUpdateText,
  onToggleStatus,
  onSplit,
  onMergeWithPrev,
  context,
}) => {
  const store = useManuscriberPluginStore()
  const speakingLineId = useManuscriberPluginStore((s) => s.speakingLineId)
  const speechStatus = useManuscriberPluginStore((s) => s.speechStatus)
  const stagingFontSize = useManuscriberPluginStore((s) => s.stagingFontSize) || 16
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const quickFixBtnRef = useRef<HTMLButtonElement>(null)
  const deleteBtnRef = useRef<HTMLButtonElement>(null)
  const [copied, setCopied] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showQuickFix, setShowQuickFix] = useState(false)
  const [quickFixSelection, setQuickFixSelection] = useState<{
    start: number
    end: number
    text: string
  } | null>(null)
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null)

  const isVerified = line.status === 'verified'
  const isThisLineSpeaking = speakingLineId === line.id
  const isPlaying = isThisLineSpeaking && speechStatus === 'playing'
  const isPaused = isThisLineSpeaking && speechStatus === 'paused'

  // Auto focus active card textarea saat baris aktif berubah (baik di list mode maupun focus mode)
  useEffect(() => {
    if (isActive && textareaRef.current) {
      const cardEl = textareaRef.current.closest('.staging-line-card')
      const isCardActionFocused =
        cardEl &&
        cardEl.contains(document.activeElement) &&
        document.activeElement !== textareaRef.current
      if (!isCardActionFocused) {
        textareaRef.current.focus()
      }
      store.setActiveInput(textareaRef.current)
    }
  }, [isActive, isFocusMode])

  // Cleanup TTS when card is unmounted or becomes inactive
  useEffect(() => {
    return () => {
      if (narratorService.getActiveLineId() === line.id) {
        narratorService.stop()
      }
    }
  }, [line.id])

  // Sync word highlighting from narratorService boundary events
  useEffect(() => {
    if (!isThisLineSpeaking) {
      setActiveWordIdx(null)
    }
  }, [isThisLineSpeaking])

  // Highlight active word in textarea while narrator speaks
  useEffect(() => {
    const el = textareaRef.current
    if (!el || !isThisLineSpeaking || activeWordIdx === null) return
    const text = line.text
    const regex = /\S+/g
    let match: RegExpExecArray | null
    let curIdx = 0
    let targetRange: { start: number; end: number } | null = null
    while ((match = regex.exec(text)) !== null) {
      if (curIdx === activeWordIdx) {
        targetRange = { start: match.index, end: match.index + match[0].length }
        break
      }
      curIdx++
    }
    if (targetRange) {
      try {
        el.focus({ preventScroll: true })
        el.setSelectionRange(targetRange.start, targetRange.end)
      } catch {}
    }
  }, [activeWordIdx, isThisLineSpeaking, line.text])

  const handlePlayTTS = () => {
    const text = (line.correctedText || line.text || '').trim()
    if (!text) return
    if (isPaused) {
      narratorService.resume()
      return
    }
    narratorService.speak(line.id, text, {
      onBoundary: (wordIdx) => setActiveWordIdx(wordIdx),
      onEnd: () => setActiveWordIdx(null),
      onError: () => setActiveWordIdx(null),
    })
  }

  const handlePauseTTS = () => {
    narratorService.pause()
  }

  const handleStopTTS = () => {
    narratorService.stop()
    setActiveWordIdx(null)
  }

  // Dictation handler
  const handleToggleDictation = () => {
    if (isListening) {
      dictationService.stopListening()
      setIsListening(false)
      return
    }

    const started = dictationService.startListening({
      onTranscript: (transcript: string) => {
        const currentText = line.text ? `${line.text} ${transcript}` : transcript
        onUpdateText(line.id, currentText)
      },
      onError: (err: any) => {
        console.error('Dictation error:', err)
        setIsListening(false)
      },
      onEnd: () => {
        setIsListening(false)
      },
    })

    if (started) {
      setIsListening(true)
    }
  }

  const handleStripHarakat = () => {
    if (isVerified) return

    const ta = textareaRef.current
    if (!ta) return

    const fullText = ta.value
    let start = ta.selectionStart ?? 0
    let end = ta.selectionEnd ?? 0

    // Jika pengguna belum memblok teks (kursor hanya di 1 titik):
    // Secara cerdas deteksi kata yang berada di bawah posisi kursor
    if (start === end) {
      const beforeCursor = fullText.slice(0, start)
      const afterCursor = fullText.slice(start)
      const matchBefore = beforeCursor.match(/\S+$/)
      const matchAfter = afterCursor.match(/^\S+/)

      if (matchBefore || matchAfter) {
        const wordStart = matchBefore ? start - matchBefore[0].length : start
        const wordEnd = matchAfter ? start + matchAfter[0].length : start
        if (wordStart < wordEnd) {
          start = wordStart
          end = wordEnd
          ta.setSelectionRange(start, end)
        }
      }
    }

    // Jika tetap tidak ada teks yang terseleksi
    if (start === end) {
      context?.ui.showToast(
        'Pilih atau blok kata yang ingin dihilangkan harakatnya terlebih dahulu.',
        'info',
      )
      return
    }

    const selectedText = fullText.slice(start, end)
    const stripped = stripHarakatSelection(selectedText)

    if (stripped === selectedText) {
      context?.ui.showToast('Teks yang diblok sudah tidak mengandung harakat.', 'info')
      return
    }

    // Pastikan textarea fokus
    ta.focus()
    ta.setSelectionRange(start, end)

    // Gunakan document.execCommand('insertText') agar browser mencatat perubahan ke Native Undo Stack.
    // Dengan demikian pengguna dapat langsung menekan Ctrl+Z untuk membatalkan penghapusan harakat kapan saja!
    let execSuccess = false
    try {
      execSuccess = document.execCommand('insertText', false, stripped)
    } catch {
      execSuccess = false
    }

    if (execSuccess) {
      const nextVal = ta.value
      onUpdateText(line.id, nextVal)
      // Pertahankan seleksi teks pada kata yang baru saja dihilangkan harakatnya
      const newEnd = start + stripped.length
      ta.setSelectionRange(start, newEnd)
    } else {
      // Fallback jika browser menolak execCommand
      const nextVal = fullText.slice(0, start) + stripped + fullText.slice(end)
      onUpdateText(line.id, nextVal)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(start, start + stripped.length)
        }
      }, 0)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(line.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter: Toggle Shahih (buka / tutup kuncian)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onToggleStatus(line.id)
      return
    }

    // Jika berstatus Shahih, teks dibekukan — cegah pengetikan & shortcut pengeditan
    if (isVerified) {
      if (e.key !== 'Tab') {
        return
      }
    }

    // Alt+H: Hapus harakat pada kata / teks yang sedang diblok (atau kata di posisi kursor)
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault()
      handleStripHarakat()
      return
    }

    // Ctrl+E or Cmd+E: Toggle QuickFix Popover
    if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault()
      setShowQuickFix((v) => !v)
      return
    }

    // Alt + 1..5: Ganti jenis blok langsung
    if (e.altKey && !e.ctrlKey && !e.metaKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
      e.preventDefault()
      const typeMap: Record<string, { type: StagingLine['type']; label: string }> = {
        '1': { type: 'matan', label: 'MATAN' },
        '2': { type: 'syarah', label: 'SYARAH' },
        '3': { type: 'hasyiah', label: 'HASYIAH' },
        '4': { type: 'nadzom', label: 'NADZOM' },
        '5': { type: 'header', label: 'HEADING' },
      }
      const target = typeMap[e.key]
      if (target) {
        store.updateLine(line.id, { type: target.type, tag: target.label })
      }
      return
    }

    // Tab (tanpa Shift): Navigasi ke tombol aksi pertama di card ini (QuickFix)
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      quickFixBtnRef.current?.focus()
      return
    }

    // Shift + Tab: Navigasi mundur ke tombol Hapus blok sebelumnya (atau textarea sebelumnya)
    if (e.key === 'Tab' && e.shiftKey) {
      const cardEl = textareaRef.current?.closest('.staging-line-card')
      const prevCard = cardEl?.previousElementSibling as HTMLElement | null
      if (prevCard) {
        e.preventDefault()
        const prevDeleteBtn = prevCard.querySelector<HTMLButtonElement>('.btn-card-delete')
        if (prevDeleteBtn) {
          prevDeleteBtn.focus()
        } else {
          prevCard.querySelector<HTMLTextAreaElement>('textarea')?.focus()
        }
        return
      }
    }

    // Alt+Enter: Split line at cursor
    if (e.altKey && e.key === 'Enter' && onSplit && textareaRef.current) {
      e.preventDefault()
      const offset = textareaRef.current.selectionStart || 0
      onSplit(line.id, offset)
      return
    }

    // Backspace at position 0: Merge with previous line
    if (e.key === 'Backspace' && onMergeWithPrev && textareaRef.current) {
      if (textareaRef.current.selectionStart === 0 && textareaRef.current.selectionEnd === 0) {
        e.preventDefault()
        onMergeWithPrev(line.id)
        return
      }
    }

    // Jaminan Lapisan Ke-2 (Secondary Guard): Jika mode Pegon aktif dan Alt shortcut ditekan
    if (
      store.isKeyboardVisible &&
      store.keyboardMode === 'pegon' &&
      e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      textareaRef.current
    ) {
      const altChar = getPegonChar(e.key, e.shiftKey, true)
      if (altChar) {
        e.preventDefault()
        const ta = textareaRef.current
        const start = ta.selectionStart || 0
        const end = ta.selectionEnd || 0
        const prev = ta.value
        const next = prev.slice(0, start) + altChar + prev.slice(end)
        onUpdateText(line.id, next)
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + altChar.length
            textareaRef.current.selectionEnd = start + altChar.length
          }
        }, 0)
        return
      }
    }

    // Jaminan Lapisan Ke-2 (Secondary Guard): Jika mode Harokat aktif
    if (store.isKeyboardVisible && store.keyboardMode === 'harokat' && textareaRef.current) {
      const isShift = e.shiftKey

      // Spasi: Skip ke konsonan berikutnya tanpa menyisipkan spasi
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        const ta = textareaRef.current
        const currentPos = ta.selectionStart || 0
        const nextCaret = skipToNextConsonant(ta.value, currentPos)
        ta.selectionStart = nextCaret
        ta.selectionEnd = nextCaret
        return
      }

      // Backspace: Hapus harakat konsonan sebelumnya lalu mundur
      if (e.key === 'Backspace') {
        e.preventDefault()
        const ta = textareaRef.current
        const currentPos = ta.selectionStart || 0
        const { nextText, nextCaret } = stepBackToPrevConsonantAndStrip(ta.value, currentPos)
        onUpdateText(line.id, nextText)
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = nextCaret
            textareaRef.current.selectionEnd = nextCaret
          }
        }, 0)
        return
      }

      // Tombol Harakat: o, p, [, ], l, ;, '
      const harokat = getHarokatChar(e.key, isShift)
      if (harokat) {
        e.preventDefault()
        const ta = textareaRef.current
        const start = ta.selectionStart || 0
        const end = ta.selectionEnd || 0
        const { nextText, nextCaret } = applyHarokatAtCursor(
          ta.value,
          start,
          end,
          harokat.char,
          harokat.isTasydid,
        )
        onUpdateText(line.id, nextText)
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = nextCaret
            textareaRef.current.selectionEnd = nextCaret
          }
        }, 0)
        return
      }

      // Cegah huruf acak lain
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        return
      }
    }

    // Jaminan Lapisan Ke-2 (Secondary Guard): Jika mode Pegon aktif dan huruf ditekan
    if (
      store.isKeyboardVisible &&
      store.keyboardMode === 'pegon' &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey &&
      textareaRef.current
    ) {
      const isShift = e.shiftKey
      const pegonChar = getPegonChar(e.key, isShift)
      if (pegonChar) {
        e.preventDefault()
        const ta = textareaRef.current
        const start = ta.selectionStart || 0
        const end = ta.selectionEnd || 0
        const prev = ta.value
        const next = prev.slice(0, start) + pegonChar + prev.slice(end)
        onUpdateText(line.id, next)
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + pegonChar.length
            textareaRef.current.selectionEnd = start + pegonChar.length
          }
        }, 0)
        return
      }
    }

    // Jaminan Lapisan Ke-2: Jika mode Arab aktif dan huruf ditekan (Layout Windows Arabic 101)
    if (
      store.isKeyboardVisible &&
      store.keyboardMode === 'arabic' &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey &&
      textareaRef.current
    ) {
      const isShift = e.shiftKey
      const arabChar = getArabic101Char(e.key, isShift)
      if (arabChar) {
        e.preventDefault()
        const ta = textareaRef.current
        const start = ta.selectionStart || 0
        const end = ta.selectionEnd || 0
        const prev = ta.value
        const next = prev.slice(0, start) + arabChar + prev.slice(end)
        onUpdateText(line.id, next)
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + arabChar.length
            textareaRef.current.selectionEnd = start + arabChar.length
          }
        }, 0)
        return
      }
    }
  }

  // Type badge styling & label matching Image 3 & 4
  const typeBadgeMap: Record<string, { label: string; color: string; bg: string }> = {
    matan: { label: 'MATAN', color: '#1a73e8', bg: '#e8f0fe' },
    syarah: { label: 'SYARAH', color: '#881798', bg: '#f3e8fd' },
    hasyiah: { label: 'HASYIAH', color: '#b06000', bg: '#fff0d4' },
    nadzom: { label: 'NADZOM', color: '#137333', bg: '#e6f4ea' },
    commentary: { label: 'MAKNA GANDUL', color: '#8a6300', bg: '#fff8e6' },
    header: { label: 'JUDUL', color: '#d9381e', bg: '#fce8e6' },
  }

  const badgeInfo = typeBadgeMap[line.type || 'matan'] || {
    label: (line.type || 'TEKS').toUpperCase(),
    color: '#1a73e8',
    bg: '#e8f0fe',
  }

  const isArabicOrPegon =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line.text)

  const handleCycleType = (e: React.MouseEvent) => {
    e.stopPropagation()
    const types = ['matan', 'syarah', 'hasyiah', 'nadzom', 'header', 'commentary'] as const
    const currentIdx = types.indexOf((line.type as any) || 'matan')
    const nextType = types[(currentIdx + 1) % types.length]
    store.updateLine(line.id, { type: nextType })
  }

  // Calculate compact rows count based on content length
  const lineCount = line.text ? line.text.split('\n').length : 1
  const estimatedRows = isFocusMode
    ? 4
    : Math.min(5, Math.max(1, lineCount + (line.text.length > 90 ? 1 : 0)))

  const pageNumber = line.pageNo || line.pageNumber || store.currentPage || 1

  return (
    <div
      className={`manuscriber-line-card ${isActive ? 'active' : ''} ${isVerified ? 'verified' : 'unverified'} ${
        isFocusMode ? 'focus-mode-card' : ''
      }`}
      onClick={() => onSelect(line.id)}
      data-line-id={line.id}
    >
      {/* Clean Compact Block Header */}
      <div className="line-card-header">
        <div className="line-card-meta">
          <span className="line-card-block-title">
            [Blok {index + 1} Hal {pageNumber}]
          </span>

          {/* Turats Type Pill (Clickable to cycle type) */}
          <button
            type="button"
            className="turats-type-pill"
            style={{ color: badgeInfo.color, backgroundColor: badgeInfo.bg }}
            onClick={handleCycleType}
            title={`Tipe: ${badgeInfo.label} (Klik untuk ganti tipe naskah)`}
          >
            <IconLightning size={10} color={badgeInfo.color} />
            <span>{badgeInfo.label}</span>
          </button>

          {/* Verification Status Pill with SVG Checkmark */}
          <button
            type="button"
            className={`turats-status-pill ${isVerified ? 'verified' : 'unverified'}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleStatus(line.id)
            }}
            title={
              isVerified
                ? 'Status: Shahih (Dibekukan abu). Klik untuk membuka kuncian agar bisa diedit (Ctrl+Enter)'
                : 'Status: Belum Tashih. Klik untuk tandai Shahih & bekukan teks (Ctrl+Enter)'
            }
          >
            <IconCheck size={11} />
            <span>{isVerified ? 'SHAHIH' : 'BELUM TASHIH'}</span>
          </button>

          {line.bbox && (
            <span className="line-card-bbox-tag" title="Kotak Koordinat Naskah PDF">
              [{Math.round(Array.isArray(line.bbox) ? line.bbox[0] : line.bbox.ymin)},
              {Math.round(Array.isArray(line.bbox) ? line.bbox[1] : line.bbox.xmin)}]
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="line-card-header-actions" onClick={(e) => e.stopPropagation()}>
          {/* Tombol Hapus Harakat pada Teks Terseleksi */}
          <button
            type="button"
            className="btn-card-icon"
            disabled={isVerified}
            onMouseDown={(e) => {
              // Mencegah blur pada textarea agar seleksi teks kursor tidak hilang saat tombol diklik
              e.preventDefault()
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (!isVerified) handleStripHarakat()
            }}
            title={
              isVerified
                ? 'Buka status Shahih terlebih dahulu untuk mengedit teks'
                : 'Hapus Harakat pada Kata / Teks yang Diblok (Alt+H • Mendukung Undo Ctrl+Z)'
            }
            aria-label="Hapus Harakat Terseleksi"
            style={isVerified ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          >
            <IconStripHarakat size={13} />
          </button>

          {/* AI Line Prompt & Tashih Popover Trigger */}
          <button
            ref={quickFixBtnRef}
            type="button"
            className={`btn-card-icon btn-card-quickfix ${showQuickFix ? 'active' : ''}`}
            disabled={isVerified}
            onMouseDown={(e) => {
              // Mencegah blur pada textarea agar teks yang sedang diblok tidak hilang seleksinya
              e.preventDefault()
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (isVerified) return
              if (showQuickFix) {
                setShowQuickFix(false)
                setQuickFixSelection(null)
              } else {
                const ta = textareaRef.current
                if (ta && ta.selectionStart !== ta.selectionEnd) {
                  const start = ta.selectionStart
                  const end = ta.selectionEnd
                  const selText = ta.value.slice(start, end)
                  if (selText.trim().length > 0) {
                    setQuickFixSelection({ start, end, text: selText })
                    setShowQuickFix(true)
                    return
                  }
                }
                setQuickFixSelection(null)
                setShowQuickFix(true)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault()
                textareaRef.current?.focus()
              }
            }}
            title={
              isVerified
                ? 'Buka status Shahih terlebih dahulu untuk mengedit teks'
                : 'Tashih & AI Prompt untuk Mengubah Isi Baris (Ctrl+E • Mendukung Teks Terseleksi)'
            }
            aria-label="Tashih & AI Prompt"
            style={isVerified ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          >
            <IconSparkles
              size={12}
              color={isVerified ? 'var(--text-tertiary, #909499)' : 'var(--word-blue, #185abd)'}
            />
          </button>

          {/* Audio TTS Narrator */}
          {!isThisLineSpeaking ? (
            <button
              type="button"
              className="btn-card-icon"
              onClick={(e) => {
                e.stopPropagation()
                handlePlayTTS()
              }}
              title="Putar Narator Suara"
              aria-label="Putar Narator"
            >
              <IconSoundOn size={12} />
            </button>
          ) : (
            <>
              {isPlaying && (
                <button
                  type="button"
                  className="btn-card-icon tts-active"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePauseTTS()
                  }}
                  title="Jeda Narator"
                  aria-label="Jeda Narator"
                >
                  <IconPause size={12} />
                </button>
              )}
              {isPaused && (
                <button
                  type="button"
                  className="btn-card-icon tts-active"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePlayTTS()
                  }}
                  title="Lanjutkan Narator"
                  aria-label="Lanjutkan Narator"
                >
                  <IconPlay size={12} />
                </button>
              )}
              <button
                type="button"
                className="btn-card-icon danger"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStopTTS()
                }}
                title="Hentikan Narator"
                aria-label="Hentikan Narator"
              >
                <IconStop size={12} />
              </button>
            </>
          )}

          {/* Copy Button */}
          <button
            type="button"
            className="btn-card-icon"
            onClick={handleCopy}
            title="Salin Teks Baris"
            aria-label="Salin Teks"
          >
            {copied ? (
              <IconCheck size={12} color="var(--success, #107c41)" />
            ) : (
              <IconCopy size={12} />
            )}
          </button>

          {/* Delete Button */}
          <button
            ref={deleteBtnRef}
            type="button"
            className="btn-card-icon btn-card-delete danger"
            onClick={() => onDelete(line.id)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault()
                const cardEl = textareaRef.current?.closest('.staging-line-card')
                const nextCard = cardEl?.nextElementSibling as HTMLElement | null
                if (nextCard) {
                  nextCard.querySelector<HTMLTextAreaElement>('textarea')?.focus()
                }
              }
            }}
            title="Hapus Baris Ini"
            aria-label="Hapus Baris"
          >
            <IconTrash size={12} />
          </button>
        </div>
      </div>

      {showQuickFix && (
        <div style={{ position: 'relative' }}>
          <QuickFixPopover
            currentText={quickFixSelection ? quickFixSelection.text : line.text}
            isSelectionOnly={Boolean(quickFixSelection)}
            onApplyText={(newText) => {
              const ta = textareaRef.current
              if (ta && quickFixSelection && quickFixSelection.start !== quickFixSelection.end) {
                // HANYA teks yang diblok yang diganti (Undo-able via Ctrl+Z):
                ta.focus()
                ta.setSelectionRange(quickFixSelection.start, quickFixSelection.end)
                let execSuccess = false
                try {
                  execSuccess = document.execCommand('insertText', false, newText)
                } catch {
                  execSuccess = false
                }
                if (execSuccess) {
                  onUpdateText(line.id, ta.value)
                  const newEnd = quickFixSelection.start + newText.length
                  ta.setSelectionRange(quickFixSelection.start, newEnd)
                } else {
                  const fullText = ta.value
                  const nextVal =
                    fullText.slice(0, quickFixSelection.start) +
                    newText +
                    fullText.slice(quickFixSelection.end)
                  onUpdateText(line.id, nextVal)
                }
              } else if (ta) {
                // Jika tidak ada teks yang diblok, ganti seluruh baris dengan Undo support:
                ta.focus()
                ta.select()
                let execSuccess = false
                try {
                  execSuccess = document.execCommand('insertText', false, newText)
                } catch {
                  execSuccess = false
                }
                if (execSuccess) {
                  onUpdateText(line.id, ta.value)
                } else {
                  onUpdateText(line.id, newText)
                }
              } else {
                onUpdateText(line.id, newText)
              }
              setShowQuickFix(false)
              setQuickFixSelection(null)
            }}
            onDirectStrip={
              quickFixSelection
                ? (strippedText) => {
                    // Aksi instan: langsung strip teks yang diblok di textarea staging (Mendukung Ctrl+Z)!
                    const ta = textareaRef.current
                    if (!ta) return
                    ta.focus()
                    ta.setSelectionRange(quickFixSelection.start, quickFixSelection.end)
                    let execSuccess = false
                    try {
                      execSuccess = document.execCommand('insertText', false, strippedText)
                    } catch {
                      execSuccess = false
                    }
                    if (execSuccess) {
                      onUpdateText(line.id, ta.value)
                      const newEnd = quickFixSelection.start + strippedText.length
                      ta.setSelectionRange(quickFixSelection.start, newEnd)
                      setQuickFixSelection({
                        start: quickFixSelection.start,
                        end: newEnd,
                        text: strippedText,
                      })
                    }
                  }
                : undefined
            }
            onClose={() => {
              setShowQuickFix(false)
              setQuickFixSelection(null)
            }}
          />
        </div>
      )}

      <div className="line-card-body">
        <textarea
          ref={textareaRef}
          readOnly={isVerified}
          className={`line-card-textarea pegon-input-target ${isArabicOrPegon ? 'pegon-font script-arabic' : 'script-latin'} ${isVerified ? 'frozen-verified' : ''}`}
          dir={isArabicOrPegon ? 'rtl' : 'ltr'}
          style={{
            textAlign: isArabicOrPegon ? 'right' : 'left',
            fontSize: isArabicOrPegon
              ? `${Math.round(stagingFontSize * 1.18)}px`
              : `${stagingFontSize}px`,
            lineHeight: isArabicOrPegon ? 1.8 : 1.55,
            cursor: isVerified ? 'not-allowed' : undefined,
          }}
          value={line.text}
          onChange={(e) => {
            if (!isVerified) {
              onUpdateText(line.id, e.target.value)
            }
          }}
          onKeyDown={handleTextareaKeyDown}
          title={
            isVerified
              ? "Baris ini berstatus Shahih dan dibekukan. Klik tombol 'SHAHIH' di atas (atau tekan Ctrl+Enter) untuk membuka kuncian agar bisa diedit kembali."
              : isArabicOrPegon
                ? 'Ketik teks Pegon atau Arab di sini...'
                : 'Ketik atau edit teks naskah...'
          }
          placeholder={
            isArabicOrPegon
              ? 'Ketik teks Pegon atau Arab di sini...'
              : 'Ketik atau edit teks naskah...'
          }
          rows={estimatedRows}
          onFocus={() => {
            onSelect(line.id)
            if (!isVerified) {
              store.setActiveInput(textareaRef.current)
            }
          }}
        />

        {line.transliteration && (
          <div
            className="line-card-transliteration"
            dir="ltr"
            style={{ fontSize: `${Math.max(11, Math.round(stagingFontSize * 0.85))}px` }}
          >
            <span className="translit-label">Transliterasi:</span>
            <span className="translit-text">{line.transliteration}</span>
          </div>
        )}
      </div>

      <div className="line-card-footer">
        <span className="line-card-hint">
          Ctrl+Enter: Shahih • Alt+H: Hapus Harakat • Ctrl+E: QuickFix • Alt+1..5: Tipe • Alt+Enter:
          Pecah
        </span>
      </div>
    </div>
  )
}
