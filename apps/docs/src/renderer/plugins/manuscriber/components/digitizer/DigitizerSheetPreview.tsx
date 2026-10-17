/**
 * Manuscriber Plugin — Digitizer Sheet Preview & Geometry Inspector (Right Pane)
 * Provides 3 views:
 *  1. Live 1:1 Docx Rendered Sheet Preview
 *  2. Linguistic Tahqiq & OCR Diff Inspector
 *  3. Geometry & Layout Controls Inspector
 */

import React from 'react'
import type { DigitizerBlock, PageGeometrySpec } from '../../types'
import { compileToDocxHtml } from '../../services/digitizerPipelineService'
import { DigitizerTahqiqView } from './DigitizerTahqiqView'
import {
  IconDocument,
  IconSparkles,
  IconSettings,
} from '../icons/ManuscriberIcons'

interface DigitizerSheetPreviewProps {
  activeTab: 'preview' | 'tahqiq' | 'geometry'
  geometry: PageGeometrySpec | null
  blocks: DigitizerBlock[]
  selectedBlockId: string | null
  onTabChange: (tab: 'preview' | 'tahqiq' | 'geometry') => void
  onSelectBlock: (id: string | null) => void
  onUpdateBlockText: (id: string, text: string) => void
  onVerifyBlock: (id: string) => void
  onUpdateGeometry: (updates: Partial<PageGeometrySpec>) => void
}

