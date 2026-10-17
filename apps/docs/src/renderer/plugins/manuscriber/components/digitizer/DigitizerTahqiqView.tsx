/**
 * Manuscriber Plugin — Digitizer Tahqiq & OCR Diff Inspector
 * Lists all detected blocks with Raw OCR vs Tahqiq LLM text,
 * highlighting corrections, confidence, and linguistic explanations.
 */

import React from 'react'
import type { DigitizerBlock } from '../../types'
import {
  IconCheck,
  IconFocus,
} from '../icons/ManuscriberIcons'

interface DigitizerTahqiqViewProps {
  blocks: DigitizerBlock[]
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onUpdateBlockText: (id: string, text: string) => void
  onVerifyBlock: (id: string) => void
}

export const DigitizerTahqiqView: React.FC<DigitizerTahqiqViewProps> = ({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlockText,
  onVerifyBlock,
}) => {
  if (blocks.length === 0) {
    return (
      <div className="digitizer-empty-tab">
        <p>Belum ada blok teks yang diekstrak pada halaman ini.</p>
        <p className="digitizer-empty-hint">Klik tombol "1. Pindai Geometri & Teks" di bilah atas untuk memulai.</p>
      </div>
    )
  }

  return (
    <div className="digitizer-tahqiq-list">
      {blocks.map((block, idx) => {
        const isSelected = selectedBlockId === block.id
        const hasCorrection = (block.tahqiqText || '').trim() !== (block.rawOcrText || '').trim()

        return (
          <div
            key={block.id}
            className={`digitizer-tahqiq-card ${isSelected ? 'selected' : ''} ${hasCorrection ? 'has-correction' : ''}`}
            onClick={() => onSelectBlock(block.id)}
          >
            {/* Card Header: Type, Index, Status */}
            <div className="tahqiq-card-header">
              <div className="tahqiq-card-title-group">
                <span className="tahqiq-badge-index">#{idx + 1}</span>
                <span className={`digitizer-bbox-badge type-${block.type}`}>{block.type}</span>
                {hasCorrection && (
                  <span className="tahqiq-correction-badge">Koreksi Tahqiq ✓</span>
                )}
              </div>

              <div className="tahqiq-card-actions">
                <button
                  type="button"
                  className="btn-tahqiq-icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectBlock(block.id)
                  }}
                  title="Sorot posisi kotak teks di naskah fisik"
                >
                  <IconFocus size={13} />
                </button>
                <button
                  type="button"
                  className={`btn-tahqiq-verify ${block.status === 'verified' ? 'verified' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onVerifyBlock(block.id)
                  }}
                  title={block.status === 'verified' ? 'Telah diverifikasi shahih' : 'Tandai shahih'}
                >
                  <IconCheck size={13} />
                  <span>{block.status === 'verified' ? 'Shahih' : 'Verifikasi'}</span>
                </button>
              </div>
            </div>

            {/* Diff explanation note */}
            {block.diffNotes && (
              <div className="tahqiq-diff-note">
                <strong>Catatan Tahqiq:</strong> {block.diffNotes}
              </div>
            )}

            {/* Side-by-side or stacked text editors */}
            <div className="tahqiq-text-comparison">
              {hasCorrection && (
                <div className="tahqiq-raw-box" title="Hasil Mentah OCR Visual">
                  <div className="tahqiq-box-label">Raw OCR:</div>
                  <div className="tahqiq-raw-content" dir={block.isRtl ? 'rtl' : 'ltr'}>
                    {block.rawOcrText}
                  </div>
                </div>
              )}

              <div className="tahqiq-final-box" title="Teks Hasil Tahqiq (Dapat Diedit Manual)">
                <div className="tahqiq-box-label">Teks Terverifikasi:</div>
                <textarea
                  value={block.tahqiqText || block.rawOcrText}
                  onChange={(e) => onUpdateBlockText(block.id, e.target.value)}
                  dir={block.isRtl ? 'rtl' : 'ltr'}
                  rows={Math.max(2, Math.min(6, (block.tahqiqText || '').split('\n').length + 1))}
                  className="tahqiq-textarea"
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
