/**
 * Manuscriber Plugin — ManuscriberDigitizerModal
 * Full-screen Studio Modal for 1:1 Manuscript Digitization.
 * 100% Integrated into GenOffice Docs Plugin Architecture.
 */

import React, { useState, useEffect, useCallback } from 'react'
import type { DocxPluginContext } from '../../types'
import type { DigitizerLanguageProfile, PageGeometrySpec } from '../types'
import { useManuscriberPluginStore } from '../store/manuscriberPluginStore'
import { useDigitizerStore, digitizerStore } from '../store/digitizerStore'
import { capturePdfPageAsDataUrl } from '../services/visionService'
import { loadPdfDocumentFromBuffer } from '../services/pdfService'
import {
  detectPageGeometryPass1,
  extractBlocksPass2,
  runLinguisticTahqiqPass3,
  compileToDocxHtml,
  createSampleManuscriptDataUrl,
} from '../services/digitizerPipelineService'
import { DigitizerToolbar } from '../components/digitizer/DigitizerToolbar'
import { DigitizerCanvasViewer } from '../components/digitizer/DigitizerCanvasViewer'
import { DigitizerSheetPreview } from '../components/digitizer/DigitizerSheetPreview'

interface ManuscriberDigitizerModalProps {
  context: DocxPluginContext
  initialPayload: unknown
  onClose: () => void
}

