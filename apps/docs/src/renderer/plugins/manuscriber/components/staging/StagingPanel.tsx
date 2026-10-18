import React, { useEffect, useRef } from 'react'
import type { DocxPluginContext } from '../../../types'
import { useManuscriberPluginStore } from '../../store/manuscriberPluginStore'
import { StagingLineCard } from './StagingLineCard'
import { IconManuscript, IconChevronUp, IconChevronDown, IconList } from '../icons/ManuscriberIcons'

interface StagingPanelProps {
  context: DocxPluginContext
}

export const StagingPanel: React.FC<StagingPanelProps> = ({ context }) => {
  const store = useManuscriberPluginStore()
  const listContainerRef = useRef<HTMLDivElement>(null)

  const { lines, activeLineId, isFocusMode, currentPage } = store

  const activePage = currentPage || 1
  const currentLines = lines.filter((l) => (l.pageNo || l.pageNumber || 1) === activePage)

  // Scroll active line card into view in list mode
  useEffect(() => {
    if (!isFocusMode && activeLineId && listContainerRef.current) {
      const el = listContainerRef.current.querySelector(`[data-line-id="${activeLineId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [activeLineId, isFocusMode])

  // Helper untuk navigasi blok dalam halaman aktif
  const handlePrevBlock = () => {
    const idx = currentLines.findIndex((l) => l.id === activeLineId)
    if (idx > 0) {
      store.setActiveLineId(currentLines[idx - 1].id)
    } else if (idx === -1 && currentLines.length > 0) {
      store.setActiveLineId(currentLines[0].id)
    }
  }

  const handleNextBlock = () => {
    const idx = currentLines.findIndex((l) => l.id === activeLineId)
    if (idx >= 0 && idx < currentLines.length - 1) {
      store.setActiveLineId(currentLines[idx + 1].id)
    } else if (idx === -1 && currentLines.length > 0) {
      store.setActiveLineId(currentLines[0].id)
    }
  }

  // Keyboard navigation for Staging Workbench:
  // - Alt+Up / Alt+Down: prev / next block (in both Focus Mode and List Mode)
  // - Ctrl+D: toggle Focus Mode vs List Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Toggle Mode Fokus vs Mode Daftar: Ctrl + D
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (e.key === 'd' || e.key === 'D')
      ) {
        e.preventDefault()
        e.stopImmediatePropagation()
        store.setIsFocusMode(!store.isFocusMode)
        return
      }

      // 2. Navigasi Blok Sebelumnya: Alt + Up
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopImmediatePropagation()
        handlePrevBlock()
        return
      }

      // 3. Navigasi Blok Berikutnya: Alt + Down
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopImmediatePropagation()
        handleNextBlock()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [store.isFocusMode, currentLines, activeLineId, store])

  // Line actions
  const handleSelectLine = (id: string) => {
    store.setActiveLineId(id)
  }

  const handleDeleteLine = (id: string) => {
    store.deleteLine(id)
  }

  const handleUpdateText = (id: string, text: string) => {
    store.updateLine(id, { text })
  }

  const handleToggleStatus = (id: string) => {
    const target = lines.find((l) => l.id === id)
    if (target) {
      const nextStatus = target.status === 'verified' ? 'unverified' : 'verified'
      store.updateLine(id, { status: nextStatus })
    }
  }

  const handleSplitLine = (id: string, offset: number) => {
    const target = lines.find((l) => l.id === id)
    if (!target) return

    const firstPart = target.text.slice(0, offset).trim()
    const secondPart = target.text.slice(offset).trim()

    store.updateLine(id, { text: firstPart })
    store.addLine(
      {
        pageNo: target.pageNo,
        text: secondPart,
        status: 'unverified',
        type: target.type,
      },
      id,
    )
  }

  const handleMergeWithPrev = (id: string) => {
    const idx = lines.findIndex((l) => l.id === id)
    if (idx <= 0) return

    const prev = lines[idx - 1]
    const cur = lines[idx]
    const mergedText = `${prev.text} ${cur.text}`.trim()

    store.updateLine(prev.id, { text: mergedText })
    store.deleteLine(cur.id)
    store.setActiveLineId(prev.id)
  }

  // Active line for focus mode
  const totalLines = currentLines.length
  const activeIndex = currentLines.findIndex((l) => l.id === activeLineId)
  const activeLine = activeIndex >= 0 ? currentLines[activeIndex] : currentLines[0] || null

  return (
    <div className="manuscriber-staging-panel">
      {/* Body: Focus Mode or List Mode (Directly under single Workbench Appbar) */}
      <div className="staging-panel-content" ref={listContainerRef}>
        {currentLines.length === 0 ? (
          <div className="staging-empty-state">
            <div
              className="empty-icon"
              style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}
            >
              <IconManuscript size={40} color="var(--text-tertiary)" />
            </div>
            <h4>Workspace Staging Halaman {activePage} Kosong</h4>
            <p>
              {lines.length > 0 ? (
                <>
                  Terdapat total {lines.length} baris pada halaman lain. Gunakan tombol navigator
                  halaman di atas untuk berpindah.
                </>
              ) : (
                <>
                  Gunakan tombol <strong>Transkripsi AI</strong> pada naskah PDF di Sidebar, atau
                  klik <strong>+</strong> untuk menambah baris manual.
                </>
              )}
            </p>
            {store.pdfDocument && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  store.requestTranscribe(activePage)
                  context.ui.showToast(
                    `Memulai transkripsi AI untuk Halaman ${activePage}...`,
                    'info',
                  )
                }}
                style={{
                  marginTop: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                <span>Transkripsi Halaman {activePage} AI</span>
              </button>
            )}
          </div>
        ) : isFocusMode && activeLine ? (
          <div className="staging-focus-container">
            <div className="staging-focus-nav">
              <button
                type="button"
                className="btn-focus-step icon-only"
                disabled={activeIndex <= 0}
                onClick={handlePrevBlock}
                title="Baris Sebelumnya (Alt+Up)"
                aria-label="Baris Sebelumnya"
              >
                <IconChevronUp size={14} />
              </button>
              <span className="focus-step-indicator">
                Baris {activeIndex + 1} dari {totalLines} (Hal {activePage})
              </span>
              <button
                type="button"
                className="btn-focus-step icon-only"
                disabled={activeIndex >= totalLines - 1}
                onClick={handleNextBlock}
                title="Baris Berikutnya (Alt+Down)"
                aria-label="Baris Berikutnya"
              >
                <IconChevronDown size={14} />
              </button>

              <button
                type="button"
                className="btn-focus-step btn-focus-exit"
                onClick={() => store.setIsFocusMode(false)}
                title="Kembali ke Mode Daftar (Esc)"
                aria-label="Kembali ke Mode Daftar"
                style={{
                  marginLeft: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  padding: '3px 8px',
                }}
              >
                <IconList size={13} />
                <span>Daftar</span>
              </button>
            </div>

            <StagingLineCard
              line={activeLine}
              index={activeIndex}
              isActive={true}
              isFocusMode={true}
              onSelect={handleSelectLine}
              onDelete={handleDeleteLine}
              onUpdateText={handleUpdateText}
              onToggleStatus={handleToggleStatus}
              onSplit={handleSplitLine}
              onMergeWithPrev={handleMergeWithPrev}
              context={context}
            />
          </div>
        ) : (
          <div className="staging-list-container">
            {currentLines.map((line, idx) => (
              <StagingLineCard
                key={line.id}
                line={line}
                index={idx}
                isActive={line.id === activeLineId}
                isFocusMode={false}
                onSelect={handleSelectLine}
                onDelete={handleDeleteLine}
                onUpdateText={handleUpdateText}
                onToggleStatus={handleToggleStatus}
                onSplit={handleSplitLine}
                onMergeWithPrev={handleMergeWithPrev}
                context={context}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
