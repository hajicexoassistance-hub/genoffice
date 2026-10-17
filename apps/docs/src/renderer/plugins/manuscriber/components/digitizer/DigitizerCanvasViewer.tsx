/**
 * Manuscriber Plugin — Digitizer Canvas Viewer (Left Pane)
 * Renders high-resolution physical manuscript page with SVG/CSS bounding box overlays,
 * contrast/brightness enhancers, and tight interactive spotlight selection.
 */

import React, { useRef, useState, useEffect } from 'react'
import type { DigitizerBlock, PageGeometrySpec } from '../../types'
import {
  IconFocus,
  IconRefresh,
  IconDocument,
  IconFolderOpen,
} from '../icons/ManuscriberIcons'

interface DigitizerCanvasViewerProps {
  imageDataUrl: string | null
  geometry: PageGeometrySpec | null
  blocks: DigitizerBlock[]
  selectedBlockId: string | null
  showBoundingBoxes: boolean
  showJadwalBorder: boolean
  zoomScale: number
  contrastLevel: number
  brightnessLevel: number
  onSelectBlock: (id: string | null) => void
  onZoomChange: (scale: number) => void
  onContrastChange: (contrast: number) => void
  onBrightnessChange: (brightness: number) => void
  onToggleBoundingBoxes: () => void
  onToggleJadwalBorder: () => void
  onPickFile?: () => void
  onLoadDemo?: () => void
  onDropFile?: (file: File) => void
  isLoading: boolean
}

