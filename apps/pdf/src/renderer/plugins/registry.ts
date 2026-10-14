/**
 * GenOffice PDF Plugin Registry
 *
 * Import and list every plugin you want active in the PDF workspace here.
 * The order controls the visual order of sidebar toggles and ribbon tabs.
 *
 * ─── HOW TO ADD A NEW PLUGIN ───────────────────────────────────────────────
 *
 *   1. Create a folder:  apps/pdf/src/renderer/plugins/<your-plugin>/
 *   2. Create the manifest:  <your-plugin>/index.tsx  (export default / named manifest)
 *   3. Import and add it to `REGISTERED_PLUGINS` below.
 *   4. Done — PdfPluginHost picks it up automatically.
 *
 * This file is the only place in the plugin system that changes when you add
 * or remove a plugin. No other file outside plugins/ needs modification.
 */

import type { PdfPluginManifest } from './types'
// import { starterPlugin } from './starter-plugin/index'
import { tashihPlugin } from './tashih/index'

/**
 * Active plugins in display order.
 * Comment out entries to disable a plugin without deleting its folder.
 */
export const REGISTERED_PLUGINS: PdfPluginManifest[] = [
  // starterPlugin, // Boilerplate template (dinonaktifkan dari tampilan)
  tashihPlugin, // Plugin Pentashihan Mushaf & Naskah
]
