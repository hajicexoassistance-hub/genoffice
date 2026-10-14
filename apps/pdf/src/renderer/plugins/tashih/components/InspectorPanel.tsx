import React, { useState } from 'react'
import type {
  AnnotationContent,
  DomainPreset,
  SeverityLevel,
  TashihAnnotation,
} from '../types'
import { DOMAIN_PRESETS } from '../types'
import {
  FluentFlash,
  FluentSparkle,
  FluentAdd,
  FluentCheckmark,
  FluentWarning,
  FluentErrorCircle,
  FluentDelete,
  FluentLink,
  FluentTarget,
  FluentUnlink,
  FluentBroom,
  FluentDocumentPdf,
  FluentPrint,
  FluentDismiss,
} from '../TashihFluentIcons'

interface Props {
  domainPreset: DomainPreset
  currentPage: number
  activeVendorName: string
  activeVendorId?: string
  vendors?: import('../types').VendorFileEntry[]
  onSwitchActiveVendor?: (vendorId: string) => void
  annotations: TashihAnnotation[]
  selectedAnnotationId: string | null
  onSelectAnnotation: (id: string | null) => void
  onAddAnnotation: (content: AnnotationContent, severity: SeverityLevel) => void
  onUpdateReview: (
    id: string,
    severity: SeverityLevel,
    status: 'disetujui' | 'revisi' | 'ditolak'
  ) => void
  onDeleteAnnotation: (id: string) => void
  onResetMasterCoordinates?: (id: string) => void
  onMirrorCoordinates?: (id: string) => void
  onClearSingleTarget?: (id: string, target: 'master' | 'scan') => void
  onClearPageAnnotations?: () => void
  onRunPixelDiff: () => void
  onRunVisionAi: () => void
  isAiLoading: boolean
}

