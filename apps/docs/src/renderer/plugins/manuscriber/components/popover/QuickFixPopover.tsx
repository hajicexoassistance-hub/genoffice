import React, { useState } from 'react'
import {
  IconSparkles,
  IconDismiss,
  IconCheck,
  IconRefresh,
  IconStripHarakat,
} from '../icons/ManuscriberIcons'
import { stripHarakatSelection } from '../../services/pegonTranslitService'
import {
  callAiTextPrompt,
  HAROKATI_SYSTEM_PROMPT,
  PEGON_BAKU_SYSTEM_PROMPT,
  MAKNANI_SYSTEM_PROMPT,
} from '../../services/visionService'

export interface QuickFixPopoverProps {
  currentText: string
  isSelectionOnly?: boolean
  onApplyText: (newText: string) => void
  onDirectStrip?: (strippedText: string) => void
  onClose: () => void
  // Backwards compatibility props:
  word?: string
  candidates?: string[]
  confidenceScore?: number
  onSelectCandidate?: (candidate: string) => void
}

export const QuickFixPopover: React.FC<QuickFixPopoverProps> = ({
  currentText,
  isSelectionOnly = false,
  onApplyText,
  onDirectStrip,
  onClose,
  onSelectCandidate,
}) => {
  const [userPrompt, setUserPrompt] = useState('')
  const [activePreset, setActivePreset] = useState<'none' | 'harokati' | 'pegonBaku' | 'maknani'>(
    'none',
  )
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lastExecuted, setLastExecuted] = useState<{
    type: 'preset' | 'custom'
    presetKey?: 'harokati' | 'pegonBaku' | 'maknani'
    customPrompt?: string
  } | null>(null)

  // 1. Aksi Programatik 1-Klik: Hapus Harakat (Tanpa AI)
  const handleStripHarakatClick = () => {
    setErrorMsg(null)
    setActivePreset('none')
    const stripped = stripHarakatSelection(currentText)
    setPreviewText(stripped)
    if (onDirectStrip) {
      onDirectStrip(stripped)
    }
  }

  // 2. Eksekusi Preset AI (Harakati, Pegon Baku, Maknani)
  const handleRunPreset = async (preset: 'harokati' | 'pegonBaku' | 'maknani') => {
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

      const res = await callAiTextPrompt(currentText, instruction, sysPrompt)
      setPreviewText(res)
      setLastExecuted({ type: 'preset', presetKey: preset })
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memproses dengan AI.')
    } finally {
      setIsLoading(false)
    }
  }

  // 3. Eksekusi Custom Prompting
  const handleRunCustomPrompt = async () => {
    if (!userPrompt.trim()) return
    setErrorMsg(null)
    setIsLoading(true)
    setActivePreset('none')

    try {
      const res = await callAiTextPrompt(
        currentText,
        userPrompt.trim(),
        'Anda adalah asisten ahli filologi Turats dan naskah Pegon Nusantara. Modifikasi teks sesuai instruksi pengguna secara presisi.',
      )
      setPreviewText(res)
      setLastExecuted({ type: 'custom', customPrompt: userPrompt.trim() })
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memproses dengan AI.')
    } finally {
      setIsLoading(false)
    }
  }

  // 4. Regenerate (Buat Ulang)
  const handleRegenerate = async () => {
    if (!lastExecuted) return
    if (lastExecuted.type === 'preset' && lastExecuted.presetKey) {
      await handleRunPreset(lastExecuted.presetKey)
    } else if (lastExecuted.type === 'custom' && lastExecuted.customPrompt) {
      await handleRunCustomPrompt()
    }
  }

  // 5. Terapkan hasil ke baris dokumen
  const handleApply = () => {
    if (!previewText) return
    onApplyText(previewText)
    if (onSelectCandidate) onSelectCandidate(previewText)
    onClose()
  }

  return (
    <div className="line-ai-prompt-popover" dir="ltr" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="ai-prompt-header">
        <span className="ai-prompt-title">
          <IconSparkles size={14} color="var(--word-blue, #185abd)" />
          <span>Tashih & AI Line Prompt</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="btn-card-icon"
          title="Tutup (Esc)"
          aria-label="Tutup"
        >
          <IconDismiss size={13} />
        </button>
      </div>

      {/* Teks Baris / Teks Terseleksi */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 2,
        }}
      >
        <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {isSelectionOnly
            ? 'Teks yang Diblok (Hanya bagian ini yang diubah):'
            : 'Teks Baris Saat Ini:'}
        </span>
        {isSelectionOnly && (
          <span
            style={{
              fontSize: '9.5px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '4px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
            }}
          >
            SELEKSI AKTIF
          </span>
        )}
      </div>
      <div
        className="ai-prompt-source-box"
        style={{
          background: 'var(--surface-subtle, #f8f9fa)',
          border: '1px solid var(--border, #e3e6ea)',
          borderRadius: '6px',
          padding: '6px 8px',
          fontSize: '13.5px',
          fontFamily: 'Amiri, Scheherazade, Arial',
          direction: 'rtl',
          textAlign: 'right',
          maxHeight: '60px',
          overflowY: 'auto',
          color: 'var(--text-primary)',
        }}
        title={
          isSelectionOnly
            ? 'Hanya kata/teks yang diblok ini yang akan diubah'
            : 'Teks Baris Saat Ini'
        }
      >
        {currentText || '(Kosong)'}
      </div>

      {/* Preset Action Chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Aksi Cepat:
        </span>
        <div className="ai-prompt-chips-row">
          {/* 1. Hapus Harakat (Programatik 100% tanpa AI) */}
          <button
            type="button"
            className="ai-preset-chip"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleStripHarakatClick}
            disabled={isLoading}
            title={
              isSelectionOnly
                ? 'Hilangkan harakat HANYA pada teks yang diblok (Mendukung Undo Ctrl+Z)'
                : 'Hilangkan seluruh harakat/syakal secara instan (Mendukung Undo Ctrl+Z)'
            }
          >
            <IconStripHarakat size={12} />
            <span>Hapus Harakat (Instan)</span>
          </button>

          {/* 2. Beri Harakat Lengkap (AI) */}
          <button
            type="button"
            className={`ai-preset-chip ${activePreset === 'harokati' ? 'active' : ''}`}
            onClick={() => handleRunPreset('harokati')}
            disabled={isLoading}
            title="Beri harakat dan syakal lengkap dengan AI"
          >
            <IconSparkles size={12} color="#107c41" />
            <span>Beri Harakat (AI)</span>
          </button>

          {/* 3. Pegon Baku (AI) */}
          <button
            type="button"
            className={`ai-preset-chip ${activePreset === 'pegonBaku' ? 'active' : ''}`}
            onClick={() => handleRunPreset('pegonBaku')}
            disabled={isLoading}
            title="Sempurnakan ejaan ke Aksara Pegon Baku Pesantren Nusantara dengan AI"
          >
            <IconSparkles size={12} color="#185abd" />
            <span>Pegon Baku (AI)</span>
          </button>

          {/* 4. Maknani Gandul (AI) */}
          <button
            type="button"
            className={`ai-preset-chip ${activePreset === 'maknani' ? 'active' : ''}`}
            onClick={() => handleRunPreset('maknani')}
            disabled={isLoading}
            title="Berikan tanda makna gandul pesantren pada teks dengan AI"
          >
            <IconSparkles size={12} color="#d97706" />
            <span>Makna Gandul (AI)</span>
          </button>
        </div>
      </div>

      {/* Input Prompting Kustom */}
      <div className="ai-prompt-input-area">
        <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Instruksi Kustom Sesuai Kemauan Anda:
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
          <textarea
            className="ai-prompt-textarea"
            rows={2}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleRunCustomPrompt()
              }
            }}
            placeholder='Ketik instruksi modifikasi (misal: "Ubah ke Jawa Krama", "Beri tasydid pada kata kedua", dll)...'
          />
          <button
            type="button"
            onClick={handleRunCustomPrompt}
            disabled={isLoading || !userPrompt.trim()}
            style={{
              padding: '0 12px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              background: 'var(--word-blue, #185abd)',
              color: '#ffffff',
              cursor: isLoading || !userPrompt.trim() ? 'not-allowed' : 'pointer',
              opacity: isLoading || !userPrompt.trim() ? 0.5 : 1,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
            title="Jalankan instruksi AI (Ctrl+Enter)"
          >
            <IconSparkles size={12} />
            <span>Proses</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--danger, #ef4444)',
            padding: '4px 6px',
            borderRadius: '4px',
            background: 'rgba(239, 68, 68, 0.08)',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 0',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <IconSparkles size={16} className="rotating-icon" color="var(--word-blue, #185abd)" />
          <span>Memproses perubahan dengan AI...</span>
        </div>
      )}

      {/* Pratinjau Hasil & Aksi */}
      {previewText !== null && !isLoading && (
        <div className="ai-prompt-preview-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--word-blue, #185abd)' }}
            >
              Pratinjau Hasil:
            </span>
            {lastExecuted && (
              <button
                type="button"
                onClick={handleRegenerate}
                className="btn-card-icon"
                style={{
                  height: '20px',
                  padding: '0 6px',
                  fontSize: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
                title="Buat ulang hasil dengan AI"
              >
                <IconRefresh size={11} />
                <span>Buat Ulang</span>
              </button>
            )}
          </div>

          <textarea
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minHeight: '48px',
              padding: '6px 8px',
              fontSize: '14px',
              fontFamily: 'Amiri, Scheherazade, Arial',
              direction: 'rtl',
              textAlign: 'right',
              border: '1px solid var(--border, #d1d5db)',
              borderRadius: '4px',
              background: 'var(--surface, #ffffff)',
              color: 'var(--text-primary)',
            }}
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            title="Hasil modifikasi (dapat diedit sebelum diterapkan)"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setPreviewText(null)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                border: '1px solid var(--border, #e3e6ea)',
                borderRadius: '4px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              style={{
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '4px',
                background: 'var(--word-blue, #185abd)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              title={
                isSelectionOnly
                  ? 'Ganti kata/teks yang diblok dengan hasil ini (Mendukung Undo Ctrl+Z)'
                  : 'Terapkan teks ini ke baris naskah (Mendukung Undo Ctrl+Z)'
              }
            >
              <IconCheck size={12} />
              <span>{isSelectionOnly ? 'Timpa Teks Seleksi (Ctrl+Z)' : 'Terapkan (Ctrl+Z)'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
