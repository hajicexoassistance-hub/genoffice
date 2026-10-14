import React, { useRef, useState, useEffect } from 'react'
import type { StagingLine } from '../../types'
import { useManuscriberPluginStore } from '../../store/manuscriberPluginStore'
import { dictationService } from '../../services/dictationService'
import {
  IconCheck,
  IconCopy,
  IconSoundOn,
  IconTrash,
  IconLightning,
} from '../icons/ManuscriberIcons'

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [copied, setCopied] = useState(false)
  const [isListening, setIsListening] = useState(false)

  // Auto focus active card textarea in focus mode
  useEffect(() => {
    if (isActive && textareaRef.current) {
      if (isFocusMode) {
        textareaRef.current.focus()
      }
      store.setActiveInput(textareaRef.current)
    }
  }, [isActive, isFocusMode])

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

  return (
    <div
      className={`manuscriber-line-card ${isActive ? 'active' : ''} ${isVerified ? 'verified' : 'unverified'} ${
        isFocusMode ? 'focus-mode-card' : ''
      }`}
      onClick={() => onSelect(line.id)}
      data-line-id={line.id}
    >
      {/* Block Header matching Image 3 & 4 */}
      <div className="line-card-header">
        <div className="line-card-meta">
          <span className="line-card-block-title">Blok {index + 1}</span>

          {/* Turats Type Pill with SVG Lightning */}
          <span
            className="turats-type-pill"
            style={{ color: badgeInfo.color, backgroundColor: badgeInfo.bg }}
          >
            <IconLightning size={10} color={badgeInfo.color} />
            <span>{badgeInfo.label}</span>
          </span>

          {/* Verification Status Pill with SVG Checkmark */}
          <span
            className={`turats-status-pill ${isVerified ? 'verified' : 'unverified'}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleStatus(line.id)
            }}
            title={isVerified ? 'Status: Shahih (Klik untuk batalkan verifikasi)' : 'Status: Belum Tashih (Klik untuk tandai Shahih)'}
          >
            <IconCheck size={11} />
            <span>{isVerified ? 'SHAHIH (VERIFIED)' : 'BELUM VERIFIKASI'}</span>
          </span>

          {line.bbox && (
            <span className="line-card-bbox-tag" title="Kotak Koordinat Naskah PDF">
              [{Math.round(Array.isArray(line.bbox) ? line.bbox[0] : line.bbox.ymin)},{Math.round(Array.isArray(line.bbox) ? line.bbox[1] : line.bbox.xmin)}]
            </span>
          )}
        </div>

        {/* Action Buttons matching Image 3 & 4 */}
        <div className="line-card-header-actions" onClick={(e) => e.stopPropagation()}>
          {/* Audio TTS / Dikte */}
          <button
            type="button"
            className={`btn-card-icon ${isListening ? 'listening' : ''}`}
            onClick={handleToggleDictation}
            title={isListening ? 'Hentikan Dikte Suara' : 'Dikte Suara / Audio'}
            aria-label="Audio Dikte"
          >
            <IconSoundOn size={13} />
          </button>

          {/* Copy Button */}
          <button
            type="button"
            className="btn-card-icon"
            onClick={handleCopy}
            title="Salin Teks Baris"
            aria-label="Salin Teks"
          >
            {copied ? <IconCheck size={12} color="var(--success, #107c41)" /> : <IconCopy size={13} />}
          </button>

          {/* Delete Button */}
          <button
            type="button"
            className="btn-card-icon danger"
            onClick={() => onDelete(line.id)}
            title="Hapus Baris Ini"
            aria-label="Hapus Baris"
          >
            <IconTrash size={13} />
          </button>
        </div>
      </div>

      <div className="line-card-body">
        <textarea
          ref={textareaRef}
          className="line-card-textarea pegon-font"
          dir="rtl"
          value={line.text}
          onChange={(e) => onUpdateText(line.id, e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder="Ketik teks Pegon atau Arab di sini..."
          rows={isFocusMode ? 5 : 2}
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
          Ctrl+Enter: Shahih | Alt+Enter: Pecah Baris | Backspace awal: Gabung
        </span>
      </div>
    </div>
  )
}
