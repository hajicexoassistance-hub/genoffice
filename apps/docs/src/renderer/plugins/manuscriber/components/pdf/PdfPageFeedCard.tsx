import React, { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import type { StagingLine } from '../../types'
import {
  IconPlus,
  IconCheck,
  IconRefresh,
  IconSparkles,
} from '../icons/ManuscriberIcons'

interface PdfPageFeedCardProps {
  pageNo: number
  pdfDocument: PDFDocumentProxy
  zoomScale: number
  activeLineId: string | null
  lines: StagingLine[]
  status: 'idle' | 'transcribing' | 'done' | 'error'
  showSpotlight?: boolean
  onTranscribe: (pageNo: number) => void
  onSelectLine: (id: string) => void
  onInView?: (pageNo: number) => void
}

export const PdfPageFeedCard: React.FC<PdfPageFeedCardProps> = ({
  pageNo,
  pdfDocument,
  zoomScale,
  activeLineId,
  lines,
  status,
  showSpotlight = true,
  onTranscribe,
  onSelectLine,
  onInView,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState<boolean>(false)
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 595, height: 842 })
  const renderTaskRef = useRef<RenderTask | null>(null)

  // Fetch unscaled page viewport dimensions on mount / document change
  useEffect(() => {
    let active = true
    pdfDocument
      .getPage(pageNo)
      .then((page) => {
        if (!active) return
        const vp = page.getViewport({ scale: 1.0 })
        setPageSize({ width: vp.width, height: vp.height })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [pdfDocument, pageNo])

  // Continuous page rendering matching PdfViewerPanel.tsx
  useEffect(() => {
    let active = true

    const renderPage = async () => {
      if (!canvasRef.current) return
      try {
        renderTaskRef.current?.cancel()
        const page = await pdfDocument.getPage(pageNo)
        if (!active) return

        const viewport = page.getViewport({ scale: zoomScale })
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
  }, [pdfDocument, pageNo, zoomScale])

  // In-view observer for statusbar tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && entries[0].intersectionRatio >= 0.4 && onInView) {
          onInView(pageNo)
        }
      },
      { threshold: [0.4] }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [pageNo, onInView])

  const scaledWidth = Math.floor(pageSize.width * zoomScale)
  const scaledHeight = Math.floor(pageSize.height * zoomScale)
  const pageLines = lines.filter((l) => (l.pageNo || l.pageNumber) === pageNo && l.bbox)

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
              <span className="page-done-badge" title="Halaman ini telah ditranskripsi">
                <IconCheck size={11} />
                <span>Selesai</span>
              </span>
              <button
                type="button"
                className="btn-page-retry"
                onClick={() => onTranscribe(pageNo)}
                title="Transkripsi ulang halaman ini dengan AI Vision"
              >
                <IconRefresh size={11} />
                <span>Ulang</span>
              </button>
            </>
          ) : status === 'transcribing' ? (
            <button type="button" className="btn-page-transcribe loading" disabled>
              <IconSparkles size={12} className="rotating-icon" />
              <span>Memproses AI...</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-page-transcribe"
              onClick={() => onTranscribe(pageNo)}
              title="Ekstraksi teks naskah dan koordinat kotak dengan AI Vision"
            >
              <IconPlus size={12} />
              <span>Transkripsi</span>
            </button>
          )}
        </div>
      </div>

      <div
        className="pdf-page-canvas-wrapper"
        style={{
          width: scaledWidth,
          height: scaledHeight,
          position: 'relative',
        }}
      >
        <canvas ref={canvasRef} className="pdf-page-canvas" />

        {!rendered && (
          <div
            className="pdf-page-card-skeleton"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: scaledWidth,
              height: scaledHeight,
            }}
          >
            <IconSparkles size={16} className="rotating-icon" color="#185abd" />
            <span>Memuat Halaman {pageNo}...</span>
          </div>
        )}

        {/* Spotlight Bounding Boxes */}
        {showSpotlight && scaledWidth > 0 && scaledHeight > 0 && (
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
            {pageLines.map((line) => {
              if (!line.bbox) return null
              const isSelected = line.id === activeLineId

              let top = 0, left = 0, width = 0, height = 0
              if (line.box_2d && Array.isArray(line.box_2d) && line.box_2d.length === 4) {
                const [ymin, xmin, ymax, xmax] = line.box_2d
                top = (ymin / 1000) * scaledHeight
                left = (xmin / 1000) * scaledWidth
                width = Math.max(12, ((xmax - xmin) / 1000) * scaledWidth)
                height = Math.max(10, ((ymax - ymin) / 1000) * scaledHeight)
              } else if (Array.isArray(line.bbox) && line.bbox.length === 4) {
                const [b0, b1, b2, b3] = line.bbox
                if (b0 > 100 || b1 > 100 || b2 > 100 || b3 > 100) {
                  top = (b0 / 1000) * scaledHeight
                  left = (b1 / 1000) * scaledWidth
                  width = Math.max(12, ((b3 - b1) / 1000) * scaledWidth)
                  height = Math.max(10, ((b2 - b0) / 1000) * scaledHeight)
                } else {
                  left = (b0 / 100) * scaledWidth
                  top = (b1 / 100) * scaledHeight
                  width = Math.max(12, (b2 / 100) * scaledWidth)
                  height = Math.max(10, (b3 / 100) * scaledHeight)
                }
              }
              const typeLabel = (line.type || 'TEKS').toUpperCase()

              return (
                <div
                  key={line.id}
                  className={`pdf-spotlight-box ${isSelected ? 'selected active-spotlight' : ''} type-${line.type || 'matan'}`}
                  style={{
                    top: `${top}px`,
                    left: `${left}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    pointerEvents: 'auto',
                  }}
                  onClick={() => onSelectLine(line.id)}
                  title={`Klik untuk fokus baris: "${line.text.slice(0, 40)}..."`}
                >
                  <span className="spotlight-tag-badge">
                    {typeLabel} #{pageLines.indexOf(line) + 1}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
