import React from 'react'
import type { TashihAnnotation, TashihProjectMetadata } from '../types'
import {
  FluentDocumentTable,
  FluentPrint,
  FluentDownload,
  FluentDismiss,
  FluentChevronRight,
} from '../TashihFluentIcons'

interface Props {
  project: TashihProjectMetadata
  annotations: Record<number, TashihAnnotation[]>
  isOpen: boolean
  onClose: () => void
}

export function ExportReportModal({ project, annotations, isOpen, onClose }: Props) {
  if (!isOpen) return null

  // Flatten all annotations sorted by page number
  const allList: TashihAnnotation[] = []
  Object.keys(annotations)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((pageNo) => {
      allList.push(...(annotations[pageNo] || []))
    })

  const countKritis = allList.filter((a) => a.review.severity === 'kritis').length
  const countKoreksi = allList.filter((a) => a.review.severity === 'koreksi').length
  const countSesuai = allList.filter((a) => a.review.severity === 'sesuai').length

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadCsv = () => {
    const headers = [
      'ID',
      'Halaman',
      'Vendor',
      'Severity',
      'Kategori',
      'Posisi_Master',
      'Posisi_Scan',
      'Teks Master',
      'Teks Scan',
      'Uraian / Alasan',
      'Instruksi Vendor',
      'Diverifikasi Oleh',
      'Waktu',
    ]

    const rows = allList.map((a) => {
      const posMaster = a.master_coordinates
        ? `X:${a.master_coordinates.pdf_x} Y:${a.master_coordinates.pdf_y}`
        : `X:${a.coordinates.pdf_x} Y:${a.coordinates.pdf_y}`
      const posScan = `X:${a.coordinates.pdf_x} Y:${a.coordinates.pdf_y}`

      return [
        `"${a.annotation_id}"`,
        `"${a.page_number}"`,
        `"${a.vendor}"`,
        `"${a.review.severity.toUpperCase()}"`,
        `"${a.content.error_category}"`,
        `"${posMaster}"`,
        `"${posScan}"`,
        `"${(a.content.text_master || '').replace(/"/g, '""')}"`,
        `"${(a.content.text_scan || '').replace(/"/g, '""')}"`,
        `"${(a.content.reason || '').replace(/"/g, '""')}"`,
        `"${(a.content.suggestion || '').replace(/"/g, '""')}"`,
        `"${a.review.reviewed_by}"`,
        `"${a.review.timestamp_reviewed}"`,
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Laporan_Tashih_${project.title.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="tashih-modal-backdrop" onClick={onClose}>
      <div
        className="tashih-modal-dialog"
        style={{
          width: '920px',
          maxWidth: '96vw',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action Header */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FluentDocumentTable size={18} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Surat Perintah Revisi Cetak & Rekapitulasi Tashih
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              ({allList.length} Temuan)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleDownloadCsv}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-6, 4px)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FluentDownload size={14} />
              <span>Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-6, 4px)',
                border: 'none',
                background: 'var(--accent, #c43e1c)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FluentPrint size={14} />
              <span>Cetak / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '4px',
                marginLeft: '4px',
              }}
            >
              <FluentDismiss size={16} />
            </button>
          </div>
        </div>

        {/* Printable Sheet View */}
        <div
          className="tashih-print-report"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px',
            background: 'var(--surface, #ffffff)',
            color: 'var(--text-primary, #1a1a1a)',
          }}
        >
          {/* Official Letterhead */}
          <div
            style={{
              borderBottom: '2px solid var(--border-strong, #333333)',
              paddingBottom: '14px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                SURAT PERINTAH REVISI PRACETAK (PROOF CORRECTION SHEET)
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Judul Naskah / Kitab: <b>{project.title}</b> ({project.domainPreset.toUpperCase()})
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Pentashih / Lead Editor: <b>{project.leadEditor}</b> • Tanggal:{' '}
                {new Date().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>

            {/* Summary KPIs */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-6, 4px)',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--danger)' }}>{countKritis}</div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--danger)' }}>KRITIS (REPRINT)</div>
              </div>
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-6, 4px)',
                  background: 'rgba(216, 59, 1, 0.12)',
                  border: '1px solid rgba(216, 59, 1, 0.28)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#d83b01' }}>{countKoreksi}</div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#d83b01' }}>KOREKSI MINOR</div>
              </div>
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-6, 4px)',
                  background: 'var(--success-bg)',
                  border: '1px solid var(--success-border)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>{countSesuai}</div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--success)' }}>TOLERANSI AMAN</div>
              </div>
            </div>
          </div>

          {/* Table */}
          {allList.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Tidak ada catatan revisi pada dokumen ini.
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '8px', width: '65px' }}>Hlm & ID</th>
                  <th style={{ padding: '8px', width: '130px' }}>Visual Proof</th>
                  <th style={{ padding: '8px', width: '90px' }}>Severity</th>
                  <th style={{ padding: '8px', width: '160px' }}>Teks Master vs Scan</th>
                  <th style={{ padding: '8px' }}>Uraian & Instruksi Tindakan Vendor</th>
                  <th style={{ padding: '8px', width: '90px' }}>Validasi PIC</th>
                </tr>
              </thead>
              <tbody>
                {allList.map((item, index) => (
                  <tr
                    key={item.annotation_id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: index % 2 === 0 ? 'var(--surface)' : 'var(--surface-subtle)',
                    }}
                  >
                    <td style={{ padding: '8px', fontWeight: 600 }}>
                      <div>Hal. {item.page_number}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{item.annotation_id}</div>
                    </td>
                    <td style={{ padding: '8px' }}>
                      {item.cropThumbnail ? (
                        <img
                          src={item.cropThumbnail}
                          alt="Proof"
                          style={{
                            maxWidth: '120px',
                            maxHeight: '65px',
                            border: '1px solid var(--border)',
                            borderRadius: '3px',
                            background: '#fff',
                          }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span className={`tashih-severity-badge ${item.review.severity}`}>
                        {item.review.severity.toUpperCase()}
                      </span>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        {item.content.error_category}
                      </div>
                    </td>
                    <td style={{ padding: '8px' }}>
                      {item.content.text_master && (
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Master: </span>
                          <b>{item.content.text_master}</b>
                        </div>
                      )}
                      {item.content.text_scan && (
                        <div style={{ marginTop: '2px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Scan: </span>
                          <span style={{ color: 'var(--danger)' }}>{item.content.text_scan}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ fontWeight: 500 }}>{item.content.reason}</div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '3px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <FluentChevronRight size={10} />
                        <span>{item.content.suggestion}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                      <div>{item.review.reviewed_by}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        {item.review.timestamp_reviewed.slice(0, 10)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Signature Footer */}
          <div
            style={{
              marginTop: '40px',
              display: 'flex',
              justifyContent: 'space-between',
              pageBreakInside: 'avoid',
            }}
          >
            <div style={{ width: '220px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Diverifikasi oleh (Pentashih):</div>
              <div style={{ height: '55px' }} />
              <div style={{ borderTop: '1px solid var(--border-strong, #333)', fontWeight: 600, fontSize: '12px' }}>
                {project.leadEditor}
              </div>
            </div>

            <div style={{ width: '220px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Diterima oleh (Operator Cetak):</div>
              <div style={{ height: '55px' }} />
              <div style={{ borderTop: '1px solid var(--border-strong, #333)', fontWeight: 600, fontSize: '12px' }}>
                Perwakilan Vendor Percetakan
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
