import React, { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PdfPluginContext } from '../types'
import {
  loadProjectData,
  saveProjectData,
  type TashihProjectState,
} from './tashihStore'
import {
  getPdfFromStorage,
  savePdfToStorage,
  loadPdfDocumentFromBuffer,
  loadPdfDocumentFromFile,
} from './tashihPdfLoader'
import type {
  AnnotationContent,
  MarkingCompleteness,
  PdfCoordinates,
  SeverityLevel,
  TashihAnnotation,
} from './types'
import {
  FluentArrowLeft,
  FluentSplitScreen,
  FluentFolder,
  FluentChevronLeft,
  FluentChevronRight,
  FluentLayers,
  FluentSettings,
  FluentDocumentTable,
  FluentAdd,
  FluentZoomIn,
  FluentZoomOut,
  FluentZoomFit,
  FluentLink,
  FluentUnlink,
} from './TashihFluentIcons'
import { DeskewControl } from './components/DeskewControl'
import { ComparisonViewport } from './components/ComparisonViewport'
import { InspectorPanel } from './components/InspectorPanel'
import { ExportReportModal } from './components/ExportReportModal'
import { SettingsModal } from './components/SettingsModal'
import { ProjectModal } from './components/ProjectModal'
import type { MarkerFormData } from './components/NewMarkerModal'
import { runPixelDiff, extractCropSnippetFromPdfCoords } from './diffEngine'
import { analyzeComparisonWithAi } from './visionAiService'
import './tashih.css'

interface Props {
  context: PdfPluginContext
  onClose: () => void
}

