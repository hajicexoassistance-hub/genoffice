import React from 'react'
import type { DocxPluginContext } from '../../types'
import { useDocumentSessionSync } from '../hooks/useDocumentSessionSync'

interface Props {
  context: DocxPluginContext
}

/**
 * Headless controller mounted continuously in the background
 * to synchronize document state with IndexedDB automatically.
 */
export function DocumentSessionSyncController({ context }: Props) {
  useDocumentSessionSync(context)
  return null
}

export default DocumentSessionSyncController
