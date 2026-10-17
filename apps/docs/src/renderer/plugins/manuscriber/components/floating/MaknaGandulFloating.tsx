import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DocxPluginContext } from '../../../types'
import {
  callAiTextPrompt,
  MAKNANI_SYSTEM_PROMPT,
} from '../../services/visionService'
import { setInactiveSelectionShown } from '../../../../editor/inactive-selection'

interface Props {
  context: DocxPluginContext
  selectionRect?: DOMRect | null
}

interface AnchorRect {
  left: number
  top: number
  right: number
  bottom: number
}

const WIDTH = 340
const GAP = 8
const EDGE = 8
const EST_HEIGHT = 260

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max)}...` : str
}

export function MaknaGandulFloating({ context, selectionRect }: Props) {
  const [slot, setSlot] = useState<HTMLElement | null>(() =>
    document.getElementById('ai-ask-actions-slot'),
  )
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [excerpt, setExcerpt] = useState('')
  const [savedRect, setSavedRect] = useState<AnchorRect | null>(null)

  const popRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Track the presence of `#ai-ask-actions-slot` in DOM
  useEffect(() => {
    const updateSlot = () => {
      setSlot(document.getElementById('ai-ask-actions-slot'))
    }
    updateSlot()
    const observer = new MutationObserver(updateSlot)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setText('')
    setError(null)
    if (context.editor) {
      setInactiveSelectionShown(context.editor, false)
    }
  }, [context.editor])

  // Close when user clicks outside the popover
  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (popRef.current?.contains(e.target as Node)) return
      if (triggerRef.current?.contains(e.target as Node)) return
      close()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [isOpen, close])

  const generateMakna = async (textToProcess: string) => {
    if (!textToProcess) return
    setLoading(true)
    setError(null)
    try {
      const instruction =
        'Berikan pemaknaan gandul tradisi pesantren salaf pada teks ini dengan kaidah pemosisian bacaan lisan yang tepat (kata pengantar seperti (iku), (sopo), (opo), dll diletakkan PERSIS SEBELUM lafadz bersangkutan, contoh: زَيْدٌ (utawi Zaid) (iku) قَائِمٌ (wong kang ngadeg)) tanpa kode singkatan tarkib agar ramah Text-to-Speech (TTS).'
      const res = await callAiTextPrompt(textToProcess, instruction, MAKNANI_SYSTEM_PROMPT)
      setText(res)
    } catch (err: any) {
      setError(err?.message || 'Gagal menyusun makna gandul dengan AI.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    const editor = context.editor
    let rawText = context.selection.text.trim()
    if (!rawText && editor) {
      const { from, to } = editor.state.selection
      rawText = editor.state.doc.textBetween(from, to, ' ', ' ').trim()
    }
    if (!rawText) return

    // Compute anchor rect
    if (selectionRect) {
      setSavedRect({
        left: selectionRect.left,
        top: selectionRect.top,
        right: selectionRect.right,
        bottom: selectionRect.bottom,
      })
    } else if (editor) {
      try {
        const { from, to } = editor.state.selection
        const a = editor.view.coordsAtPos(from)
        const b = editor.view.coordsAtPos(to)
        setSavedRect({
          left: Math.min(a.left, b.left),
          top: Math.min(a.top, b.top),
          right: Math.max(a.right, b.right),
          bottom: Math.max(a.bottom, b.bottom),
        })
      } catch {
        // fallback
      }
    }

    setExcerpt(rawText)
    setIsOpen(true)
    if (editor) {
      setInactiveSelectionShown(editor, true)
    }
    generateMakna(rawText)
  }

  const handleInsert = useCallback(() => {
    if (!text.trim()) return
    context.actions.insertParagraphAfterSelection(text.trim())
    close()
  }, [context.actions, text, close])

  // Calculate popover positioning
  let popStyle: React.CSSProperties = {}
  if (isOpen && savedRect) {
    const height = popRef.current?.offsetHeight ?? EST_HEIGHT
    const below = savedRect.bottom + GAP
    const above = savedRect.top - GAP - height
    const top =
      below + height <= window.innerHeight - EDGE
        ? below
        : above >= EDGE
          ? above
          : Math.max(EDGE, window.innerHeight - EDGE - height)

    const left = Math.min(
      Math.max(EDGE, (savedRect.left + savedRect.right) / 2 - WIDTH / 2),
      Math.max(EDGE, window.innerWidth - WIDTH - EDGE),
    )

    popStyle = {
      position: 'fixed',
      left,
      top,
      width: WIDTH,
      zIndex: 99999,
    }
  }

  return (
    <>
      {/* 1. Trigger button injected into AiAskPopover's generic action slot */}
      {slot &&
        !isOpen &&
        createPortal(
          <button
            ref={triggerRef}
            type="button"
            className="ai-ask-trigger makna-gandul-trigger"
            style={{
              position: 'relative',
              left: 'auto',
              top: 'auto',
              zIndex: 'auto',
              whiteSpace: 'nowrap',
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleOpen}
            title="Buat versi Makna Gandul pesantren (TTS) dan sisipkan sebagai paragraf baru"
            aria-label="Makna Gandul"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden>
              <path
                d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3zM19 15l.85 2.3L22 18.15l-2.15.85L19 21.3l-.85-2.3-2.15-.85 2.15-.85L19 15z"
                fill="currentColor"
              />
            </svg>
            <span>Makna Gandul</span>
          </button>,
          slot,
        )}

      {/* 2. Popover modal portaled directly to document.body */}
      {isOpen &&
        createPortal(
          <div
            ref={popRef}
            className="ai-ask-pop makna-gandul-pop"
            style={popStyle}
            role="dialog"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                close()
              }
            }}
          >
            <button
              type="button"
              className="ai-ask-pop-close"
              aria-label="Tutup"
              onClick={close}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div
              className="ai-ask-pop-title"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                style={{ color: 'var(--color-ai-action, #3b82f6)' }}
                aria-hidden
              >
                <path
                  d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3zM19 15l.85 2.3L22 18.15l-2.15.85L19 21.3l-.85-2.3-2.15-.85 2.15-.85L19 15z"
                  fill="currentColor"
                />
              </svg>
              <span>Makna Gandul (TTS)</span>
            </div>

            {excerpt && (
              <div
                className="ai-ask-pop-sub"
                dir="rtl"
                style={{
                  fontFamily: "'Amiri', 'Traditional Arabic', serif",
                  fontSize: '12.5px',
                  direction: 'rtl',
                  textAlign: 'right',
                }}
              >
                {truncate(excerpt, 60)}
              </div>
            )}

            {loading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '24px 0',
                }}
              >
                <div className="makna-gandul-spinner" />
                <span style={{ fontSize: '12px', color: 'var(--text-dim, #666)' }}>
                  Menyusun pemaknaan gandul pesantren...
                </span>
              </div>
            ) : error ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: '6px 0',
                }}
              >
                <span style={{ fontSize: '11.5px', color: '#ef4444' }}>{error}</span>
                <button
                  type="button"
                  className="ai-ask-cancel"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => generateMakna(excerpt)}
                >
                  Coba Lagi
                </button>
              </div>
            ) : (
              <textarea
                className="ai-ask-pop-input"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Hasil pemaknaan gandul..."
                style={{
                  minHeight: '85px',
                  resize: 'vertical',
                  fontFamily: "'Amiri', 'Segoe UI', serif, sans-serif",
                  fontSize: '13px',
                  lineHeight: '1.6',
                  direction: 'rtl',
                  textAlign: 'right',
                }}
              />
            )}

            <div className="ai-ask-pop-foot">
              <button
                type="button"
                className="ai-ask-cancel"
                onClick={() => generateMakna(excerpt)}
                disabled={loading}
                title="Buat ulang pemaknaan dengan AI"
              >
                Buat Ulang
              </button>
              <button
                type="button"
                className="ai-ask-confirm"
                disabled={loading || !text.trim()}
                onClick={handleInsert}
                title="Sisipkan sebagai paragraf baru di bawah teks yang diblok tanpa mengubah teks aslinya"
              >
                Sisipkan Paragraf Baru
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

export default MaknaGandulFloating
