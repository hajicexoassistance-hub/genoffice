import React, { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PdfCoordinates, TashihAnnotation } from '../types'
import {
  FluentLayers,
  FluentTarget,
  FluentLink,
  FluentUnlink,
  FluentDismiss,
  FluentZoomIn,
  FluentZoomOut,
  FluentZoomFit,
  FluentWarning,
  FluentDocumentPdf,
  FluentArrowUpload,
  FluentPrint,
  FluentHand,
  FluentSelectSquare,
} from '../TashihFluentIcons'
import type { DomainPreset } from '../types'
import { NewMarkerModal } from './NewMarkerModal'
import type { NewMarkerDraftData, MarkerFormData } from './NewMarkerModal'

interface Props {
  currentPage: number
  rotationDegree: number
  overlayMode: boolean
  overlayOpacity: number
  masterZoomScale: number
  scanZoomScale: number
  onMasterZoomChange: (newScale: number) => void
  onScanZoomChange: (newScale: number) => void
  isZoomSynced?: boolean
  onToggleZoomSync?: () => void
  pdfDocument?: PDFDocumentProxy | null
  masterPdfDocument?: PDFDocumentProxy | null
  scanPdfDocument?: PDFDocumentProxy | null
  activeVendorName?: string
  onSelectScanPdfFile?: (file: File) => void
  onSelectMasterPdfFile?: (file: File) => void
  annotations: TashihAnnotation[]
  selectedAnnotationId: string | null
  onSelectAnnotation: (id: string | null) => void
  onUpdateCoordinates: (
    target: 'master' | 'scan',
    coords: PdfCoordinates,
    cropDataUrl?: string
  ) => void
  onDeleteAnnotation?: (id: string) => void
  onMirrorCoordinates?: (id: string) => void
  onMasterCanvasReady?: (canvas: HTMLCanvasElement) => void
  onScanCanvasReady?: (canvas: HTMLCanvasElement) => void
  activeMarkingTarget?: 'master' | 'scan' | null
  domainPreset?: DomainPreset
  activeVendorId?: string
  onSaveNewAnnotationWithForm?: (
    target: 'master' | 'scan',
    coords: PdfCoordinates,
    cropDataUrl: string | undefined,
    formData: MarkerFormData
  ) => void
}

const BASE_PAGE_W = 595
const BASE_PAGE_H = 842
const PDF_POINTS_W = 595.28
const PDF_POINTS_H = 841.89

