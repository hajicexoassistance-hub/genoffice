import React, { useState, useRef, useEffect } from 'react'
import {
  useManuscriberPluginStore,
  DEFAULT_STAGING_FONT_SIZE,
} from '../../store/manuscriberPluginStore'
import {
  IconFontSize,
  IconTextIncrease,
  IconTextDecrease,
  IconRefresh,
} from '../icons/ManuscriberIcons'

interface PresetOption {
  label: string
  size: number
}

const PRESETS: PresetOption[] = [
  { label: 'Kecil', size: 13 },
  { label: 'Standar', size: 16 },
  { label: 'Nyaman', size: 19 },
  { label: 'Besar', size: 22 },
  { label: 'Ekstra', size: 26 },
]

export const StagingFontSizeControl: React.FC = () => {
  const store = useManuscriberPluginStore()
  const fontSize = store.stagingFontSize || DEFAULT_STAGING_FONT_SIZE
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Global workbench shortcut:
  // - Ctrl+[ : Perkecil ukuran huruf (Decrease font size)
  // - Ctrl+] : Perbesar ukuran huruf (Increase font size)
  // - Alt+- / Alt+= : Pintasan sekunder perkecil / perbesar
  // - Alt+0 : Reset ke ukuran standar
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // 1. Ctrl + [ dan Ctrl + ]
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        if (e.key === '[' || e.code === 'BracketLeft') {
          e.preventDefault()
          e.stopImmediatePropagation()
          store.decreaseStagingFontSize()
          return
        }
        if (e.key === ']' || e.code === 'BracketRight') {
          e.preventDefault()
          e.stopImmediatePropagation()
          store.increaseStagingFontSize()
          return
        }
      }

      // 2. Alt + - dan Alt + =
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '-' || e.key === '_') {
          e.preventDefault()
          e.stopImmediatePropagation()
          store.decreaseStagingFontSize()
          return
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          e.stopImmediatePropagation()
          store.increaseStagingFontSize()
          return
        } else if (e.key === '0') {
          e.preventDefault()
          e.stopImmediatePropagation()
          store.resetStagingFontSize()
          return
        }
      }
    }

    window.addEventListener('keydown', handleGlobalShortcuts, true)
    return () => window.removeEventListener('keydown', handleGlobalShortcuts, true)
  }, [store])

  return (
    <div
      className="workbench-fontsize-wrapper"
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {/* Sleek Segmented Stepper */}
      <div
        className="workbench-fontsize-stepper"
        title="Pengubah Ukuran Huruf Workbench Staging (Ctrl+[ / Ctrl+])"
      >
        <button
          type="button"
          className="btn-fs-step"
          onClick={() => store.decreaseStagingFontSize()}
          disabled={fontSize <= 10}
          title="Perkecil Ukuran Huruf (Ctrl+[)"
          aria-label="Perkecil Ukuran Huruf"
        >
          <IconTextDecrease size={14} />
        </button>

        <button
          ref={triggerRef}
          type="button"
          className={`btn-fs-value ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          title="Pilih Ukuran Huruf Preset (Alt+0 untuk reset)"
          aria-label="Pilih Ukuran Huruf"
        >
          <span>{fontSize}</span>
          <span className="fs-unit">px</span>
          <svg
            width="8"
            height="8"
            viewBox="0 0 10 10"
            fill="currentColor"
            style={{ opacity: 0.65, marginLeft: 1 }}
          >
            <path d="M2 3.5 L5 6.5 L8 3.5 Z" />
          </svg>
        </button>

        <button
          type="button"
          className="btn-fs-step"
          onClick={() => store.increaseStagingFontSize()}
          disabled={fontSize >= 36}
          title="Perbesar Ukuran Huruf (Ctrl+])"
          aria-label="Perbesar Ukuran Huruf"
        >
          <IconTextIncrease size={14} />
        </button>
      </div>

      {/* Floating Popover Panel */}
      {isOpen && (
        <div className="workbench-fontsize-popover" ref={popoverRef}>
          <div className="fs-popover-header">
            <div className="fs-popover-title">
              <IconFontSize size={14} color="var(--word-blue, #185abd)" />
              <span>Ukuran Huruf Staging</span>
            </div>
            <button
              type="button"
              className="btn-fs-reset"
              onClick={() => {
                store.resetStagingFontSize()
              }}
              title="Reset ke Ukuran Standar (16px) [Alt+0]"
            >
              <IconRefresh size={11} />
              <span>Reset</span>
            </button>
          </div>

          {/* Slider with Live Value */}
          <div className="fs-slider-row">
            <input
              type="range"
              min="11"
              max="32"
              step="1"
              value={fontSize}
              onChange={(e) => store.setStagingFontSize(Number(e.target.value))}
              className="fs-slider"
              aria-label="Geser Ukuran Huruf"
            />
            <span className="fs-slider-val">{fontSize}px</span>
          </div>

          {/* Preset Buttons */}
          <div className="fs-presets-label">Pilihan Cepat:</div>
          <div className="fs-presets-grid">
            {PRESETS.map((p) => {
              const isSelected = fontSize === p.size
              return (
                <button
                  key={p.size}
                  type="button"
                  className={`fs-preset-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    store.setStagingFontSize(p.size)
                    setIsOpen(false)
                  }}
                >
                  <span className="fs-pill-name">{p.label}</span>
                  <span className="fs-pill-size">{p.size}px</span>
                </button>
              )
            })}
          </div>

          <div className="fs-popover-footer">
            <span>
              Pintasan: <strong>Alt+-</strong> / <strong>Alt++</strong> (Reset:{' '}
              <strong>Alt+0</strong>)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
