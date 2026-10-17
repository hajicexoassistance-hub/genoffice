/**
 * Manuscriber Plugin — Digitizer Studio Toolbar & Header
 * Controls page pagination, language profile switcher, process triggers, and Word export.
 * Follows 100% Manuscriber design standards (48px header, Fluent tokens).
 */

import React from 'react'
import type { DigitizerLanguageProfile, DigitizerPageData } from '../../types'
import { LANGUAGE_LABELS } from '../../services/digitizerPipelineService'
import {
  IconManuscript,
  IconArrowLeft,
  IconSparkles,
  IconApplyWord,
  IconRefresh,
  IconDocument,
} from '../icons/ManuscriberIcons'

interface DigitizerToolbarProps {
  pageNo: number
  totalPages: number
  pdfFileName?: string
  language: DigitizerLanguageProfile
  status: DigitizerPageData['status']
  blockCount: number
  isLoading: boolean
  loadingMessage?: string
  onPageChange: (page: number) => void
  onLanguageChange: (lang: DigitizerLanguageProfile) => void
  onRunPass1And2: () => void
  onRunTahqiq: () => void
  onApplyToWord: () => void
  onPickFile?: () => void
  onLoadDemo?: () => void
  onClose: () => void
}

export const DigitizerToolbar: React.FC<DigitizerToolbarProps> = ({
  pageNo,
  totalPages,
  pdfFileName,
  language,
  status,
  blockCount,
  isLoading,
  loadingMessage,
  onPageChange,
  onLanguageChange,
  onRunPass1And2,
  onRunTahqiq,
  onApplyToWord,
  onPickFile,
  onLoadDemo,
  onClose,
}) => {
  const isCompleted = status === 'completed'
  const isTahqiqReady = status === 'ocr_extracting' || blockCount > 0

  return (
    <div className="digitizer-studio-header">
      {/* Left: Close/Back, Title, PDF badge */}
      <div className="digitizer-header-left">
        <button
          type="button"
          className="btn-workbench-icon"
          onClick={onClose}
          title="Kembali ke Dokumen Word (Esc)"
          aria-label="Tutup Studio Digitizer"
        >
          <IconArrowLeft size={16} />
        </button>

        <span className="workbench-header-divider" />

        <div className="digitizer-title-badge">
          <span className="workbench-title-icon" aria-hidden>
            <IconManuscript size={14} color="#ffffff" />
          </span>
          <span className="digitizer-title-text">Digitizer Studio 1:1</span>
        </div>

        {/* Pick or Change File Button */}
        {onPickFile && (
          <button
            type="button"
            className="btn-digitizer-open-file"
            onClick={onPickFile}
            title="Pilih Berkas Naskah PDF atau Gambar dari Komputer"
          >
            <IconDocument size={13} />
            <span>{pdfFileName ? 'Ganti Naskah' : 'Buka PDF / Gambar'}</span>
          </button>
        )}

        {/* Demo Button */}
        {onLoadDemo && (
          <button
            type="button"
            className="btn-digitizer-open-file"
            style={{ borderColor: 'var(--word-blue, #185abd)', color: 'var(--word-blue, #185abd)', background: 'rgba(24, 90, 189, 0.06)' }}
            onClick={onLoadDemo}
            title="Muat Contoh Naskah Turats Uji Coba untuk Mengetes Alur 1:1 Seketika"
          >
            <span>⚡ Contoh Demo</span>
          </button>
        )}

        {pdfFileName && (
          <span className="workbench-file-badge" title={`Naskah Sumber: ${pdfFileName}`}>
            <IconDocument size={12} />
            <span className="workbench-file-name">{pdfFileName}</span>
          </span>
        )}

        {/* Page-by-Page Paginator Navigator */}
        <div className="digitizer-paginator">
          <button
            type="button"
            className="btn-digitizer-page-nav"
            onClick={() => onPageChange(Math.max(1, pageNo - 1))}
            disabled={pageNo <= 1 || isLoading}
            title="Halaman Sebelumnya"
          >
            ‹
          </button>

          <span className="digitizer-page-indicator">
            Hal{' '}
            <input
              type="number"
              min={1}
              max={Math.max(1, totalPages)}
              value={pageNo}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                  onPageChange(val)
                }
              }}
              className="digitizer-page-input"
              aria-label="Nomor Halaman"
              disabled={isLoading}
            />{' '}
            / {totalPages || 1}
          </span>

          <button
            type="button"
            className="btn-digitizer-page-nav"
            onClick={() => onPageChange(Math.min(totalPages, pageNo + 1))}
            disabled={pageNo >= totalPages || isLoading}
            title="Halaman Berikutnya"
          >
            ›
          </button>
        </div>

        {/* Status indicator pill */}
        <span className={`digitizer-status-pill status-${status}`}>
          {isLoading ? (
            <span className="digitizer-loading-spinner" aria-hidden />
          ) : null}
          <span>{loadingMessage || getStatusLabel(status, blockCount)}</span>
        </span>
      </div>

      {/* Right: Language Profile Switcher, Pipeline Actions, Apply Button */}
      <div className="digitizer-header-right">
        {/* Language Profile Switcher */}
        <div className="digitizer-lang-selector" title="Pilih profil tata bahasa & kaidah filologi naskah">
          <span className="digitizer-lang-icon" aria-hidden>
            {LANGUAGE_LABELS[language]?.icon || '📜'}
          </span>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as DigitizerLanguageProfile)}
            className="digitizer-lang-dropdown"
            disabled={isLoading}
            aria-label="Profil Bahasa Naskah"
          >
            {Object.entries(LANGUAGE_LABELS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <span className="workbench-header-divider" />

        {/* Step 1: Detect Layout & OCR */}
        <button
          type="button"
          className="btn-digitizer-action"
          onClick={onRunPass1And2}
          disabled={isLoading}
          title="Langkah 1 & 2: Deteksi Geometri Halaman (Jadwal, Margin, Ukuran Kertas) & Ekstraksi Kotak Teks"
        >
          <IconRefresh size={13} className={isLoading ? 'spin' : ''} />
          <span>1. Pindai Geometri & Teks</span>
        </button>

        {/* Step 2: Linguistic Tahqiq */}
        <button
          type="button"
          className="btn-digitizer-action highlight"
          onClick={onRunTahqiq}
          disabled={isLoading || blockCount === 0}
          title="Langkah 3: Jalankan Tahqiq Linguistik LLM untuk mengoreksi salah baca OCR sesuai kaidah bahasa"
        >
          <IconSparkles size={13} />
          <span>2. Tahqiq & Koreksi</span>
        </button>

        <span className="workbench-header-divider" />

        {/* Apply 1:1 to Word Editor */}
        <button
          type="button"
          className="btn-workbench-commit"
          onClick={onApplyToWord}
          disabled={isLoading || blockCount === 0}
          title="Terapkan hasil penataan naskah 1:1 halaman ini langsung ke Dokumen Word aktif"
        >
          <IconApplyWord size={14} />
          <span>Terapkan ke Word</span>
        </button>
      </div>
    </div>
  )
}

function getStatusLabel(status: DigitizerPageData['status'], blockCount: number): string {
  switch (status) {
    case 'layout_detecting':
      return 'Mendeteksi Geometri...'
    case 'ocr_extracting':
      return 'Mengekstrak Blok Teks...'
    case 'tahqiq_running':
      return 'Menjalankan Tahqiq LLM...'
    case 'completed':
      return `${blockCount} Blok • Tahqiq Siap`
    case 'error':
      return 'Terjadi Kesalahan'
    case 'idle':
    default:
      return blockCount > 0 ? `${blockCount} Blok Terdeteksi` : 'Siap Diproses'
  }
}
