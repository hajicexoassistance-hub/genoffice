import React from 'react'
import type { DocxPluginContext } from '../../types'
import { useManuscriberPluginStore } from '../store/manuscriberPluginStore'
import { IconManuscript } from '../components/icons/ManuscriberIcons'

interface ManuscriberStatusBarProps {
  context: DocxPluginContext
}

export const ManuscriberStatusBar: React.FC<ManuscriberStatusBarProps> = ({ context }) => {
  const store = useManuscriberPluginStore()
  const { pdfFileName, lines, currentPage, totalPages } = store

  const verifiedCount = lines.filter((l) => l.status === 'verified').length
  const total = lines.length

  const handleClick = () => {
    context.ui.toggleCanvasView()
  }

  return (
    <div
      className="manuscriber-status-bar-chip"
      onClick={handleClick}
      title="Klik untuk membuka/menutup Workbench Manuscriber"
    >
      <span className="status-chip-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
        <IconManuscript size={13} />
      </span>
      <span className="status-chip-text">
        {pdfFileName ? (
          <>
            {pdfFileName.slice(0, 16)}... (Hal {currentPage}/{totalPages || 1}) • {verifiedCount}/{total} Shahih
          </>
        ) : (
          'Manuscriber'
        )}
      </span>
    </div>
  )
}
