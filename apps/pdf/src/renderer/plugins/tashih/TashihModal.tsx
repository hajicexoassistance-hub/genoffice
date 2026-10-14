import React, { useEffect, useState } from 'react'
import type { PdfPluginContext } from '../types'
import { loadTashihData, saveTashihData } from './tashihStore'
import { TashihIcon } from './TashihIcon'
import { FluentDismiss, FluentCheckmark } from './TashihFluentIcons'

interface Props {
  context: PdfPluginContext
  payload?: unknown
  onClose: () => void
}

export function TashihModal({ context, onClose }: Props) {
  const { doc, ui } = context
  const filePath = doc?.filePath
  const totalPages = doc?.pageCount ?? 1

  const [tashihData, setTashihData] = useState(() => loadTashihData(filePath))
  const [pentashih, setPentashih] = useState(() => tashihData.pentashihName || 'Pentashih Mushaf')

  useEffect(() => {
    setTashihData(loadTashihData(filePath))
  }, [filePath])

  // Hitung ringkasan
  let sahCount = 0
  let revisiCount = 0
  let belumCount = 0

  for (let p = 1; p <= totalPages; p++) {
    const st = tashihData.pageStatus[p] || 'belum'
    if (st === 'sah') sahCount++
    else if (st === 'revisi') revisiCount++
    else belumCount++
  }

  const handleSavePentashih = () => {
    const updated = {
      ...tashihData,
      pentashihName: pentashih,
    }
    setTashihData(updated)
    saveTashihData(filePath, updated)
    ui.showToast('Nama pentashih berhasil disimpan', 'success')
  }

  const handleExportText = () => {
    const lines = [
      '====================================================',
      '        BERITA ACARA & REKAPITULASI PENTASHIHAN',
      '====================================================',
      `Nama Berkas : ${doc?.filePath || 'Dokumen PDF'}`,
      `Pentashih   : ${pentashih}`,
      `Tanggal     : ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`,
      '----------------------------------------------------',
      `Total Halaman   : ${totalPages}`,
      `Halaman Sah     : ${sahCount}`,
      `Perlu Revisi    : ${revisiCount}`,
      `Belum Ditashih  : ${belumCount}`,
      '----------------------------------------------------',
      'RINCIAN TEMUAN KOREKSI:',
    ]

    if (tashihData.notes.length === 0) {
      lines.push('Tidak ada catatan koreksi (Naskah Bersih).')
    } else {
      tashihData.notes.forEach((n, idx) => {
        lines.push(
          `${idx + 1}. Hlm. ${n.pageNo}${n.lineNo ? ` (Baris ${n.lineNo})` : ''} [${n.category.toUpperCase()}]: ${n.description} (${n.resolved ? 'SUDAH DIPERBAIKI' : 'BELUM DIPERBAIKI'})`,
        )
      })
    }

    lines.push('====================================================')
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Rekap-Tashih-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    ui.showToast('Berkas rekap tashih berhasil diunduh', 'success')
  }

  return (
    <div
      style={{
        width: '520px',
        maxWidth: '92vw',
        background: 'var(--surface, #ffffff)',
        borderRadius: '10px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.24)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        fontSize: '13px',
      }}
    >
      {/* Modal Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--hover, rgba(0,0,0,0.02))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '15px' }}>
          <TashihIcon size={18} color="#c43e1c" />
          <span>Berita Acara & Rekapitulasi Tashih</span>
        </div>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '16px',
            color: 'var(--text-secondary)',
            padding: '2px 6px',
          }}
          aria-label="Tutup"
        >
          <FluentDismiss size={16} />
        </button>
      </div>

      {/* Modal Body */}
      <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Identitas Pentashih */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-secondary)' }}>
            Nama Pentashih / Lembaga
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={pentashih}
              onChange={(e) => setPentashih(e.target.value)}
              placeholder="Masukkan nama pentashih..."
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '5px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '12px',
              }}
            />
            <button
              type="button"
              onClick={handleSavePentashih}
              style={{
                padding: '6px 12px',
                borderRadius: '5px',
                border: '1px solid var(--border)',
                background: 'var(--hover)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Simpan
            </button>
          </div>
        </div>

        {/* Statistik Ringkas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(16, 124, 65, 0.3)',
              background: 'rgba(16, 124, 65, 0.08)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#107c41' }}>{sahCount}</div>
            <div style={{ fontSize: '11px', color: '#107c41', fontWeight: 600 }}>Halaman Sah</div>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(196, 62, 28, 0.3)',
              background: 'rgba(196, 62, 28, 0.08)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#c43e1c' }}>{revisiCount}</div>
            <div style={{ fontSize: '11px', color: '#c43e1c', fontWeight: 600 }}>Perlu Revisi</div>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--hover)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{belumCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Belum Ditashih</div>
          </div>
        </div>

        {/* Ringkasan Temuan */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '12px', color: 'var(--text)' }}>
            Total Catatan Temuan Koreksi: {tashihData.notes.length} item
          </div>
          {tashihData.notes.length === 0 ? (
            <div style={{ color: '#107c41', padding: '10px', background: 'rgba(16, 124, 65, 0.06)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FluentCheckmark size={14} />
              <span>Tidak ada catatan koreksi yang terdaftar. Dokumen memenuhi kualifikasi rasm dan dhabth.</span>
            </div>
          ) : (
            <div
              style={{
                maxHeight: '140px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '11px',
              }}
            >
              {tashihData.notes.map((n) => (
                <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span>
                    <b>Hlm {n.pageNo}</b> {n.lineNo ? `(Br. ${n.lineNo})` : ''} [{n.category}]: {n.description}
                  </span>
                  <span style={{ color: n.resolved ? '#107c41' : '#c43e1c', flexShrink: 0 }}>
                    {n.resolved ? 'Selesai' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Footer */}
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--hover, rgba(0,0,0,0.02))',
        }}
      >
        <button
          type="button"
          onClick={handleExportText}
          style={{
            padding: '7px 14px',
            borderRadius: '5px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={14} height={14}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          <span>Unduh Rekap (.txt)</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '7px 18px',
            borderRadius: '5px',
            border: 'none',
            background: 'var(--accent, #c43e1c)',
            color: '#ffffff',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Tutup
        </button>
      </div>
    </div>
  )
}
