/**
 * PluginModalLayer — renders full-screen modal dialogs registered by plugins.
 */
import React from 'react'
import { createPortal } from 'react-dom'
import type { PdfPluginContext, PdfPluginModalDecl } from '../types'

interface Props {
  modals: PdfPluginModalDecl[]
  activeModalId: string
  payload?: unknown
  context: PdfPluginContext
  onClose: () => void
}

export function PluginModalLayer({ modals, activeModalId, payload, context, onClose }: Props) {
  const modalDecl = modals.find((m) => m.id === activeModalId)
  if (!modalDecl) return null

  const ModalComponent = modalDecl.component

  return createPortal(
    <div
      className="plugin-modal-mask"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`plugin-modal-${modalDecl.id}`}
    >
      <div
        className="plugin-modal-dialog"
        id={`plugin-modal-${modalDecl.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalComponent context={context} payload={payload} onClose={onClose} />
      </div>
    </div>,
    document.body,
  )
}
