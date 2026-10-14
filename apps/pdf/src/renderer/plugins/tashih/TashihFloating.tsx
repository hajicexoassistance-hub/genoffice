import React from 'react'
import type { PdfPluginContext } from '../types'
import { loadTashihData, saveTashihData, TashihNote } from './tashihStore'
import { FluentBook } from './TashihFluentIcons'

interface Props {
  context: PdfPluginContext
}

export function TashihFloating({ context }: Props) {
  const { selection, doc, ui } = context
  const curPage = doc?.currentPage ?? 1
  const filePath = doc?.filePath
  const textPreview =
    selection.text.length > 24 ? `${selection.text.substring(0, 24)}...` : selection.text

  const handleCopy = () => {
    navigator.clipboard.writeText(selection.text)
    ui.showToast('Lafadz / teks disalin ke papan klip', 'success')
  }

  const handleQuickMark = (category: 'rasm' | 'dhabth') => {
    const existing = loadTashihData(filePath)
    const newNote: TashihNote = {
      id: `float-note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pageNo: curPage,
      category,
      selectedText: selection.text,
      description: `Koreksi ${category === 'rasm' ? 'Rasm' : 'Dhabth/Harakat'} pada lafadz: "${selection.text}"`,
      resolved: false,
      createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    }
    const updated = {
      ...existing,
      notes: [...existing.notes, newNote],
      pageStatus: {
        ...existing.pageStatus,
        [curPage]: 'revisi' as const,
      },
    }
    saveTashihData(filePath, updated)
    ui.expandSidebar()
    ui.showToast(`Catatan ${category === 'rasm' ? 'Rasm' : 'Dhabth'} ditambahkan`, 'info')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
      <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <FluentBook size={13} />
        <i>"{textPreview}"</i>
      </span>

      <button
        type="button"
        onClick={() => handleQuickMark('dhabth')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: 'var(--radius-6, 4px)',
          border: '1px solid var(--border)',
          background: 'var(--surface-subtle)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
        }}
        title="Tandai koreksi Harakat pada lafadz ini"
      >
        <span>+ Dhabth</span>
      </button>

      <button
        type="button"
        onClick={() => handleQuickMark('rasm')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: 'var(--radius-6, 4px)',
          border: 'none',
          background: 'var(--accent, #c43e1c)',
          color: '#ffffff',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
        }}
        title="Tandai koreksi Rasm Utsmani pada lafadz ini"
      >
        <span>+ Rasm</span>
      </button>

      <button
        type="button"
        onClick={handleCopy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: 'var(--radius-6, 4px)',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '11px',
        }}
        title="Salin lafadz"
      >
        <span>Salin</span>
      </button>
    </div>
  )
}