export const DigitizerCanvasViewer: React.FC<DigitizerCanvasViewerProps> = ({
  imageDataUrl,
  geometry,
  blocks,
  selectedBlockId,
  showBoundingBoxes,
  showJadwalBorder,
  zoomScale,
  contrastLevel,
  brightnessLevel,
  onSelectBlock,
  onZoomChange,
  onContrastChange,
  onBrightnessChange,
  onToggleBoundingBoxes,
  onToggleJadwalBorder,
  onPickFile,
  onLoadDemo,
  onDropFile,
  isLoading,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 800, height: 1100 })
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!imageDataUrl) return
    const img = new Image()
    img.src = imageDataUrl
    img.onload = () => {
      setImageSize({ width: img.naturalWidth || 800, height: img.naturalHeight || 1100 })
    }
  }, [imageDataUrl])

  const filterStyle = `contrast(${contrastLevel}%) brightness(${brightnessLevel}%)`

  return (
    <div className="digitizer-pane digitizer-left-pane">
      {/* Top micro-toolbar for viewer controls */}
      <div className="digitizer-pane-toolbar">
        <div className="viewer-tool-group">
          <span className="viewer-tool-label">Naskah Fisik</span>
          <span className="workbench-header-divider" />

          {/* Zoom Controls */}
          <button
            type="button"
            className="btn-viewer-tool"
            onClick={() => onZoomChange(Math.max(0.4, Number((zoomScale - 0.15).toFixed(2))))}
            title="Perkecil (-)"
          >
            -
          </button>
          <span className="viewer-zoom-text">{Math.round(zoomScale * 100)}%</span>
          <button
            type="button"
            className="btn-viewer-tool"
            onClick={() => onZoomChange(Math.min(2.5, Number((zoomScale + 0.15).toFixed(2))))}
            title="Perbesar (+)"
          >
            +
          </button>
          <button
            type="button"
            className="btn-viewer-tool-text"
            onClick={() => onZoomChange(1.0)}
            title="Kembali ke 100%"
          >
            100%
          </button>
        </div>

        <div className="viewer-tool-group">
          {/* Contrast Slider */}
          <label className="viewer-slider-item" title={`Kontras Citra: ${contrastLevel}%`}>
            <span>Kontras</span>
            <input
              type="range"
              min={70}
              max={160}
              value={contrastLevel}
              onChange={(e) => onContrastChange(Number(e.target.value))}
              className="viewer-range-slider"
            />
          </label>

          <span className="workbench-header-divider" />

          {/* Toggle Bounding Box Overlays */}
          <button
            type="button"
            className={`btn-viewer-tool-toggle ${showBoundingBoxes ? 'active' : ''}`}
            onClick={onToggleBoundingBoxes}
            title="Tampilkan / Sembunyikan Kotak Bounding Box Teks"
          >
            <IconFocus size={13} />
            <span>Kotak Teks ({blocks.length})</span>
          </button>

          {/* Toggle Jadwal Border Overlay */}
          {geometry?.hasBorder && (
            <button
              type="button"
              className={`btn-viewer-tool-toggle ${showJadwalBorder ? 'active' : ''}`}
              onClick={onToggleJadwalBorder}
              title="Tampilkan / Sembunyikan Garis Bingkai Jadwal"
            >
              <span>Jadwal</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Canvas Canvas Area */}
      <div className="digitizer-canvas-scroll-area" ref={containerRef}>
        {isLoading && !imageDataUrl ? (
          <div className="digitizer-canvas-empty-state">
            <IconRefresh size={32} className="spin" />
            <p>Memuat halaman naskah...</p>
          </div>
        ) : !imageDataUrl ? (
          <div
            className={`digitizer-canvas-empty-state ${isDragging ? 'dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file && onDropFile) onDropFile(file)
            }}
          >
            <div className="digitizer-drop-card" onClick={(e) => e.stopPropagation()}>
              <div className="digitizer-drop-icon">
                <IconDocument size={36} color="var(--word-blue, #185abd)" />
              </div>
              <h3 style={{ margin: '8px 0 4px', fontSize: '15px', fontWeight: 600 }}>
                Mulai Digitasi Naskah 1:1
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: 360 }}>
                Mendukung berkas PDF kitab kuning, manuskrip kuno, atau foto naskah (PNG, JPG, WebP)
              </p>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                {onLoadDemo && (
                  <button
                    type="button"
                    className="btn-digitizer-action highlight"
                    style={{ padding: '6px 16px', fontWeight: 600 }}
                    onClick={onLoadDemo}
                    title="Uji coba langsung dengan contoh naskah Turats sintesis berbingkai jadwal & nadzom"
                  >
                    <span>⚡ Coba Contoh Naskah Uji (Demo)</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-digitizer-action"
                  style={{ padding: '6px 14px' }}
                  onClick={onPickFile}
                  title="Pilih berkas PDF atau gambar naskah dari komputer"
                >
                  <IconFolderOpen size={14} />
                  <span>Pilih Berkas Naskah</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="digitizer-canvas-stage"
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top center',
              width: imageSize.width,
              height: imageSize.height,
            }}
          >
            {/* The Physical Manuscript Image */}
            <img
              src={imageDataUrl}
              alt="Halaman Naskah Fisik"
              className="digitizer-manuscript-img"
              style={{ filter: filterStyle }}
              draggable={false}
            />

            {/* Simulated Jadwal Border Overlay */}
            {showJadwalBorder && geometry?.hasBorder && (
              <div
                className="digitizer-jadwal-overlay"
                style={{
                  top: geometry.jadwalInsetPercent ? `${geometry.jadwalInsetPercent.top}%` : (geometry.margins.top || '1.2cm'),
                  bottom: geometry.jadwalInsetPercent ? `${geometry.jadwalInsetPercent.bottom}%` : (geometry.margins.bottom || '1.2cm'),
                  left: geometry.jadwalInsetPercent ? `${geometry.jadwalInsetPercent.left}%` : (geometry.margins.left || '1.0cm'),
                  right: geometry.jadwalInsetPercent ? `${geometry.jadwalInsetPercent.right}%` : (geometry.margins.right || '1.0cm'),
                  border:
                    geometry.borderStyle === 'double'
                      ? `2.5px double ${geometry.borderColor || '#4a3525'}`
                      : `1.5px solid ${geometry.borderColor || '#4a3525'}`,
                }}
              />
            )}

            {/* Bounding Box Overlays */}
            {showBoundingBoxes &&
              blocks.map((b) => {
                const [ymin, xmin, ymax, xmax] = b.bbox
                const top = (ymin / 1000) * 100
                const left = (xmin / 1000) * 100
                const width = ((xmax - xmin) / 1000) * 100
                const height = ((ymax - ymin) / 1000) * 100
                const isSelected = selectedBlockId === b.id

                return (
                  <div
                    key={b.id}
                    className={`digitizer-bbox-item type-${b.type} ${isSelected ? 'selected' : ''}`}
                    style={{
                      top: `${top}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    onClick={() => onSelectBlock(isSelected ? null : b.id)}
                    title={`[${b.type}] ${(b.tahqiqText || b.rawOcrText).slice(0, 80)}`}
                  >
                    <span className="digitizer-bbox-badge">{b.type}</span>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
