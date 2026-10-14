/**
 * Starter Plugin — a complete reference implementation and boilerplate.
 *
 * This plugin demonstrates ALL available plugin surfaces:
 *   ✓  Sidebar panel      — collapsible right-side panel
 *   ✓  Ribbon tab         — custom tab added to the Docs ribbon bar
 *   ✓  Floating overlay   — selection-anchored tooltip / popover
 *   ✓  Modal dialog       — full-screen dialog triggered by a button
 *   ✓  Status bar widget  — persistent inline info in the bottom bar
 *
 * Use this file as a template for new plugins:
 *   1. Copy the folder: `cp -r plugins/starter-plugin plugins/my-plugin`
 *   2. Replace the `id` with your own reverse-domain id.
 *   3. Delete the surfaces you do not need.
 *   4. Import and register in `plugins/registry.ts`.
 */

import React from 'react'
import type { DocxPluginManifest } from '../types'
import { StarterSidebar } from './StarterSidebar'
import { StarterRibbon } from './StarterRibbon'
import { StarterFloating } from './StarterFloating'
import { StarterModal } from './StarterModal'
import { StarterStatusBar } from './StarterStatusBar'
import { StarterCanvasView } from './StarterCanvasView'
import { StarterIcon } from './StarterIcon'

export const starterPlugin: DocxPluginManifest = {
  // ── Identity ────────────────────────────────────────────────────────────────
  id: 'com.genoffice.starter-plugin',
  name: 'Starter Plugin',
  version: '1.0.0',
  description:
    'Reference implementation demonstrating all plugin surfaces. ' +
    'Copy and customise as your starting point.',
  icon: <StarterIcon />,

  // ── Canvas view / Workbench overlay (Covers Word paper) ─────────────────────
  canvasView: {
    title: 'Mode Staging',
    defaultOpen: false,
    component: StarterCanvasView,
  },

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  sidebar: {
    minWidth: 360,
    defaultOpen: false,
    component: StarterSidebar,
  },

  // ── Ribbon tab ──────────────────────────────────────────────────────────────
  ribbon: {
    label: 'Starter',
    component: StarterRibbon,
  },

  // ── Floating overlays ────────────────────────────────────────────────────────
  floatings: [
    {
      // Show a small popover above the selected text whenever text is selected
      anchor: 'selection',
      visible: (ctx) => !ctx.selection.empty && ctx.selection.text.length > 0,
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

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  onInit(context) {
    console.info('[Starter Plugin] Initialised. Doc:', context.doc?.filePath ?? 'untitled')
  },
  onDestroy() {
    console.info('[Starter Plugin] Destroyed.')
  },
}
