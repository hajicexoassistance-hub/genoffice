import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { Editor } from '@tiptap/core'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import {
  capturePdfPageAsDataUrl,
  transcribePageImage,
  getVisionConfig,
  saveVisionConfig,
  parseTranscriptionToStagingLines,
  PROMPT_PRESETS,
  DEFAULT_USER_PROMPT,
  type VisionProviderConfig,
  type PromptPresetItem,
} from './vision-service'
import { scrollToWordPage } from './editor-page-sync'
import { useManuscriberStagingStore, manuscriberStagingStore, type StagingLine } from './ManuscriberStagingStore'
import {
  IconSidebarCollapse,
  IconDocumentPdf,
  IconManuscript,
  IconFlash,
  IconFolderOpen,
  IconDocumentBulletList,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
  IconSparkle,
  IconLightbulb,
  IconFitPage,
  IconClose,
  IconCheck,
  IconSave,
} from '../components/icons'
import {
  isManusProjectFile,
  unpackManusProject,
  type ManusProjectMetadata,
} from './project-io'
import { showToast } from '../components/toast-bus'
import './manuscriber.css'

// Configure PDF.js worker
GlobalWorkerOptions.workerSrc = workerUrl
const ASSET_BASE = new URL('pdfjs/', document.baseURI).href
const DOC_OPTS = {
  cMapUrl: `${ASSET_BASE}cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${ASSET_BASE}standard_fonts/`,
  wasmUrl: `${ASSET_BASE}wasm/`,
}

export type PageStatus = 'idle' | 'transcribing' | 'done' | 'error'

interface PdfThumbnailItemProps {
  pdfDoc: PDFDocumentProxy
  pageNo: number
  isActive: boolean
  status: PageStatus
  onClick: () => void
}

function PdfThumbnailItem({ pdfDoc, pageNo, isActive, status, onClick }: PdfThumbnailItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState<boolean>(false)
  const [aspectRatio, setAspectRatio] = useState<number>(1.414)

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

        setAspectRatio(viewport.height / viewport.width)

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
      { rootMargin: '120px' }
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
      title={`Halaman ${pageNo}: ${status === 'done'
        ? 'Selesai'
        : status === 'transcribing'
          ? 'Sedang AI...'
          : status === 'error'
            ? 'Gagal'
            : 'Belum Ditranskripsi'
        }`}
    >
      <div className="manuscriber-thumb-canvas-wrap" style={{ minHeight: Math.round(84 * aspectRatio) }}>
        <canvas ref={canvasRef} className="manuscriber-thumb-canvas" />

        {status === 'done' && (
          <span className="manuscriber-thumb-badge done" title="Selesai Ditranskripsi">
            <IconCheck size={10} />
          </span>
        )}
        {status === 'transcribing' && (
          <span className="manuscriber-thumb-badge transcribing" title="Sedang Ditranskripsi">
            <span className="spinner-mini" />
          </span>
        )}
        {status === 'error' && (
          <span className="manuscriber-thumb-badge error" title="Gagal Ditranskripsi">
            !
          </span>
        )}
      </div>

      <div className="manuscriber-thumb-footer">
        <span className="manuscriber-thumb-page-label">{pageNo}</span>
      </div>
    </div>
  )
}

interface SpotlightOverlayBoxProps {
  lineItem: StagingLine
  isSelected: boolean
  scaledWidth: number
  scaledHeight: number
}

function SpotlightOverlayBox({
  lineItem,
  isSelected,
  scaledWidth,
  scaledHeight,
}: SpotlightOverlayBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState<boolean>(false)

  useEffect(() => {
    if (isSelected && boxRef.current) {
      boxRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }
  }, [isSelected])

  if (!lineItem.bbox) return null
  const left = Math.round(lineItem.bbox[0] * (scaledWidth / 1000))
  const top = Math.round(lineItem.bbox[1] * (scaledHeight / 1000))
  const width = Math.max(12, Math.round(lineItem.bbox[2] * (scaledWidth / 1000)))
  const height = Math.max(10, Math.round(lineItem.bbox[3] * (scaledHeight / 1000)))

  const previewSnippet =
    lineItem.correctedText.length > 55
      ? `${lineItem.correctedText.slice(0, 55)}...`
      : lineItem.correctedText

  return (
    <div
      ref={boxRef}
      className={`pdf-page-spotlight-overlay spotlight-block-${lineItem.blockType || 'syarah'} ${isSelected ? 'active-highlight' : ''
        }`}
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        // Clicking spotlight box selects block in Staging Panel without disrupting current list/focus mode
        manuscriberStagingStore.setActiveLineId(lineItem.id, false)
      }}
      title={`[Blok ${lineItem.lineNumber} • ${(lineItem.blockType || 'syarah').toUpperCase()}]: "${previewSnippet}" (Klik untuk menyorot di Staging)`}
    >
      {(isSelected || isHovered) && (
        <span className="spotlight-block-tag">
          #{lineItem.lineNumber} {(lineItem.blockType || 'syarah').toUpperCase()}
        </span>
      )}
    </div>
  )
}

interface PdfPageCardProps {
  pdfDoc: PDFDocumentProxy
  pageNo: number
  scale: number
  status: PageStatus
  showSpotlight: boolean
  onTranscribe: (pageNo: number) => void
  onVisible: (pageNo: number) => void
}

