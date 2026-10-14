/**
 * Starter Plugin — Canvas View / Workbench Overlay
 *
 * Mendemonstrasikan custom container yang menutupi lembar kertas Word
 * untuk keperluan khusus seperti Staging View, Transkripsi Manuskrip, dsb.
 * Sesuai contoh pada screenshot pengguna (Staging 7/7 100%).
 */
import React, { useState } from 'react'
import type { DocxPluginContext } from '../types'
import '../plugin-system.css'

interface Props {
  context: DocxPluginContext
  onClose: () => void
}

interface StagingBlock {
  id: number
  tag: string
  status: 'verified' | 'review' | 'pending'
  content: string
}

const INITIAL_BLOCKS: StagingBlock[] = [
  {
    id: 1,
    tag: 'JUDUL',
    status: 'verified',
    content: 'هالامان تيكا',
  },
  {
    id: 2,
    tag: 'SYARAH',
    status: 'verified',
    content:
      'اتوى ديفون تيلار فونيكا بوتن ديفون كانجار لن بوتن ديفون سيكسا، اتاغيع مناوى ديفون لامفاهى كانطى نية اغكع ساهى فونيكا سمفون ديفون كانجار، چونتوه نيفون كادوس دينى بلاجار نوليس.',
  },
  {
    id: 3,
    tag: 'JUDUL',
    status: 'verified',
    content: 'بَابُ الطَّهَارَةِ',
  },
  {
    id: 4,
    tag: 'NADZOM',
    status: 'verified',
    content:
      'سَبَبْ وُلُوْعُيْ سَمْلَاكُوئي صَلَاةْ كُوْدُوسُوجِيْ --- سَبَبْ صَلَاةْ أَرَانْنْفَا اغَيْغْ وَيْسْ سُوْجِيْ',
  },
  {
    id: 5,
    tag: 'SYARAH',
    status: 'verified',
    content:
      'المراد، سنعه سكيغ شراط صح ايفون صلاة اغكيه فونيكا وونتن كاليه .١. كده سوجي سكيغ نجس اغدالم بدان لن ساندلغن لن فاعكونان ايفون .٢. كده سوجي سكيغ حدث كاليه، تكس ايفون حدث الت لن حدث اكع (اكبدى)، ديني چارانى اغكين غيلاغي حدث اليت فونيكا ماوى وضوء اتوى تيمم.',
  },
]

export function StarterCanvasView({ context, onClose }: Props) {
  const { actions, ui } = context
  const [blocks, setBlocks] = useState<StagingBlock[]>(INITIAL_BLOCKS)
  const [activeBlockId, setActiveBlockId] = useState<number>(1)

  function handleContentChange(id: number, text: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, content: text } : b)),
    )
  }

  function handleApplyToDocument() {
    // Gabungkan seluruh teks blok dan sisipkan ke dokumen Word
    const fullText = blocks.map((b) => b.content).join('\n\n')
    actions.insertText(fullText)
    ui.showToast('Seluruh teks staging berhasil disisipkan ke Word!', 'success')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Top Bar / Header ────────────────────────────────────────── */}
      <div className="plugin-canvas-header">
        <div className="plugin-canvas-header-left">
          <span className="plugin-canvas-badge">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} width={12} height={12}>
              <path d="M3 8l3.5 3.5L13 5" />
            </svg>
            STAGING: {blocks.length}/{blocks.length} (100%)
          </span>
          <span className="plugin-canvas-header-title">
            Mode Workbench & Staging Manuskrip
          </span>
        </div>

        <div className="plugin-canvas-header-actions">
          <button
            className="plugin-btn plugin-btn-primary"
            onClick={handleApplyToDocument}
            title="Terapkan semua blok teks ke dokumen Word"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} width={13} height={13}>
              <path d="M3 8l3.5 3.5L13 5" />
            </svg>
            Terapkan ke Word
          </button>

          <button
            className="plugin-btn plugin-btn-secondary"
            onClick={onClose}
            title="Tutup Workbench dan kembali ke lembar kertas Word"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} width={13} height={13}>
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
            Kembali ke Kertas Word
          </button>
        </div>
      </div>

      {/* ── Body: Cards of Blocks ───────────────────────────────────── */}
      <div className="plugin-canvas-body">
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`plugin-canvas-block-card${activeBlockId === block.id ? ' active' : ''}`}
            onClick={() => setActiveBlockId(block.id)}
          >
            <div className="plugin-canvas-block-header">
              <div className="plugin-canvas-block-badges">
                <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                  Blok {block.id}
                </span>
                <span className="plugin-canvas-pill plugin-canvas-pill-tag">
                  # {block.tag}
                </span>
                <span className="plugin-canvas-pill plugin-canvas-pill-verified">
                  ✓ SHAHIH (VERIFIED)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  className="plugin-btn-icon"
                  title="Sisipkan blok ini ke posisi kursor Word"
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.insertText(block.content)
                    ui.showToast(`Blok ${block.id} disisipkan ke Word`, 'success')
                  }}
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={13} height={13}>
                    <path d="M8 2v12M2 8h12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="plugin-canvas-block-content">
              <textarea
                className="plugin-canvas-block-textarea"
                dir="rtl"
                value={block.content}
                onChange={(e) => handleContentChange(block.id, e.target.value)}
                rows={Math.max(2, Math.ceil(block.content.length / 75))}
                placeholder="Tulis atau edit teks manuskrip di sini..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
