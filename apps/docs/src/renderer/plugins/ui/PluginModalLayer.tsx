/**
 * PluginModalLayer — renders a full-screen modal dialog for a plugin.
 */
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { DocxPluginContext, PluginModalDecl } from '../types'

interface Props {
  modals: PluginModalDecl[]
  activeModalId: string
  payload: unknown
  context: DocxPluginContext
  onClose: () => void
}

export function PluginModalLayer({ modals, activeModalId, payload, context, onClose }: Props) {
  const decl = modals.find((m) => m.id === activeModalId)
  if (!decl) return null

  const ModalComponent = decl.component

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="plugin-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="plugin-modal-box">
        <ModalComponent context={context} initialPayload={payload} onClose={onClose} />
      </div>
    </div>,
    document.body,
  )
}
