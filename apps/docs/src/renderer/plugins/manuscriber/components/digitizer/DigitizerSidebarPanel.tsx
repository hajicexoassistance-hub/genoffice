import React, { useState, useRef } from 'react'
import type { DocxPluginContext } from '../../../types'
import type { DigitizerLanguageProfile, PageGeometrySpec } from '../../types'
import { useManuscriberPluginStore } from '../../store/manuscriberPluginStore'
import { useDigitizerStore, digitizerStore } from '../../store/digitizerStore'
import { capturePdfPageAsDataUrl } from '../../services/visionService'
import { loadPdfDocumentFromBuffer } from '../../services/pdfService'
import {
  LANGUAGE_LABELS,
  detectPageGeometryPass1,
  extractBlocksPass2,
  runLinguisticTahqiqPass3,
  compileToDocxHtml,
} from '../../services/digitizerPipelineService'
import {
  IconManuscript,
  IconSparkles,
  IconRefresh,
  IconApplyWord,
  IconCheck,
  IconDocument,
  IconFolderOpen,
} from '../icons/ManuscriberIcons'

interface DigitizerSidebarPanelProps {
  context: DocxPluginContext
  onSwitchToPdf: () => void
}

export const DigitizerSidebarPanel: React.FC<DigitizerSidebarPanelProps> = ({
  context,
  onSwitchToPdf,
}) => {
  const pluginStore = useManuscriberPluginStore()
  const digitizer = useDigitizerStore()

  const { pdfDocument, totalPages: pluginTotalPages } = pluginStore
  const totalPages = Math.max(1, pluginTotalPages || 1)
  const currentPage = digitizer.currentPage
  const pageData = digitizerStore.getOrCreatePageData(currentPage)

  const [isLoading, setIsLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load user's real PDF directly into store
  const handleOpenPdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      context.ui.showToast(`Memuat naskah "${file.name}"...`, 'info')
      const buffer = await file.arrayBuffer()
      pluginStore.setPdfFileName(file.name)
      pluginStore.setPdfBytes(buffer)
      const pdfDoc = await loadPdfDocumentFromBuffer(buffer)
      pluginStore.setPdfDocument(pdfDoc)
      pluginStore.setTotalPages(pdfDoc.numPages)
      pluginStore.setCurrentPage(1)
      digitizerStore.setState({ currentPage: 1, selectedBlockId: null })
      context.ui.showToast(`Naskah "${file.name}" (${pdfDoc.numPages} hal) berhasil dimuat!`, 'success')
    } catch (err: any) {
      console.error('Failed to load PDF in digitizer:', err)
      context.ui.showToast(`Gagal memuat PDF: ${err?.message || err}`, 'error')
    } finally {
      e.target.value = ''
    }
  }

  // Helper to capture real image from active PDF page
  const getActivePageDataUrl = async (): Promise<string | null> => {
    if (pdfDocument) {
      try {
        return await capturePdfPageAsDataUrl(pdfDocument, currentPage, 2.0)
      } catch (e) {
        console.warn('Failed to capture PDF page for digitizer:', e)
      }
    }
    return null
  }

  // 1. Run Pass 1 & 2: Geometry & OCR from REAL PDF
  const handleRunPass1And2 = async () => {
    if (!pdfDocument) {
      context.ui.showToast('Silakan pilih berkas PDF naskah asli Anda terlebih dahulu.', 'error')
      fileInputRef.current?.click()
      return
    }

    setIsLoading(true)
    setLoadingMsg('Mendeteksi Geometri (Pass 1)...')
    digitizerStore.updatePageData(currentPage, { status: 'layout_detecting' })

    try {
      const dataUrl = await getActivePageDataUrl()
      if (!dataUrl) {
        throw new Error(`Tidak dapat membaca citra Halaman ${currentPage} dari berkas PDF.`)
      }

      const geometry = await detectPageGeometryPass1(dataUrl, pageData.language)
      digitizerStore.updatePageData(currentPage, {
        geometry,
        status: 'ocr_extracting',
      })

      setLoadingMsg('Mengekstrak Blok Teks Nyata dari PDF (Pass 2)...')
      const blocks = await extractBlocksPass2(dataUrl, geometry, pageData.language, currentPage)
      digitizerStore.updatePageData(currentPage, {
        blocks,
        status: 'idle',
      })

      context.ui.showToast(
        `Berhasil mengekstrak ${blocks.length} blok teks dari Halaman ${currentPage} naskah Anda!`,
        'success'
      )
    } catch (err: any) {
      console.error('Digitizer Pass 1 & 2 failed:', err)
      digitizerStore.updatePageData(currentPage, { status: 'error', error: err?.message || String(err) })
      context.ui.showToast(`Gagal: ${err?.message || err}`, 'error')
    } finally {
      setIsLoading(false)
      setLoadingMsg('')
    }
  }

  // 2. Run Pass 3: Linguistic Tahqiq
  const handleRunTahqiq = async () => {
    if (pageData.blocks.length === 0) {
      context.ui.showToast('Jalankan langkah 1 terlebih dahulu untuk mengekstrak teks.', 'info')
      return
    }

    setIsLoading(true)
    setLoadingMsg('Menjalankan Tahqiq Linguistik LLM...')
    digitizerStore.updatePageData(currentPage, { status: 'tahqiq_running' })

    try {
      const dataUrl = await getActivePageDataUrl()
      const updatedBlocks = await runLinguisticTahqiqPass3(
        pageData.blocks,
        pageData.language,
        dataUrl || undefined
      )
      digitizerStore.updatePageData(currentPage, {
        blocks: updatedBlocks,
        status: 'completed',
      })
      context.ui.showToast(`Tahqiq selesai untuk Hal ${currentPage}!`, 'success')
    } catch (err: any) {
      console.error('Tahqiq failed:', err)
      digitizerStore.updatePageData(currentPage, { status: 'error', error: err?.message || String(err) })
      context.ui.showToast(`Gagal tahqiq: ${err?.message || err}`, 'error')
    } finally {
      setIsLoading(false)
      setLoadingMsg('')
    }
  }

  // 3. Apply 1:1 to Active Word Document via MCP/Docx Actions
  const handleApplyToWord = () => {
    if (pageData.blocks.length === 0) {
      context.ui.showToast('Belum ada teks yang siap diterapkan.', 'info')
      return
    }

    try {
      const geometry = pageData.geometry || {
        paperSize: 'B5',
        orientation: 'portrait',
        margins: { top: '1.2cm', bottom: '1.2cm', left: '1.0cm', right: '1.0cm' },
        hasBorder: true,
        borderStyle: 'double',
        borderColor: '#4a3525',
        hasShading: true,
        shadingTone: '#fbf7ee',
        nadzomStructure: 'two_column_symmetric',
        estimatedHeadingFontSize: 16,
        estimatedBodyFontSize: 13,
        estimatedMarginFontSize: 10,
      }

      // Compile full 1:1 page with frame and insert into Word
      const html = compileToDocxHtml(geometry, pageData.blocks, true)
      context.actions.insertHtml(html)
      context.actions.focusEditor()

      context.ui.showToast(
        `Naskah Hal ${currentPage} berhasil disisipkan 1:1 ke Dokumen Word aktif!`,
        'success'
      )
    } catch (err: any) {
      console.error('Failed to apply to Word via MCP:', err)
      context.ui.showToast(`Gagal menyisipkan ke Word: ${err?.message || err}`, 'error')
    }
  }

  const geometry = pageData.geometry
  const parseCm = (val: string) => parseFloat(val) || 1.0

  return (
    <div className="digitizer-sidebar-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      {/* Hidden file picker input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handleOpenPdfFile}
      />

      {/* 1. Header & Paginator */}
      <div className="digitizer-sb-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--word-blue, #185abd)', display: 'inline-flex' }}>
              <IconManuscript size={15} />
            </span>
            <span style={{ fontWeight: 700, fontSize: '12.5px' }}>Digitizer Studio 1:1</span>
          </div>

          <button
            type="button"
            className="btn-viewer-tool-text"
            onClick={onSwitchToPdf}
            title="Buka Lembar PDF Naskah di Sidebar"
            style={{ fontSize: '10.5px', padding: '2px 8px' }}
          >
            Lihat PDF
          </button>
        </div>

        {/* Naskah PDF Status / Picker */}
        {pdfDocument ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              background: 'var(--surface-subtle, rgba(0,0,0,0.03))',
              borderRadius: 6,
              border: '1px solid var(--border)',
              marginBottom: 8,
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              <IconDocument size={12} color="var(--word-blue, #185abd)" />
              <span
                style={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 160,
                }}
                title={pluginStore.pdfFileName}
              >
                {pluginStore.pdfFileName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--word-blue, #185abd)',
                fontSize: '10.5px',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '2px 4px',
              }}
              title="Ganti berkas PDF naskah"
            >
              Ganti PDF
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: '12px',
              background: 'var(--surface-subtle, rgba(0,0,0,0.02))',
              border: '1px dashed var(--border)',
              borderRadius: 6,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Belum Ada Naskah PDF
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: 8 }}>
              Muat berkas PDF naskah asli Anda untuk memulai digitasi 1:1.
            </div>
            <button
              type="button"
              className="btn-digitizer-action highlight"
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', justifyContent: 'center', padding: '6px 10px', fontSize: '11px', fontWeight: 600 }}
            >
              <IconFolderOpen size={13} />
              <span>Buka Berkas PDF Asli</span>
            </button>
          </div>
        )}

        {/* Paginator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, background: 'var(--surface-subtle, rgba(0,0,0,0.03))', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
          <button
            type="button"
            className="btn-digitizer-page-nav"
            onClick={() => digitizerStore.setState({ currentPage: Math.max(1, currentPage - 1) })}
            disabled={currentPage <= 1 || isLoading || !pdfDocument}
          >
            ‹
          </button>

          <span style={{ fontSize: '11px', fontWeight: 600 }}>
            Hal {currentPage} dari {totalPages}
          </span>

          <button
            type="button"
            className="btn-digitizer-page-nav"
            onClick={() => digitizerStore.setState({ currentPage: Math.min(totalPages, currentPage + 1) })}
            disabled={currentPage >= totalPages || isLoading || !pdfDocument}
          >
            ›
          </button>
        </div>
      </div>

      {/* 2. Language Profile Selector */}
      <div className="digitizer-sb-section">
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
          Profil Bahasa & Kaidah Filologi
        </label>
        <select
          value={pageData.language}
          onChange={(e) => digitizerStore.setPageLanguage(currentPage, e.target.value as DigitizerLanguageProfile)}
          className="geometry-select"
          style={{ width: '100%', fontSize: '11.5px', padding: '4px 8px' }}
          disabled={isLoading}
        >
          {(Object.entries(LANGUAGE_LABELS) as [string, { name: string; icon: string; description: string }][]).map(([k, v]) => (
            <option key={k} value={k}>
              {v.icon} {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Action Buttons (Pass 1 & Pass 2) */}
      <div className="digitizer-sb-section">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            type="button"
            className="btn-digitizer-action"
            style={{ width: '100%', justifyContent: 'center', padding: '7px 10px', fontSize: '11.5px', fontWeight: 600 }}
            onClick={handleRunPass1And2}
            disabled={isLoading}
          >
            <IconRefresh size={13} className={isLoading && pageData.status === 'layout_detecting' ? 'spin' : ''} />
            <span>1. Pindai Geometri & Margin</span>
          </button>

          <button
            type="button"
            className="btn-digitizer-action highlight"
            style={{ width: '100%', justifyContent: 'center', padding: '7px 10px', fontSize: '11.5px', fontWeight: 600 }}
            onClick={handleRunTahqiq}
            disabled={isLoading || pageData.blocks.length === 0}
          >
            <IconSparkles size={13} />
            <span>2. Tahqiq & Koreksi ({pageData.blocks.length} Blok)</span>
          </button>
        </div>

        {loadingMsg && (
          <div style={{ marginTop: 6, fontSize: '10.5px', color: 'var(--word-blue, #185abd)', textAlign: 'center', fontWeight: 500 }}>
            {loadingMsg}
          </div>
        )}
      </div>

      {/* 4. Live Margin & Jadwal Adjuster */}
      {geometry && (
        <div className="digitizer-sb-section" style={{ background: 'var(--surface-subtle, rgba(0,0,0,0.02))', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Geometri Fisik Terukur
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--word-blue, #185abd)' }}>
              {geometry.paperSize} • {geometry.borderStyle === 'double' ? 'Jadwal Ganda' : 'Jadwal Tunggal'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', fontSize: '10.5px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Atas:</span>
                <span style={{ fontWeight: 600 }}>{geometry.margins.top}</span>
              </div>
              <input
                type="range"
                min={0.4}
                max={3.0}
                step={0.1}
                value={parseCm(geometry.margins.top)}
                onChange={(e) =>
                  digitizerStore.updateGeometry(currentPage, {
                    margins: { ...geometry.margins, top: `${e.target.value}cm` },
                  })
                }
                style={{ width: '100%', margin: '2px 0' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Kiri:</span>
                <span style={{ fontWeight: 600 }}>{geometry.margins.left}</span>
              </div>
              <input
                type="range"
                min={0.4}
                max={3.0}
                step={0.1}
                value={parseCm(geometry.margins.left)}
                onChange={(e) =>
                  digitizerStore.updateGeometry(currentPage, {
                    margins: { ...geometry.margins, left: `${e.target.value}cm` },
                  })
                }
                style={{ width: '100%', margin: '2px 0' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. Tahqiq Diff Summary */}
      {pageData.blocks.length > 0 && (
        <div className="digitizer-sb-section">
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Daftar Blok Naskah ({pageData.blocks.length})
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 2 }}>
            {pageData.blocks.map((b: any, idx: number) => (
              <div
                key={b.id || idx}
                style={{
                  padding: '6px 8px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--word-blue, #185abd)', textTransform: 'uppercase' }}>
                    {b.type}
                  </span>
                  {b.status === 'tahqiq_done' && (
                    <span style={{ fontSize: '9px', color: 'var(--success, #10b981)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      <IconCheck size={9} /> Tahqiq
                    </span>
                  )}
                </div>
                <div style={{ direction: b.isRtl ? 'rtl' : 'ltr', fontFamily: "'Traditional Arabic', Amiri, Arial", fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.tahqiqText || b.rawOcrText}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Apply to Word via MCP Button */}
      <div className="digitizer-sb-section" style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          className="btn-workbench-commit"
          style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', fontSize: '12px', fontWeight: 700 }}
          onClick={handleApplyToWord}
          disabled={isLoading || pageData.blocks.length === 0}
          title="Terapkan hasil penataan 1:1 ke Dokumen Word aktif seketika via MCP"
        >
          <IconApplyWord size={14} />
          <span>Terapkan ke Dokumen Word (1:1)</span>
        </button>
      </div>
    </div>
  )
}