export const DigitizerSheetPreview: React.FC<DigitizerSheetPreviewProps> = ({
  activeTab,
  geometry,
  blocks,
  selectedBlockId,
  onTabChange,
  onSelectBlock,
  onUpdateBlockText,
  onVerifyBlock,
  onUpdateGeometry,
}) => {
  const currentGeometry = geometry || {
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

  // Compile without outer page wrapper for live sheet preview
  const renderedInnerHtml = compileToDocxHtml(currentGeometry, blocks, false)

  const parseMarginNum = (val: string): number => {
    const num = parseFloat(val)
    return isNaN(num) ? 1.0 : num
  }

  return (
    <div className="digitizer-pane digitizer-right-pane">
      {/* Tab Switcher Toolbar */}
      <div className="digitizer-pane-toolbar">
        <div className="digitizer-tabs-nav">
          <button
            type="button"
            className={`btn-digitizer-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => onTabChange('preview')}
          >
            <IconDocument size={13} />
            <span>Lembar Pratinjau 1:1</span>
          </button>

          <button
            type="button"
            className={`btn-digitizer-tab ${activeTab === 'tahqiq' ? 'active' : ''}`}
            onClick={() => onTabChange('tahqiq')}
          >
            <IconSparkles size={13} />
            <span>Teks & Diff Tahqiq ({blocks.length})</span>
          </button>

          <button
            type="button"
            className={`btn-digitizer-tab ${activeTab === 'geometry' ? 'active' : ''}`}
            onClick={() => onTabChange('geometry')}
          >
            <IconSettings size={13} />
            <span>Inspektur Geometri</span>
          </button>
        </div>
      </div>

      {/* Pane Content Body */}
      <div className="digitizer-pane-body">
        {/* Tab 1: Live 1:1 Docx Rendered Sheet */}
        {activeTab === 'preview' && (
          <div className="digitizer-sheet-container">
            <div className="digitizer-sheet-paper-wrapper">
              <div
                className="digitizer-simulated-word-sheet"
                style={{
                  backgroundColor: currentGeometry.hasShading ? (currentGeometry.shadingTone || '#fbf7ee') : '#ffffff',
                  aspectRatio: currentGeometry.aspectRatio ? `${1 / currentGeometry.aspectRatio}` : '0.727',
                }}
              >
                {/* Single, crisp physical Jadwal Border Frame */}
                {currentGeometry.hasBorder ? (
                  <div
                    className="digitizer-sheet-frame"
                    style={{
                      top: currentGeometry.margins.top || '1.2cm',
                      bottom: currentGeometry.margins.bottom || '1.2cm',
                      left: currentGeometry.margins.left || '1.0cm',
                      right: currentGeometry.margins.right || '1.0cm',
                      border:
                        currentGeometry.borderStyle === 'double'
                          ? `3px double ${currentGeometry.borderColor || '#4a3525'}`
                          : `1.5px solid ${currentGeometry.borderColor || '#4a3525'}`,
                      padding: '14px 18px',
                    }}
                  >
                    {blocks.length === 0 ? (
                      <div className="digitizer-sheet-placeholder">
                        <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>Pratinjau Lembar Word 1:1</p>
                        <span className="digitizer-sheet-hint">
                          Ukuran Kertas: {currentGeometry.paperSize} • Margin: Atas {currentGeometry.margins.top}, Kiri {currentGeometry.margins.left}
                        </span>
                        <p className="digitizer-empty-hint" style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 8 }}>
                          Jalankan "1. Pindai Geometri & Teks" untuk melihat hasil penataan 1:1 naskah ini.
                        </p>
                      </div>
                    ) : (
                      <div
                        className="digitizer-sheet-inner-flow"
                        dangerouslySetInnerHTML={{ __html: renderedInnerHtml }}
                      />
                    )}
                  </div>
                ) : (
                  <div
                    className="digitizer-sheet-frame"
                    style={{
                      top: currentGeometry.margins.top || '1.2cm',
                      bottom: currentGeometry.margins.bottom || '1.2cm',
                      left: currentGeometry.margins.left || '1.0cm',
                      right: currentGeometry.margins.right || '1.0cm',
                      border: 'none',
                      padding: '14px 18px',
                    }}
                  >
                    {blocks.length === 0 ? (
                      <div className="digitizer-sheet-placeholder">
                        <p>Pratinjau Lembar Word 1:1</p>
                        <span className="digitizer-sheet-hint">
                          Ukuran Kertas: {currentGeometry.paperSize} • Margin: {currentGeometry.margins.top}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="digitizer-sheet-inner-flow"
                        dangerouslySetInnerHTML={{ __html: renderedInnerHtml }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Linguistic Tahqiq List & Diff View */}
        {activeTab === 'tahqiq' && (
          <DigitizerTahqiqView
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
            onUpdateBlockText={onUpdateBlockText}
            onVerifyBlock={onVerifyBlock}
          />
        )}

        {/* Tab 3: Geometry & Layout Inspector */}
        {activeTab === 'geometry' && (
          <div className="digitizer-geometry-inspector">
            <div className="geometry-section">
              <h4 className="geometry-section-title">Ukuran Kertas & Orientasi</h4>
              <div className="geometry-form-row">
                <label className="geometry-form-label">
                  <span>Ukuran Kertas</span>
                  <select
                    value={currentGeometry.paperSize}
                    onChange={(e) => onUpdateGeometry({ paperSize: e.target.value as any })}
                    className="geometry-select"
                  >
                    <option value="B5">B5 (Standar Kitab 17.6 × 25 cm)</option>
                    <option value="A4">A4 (21.0 × 29.7 cm)</option>
                    <option value="Letter">Letter (21.6 × 27.9 cm)</option>
                    <option value="Custom">Custom Naskah Kuno</option>
                  </select>
                </label>

                <label className="geometry-form-label">
                  <span>Orientasi</span>
                  <select
                    value={currentGeometry.orientation}
                    onChange={(e) => onUpdateGeometry({ orientation: e.target.value as any })}
                    className="geometry-select"
                  >
                    <option value="portrait">Tegak (Portrait)</option>
                    <option value="landscape">Mendatar (Landscape)</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="geometry-section">
              <h4 className="geometry-section-title">Margin Dokumen Word (Presisi Fisik)</h4>
              <div className="geometry-grid-4">
                <label className="geometry-form-label">
                  <span>Atas ({currentGeometry.margins.top})</span>
                  <input
                    type="range"
                    min={0.4}
                    max={3.5}
                    step={0.1}
                    value={parseMarginNum(currentGeometry.margins.top)}
                    onChange={(e) =>
                      onUpdateGeometry({
                        margins: { ...currentGeometry.margins, top: `${e.target.value}cm` },
                      })
                    }
                    className="viewer-range-slider"
                    style={{ width: '100%', margin: '4px 0' }}
                  />
                  <input
                    type="text"
                    value={currentGeometry.margins.top}
                    onChange={(e) =>
                      onUpdateGeometry({
                        margins: { ...currentGeometry.margins, top: e.target.value },
                      })
                    }
                    className="geometry-input"
                  />
                </label>
                <label className="geometry-form-label">
                  <span>Bawah ({currentGeometry.margins.bottom})</span>
                  <input
                    type="range"
                    min={0.4}
                    max={3.5}
                    step={0.1}
                    value={parseMarginNum(currentGeometry.margins.bottom)}
                    onChange={(e) =>
                      onUpdateGeometry({
                        margins: { ...currentGeometry.margins, bottom: `${e.target.value}cm` },
                      })
                    }
                    className="viewer-range-slider"
                    style={{ width: '100%', margin: '4px 0' }}
                  />
                  <input
                    type="text"
                    value={currentGeometry.margins.bottom}
                    onChange={(e) =>
                      onUpdateGeometry({
                        margins: { ...currentGeometry.margins, bottom: e.target.value },
                      })
                    }
                    className="geometry-input"
                  />
                </label>
                <label className="geometry-form-label">
                  <span>Kiri ({currentGeometry.margins.left})</span>
                  <input
                    type="range"
                    min={0.4}
                    max={3.5}
                    step={0.1}
                    value={parseMarginNum(currentGeometry.margins.left)}
                    onChange={(e) =>
                      onUpdateGeometry({
                        margins: { ...currentGeometry.margins, left: `${e.target.value}cm` },
                      })
                    }
                    className="viewer-range-slider"
                    style={{ width: '100%', margin: '4px 0' }}
                  />
                  <input
                    type="text"
                    value={currentGeometry.margins.left}
                    onChange={(e) =>
                      onUpdateGeometry({
                        margins: { ...currentGeometry.margins, left: e.target.value },
                      })
                    }
                    className="geometry-input"
                  />
                </label>
                <label className="geometry-form-label">
                  <span>Kanan ({currentGeometry.margins.right})</span>
                  <input
                    type="range"
                    min={0.4}
                    max={3.5}
                    step={0.1}
                    value={parseMarginNum(currentGeometry.margins.right)}
                    onChange={(e) =>
                      onUpdateGeometry({
                        margins: { ...currentGeometry.margins, right: `${e.target.value}cm` },
                      })
                    }
                    className="viewer-range-slider"
                    style={{ width: '100%', margin: '4px 0' }}
                  />
                  <input
                    type="text"
                    value={currentGeometry.margins.right}
                    onChange={(e) =>
                      onUpdateGeometry({
                        margins: { ...currentGeometry.margins, right: e.target.value },
                      })
                    }
                    className="geometry-input"
                  />
                </label>
              </div>
            </div>

            <div className="geometry-section">
              <h4 className="geometry-section-title">Bingkai Jadwal & Warna Kertas</h4>
              <div className="geometry-form-row">
                <label className="geometry-checkbox-label">
                  <input
                    type="checkbox"
                    checked={currentGeometry.hasBorder}
                    onChange={(e) => onUpdateGeometry({ hasBorder: e.target.checked })}
                  />
                  <span>Gunakan Bingkai Jadwal Naskah</span>
                </label>

                {currentGeometry.hasBorder && (
                  <>
                    <select
                      value={currentGeometry.borderStyle}
                      onChange={(e) => onUpdateGeometry({ borderStyle: e.target.value as any })}
                      className="geometry-select"
                    >
                      <option value="double">Garis Ganda (Double)</option>
                      <option value="single">Garis Tunggal (Single)</option>
                      <option value="ornate">Berornamen (Ornate)</option>
                    </select>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Warna Garis:</span>
                      <input
                        type="color"
                        value={currentGeometry.borderColor || '#4a3525'}
                        onChange={(e) => onUpdateGeometry({ borderColor: e.target.value })}
                        className="geometry-color-picker"
                        title="Pilih Warna Garis Jadwal"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="geometry-form-row" style={{ marginTop: 10 }}>
                <label className="geometry-checkbox-label">
                  <input
                    type="checkbox"
                    checked={currentGeometry.hasShading}
                    onChange={(e) => onUpdateGeometry({ hasShading: e.target.checked })}
                  />
                  <span>Warna Kertas Parchment Tua</span>
                </label>

                {currentGeometry.hasShading && (
                  <input
                    type="color"
                    value={currentGeometry.shadingTone || '#fcf8ee'}
                    onChange={(e) => onUpdateGeometry({ shadingTone: e.target.value })}
                    className="geometry-color-picker"
                    title="Pilih Tone Kertas"
                  />
                )}
              </div>
            </div>

            <div className="geometry-section">
              <h4 className="geometry-section-title">Skala Tipografi Proporsional</h4>
              <div className="geometry-grid-3">
                <label className="geometry-form-label">
                  <span>Judul (pt)</span>
                  <input
                    type="number"
                    min={12}
                    max={36}
                    value={currentGeometry.estimatedHeadingFontSize}
                    onChange={(e) => onUpdateGeometry({ estimatedHeadingFontSize: Number(e.target.value) })}
                    className="geometry-input"
                  />
                </label>
                <label className="geometry-form-label">
                  <span>Teks Pokok (pt)</span>
                  <input
                    type="number"
                    min={9}
                    max={24}
                    value={currentGeometry.estimatedBodyFontSize}
                    onChange={(e) => onUpdateGeometry({ estimatedBodyFontSize: Number(e.target.value) })}
                    className="geometry-input"
                  />
                </label>
                <label className="geometry-form-label">
                  <span>Hasyiah/Margin (pt)</span>
                  <input
                    type="number"
                    min={8}
                    max={18}
                    value={currentGeometry.estimatedMarginFontSize}
                    onChange={(e) => onUpdateGeometry({ estimatedMarginFontSize: Number(e.target.value) })}
                    className="geometry-input"
                  />
                </label>
              </div>
            </div>

            {currentGeometry.rawAnalysisNotes && (
              <div className="geometry-notes-box">
                <span className="geometry-notes-title">Catatan Deteksi AI Vision:</span>
                <p className="geometry-notes-content">{currentGeometry.rawAnalysisNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
