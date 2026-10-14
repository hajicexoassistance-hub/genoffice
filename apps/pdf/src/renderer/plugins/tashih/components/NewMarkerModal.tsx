import React, { useState } from 'react'
import type { DomainPreset, PdfCoordinates, SeverityLevel } from '../types'
import { DOMAIN_PRESETS } from '../types'
import {
  FluentSave,
  FluentDismiss,
  FluentCheckmark,
  FluentWarning,
  FluentDocumentPdf,
  FluentPrint,
} from '../TashihFluentIcons'

export interface NewMarkerDraftData {
  target: 'master' | 'scan'
  coords: PdfCoordinates
  cropDataUrl?: string
  itemNumber: number
  existingAnnotationId?: string
}

export interface MarkerFormData {
  error_category: string
  severity: SeverityLevel
  reason: string
  suggestion: string
  text_master?: string
  text_scan?: string
}

interface Props {
  isOpen: boolean
  draft: NewMarkerDraftData | null
  domainPreset: DomainPreset
  activeVendorName: string
  onSave: (formData: MarkerFormData) => void
  onCancel: () => void
}

export function NewMarkerModal({
  isOpen,
  draft,
  domainPreset,
  activeVendorName,
  onSave,
  onCancel,
}: Props) {
  if (!isOpen || !draft) return null

  const categories = DOMAIN_PRESETS[domainPreset].categories
  const [category, setCategory] = useState(categories[0]?.label || 'Koreksi Naskah')
  const [severity, setSeverity] = useState<SeverityLevel>('kritis')
  const [reason, setReason] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [textMaster, setTextMaster] = useState('')
  const [textScan, setTextScan] = useState('')

  const isMaster = draft.target === 'master'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      error_category: category,
      severity,
      reason: reason.trim() || 'Perbedaan teks atau noda tinta ditemukan oleh editor.',
      suggestion: suggestion.trim() || 'Minta vendor memeriksa ulang plat cetak.',
      text_master: textMaster.trim() || undefined,
      text_scan: textScan.trim() || undefined,
    })
  }

  return (
    <div className="tashih-modal-backdrop" onClick={onCancel}>
      <div
        className="tashih-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '460px',
          maxWidth: '92vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 35px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header Dialog */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '13px',
                background:
                  severity === 'kritis'
                    ? 'var(--danger, #d13438)'
                    : severity === 'koreksi'
                    ? '#d83b01'
                    : 'var(--success, #107c41)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.4)',
              }}
            >
              #{draft.itemNumber}
            </span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Isi Keterangan Penanda #{draft.itemNumber}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                {isMaster ? (
                  <>
                    <FluentDocumentPdf size={11} />
                    <span>Ditandai pada: <b>Master Layout</b></span>
                  </>
                ) : (
                  <>
                    <FluentPrint size={11} />
                    <span>Ditandai pada: <b>{activeVendorName || 'Hasil Cetak Vendor'}</b></span>
                  </>
                )}
                <span>• ({Math.round(draft.coords.pdf_x)}, {Math.round(draft.coords.pdf_y)})</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Batal"
          >
            <FluentDismiss size={16} />
          </button>
        </div>

        {/* Body Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
          }}
        >
          {/* Visual Proof Preview */}
          {draft.cropDataUrl && (
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                padding: '6px 10px',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-6, 4px)',
              }}
            >
              <img
                src={draft.cropDataUrl}
                alt="Cuplikan Penanda"
                style={{
                  maxHeight: '48px',
                  maxWidth: '120px',
                  objectFit: 'contain',
                  borderRadius: '3px',
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                }}
              />
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Cuplikan Area Terpilih</div>
                <div>Ukuran: {Math.round(draft.coords.width)} × {Math.round(draft.coords.height)} pt</div>
              </div>
            </div>
          )}

          {/* Tingkat Keparahan / Severity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Tingkat Keparahan (Severity)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setSeverity('kritis')}
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-6, 4px)',
                  border: `1px solid ${severity === 'kritis' ? 'var(--danger)' : 'var(--border)'}`,
                  background: severity === 'kritis' ? 'var(--danger-bg)' : 'transparent',
                  color: severity === 'kritis' ? 'var(--danger)' : 'var(--text-primary)',
                  fontSize: '11px',
                  fontWeight: severity === 'kritis' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '4px', background: 'var(--danger)' }} />
                <span>Kritis</span>
              </button>
              <button
                type="button"
                onClick={() => setSeverity('koreksi')}
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-6, 4px)',
                  border: `1px solid ${severity === 'koreksi' ? '#d83b01' : 'var(--border)'}`,
                  background: severity === 'koreksi' ? 'rgba(216, 59, 1, 0.12)' : 'transparent',
                  color: severity === 'koreksi' ? '#d83b01' : 'var(--text-primary)',
                  fontSize: '11px',
                  fontWeight: severity === 'koreksi' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#d83b01' }} />
                <span>Koreksi</span>
              </button>
              <button
                type="button"
                onClick={() => setSeverity('sesuai')}
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-6, 4px)',
                  border: `1px solid ${severity === 'sesuai' ? 'var(--success)' : 'var(--border)'}`,
                  background: severity === 'sesuai' ? 'var(--success-bg)' : 'transparent',
                  color: severity === 'sesuai' ? 'var(--success)' : 'var(--text-primary)',
                  fontSize: '11px',
                  fontWeight: severity === 'sesuai' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '4px', background: 'var(--success)' }} />
                <span>Sesuai</span>
              </button>
            </div>
          </div>

          {/* Kategori Kesalahan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Kategori Temuan
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-6, 4px)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.label}>
                  {c.label} ({c.description})
                </option>
              ))}
            </select>
          </div>

          {/* Uraian Masalah */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Uraian Masalah / Temuan
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Huruf terpotong, noda tinta blobor, atau salah harakat..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-6, 4px)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            />
          </div>

          {/* Rekomendasi / Instruksi Vendor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Instruksi Perbaikan Vendor (Surat Perintah)
            </label>
            <input
              type="text"
              placeholder="Contoh: Bersihkan plat CTP naskah halaman ini atau koreksi teks..."
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-6, 4px)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            />
          </div>

          {/* Teks Master & Teks Scan (Opsional) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                Teks Naskah Master:
              </label>
              <input
                type="text"
                placeholder="Teks acuan..."
                value={textMaster}
                onChange={(e) => setTextMaster(e.target.value)}
                style={{
                  padding: '5px 7px',
                  borderRadius: 'var(--radius-6, 4px)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                Teks Hasil Scan:
              </label>
              <input
                type="text"
                placeholder="Teks tercetak..."
                value={textScan}
                onChange={(e) => setTextScan(e.target.value)}
                style={{
                  padding: '5px 7px',
                  borderRadius: 'var(--radius-6, 4px)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                }}
              />
            </div>
          </div>

          {/* Footer Tombol Aksi */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '6px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              className="btn-workbench-action"
              style={{ padding: '6px 14px', fontSize: '11px' }}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-workbench-action primary"
              style={{
                padding: '6px 16px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <FluentSave size={12} />
              <span>Simpan Temuan #{draft.itemNumber}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
