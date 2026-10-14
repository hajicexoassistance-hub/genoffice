/**
 * GenOffice Docs Plugin Registry
 *
 * Import and list every plugin you want active in the Docs workspace here.
 * The order controls the visual order of sidebar toggles and ribbon tabs.
 *
 * ─── HOW TO ADD A NEW PLUGIN ───────────────────────────────────────────────
 *
 *   1. Create a folder:  apps/docs/src/renderer/plugins/<your-plugin>/
 *   2. Create the manifest:  <your-plugin>/index.ts  (export default manifest)
 *   3. Import and add it to `REGISTERED_PLUGINS` below.
 *   4. Done — DocxPluginHost picks it up automatically.
 *
 * This file is the only place in the plugin system that changes when you add
 * or remove a plugin.  No other file outside plugins/ needs modification.
 */

import type { DocxPluginManifest } from './types'
// starterPlugin is preserved as boilerplate/starter template; kept disabled from UI
// import { starterPlugin } from './starter-plugin/index'
import { manuscriberPlugin } from './manuscriber/index'

/**
 * Active plugins, in display order.
 * Comment out entries to temporarily disable a plugin without deleting it.
 */
export const REGISTERED_PLUGINS: DocxPluginManifest[] = [
  manuscriberPlugin,
  // starterPlugin, // Boilerplate template only — disabled from production UI
]