export function TashihCanvasView({ context, onClose }: Props) {
  const { doc, actions, ui } = context
  const curPage = doc?.currentPage ?? 1
  const docPageCount = doc?.pageCount ?? 1
  const pdfDocument = doc?.pdfDocument

  const [projectState, setProjectState] = useState<TashihProjectState>(() => loadProjectData())
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [masterZoomScale, setMasterZoomScale] = useState<number>(1.0)
  const [scanZoomScale, setScanZoomScale] = useState<number>(1.0)
  const [isZoomSynced, setIsZoomSynced] = useState<boolean>(false)

  // Real PDF Documents State
  const [masterPdfDoc, setMasterPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [scanPdfDocs, setScanPdfDocs] = useState<Record<string, PDFDocumentProxy>>({})

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)

  // Active vendor
  const activeVendor =
    projectState.metadata.vendors.find((v) => v.id === projectState.activeVendorId) ||
    projectState.metadata.vendors[0] || {
      id: 'vendor-1',
      name: 'Percetakan',
      fileName: '',
      rotationDeskew: 0,
    }

  const currentAnnotations = projectState.annotations[curPage] || []

  // References to active canvases
  const [masterCanvas, setMasterCanvas] = useState<HTMLCanvasElement | null>(null)
  const [scanCanvas, setScanCanvas] = useState<HTMLCanvasElement | null>(null)

  const masterPages = masterPdfDoc?.numPages || docPageCount || 1
  const scanPages = scanPdfDocs[activeVendor.id]?.numPages
  const totalPageCount = Math.max(masterPages, scanPages || 1)

  // Otomatis muat berkas PDF nyata dari IndexedDB saat project dibuka atau vendor berganti
  useEffect(() => {
    let isCancelled = false
    const projectId = projectState.metadata.id

    // Muat master PDF dari storage jika belum ada
    if (!masterPdfDoc) {
      getPdfFromStorage(projectId, 'master').then((res) => {
        if (res && !isCancelled) {
          loadPdfDocumentFromBuffer(res.data).then((d) => {
            if (!isCancelled) setMasterPdfDoc(d)
          }).catch((err) => console.warn('[tashih] Failed loading master PDF:', err))
        }
      })
    }

    // Muat scan PDF vendor aktif dari storage jika belum ada
    const vId = activeVendor.id
    if (!scanPdfDocs[vId]) {
      getPdfFromStorage(projectId, vId).then((res) => {
        if (res && !isCancelled) {
          loadPdfDocumentFromBuffer(res.data).then((d) => {
            if (!isCancelled) {
              setScanPdfDocs((prev) => ({ ...prev, [vId]: d }))
            }
          }).catch((err) => console.warn(`[tashih] Failed loading scan PDF ${vId}:`, err))
        }
      })
    }

    return () => {
      isCancelled = true
    }
  }, [projectState.metadata.id, activeVendor.id])

  // Otomatis pastikan semua temuan di halaman aktif memiliki kedua cuplikan visual (Master & Scan)
  useEffect(() => {
    if (!masterCanvas && !scanCanvas) return
    const annots = projectState.annotations[curPage]
    if (!annots || annots.length === 0) return

    let hasChange = false
    const updated = annots.map((a) => {
      let mCrop = a.cropThumbnailMaster
      let sCrop = a.cropThumbnailScan || a.cropThumbnail

      const mCoords = a.master_coordinates || (a.marking_status === 'complete' ? a.coordinates : undefined)
      if (!mCrop && mCoords && masterCanvas) {
        const extracted = extractCropSnippetFromPdfCoords(masterCanvas, mCoords)
        if (extracted) {
          mCrop = extracted
          hasChange = true
        }
      }

      const sCoords = a.coordinates || a.scan_coordinates
      if (!sCrop && sCoords && scanCanvas) {
        const extracted = extractCropSnippetFromPdfCoords(scanCanvas, sCoords)
        if (extracted) {
          sCrop = extracted
          hasChange = true
        }
      }

      if (mCrop !== a.cropThumbnailMaster || sCrop !== a.cropThumbnailScan) {
        return {
          ...a,
          cropThumbnailMaster: mCrop,
          cropThumbnailScan: sCrop,
          cropThumbnail: sCrop || mCrop,
        }
      }
      return a
    })

    if (hasChange) {
      setProjectState((prev) => {
        const nextState = {
          ...prev,
          annotations: {
            ...prev.annotations,
            [curPage]: updated,
          },
        }
        saveProjectData(nextState)
        return nextState
      })
    }
  }, [masterCanvas, scanCanvas, curPage])

  const handleUpdateProject = (updatedState: TashihProjectState) => {
    setProjectState(updatedState)
    saveProjectData(updatedState)
  }

  // Ganti vendor aktif
  const handleSelectVendor = (vendorId: string) => {
    handleUpdateProject({
      ...projectState,
      activeVendorId: vendorId,
    })
  }

  // Upload Master PDF Nyata dari Komputer
  const handleSelectMasterPdfFile = async (file: File) => {
    try {
      ui.showToast(`Memuat berkas Master PDF: ${file.name}...`, 'info')
      const result = await loadPdfDocumentFromFile(file)
      await savePdfToStorage(projectState.metadata.id, 'master', result.fileName, result.buffer)
      setMasterPdfDoc(result.pdfDoc)
      handleUpdateProject({
        ...projectState,
        metadata: {
          ...projectState.metadata,
          masterPdf: {
            fileName: result.fileName,
            fileSize: result.fileSize,
            pageCount: result.pageCount,
          },
        },
      })
      ui.showToast(`Master PDF "${file.name}" berhasil dimuat (${result.pageCount} hal).`, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      ui.showToast(`Gagal memuat Master PDF: ${msg}`, 'error')
    }
  }

  // Upload Scan PDF Nyata untuk Vendor Aktif
  const handleSelectScanPdfFile = async (file: File) => {
    try {
      ui.showToast(`Memuat berkas Scan PDF: ${file.name}...`, 'info')
      const result = await loadPdfDocumentFromFile(file)
      await savePdfToStorage(projectState.metadata.id, activeVendor.id, result.fileName, result.buffer)
      setScanPdfDocs((prev) => ({ ...prev, [activeVendor.id]: result.pdfDoc }))
      const updatedVendors = projectState.metadata.vendors.map((v) =>
        v.id === activeVendor.id
          ? {
              ...v,
              fileName: result.fileName,
              fileSize: result.fileSize,
              pageCount: result.pageCount,
            }
          : v
      )
      handleUpdateProject({
        ...projectState,
        metadata: {
          ...projectState.metadata,
          vendors: updatedVendors,
        },
      })
      ui.showToast(`Scan PDF untuk ${activeVendor.name} berhasil dimuat (${result.pageCount} hal).`, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      ui.showToast(`Gagal memuat Scan PDF: ${msg}`, 'error')
    }
  }

  const handleRegisterPdf = (role: 'master' | string, docProxy: PDFDocumentProxy) => {
    if (role === 'master') {
      setMasterPdfDoc(docProxy)
    } else {
      setScanPdfDocs((prev) => ({ ...prev, [role]: docProxy }))
    }
  }

  // Rotasi deskew
  const handleDeskewChange = (deg: number) => {
    const updatedVendors = projectState.metadata.vendors.map((v) =>
      v.id === activeVendor.id ? { ...v, rotationDeskew: deg } : v
    )
    handleUpdateProject({
      ...projectState,
      metadata: {
        ...projectState.metadata,
        vendors: updatedVendors,
      },
    })
  }

  // Zoom controls mandiri (Master & Scan)
  const handleMasterZoomChange = (newScale: number) => {
    const clamped = Math.min(2.5, Math.max(0.5, Math.round(newScale * 100) / 100))
    setMasterZoomScale(clamped)
    if (isZoomSynced) setScanZoomScale(clamped)
  }

  const handleScanZoomChange = (newScale: number) => {
    const clamped = Math.min(2.5, Math.max(0.5, Math.round(newScale * 100) / 100))
    setScanZoomScale(clamped)
    if (isZoomSynced) setMasterZoomScale(clamped)
  }

  const handleToggleZoomSync = () => {
    const nextSync = !isZoomSynced
    setIsZoomSynced(nextSync)
    if (nextSync) {
      setScanZoomScale(masterZoomScale)
      ui.showToast('Zoom kedua dokumen ditautkan bersama.', 'info')
    } else {
      ui.showToast('Zoom mandiri aktif: Dokumen Master dan Scan dapat di-zoom sendiri-sendiri.', 'info')
    }
  }

  // Menangani penandaan koordinat independen (Master vs Scan) dengan alur status kelengkapan
  const handleUpdateCoordinates = (
    target: 'master' | 'scan',
    coords: PdfCoordinates,
    cropDataUrl?: string
  ) => {
    // 1. Jika ada anotasi yang sedang dipilih:
    if (selectedAnnotationId) {
      const updatedList = currentAnnotations.map((item) => {
        if (item.annotation_id !== selectedAnnotationId) return item
        if (target === 'master') {
          const nextStatus: MarkingCompleteness =
            item.marking_status === 'pending_master' ? 'complete' : item.marking_status || 'complete'
          const mCrop = cropDataUrl || extractCropSnippetFromPdfCoords(masterCanvas, coords)
          const sCoords = item.coordinates || coords
          const sCrop = item.cropThumbnailScan || extractCropSnippetFromPdfCoords(scanCanvas, sCoords)
          return {
            ...item,
            master_coordinates: coords,
            cropThumbnailMaster: mCrop,
            cropThumbnailScan: sCrop,
            cropThumbnail: sCrop || mCrop,
            marking_status: nextStatus,
          }
        } else {
          const nextStatus: MarkingCompleteness =
            item.marking_status === 'pending_scan' ? 'complete' : item.marking_status || 'complete'
          const sCrop = cropDataUrl || extractCropSnippetFromPdfCoords(scanCanvas, coords)
          const mCoords = item.master_coordinates || (item.marking_status === 'complete' ? coords : undefined)
          const mCrop = item.cropThumbnailMaster || (mCoords ? extractCropSnippetFromPdfCoords(masterCanvas, mCoords) : undefined)
          return {
            ...item,
            coordinates: coords,
            cropThumbnailScan: sCrop,
            cropThumbnailMaster: mCrop,
            cropThumbnail: sCrop || mCrop,
            marking_status: nextStatus,
          }
        }
      })

      handleUpdateProject({
        ...projectState,
        annotations: {
          ...projectState.annotations,
          [curPage]: updatedList,
        },
      })

      const targetLabel = target === 'master' ? 'Master' : 'Scan'
      ui.showToast(
        `Posisi ${selectedAnnotationId} di ${targetLabel} berhasil disetel! (Status: Lengkap)`,
        'success'
      )
      return
    }

    // 2. Jika belum ada yang dipilih -> buat anotasi baru
    const newId = `ID-${Date.now().toString(36).slice(-4).toUpperCase()}`
    const isFromMaster = target === 'master'
    const mCrop = isFromMaster
      ? (cropDataUrl || extractCropSnippetFromPdfCoords(masterCanvas, coords))
      : undefined
    const sCrop = !isFromMaster
      ? (cropDataUrl || extractCropSnippetFromPdfCoords(scanCanvas, coords))
      : undefined

    const newAnnot: TashihAnnotation = {
      annotation_id: newId,
      vendor: activeVendor.name,
      page_number: curPage,
      marked_by: 'Editor Manusia',
      timestamp_created: new Date().toISOString(),
      coordinates: coords,
      master_coordinates: isFromMaster ? coords : undefined,
      marking_status: isFromMaster ? 'pending_scan' : 'pending_master',
      content: {
        error_category: 'Koreksi Naskah',
        reason: 'Perbedaan teks atau noda tinta ditemukan oleh editor.',
        suggestion: 'Minta vendor memeriksa ulang plat cetak.',
      },
      review: {
        severity: 'kritis',
        approval_status: 'revisi',
        reviewed_by: projectState.metadata.leadEditor,
        timestamp_reviewed: new Date().toISOString(),
      },
      cropThumbnailMaster: mCrop,
      cropThumbnailScan: sCrop,
      cropThumbnail: sCrop || mCrop,
    }

    const updatedList = [...currentAnnotations, newAnnot]
    handleUpdateProject({
      ...projectState,
      annotations: {
        ...projectState.annotations,
        [curPage]: updatedList,
      },
    })
    setSelectedAnnotationId(newId)
    ui.showToast(
      isFromMaster
        ? `${newId} ditandai di Master. Silakan pilih di Dokumen Scan.`
        : `${newId} ditandai di Scan. Silakan pilih di Dokumen Master.`,
      'info'
    )
  }

  // Menangani penyimpanan penanda baru yang diisi melalui popover form NewMarkerModal
  const handleSaveNewAnnotationWithForm = (
    target: 'master' | 'scan',
    coords: PdfCoordinates,
    cropDataUrl: string | undefined,
    formData: MarkerFormData
  ) => {
    const nextItemNumber = currentAnnotations.length + 1
    const newId = `ID-${Date.now().toString(36).slice(-4).toUpperCase()}`
    const isFromMaster = target === 'master'

    const mCrop = isFromMaster
      ? (cropDataUrl || extractCropSnippetFromPdfCoords(masterCanvas, coords))
      : undefined
    const sCrop = !isFromMaster
      ? (cropDataUrl || extractCropSnippetFromPdfCoords(scanCanvas, coords))
      : undefined

    const newAnnot: TashihAnnotation = {
      annotation_id: newId,
      item_number: nextItemNumber,
      vendor: activeVendor.name,
      page_number: curPage,
      marked_by: 'Editor Manusia',
      timestamp_created: new Date().toISOString(),
      coordinates: coords,
      master_coordinates: isFromMaster ? coords : undefined,
      marking_status: isFromMaster ? 'pending_scan' : 'pending_master',
      vendor_coordinates: {
        [activeVendor.id]: coords,
      },
      vendor_crops: sCrop ? { [activeVendor.id]: sCrop } : {},
      content: {
        error_category: formData.error_category,
        reason: formData.reason,
        suggestion: formData.suggestion,
        text_master: formData.text_master,
        text_scan: formData.text_scan,
      },
      review: {
        severity: formData.severity,
        approval_status: 'revisi',
        reviewed_by: projectState.metadata.leadEditor,
        timestamp_reviewed: new Date().toISOString(),
      },
      cropThumbnailMaster: mCrop,
      cropThumbnailScan: sCrop,
      cropThumbnail: sCrop || mCrop,
    }

    const updatedList = [...currentAnnotations, newAnnot]
    handleUpdateProject({
      ...projectState,
      annotations: {
        ...projectState.annotations,
        [curPage]: updatedList,
      },
    })
    setSelectedAnnotationId(newId)
    ui.showToast(
      isFromMaster
        ? `Temuan #${nextItemNumber} (${newId}) disimpan di Master. Silakan tautkan di Scan.`
        : `Temuan #${nextItemNumber} (${newId}) disimpan di Scan. Silakan tautkan di Master.`,
      'success'
    )
  }

  // Tambah Anotasi dari Form Manual Inspector
  const handleAddAnnotationFromForm = (content: AnnotationContent, severity: SeverityLevel) => {
    const newId = `ID-${Date.now().toString(36).slice(-4).toUpperCase()}`
    const newAnnot: TashihAnnotation = {
      annotation_id: newId,
      vendor: activeVendor.name,
      page_number: curPage,
      marked_by: 'Editor Manusia',
      timestamp_created: new Date().toISOString(),
      coordinates: {
        pdf_x: 60,
        pdf_y: 120 + currentAnnotations.length * 40,
        width: 380,
        height: 35,
        rotation_degree: activeVendor.rotationDeskew,
      },
      marking_status: 'complete',
      content,
      review: {
        severity,
        approval_status: 'revisi',
        reviewed_by: projectState.metadata.leadEditor,
        timestamp_reviewed: new Date().toISOString(),
      },
    }

    const updatedList = [...currentAnnotations, newAnnot]
    handleUpdateProject({
      ...projectState,
      annotations: {
        ...projectState.annotations,
        [curPage]: updatedList,
      },
    })
    setSelectedAnnotationId(newId)
    ui.showToast(`Catatan ${newId} disimpan.`, 'success')
  }

  // Update Review Severity / Approval Status
  const handleUpdateReview = (
    id: string,
    severity: SeverityLevel,
    status: 'disetujui' | 'revisi' | 'ditolak'
  ) => {
    const updatedList = currentAnnotations.map((item) =>
      item.annotation_id === id
        ? {
            ...item,
            review: {
              ...item.review,
              severity,
              approval_status: status,
              reviewed_by: projectState.metadata.leadEditor,
              timestamp_reviewed: new Date().toISOString(),
            },
          }
        : item
    )

    handleUpdateProject({
      ...projectState,
      annotations: {
        ...projectState.annotations,
        [curPage]: updatedList,
      },
    })
    ui.showToast(`Status temuan diubah ke ${severity.toUpperCase()}`, 'info')
  }

  // Hapus Anotasi
  const handleDeleteAnnotation = (id: string) => {
    const updatedList = currentAnnotations.filter((a) => a.annotation_id !== id)
    handleUpdateProject({
      ...projectState,
      annotations: {
        ...projectState.annotations,
        [curPage]: updatedList,
      },
    })
    if (selectedAnnotationId === id) setSelectedAnnotationId(null)
    ui.showToast('Temuan anotasi dihapus.', 'info')
  }

  // Samakan Koordinat Posisi Master & Scan (Mirroring)
  const handleMirrorCoordinates = (id: string) => {
    const updatedList = currentAnnotations.map((item) => {
      if (item.annotation_id !== id) return item
      const coordsToMirror = item.master_coordinates || item.coordinates
      const mCrop = item.cropThumbnailMaster || extractCropSnippetFromPdfCoords(masterCanvas, coordsToMirror)
      const sCrop = item.cropThumbnailScan || extractCropSnippetFromPdfCoords(scanCanvas, coordsToMirror)
      return {
        ...item,
        master_coordinates: coordsToMirror,
        coordinates: coordsToMirror,
        cropThumbnailMaster: mCrop,
        cropThumbnailScan: sCrop,
        cropThumbnail: sCrop || mCrop,
        marking_status: 'complete' as MarkingCompleteness,
      }
    })
    handleUpdateProject({
      ...projectState,
      annotations: {
        ...projectState.annotations,
        [curPage]: updatedList,
      },
    })
    ui.showToast(`Koordinat Master & Scan untuk ${id} disamakan sejajar. Status Lengkap.`, 'success')
  }

  // Bersihkan Penandaan Tunggal (Un-pair / putus relasi koordinat dokumen tertentu)
  const handleClearSingleTarget = (id: string, target: 'master' | 'scan') => {
    const updatedList = currentAnnotations.map((item) => {
      if (item.annotation_id !== id) return item
      if (target === 'master') {
        const copy = { ...item }
        delete copy.master_coordinates
        copy.marking_status = 'pending_master' as MarkingCompleteness
        return copy
      } else {
        const copy = { ...item }
        copy.marking_status = 'pending_scan' as MarkingCompleteness
        return copy
      }
    })
    handleUpdateProject({
      ...projectState,
      annotations: {
        ...projectState.annotations,
        [curPage]: updatedList,
      },
    })
    ui.showToast(`Tanda di ${target.toUpperCase()} untuk ${id} dibersihkan. Status: perlu pasangan.`, 'info')
  }

  // Bersihkan Seluruh Penandaan di Halaman Aktif (Clear Page)
  const handleClearPageAnnotations = () => {
    const count = currentAnnotations.length
    handleUpdateProject({
      ...projectState,
      annotations: {
        ...projectState.annotations,
        [curPage]: [],
      },
    })
    setSelectedAnnotationId(null)
    ui.showToast(`Seluruh ${count} temuan di halaman ${curPage} telah dibersihkan.`, 'info')
  }

  // Reset Posisi Master agar Kembali Sejajar dengan Scan
  const handleResetMasterCoordinates = (id: string) => {
    const updatedList = currentAnnotations.map((item) => {
      if (item.annotation_id !== id) return item
      const copy = { ...item }
      delete copy.master_coordinates
      copy.marking_status = 'complete' as MarkingCompleteness
      return copy
    })
    handleUpdateProject({
      ...projectState,
      annotations: {
        ...projectState.annotations,
        [curPage]: updatedList,
      },
    })
    ui.showToast(`Relasi posisi Master untuk ${id} direset sejajar dengan Scan.`, 'info')
  }

  // Jalankan Pixel Diff Lokal
  const handleRunPixelDiff = () => {
    if (!masterCanvas || !scanCanvas) {
      ui.showToast('Kanvas belum siap untuk dibandingkan.', 'info')
      return
    }

    ui.showToast('Memindai perbedaan piksel master vs scan...', 'info')
    const boxes = runPixelDiff(masterCanvas, scanCanvas, {
      threshold: 30,
      gridSize: 28,
    })

    if (boxes.length === 0) {
      ui.showToast('Tidak ada anomali piksel signifikan pada halaman ini.', 'success')
      return
    }

    const newAnnots: TashihAnnotation[] = boxes.map((box) => ({
      annotation_id: box.id.replace('diff-', 'PX-'),
      vendor: activeVendor.name,
      page_number: curPage,
      marked_by: 'Pixel Diff',
      timestamp_created: new Date().toISOString(),
      coordinates: box.pdfCoords,
      content: {
        error_category: 'Anomali Piksel Cetak',
        reason: 'Perbedaan kontur piksel visual melebihi ambang batas toleransi.',
        suggestion: 'Periksa naskah fisik pada posisi ini terhadap naskah master.',
      },
      review: {
        severity: 'koreksi',
        approval_status: 'saran_ai',
        reviewed_by: projectState.metadata.leadEditor,
        timestamp_reviewed: new Date().toISOString(),
      },
      cropThumbnail: box.cropThumbnail,
      cropThumbnailMaster: box.cropThumbnailMaster,
      cropThumbnailScan: box.cropThumbnailScan,
    }))

    handleUpdateProject({
      ...projectState,
      annotations: {
        ...projectState.annotations,
        [curPage]: [...currentAnnotations, ...newAnnots],
      },
    })

    ui.showToast(`Ditemukan ${boxes.length} anomali piksel via Pixel Diff.`, 'success')
  }

  // Jalankan Vision AI (Sumopod / OpenAI API)
  const handleRunVisionAi = async () => {
    if (!masterCanvas || !scanCanvas) {
      ui.showToast('Kanvas belum siap.', 'info')
      return
    }

    setIsAiLoading(true)
    ui.showToast('Menghubungi Vision AI (Sumopod)...', 'info')

    try {
      const masterB64 = masterCanvas.toDataURL('image/jpeg', 0.8)
      const scanB64 = scanCanvas.toDataURL('image/jpeg', 0.8)

      const result = await analyzeComparisonWithAi({
        masterImageBase64: masterB64,
        scanImageBase64: scanB64,
        domainPreset: projectState.metadata.domainPreset,
        pageNumber: curPage,
        vendorName: activeVendor.name,
        settings: projectState.metadata.aiSettings,
      })

      const newId = `AI-${Date.now().toString(36).slice(-4).toUpperCase()}`
      const coords = {
        pdf_x: 60,
        pdf_y: 180,
        width: 380,
        height: 45,
        rotation_degree: activeVendor.rotationDeskew,
      }
      const cropMaster = extractCropSnippetFromPdfCoords(masterCanvas, coords)
      const cropScan = extractCropSnippetFromPdfCoords(scanCanvas, coords)

      const aiAnnot: TashihAnnotation = {
        annotation_id: newId,
        vendor: activeVendor.name,
        page_number: curPage,
        marked_by: 'Vision AI',
        timestamp_created: new Date().toISOString(),
        coordinates: coords,
        master_coordinates: coords,
        marking_status: 'complete',
        content: result.content,
        review: {
          severity: result.suggestedSeverity,
          approval_status: 'saran_ai',
          reviewed_by: projectState.metadata.leadEditor,
          timestamp_reviewed: new Date().toISOString(),
        },
        cropThumbnailMaster: cropMaster,
        cropThumbnailScan: cropScan,
        cropThumbnail: cropScan || cropMaster,
      }

      handleUpdateProject({
        ...projectState,
        annotations: {
          ...projectState.annotations,
          [curPage]: [...currentAnnotations, aiAnnot],
        },
      })

      setSelectedAnnotationId(newId)
      ui.showToast('Saran Vision AI berhasil diterima!', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      ui.showToast(`Gagal analisis AI: ${msg}`, 'error')
    } finally {
      setIsAiLoading(false)
    }
  }

  return (
    <div className="plugin-workbench-container" style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      {/* ── Manuscriber-Standard Unified Header (Compact & Hover-to-Know) ── */}
      <div className="plugin-workbench-header" style={{ height: '42px', padding: '0 8px' }}>
        <div className="workbench-title-group" style={{ gap: '6px' }}>
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={onClose}
            title="Kembali ke Dokumen Utama (Esc)"
            style={{ width: '28px', height: '28px' }}
          >
            <FluentArrowLeft size={16} />
          </button>

          <span className="workbench-header-divider" style={{ margin: '0 2px' }} />

          {/* Project Title Badge */}
          <button
            type="button"
            className="workbench-file-badge"
            onClick={() => setIsProjectModalOpen(true)}
            title={`Kelola Proyek: ${projectState.metadata.title} (Klik untuk buka folder & ubah preset)`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px' }}
          >
            <FluentFolder size={13} />
            <span className="workbench-file-name">{projectState.metadata.title}</span>
          </button>

          {/* Page Navigator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'var(--surface-subtle)',
              padding: '1px 4px',
              borderRadius: 'var(--radius-6, 4px)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              className="btn-workbench-icon"
              disabled={curPage <= 1}
              onClick={() => actions.goToPage(Math.max(1, curPage - 1))}
              title="Halaman Sebelumnya"
              style={{ width: '24px', height: '24px' }}
            >
              <FluentChevronLeft size={13} />
            </button>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', padding: '0 4px' }}>
              {curPage} / {totalPageCount}
            </span>
            <button
              type="button"
              className="btn-workbench-icon"
              disabled={curPage >= totalPageCount}
              onClick={() => actions.goToPage(Math.min(totalPageCount, curPage + 1))}
              title="Halaman Berikutnya"
              style={{ width: '24px', height: '24px' }}
            >
              <FluentChevronRight size={13} />
            </button>
          </div>

          {/* ── Dual Zoom Indicators & Sync Toggle (Hover-to-Know) ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--surface-subtle)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-6, 4px)',
              border: '1px solid var(--border)',
            }}
          >
            <span
              style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
              title="Skala Zoom Mandiri: Master Layout vs Scan Vendor"
            >
              M: <b>{Math.round(masterZoomScale * 100)}%</b> | S: <b>{Math.round(scanZoomScale * 100)}%</b>
            </span>

            <button
              type="button"
              className="btn-workbench-icon"
              onClick={handleToggleZoomSync}
              title={
                isZoomSynced
                  ? 'Zoom Tertaut Bersama (Klik untuk mode zoom sendiri-sendiri)'
                  : 'Zoom Mandiri Aktif (Masing-masing file di-zoom sendiri-sendiri. Klik untuk tautkan bersama)'
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
          </div>

          <span className="workbench-header-divider" style={{ margin: '0 2px' }} />

          {/* Multi-Vendor Tabs */}
          <div className="tashih-vendor-tabs">
            {projectState.metadata.vendors.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`tashih-vendor-tab ${v.id === activeVendor.id ? 'active' : ''}`}
                onClick={() => handleSelectVendor(v.id)}
                title={`Pilih Dokumen Scan: ${v.name}`}
              >
                {v.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '11px',
                color: 'var(--accent, #c43e1c)',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                padding: '3px 6px',
              }}
              title="Tambah vendor percetakan lain"
            >
              <FluentAdd size={12} />
              <span>Vendor</span>
            </button>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="workbench-actions-group" style={{ gap: '6px' }}>
          {/* Deskew Tool */}
          <DeskewControl
            rotationDegree={activeVendor.rotationDeskew}
            onChange={handleDeskewChange}
            onReset={() => handleDeskewChange(0)}
          />

          {/* Onion Skin Toggle */}
          <button
            type="button"
            className="btn-workbench-action"
            onClick={() =>
              handleUpdateProject({
                ...projectState,
                overlayMode: !projectState.overlayMode,
              })
            }
            style={{
              borderColor: projectState.overlayMode ? 'var(--accent, #c43e1c)' : undefined,
              color: projectState.overlayMode ? 'var(--accent, #c43e1c)' : undefined,
              fontWeight: projectState.overlayMode ? 600 : undefined,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              fontSize: '11px',
            }}
            title="Mode Tumpang Tindih (Onion-Skin) untuk memeriksa register dan pergeseran plat cetak"
          >
            <FluentLayers size={13} />
            <span>{projectState.overlayMode ? 'Onion: ON' : 'Onion-Skin'}</span>
          </button>

          {/* AI Settings */}
          <button
            type="button"
            className="btn-workbench-icon"
            onClick={() => setIsSettingsModalOpen(true)}
            title="Pengaturan API Sumopod (Multimodal Vision)"
            style={{ width: '28px', height: '28px' }}
          >
            <FluentSettings size={14} />
          </button>

          {/* Export Report */}
          <button
            type="button"
            className="btn-workbench-action"
            onClick={() => setIsExportModalOpen(true)}
            title="Cetak Surat Perintah Revisi Pracetak & Ekspor Data Excel"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '11px' }}
          >
            <FluentDocumentTable size={13} />
            <span>Laporan Revisi</span>
          </button>

          <button
            type="button"
            className="btn-workbench-action primary"
            onClick={onClose}
            title="Simpan penelaahan dan kembali ke editor utama (Esc)"
            style={{ padding: '3px 10px', fontSize: '11px' }}
          >
            Selesai
          </button>
        </div>
      </div>

      {/* ── Workbench Body: 3-Panel Responsif (Zero-Void Flexbox) ── */}
      <div className="tashih-workspace-layout">
        <ComparisonViewport
          currentPage={curPage}
          rotationDegree={activeVendor.rotationDeskew}
          overlayMode={projectState.overlayMode}
          overlayOpacity={projectState.overlayOpacity}
          masterZoomScale={masterZoomScale}
          scanZoomScale={scanZoomScale}
          onMasterZoomChange={handleMasterZoomChange}
          onScanZoomChange={handleScanZoomChange}
          isZoomSynced={isZoomSynced}
          onToggleZoomSync={handleToggleZoomSync}
          pdfDocument={pdfDocument}
          masterPdfDocument={masterPdfDoc || pdfDocument}
          scanPdfDocument={scanPdfDocs[activeVendor.id] || null}
          activeVendorName={activeVendor.name}
          activeVendorId={activeVendor.id}
          domainPreset={projectState.metadata.domainPreset}
          onSelectMasterPdfFile={handleSelectMasterPdfFile}
          onSelectScanPdfFile={handleSelectScanPdfFile}
          annotations={currentAnnotations}
          selectedAnnotationId={selectedAnnotationId}
          onSelectAnnotation={setSelectedAnnotationId}
          onUpdateCoordinates={handleUpdateCoordinates}
          onSaveNewAnnotationWithForm={handleSaveNewAnnotationWithForm}
          onDeleteAnnotation={handleDeleteAnnotation}
          onMirrorCoordinates={handleMirrorCoordinates}
          onMasterCanvasReady={setMasterCanvas}
          onScanCanvasReady={setScanCanvas}
        />

        <InspectorPanel
          domainPreset={projectState.metadata.domainPreset}
          currentPage={curPage}
          activeVendorName={activeVendor.name}
          activeVendorId={activeVendor.id}
          vendors={projectState.metadata.vendors}
          onSwitchActiveVendor={handleSelectVendor}
          annotations={currentAnnotations}
          selectedAnnotationId={selectedAnnotationId}
          onSelectAnnotation={setSelectedAnnotationId}
          onAddAnnotation={handleAddAnnotationFromForm}
          onUpdateReview={handleUpdateReview}
          onDeleteAnnotation={handleDeleteAnnotation}
          onResetMasterCoordinates={handleResetMasterCoordinates}
          onMirrorCoordinates={handleMirrorCoordinates}
          onClearSingleTarget={handleClearSingleTarget}
          onClearPageAnnotations={handleClearPageAnnotations}
          onRunPixelDiff={handleRunPixelDiff}
          onRunVisionAi={handleRunVisionAi}
          isAiLoading={isAiLoading}
        />
      </div>

      {/* ── Dialog Modals ── */}
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
        onSave={(newSettings) =>
          handleUpdateProject({
            ...projectState,
            metadata: {
              ...projectState.metadata,
              aiSettings: newSettings,
            },
          })
        }
      />

      <ProjectModal
        currentMetadata={projectState.metadata}
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onProjectLoaded={(meta) =>
          handleUpdateProject({
            ...projectState,
            metadata: meta,
            activeVendorId: meta.vendors[0]?.id || 'vendor-a',
          })
        }
        showToast={ui.showToast}
        hostDocument={
          doc?.filePath
            ? {
                filePath: doc.filePath,
                fileName: doc.filePath.split(/[/\\]/).pop() || 'document.pdf',
                pageCount: doc.pageCount,
                pdfDocument: doc.pdfDocument,
              }
            : null
        }
        onRegisterPdf={handleRegisterPdf}
      />
    </div>
  )
}