export function ComparisonViewport({
  currentPage,
  rotationDegree,
  overlayMode,
  overlayOpacity,
  masterZoomScale,
  scanZoomScale,
  onMasterZoomChange,
  onScanZoomChange,
  isZoomSynced = false,
  onToggleZoomSync,
  pdfDocument,
  masterPdfDocument,
  scanPdfDocument,
  activeVendorName,
  onSelectScanPdfFile,
  onSelectMasterPdfFile,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onUpdateCoordinates,
  onDeleteAnnotation,
  onMirrorCoordinates,
  onMasterCanvasReady,
  onScanCanvasReady,
  domainPreset = 'mushaf',
  activeVendorId,
  onSaveNewAnnotationWithForm,
}: Props) {
  const masterScrollRef = useRef<HTMLDivElement>(null)
  const scanScrollRef = useRef<HTMLDivElement>(null)
  const isSyncingScroll = useRef(false)

  const masterCanvasRef = useRef<HTMLCanvasElement>(null)
  const scanCanvasRef = useRef<HTMLCanvasElement>(null)
  const masterFileInputRef = useRef<HTMLInputElement>(null)
  const scanFileInputRef = useRef<HTMLInputElement>(null)

  // Mode Interaksi Dokumen: Secara DEFAULT adalah 'pan' (bebas geser & zoom). 'marker' untuk menarik kotak penanda.
  const [viewportMode, setViewportMode] = useState<'pan' | 'marker'>('pan')
  const [pendingDraft, setPendingDraft] = useState<NewMarkerDraftData | null>(null)

  // Pan Transform Offset Bebas (x, y) per panel
  const [masterPanOffset, setMasterPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [scanPanOffset, setScanPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isMouseDownPanning, setIsMouseDownPanning] = useState(false)

  // Pan State Tracker Ref
  const panStartRef = useRef<{
    isPanning: boolean
    startX: number
    startY: number
    startMasterX: number
    startMasterY: number
    startScanX: number
    startScanY: number
    panel: 'master' | 'scan'
  }>({
    isPanning: false,
    startX: 0,
    startY: 0,
    startMasterX: 0,
    startMasterY: 0,
    startScanX: 0,
    startScanY: 0,
    panel: 'master',
  })

  // Drag states per panel (Marker Bounding Box)
  const [draggingPanel, setDraggingPanel] = useState<'master' | 'scan' | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null)

  const selectedAnnotation = annotations.find((a) => a.annotation_id === selectedAnnotationId)
  const isPanActive = viewportMode === 'pan'

  // Global window listener untuk kelancaran Panning tanpa putus saat kursor keluar elemen
  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      if (!panStartRef.current.isPanning) return
      const dx = e.clientX - panStartRef.current.startX
      const dy = e.clientY - panStartRef.current.startY

      if (isZoomSynced) {
        setMasterPanOffset({
          x: Math.round(panStartRef.current.startMasterX + dx),
          y: Math.round(panStartRef.current.startMasterY + dy),
        })
        setScanPanOffset({
          x: Math.round(panStartRef.current.startScanX + dx),
          y: Math.round(panStartRef.current.startScanY + dy),
        })
      } else {
        if (panStartRef.current.panel === 'master') {
          setMasterPanOffset({
            x: Math.round(panStartRef.current.startMasterX + dx),
            y: Math.round(panStartRef.current.startMasterY + dy),
          })
        } else {
          setScanPanOffset({
            x: Math.round(panStartRef.current.startScanX + dx),
            y: Math.round(panStartRef.current.startScanY + dy),
          })
        }
      }
    }

    const onWindowMouseUp = () => {
      if (panStartRef.current.isPanning) {
        panStartRef.current.isPanning = false
        setIsMouseDownPanning(false)
      }
    }

    window.addEventListener('mousemove', onWindowMouseMove)
    window.addEventListener('mouseup', onWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove)
      window.removeEventListener('mouseup', onWindowMouseUp)
    }
  }, [isZoomSynced])

  // Keyboard shortcut listener:
  // - Spasi SEKALI: Toggle antara mode Pan dan mode Penanda
  // - Delete/Backspace: Hapus anotasi terpilih
  // - Escape: Batal draft atau batal pilih
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return
      }

      // Spasi SEKALI untuk beralih mode interaksi (Toggle Pan <-> Marker)
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        setViewportMode((prev) => (prev === 'pan' ? 'marker' : 'pan'))
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId && onDeleteAnnotation) {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          onDeleteAnnotation(selectedAnnotationId)
        }
      } else if (e.key === 'Escape') {
        if (pendingDraft) {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          setPendingDraft(null)
        } else if (selectedAnnotationId) {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          onSelectAnnotation(null)
        }
      }
    }

    // Gunakan capture: true agar tertangkap lebih awal sebelum didengar oleh window keyNav App.tsx
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [selectedAnnotationId, onDeleteAnnotation, onSelectAnnotation, pendingDraft])

  // Wheel Zoom Listener Mandiri (Ctrl + Wheel per masing-masing panel)
  useEffect(() => {
    const handleMasterWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        onMasterZoomChange(masterZoomScale + delta)
      }
    }

    const handleScanWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        onScanZoomChange(scanZoomScale + delta)
      }
    }

    const masterEl = masterScrollRef.current
    const scanEl = scanScrollRef.current

    masterEl?.addEventListener('wheel', handleMasterWheel, { passive: false })
    scanEl?.addEventListener('wheel', handleScanWheel, { passive: false })

    return () => {
      masterEl?.removeEventListener('wheel', handleMasterWheel)
      scanEl?.removeEventListener('wheel', handleScanWheel)
    }
  }, [masterZoomScale, scanZoomScale, onMasterZoomChange, onScanZoomChange])

  // Render Page to Canvas (Supersampled 2x Retina Clarity from Real PDF Documents)
  useEffect(() => {
    let isCancelled = false

    const renderSurface = async (
      canvas: HTMLCanvasElement | null,
      isScan: boolean,
      callback?: (c: HTMLCanvasElement) => void
    ) => {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const targetDoc = isScan ? scanPdfDocument : (masterPdfDocument || pdfDocument)

      // 1. Render Berkas PDF Nyata via PDF.js jika tersedia
      if (targetDoc && currentPage <= targetDoc.numPages) {
        try {
          const page = await targetDoc.getPage(currentPage)
          if (isCancelled) return

          // Render pada scale 2.0 untuk ketajaman retina (tidak pecah saat di-zoom 200%)
          const viewport = page.getViewport({ scale: 2.0 })
          canvas.width = viewport.width
          canvas.height = viewport.height

          // @ts-expect-error PDF.js render options
          await page.render({ canvasContext: ctx, viewport }).promise
          if (callback && !isCancelled) callback(canvas)
          return
        } catch (err) {
          console.warn('[tashih] Gagal render halaman PDF nyata:', err)
        }
      }

      // 2. Render Permukaan Kertas Bersih (Clean Surface tanpa mock garis)
      const dpr = 2
      canvas.width = BASE_PAGE_W * dpr
      canvas.height = BASE_PAGE_H * dpr

      ctx.save()
      ctx.scale(dpr, dpr)

      // Kertas naskah
      ctx.fillStyle = isScan ? '#fcfbf7' : '#ffffff'
      ctx.fillRect(0, 0, BASE_PAGE_W, BASE_PAGE_H)

      // Garis tepi / margin acuan
      ctx.strokeStyle = isScan ? '#e5e1d8' : '#e8e8e8'
      ctx.lineWidth = 1
      ctx.strokeRect(30, 30, BASE_PAGE_W - 60, BASE_PAGE_H - 60)

      // Header naskah
      ctx.fillStyle = '#666666'
      ctx.font = '12px system-ui, -apple-system, sans-serif'
      ctx.fillText(
        isScan ? `HASIL CETAK: ${activeVendorName || 'VENDOR'}` : `MASTER LAYOUT PENERBIT`,
        40,
        50
      )

      // Pesan status di tengah halaman
      ctx.fillStyle = '#888888'
      ctx.textAlign = 'center'

      if (targetDoc && currentPage > targetDoc.numPages) {
        ctx.font = '13px system-ui, -apple-system, sans-serif'
        ctx.fillText(
          `Halaman ${currentPage} melebihi batas berkas (${targetDoc.numPages} halaman).`,
          BASE_PAGE_W / 2,
          BASE_PAGE_H / 2
        )
      } else {
        ctx.font = '13px system-ui, -apple-system, sans-serif'
        ctx.fillText(
          isScan ? 'Berkas PDF Scan Belum Dimuat' : 'Berkas Master PDF Belum Dimuat',
          BASE_PAGE_W / 2,
          BASE_PAGE_H / 2 - 10
        )
        ctx.font = '11px system-ui, -apple-system, sans-serif'
        ctx.fillText(
          isScan
            ? 'Pilih berkas PDF hasil scan dari percetakan untuk ditelaah.'
            : 'Pilih berkas Master PDF acuan penerbit dari komputer.',
          BASE_PAGE_W / 2,
          BASE_PAGE_H / 2 + 12
        )
      }

      ctx.restore()

      if (callback && !isCancelled) callback(canvas)
    }

    renderSurface(masterCanvasRef.current, false, onMasterCanvasReady)
    renderSurface(scanCanvasRef.current, true, onScanCanvasReady)

    return () => {
      isCancelled = true
    }
  }, [
    currentPage,
    pdfDocument,
    masterPdfDocument,
    scanPdfDocument,
    activeVendorName,
    onMasterCanvasReady,
    onScanCanvasReady,
  ])

  // Sinkronisasi Scroll Proporsional
  const handleScroll = (source: 'master' | 'scan') => {
    if (isSyncingScroll.current) return
    isSyncingScroll.current = true

    const sourceEl = source === 'master' ? masterScrollRef.current : scanScrollRef.current
    const targetEl = source === 'master' ? scanScrollRef.current : masterScrollRef.current

    if (sourceEl && targetEl) {
      const maxScrollSource = sourceEl.scrollHeight - sourceEl.clientHeight
      const maxScrollTarget = targetEl.scrollHeight - targetEl.clientHeight
      if (maxScrollSource > 0 && maxScrollTarget > 0) {
        const ratio = sourceEl.scrollTop / maxScrollSource
        targetEl.scrollTop = ratio * maxScrollTarget
      }
    }

    requestAnimationFrame(() => {
      isSyncingScroll.current = false
    })
  }

  // Mouse Handlers untuk Drag Bounding Box & Pan Canvas
  const handleMouseDown = (panel: 'master' | 'scan', e: React.MouseEvent<HTMLDivElement>) => {
    // 1. Mode Pan Aktif -> Inisiasi dragging pan bebas kemana saja
    if (viewportMode === 'pan') {
      e.preventDefault()
      setIsMouseDownPanning(true)
      panStartRef.current = {
        isPanning: true,
        startX: e.clientX,
        startY: e.clientY,
        startMasterX: masterPanOffset.x,
        startMasterY: masterPanOffset.y,
        startScanX: scanPanOffset.x,
        startScanY: scanPanOffset.y,
        panel,
      }
      return
    }

    // 2. Mode Penanda Aktif -> Inisiasi drag bounding box
    const rect = e.currentTarget.getBoundingClientRect()
    const zoom = panel === 'master' ? masterZoomScale : scanZoomScale
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    setDraggingPanel(panel)
    setDragStart({ x, y })
    setDragCurrent({ x, y })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Handle Marker Drag Bounding Box (Pan ditangani oleh global window listener)
    if (!draggingPanel || !dragStart) return
    const rect = e.currentTarget.getBoundingClientRect()
    const zoom = draggingPanel === 'master' ? masterZoomScale : scanZoomScale
    const x = Math.max(0, Math.min(BASE_PAGE_W, (e.clientX - rect.left) / zoom))
    const y = Math.max(0, Math.min(BASE_PAGE_H, (e.clientY - rect.top) / zoom))
    setDragCurrent({ x, y })
  }

  const handleMouseUp = () => {
    if (panStartRef.current.isPanning) {
      panStartRef.current.isPanning = false
      setIsMouseDownPanning(false)
      return
    }

    if (!draggingPanel || !dragStart || !dragCurrent) {
      setDraggingPanel(null)
      return
    }

    const minX = Math.min(dragStart.x, dragCurrent.x)
    const minY = Math.min(dragStart.y, dragCurrent.y)
    const w = Math.abs(dragCurrent.x - dragStart.x)
    const h = Math.abs(dragCurrent.y - dragStart.y)

    const currentPanel = draggingPanel
    setDraggingPanel(null)
    setDragStart(null)
    setDragCurrent(null)

    // Jika pengguna hanya mengklik canvas tanpa drag (w < 8 && h < 8) -> batalkan seleksi
    if (w < 8 && h < 8) {
      onSelectAnnotation(null)
      return
    }

    // Hindari drag tidak sengaja di bawah 12px
    if (w < 12 || h < 12) return

    const canvas = currentPanel === 'master' ? masterCanvasRef.current : scanCanvasRef.current
    if (!canvas) return

    const scaleX = PDF_POINTS_W / BASE_PAGE_W
    const scaleY = PDF_POINTS_H / BASE_PAGE_H

    const coords: PdfCoordinates = {
      pdf_x: Math.round(minX * scaleX * 10) / 10,
      pdf_y: Math.round(minY * scaleY * 10) / 10,
      width: Math.round(w * scaleX * 10) / 10,
      height: Math.round(h * scaleY * 10) / 10,
      rotation_degree: currentPanel === 'scan' ? rotationDegree : 0,
    }

    // Ekstrak Crop Thumbnail Bukti Visual jika ditandai di Scan atau Master
    let cropThumbnail = ''
    try {
      const cropC = document.createElement('canvas')
      cropC.width = Math.min(220, Math.max(1, Math.round(w)))
      cropC.height = Math.min(180, Math.max(1, Math.round(h)))
      const ctx = cropC.getContext('2d')
      if (ctx) {
        const ratioX = canvas.width / BASE_PAGE_W
        const ratioY = canvas.height / BASE_PAGE_H
        ctx.drawImage(
          canvas,
          minX * ratioX,
          minY * ratioY,
          w * ratioX,
          h * ratioY,
          0,
          0,
          cropC.width,
          cropC.height
        )
        cropThumbnail = cropC.toDataURL('image/jpeg', 0.85)
      }
    } catch {
      // Ignored
    }

    // Jika ada anotasi yang sedang dipilih -> langsung set posisi / re-link
    if (selectedAnnotationId) {
      onUpdateCoordinates(currentPanel, coords, cropThumbnail)
      return
    }

    // Jika belum ada anotasi yang dipilih -> Buka form pengisian field penanda baru!
    setPendingDraft({
      target: currentPanel,
      coords,
      cropDataUrl: cropThumbnail,
      itemNumber: annotations.length + 1,
    })
  }

  const handleSaveDraftAnnotation = (formData: MarkerFormData) => {
    if (!pendingDraft) return
    if (onSaveNewAnnotationWithForm) {
      onSaveNewAnnotationWithForm(
        pendingDraft.target,
        pendingDraft.coords,
        pendingDraft.cropDataUrl,
        formData
      )
    } else {
      onUpdateCoordinates(pendingDraft.target, pendingDraft.coords, pendingDraft.cropDataUrl)
    }
    setPendingDraft(null)
  }

  // Render Box Item Helper (Dual Bounding Box System dengan Skala Zoom Mandiri & Nomor ID Identik)
  const renderBBoxes = (panel: 'master' | 'scan') => {
    const currentZoom = panel === 'master' ? masterZoomScale : scanZoomScale
    const scaleX = BASE_PAGE_W / PDF_POINTS_W
    const scaleY = BASE_PAGE_H / PDF_POINTS_H

    const items = annotations.map((a, index) => {
      // Jika di Master dan belum ditandai di master (baru ada di scan), jangan tampilkan kotak di Master
      if (panel === 'master' && a.marking_status === 'pending_master' && !a.master_coordinates) {
        return null
      }
      // Jika di Scan dan belum ditandai di scan (baru ada di master), jangan tampilkan kotak di Scan
      if (panel === 'scan' && a.marking_status === 'pending_scan') {
        return null
      }

      // Koordinat naskah:
      // - Di Master: gunakan master_coordinates jika ada, fallback ke coordinates
      // - Di Scan: jika vendor aktif memiliki koordinat khusus di vendor_coordinates, gunakan itu
      const coords =
        panel === 'master'
          ? (a.master_coordinates || a.coordinates)
          : (activeVendorId && a.vendor_coordinates?.[activeVendorId]
              ? a.vendor_coordinates[activeVendorId]
              : a.coordinates)
      if (!coords) return null

      const itemNo = a.item_number || (index + 1)
      const isSelected = selectedAnnotationId === a.annotation_id
      const isHovered = hoveredAnnotationId === a.annotation_id
      const isPendingMaster = a.marking_status === 'pending_master'
      const isPendingScan = a.marking_status === 'pending_scan'
      const hasDistinctMaster = Boolean(a.master_coordinates) && !isPendingMaster && !isPendingScan

      const x = coords.pdf_x * scaleX * currentZoom
      const y = coords.pdf_y * scaleY * currentZoom
      const w = coords.width * scaleX * currentZoom
      const h = coords.height * scaleY * currentZoom

      const titleTip = `Temuan #${itemNo} [ID: ${a.annotation_id}] • ${a.content.error_category}
Posisi ${panel.toUpperCase()}: (${coords.pdf_x}, ${coords.pdf_y}) [${coords.width} × ${coords.height} pt]
Zoom ${panel.toUpperCase()}: ${Math.round(currentZoom * 100)}%
Status: ${
  isPendingMaster
    ? 'Perlu pilih di Master (baru di Scan)'
    : isPendingScan
    ? 'Perlu pilih di Scan (baru di Master)'
    : 'Lengkap di kedua dokumen'
}
${
  hasDistinctMaster
    ? `Teks terhubung pada posisi berbeda:
   Master: (${a.master_coordinates?.pdf_x}, ${a.master_coordinates?.pdf_y})
   Scan:   (${a.coordinates.pdf_x}, ${a.coordinates.pdf_y})`
    : 'Posisi Master & Scan sejajar'
}
Klik untuk memilih • Tekan Delete untuk hapus • Drag untuk set posisi.`

      let tagLabel = `${panel === 'master' ? 'MASTER' : 'VENDOR'} • ${a.review.severity.toUpperCase()}`
      if (isPendingMaster && panel === 'scan') {
        tagLabel = 'PILIH DI MASTER'
      } else if (isPendingScan && panel === 'master') {
        tagLabel = 'PILIH DI SCAN'
      }

      const isWarning = (isPendingMaster && panel === 'scan') || (isPendingScan && panel === 'master')

      return (
        <div
          key={`${panel}-${a.annotation_id}`}
          className={`tashih-bbox ${a.review.severity} ${isSelected ? 'selected' : ''}`}
          style={{
            left: x,
            top: y,
            width: w,
            height: h,
            outline: isHovered
              ? '2px dashed var(--accent, #c43e1c)'
              : isWarning
              ? '2px dashed #d83b01'
              : hasDistinctMaster && panel === 'master'
              ? '1px dashed #0078d4'
              : undefined,
            boxShadow:
              isHovered || isSelected
                ? '0 0 0 3px rgba(196, 62, 28, 0.45)'
                : isWarning
                ? '0 0 0 2px rgba(216, 59, 1, 0.35)'
                : undefined,
          }}
          title={titleTip}
          onClick={(e) => {
            e.stopPropagation()
            onSelectAnnotation(a.annotation_id)
          }}
          onMouseEnter={() => setHoveredAnnotationId(a.annotation_id)}
          onMouseLeave={() => setHoveredAnnotationId(null)}
        >
          {/* Badge Nomor ID Identik di Master & Vendor */}
          <div
            className="tashih-bbox-badge-number"
            title={`Temuan #${itemNo} (ID: ${a.annotation_id})`}
          >
            #{itemNo}
          </div>

          <span
            className="tashih-bbox-tag"
            style={{
              background: isWarning ? '#d83b01' : undefined,
              color: isWarning ? '#ffffff' : undefined,
            }}
          >
            {tagLabel}
          </span>
        </div>
      )
    })

    // Tampilkan kotak draft sementara saat pengguna sedang mengisi form
    if (pendingDraft && pendingDraft.target === panel) {
      const x = pendingDraft.coords.pdf_x * scaleX * currentZoom
      const y = pendingDraft.coords.pdf_y * scaleY * currentZoom
      const w = pendingDraft.coords.width * scaleX * currentZoom
      const h = pendingDraft.coords.height * scaleY * currentZoom
      items.push(
        <div
          key={`draft-${panel}`}
          className="tashih-bbox koreksi selected"
          style={{
            left: x,
            top: y,
            width: w,
            height: h,
            borderStyle: 'dashed',
            zIndex: 30,
            pointerEvents: 'none',
          }}
        >
          <div className="tashih-bbox-badge-number">
            #{pendingDraft.itemNumber}
          </div>
          <span className="tashih-bbox-tag" style={{ background: '#d83b01' }}>
            DRAFT #{pendingDraft.itemNumber}
          </span>
        </div>
      )
    }

    return items
  }

  const masterRenderedWidth = BASE_PAGE_W * masterZoomScale
  const masterRenderedHeight = BASE_PAGE_H * masterZoomScale
  const scanRenderedWidth = BASE_PAGE_W * scanZoomScale
  const scanRenderedHeight = BASE_PAGE_H * scanZoomScale

  return (
    <div className="tashih-viewport-split">
      <input
        type="file"
        ref={masterFileInputRef}
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && onSelectMasterPdfFile) onSelectMasterPdfFile(file)
          if (e.target) e.target.value = ''
        }}
      />
      <input
        type="file"
        ref={scanFileInputRef}
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && onSelectScanPdfFile) onSelectScanPdfFile(file)
          if (e.target) e.target.value = ''
        }}
      />

      {/* ── Panel Kiri: Master PDF (Dengan Zoom Mandiri) ── */}
      <div className="tashih-panel master-pane">
        <div className="tashih-panel-header" style={{ padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <FluentDocumentPdf size={13} />
              <span>MASTER LAYOUT</span>
            </span>

            {/* Kontrol Zoom Mandiri Panel Master */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '1px',
                background: 'var(--surface)',
                padding: '1px 3px',
                borderRadius: 'var(--radius-6, 3px)',
                border: '1px solid var(--border)',
              }}
            >
              <button
                type="button"
                className="btn-workbench-icon"
                onClick={() => onMasterZoomChange(masterZoomScale - 0.15)}
                disabled={masterZoomScale <= 0.5}
                title="Perkecil Master Layout (Ctrl + Scroll Mouse di panel kiri)"
                style={{ width: '22px', height: '22px' }}
              >
                <FluentZoomOut size={11} />
              </button>
              <button
                type="button"
                onClick={() => onMasterZoomChange(1.0)}
                title="Reset Zoom Master ke 100%"
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  padding: '0 3px',
                  cursor: 'pointer',
                  minWidth: '36px',
                  textAlign: 'center',
                }}
              >
                {Math.round(masterZoomScale * 100)}%
              </button>
              <button
                type="button"
                className="btn-workbench-icon"
                onClick={() => onMasterZoomChange(masterZoomScale + 0.15)}
                disabled={masterZoomScale >= 2.5}
                title="Perbesar Master Layout (Ctrl + Scroll Mouse di panel kiri)"
                style={{ width: '22px', height: '22px' }}
              >
                <FluentZoomIn size={11} />
              </button>
              <button
                type="button"
                className="btn-workbench-icon"
                onClick={() => onMasterZoomChange(1.25)}
                title="Sesuaikan Lebar Master (Fit Width)"
                style={{ width: '22px', height: '22px' }}
              >
                <FluentZoomFit size={11} />
              </button>
            </div>

            {onToggleZoomSync && (
              <button
                type="button"
                className="btn-workbench-icon"
                onClick={onToggleZoomSync}
                title={
                  isZoomSynced
                    ? 'Zoom Tertaut Bersama (Klik untuk Pisahkan Zoom Mandiri)'
                    : 'Zoom Mandiri Aktif (Klik untuk Tautkan Zoom Kanan-Kiri)'
                }
                style={{
                  width: '22px',
                  height: '22px',
                  color: isZoomSynced ? 'var(--accent, #c43e1c)' : 'var(--text-secondary)',
                  border: `1px solid ${isZoomSynced ? 'var(--accent, #c43e1c)' : 'transparent'}`,
                }}
              >
                {isZoomSynced ? <FluentLink size={12} /> : <FluentUnlink size={12} />}
              </button>
            )}

            {/* Tombol Mode Interaksi: Aktifkan Penanda (Spasi) vs Pan */}
            <button
              type="button"
              onClick={() => setViewportMode((prev) => (prev === 'pan' ? 'marker' : 'pan'))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: 'var(--radius-6, 4px)',
                border: viewportMode === 'marker' ? '1px solid #107c41' : '1px solid var(--accent, #c43e1c)',
                background: viewportMode === 'marker' ? '#107c41' : 'var(--accent, #c43e1c)',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                marginLeft: '6px',
                transition: 'all 0.15s ease',
              }}
              title={
                viewportMode === 'marker'
                  ? 'Mode Penanda Aktif: Tarik kotak seleksi pada naskah. Tekan tombol Spasi untuk kembali ke Pan & Zoom.'
                  : 'Mode Pan & Zoom Bebas Aktif: Klik tombol ini atau tekan tombol Spasi untuk mengaktifkan Penanda.'
              }
            >
              <FluentSelectSquare size={12} />
              <span>{viewportMode === 'marker' ? 'Penanda Aktif' : 'Aktifkan Penanda'}</span>
              <span
                style={{
                  fontSize: '9px',
                  background: viewportMode === 'marker' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  fontWeight: 700,
                }}
              >
                Spasi
              </span>
            </button>

            {/* Tombol Reset Pan jika kanvas digeser */}
            {(masterPanOffset.x !== 0 || masterPanOffset.y !== 0) && (
              <button
                type="button"
                onClick={() => {
                  setMasterPanOffset({ x: 0, y: 0 })
                  if (isZoomSynced) setScanPanOffset({ x: 0, y: 0 })
                }}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-secondary)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-6, 3px)',
                  fontSize: '10px',
                  cursor: 'pointer',
                  marginLeft: '4px',
                }}
                title="Pusatkan kembali posisi kanvas ke tengah"
              >
                Reset Posisi
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedAnnotation && (
              <span
                style={{
                  fontSize: '10px',
                  color: selectedAnnotation.marking_status === 'pending_master' ? '#d83b01' : '#0078d4',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background:
                    selectedAnnotation.marking_status === 'pending_master'
                      ? 'rgba(216, 59, 1, 0.12)'
                      : 'rgba(0, 120, 212, 0.1)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-6, 3px)',
                  border: `1px solid ${
                    selectedAnnotation.marking_status === 'pending_master' ? 'rgba(216, 59, 1, 0.3)' : 'transparent'
                  }`,
                }}
                title={
                  selectedAnnotation.marking_status === 'pending_master'
                    ? `Temuan ${selectedAnnotation.annotation_id} belum ditandai di Master. Tarik kotak di kanvas Master ini!`
                    : `Drag kotak di kanvas Master untuk menyetel posisi '${selectedAnnotation.annotation_id}'.`
                }
              >
                {selectedAnnotation.marking_status === 'pending_master' ? (
                  <FluentWarning size={12} color="#d83b01" />
                ) : (
                  <FluentTarget size={12} />
                )}
                <span>
                  {selectedAnnotation.marking_status === 'pending_master'
                    ? `PILIH DI MASTER (${selectedAnnotation.annotation_id})`
                    : `Set Master (${selectedAnnotation.annotation_id})`}
                </span>
              </span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Hal. {currentPage}</span>
          </div>
        </div>

        {/* Banner Panduan Ringkas Aktif ketika Anotasi Terpilih di Master */}
        {selectedAnnotation && (
          <div
            style={{
              padding: '3px 10px',
              background:
                selectedAnnotation.marking_status === 'pending_master'
                  ? 'rgba(216, 59, 1, 0.12)'
                  : 'rgba(0, 120, 212, 0.08)',
              borderBottom: `1px solid ${
                selectedAnnotation.marking_status === 'pending_master'
                  ? 'rgba(216, 59, 1, 0.3)'
                  : 'rgba(0, 120, 212, 0.2)'
              }`,
              fontSize: '10px',
              color: selectedAnnotation.marking_status === 'pending_master' ? '#d83b01' : '#0078d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              title="Tarik kotak di atas naskah Master untuk menetapkan koordinat kalimat acuan"
            >
              {selectedAnnotation.marking_status === 'pending_master' ? (
                <FluentWarning size={12} color="#d83b01" />
              ) : (
                <FluentTarget size={12} />
              )}
              <span>
                {selectedAnnotation.marking_status === 'pending_master'
                  ? `Pilih teks ${selectedAnnotation.annotation_id} di Master`
                  : `Tarik kotak teks ${selectedAnnotation.annotation_id}`}
              </span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {selectedAnnotation.marking_status === 'pending_master' && onMirrorCoordinates && (
                <button
                  type="button"
                  onClick={() => onMirrorCoordinates(selectedAnnotation.annotation_id)}
                  style={{
                    border: '1px solid #d83b01',
                    background: 'var(--surface)',
                    color: '#d83b01',
                    fontSize: '9px',
                    fontWeight: 600,
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-6, 3px)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                  title="Samakan posisi koordinat dengan naskah Scan otomatis"
                >
                  <FluentLink size={10} />
                  <span>Samakan</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectAnnotation(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  fontSize: '9px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '2px 4px',
                }}
                title="Batal mode penandaan (Esc)"
              >
                <FluentDismiss size={11} />
                <span>Batal</span>
              </button>
            </div>
          </div>
        )}

        <div
          ref={masterScrollRef}
          onScroll={() => handleScroll('master')}
          className={`tashih-panel-content ${isPanActive ? 'canvas-mode-pan' : 'canvas-mode-marker'}`}
        >
          <div
            onMouseDown={(e) => handleMouseDown('master', e)}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              position: 'relative',
              width: masterRenderedWidth,
              height: masterRenderedHeight,
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
              background: '#fff',
              borderRadius: '2px',
              cursor: isPanActive ? (isMouseDownPanning ? 'grabbing' : 'grab') : 'crosshair',
              userSelect: 'none',
              transform: `translate(${masterPanOffset.x}px, ${masterPanOffset.y}px)`,
              transition: isMouseDownPanning ? 'none' : 'transform 0.08s ease-out',
              flexShrink: 0,
            }}
          >
            <canvas
              ref={masterCanvasRef}
              style={{
                width: masterRenderedWidth,
                height: masterRenderedHeight,
                display: 'block',
              }}
            />

            {/* Overlay jika Master PDF Belum Dimuat */}
            {!masterPdfDocument && !pdfDocument && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.94)',
                  padding: '24px',
                  zIndex: 20,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(0, 120, 212, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0078d4',
                  }}
                >
                  <FluentDocumentPdf size={22} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                  Berkas Master PDF Belum Dimuat
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '280px', marginBottom: '6px' }}>
                  Buka berkas Master PDF acuan penerbit untuk memulai perbandingan visual.
                </div>
                {onSelectMasterPdfFile && (
                  <button
                    type="button"
                    onClick={() => masterFileInputRef.current?.click()}
                    className="btn-workbench-action primary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <FluentArrowUpload size={12} />
                    <span>Pilih Berkas Master PDF...</span>
                  </button>
                )}
              </div>
            )}

            {/* Bounding box mirrors on master */}
            {renderBBoxes('master')}

            {/* Live Drag Selection Rectangle on Master */}
            {draggingPanel === 'master' && dragStart && dragCurrent && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(dragStart.x, dragCurrent.x) * masterZoomScale,
                  top: Math.min(dragStart.y, dragCurrent.y) * masterZoomScale,
                  width: Math.abs(dragCurrent.x - dragStart.x) * masterZoomScale,
                  height: Math.abs(dragCurrent.y - dragStart.y) * masterZoomScale,
                  border: '2px dashed #0078d4',
                  background: 'rgba(0, 120, 212, 0.2)',
                  pointerEvents: 'none',
                  zIndex: 99,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Panel Kanan: Vendor Scan (Dengan Zoom Mandiri) ── */}
      <div className="tashih-panel scan-pane">
        <div className="tashih-panel-header" style={{ padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <FluentPrint size={13} />
              <span>HASIL CETAK VENDOR (Scan)</span>
            </span>

            {/* Kontrol Zoom Mandiri Panel Scan */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '1px',
                background: 'var(--surface)',
                padding: '1px 3px',
                borderRadius: 'var(--radius-6, 3px)',
                border: '1px solid var(--border)',
              }}
            >
              <button
                type="button"
                className="btn-workbench-icon"
                onClick={() => onScanZoomChange(scanZoomScale - 0.15)}
                disabled={scanZoomScale <= 0.5}
                title="Perkecil Scan Vendor (Ctrl + Scroll Mouse di panel kanan)"
                style={{ width: '22px', height: '22px' }}
              >
                <FluentZoomOut size={11} />
              </button>
              <button
                type="button"
                onClick={() => onScanZoomChange(1.0)}
                title="Reset Zoom Scan ke 100%"
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  padding: '0 3px',
                  cursor: 'pointer',
                  minWidth: '36px',
                  textAlign: 'center',
                }}
              >
                {Math.round(scanZoomScale * 100)}%
              </button>
              <button
                type="button"
                className="btn-workbench-icon"
                onClick={() => onScanZoomChange(scanZoomScale + 0.15)}
                disabled={scanZoomScale >= 2.5}
                title="Perbesar Scan Vendor (Ctrl + Scroll Mouse di panel kanan)"
                style={{ width: '22px', height: '22px' }}
              >
                <FluentZoomIn size={11} />
              </button>
              <button
                type="button"
                className="btn-workbench-icon"
                onClick={() => onScanZoomChange(1.25)}
                title="Sesuaikan Lebar Scan (Fit Width)"
                style={{ width: '22px', height: '22px' }}
              >
                <FluentZoomFit size={11} />
              </button>
            </div>

            {/* Tombol Mode Interaksi: Aktifkan Penanda (Spasi) vs Pan */}
            <button
              type="button"
              onClick={() => setViewportMode((prev) => (prev === 'pan' ? 'marker' : 'pan'))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: 'var(--radius-6, 4px)',
                border: viewportMode === 'marker' ? '1px solid #107c41' : '1px solid var(--accent, #c43e1c)',
                background: viewportMode === 'marker' ? '#107c41' : 'var(--accent, #c43e1c)',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                marginLeft: '6px',
                transition: 'all 0.15s ease',
              }}
              title={
                viewportMode === 'marker'
                  ? 'Mode Penanda Aktif: Tarik kotak pada naskah. Tekan tombol Spasi untuk kembali ke Pan & Zoom.'
                  : 'Mode Pan & Zoom Bebas Aktif: Klik tombol ini atau tekan tombol Spasi untuk mengaktifkan Penanda.'
              }
            >
              <FluentSelectSquare size={12} />
              <span>{viewportMode === 'marker' ? 'Penanda Aktif' : 'Aktifkan Penanda'}</span>
              <span
                style={{
                  fontSize: '9px',
                  background: viewportMode === 'marker' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  fontWeight: 700,
                }}
              >
                Spasi
              </span>
            </button>

            {/* Tombol Reset Pan Scan jika kanvas digeser */}
            {(scanPanOffset.x !== 0 || scanPanOffset.y !== 0) && (
              <button
                type="button"
                onClick={() => {
                  setScanPanOffset({ x: 0, y: 0 })
                  if (isZoomSynced) setMasterPanOffset({ x: 0, y: 0 })
                }}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-secondary)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-6, 3px)',
                  fontSize: '10px',
                  cursor: 'pointer',
                  marginLeft: '4px',
                }}
                title="Pusatkan kembali posisi kanvas Scan ke tengah"
              >
                Reset Posisi
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {selectedAnnotation && (
              <span
                style={{
                  fontSize: '10px',
                  color: selectedAnnotation.marking_status === 'pending_scan' ? '#d83b01' : 'var(--accent, #c43e1c)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background:
                    selectedAnnotation.marking_status === 'pending_scan'
                      ? 'rgba(216, 59, 1, 0.12)'
                      : 'rgba(196, 62, 28, 0.1)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-6, 3px)',
                  border: `1px solid ${
                    selectedAnnotation.marking_status === 'pending_scan' ? 'rgba(216, 59, 1, 0.3)' : 'transparent'
                  }`,
                }}
                title={
                  selectedAnnotation.marking_status === 'pending_scan'
                    ? `Temuan ${selectedAnnotation.annotation_id} baru ditandai di Master. Silakan tarik kotak di Scan ini!`
                    : `Drag kotak di panel Scan ini untuk memperbarui posisi teks '${selectedAnnotation.annotation_id}'.`
                }
              >
                {selectedAnnotation.marking_status === 'pending_scan' ? (
                  <FluentWarning size={12} color="#d83b01" />
                ) : (
                  <FluentTarget size={12} />
                )}
                <span>
                  {selectedAnnotation.marking_status === 'pending_scan'
                    ? `PILIH DI SCAN (${selectedAnnotation.annotation_id})`
                    : `Set Scan (${selectedAnnotation.annotation_id})`}
                </span>
              </span>
            )}

            {overlayMode && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: 'var(--accent, #c43e1c)',
                  fontWeight: 600,
                  background: 'rgba(196, 62, 28, 0.1)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-6, 3px)',
                }}
              >
                <FluentLayers size={12} />
                <span>Onion-Skin ({overlayOpacity}%)</span>
              </div>
            )}
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Hal. {currentPage}</span>
          </div>
        </div>

        {/* Banner Panduan Ringkas Aktif ketika Anotasi Terpilih di Scan */}
        {selectedAnnotation && (
          <div
            style={{
              padding: '3px 10px',
              background:
                selectedAnnotation.marking_status === 'pending_scan'
                  ? 'rgba(216, 59, 1, 0.12)'
                  : 'rgba(196, 62, 28, 0.08)',
              borderBottom: `1px solid ${
                selectedAnnotation.marking_status === 'pending_scan'
                  ? 'rgba(216, 59, 1, 0.3)'
                  : 'rgba(196, 62, 28, 0.2)'
              }`,
              fontSize: '10px',
              color: selectedAnnotation.marking_status === 'pending_scan' ? '#d83b01' : 'var(--accent, #c43e1c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              title="Tarik kotak di atas naskah Scan untuk menetapkan koordinat hasil cetak"
            >
              {selectedAnnotation.marking_status === 'pending_scan' ? (
                <FluentWarning size={12} color="#d83b01" />
              ) : (
                <FluentTarget size={12} />
              )}
              <span>
                {selectedAnnotation.marking_status === 'pending_scan'
                  ? `Pilih teks ${selectedAnnotation.annotation_id} di Scan`
                  : `Tarik kotak teks ${selectedAnnotation.annotation_id}`}
              </span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {selectedAnnotation.marking_status === 'pending_scan' && onMirrorCoordinates && (
                <button
                  type="button"
                  onClick={() => onMirrorCoordinates(selectedAnnotation.annotation_id)}
                  style={{
                    border: '1px solid #d83b01',
                    background: 'var(--surface)',
                    color: '#d83b01',
                    fontSize: '9px',
                    fontWeight: 600,
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-6, 3px)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                  title="Samakan posisi koordinat dengan naskah Master otomatis"
                >
                  <FluentLink size={10} />
                  <span>Samakan</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectAnnotation(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  fontSize: '9px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '2px 4px',
                }}
                title="Batal mode penandaan (Esc)"
              >
                <FluentDismiss size={11} />
                <span>Batal</span>
              </button>
            </div>
          </div>
        )}

        <div
          ref={scanScrollRef}
          onScroll={() => handleScroll('scan')}
          className={`tashih-panel-content ${isPanActive ? 'canvas-mode-pan' : 'canvas-mode-marker'}`}
        >
          <div
            onMouseDown={(e) => handleMouseDown('scan', e)}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              position: 'relative',
              width: scanRenderedWidth,
              height: scanRenderedHeight,
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
              cursor: isPanActive ? (isMouseDownPanning ? 'grabbing' : 'grab') : 'crosshair',
              userSelect: 'none',
              transform: `translate(${scanPanOffset.x}px, ${scanPanOffset.y}px) rotate(${rotationDegree}deg)`,
              transformOrigin: 'center center',
              transition: isMouseDownPanning || draggingPanel ? 'none' : 'transform 0.08s ease-out',
              borderRadius: '2px',
              flexShrink: 0,
            }}
          >
            <canvas
              ref={scanCanvasRef}
              style={{
                width: scanRenderedWidth,
                height: scanRenderedHeight,
                display: 'block',
                opacity: overlayMode ? overlayOpacity / 100 : 1,
              }}
            />

            {/* Overlay jika Scan PDF Belum Dimuat */}
            {!scanPdfDocument && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'rgba(251, 250, 247, 0.94)',
                  padding: '24px',
                  zIndex: 20,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(196, 62, 28, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent, #c43e1c)',
                  }}
                >
                  <FluentDocumentPdf size={22} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                  Berkas Scan PDF Vendor Belum Dimuat
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '280px', marginBottom: '6px' }}>
                  Pilih berkas PDF hasil scan dari vendor {activeVendorName || ''} untuk ditelaah.
                </div>
                {onSelectScanPdfFile && (
                  <button
                    type="button"
                    onClick={() => scanFileInputRef.current?.click()}
                    className="btn-workbench-action primary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <FluentArrowUpload size={12} />
                    <span>Pilih Berkas Scan PDF Vendor...</span>
                  </button>
                )}
              </div>
            )}

            {/* Bounding Boxes on Scan */}
            {renderBBoxes('scan')}

            {/* Live Drag Selection Rectangle on Scan */}
            {draggingPanel === 'scan' && dragStart && dragCurrent && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(dragStart.x, dragCurrent.x) * scanZoomScale,
                  top: Math.min(dragStart.y, dragCurrent.y) * scanZoomScale,
                  width: Math.abs(dragCurrent.x - dragStart.x) * scanZoomScale,
                  height: Math.abs(dragCurrent.y - dragStart.y) * scanZoomScale,
                  border: '2px dashed var(--accent, #c43e1c)',
                  background: 'rgba(196, 62, 28, 0.2)',
                  pointerEvents: 'none',
                  zIndex: 99,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Popover / Modal Pengisian Field Penanda Baru */}
      <NewMarkerModal
        isOpen={Boolean(pendingDraft)}
        draft={pendingDraft}
        domainPreset={domainPreset}
        activeVendorName={activeVendorName || 'Vendor Cetak'}
        onSave={handleSaveDraftAnnotation}
        onCancel={() => setPendingDraft(null)}
      />
    </div>
  )
}
