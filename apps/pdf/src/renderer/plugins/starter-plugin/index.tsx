/**
 * PDF Starter Plugin — Reference implementation and boilerplate template.
 *
 * This plugin demonstrates ALL available plugin surfaces for apps/pdf:
 *   ✓  Ribbon tab         — custom tab in the PDF ribbon bar
 *   ✓  Sidebar panel      — collapsible right/left panel with drag resizing
 *   ✓  Canvas view        — full-page workbench overlay (Staging mode)
 *   ✓  Floating overlay   — selection-anchored popover
 *   ✓  Modal dialog       — modal triggered by buttons
 *   ✓  Status bar widget  — persistent inline info in the bottom bar
 *
 * Use this folder as a template for new PDF plugins:
 *   1. Copy the folder: `cp -r plugins/starter-plugin plugins/my-pdf-plugin`
 *   2. Replace the `id` with your own reverse-domain id.
 *   3. Delete surfaces you do not need.
 *   4. Import and register in `plugins/registry.ts`.
 */

import React from 'react'
import type { PdfPluginManifest } from '../types'
import { StarterSidebar, StarterSidebarHeaderActions } from './StarterSidebar'
import { StarterRibbon } from './StarterRibbon'
import { StarterFloating } from './StarterFloating'
import { StarterModal } from './StarterModal'
import { StarterStatusBar } from './StarterStatusBar'
import { StarterCanvasView } from './StarterCanvasView'
import { StarterIcon } from './StarterIcon'

export const starterPlugin: PdfPluginManifest = {
  // ── Identity ────────────────────────────────────────────────────────────────
  id: 'com.genoffice.pdf-starter-plugin',
  name: 'Starter Plugin',
  version: '1.0.0',
  description:
    'Reference implementation demonstrating all PDF plugin surfaces. ' +
    'Copy and customize as your starting point.',
  icon: <StarterIcon />,

  // ── Canvas view / Workbench overlay (Covers PDF viewport) ───────────────────
  canvasView: {
    title: 'Mode Staging PDF',
    defaultOpen: false,
    component: StarterCanvasView,
  },

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  sidebar: {
    minWidth: 320,
    defaultOpen: false,
    component: StarterSidebar,
    headerActions: StarterSidebarHeaderActions,
  },

  // ── Ribbon tab ──────────────────────────────────────────────────────────────
  ribbon: {
    label: 'Starter',
    icon: <StarterIcon />,
    component: StarterRibbon,
  },

  // ── Floating overlays ───────────────────────────────────────────────────────
  floatings: [
    {
      anchor: 'selection',
      visible: (ctx) => !ctx.selection.empty && ctx.selection.text.trim().length > 0,
      component: StarterFloating,
    },
  ],

  // ── Modals ──────────────────────────────────────────────────────────────────
  modals: [
    {
      id: 'starter-main-modal',
      component: StarterModal,
    },
  ],

  // ── Status bar ──────────────────────────────────────────────────────────────
  statusBar: {
    component: StarterStatusBar,
  },

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  onInit(context) {
    console.info('[PDF Starter Plugin] Initialized. Doc:', context.doc?.filePath ?? 'untitled')
  },
  onDestroy() {
    console.info('[PDF Starter Plugin] Destroyed.')
  },
}
