import React, { useState, useRef, useCallback, useEffect } from 'react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
// @ts-ignore
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import type { DocxPluginContext } from '../../../types'
import { useManuscriberPluginStore } from '../../store/manuscriberPluginStore'
import {
  capturePdfPageAsDataUrl,
  parseSpotlightBlocks,
  transcribePageImage,
  SYSTEM_SPOTLIGHT_RULES,
  PROMPT_PRESETS,
} from '../../services/visionService'
import type { StagingLine } from '../../types'
import { ManuscriberWelcomeCard } from './ManuscriberWelcomeCard'
import { PdfPageFeedCard } from './PdfPageFeedCard'
import {
  IconFolderOpen,
  IconDocument,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconBulb,
  IconWorkbench,
  IconSparkles,
  IconFitPage,
  IconFitWidth,
  IconDocumentBulletList,
} from '../icons/ManuscriberIcons'

// Configure PDF.js worker and asset paths matching PdfViewerPanel.tsx
GlobalWorkerOptions.workerSrc = workerUrl
const ASSET_BASE = new URL('pdfjs/', document.baseURI).href
const DOC_OPTS = {
  cMapUrl: `${ASSET_BASE}cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${ASSET_BASE}standard_fonts/`,
  wasmUrl: `${ASSET_BASE}wasm/`,
}

interface PdfThumbnailItemProps {
  pdfDoc: PDFDocumentProxy
  pageNo: number
  isActive: boolean
  status: 'idle' | 'transcribing' | 'done' | 'error'
  onClick: () => void
}

