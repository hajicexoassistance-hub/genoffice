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
  FluentBook,
  FluentCheckmark,
  FluentWarning,
  FluentChevronLeft,
  FluentChevronRight,
  FluentSplitScreen,
  FluentSparkle,
  FluentDocumentTable,
} from './TashihFluentIcons'
import { ProjectModal } from './components/ProjectModal'
import { SettingsModal } from './components/SettingsModal'
import { ExportReportModal } from './components/ExportReportModal'

interface Props {
  context: PdfPluginContext
  onClose: () => void
}

export function TashihRibbon({ context, onClose }: Props) {
  const { doc, actions, ui } = context
  const curPage = doc?.currentPage ?? 1
  const totalPages = doc?.pageCount ?? 1
  const filePath = doc?.filePath

  const [tashihData, setTashihData] = useState(() => loadTashihData(filePath))
  const [projectState, setProjectState] = useState(() => loadProjectData())

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

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

  const setStatus = (status: PageVerificationStatus) => {
    const updated = {
      ...tashihData,
      pageStatus: {
        ...tashihData.pageStatus,
        [curPage]: status,
      },
    }
    setTashihData(updated)
    saveTashihData(filePath, updated)
    const label =
      status === 'sah'
        ? 'Ditetapkan Sah / Lolos'
        : status === 'revisi'
          ? 'Ditandai Perlu Revisi'
          : 'Status Direset ke Belum'
    ui.showToast(`Halaman ${curPage}: ${label}`, 'success')
  }

  const activePreset = DOMAIN_PRESETS[projectState.metadata.domainPreset]

  return (
    <>
      {/* ── Grup 1: Manajemen Proyek & Domain Preset ──────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="rb-big"
            title="Kelola Struktur Proyek Lokal & Folder Kerja"
            onClick={() => setIsProjectModalOpen(true)}
          >
            <span className="rb-big-icon">
              <FluentFolder size={22} />
            </span>
            <span>Folder Proyek</span>
          </button>

          <button
            className="rb-big"
            title={`Domain Pentashihan: ${activePreset.title} — Klik untuk ubah domain`}
            onClick={() => setIsProjectModalOpen(true)}
          >
            <span className="rb-big-icon">
              <FluentBook size={22} />
            </span>
            <span>{activePreset.title.split(' ')[0]}</span>
          </button>
        </div>
      </div>

      <div className="ribbon-sep" />

      {/* ── Grup 2: Status Pentashihan Halaman ────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className={`rb-big${curStatus === 'sah' ? ' active' : ''}`}
            title="Tandai Halaman Ini Sah / Lolos Tashih"
            onClick={() => setStatus('sah')}
          >
            <span className="rb-big-icon">
              <FluentCheckmark size={22} color={curStatus === 'sah' ? 'var(--success)' : 'currentColor'} />
            </span>
            <span>Tandai Sah</span>
          </button>

          <button
            className={`rb-big${curStatus === 'revisi' ? ' active' : ''}`}
            title="Tandai Halaman Ini Perlu Koreksi / Revisi"
            onClick={() => setStatus('revisi')}
          >
            <span className="rb-big-icon">
              <FluentWarning size={22} color={curStatus === 'revisi' ? 'var(--danger)' : 'currentColor'} />
            </span>
            <span>Perlu Revisi</span>
          </button>
        </div>
      </div>

      <div className="ribbon-sep" />

      {/* ── Grup 3: Navigasi Naskah ───────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="rb-big"
            title="Halaman Sebelumnya"
            disabled={curPage <= 1}
            onClick={() => actions.goToPage(Math.max(1, curPage - 1))}
          >
            <span className="rb-big-icon">
              <FluentChevronLeft size={22} />
            </span>
            <span>Sebelumnya</span>
          </button>

          <button
            className="rb-big"
            title="Halaman Berikutnya"
            disabled={curPage >= totalPages}
            onClick={() => actions.goToPage(Math.min(totalPages, curPage + 1))}
          >
            <span className="rb-big-icon">
              <FluentChevronRight size={22} />
            </span>
            <span>Berikutnya</span>
          </button>
        </div>
      </div>

      <div className="ribbon-sep" />

      {/* ── Grup 4: Permukaan Kerja Pentashih (Workbench) ─────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="rb-big"
            title="Buka Mode Penelaahan Teliti Dual-Comparison (Workspace 3-Panel)"
            onClick={() => ui.openCanvasView()}
          >
            <span className="rb-big-icon">
              <FluentSplitScreen size={22} />
            </span>
            <span>Mode Teliti</span>
          </button>

          <button
            className="rb-big"
            title="Konfigurasi AI Vision (Sumopod / OpenAI API)"
            onClick={() => setIsSettingsModalOpen(true)}
          >
            <span className="rb-big-icon">
              <FluentSparkle size={22} />
            </span>
            <span>AI Vision</span>
          </button>

          <button
            className="rb-big"
            title="Buka Rekapitulasi & Surat Perintah Revisi Cetak Resmi"
            onClick={() => setIsExportModalOpen(true)}
          >
            <span className="rb-big-icon">
              <FluentDocumentTable size={22} />
            </span>
            <span>Surat Revisi</span>
          </button>
        </div>
      </div>

      {/* Dialog Modals */}
      <ProjectModal
        currentMetadata={projectState.metadata}
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onProjectLoaded={(meta) => {
          const updated = { ...projectState, metadata: meta }
          setProjectState(updated)
          saveProjectData(updated)
        }}
        showToast={ui.showToast}
        hostDocument={
          doc
            ? {
                filePath: doc.filePath,
                fileName: doc.filePath
                  ? doc.filePath.split(/[\\/]/).pop() || 'Dokumen Aktif'
                  : 'Dokumen Aktif',
                pageCount: doc.pageCount || 1,
              }
            : null
        }
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

      <ExportReportModal
        project={projectState.metadata}
        annotations={projectState.annotations}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </>
  )
}