export function InspectorPanel({
  domainPreset,
  currentPage,
  activeVendorName,
  activeVendorId,
  vendors,
  onSwitchActiveVendor,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onAddAnnotation,
  onUpdateReview,
  onDeleteAnnotation,
  onResetMasterCoordinates,
  onMirrorCoordinates,
  onClearSingleTarget,
  onClearPageAnnotations,
  onRunPixelDiff,
  onRunVisionAi,
  isAiLoading,
}: Props) {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list')
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'all'>('all')
  const [completenessFilter, setCompletenessFilter] = useState<'all' | 'pending' | 'complete'>('all')

  // Form State
  const categories = DOMAIN_PRESETS[domainPreset].categories
  const [category, setCategory] = useState(categories[0]?.label || 'Umum')
  const [textMaster, setTextMaster] = useState('')
  const [textScan, setTextScan] = useState('')
  const [reason, setReason] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [severity, setSeverity] = useState<SeverityLevel>('kritis')

  const pendingCount = annotations.filter(
    (a) => a.marking_status === 'pending_master' || a.marking_status === 'pending_scan'
  ).length
  const completeCount = annotations.filter(
    (a) => !a.marking_status || a.marking_status === 'complete'
  ).length

  const filteredAnnotations = annotations.filter((a) => {
    if (severityFilter !== 'all' && a.review.severity !== severityFilter) return false
    if (completenessFilter === 'pending') {
      return a.marking_status === 'pending_master' || a.marking_status === 'pending_scan'
    }
    if (completenessFilter === 'complete') {
      return !a.marking_status || a.marking_status === 'complete'
    }
    return true
  })

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return

    onAddAnnotation(
      {
        text_master: textMaster.trim() || undefined,
        text_scan: textScan.trim() || undefined,
        error_category: category,
        reason: reason.trim(),
        suggestion: suggestion.trim() || 'Periksa naskah pada area ini.',
      },
      severity
    )

    setTextMaster('')
    setTextScan('')
    setReason('')
    setSuggestion('')
    setActiveTab('list')
  }

  return (
    <div className="tashih-panel inspector-pane">
      {/* Panel Header */}
      <div className="tashih-panel-header" style={{ height: '38px', padding: '0 8px' }}>
        <div style={{ display: 'flex', gap: '3px' }}>
          <button
            type="button"
            className={`tashih-vendor-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
            title="Daftar temuan audit pada halaman aktif"
            style={{ padding: '3px 8px', fontSize: '11px' }}
          >
            Temuan ({annotations.length})
          </button>
          <button
            type="button"
            className={`tashih-vendor-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
            title="Tambah catatan temuan manual"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', fontSize: '11px' }}
          >
            <FluentAdd size={12} />
            <span>Catatan Baru</span>
          </button>
        </div>

        {/* Clear All on Page Button */}
        {onClearPageAnnotations && (
          <button
            type="button"
            onClick={() => {
              if (annotations.length === 0) return
              if (window.confirm(`Hapus seluruh ${annotations.length} temuan pada halaman ${currentPage}?`)) {
                onClearPageAnnotations()
              }
            }}
            disabled={annotations.length === 0}
            style={{
              border: 'none',
              background: 'transparent',
              color: annotations.length > 0 ? 'var(--text-secondary)' : 'var(--border)',
              fontSize: '10px',
              cursor: annotations.length > 0 ? 'pointer' : 'default',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 5px',
            }}
            title="Bersihkan seluruh penandaan dan temuan pada halaman ini"
          >
            <FluentBroom size={11} />
            <span>Clear Halaman</span>
          </button>
        )}
      </div>

      {/* Quick Actions (Run Diff / Run AI) */}
      <div
        style={{
          padding: '6px 10px',
          background: 'var(--surface-subtle)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: '6px',
        }}
      >
        <button
          type="button"
          onClick={onRunPixelDiff}
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: 'var(--radius-6, 4px)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
          title="Pixel Diff: Deteksi perbedaan visual naskah secara lokal di komputer (100% offline, zero-token)"
        >
          <FluentFlash size={13} />
          <span>Pixel Diff</span>
        </button>

        <button
          type="button"
          disabled={isAiLoading}
          onClick={onRunVisionAi}
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: 'var(--radius-6, 4px)',
            border: 'none',
            background: isAiLoading ? 'var(--hover)' : 'var(--accent, #c43e1c)',
            color: isAiLoading ? 'var(--text-secondary)' : '#ffffff',
            fontSize: '11px',
            fontWeight: 600,
            cursor: isAiLoading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
          title="Run Vision AI: Analisis komparatif teks master vs scan via API Sumopod"
        >
          <FluentSparkle size={13} />
          <span>{isAiLoading ? 'Menganalisis...' : 'Vision AI'}</span>
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'list' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Filter Segmented Pills (Compact) */}
          <div
            style={{
              padding: '3px 8px',
              display: 'flex',
              gap: '2px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface-subtle)',
              alignItems: 'center',
              overflowX: 'auto',
            }}
          >
            <button
              type="button"
              onClick={() => setCompletenessFilter('all')}
              style={{
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: completenessFilter === 'all' ? 600 : 500,
                borderRadius: 'var(--radius-6, 3px)',
                border: `1px solid ${completenessFilter === 'all' ? 'var(--border-strong)' : 'transparent'}`,
                background: completenessFilter === 'all' ? 'var(--active-bg)' : 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Semua ({annotations.length})
            </button>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => setCompletenessFilter('pending')}
                style={{
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: completenessFilter === 'pending' ? 600 : 500,
                  borderRadius: 'var(--radius-6, 3px)',
                  border: `1px solid ${completenessFilter === 'pending' ? '#d83b01' : 'transparent'}`,
                  background: completenessFilter === 'pending' ? 'rgba(216, 59, 1, 0.12)' : 'transparent',
                  color: '#d83b01',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  whiteSpace: 'nowrap',
                }}
                title="Tampilkan hanya temuan yang belum lengkap ditandai di kedua dokumen"
              >
                <FluentWarning size={10} color="#d83b01" />
                <span>Perlu Pasangan ({pendingCount})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setCompletenessFilter('complete')}
              style={{
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: completenessFilter === 'complete' ? 600 : 500,
                borderRadius: 'var(--radius-6, 3px)',
                border: `1px solid ${completenessFilter === 'complete' ? 'var(--success-border)' : 'transparent'}`,
                background: completenessFilter === 'complete' ? 'var(--success-bg)' : 'transparent',
                color: 'var(--success)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Lengkap ({completeCount})
            </button>
          </div>

          <div
            style={{
              padding: '2px 8px',
              display: 'flex',
              gap: '2px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface-subtle)',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '9px', color: 'var(--text-secondary)', marginRight: '2px' }}>Severity:</span>
            {(['all', 'kritis', 'koreksi', 'sesuai'] as const).map((sev) => {
              const isActive = severityFilter === sev
              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  title={`Filter temuan tingkat ${sev}`}
                  style={{
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-6, 3px)',
                    border: `1px solid ${isActive ? 'var(--border-strong)' : 'transparent'}`,
                    background: isActive ? 'var(--active-bg)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: '9px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {sev === 'all' ? 'Semua' : sev}
                </button>
              )
            })}
          </div>

          {/* List of Annotations */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'var(--surface)',
            }}
          >
            {filteredAnnotations.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  textAlign: 'center',
                  padding: '24px',
                }}
              >
                <span>Belum ada temuan di halaman ini.</span>
                <span style={{ fontSize: '10px', marginTop: '4px' }}>
                  Drag di atas Scan atau Master untuk membuat kotak anotasi.
                </span>
              </div>
            ) : (
              filteredAnnotations.map((item, index) => {
                const itemNo = item.item_number || (index + 1)
                const isSelected = selectedAnnotationId === item.annotation_id
                const hasDistinctMaster = Boolean(item.master_coordinates)
                const isPendingMaster = item.marking_status === 'pending_master'
                const isPendingScan = item.marking_status === 'pending_scan'

                return (
                  <div
                    key={item.annotation_id}
                    className={`tashih-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectAnnotation(item.annotation_id)}
                    style={{
                      padding: '8px 10px',
                      gap: '6px',
                      borderLeftWidth: '3px',
                      borderLeftColor:
                        item.review.severity === 'kritis'
                          ? 'var(--danger)'
                          : item.review.severity === 'koreksi'
                          ? '#d83b01'
                          : 'var(--success)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span
                          style={{
                            minWidth: '20px',
                            height: '20px',
                            borderRadius: '10px',
                            background:
                              item.review.severity === 'kritis'
                                ? 'var(--danger)'
                                : item.review.severity === 'koreksi'
                                ? '#d83b01'
                                : 'var(--success)',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 4px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }}
                          title={`Temuan #${itemNo} (ID: ${item.annotation_id})`}
                        >
                          #{itemNo}
                        </span>
                        <span className={`tashih-severity-badge ${item.review.severity}`}>
                          {item.review.severity}
                        </span>
                      </div>
                      <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                        {item.marked_by} • {item.content.error_category}
                      </span>
                    </div>

                    {/* Dual Coordinates Position / Pending Warning Chip */}
                    {isPendingMaster ? (
                      <div
                        style={{
                          padding: '5px 7px',
                          borderRadius: 'var(--radius-6, 4px)',
                          background: 'rgba(216, 59, 1, 0.08)',
                          border: '1px solid rgba(216, 59, 1, 0.28)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              color: '#d83b01',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <FluentWarning size={11} color="#d83b01" />
                            <span>Perlu di Master</span>
                          </span>
                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                            Scan: {item.coordinates.pdf_x},{item.coordinates.pdf_y}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectAnnotation(item.annotation_id)
                            }}
                            style={{
                              flex: 1,
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-6, 3px)',
                              border: '1px solid #d83b01',
                              background: 'var(--surface)',
                              color: '#d83b01',
                              fontSize: '9px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                            }}
                            title="Pilih anotasi ini lalu drag di panel Master untuk menandai teks aslinya"
                          >
                            <FluentTarget size={10} />
                            <span>Tandai di Master</span>
                          </button>
                          {onMirrorCoordinates && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onMirrorCoordinates(item.annotation_id)
                              }}
                              style={{
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-6, 3px)',
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                color: 'var(--text-secondary)',
                                fontSize: '9px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                              }}
                              title="Jika posisi di Master sejajar persis dengan Scan, samakan posisi tanpa perlu drag"
                            >
                              <FluentLink size={10} />
                              <span>Samakan</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : isPendingScan ? (
                      <div
                        style={{
                          padding: '5px 7px',
                          borderRadius: 'var(--radius-6, 4px)',
                          background: 'rgba(216, 59, 1, 0.08)',
                          border: '1px solid rgba(216, 59, 1, 0.28)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              color: '#d83b01',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <FluentWarning size={11} color="#d83b01" />
                            <span>Perlu di Scan</span>
                          </span>
                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                            Master: {item.master_coordinates?.pdf_x},{item.master_coordinates?.pdf_y}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectAnnotation(item.annotation_id)
                            }}
                            style={{
                              flex: 1,
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-6, 3px)',
                              border: '1px solid #d83b01',
                              background: 'var(--surface)',
                              color: '#d83b01',
                              fontSize: '9px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                            }}
                            title="Pilih anotasi ini lalu drag di panel Scan untuk menandai teks hasil cetak"
                          >
                            <FluentTarget size={10} />
                            <span>Tandai di Scan</span>
                          </button>
                          {onMirrorCoordinates && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onMirrorCoordinates(item.annotation_id)
                              }}
                              style={{
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-6, 3px)',
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                color: 'var(--text-secondary)',
                                fontSize: '9px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                              }}
                              title="Jika posisi di Scan sejajar persis dengan Master, samakan posisi tanpa perlu drag"
                            >
                              <FluentLink size={10} />
                              <span>Samakan</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: '10px',
                          padding: '3px 6px',
                          borderRadius: 'var(--radius-6, 3px)',
                          background: 'var(--surface-subtle)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                        title={
                          hasDistinctMaster
                            ? `Teks ini terhubung pada posisi berbeda:
Master: (${item.master_coordinates?.pdf_x}, ${item.master_coordinates?.pdf_y})
Scan: (${item.coordinates.pdf_x}, ${item.coordinates.pdf_y})`
                            : `Posisi di Scan: (${item.coordinates.pdf_x}, ${item.coordinates.pdf_y}). Drag di Master untuk memindahkan kotak Master secara independen.`
                        }
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <FluentLink size={11} color="var(--text-secondary)" />
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {hasDistinctMaster ? (
                              <span>
                                M: <b>{item.master_coordinates?.pdf_x},{item.master_coordinates?.pdf_y}</b> ↔ S: <b>{item.coordinates.pdf_x},{item.coordinates.pdf_y}</b>
                              </span>
                            ) : (
                              <span>Posisi Scan: <b>{item.coordinates.pdf_x},{item.coordinates.pdf_y}</b></span>
                            )}
                          </span>
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectAnnotation(item.annotation_id)
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--accent, #c43e1c)',
                              fontSize: '9px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                            title="Klik untuk memilih anotasi ini, lalu drag di Master layout untuk menandai letak teks aslinya"
                          >
                            <FluentTarget size={10} />
                            <span>{hasDistinctMaster ? 'Re-link' : 'Set Master'}</span>
                          </button>

                          {hasDistinctMaster && onClearSingleTarget && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onClearSingleTarget(item.annotation_id, 'master')
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: '9px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                              }}
                              title="Clear tanda di Master: Hapus kotak koordinat Master saja (Scan tetap ada)"
                            >
                              <FluentUnlink size={10} />
                              <span>Clear M</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Dual Visual Proof Highlight (Master vs Scan) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        background: 'var(--surface-subtle)',
                        padding: '4px',
                        borderRadius: 'var(--radius-6, 4px)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {/* Cuplikan Master */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          overflow: 'hidden',
                        }}
                        title={
                          item.master_coordinates
                            ? `Naskah Master: (${item.master_coordinates.pdf_x}, ${item.master_coordinates.pdf_y}) [${item.master_coordinates.width} × ${item.master_coordinates.height} pt]`
                            : 'Naskah Master: Belum ditandai'
                        }
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '9px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <FluentDocumentPdf size={10} /> Master
                          </span>
                          {item.master_coordinates && (
                            <span style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>
                              {Math.round(item.master_coordinates.pdf_x)},{Math.round(item.master_coordinates.pdf_y)}
                            </span>
                          )}
                        </div>
                        {item.cropThumbnailMaster ? (
                          <img
                            src={item.cropThumbnailMaster}
                            alt="Master Visual Proof"
                            className="tashih-crop-preview"
                            style={{
                              width: '100%',
                              height: '56px',
                              objectFit: 'contain',
                              background: '#ffffff',
                              borderRadius: '3px',
                              border: '1px solid var(--border)',
                            }}
                          />
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectAnnotation(item.annotation_id)
                            }}
                            style={{
                              height: '56px',
                              border: '1px dashed var(--border-strong)',
                              borderRadius: '3px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9px',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              background: 'var(--surface)',
                            }}
                            title="Klik lalu tarik kotak di panel Master untuk mengambil cuplikan naskah asli"
                          >
                            <FluentTarget size={12} color="#0078d4" />
                            <span style={{ marginTop: '2px' }}>Tandai Master</span>
                          </div>
                        )}
                      </div>

                      {/* Cuplikan Scan */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          overflow: 'hidden',
                        }}
                        title={
                          item.coordinates
                            ? `Naskah Scan: (${item.coordinates.pdf_x}, ${item.coordinates.pdf_y}) [${item.coordinates.width} × ${item.coordinates.height} pt]`
                            : 'Naskah Scan: Belum ditandai'
                        }
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '9px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <FluentPrint size={10} /> {activeVendorName || 'Scan'}
                          </span>
                          {item.coordinates && (
                            <span style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>
                              {Math.round(item.coordinates.pdf_x)},{Math.round(item.coordinates.pdf_y)}
                            </span>
                          )}
                        </div>

                        {/* Multi-Vendor Tabs Switcher jika proyek punya lebih dari 1 vendor */}
                        {vendors && vendors.length > 1 && onSwitchActiveVendor && (
                          <div style={{ display: 'flex', gap: '2px', overflowX: 'auto', paddingBottom: '2px' }}>
                            {vendors.map((v) => {
                              const isCurrent = (activeVendorId || activeVendorName) === v.id || activeVendorName === v.name
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onSwitchActiveVendor(v.id)
                                  }}
                                  style={{
                                    fontSize: '8px',
                                    padding: '1px 4px',
                                    borderRadius: '2px',
                                    border: `1px solid ${isCurrent ? 'var(--accent, #c43e1c)' : 'var(--border)'}`,
                                    background: isCurrent ? 'var(--accent, #c43e1c)' : 'var(--surface)',
                                    color: isCurrent ? '#ffffff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    fontWeight: isCurrent ? 700 : 400,
                                  }}
                                  title={`Beralih ke vendor ${v.name}`}
                                >
                                  {v.name}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {((activeVendorId && item.vendor_crops?.[activeVendorId]) || item.cropThumbnailScan || item.cropThumbnail) ? (
                          <img
                            src={(activeVendorId && item.vendor_crops?.[activeVendorId]) || item.cropThumbnailScan || item.cropThumbnail}
                            alt="Scan Visual Proof"
                            className="tashih-crop-preview"
                            style={{
                              width: '100%',
                              height: '56px',
                              objectFit: 'contain',
                              background: '#ffffff',
                              borderRadius: '3px',
                              border: '1px solid var(--border)',
                            }}
                          />
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectAnnotation(item.annotation_id)
                            }}
                            style={{
                              height: '56px',
                              border: '1px dashed var(--border-strong)',
                              borderRadius: '3px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9px',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              background: 'var(--surface)',
                            }}
                            title="Klik lalu tarik kotak di panel Scan untuk mengambil cuplikan naskah cetak"
                          >
                            <FluentTarget size={12} color="#d83b01" />
                            <span style={{ marginTop: '2px' }}>Tandai Scan</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ringkasan Uraian & Instruksi (Hover to Know) */}
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'help',
                        padding: '1px 0',
                      }}
                      title={`Uraian: ${item.content.reason || item.content.error_category}\n\nInstruksi Operator: ${item.content.suggestion || '-'}${
                        item.content.text_master || item.content.text_scan
                          ? `\n\nNaskah Master: ${item.content.text_master || '-'}\nNaskah Scan: ${item.content.text_scan || '-'}`
                          : ''
                      }`}
                    >
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {item.content.reason || item.content.error_category}
                      </span>
                      {item.content.suggestion && (
                        <span style={{ color: 'var(--text-muted)' }}> — {item.content.suggestion}</span>
                      )}
                    </div>

                    {/* Compact Icon Action Buttons (Hover-to-Know) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '4px',
                        borderTop: '1px solid var(--border)',
                        marginTop: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdateReview(item.annotation_id, 'sesuai', 'disetujui')
                          }}
                          style={{
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-6, 3px)',
                            border: '1px solid var(--success-border)',
                            background: item.review.severity === 'sesuai' ? 'var(--success-bg)' : 'transparent',
                            color: 'var(--success)',
                            fontSize: '9px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                          title="Tandai aman / toleransi editorial"
                        >
                          <FluentCheckmark size={10} />
                          <span>Sesuai</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdateReview(item.annotation_id, 'koreksi', 'revisi')
                          }}
                          style={{
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-6, 3px)',
                            border: '1px solid rgba(216, 59, 1, 0.3)',
                            background: item.review.severity === 'koreksi' ? 'rgba(216, 59, 1, 0.12)' : 'transparent',
                            color: '#d83b01',
                            fontSize: '9px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                          title="Tandai koreksi minor plat cetak"
                        >
                          <FluentWarning size={10} />
                          <span>Koreksi</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdateReview(item.annotation_id, 'kritis', 'revisi')
                          }}
                          style={{
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-6, 3px)',
                            border: '1px solid var(--danger-border)',
                            background: item.review.severity === 'kritis' ? 'var(--danger-bg)' : 'transparent',
                            color: 'var(--danger)',
                            fontSize: '9px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                          title="Tandai cacat kritis (wajib reprint)"
                        >
                          <FluentErrorCircle size={10} />
                          <span>Kritis</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteAnnotation(item.annotation_id)
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Hapus temuan ini dari catatan audit"
                      >
                        <FluentDelete size={13} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        /* Form Manual Create */
        <form
          onSubmit={handleSubmitManual}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'var(--surface)',
          }}
        >
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Kategori Kesalahan</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                marginTop: '3px',
                padding: '5px 8px',
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

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Severity</label>
            <div style={{ display: 'flex', gap: '4px', marginTop: '3px' }}>
              {(['kritis', 'koreksi', 'sesuai'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  style={{
                    flex: 1,
                    padding: '5px',
                    borderRadius: 'var(--radius-6, 4px)',
                    border: `1px solid ${
                      severity === s
                        ? s === 'kritis'
                          ? 'var(--danger-border)'
                          : s === 'koreksi'
                          ? 'rgba(216,59,1,0.3)'
                          : 'var(--success-border)'
                        : 'var(--border)'
                    }`,
                    background:
                      severity === s
                        ? s === 'kritis'
                          ? 'var(--danger-bg)'
                          : s === 'koreksi'
                          ? 'rgba(216,59,1,0.12)'
                          : 'var(--success-bg)'
                        : 'transparent',
                    color:
                      s === 'kritis'
                        ? 'var(--danger)'
                        : s === 'koreksi'
                        ? '#d83b01'
                        : 'var(--success)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Teks Naskah Master</label>
            <input
              type="text"
              placeholder="Lafadz yang seharusnya..."
              value={textMaster}
              onChange={(e) => setTextMaster(e.target.value)}
              style={{
                width: '100%',
                marginTop: '3px',
                padding: '5px 8px',
                borderRadius: 'var(--radius-6, 4px)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Teks Hasil Scan</label>
            <input
              type="text"
              placeholder="Hasil cetak yang keliru..."
              value={textScan}
              onChange={(e) => setTextScan(e.target.value)}
              style={{
                width: '100%',
                marginTop: '3px',
                padding: '5px 8px',
                borderRadius: 'var(--radius-6, 4px)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Uraian Kesalahan & Alasan</label>
            <textarea
              required
              rows={2}
              placeholder="Detail temuan perbedaan atau cacat cetak..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                marginTop: '3px',
                padding: '5px 8px',
                borderRadius: 'var(--radius-6, 4px)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Instruksi Vendor</label>
            <textarea
              rows={2}
              placeholder="Instruksi koreksi untuk operator percetakan..."
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              style={{
                width: '100%',
                marginTop: '3px',
                padding: '5px 8px',
                borderRadius: 'var(--radius-6, 4px)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: '7px',
              borderRadius: 'var(--radius-6, 4px)',
              border: 'none',
              background: 'var(--accent, #c43e1c)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '11px',
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            Simpan Anotasi
          </button>
        </form>
      )}
    </div>
  )
}
