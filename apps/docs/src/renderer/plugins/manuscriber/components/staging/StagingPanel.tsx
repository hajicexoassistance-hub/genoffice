import React, { useEffect, useRef } from 'react'
import type { DocxPluginContext } from '../../../types'
import { useManuscriberPluginStore } from '../../store/manuscriberPluginStore'
import { StagingLineCard } from './StagingLineCard'
import {
  IconManuscript,
  IconChevronUp,
  IconChevronDown,
} from '../icons/ManuscriberIcons'

interface StagingPanelProps {
  context: DocxPluginContext
}

export const StagingPanel: React.FC<StagingPanelProps> = () => {
  const store = useManuscriberPluginStore()
  const listContainerRef = useRef<HTMLDivElement>(null)

  const {
    lines,
    activeLineId,
    isFocusMode,
  } = store

  // Scroll active line card into view in list mode
  useEffect(() => {
    if (!isFocusMode && activeLineId && listContainerRef.current) {
      const el = listContainerRef.current.querySelector(`[data-line-id="${activeLineId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [activeLineId, isFocusMode])

  // Keyboard navigation for Focus Mode (Alt+Up, Alt+Down, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFocusMode) {
        if (e.key === 'Escape') {
          e.preventDefault()
          store.setIsFocusMode(false)
        } else if (e.altKey && e.key === 'ArrowUp') {
          e.preventDefault()
          store.prevPointer()
        } else if (e.altKey && e.key === 'ArrowDown') {
          e.preventDefault()
          store.nextPointer()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFocusMode, store])

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
      id
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
  const totalLines = lines.length
  const activeIndex = lines.findIndex((l) => l.id === activeLineId)
  const activeLine = activeIndex >= 0 ? lines[activeIndex] : lines[0] || null

  return (
    <div className="manuscriber-staging-panel">
      {/* Body: Focus Mode or List Mode (Directly under single Workbench Appbar) */}
      <div className="staging-panel-content" ref={listContainerRef}>
        {lines.length === 0 ? (
          <div className="staging-empty-state">
            <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <IconManuscript size={40} color="var(--text-tertiary)" />
            </div>
            <h4>Workspace Staging Kosong</h4>
            <p>
              Gunakan tombol <strong>Transkripsi AI</strong> pada naskah PDF di Sidebar,
              atau klik <strong>+</strong> untuk menambah baris dan mengetik menggunakan Keyboard Pegon.
            </p>
          </div>
        ) : isFocusMode && activeLine ? (
          <div className="staging-focus-container">
            <div className="staging-focus-nav">
              <button
                type="button"
                className="btn-focus-step icon-only"
                disabled={activeIndex <= 0}
                onClick={() => store.prevPointer()}
                title="Baris Sebelumnya (Alt+Up)"
                aria-label="Baris Sebelumnya"
              >
                <IconChevronUp size={14} />
              </button>
              <span className="focus-step-indicator">
                Baris {activeIndex + 1} dari {totalLines}
              </span>
              <button
                type="button"
                className="btn-focus-step icon-only"
                disabled={activeIndex >= totalLines - 1}
                onClick={() => store.nextPointer()}
                title="Baris Berikutnya (Alt+Down)"
                aria-label="Baris Berikutnya"
              >
                <IconChevronDown size={14} />
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
            />
          </div>
        ) : (
          <div className="staging-list-container">
            {lines.map((line, idx) => (
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
