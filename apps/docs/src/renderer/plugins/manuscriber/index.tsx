/**
 * Manuscriber Unified Plugin for GenOffice Docs
 *
 * Full Turats & Pegon Manuscript Transcriber, Tashih Workbench,
 * AI Vision Spotlight, and ANSI QWERTY 3-in-1 Pegon Virtual Keyboard.
 *
 * 100% Additive & Modular via GenOffice DocxPluginManifest.
 */

import React from 'react'
import type { DocxPluginManifest } from '../types'
import { ManuscriberCanvasView } from './surfaces/ManuscriberCanvasView'
import { ManuscriberRibbon } from './surfaces/ManuscriberRibbon'
import { ManuscriberSidebar, ManuscriberSidebarHeaderActions } from './surfaces/ManuscriberSidebar'
import { ManuscriberStatusBar } from './surfaces/ManuscriberStatusBar'
import { ManuscriberSettingsModal } from './surfaces/ManuscriberSettingsModal'
import { ManuscriberGuideModal } from './surfaces/ManuscriberGuideModal'
import { PegonKeyboardDock } from './components/keyboard/PegonKeyboardDock'
import { MaknaGandulFloating } from './components/floating/MaknaGandulFloating'
import { DocumentSessionSyncController } from './components/DocumentSessionSyncController'
import { useManuscriberPluginStore } from './store/manuscriberPluginStore'
import { IconManuscript } from './components/icons/ManuscriberIcons'
import './manuscriber.css'

export const manuscriberPlugin: DocxPluginManifest = {
  id: 'org.pegon.manuscriber',
  name: 'Manuscriber Turats',
  version: '2.0.0',
  description: 'Transkripsi naskah kuno kitab turats, AI Vision OCR berkoordinat kotak, tashih staging, dan keyboard Pegon 3-in-1.',
  icon: <IconManuscript size={16} />,

  // Floating Overlays
  floatings: [
    // 0. Continuous Document Session Sync (IndexedDB auto-save & restore per docx)
    {
      id: 'manuscriber-session-sync',
      visible: () => true,
      anchor: 'fixed',
      component: ({ context }) => <DocumentSessionSyncController context={context} />,
    },
    // 1. Global Draggable Pegon Virtual Keyboard
    {
      id: 'manuscriber-keyboard',
      visible: () => true,
      anchor: 'fixed',
      component: ({ context }) => (
        <PegonKeyboardDock
          context={context}
          onClose={() => useManuscriberPluginStore.getState().setIsKeyboardVisible(false)}
          onOpenGuide={() => context.ui.openModal('manuscriber-guide')}
        />
      ),
    },
    // 2. Makna Gandul Pesantren AI selection action
    {
      id: 'manuscriber-makna-gandul',
      visible: (ctx) => !ctx.selection.empty && ctx.selection.text.trim().length > 0,
      anchor: 'ai-ask',
      component: MaknaGandulFloating,
    },
  ],

  // 1. Dual-Pane Workbench Overlay
  canvasView: {
    title: 'Manuscriber Workbench',
    defaultOpen: false,
    component: ManuscriberCanvasView,
  },

  // 2. Ribbon Bar Tab
  ribbon: {
    label: 'Manuscriber',
    icon: <IconManuscript size={14} />,
    component: ManuscriberRibbon,
  },

  // 3. Compact Sidebar Panel
  sidebar: {
    minWidth: 320,
    defaultOpen: false,
    headerActions: ManuscriberSidebarHeaderActions,
    component: ManuscriberSidebar,
  },

  // 4. Status Bar Chip
  statusBar: {
    component: ManuscriberStatusBar,
  },

  // 5. Modals (Settings & Guide)
  modals: [
    {
      id: 'manuscriber-settings',
      component: ManuscriberSettingsModal,
    },
    {
      id: 'manuscriber-guide',
      component: ManuscriberGuideModal,
    },
  ],

  // 6. Lifecycle hooks
  onInit: (_context) => {
    console.info('[Manuscriber Plugin] Initialized successfully in GenOffice Docs.')
  },

  onDestroy: () => {
    console.info('[Manuscriber Plugin] Destroyed.')
  },
}

export default manuscriberPlugin
