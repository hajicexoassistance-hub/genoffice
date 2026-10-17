import React, { useRef, useState, useEffect } from 'react'
import type { StagingLine } from '../../types'
import { useManuscriberPluginStore } from '../../store/manuscriberPluginStore'
import { dictationService } from '../../services/dictationService'
import { narratorService } from '../../services/narratorService'
import { getPegonChar, transliterateWord } from '../../services/pegonTranslitService'
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
import { stripHarakat } from '../../services/pegonTranslitService'

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
}) => {
  const store = useManuscriberPluginStore()
  const speakingLineId = useManuscriberPluginStore((s) => s.speakingLineId)
  const speechStatus = useManuscriberPluginStore((s) => s.speechStatus)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [copied, setCopied] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showQuickFix, setShowQuickFix] = useState(false)
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null)

  const isThisLineSpeaking = speakingLineId === line.id
  const isPlaying = isThisLineSpeaking && speechStatus === 'playing'
  const isPaused = isThisLineSpeaking && speechStatus === 'paused'

  // Auto focus active card textarea in focus mode
  useEffect(() => {
    if (isActive && textareaRef.current) {
      if (isFocusMode) {
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
    const stripped = stripHarakat(line.text)
    if (stripped !== line.text) {
      onUpdateText(line.id, stripped)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(line.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter: Toggle Shahih
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onToggleStatus(line.id)
      return
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

    // Jaminan Lapisan Ke-2 untuk Translit: saat spasi atau enter ditekan
    if (
      store.isKeyboardVisible &&
      store.keyboardMode === 'translit' &&
      (e.key === ' ' || e.key === 'Enter') &&
      textareaRef.current
    ) {
      const ta = textareaRef.current
      const start = ta.selectionStart || 0
      const before = ta.value.slice(0, start)
      const match = before.match(/([a-zA-Z0-9'"`éèê]+)$/)
      if (match) {
        e.preventDefault()
        const latinWord = match[1]
        const wordStart = start - latinWord.length
        const pegonWord = transliterateWord(latinWord)
        const delimiter = e.key === 'Enter' ? '\n' : ' '
        const next = ta.value.slice(0, wordStart) + pegonWord + delimiter + ta.value.slice(start)
        onUpdateText(line.id, next)
        setTimeout(() => {
          if (textareaRef.current) {
            const nextCaret = wordStart + pegonWord.length + delimiter.length
            textareaRef.current.selectionStart = nextCaret
            textareaRef.current.selectionEnd = nextCaret
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

  const isVerified = line.status === 'verified'
  const isArabicOrPegon = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line.text)

  const handleCycleType = (e: React.MouseEvent) => {
    e.stopPropagation()
    const types = ['matan', 'syarah', 'hasyiah', 'nadzom', 'header', 'commentary'] as const
    const currentIdx = types.indexOf((line.type as any) || 'matan')
    const nextType = types[(currentIdx + 1) % types.length]
    store.updateLine(line.id, { type: nextType })
  }

  // Calculate compact rows count based on content length
  const lineCount = line.text ? line.text.split('\n').length : 1
  const estimatedRows = isFocusMode ? 4 : Math.min(5, Math.max(1, lineCount + (line.text.length > 90 ? 1 : 0)))

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
          <span className="line-card-block-title">Blok {index + 1}</span>

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
            title={isVerified ? 'Status: Shahih (Klik untuk batalkan verifikasi)' : 'Status: Belum Tashih (Klik untuk tandai Shahih)'}
          >
            <IconCheck size={11} />
            <span>{isVerified ? 'SHAHIH' : 'BELUM TASHIH'}</span>
          </button>

          {line.bbox && (
            <span className="line-card-bbox-tag" title="Kotak Koordinat Naskah PDF">
              [{Math.round(Array.isArray(line.bbox) ? line.bbox[0] : line.bbox.ymin)},{Math.round(Array.isArray(line.bbox) ? line.bbox[1] : line.bbox.xmin)}]
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="line-card-header-actions" onClick={(e) => e.stopPropagation()}>
          {/* Tombol Programatik 1-Klik: Hilangkan Seluruh Harakat */}
          <button
            type="button"
            className="btn-card-icon"
            onClick={(e) => {
              e.stopPropagation()
              handleStripHarakat()
            }}
            title="Hilangkan Seluruh Harakat dari Baris Ini (Programatik)"
            aria-label="Hilangkan Harakat"
          >
            <IconStripHarakat size={13} />
          </button>

          {/* AI Line Prompt & Tashih Popover Trigger */}
          <button
            type="button"
            className={`btn-card-icon ${showQuickFix ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setShowQuickFix((v) => !v)
            }}
            title="Tashih & AI Prompt untuk Mengubah Isi Baris"
            aria-label="Tashih & AI Prompt"
          >
            <IconSparkles size={12} color="var(--word-blue, #185abd)" />
          </button>

          {/* Audio TTS Narrator */}
          {!isThisLineSpeaking ? (
            <button
              type="button"
              className="btn-card-icon"
              onClick={(e) => { e.stopPropagation(); handlePlayTTS() }}
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
                  onClick={(e) => { e.stopPropagation(); handlePauseTTS() }}
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
                  onClick={(e) => { e.stopPropagation(); handlePlayTTS() }}
                  title="Lanjutkan Narator"
                  aria-label="Lanjutkan Narator"
                >
                  <IconPlay size={12} />
                </button>
              )}
              <button
                type="button"
                className="btn-card-icon danger"
                onClick={(e) => { e.stopPropagation(); handleStopTTS() }}
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
            {copied ? <IconCheck size={12} color="var(--success, #107c41)" /> : <IconCopy size={12} />}
          </button>

          {/* Delete Button */}
          <button
            type="button"
            className="btn-card-icon danger"
            onClick={() => onDelete(line.id)}
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
            currentText={line.text}
            onApplyText={(newText) => {
              onUpdateText(line.id, newText)
              setShowQuickFix(false)
            }}
            onClose={() => setShowQuickFix(false)}
          />
        </div>
      )}

      <div className="line-card-body">
        <textarea
          ref={textareaRef}
          className={`line-card-textarea pegon-input-target ${isArabicOrPegon ? 'pegon-font script-arabic' : 'script-latin'}`}
          dir={isArabicOrPegon ? 'rtl' : 'ltr'}
          style={{ textAlign: isArabicOrPegon ? 'right' : 'left' }}
          value={line.text}
          onChange={(e) => onUpdateText(line.id, e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder={isArabicOrPegon ? 'Ketik teks Pegon atau Arab di sini...' : 'Ketik atau edit teks naskah...'}
          rows={estimatedRows}
          onFocus={() => {
            onSelect(line.id)
            store.setActiveInput(textareaRef.current)
          }}
        />

        {line.transliteration && (
          <div className="line-card-transliteration" dir="ltr">
            <span className="translit-label">Transliterasi:</span>
            <span className="translit-text">{line.transliteration}</span>
          </div>
        )}
      </div>

      <div className="line-card-footer">
        <span className="line-card-hint">
          Ctrl+Enter: Shahih • Alt+Enter: Pecah • Backspace awal: Gabung
        </span>
      </div>
    </div>
  )
}