function PdfThumbnailItem({ pdfDoc, pageNo, isActive, status, onClick }: PdfThumbnailItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState<boolean>(false)

  useEffect(() => {
    let active = true
    let renderTask: RenderTask | null = null

    const renderThumb = async () => {
      if (!canvasRef.current || rendered) return
      try {
        const page = await pdfDoc.getPage(pageNo)
        if (!active) return

        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const targetWidth = 84
        const targetScale = targetWidth / unscaledViewport.width
        const viewport = page.getViewport({ scale: targetScale })

        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)

        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) return
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        renderTask = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
        })
        await renderTask.promise
        if (active) setRendered(true)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'RenderingCancelledException') return
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void renderThumb()
          observer.disconnect()
        }
      },
      { rootMargin: '120px' },
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      active = false
      observer.disconnect()
      renderTask?.cancel()
    }
  }, [pdfDoc, pageNo, rendered])

  useEffect(() => {
    if (isActive && containerRef.current) {
      containerRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isActive])

  return (
    <div
      ref={containerRef}
      className={`manuscriber-thumb-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={`Halaman ${pageNo}${status === 'done' ? ' (Sudah Ditranskripsi)' : ''}`}
    >
      <div className="manuscriber-thumb-canvas-wrap">
        <canvas ref={canvasRef} className="manuscriber-thumb-canvas" />
        {!rendered && (
          <div className="manuscriber-thumb-skeleton">
            <span>{pageNo}</span>
          </div>
        )}
        {status === 'done' && (
          <span className="manuscriber-thumb-badge done" title="Selesai ditranskripsi">
            <IconCheck size={10} />
          </span>
        )}
        {status === 'transcribing' && (
          <span className="manuscriber-thumb-badge transcribing" title="Memproses AI...">
            <IconSparkles size={10} className="rotating-icon" />
          </span>
        )}
      </div>
      <span className="manuscriber-thumb-label">{pageNo}</span>
    </div>
  )
}

interface PdfViewerProps {
  context: DocxPluginContext
  compact?: boolean
  headerPrefix?: React.ReactNode
  onOpenWorkbench?: () => void
  onTranscriptionSuccess?: (pageNo: number, count: number) => void
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  context,
  compact = false,
  headerPrefix,
  onOpenWorkbench,
  onTranscriptionSuccess,
}) => {
  const store = useManuscriberPluginStore()
  const {
    pdfDocument,
    pdfFileName,
    pdfBytes,
    currentPage,
    totalPages,
    zoomScale,
    pageStatuses,
    lines,
    activeLineId,
    visionConfig,
  } = store

  const fileInputRef = useRef<HTMLInputElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [isLoadingDoc, setIsLoadingDoc] = useState(false)
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [showSpotlight, setShowSpotlight] = useState(true)
  const [pageInputVal, setPageInputVal] = useState<string>(String(currentPage || 1))

  // Panning drag state matching PdfViewerPanel.tsx
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })

  // Wheel Zoom (Ctrl + Wheel or Trackpad Pinch)
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY < 0 ? 0.08 : -0.08
        store.setZoomScale(Math.min(3.0, Math.max(0.3, Number((zoomScale + delta).toFixed(2)))))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomScale, store])

  // Global mouse up for pan release
  useEffect(() => {
    const onGlobalMouseUp = () => setIsPanning(false)
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
  }, [])

  // Pan event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return
    const target = e.target as HTMLElement
    if (target.closest('button, input, textarea, a, .pdf-spotlight-box, .pdf-page-card-header')) {
      return
    }
    if (!viewportRef.current) return
    setIsPanning(true)
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || !viewportRef.current) return
    e.preventDefault()
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y
    viewportRef.current.scrollLeft = panStartRef.current.scrollLeft - dx
    viewportRef.current.scrollTop = panStartRef.current.scrollTop - dy
  }

  const handlePointerUp = () => {
    setIsPanning(false)
  }

  const isProgrammaticScrollRef = useRef(false)
  const programmaticTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (programmaticTimeoutRef.current) clearTimeout(programmaticTimeoutRef.current)
    }
  }, [])

  // Synchronize input value with currentPage
  useEffect(() => {
    setPageInputVal(String(currentPage || 1))
  }, [currentPage])

  // Scroll to page with programmatic lock
  const scrollToPage = useCallback(
    (pageNum: number) => {
      const el = document.getElementById(`pdf-page-card-${pageNum}`)
      if (el) {
        isProgrammaticScrollRef.current = true
        if (programmaticTimeoutRef.current) clearTimeout(programmaticTimeoutRef.current)
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        store.setCurrentPage(pageNum)
        programmaticTimeoutRef.current = setTimeout(() => {
          isProgrammaticScrollRef.current = false
        }, 800)
      }
    },
    [store],
  )

  // Synchronize PDF view scroll when currentPage changes from external components (e.g. Workbench stepper)
  useEffect(() => {
    if (!currentPage) return
    const el = document.getElementById(`pdf-page-card-${currentPage}`)
    if (!el) return

    const vp = viewportRef.current
    if (vp) {
      const vpRect = vp.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      // If element is already nicely visible in viewport, don't trigger unnecessary scroll
      if (elRect.top >= vpRect.top - 30 && elRect.top <= vpRect.top + 150) {
        return
      }
    }

    isProgrammaticScrollRef.current = true
    if (programmaticTimeoutRef.current) clearTimeout(programmaticTimeoutRef.current)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    programmaticTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false
    }, 800)
  }, [currentPage])

  // Stable callback for page in-view events from user scrolling
  const handlePageInView = useCallback(
    (viewedPage: number) => {
      if (isProgrammaticScrollRef.current) return
      const cur = useManuscriberPluginStore.getState().currentPage || 1
      if (cur !== viewedPage) {
        store.setCurrentPage(viewedPage)
      }
    },
    [store],
  )

  // Jump via page number input
  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const p = parseInt(pageInputVal, 10)
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        scrollToPage(p)
      } else {
        setPageInputVal(String(currentPage))
      }
    }
  }

  const handlePageInputBlur = () => {
    const p = parseInt(pageInputVal, 10)
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      scrollToPage(p)
    } else {
      setPageInputVal(String(currentPage))
    }
  }

  // Fit Page calculation matching PdfViewerPanel.tsx
  const handleFitPage = async () => {
    if (!pdfDocument || !viewportRef.current) return
    try {
      const page = await pdfDocument.getPage(currentPage || 1)
      const unscaledViewport = page.getViewport({ scale: 1.0 })
      const availableWidth = viewportRef.current.clientWidth - 48
      const availableHeight = viewportRef.current.clientHeight - 60
      if (
        availableWidth > 60 &&
        availableHeight > 60 &&
        unscaledViewport.width > 0 &&
        unscaledViewport.height > 0
      ) {
        const scaleX = availableWidth / unscaledViewport.width
        const scaleY = availableHeight / unscaledViewport.height
        const targetScale = Math.min(
          3.0,
          Math.max(0.3, Number(Math.min(scaleX, scaleY).toFixed(2))),
        )
        store.setZoomScale(targetScale)
      }
    } catch (err) {
      console.warn('Fit page error:', err)
    }
  }

  // Fit Width calculation
  const handleFitWidth = async () => {
    if (!pdfDocument || !viewportRef.current) return
    try {
      const page = await pdfDocument.getPage(currentPage || 1)
      const unscaledViewport = page.getViewport({ scale: 1.0 })
      const availableWidth = viewportRef.current.clientWidth - 48
      if (availableWidth > 100 && unscaledViewport.width > 0) {
        const targetScale = Math.min(
          3.0,
          Math.max(0.3, Number((availableWidth / unscaledViewport.width).toFixed(2))),
        )
        store.setZoomScale(targetScale)
      }
    } catch (err) {
      console.warn('Fit width error:', err)
    }
  }

  // Load PDF from ArrayBuffer (safe for Electron IPC, Drag&Drop, and File input)
  const handleLoadBuffer = async (buffer: ArrayBuffer, fileName: string) => {
    setIsLoadingDoc(true)
    try {
      const safeCopy = buffer.slice(0)
      const workerData = buffer.slice(0)
      store.setPdfBytes(safeCopy)
      store.setPdfFileName(fileName)

      const loadingTask = getDocument({
        data: new Uint8Array(workerData),
        ...DOC_OPTS,
      })
      const pdf = await loadingTask.promise
      store.setPdfDocument(pdf)
      store.setTotalPages(pdf.numPages)
      store.setCurrentPage(1)
      store.setLines([]) // Fresh document

      context.ui.showToast(`PDF "${fileName}" berhasil dimuat (${pdf.numPages} halaman)`, 'success')
    } catch (err: any) {
      console.error('Failed to load PDF:', err)
      context.ui.showToast(`Gagal membuka berkas: ${err?.message || 'Format tidak valid'}`, 'error')
    } finally {
      setIsLoadingDoc(false)
    }
  }

  // Load from File object
  const handleLoadFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer()
      await handleLoadBuffer(buffer, file.name)
    } catch (err: any) {
      console.error('Failed to read file buffer:', err)
      context.ui.showToast(`Gagal membaca berkas: ${err?.message || 'Error'}`, 'error')
    }
  }

  // Native File Picker with fallback
  const handlePickPdf = async () => {
    try {
      const desktop = (window as any).desktop
      if (desktop?.pickPdf) {
        const res = await desktop.pickPdf()
        if (!res.canceled && res.fileData && res.name) {
          await handleLoadBuffer(res.fileData, res.name)
          return
        }
      }
    } catch {}
    fileInputRef.current?.click()
  }

  // Listen to consumePendingPdf if available
  useEffect(() => {
    let mounted = true
    ;(window as any).desktop
      ?.consumePendingPdf?.()
      .then((res: any) => {
        if (!mounted || !res || !res.ok || !res.fileData || !res.name) return
        void handleLoadBuffer(res.fileData, res.name)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  // Listen to transcription requests from Ribbon or other surfaces
  useEffect(() => {
    if (store.transcribeRequestPage !== null && store.transcribeRequestPage !== undefined) {
      const pageToTranscribe = store.transcribeRequestPage
      store.clearTranscribeRequest()
      void handleTranscribePage(pageToTranscribe)
    }
  }, [store.transcribeRequestPage, pdfDocument])

  // AI Transcribe action for a specific page
  const handleTranscribePage = async (targetPage: number) => {
    if (!pdfDocument || targetPage < 1) {
      context.ui.showToast('Naskah PDF belum siap atau belum dimuat.', 'error')
      return
    }

    store.setPageStatus(targetPage, 'transcribing')
    context.ui.showToast(`Memulai transkripsi AI untuk Halaman ${targetPage}...`, 'info')

    try {
      const dataUrl = await capturePdfPageAsDataUrl(pdfDocument, targetPage, 2.0)
      const presetKey = visionConfig.promptPreset || visionConfig.activePreset || 'matanSyarah'
      const preset = PROMPT_PRESETS[presetKey] || PROMPT_PRESETS.matanSyarah
      const fullPrompt = `${preset.prompt}\n\n${SYSTEM_SPOTLIGHT_RULES}`

      const result = await transcribePageImage(dataUrl, fullPrompt)

      if (!result.ok) {
        throw new Error(result.error || 'Gagal mentranskripsi halaman via Vision AI.')
      }

      const parsedBlocks = parseSpotlightBlocks(result.text, targetPage)
      if (parsedBlocks.length === 0) {
        throw new Error('Tidak ada blok teks yang terdeteksi dari hasil analisis AI.')
      }

      const newLines: StagingLine[] = parsedBlocks.map((b, idx) => ({
        id:
          b.id ||
          `p${targetPage}_b${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        pageNo: targetPage,
        pageNumber: targetPage,
        text: b.text,
        originalText: b.originalText ?? b.text,
        correctedText: b.correctedText ?? b.text,
        transliteration: b.transliteration || '',
        status: 'unverified',
        type: b.type,
        tag: b.tag || (b.type || 'TEKS').toUpperCase(),
        bbox: b.bbox,
        box_2d: b.box_2d,
        isRtl: b.isRtl,
      }))

      store.addPageLines(targetPage, newLines)
      store.setPageStatus(targetPage, 'done')
      store.setCurrentPage(targetPage)
      store.setActiveLineId(newLines[0].id)

      store.addScanSession({
        id: `session_${Date.now()}`,
        pageNo: targetPage,
        timestamp: new Date().toLocaleString(),
        blockCount: newLines.length,
        verifiedCount: 0,
        lines: newLines,
      })

      context.ui.showToast(
        `Halaman ${targetPage} berhasil ditranskripsi (${newLines.length} baris naskah terdeteksi)`,
        'success',
      )
      if (onTranscriptionSuccess) {
        onTranscriptionSuccess(targetPage, newLines.length)
      }
    } catch (err: any) {
      console.error('AI Transcription failed:', err)
      const msg = err?.message || 'Error koneksi API'
      store.setPageStatus(targetPage, 'error', msg)
      context.ui.showToast(`Transkripsi gagal: ${msg}`, 'error')
    }
  }

  return (
    <div className={`manuscriber-pdf-viewer ${compact ? 'compact' : ''}`}>
      {/* Top PDF Toolbar — Unified with Header (Distributed Left & Right) */}
      <div className="pdf-viewer-toolbar">
        {headerPrefix}

        <div className="pdf-toolbar-group">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleLoadFile(file)
              e.target.value = ''
            }}
          />

          {/* Toggle Thumbnail Sidebar */}
          {pdfDocument && (
            <button
              type="button"
              className={`btn-pdf-tool icon-only ${showThumbnails ? 'active' : ''}`}
              onClick={() => setShowThumbnails((v) => !v)}
              title={
                showThumbnails
                  ? 'Sembunyikan daftar thumbnail halaman'
                  : 'Tampilkan daftar thumbnail halaman'
              }
              aria-label="Thumbnail Halaman"
            >
              <IconDocumentBulletList size={14} />
            </button>
          )}

          {/* Open / Pick PDF File */}
          <button
            type="button"
            className="btn-pdf-tool icon-only"
            onClick={handlePickPdf}
            title="Buka Berkas PDF Naskah"
            aria-label="Buka Naskah PDF"
          >
            <IconFolderOpen size={14} />
          </button>

          {/* Filename Badge (Compact) */}
          {pdfFileName && (
            <span className="pdf-filename-tag" title={pdfFileName}>
              <IconDocument size={12} />
              <span className="pdf-filename-text">{pdfFileName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Content Layout (matching PdfViewerPanel.tsx) */}
      {!pdfDocument ? (
        <div
          className="manuscriber-preview-container"
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            const file = e.dataTransfer.files?.[0]
            if (file) {
              await handleLoadFile(file)
            }
          }}
        >
          {isLoadingDoc ? (
            <div
              className="pdf-loading-indicator"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '260px',
                gap: 12,
                color: 'var(--text-secondary, #606469)',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              <IconSparkles size={28} className="rotating-icon" color="var(--word-blue, #185abd)" />
              <span>Memuat naskah PDF...</span>
            </div>
          ) : (
            <ManuscriberWelcomeCard onLoadFile={handleLoadFile} />
          )}
        </div>
      ) : (
        <div className="manuscriber-layout">
          {/* Visual Thumbnail Sidebar */}
          {showThumbnails && (
            <div className="manuscriber-sidebar">
              <div className="manuscriber-sidebar-title">Daftar Hal ({totalPages})</div>
              <div className="manuscriber-thumbnails">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PdfThumbnailItem
                    key={p}
                    pdfDoc={pdfDocument}
                    pageNo={p}
                    isActive={currentPage === p}
                    status={pageStatuses[p] || 'idle'}
                    onClick={() => scrollToPage(p)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Main Continuous Canvas Area */}
          <div className="manuscriber-preview-container">
            {/* Continuous Multi-Page Scroll Viewport with Interactive Pan & Zoom */}
            <div
              ref={viewportRef}
              className={`manuscriber-viewport ${isPanning ? 'panning' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div className="pdf-pages-scroll-container">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PdfPageFeedCard
                    key={p}
                    pageNo={p}
                    pdfDocument={pdfDocument}
                    zoomScale={zoomScale}
                    activeLineId={activeLineId}
                    lines={lines}
                    status={pageStatuses[p] || 'idle'}
                    showSpotlight={showSpotlight}
                    onTranscribe={handleTranscribePage}
                    onSelectLine={(id) => store.setActiveLineId(id)}
                    onInView={handlePageInView}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Status Bar (Matching Word Editor Bottom Bar) */}
            <footer className="manuscriber-statusbar">
              <div className="manuscriber-statusbar-left">
                <button
                  type="button"
                  className="manuscriber-statusbar-nav-btn"
                  disabled={currentPage <= 1}
                  onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                  title="Halaman Sebelumnya"
                  aria-label="Sebelumnya"
                >
                  <IconChevronLeft size={12} />
                </button>
                <div className="manuscriber-statusbar-page-counter">
                  <span>Hal</span>
                  <input
                    type="text"
                    className="manuscriber-statusbar-page-input"
                    value={pageInputVal}
                    onChange={(e) => setPageInputVal(e.target.value)}
                    onKeyDown={handlePageInputSubmit}
                    onBlur={handlePageInputBlur}
                    title="Ketik nomor halaman dan tekan Enter untuk melompat"
                  />
                  <span>dari {totalPages}</span>
                </div>
                <button
                  type="button"
                  className="manuscriber-statusbar-nav-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => scrollToPage(Math.min(totalPages, currentPage + 1))}
                  title="Halaman Berikutnya"
                  aria-label="Berikutnya"
                >
                  <IconChevronRight size={12} />
                </button>

                {/* Status Simpan Chip */}
                <span
                  className="manuscriber-status-chip manuscriber-saved-chip"
                  title={
                    store.lastSavedTimestamp
                      ? `Tersimpan otomatis di dokumen Word: ${new Date(store.lastSavedTimestamp).toLocaleTimeString()}`
                      : 'Seluruh perubahan naskah & staging telah tersimpan di dokumen Word'
                  }
                >
                  ✓ Tersimpan
                </span>

                {/* Toggle Spotlight Sorotan */}
                <button
                  type="button"
                  className={`manuscriber-statusbar-nav-btn ${showSpotlight ? 'active' : ''}`}
                  onClick={() => setShowSpotlight((v) => !v)}
                  title={
                    showSpotlight
                      ? 'Sembunyikan layer sorotan spotlight naskah'
                      : 'Tampilkan layer sorotan spotlight naskah'
                  }
                >
                  <IconBulb size={12} color={showSpotlight ? '#d97706' : 'currentColor'} />
                </button>
              </div>

              <div className="manuscriber-statusbar-right">
                <button
                  type="button"
                  className="zoom-btn"
                  onClick={() =>
                    store.setZoomScale(Math.max(0.3, Number((zoomScale - 0.1).toFixed(2))))
                  }
                  title="Perkecil (Zoom Out)"
                  aria-label="Perkecil"
                >
                  −
                </button>
                <input
                  type="range"
                  className="zoom-slider"
                  min={30}
                  max={300}
                  step={5}
                  value={Math.round(zoomScale * 100)}
                  onChange={(e) =>
                    store.setZoomScale(Number((Number(e.target.value) / 100).toFixed(2)))
                  }
                  title={`Zoom: ${Math.round(zoomScale * 100)}%`}
                  aria-label="Zoom slider"
                />
                <button
                  type="button"
                  className="zoom-btn"
                  onClick={() =>
                    store.setZoomScale(Math.min(3.0, Number((zoomScale + 0.1).toFixed(2))))
                  }
                  title="Perbesar (Zoom In)"
                  aria-label="Perbesar"
                >
                  +
                </button>
                <button
                  type="button"
                  className="zoom-val-btn"
                  onClick={() => store.setZoomScale(compact ? 0.75 : 1.0)}
                  title="Klik untuk reset zoom ke 100%"
                  aria-label="Reset zoom"
                >
                  {Math.round(zoomScale * 100)}%
                </button>
                <button
                  type="button"
                  className="fit-btn"
                  onClick={() => void handleFitPage()}
                  title="Sesuaikan Halaman Penuh (Fit Page)"
                  aria-label="Fit Page"
                >
                  <IconFitPage size={13} />
                </button>
                <button
                  type="button"
                  className="fit-btn"
                  onClick={() => void handleFitWidth()}
                  title="Sesuaikan Lebar Halaman (Fit Width)"
                  aria-label="Fit Width"
                >
                  <IconFitWidth size={13} />
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