function PdfPageCard({ pdfDoc, pageNo, scale, status, showSpotlight, onTranscribe, onVisible }: PdfPageCardProps) {
  const stagingStore = useManuscriberStagingStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState<boolean>(false)
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 595, height: 842 })
  const renderTaskRef = useRef<RenderTask | null>(null)

  useEffect(() => {
    let active = true
    pdfDoc.getPage(pageNo).then((page) => {
      if (!active) return
      const vp = page.getViewport({ scale: 1.0 })
      setPageSize({ width: vp.width, height: vp.height })
    }).catch(() => { })
    return () => {
      active = false
    }
  }, [pdfDoc, pageNo])

  useEffect(() => {
    let active = true

    const renderPage = async () => {
      if (!canvasRef.current) return
      try {
        renderTaskRef.current?.cancel()
        const page = await pdfDoc.getPage(pageNo)
        if (!active) return

        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current
        if (!canvas) return

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) return
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const task = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
        })
        renderTaskRef.current = task
        await task.promise
        if (active) setRendered(true)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'RenderingCancelledException') return
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void renderPage()
        }
      },
      { rootMargin: '400px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      active = false
      observer.disconnect()
      renderTaskRef.current?.cancel()
    }
  }, [pdfDoc, pageNo, scale])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && entries[0].intersectionRatio >= 0.4) {
          onVisible(pageNo)
        }
      },
      { threshold: [0.4] }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [pageNo, onVisible])

  const scaledWidth = Math.floor(pageSize.width * scale)
  const scaledHeight = Math.floor(pageSize.height * scale)

  return (
    <div
      id={`pdf-page-card-${pageNo}`}
      ref={containerRef}
      className="pdf-page-card"
      style={{
        width: scaledWidth,
        minHeight: scaledHeight,
      }}
    >
      <div className="pdf-page-card-header">
        <span className="pdf-page-card-num">Hal {pageNo}</span>
        <div className="pdf-page-card-actions">
          {status === 'done' ? (
            <>
              <span className="pdf-page-done-tag">
                <IconCheck size={11} /> Selesai
              </span>
              <button
                className="pdf-page-quick-transcribe-btn secondary"
                onClick={() => onTranscribe(pageNo)}
                title={`Transkripsi Ulang Halaman ${pageNo} ke Word`}
              >
                <IconSparkle size={11} /> Ulang
              </button>
            </>
          ) : status === 'transcribing' ? (
            <span className="pdf-page-transcribing-tag">
              <span className="spinner-mini" /> Memproses AI...
            </span>
          ) : status === 'error' ? (
            <>
              <span className="pdf-page-error-tag">
                ! Gagal
              </span>
              <button
                className="pdf-page-quick-transcribe-btn"
                onClick={() => onTranscribe(pageNo)}
                title={`Coba Lagi Transkripsi Halaman ${pageNo}`}
              >
                <IconSparkle size={11} /> Coba Lagi
              </button>
            </>
          ) : (
            <button
              className="pdf-page-quick-transcribe-btn"
              onClick={() => onTranscribe(pageNo)}
              title={`Transkripsikan Halaman ${pageNo} ke Word`}
            >
              <IconSparkle size={12} /> Transkripsi
            </button>
          )}
        </div>
      </div>

      <div className="pdf-page-canvas-wrapper" style={{ width: scaledWidth, height: scaledHeight, position: 'relative' }}>
        <canvas ref={canvasRef} className="pdf-page-canvas" />
        {!rendered && (
          <div className="pdf-page-card-skeleton" style={{ width: scaledWidth, height: scaledHeight }}>
            <span className="spinner-mini" />
            <span>Memuat Halaman {pageNo}...</span>
          </div>
        )}

        {/* Bi-Directional Spotlight Overlay - Filtered strictly to Target Page */}
        {showSpotlight && stagingStore.isOpen && stagingStore.pageNo === pageNo && stagingStore.lines.length > 0 && (
          <div
            className="pdf-page-spotlight-layer"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: scaledWidth,
              height: scaledHeight,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {stagingStore.lines.map((lineItem) => (
              <SpotlightOverlayBox
                key={lineItem.id}
                lineItem={lineItem}
                isSelected={lineItem.id === stagingStore.activeLineId}
                scaledWidth={scaledWidth}
                scaledHeight={scaledHeight}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function clampPanelWidth(width: number): number {
  const min = 320
  const max = Math.max(min, Math.floor(window.innerWidth * 0.75))
  return Math.min(max, Math.max(min, width))
}

export interface ManuscriberPdfExportState {
  pdfBuffer: ArrayBuffer
  fileName: string
  totalPages: number
  lastActivePage: number
  lastZoom: number
  pageStatuses: Record<number, PageStatus>
  pageErrors: Record<number, string>
  stagingState?: ManusProjectMetadata['stagingState']
}

export interface ManuscriberBridge {
  getPdfExportState: () => ManuscriberPdfExportState | null
  loadPdfFromBuffer: (
    pdfData: ArrayBuffer,
    fileName: string,
    initialMeta?: ManusProjectMetadata['pdf'] & { stagingState?: ManusProjectMetadata['stagingState'] },
  ) => Promise<void>
  markSaved?: () => void
}

export interface PdfViewerPanelProps {
  editor: Editor | null
  isOpen?: boolean
  onToggleOpen?: (open: boolean) => void
  bridgeRef?: React.MutableRefObject<ManuscriberBridge | null>
  initialPdf?: {
    buffer: ArrayBuffer
    name: string
    meta?: ManusProjectMetadata['pdf'] & { stagingState?: ManusProjectMetadata['stagingState'] }
  } | null
  onSaveProject?: () => void
  onSaveProjectAs?: () => void
  onOpenProjectFile?: (data: ArrayBuffer, name: string) => Promise<void>
  isProjectActive?: boolean
  isDocDirty?: boolean
}

export function PdfViewerPanel({
  editor,
  isOpen: externalIsOpen,
  onToggleOpen,
  bridgeRef,
  initialPdf,
  onSaveProject,
  onSaveProjectAs,
  onOpenProjectFile,
  isProjectActive,
  isDocDirty,
}: PdfViewerPanelProps) {
  const stagingStore = useManuscriberStagingStore()
  const [pdfDirty, setPdfDirty] = useState<boolean>(false)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)

  const isStagingDirty = manuscriberStagingStore.hasUnsavedChanges()
  const isProjectUnsaved = pdfDoc ? (isDocDirty === true || isStagingDirty || pdfDirty) : false

  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(true)
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = (v: boolean) => {
    setInternalIsOpen(v)
    onToggleOpen?.(v)
  }

  const preferredWidthRef = useRef<number>(520)
  const [panelWidth, setPanelWidth] = useState<number>(() => clampPanelWidth(preferredWidthRef.current))
  const [resizing, setResizing] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>('')
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageInputVal, setPageInputVal] = useState<string>('1')
  const [scale, setScale] = useState<number>(1.0)
  const [pageStatuses, setPageStatuses] = useState<Record<number, PageStatus>>({})
  const [pageErrors, setPageErrors] = useState<Record<number, string>>({})
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false)
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false)
  const [showRangeModal, setShowRangeModal] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false)
  const [showSpotlight, setShowSpotlight] = useState<boolean>(true)

  const rawPdfBufferRef = useRef<ArrayBuffer | null>(null)
  const cancelBatchRef = useRef<boolean>(false)
  const asideRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const currentRenderTaskRef = useRef<RenderTask | null>(null)

  // Pan & Drag state
  const [isPanning, setIsPanning] = useState<boolean>(false)
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
        setScale((prev) => Math.min(3.0, Math.max(0.3, Number((prev + delta).toFixed(2)))))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [pdfDoc])

  // Global mouse up for pan release
  useEffect(() => {
    const onGlobalMouseUp = () => setIsPanning(false)
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
  }, [])

  // Pan event handlers (Pointer Capture for free panning)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return
    const target = e.target as HTMLElement
    // Ignore interactive elements
    if (target.closest('button, input, textarea, a, .pdf-page-spotlight-overlay, .pdf-page-card-header')) {
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

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false)
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId)
        }
      } catch {}
    }
  }

  // Resizing logic matching .ai-dock
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    setResizing(true)
    const startX = e.clientX
    const startWidth = panelWidth
    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX
      const next = clampPanelWidth(startWidth + delta)
      preferredWidthRef.current = next
      setPanelWidth(next)
    }
    const onUp = () => {
      setResizing(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // Load PDF from ArrayBuffer with optional project metadata restoration
  const loadPdfData = useCallback(
    async (
      data: ArrayBuffer,
      name: string,
      initialMeta?: ManusProjectMetadata['pdf'] & { stagingState?: ManusProjectMetadata['stagingState'] },
    ) => {
      try {
        setLoadingPdf(true)
        currentRenderTaskRef.current?.cancel()

        // Keep a detached-safe copy because PDF.js transfers the buffer to its web worker
        const safeBufferCopy = data.slice(0)
        const workerData = data.slice(0)

        const doc = await getDocument({
          data: new Uint8Array(workerData),
          ...DOC_OPTS,
        }).promise

        rawPdfBufferRef.current = safeBufferCopy
        setPdfDoc(doc)
        setFileName(name)
        setNumPages(doc.numPages)
        const targetPage =
          initialMeta?.lastActivePage && initialMeta.lastActivePage <= doc.numPages
            ? initialMeta.lastActivePage
            : 1
        setCurrentPage(targetPage)
        setPageInputVal(String(targetPage))
        if (initialMeta?.lastZoom) {
          setScale(initialMeta.lastZoom)
        } else {
          // Default to Fit Page automatically on load
          setTimeout(() => {
            void handleFitPage(doc, targetPage)
          }, 80)
        }
        setPageStatuses(initialMeta?.pageStatuses || {})
        setPageErrors(initialMeta?.pageErrors || {})
        setPdfDirty(false)
        if (initialMeta?.stagingState) {
          manuscriberStagingStore.restoreFromState(initialMeta.stagingState)
        } else {
          manuscriberStagingStore.resetStaging()
        }
      } catch (err) {
        console.error('Failed to load PDF:', err)
        alert(`Gagal memuat file PDF: ${String(err)}`)
      } finally {
        setLoadingPdf(false)
      }
    },
    [],
  )

  // Sync bridge ref for external save/load coordination
  useEffect(() => {
    if (bridgeRef) {
      bridgeRef.current = {
        getPdfExportState: () => {
          if (!pdfDoc || !rawPdfBufferRef.current || rawPdfBufferRef.current.byteLength === 0) return null
          return {
            pdfBuffer: rawPdfBufferRef.current.slice(0),
            fileName,
            totalPages: numPages,
            lastActivePage: currentPage,
            lastZoom: scale,
            pageStatuses,
            pageErrors,
            stagingState: manuscriberStagingStore.toSerializableState(),
          }
        },
        loadPdfFromBuffer: (
          pdfData: ArrayBuffer,
          name: string,
          meta?: ManusProjectMetadata['pdf'] & { stagingState?: ManusProjectMetadata['stagingState'] },
        ) => {
          return loadPdfData(pdfData, name, meta)
        },
        markSaved: () => {
          setPdfDirty(false)
        },
      }
    }
  }, [
    bridgeRef,
    pdfDoc,
    fileName,
    numPages,
    currentPage,
    scale,
    pageStatuses,
    pageErrors,
    loadPdfData,
  ])

  // Sync page input value when page changes
  useEffect(() => {
    setPageInputVal(String(currentPage))
  }, [currentPage])

  // Automatically load initial PDF if passed from parent (e.g. project open)
  useEffect(() => {
    if (initialPdf && initialPdf.buffer && initialPdf.buffer.byteLength > 0) {
      void loadPdfData(initialPdf.buffer, initialPdf.name, initialPdf.meta)
    }
  }, [initialPdf, loadPdfData])

  // Automatically consume pending PDF if opened directly via Manuscriber
  useEffect(() => {
    let mounted = true
    window.desktop?.consumePendingPdf?.().then((res) => {
      if (!mounted || !res || !res.ok || !res.fileData || !res.name) return
      void loadPdfData(res.fileData, res.name)
    }).catch(() => { })
    return () => {
      mounted = false
    }
  }, [loadPdfData])

  // Pengingat berkala jika proyek aktif dan ada perubahan belum disimpan
  useEffect(() => {
    if (!isProjectUnsaved || !pdfDoc) return
    const timer = setInterval(() => {
      showToast(
        '⚠️ Proyek belum disimpan! Tekan Ctrl+S atau klik ikon Simpan Proyek untuk mengamankan naskah dan riwayat staging.',
        'warning',
      )
    }, 4 * 60 * 1000) // Pengingat setiap 4 menit
    return () => clearInterval(timer)
  }, [isProjectUnsaved, pdfDoc])

  const checkUnsavedBeforeAction = (): boolean => {
    if (isProjectUnsaved) {
      return window.confirm(
        'Perhatian: Proyek saat ini memiliki perubahan yang belum disimpan!\n\nApakah Anda yakin ingin membuka file lain tanpa menyimpan perubahan terlebih dahulu?'
      )
    }
    return true
  }

  // Native file picker (supports .pdf and .manus projects)
  const handlePickPdf = async () => {
    if (!checkUnsavedBeforeAction()) return
    try {
      if (window.desktop.pickPdf) {
        const res = await window.desktop.pickPdf()
        if (!res.canceled && res.fileData && res.name) {
          if (isManusProjectFile(res.name) && onOpenProjectFile) {
            await onOpenProjectFile(res.fileData, res.filePath || res.name)
          } else {
            await loadPdfData(res.fileData, res.name)
          }
        }
      }
    } catch {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.pdf,.manus,.manuscriber,.mnsproj'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const buf = await file.arrayBuffer()
          if (isManusProjectFile(file.name) && onOpenProjectFile) {
            const fullPath = (file as unknown as { path?: string }).path || file.name
            await onOpenProjectFile(buf, fullPath)
          } else {
            await loadPdfData(buf, file.name)
          }
        }
      }
      input.click()
    }
  }

  // Drag & drop directly into the panel
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (!checkUnsavedBeforeAction()) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      const isProject = isManusProjectFile(file.name)
      if (isProject && onOpenProjectFile) {
        const buf = await file.arrayBuffer()
        const fullPath = (file as unknown as { path?: string }).path || file.name
        await onOpenProjectFile(buf, fullPath)
      } else if (isPdf) {
        const buf = await file.arrayBuffer()
        await loadPdfData(buf, file.name)
      }
    }
  }

  // Jump to specific page
  const scrollToPage = useCallback((pageNo: number) => {
    const el = document.getElementById(`pdf-page-card-${pageNo}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const handleSelectPage = useCallback((pageNo: number) => {
    setCurrentPage(pageNo)
    scrollToPage(pageNo)
    if (editor) {
      scrollToWordPage(pageNo)
    }
  }, [scrollToPage, editor])

  // Sync PDF viewer viewport page automatically when staging store active pageNo changes
  useEffect(() => {
    if (stagingStore.isOpen && stagingStore.pageNo && stagingStore.pageNo !== currentPage) {
      handleSelectPage(stagingStore.pageNo)
    }
  }, [stagingStore.isOpen, stagingStore.pageNo, currentPage, handleSelectPage])

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInputVal, 10)
      if (!isNaN(page) && page >= 1 && page <= numPages) {
        handleSelectPage(page)
      } else {
        setPageInputVal(String(currentPage))
      }
    }
  }

  const handlePageInputBlur = () => {
    const page = parseInt(pageInputVal, 10)
    if (!isNaN(page) && page >= 1 && page <= numPages) {
      handleSelectPage(page)
    } else {
      setPageInputVal(String(currentPage))
    }
  }

  // Fit page calculation (fits page width & height within viewport)
  const handleFitPage = useCallback(
    async (doc?: PDFDocumentProxy | null, pageNo?: number) => {
      const targetDoc = doc || pdfDoc
      if (!targetDoc || !viewportRef.current) return
      try {
        const page = await targetDoc.getPage(pageNo || currentPage || 1)
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
          const targetScale = Math.min(3.0, Math.max(0.3, Number(Math.min(scaleX, scaleY).toFixed(2))))
          setScale(targetScale)
        }
      } catch (err) {
        console.warn('Fit page error:', err)
      }
    },
    [pdfDoc, currentPage],
  )

  // Fit width calculation
  const handleFitWidth = async () => {
    if (!pdfDoc || !viewportRef.current) return
    try {
      const page = await pdfDoc.getPage(currentPage || 1)
      const unscaledViewport = page.getViewport({ scale: 1.0 })
      const availableWidth = viewportRef.current.clientWidth - 48
      if (availableWidth > 100 && unscaledViewport.width > 0) {
        const targetScale = Math.min(3.0, Math.max(0.3, Number((availableWidth / unscaledViewport.width).toFixed(2))))
        setScale(targetScale)
      }
    } catch (err) {
      console.warn('Fit width error:', err)
    }
  }

  // Transcribe single page
  const handleTranscribePage = async (pageNo: number) => {
    if (!pdfDoc || !editor) return
    setPageStatuses((prev) => ({ ...prev, [pageNo]: 'transcribing' }))
    setPageErrors((prev) => ({ ...prev, [pageNo]: '' }))

    try {
      const page = await pdfDoc.getPage(pageNo)
      const vp = page.getViewport({ scale: 1.0 })
      const dataUrl = await capturePdfPageAsDataUrl(pdfDoc, pageNo, 2.0)
      const result = await transcribePageImage(dataUrl)

      if (!result.ok) {
        setPageStatuses((prev) => ({ ...prev, [pageNo]: 'error' }))
        setPageErrors((prev) => ({ ...prev, [pageNo]: result.error || 'Gagal mentranskripsi.' }))
        return
      }

      // Convert result to StagingLines with exact un-padded page width & height
      const stagingLines = parseTranscriptionToStagingLines(result.text, vp.width, vp.height)
      manuscriberStagingStore.setLines(stagingLines, pageNo)
      manuscriberStagingStore.setIsOpen(true)

      setPageStatuses((prev) => ({ ...prev, [pageNo]: 'done' }))
      setPdfDirty(true)
    } catch (err) {
      setPageStatuses((prev) => ({ ...prev, [pageNo]: 'error' }))
      setPageErrors((prev) => ({ ...prev, [pageNo]: String(err) }))
    }
  }


  // Batch transcribe by range
  const handleStartRangeTranscribe = async (pages: number[]) => {
    if (!pdfDoc || !editor || pages.length === 0 || isBatchRunning) return
    setIsBatchRunning(true)
    cancelBatchRef.current = false
    setShowRangeModal(false)

    for (let i = 0; i < pages.length; i++) {
      if (cancelBatchRef.current) break
      const page = pages[i]
      setCurrentPage(page)
      setBatchProgress({ current: i + 1, total: pages.length })
      await handleTranscribePage(page)
    }

    setIsBatchRunning(false)
    setBatchProgress(null)
  }

  // Batch transcribe all pages
  const handleBatchTranscribe = async () => {
    if (!pdfDoc || !editor || numPages === 0 || isBatchRunning) return
    setIsBatchRunning(true)
    cancelBatchRef.current = false

    for (let page = 1; page <= numPages; page++) {
      if (cancelBatchRef.current) break
      setCurrentPage(page)
      setBatchProgress({ current: page, total: numPages })
      await handleTranscribePage(page)
    }

    setIsBatchRunning(false)
    setBatchProgress(null)
  }

  const handleCancelBatch = () => {
    cancelBatchRef.current = true
    setIsBatchRunning(false)
    setBatchProgress(null)
  }

  const currentStatus = pageStatuses[currentPage] || 'idle'
  const currentError = pageErrors[currentPage]

  // If collapsed, render 34px vertical rail matching Genspark AI .ai-dock .ai-rail
  if (!isOpen) {
    return (
      <div className="ai-dock collapsed">
        <button
          className="ai-rail"
          data-tip="Buka Panel Manuscriber PDF"
          aria-label="Buka Panel Manuscriber PDF"
          onClick={() => setIsOpen(true)}
          title="Buka Panel Manuscriber PDF"
        >
          <IconManuscript size={18} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="ai-dock"
      style={{ '--ai-panel-width': `${panelWidth}px`, width: `${panelWidth}px` } as CSSProperties}
    >
      <aside
        ref={asideRef}
        className={`ai-panel ${resizing ? 'ai-panel-resizing' : ''}`}
        style={{ width: '100%' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Resizer on right edge */}
        <div
          className="ai-panel-resizer"
          onPointerDown={startResize}
          role="separator"
          aria-orientation="vertical"
          title="Tarik untuk mengatur lebar panel PDF"
        />

        {/* Top Header Toolbar - Identical to .ai-panel-header */}
        <div className="ai-panel-header">
          <span className="ai-panel-title">
            <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--colorBrandForeground1)' }}>
              <IconManuscript size={16} />
            </span>
            <span>Manuscriber</span>
            {pdfDoc && (
              <span className="manuscriber-filename" title={fileName}>
                {fileName}
              </span>
            )}
          </span>

          <div className="ai-panel-header-actions">
            {pdfDoc && (
              <>
                {/* Range Transcribe Button (Icon only with clean tooltip) */}
                <button
                  className={`manuscriber-btn-icon-highlight ${isBatchRunning ? 'running' : ''}`}
                  onClick={isBatchRunning ? handleCancelBatch : () => setShowRangeModal(true)}
                  title={
                    isBatchRunning
                      ? `Batalkan Transkripsi Rentang Halaman (${batchProgress?.current}/${batchProgress?.total})`
                      : 'Transkripsi Berdasarkan Rentang Halaman (Range Transcribe)'
                  }
                  aria-label="Transkripsi Rentang Halaman"
                >
                  {isBatchRunning ? (
                    <>
                      <span className="spinner-mini" />
                      <span className="badge-count">{batchProgress?.current}/{batchProgress?.total}</span>
                    </>
                  ) : (
                    <IconFlash size={14} />
                  )}
                </button>

                {/* Open / Change PDF */}
                <button
                  className="ai-header-btn"
                  onClick={handlePickPdf}
                  title="Pilih / Buka File PDF atau Proyek .manus"
                  aria-label="Pilih File PDF"
                >
                  <IconFolderOpen size={15} />
                </button>

                {/* Toggle Thumbnails */}
                <button
                  className={`ai-header-btn ${showThumbnails ? 'active' : ''}`}
                  onClick={() => setShowThumbnails(!showThumbnails)}
                  title="Tampilkan / Sembunyikan Navigasi Halaman"
                  aria-label="Navigasi Halaman"
                >
                  <IconDocumentBulletList size={15} />
                </button>
              </>
            )}

            {/* AI Vision Settings */}
            <button
              className="ai-header-btn"
              onClick={() => setShowSettingsModal(true)}
              title="Pengaturan Vision AI & Model Endpoint"
              aria-label="Pengaturan Vision AI"
            >
              <IconSettings size={15} />
            </button>

            {/* Collapse panel button */}
            <button
              className="ai-header-btn"
              onClick={() => setIsOpen(false)}
              title="Ciutkan Panel Manuscriber"
              aria-label="Ciutkan Panel Manuscriber"
            >
              <IconSidebarCollapse size={15} />
            </button>
          </div>
        </div>

        {/* Main Workspace Body */}
        <div className="manuscriber-body">
          {!pdfDoc ? (
            /* Dropzone / Upload State */
            <div
              className={`manuscriber-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="manuscriber-drop-card">
                <div className="manuscriber-drop-icon" style={{ color: 'var(--colorBrandForeground1)' }}>
                  <IconManuscript size={44} />
                </div>
                <h3>Mulai Proyek Manuscriber</h3>
                <p>
                  Buka file PDF naskah untuk memulai transkripsi baru, atau buka file proyek <strong>.manus</strong> yang sudah pernah Anda simpan.
                </p>
                <div className="manuscriber-drop-actions">
                  <button
                    className="manuscriber-upload-btn primary"
                    onClick={handlePickPdf}
                    disabled={loadingPdf}
                  >
                    {loadingPdf ? (
                      <>
                        <span className="spinner-mini" /> Memuat File...
                      </>
                    ) : (
                      <>
                        <IconFolderOpen size={15} /> Buka PDF (Mulai Proyek Baru)
                      </>
                    )}
                  </button>
                  <button
                    className="manuscriber-upload-btn secondary"
                    onClick={handlePickPdf}
                    disabled={loadingPdf}
                  >
                    <IconSave size={15} /> Buka Proyek (.manus)
                  </button>
                </div>
                <div className="manuscriber-guide-box">
                  <strong>💡 Cara Kerja Proyek Manuscriber:</strong>
                  <ol>
                    <li>Buka PDF naskah yang ingin ditranskripsikan.</li>
                    <li>Transkripsikan halaman per halaman dengan tombol AI.</li>
                    <li>Klik <strong>Simpan Proyek</strong> di toolbar atas untuk menyimpan PDF dan dokumen Word sekaligus ke dalam satu file <strong>.manus</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            /* Active PDF Paginated View */
            <div className="manuscriber-layout">
              {/* Visual Thumbnail Sidebar */}
              {showThumbnails && (
                <div className="manuscriber-sidebar">
                  <div className="manuscriber-sidebar-title">Daftar Hal ({numPages})</div>
                  <div className="manuscriber-thumbnails">
                    {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                      <PdfThumbnailItem
                        key={p}
                        pdfDoc={pdfDoc}
                        pageNo={p}
                        isActive={currentPage === p}
                        status={pageStatuses[p] || 'idle'}
                        onClick={() => handleSelectPage(p)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Main Continuous Canvas Area */}
              <div className="manuscriber-preview-container">
                {/* Dismissible Clean Error Toast Banner */}
                {currentError && (
                  <div className="pdf-page-error-banner">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">
                      {currentError.length > 200
                        ? `${currentError.slice(0, 200)}...`
                        : currentError}
                    </span>
                    <button
                      className="error-dismiss-btn"
                      onClick={() => setPageErrors((prev) => ({ ...prev, [currentPage]: '' }))}
                      title="Tutup Pesan Error"
                    >
                      ✕
                    </button>
                  </div>
                )}

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
                    {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                      <PdfPageCard
                        key={p}
                        pdfDoc={pdfDoc}
                        pageNo={p}
                        scale={scale}
                        status={pageStatuses[p] || 'idle'}
                        showSpotlight={showSpotlight}
                        onTranscribe={handleTranscribePage}
                        onVisible={(visiblePage) => {
                          setCurrentPage(visiblePage)
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Bottom Status Bar (Matching Word Editor Bottom Bar) */}
                <footer className="manuscriber-statusbar">
                  <div className="manuscriber-statusbar-left">
                    <button
                      className="manuscriber-statusbar-nav-btn"
                      disabled={currentPage <= 1}
                      onClick={() => handleSelectPage(Math.max(1, currentPage - 1))}
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
                      <span>dari {numPages}</span>
                    </div>
                    <button
                      className="manuscriber-statusbar-nav-btn"
                      disabled={currentPage >= numPages}
                      onClick={() => handleSelectPage(Math.min(numPages, currentPage + 1))}
                      title="Halaman Berikutnya"
                      aria-label="Berikutnya"
                    >
                      <IconChevronRight size={12} />
                    </button>

                    {/* Status Tersimpan / Belum Disimpan di Bawah PDF Reader */}
                    {isProjectUnsaved ? (
                      <span
                        className="manuscriber-status-chip manuscriber-unsaved-chip"
                        title="Ada perubahan naskah/staging yang belum disimpan (Gunakan tombol Simpan Proyek di Ribbon atau Ctrl+S)"
                        style={{ marginLeft: 8 }}
                      >
                        <span className="unsaved-dot" />
                        Belum Disimpan
                      </span>
                    ) : (
                      <span
                        className="manuscriber-status-chip manuscriber-saved-chip"
                        title="Seluruh perubahan naskah & staging telah tersimpan ke disk"
                        style={{ marginLeft: 8 }}
                      >
                        ✓ Tersimpan
                      </span>
                    )}

                    {/* Tombol Toggle Spotlight Sorotan */}
                    <button
                      type="button"
                      className={`manuscriber-statusbar-nav-btn ${showSpotlight ? 'active' : ''}`}
                      onClick={() => setShowSpotlight((v) => !v)}
                      title={showSpotlight ? 'Sembunyikan layer sorotan spotlight naskah' : 'Tampilkan layer sorotan spotlight naskah'}
                      style={{
                        marginLeft: 6,
                        padding: '1px 7px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 3,
                        cursor: 'pointer',
                        background: showSpotlight ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                        color: showSpotlight ? '#d97706' : 'var(--colorNeutralForeground3, #888)',
                        border: showSpotlight ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                      }}
                    >
                      <span style={{ fontSize: 12 }}>💡</span>
                    </button>
                  </div>
                  <div className="manuscriber-statusbar-right">
                    <button
                      className="zoom-btn"
                      onClick={() => setScale((s) => Math.max(0.3, Number((s - 0.1).toFixed(2))))}
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
                      value={Math.round(scale * 100)}
                      onChange={(e) => setScale(Number((Number(e.target.value) / 100).toFixed(2)))}
                      title={`Zoom: ${Math.round(scale * 100)}%`}
                      aria-label="Zoom slider"
                    />
                    <button
                      className="zoom-btn"
                      onClick={() => setScale((s) => Math.min(3.0, Number((s + 0.1).toFixed(2))))}
                      title="Perbesar (Zoom In)"
                      aria-label="Perbesar"
                    >
                      +
                    </button>
                    <button
                      className="zoom-val-btn"
                      onClick={() => setScale(1.0)}
                      title="Klik untuk reset zoom ke 100%"
                      aria-label="Reset zoom"
                    >
                      {Math.round(scale * 100)}%
                    </button>
                    <button
                      className="fit-btn"
                      onClick={() => void handleFitPage()}
                      title="Sesuaikan Halaman Penuh (Fit Page)"
                      aria-label="Fit Page"
                    >
                      <IconFitPage size={13} />
                    </button>
                    <button
                      className="fit-btn"
                      onClick={handleFitWidth}
                      title="Sesuaikan Lebar Halaman (Fit Width)"
                      aria-label="Fit Width"
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '0 2px' }}>↔</span>
                    </button>
                  </div>
                </footer>
              </div>
            </div>
          )}
        </div>

        {/* Batch Processing Modal */}
        {isBatchRunning && batchProgress && (
          <div className="manuscriber-batch-overlay">
            <div className="manuscriber-batch-modal">
              <div className="batch-spinner" />
              <h4>Mentranskripsikan Halaman {batchProgress.current} dari {batchProgress.total}</h4>
              <p>Vision AI sedang membaca naskah dan memasukkan teks langsung ke Word...</p>
              <div className="batch-progress-bar">
                <div
                  className="batch-progress-fill"
                  style={{
                    width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                  }}
                />
              </div>
              <button className="batch-cancel-btn" onClick={handleCancelBatch}>
                Batalkan
              </button>
            </div>
          </div>
        )}

        {/* Vision AI Settings Modal */}
        {showSettingsModal && (
          <VisionSettingsModal onClose={() => setShowSettingsModal(false)} />
        )}

        {/* Range Transcribe Modal */}
        {showRangeModal && (
          <RangeTranscribeModal
            numPages={numPages}
            currentPage={currentPage}
            onClose={() => setShowRangeModal(false)}
            onStart={handleStartRangeTranscribe}
          />
        )}
      </aside>
    </div>
  )
}

function parsePageRange(start: number, end: number, maxPages: number): number[] {
  const s = Math.max(1, Math.min(start, maxPages))
  const e = Math.max(1, Math.min(end, maxPages))
  const from = Math.min(s, e)
  const to = Math.max(s, e)
  const pages: number[] = []
  for (let i = from; i <= to; i++) {
    pages.push(i)
  }
  return pages
}

interface RangeTranscribeModalProps {
  numPages: number
  currentPage: number
  onClose: () => void
  onStart: (pages: number[]) => void
}

function RangeTranscribeModal({
  numPages,
  currentPage,
  onClose,
  onStart,
}: RangeTranscribeModalProps) {
  const [startPage, setStartPage] = useState<number>(currentPage || 1)
  const [endPage, setEndPage] = useState<number>(Math.min(currentPage + 4, numPages || 1))

  const pages = useMemo(() => {
    return parsePageRange(startPage, endPage, numPages)
  }, [startPage, endPage, numPages])

  const setPreset = (start: number, end: number) => {
    setStartPage(Math.max(1, Math.min(start, numPages)))
    setEndPage(Math.max(1, Math.min(end, numPages)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pages.length > 0) {
      onStart(pages)
    }
  }

  return (
    <div className="manuscriber-batch-overlay" onClick={onClose}>
      <div className="manuscriber-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--colorBrandForeground1)' }}>
            <IconFlash size={15} />
            <h4 style={{ color: 'var(--text, var(--colorNeutralForeground1))' }}>Transkripsi Berdasarkan Rentang Halaman</h4>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Tutup">
            <IconClose size={12} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="range-inputs-row">
              <label>
                <span>Dari Halaman:</span>
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={startPage}
                  onChange={(e) => setStartPage(Number(e.target.value) || 1)}
                  required
                />
              </label>
              <label>
                <span>Sampai Halaman:</span>
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={endPage}
                  onChange={(e) => setEndPage(Number(e.target.value) || 1)}
                  required
                />
              </label>
            </div>

            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                Pilihan Cepat (Presets):
              </span>
              <div className="range-quick-presets">
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => setPreset(currentPage, currentPage)}
                >
                  Halaman Aktif ({currentPage})
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => setPreset(currentPage, Math.min(currentPage + 4, numPages))}
                >
                  5 Hal ke Depan ({currentPage} - {Math.min(currentPage + 4, numPages)})
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => setPreset(currentPage, Math.min(currentPage + 9, numPages))}
                >
                  10 Hal ke Depan ({currentPage} - {Math.min(currentPage + 9, numPages)})
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => setPreset(1, numPages)}
                >
                  Semua Halaman (1 - {numPages})
                </button>
              </div>
            </div>

            <div className="range-summary">
              <IconDocumentPdf size={16} />
              <span>
                Akan mentranskripsikan <strong>{pages.length} halaman</strong> (Hal {Math.min(startPage, endPage)} s.d {Math.max(startPage, endPage)}) ke dokumen Word.
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-save" disabled={pages.length === 0}>
              Mulai Transkripsi ({pages.length} Hal)
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function VisionSettingsModal({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<VisionProviderConfig>(getVisionConfig)
  const [activeTab, setActiveTab] = useState<'connection' | 'prompt'>('connection')
  const [selectedPreset, setSelectedPreset] = useState<string>(config.activePreset || 'matanSyarah')
  const [saved, setSaved] = useState(false)
  const [modelList, setModelList] = useState<string[]>(config.cachedModels || [])
  const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false)
  const [fetchStatus, setFetchStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [isManualModel, setIsManualModel] = useState<boolean>(false)

  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId)
    const found = PROMPT_PRESETS[presetId]
    if (found) {
      setConfig((c) => ({
        ...c,
        userPrompt: found.prompt,
        activePreset: presetId,
      }))
    }
  }

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setConfig((c) => ({
      ...c,
      userPrompt: val,
      activePreset: 'custom',
    }))
    setSelectedPreset('custom')
  }

  const handleResetPrompt = () => {
    handleApplyPreset('matanSyarah')
  }

  const handleCheckApiAndFetchModels = async () => {
    if (!config.baseUrl || !config.apiKey) {
      setFetchStatus({
        success: false,
        message: 'Harap isi Endpoint Base URL dan API Key terlebih dahulu.',
      })
      return
    }

    setIsFetchingModels(true)
    setFetchStatus(null)

    try {
      const desktopApi = (window as any).desktop
      if (desktopApi?.fetchVisionModels) {
        const res = await desktopApi.fetchVisionModels({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
        })

        if (res.ok && res.models && res.models.length > 0) {
          setModelList(res.models)
          const matchedModel = config.model && res.models.includes(config.model)
            ? config.model
            : res.models.find((m: string) => m.includes('seed') || m.includes('flash') || m.includes('vision') || m.includes('mini')) || res.models[0]

          setConfig((c) => ({
            ...c,
            cachedModels: res.models,
            model: matchedModel,
          }))
          setFetchStatus({
            success: true,
            message: `✓ Terhubung! Berhasil memuat ${res.models.length} model. Silakan pilih dari dropdown di bawah.`,
          })
        } else {
          setFetchStatus({
            success: false,
            message: res.error || 'Gagal memuat daftar model dari endpoint.',
          })
        }
      } else {
        // Fallback for direct browser fetch
        const url = `${config.baseUrl.replace(/\/+$/, '')}/models`
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        })
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`)
        }
        const json = await r.json()
        const models = Array.isArray(json.data)
          ? json.data.map((m: any) => typeof m === 'string' ? m : m.id).filter(Boolean)
          : []
        if (models.length > 0) {
          models.sort((a: string, b: string) => a.localeCompare(b))
          setModelList(models)
          setConfig((c) => ({ ...c, cachedModels: models }))
          setFetchStatus({
            success: true,
            message: `✓ Terhubung! Berhasil memuat ${models.length} model.`,
          })
        } else {
          throw new Error('Tidak ada model dalam respons API.')
        }
      }
    } catch (err: any) {
      setFetchStatus({
        success: false,
        message: `Koneksi gagal: ${err.message || String(err)}`,
      })
    } finally {
      setIsFetchingModels(false)
    }
  }

  const handleSave = () => {
    saveVisionConfig({
      ...config,
      activePreset: selectedPreset,
      cachedModels: modelList.length > 0 ? modelList : config.cachedModels,
    })
    setSaved(true)
    setTimeout(() => {
      onClose()
    }, 600)
  }

  return (
    <div className="manuscriber-batch-overlay" onClick={onClose}>
      <div className="manuscriber-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--colorBrandForeground1)' }}>
            <IconSettings size={15} />
            <h4 style={{ color: 'var(--text, var(--colorNeutralForeground1))' }}>Pengaturan Vision AI Manuscriber</h4>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Tutup">
            <IconClose size={12} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="vision-modal-tabs">
          <button
            type="button"
            className={`vision-tab-btn ${activeTab === 'connection' ? 'active' : ''}`}
            onClick={() => setActiveTab('connection')}
          >
            Koneksi & Model
          </button>
          <button
            type="button"
            className={`vision-tab-btn ${activeTab === 'prompt' ? 'active' : ''}`}
            onClick={() => setActiveTab('prompt')}
          >
            Struktur Naskah & Prompt
          </button>
        </div>

        {/* Tab 1: Connection & Model */}
        {activeTab === 'connection' && (
          <div className="modal-body">
            <label>
              <span>Endpoint Base URL:</span>
              <input
                type="text"
                value={config.baseUrl}
                placeholder="https://ai.sumopod.com/v1"
                onChange={(e) => setConfig((c) => ({ ...c, baseUrl: e.target.value }))}
              />
            </label>
            <label>
              <span>API Key:</span>
              <input
                type="password"
                value={config.apiKey}
                placeholder="sk-..."
                onChange={(e) => setConfig((c) => ({ ...c, apiKey: e.target.value }))}
              />
            </label>

            {/* Check API & Fetch Models Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '2px 0 4px 0' }}>
              <button
                type="button"
                className="btn-check-api"
                onClick={handleCheckApiAndFetchModels}
                disabled={isFetchingModels || !config.baseUrl || !config.apiKey}
              >
                {isFetchingModels ? (
                  <>
                    <span className="spinner-mini" style={{ width: 12, height: 12 }} />
                    <span>Menghubungi Penyedia AI & Memuat Model...</span>
                  </>
                ) : (
                  <>
                    <IconFlash size={13} />
                    <span>Cek API & Ambil Daftar Model</span>
                  </>
                )}
              </button>

              {fetchStatus && (
                <div className={`api-status-badge ${fetchStatus.success ? 'success' : 'error'}`}>
                  {fetchStatus.message}
                </div>
              )}
            </div>

            {/* Model Selection: Dropdown or Manual */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>Model Vision:</span>
                {modelList.length > 0 && (
                  <button
                    type="button"
                    className="btn-reset-prompt"
                    onClick={() => setIsManualModel(!isManualModel)}
                    title="Beralih antara pilihan dropdown atau input manual"
                  >
                    {isManualModel ? 'Pilih dari Dropdown' : '+ Input Manual'}
                  </button>
                )}
              </div>

              {modelList.length > 0 && !isManualModel ? (
                <select
                  className="vision-model-select"
                  value={modelList.includes(config.model) ? config.model : '__custom__'}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsManualModel(true)
                    } else {
                      setConfig((c) => ({ ...c, model: e.target.value }))
                    }
                  }}
                >
                  {!modelList.includes(config.model) && (
                    <option value="__custom__">
                      Model Saat Ini: {config.model || '(Belum dipilih)'}
                    </option>
                  )}
                  {modelList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={config.model}
                  placeholder="Contoh: seed-2-0-mini"
                  onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
                />
              )}
              {modelList.length === 0 && (
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  💡 Klik tombol <strong>"Cek API & Ambil Daftar Model"</strong> di atas untuk memuat daftar model otomatis.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Prompt & Layout Presets */}
        {activeTab === 'prompt' && (
          <div className="modal-body">
            <div className="vision-presets-bar">
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Preset Naskah:</span>
              {Object.values(PROMPT_PRESETS).map((p: PromptPresetItem) => (
                <button
                  key={p.id}
                  type="button"
                  className={`preset-chip ${selectedPreset === p.id ? 'active' : ''}`}
                  onClick={() => handleApplyPreset(p.id)}
                  title={p.description}
                >
                  {p.title}
                </button>
              ))}
            </div>

            <div className="vision-prompt-toolbar">
              <span>{PROMPT_PRESETS[selectedPreset]?.description || 'Instruksi khusus tahqiq naskah pengguna'}</span>
              <button
                type="button"
                className="btn-reset-prompt"
                onClick={handleResetPrompt}
                title="Kembalikan prompt ke standar default"
              >
                Reset ke Default
              </button>
            </div>

            <textarea
              className="vision-prompt-textarea"
              value={config.userPrompt ?? DEFAULT_USER_PROMPT}
              onChange={handlePromptChange}
              placeholder="Ketik instruksi tata letak atau kaidah tahqiq khusus di sini..."
              rows={8}
            />

            <div className="vision-system-rules-banner">
              <div>
                <strong>🛡️ Aturan Spotlight & Bounding Box (Otomatis Dikunci Sistem)</strong>
              </div>
              <div>
                Format tag <code>[[BLOCK: type=..., bbox=[ymin,xmin,ymax,xmax]]]</code> dan koordinat 0–1000 selalu disematkan otomatis di akhir prompt oleh sistem agar penyorot halaman PDF tetap presisi.
              </div>
            </div>
          </div>
        )}

        <div className="modal-footer">
          {saved && <span className="save-success">✓ Tersimpan!</span>}
          <button className="btn-cancel" onClick={onClose}>
            Batal
          </button>
          <button className="btn-save" onClick={handleSave}>
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  )
}