export const ManuscriberDigitizerModal: React.FC<ManuscriberDigitizerModalProps> = ({
  context,
  onClose,
}) => {
  const pluginStore = useManuscriberPluginStore()
  const digitizer = useDigitizerStore()

  const { pdfDocument, pdfFileName, totalPages: pluginTotalPages } = pluginStore
  const totalPages = Math.max(1, pluginTotalPages || 1)

  const currentPage = digitizer.currentPage
  const pageData = digitizerStore.getOrCreatePageData(currentPage)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Cache rendered image URLs per page to avoid redundant canvas renders
  const [pageImages, setPageImages] = useState<Record<number, string>>({})
  const [isLoadingPageImage, setIsLoadingPageImage] = useState(false)
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')

  const handleFileSelect = async (file: File) => {
    if (!file) return

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        context.ui.showToast(`Memuat naskah PDF "${file.name}"...`, 'info')
        const buffer = await file.arrayBuffer()
        pluginStore.setPdfFileName(file.name)
        pluginStore.setPdfBytes(buffer)
        const pdfDoc = await loadPdfDocumentFromBuffer(buffer)
        pluginStore.setPdfDocument(pdfDoc)
        pluginStore.setTotalPages(pdfDoc.numPages)
        digitizerStore.setState({ currentPage: 1, selectedBlockId: null })
        const dataUrl = await capturePdfPageAsDataUrl(pdfDoc, 1, 2.0)
        setPageImages({ 1: dataUrl })
        context.ui.showToast(`Naskah "${file.name}" (${pdfDoc.numPages} hal) berhasil dimuat!`, 'success')
      } catch (err: any) {
        console.error('Failed to load PDF in digitizer:', err)
        context.ui.showToast(`Gagal memuat PDF: ${err?.message || err}`, 'error')
      }
    } else if (file.type.startsWith('image/')) {
      try {
        context.ui.showToast(`Memuat citra naskah "${file.name}"...`, 'info')
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          setPageImages({ 1: dataUrl })
          pluginStore.setPdfFileName(file.name)
          pluginStore.setTotalPages(1)
          digitizerStore.setState({ currentPage: 1, selectedBlockId: null })
          context.ui.showToast(`Citra naskah "${file.name}" berhasil dimuat!`, 'success')
        }
        reader.readAsDataURL(file)
      } catch (err: any) {
        console.error('Failed to load image in digitizer:', err)
        context.ui.showToast(`Gagal memuat gambar: ${err?.message || err}`, 'error')
      }
    } else {
      context.ui.showToast('Format tidak didukung. Harap pilih PDF atau gambar (PNG, JPG, WebP).', 'error')
    }
  }

  const handleTriggerPickFile = async () => {
    const desktop = (window as any).desktop
    if (desktop?.pickImage) {
      try {
        const picked = await desktop.pickImage()
        if (picked && picked.base64) {
          const dataUrl = `data:${picked.mime || 'image/png'};base64,${picked.base64}`
          setPageImages({ [currentPage]: dataUrl })
          pluginStore.setPdfFileName(picked.name || 'Citra Naskah')
          pluginStore.setTotalPages(1)
          digitizerStore.setState({ currentPage: 1, selectedBlockId: null })
          context.ui.showToast(`Citra naskah "${picked.name || 'Naskah'}" berhasil dimuat!`, 'success')
          return
        }
      } catch (err) {
        console.warn('desktop.pickImage failed, falling back:', err)
      }
    }
    fileInputRef.current?.click()
  }

  const handleLoadDemo = () => {
    try {
      context.ui.showToast('Memuat contoh naskah Turats uji coba...', 'info')
      const demoUrl = createSampleManuscriptDataUrl()
      setPageImages({ [currentPage]: demoUrl })
      pluginStore.setPdfFileName('Contoh_Turats_Ajurrumiyyah.jpg')
      pluginStore.setTotalPages(1)
      digitizerStore.setState({ currentPage: 1, selectedBlockId: null })
      context.ui.showToast('Contoh naskah Turats siap diproses! Klik "1. Pindai Geometri & Teks".', 'success')
    } catch (err: any) {
      console.error('Failed to load demo manuscript:', err)
      context.ui.showToast(`Gagal memuat naskah contoh: ${err?.message || err}`, 'error')
    }
  }

  // 1. Render PDF page to image when currentPage changes or pdfDocument changes
  const loadPageImage = useCallback(async (pageNo: number) => {
    if (pageImages[pageNo]) return
    if (!pdfDocument) return

    setIsLoadingPageImage(true)
    try {
      const dataUrl = await capturePdfPageAsDataUrl(pdfDocument, pageNo, 2.0)
      setPageImages((prev) => ({ ...prev, [pageNo]: dataUrl }))
    } catch (err: any) {
      console.error(`Failed to capture PDF page ${pageNo}:`, err)
      context.ui.showToast(`Gagal merender halaman ${pageNo}: ${err?.message || err}`, 'error')
    } finally {
      setIsLoadingPageImage(false)
    }
  }, [pdfDocument, pageImages, context.ui])

  useEffect(() => {
    loadPageImage(currentPage)
  }, [currentPage, loadPageImage])

  // 2. Step 1 & 2: Detect Geometry & Extract Blocks
  const handleRunPass1And2 = async () => {
    const dataUrl = pageImages[currentPage]
    if (!dataUrl) {
      context.ui.showToast('Halaman naskah belum selesai dimuat.', 'info')
      return
    }

    setPipelineLoading(true)
    setLoadingMessage('Mendeteksi Geometri (Pass 1)...')
    digitizerStore.updatePageData(currentPage, { status: 'layout_detecting' })

    try {
      // Pass 1: Geometry
      const geometry = await detectPageGeometryPass1(dataUrl, pageData.language)
      digitizerStore.updatePageData(currentPage, {
        geometry,
        status: 'ocr_extracting',
      })

      // Pass 2: Coordinated Text Blocks
      setLoadingMessage('Mengekstrak Blok Teks (Pass 2)...')
      const blocks = await extractBlocksPass2(dataUrl, geometry, pageData.language, currentPage)
      digitizerStore.updatePageData(currentPage, {
        blocks,
        status: 'idle',
      })

      context.ui.showToast(
        `Berhasil mendeteksi geometri & mengekstrak ${blocks.length} blok teks pada Hal ${currentPage}!`,
        'success'
      )
    } catch (err: any) {
      console.error('Pass 1 & 2 failed:', err)
      digitizerStore.updatePageData(currentPage, { status: 'error', error: err?.message || String(err) })
      context.ui.showToast(`Gagal memproses naskah: ${err?.message || err}`, 'error')
    } finally {
      setPipelineLoading(false)
      setLoadingMessage('')
    }
  }

  // 3. Step 3: Multi-Language Linguistic Tahqiq
  const handleRunTahqiq = async () => {
    if (pageData.blocks.length === 0) {
      context.ui.showToast('Belum ada blok teks untuk ditahqiq.', 'info')
      return
    }

    setPipelineLoading(true)
    setLoadingMessage('Menjalankan Tahqiq Linguistik LLM...')
    digitizerStore.updatePageData(currentPage, { status: 'tahqiq_running' })

    try {
      const updatedBlocks = await runLinguisticTahqiqPass3(pageData.blocks, pageData.language, currentImage || undefined)
      digitizerStore.updatePageData(currentPage, {
        blocks: updatedBlocks,
        status: 'completed',
      })
      digitizerStore.setState({ activeTab: 'preview' })

      context.ui.showToast(`Tahqiq linguistik selesai untuk Hal ${currentPage}!`, 'success')
    } catch (err: any) {
      console.error('Tahqiq failed:', err)
      digitizerStore.updatePageData(currentPage, { status: 'error', error: err?.message || String(err) })
      context.ui.showToast(`Gagal menjalankan tahqiq: ${err?.message || err}`, 'error')
    } finally {
      setPipelineLoading(false)
      setLoadingMessage('')
    }
  }

  // 4. Step 4: Apply 1:1 Document to Word Editor
  const handleApplyToWord = () => {
    if (pageData.blocks.length === 0) {
      context.ui.showToast('Tidak ada blok teks untuk disisipkan.', 'info')
      return
    }

    try {
      const geometry = pageData.geometry || {
        paperSize: 'B5',
        orientation: 'portrait',
        margins: { top: '2.2cm', bottom: '2.2cm', left: '2.0cm', right: '2.0cm' },
        hasBorder: true,
        borderStyle: 'double',
        borderColor: '#4a3525',
        hasShading: true,
        shadingTone: '#fcf8ee',
        nadzomStructure: 'none',
        estimatedHeadingFontSize: 16,
        estimatedBodyFontSize: 13,
        estimatedMarginFontSize: 10,
      }

      const html = compileToDocxHtml(geometry, pageData.blocks)
      context.actions.insertHtml(html)
      context.ui.showToast(`Naskah 1:1 Hal ${currentPage} berhasil disisipkan ke Dokumen Word!`, 'success')
    } catch (err: any) {
      console.error('Failed to apply to Word:', err)
      context.ui.showToast(`Gagal menyisipkan ke Word: ${err?.message || err}`, 'error')
    }
  }

  const currentImage = pageImages[currentPage] || null

  return (
    <div className="manuscriber-modal-backdrop" onClick={onClose}>
      {/* Hidden file picker for direct PDF & Image ingestion */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
          e.target.value = ''
        }}
      />

      <div
        className="manuscriber-modal-card digitizer-fullscreen"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Manuscriber Digitizer Studio"
      >
        {/* Header Toolbar */}
        <DigitizerToolbar
          pageNo={currentPage}
          totalPages={totalPages}
          pdfFileName={pdfFileName}
          language={pageData.language}
          status={pageData.status}
          blockCount={pageData.blocks.length}
          isLoading={pipelineLoading || isLoadingPageImage}
          loadingMessage={loadingMessage}
          onPageChange={(p) => digitizerStore.setState({ currentPage: p, selectedBlockId: null })}
          onLanguageChange={(lang) => digitizerStore.setPageLanguage(currentPage, lang)}
          onRunPass1And2={handleRunPass1And2}
          onRunTahqiq={handleRunTahqiq}
          onApplyToWord={handleApplyToWord}
          onPickFile={handleTriggerPickFile}
          onLoadDemo={handleLoadDemo}
          onClose={onClose}
        />

        {/* Studio Body: Split-View 50:50 */}
        <div className="digitizer-studio-body">
          {/* Left Pane: Physical Manuscript & Bounding Boxes */}
          <DigitizerCanvasViewer
            imageDataUrl={currentImage}
            geometry={pageData.geometry}
            blocks={pageData.blocks}
            selectedBlockId={digitizer.selectedBlockId}
            showBoundingBoxes={digitizer.showBoundingBoxes}
            showJadwalBorder={digitizer.showJadwalBorder}
            zoomScale={digitizer.zoomScale}
            contrastLevel={digitizer.contrastLevel}
            brightnessLevel={digitizer.brightnessLevel}
            onSelectBlock={(id) => digitizerStore.setState({ selectedBlockId: id })}
            onZoomChange={(zoom) => digitizerStore.setState({ zoomScale: zoom })}
            onContrastChange={(contrast) => digitizerStore.setState({ contrastLevel: contrast })}
            onBrightnessChange={(brightness) => digitizerStore.setState({ brightnessLevel: brightness })}
            onToggleBoundingBoxes={() => digitizerStore.setState((s) => ({ showBoundingBoxes: !s.showBoundingBoxes }))}
            onToggleJadwalBorder={() => digitizerStore.setState((s) => ({ showJadwalBorder: !s.showJadwalBorder }))}
            onPickFile={handleTriggerPickFile}
            onLoadDemo={handleLoadDemo}
            onDropFile={handleFileSelect}
            isLoading={isLoadingPageImage}
          />

          {/* Right Pane: Live 1:1 Docx Preview & Diff Tahqiq */}
          <DigitizerSheetPreview
            activeTab={digitizer.activeTab}
            geometry={pageData.geometry}
            blocks={pageData.blocks}
            selectedBlockId={digitizer.selectedBlockId}
            onTabChange={(tab) => digitizerStore.setState({ activeTab: tab })}
            onSelectBlock={(id) => digitizerStore.setState({ selectedBlockId: id })}
            onUpdateBlockText={(id, text) => digitizerStore.updateBlock(currentPage, id, { tahqiqText: text })}
            onVerifyBlock={(id) => digitizerStore.updateBlock(currentPage, id, { status: 'verified' })}
            onUpdateGeometry={(updates) => digitizerStore.updateGeometry(currentPage, updates)}
          />
        </div>
      </div>
    </div>
  )
}
