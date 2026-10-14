import React, { useEffect, useState } from 'react'
import type { PdfPluginContext } from '../types'
import {
  loadProjectData,
  saveProjectData,
  loadTashihData,
  saveTashihData,
  PageVerificationStatus,
} from './tashihStore'
import { DOMAIN_PRESETS } from './types'
import {
  FluentFolder,
  FluentSplitScreen,
  FluentCheckmark,
  FluentWarning,
  FluentDocumentTable,
  FluentSettings,
} from './TashihFluentIcons'
import { ExportReportModal } from './components/ExportReportModal'
import { SettingsModal } from './components/SettingsModal'

interface Props {
  context: PdfPluginContext
}

export function TashihSidebar({ context }: Props) {
  const { doc, actions, ui } = context
  const curPage = doc?.currentPage ?? 1
  const filePath = doc?.filePath

  const [tashihData, setTashihData] = useState(() => loadTashihData(filePath))
  const [projectState, setProjectState] = useState(() => loadProjectData())
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  useEffect(() => {
    setTashihData(loadTashihData(filePath))
    const handler = (e: Event) => {
      const customEv = e as CustomEvent<{ filePath: string }>
      if (!customEv.detail || customEv.detail.filePath === filePath) {
        setTashihData(loadTashihData(filePath))
      }
    }
    const projHandler = () => {
      setProjectState(loadProjectData())
    }

    window.addEventListener('genoffice:tashih-data-change', handler)
    window.addEventListener('genoffice:tashih-project-change', projHandler)
    return () => {
      window.removeEventListener('genoffice:tashih-data-change', handler)
      window.removeEventListener('genoffice:tashih-project-change', projHandler)
    }
  }, [filePath])

  const curStatus: PageVerificationStatus = tashihData.pageStatus[curPage] || 'belum'
  const currentAnnots = projectState.annotations[curPage] || []

  // Hitung total seluruh dokumen
  let totalKritis = 0
  let totalKoreksi = 0
  let totalSesuai = 0

  Object.values(projectState.annotations).forEach((list) => {
    list.forEach((a) => {
      if (a.review.severity === 'kritis') totalKritis++
      else if (a.review.severity === 'koreksi') totalKoreksi++
      else totalSesuai++
    })
  })

  const handleSetStatus = (newStatus: PageVerificationStatus) => {
    const updated = {
      ...tashihData,
      pageStatus: {
        ...tashihData.pageStatus,
        [curPage]: newStatus,
      },
    }
    setTashihData(updated)
    saveTashihData(filePath, updated)
    const label =
      newStatus === 'sah'
        ? 'Ditetapkan Sah / Lolos Tashih'
        : newStatus === 'revisi'
          ? 'Perlu Revisi'
          : 'Belum Ditashih'
    ui.showToast(`Halaman ${curPage}: ${label}`, 'success')
  }

  const activePreset = DOMAIN_PRESETS[projectState.metadata.domainPreset]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
      {/* ── Ringkasan Proyek & Domain (Fluent Card) ──────────────── */}
      <div
        style={{
          padding: '12px',
          borderRadius: 'var(--radius-8, 8px)',
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <FluentFolder size={16} />
            <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
              {projectState.metadata.title}
            </span>
          </div>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-6, 4px)',
              background: 'var(--accent, #c43e1c)',
              color: '#ffffff',
              fontWeight: 600,
            }}
          >
            {activePreset.title.split(' ')[0]}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          PIC: <b>{projectState.metadata.leadEditor}</b>
        </div>
      </div>

      {/* ── Tombol Utama: Buka Workbench Mode Teliti (Fluent Accent Button) ── */}
      <button
        type="button"
        onClick={() => ui.openCanvasView()}
        style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-6, 6px)',
          border: 'none',
          background: 'var(--accent, #c43e1c)',
          color: '#ffffff',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '12px',
          transition: 'all var(--transition-fast, 0.15s ease)',
          boxShadow: 'var(--shadow-btn-hover)',
        }}
      >
        <FluentSplitScreen size={16} />
        <span>Buka Mode Teliti (Workbench 3-Panel)</span>
      </button>

      {/* ── Status Halaman Aktif (Fluent Card) ────────────────────── */}
      <div
        style={{
          padding: '12px',
          borderRadius: 'var(--radius-8, 8px)',
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
            <span>Status Hal. {curPage}</span>
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-6, 4px)',
              fontWeight: 600,
              background:
                curStatus === 'sah'
                  ? 'var(--success-bg)'
                  : curStatus === 'revisi'
                    ? 'var(--danger-bg)'
                    : 'var(--hover)',
              color:
                curStatus === 'sah'
                  ? 'var(--success)'
                  : curStatus === 'revisi'
                    ? 'var(--danger)'
                    : 'var(--text-secondary)',
              border: `1px solid ${
                curStatus === 'sah'
                  ? 'var(--success-border)'
                  : curStatus === 'revisi'
                    ? 'var(--danger-border)'
                    : 'var(--border)'
              }`,
            }}
          >
            {curStatus === 'sah' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <FluentCheckmark size={12} /> Sah
              </span>
            ) : curStatus === 'revisi' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <FluentWarning size={12} /> Perlu Koreksi
              </span>
            ) : (
              'Belum Ditashih'
            )}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => handleSetStatus('belum')}
            style={{
              padding: '6px 4px',
              fontSize: '11px',
              borderRadius: 'var(--radius-6, 4px)',
              border: `1px solid ${curStatus === 'belum' ? 'var(--border-strong)' : 'var(--border)'}`,
              background: curStatus === 'belum' ? 'var(--hover)' : 'transparent',
              fontWeight: curStatus === 'belum' ? 600 : 400,
              cursor: 'pointer',
              color: 'var(--text)',
            }}
          >
            Belum
          </button>
          <button
            type="button"
            onClick={() => handleSetStatus('revisi')}
            style={{
              padding: '6px 4px',
              fontSize: '11px',
              borderRadius: 'var(--radius-6, 4px)',
              border: `1px solid ${curStatus === 'revisi' ? 'var(--danger-border)' : 'var(--border)'}`,
              background: curStatus === 'revisi' ? 'var(--danger-bg)' : 'transparent',
              fontWeight: curStatus === 'revisi' ? 600 : 400,
              cursor: 'pointer',
              color: curStatus === 'revisi' ? 'var(--danger)' : 'var(--text)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <FluentWarning size={12} />
            <span>Revisi</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetStatus('sah')}
            style={{
              padding: '6px 4px',
              fontSize: '11px',
              borderRadius: 'var(--radius-6, 4px)',
              border: `1px solid ${curStatus === 'sah' ? 'var(--success-border)' : 'var(--border)'}`,
              background: curStatus === 'sah' ? 'var(--success-bg)' : 'transparent',
              fontWeight: curStatus === 'sah' ? 600 : 400,
              cursor: 'pointer',
              color: curStatus === 'sah' ? 'var(--success)' : 'var(--text)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <FluentCheckmark size={12} />
            <span>Sah</span>
          </button>
        </div>
      </div>

      {/* ── Ringkasan Severity Dokumen (Fluent Metrics) ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        <div
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-6, 6px)',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--danger)' }}>{totalKritis}</div>
          <div style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 600 }}>KRITIS</div>
        </div>

        <div
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-6, 6px)',
            background: 'rgba(216, 59, 1, 0.12)',
            border: '1px solid rgba(216, 59, 1, 0.28)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#d83b01' }}>{totalKoreksi}</div>
          <div style={{ fontSize: '10px', color: '#d83b01', fontWeight: 600 }}>KOREKSI</div>
        </div>

        <div
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-6, 6px)',
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>{totalSesuai}</div>
          <div style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 600 }}>SESUAI</div>
        </div>
      </div>

      {/* ── Temuan di Halaman Aktif ───────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
            fontSize: '12px',
            color: 'var(--text-primary)',
          }}
        >
          <span>Temuan Hal. {curPage} ({currentAnnots.length})</span>
        </div>

        {currentAnnots.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-6, 6px)',
              background: 'var(--surface-subtle)',
            }}
          >
            Belum ada temuan di halaman ini. Buka <b>Mode Teliti</b> untuk menjalankan Pixel Diff / Vision AI.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {currentAnnots.map((item) => (
              <div
                key={item.annotation_id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-6, 6px)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    className={`tashih-severity-badge ${item.review.severity}`}
                    style={{ fontSize: '9px', padding: '1px 6px' }}
                  >
                    {item.review.severity.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                    {item.content.error_category}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {item.content.reason}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tombol Laporan & AI ─────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-6, 6px)',
            border: '1px solid var(--border)',
            background: 'var(--surface-subtle)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          <FluentDocumentTable size={16} />
          <span>Surat Perintah Revisi (Cetak / CSV)</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSettingsModalOpen(true)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-6, 6px)',
            border: '1px solid var(--border)',
            background: 'var(--surface-subtle)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          <FluentSettings size={16} />
          <span>Pengaturan AI (Sumopod API)</span>
        </button>
      </div>

      {/* Modals */}
      <ExportReportModal
        project={projectState.metadata}
        annotations={projectState.annotations}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <SettingsModal
        settings={projectState.metadata.aiSettings}
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={(newSettings) => {
          const updated = {
            ...projectState,
            metadata: { ...projectState.metadata, aiSettings: newSettings },
          }
          setProjectState(updated)
          saveProjectData(updated)
        }}
      />
    </div>
  )
}

export function TashihSidebarHeaderActions({ context }: Props) {
  return (
    <>
      <button
        type="button"
        className="ai-header-btn"
        onClick={() => context.ui.openCanvasView()}
        title="Buka Mode Teliti Tashih (Workbench 3-Panel)"
        aria-label="Workbench Tashih"
      >
        <FluentSplitScreen size={16} />
      </button>
    </>
  )
}
