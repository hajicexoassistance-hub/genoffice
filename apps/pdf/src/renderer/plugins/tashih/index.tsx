/**
 * Tashih Plugin — Modul Pentashihan Mushaf Al-Qur'an & Verifikasi Naskah PDF
 *
 * Mengimplementasikan semua surface PDF plugin sesuai PLUGIN_STANDARD:
 *   ✓  Ribbon tab         — Pita navigasi, status sah/revisi, dan koreksi rasm/dhabth
 *   ✓  Sidebar panel      — Panel catatan temuan tashih per halaman dengan drag resize 50%
 *   ✓  Canvas view        — Workbench penelaahan teliti fullscreen
 *   ✓  Floating overlay   — Pintasan seleksi lafadz teks naskah (+ Dhabth / + Rasm)
 *   ✓  Modal dialog       — Berita Acara & Rekapitulasi Pentashihan
 *   ✓  Status bar widget  — Indikator live status tashih di bilah status bawah
 */

import React from 'react'
import type { PdfPluginManifest } from '../types'
import { TashihIcon } from './TashihIcon'
import { TashihSidebar, TashihSidebarHeaderActions } from './TashihSidebar'
import { TashihRibbon } from './TashihRibbon'
import { TashihCanvasView } from './TashihCanvasView'
import { TashihFloating } from './TashihFloating'
import { TashihModal } from './TashihModal'
import { TashihStatusBar } from './TashihStatusBar'

export const tashihPlugin: PdfPluginManifest = {
  // ── Identitas Plugin ────────────────────────────────────────────────────────
  id: 'com.genoffice.pdf-tashih',
  name: 'Tashih',
  version: '1.0.0',
  description:
    'Alat pentashihan mushaf Al-Qur\'an, verifikasi naskah, pencatatan koreksi rasm/dhabth, dan penerbitan laporan tashih.',
  icon: <TashihIcon />,

  // ── Canvas View / Workbench Overlay Penuh ──────────────────────────────────
  canvasView: {
    title: 'Workbench Pentashihan Mushaf',
    defaultOpen: false,
    component: TashihCanvasView,
  },

  // ── Sidebar Panel Catatan Koreksi ──────────────────────────────────────────
  sidebar: {
    minWidth: 340,
    defaultOpen: false,
    component: TashihSidebar,
    headerActions: TashihSidebarHeaderActions,
  },

  // ── Ribbon Tab Khusus Pentashih ────────────────────────────────────────────
  ribbon: {
    label: 'Tashih',
    icon: <TashihIcon />,
    component: TashihRibbon,
  },

  // ── Floating Overlay Saat Seleksi Teks ─────────────────────────────────────
  floatings: [
    {
      anchor: 'selection',
      visible: (ctx) => !ctx.selection.empty && ctx.selection.text.trim().length > 0,
      component: TashihFloating,
    },
  ],

  // ── Modal Dialog Berita Acara Rekapitulasi ──────────────────────────────────
  modals: [
    {
      id: 'tashih-rekap-modal',
      component: TashihModal,
    },
  ],

  // ── Widget Status Bar Bawah ────────────────────────────────────────────────
  statusBar: {
    component: TashihStatusBar,
  },

  onInit(context) {
    // Dipanggil saat plugin dimuat
    console.info('[Tashih Plugin] Siap digunakan untuk verifikasi dokumen.')
  },
}
