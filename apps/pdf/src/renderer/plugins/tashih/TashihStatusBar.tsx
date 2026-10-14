import React, { useEffect, useState } from 'react'
import type { PdfPluginContext } from '../types'
import { loadTashihData, PageVerificationStatus } from './tashihStore'
import { FluentCheckmark, FluentWarning, FluentBook } from './TashihFluentIcons'

interface Props {
  context: PdfPluginContext
}

export function TashihStatusBar({ context }: Props) {
  const { doc, ui } = context
  const curPage = doc?.currentPage ?? 1
  const filePath = doc?.filePath

  const [tashihData, setTashihData] = useState(() => loadTashihData(filePath))

  useEffect(() => {
    setTashihData(loadTashihData(filePath))
    const handler = (e: Event) => {
      const customEv = e as CustomEvent<{ filePath: string }>
      if (!customEv.detail || customEv.detail.filePath === filePath) {
        setTashihData(loadTashihData(filePath))
      }
    }
    window.addEventListener('genoffice:tashih-data-change', handler)
    return () => window.removeEventListener('genoffice:tashih-data-change', handler)
  }, [filePath])

  const curStatus: PageVerificationStatus = tashihData.pageStatus[curPage] || 'belum'

  const statusColor =
    curStatus === 'sah'
      ? 'var(--success)'
      : curStatus === 'revisi'
        ? 'var(--danger)'
        : 'var(--text-secondary)'
  const statusLabel =
    curStatus === 'sah' ? 'Sah' : curStatus === 'revisi' ? 'Revisi' : 'Belum Ditashih'

  return (
    <button
      type="button"
      onClick={() => ui.toggleSidebar()}
      title="Status Pentashihan Halaman Ini — Klik untuk membuka panel Tashih"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '1px 7px',
        borderRadius: 'var(--radius-6, 3px)',
        border: 'none',
        background: 'transparent',
        color: statusColor,
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 500,
        height: '100%',
      }}
    >
      {curStatus === 'sah' ? (
        <FluentCheckmark size={12} color={statusColor} />
      ) : curStatus === 'revisi' ? (
        <FluentWarning size={12} color={statusColor} />
      ) : (
        <FluentBook size={12} color={statusColor} />
      )}
      <span>
        Tashih: <b style={{ color: statusColor }}>{statusLabel}</b>
      </span>
    </button>
  )
}
