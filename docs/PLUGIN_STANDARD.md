# Standar Pembuatan Plugin — GenOffice Docs & PDF

> **Versi:** 1.0.0 · **Target:** `apps/docs` & `apps/pdf` (Tiptap/ProseMirror renderer)
> 
> Dokumen ini adalah **satu-satunya sumber kebenaran** untuk membuat plugin baru.
> Baca sampai selesai sebelum menulis baris kode pertama.

---

## 1. Filosofi & Prinsip

| Prinsip | Implementasi |
|---|---|
| **Zero upstream collision** | Semua kode plugin hidup di `plugins/` — tidak ada satu baris pun yang menyentuh file upstream |
| **Additive only** | Plugin hanya *menambah* UI/logic; tidak pernah *override* atau *patch* logika editor inti |
| **Context-first** | Plugin tidak boleh import `App.tsx`, `Ribbon.tsx`, atau `Editor` langsung — semua akses lewat `DocxPluginContext` |
| **Merge-safe** | Ketika komunitas merilis update, `git merge upstream/main` tidak perlu resolve conflict apapun di dalam `plugins/` |
| **Layak dinonaktifkan** | Plugin apapun bisa dimatikan cukup dengan menghapus entri di `registry.ts` |

---

## 2. Struktur Direktori

```
apps/docs/src/renderer/plugins/
│
├── types.ts              ← Kontrak publik: semua type/interface plugin
├── registry.ts           ← Daftar plugin aktif (satu-satunya file yang diubah saat add/remove plugin)
├── DocxPluginHost.tsx    ← Host React: mount semua surface, kelola lifecycle
├── plugin-system.css     ← Shared CSS: semua class plugin-*
│
├── ui/                   ← Internal host renderers (jangan diubah)
│   ├── PluginCanvasView.tsx  ← Workbench / canvas overlay portal
│   ├── PluginSidebarPanel.tsx
│   ├── PluginRibbonTab.tsx
│   ├── PluginFloatingLayer.tsx
│   ├── PluginModalLayer.tsx
│   └── PluginStatusBar.tsx
│
└── starter-plugin/       ← Template referensi lengkap
    ├── index.tsx         ← Manifest plugin (titik entry)
    ├── StarterCanvasView.tsx ← Workbench overlay (Staging View)
    ├── StarterSidebar.tsx
    ├── StarterRibbon.tsx
    ├── StarterFloating.tsx
    ├── StarterModal.tsx
    ├── StarterStatusBar.tsx
    └── StarterIcon.tsx
```

**Satu plugin = satu folder.** Seluruh logika, komponen, dan aset plugin ada di dalam folder itu.

---

## 3. Cara Membuat Plugin Baru

### Langkah 1 — Copy starter template

```bash
# Dari root repo
cp -r apps/docs/src/renderer/plugins/starter-plugin \
       apps/docs/src/renderer/plugins/nama-plugin-saya
```

### Langkah 2 — Edit manifest (`index.tsx`)

Ubah minimal:
- `id` → gunakan format reverse-domain: `"com.perusahaan.nama-plugin"`
- `name`, `version`, `description`
- Hapus surface yang tidak dipakai (sidebar, ribbon, floatings, modals, statusBar)

```tsx
// apps/docs/src/renderer/plugins/nama-plugin-saya/index.tsx

import type { DocxPluginManifest } from '../types'
import { MySidebar } from './MySidebar'

export const myPlugin: DocxPluginManifest = {
  id: 'com.perusahaan.nama-plugin',
  name: 'Nama Plugin',
  version: '1.0.0',
  description: 'Deskripsi singkat.',

  sidebar: {
    minWidth: 300,
    defaultOpen: false,
    component: MySidebar,
  },

  onInit(context) {
    console.info('[MyPlugin] ready')
  },
}
```

### Langkah 3 — Daftar di registry

```ts
// apps/docs/src/renderer/plugins/registry.ts

import { myPlugin } from './nama-plugin-saya/index'

export const REGISTERED_PLUGINS: DocxPluginManifest[] = [
  starterPlugin,
  myPlugin,          // ← tambahkan di sini
]
```

**Selesai.** Tidak ada perubahan di luar folder `plugins/`.

---

## 4. Surface yang Tersedia

### 4.1 Canvas View (Workbench Overlay)

Container tampilan utama yang **menutupi lembar kertas Word** secara penuh. Sangat cocok untuk: mode Staging, transkripsi per blok naskah/manuskrip, form data komprehensif, atau perbandingan side-by-side. Lembar kerja Word di baliknya tetap aktif dan tidak kehilangan state/konten.

```tsx
canvasView: {
  title: 'Mode Staging Manuskrip', // opsional
  defaultOpen: false,              // terbuka saat pertama mount?
  component: MyCanvasWorkbench,    // React.ComponentType<{ context; onClose }>
}
```

**Kontrol via Context:**
* `context.ui.openCanvasView()` — membuka view menutupi kertas
* `context.ui.closeCanvasView()` — menutup view dan kembali ke kertas Word
* `context.ui.toggleCanvasView()` — toggle buka/tutup

---

### 4.2 Sidebar Panel

Panel kolapsibel di sisi kanan canvas editor.

```tsx
sidebar: {
  minWidth: 280,          // lebar panel dalam pixel (opsional, default 280)
  defaultOpen: false,     // terbuka saat pertama mount?
  component: MySidebar,   // React.ComponentType<{ context: DocxPluginContext }>
  headerActions: MyHeaderActions, // opsional: icon buttons di app bar sebelah tombol tutup (dipisah separator)
}
```

**Layout bawaan:**
- Rail sempit (36px) selalu terlihat → klik untuk expand/collapse
- Header bawaan dengan icon, judul plugin, `headerActions` (opsional), separator vertikal, dan tombol tutup
- Content area scrollable (flush padding `0` jika memiliki `.manuscriber-sidebar-panel` atau tata letak kustom)

**Contoh component:**
```tsx
export function MySidebar({ context }: { context: DocxPluginContext }) {
  const { doc, actions, ui } = context
  if (!doc) return <p>No document open.</p>
  return (
    <div>
      <p>{doc.wordCount} words</p>
      <button
        className="plugin-btn-primary"
        onClick={() => actions.insertText('Hello!')}
      >
        Insert Hello
      </button>
    </div>
  )
}
```

---

### 4.2 Ribbon Tab

Tab baru yang muncul setelah semua tab bawaan di ribbon bar Docs.

```tsx
ribbon: {
  label: 'My Plugin',        // teks tab
  icon: <MyIcon size={14} />,// opsional, elemen React
  component: MyRibbonTab,    // React.ComponentType<{ context; onClose }>
}
```

**Aturan ribbon:**
- Gunakan `.plugin-ribbon-btn` + `.plugin-ribbon-group` untuk konsistensi visual
- Jangan buat button dengan tinggi > 64px (tinggi band ribbon)
- Gunakan `.plugin-ribbon-btn-icon` (32×32) dan `.plugin-ribbon-btn-label` (11px)

**Contoh:**
```tsx
export function MyRibbonTab({ context, onClose }: { context: DocxPluginContext; onClose: () => void }) {
  return (
    <div className="plugin-ribbon-group">
      <button
        className="plugin-ribbon-btn"
        onClick={() => context.actions.insertText('[generated text]')}
      >
        <span className="plugin-ribbon-btn-icon">
          {/* SVG 24×24 */}
        </span>
        <span className="plugin-ribbon-btn-label">Generate</span>
      </button>
    </div>
  )
}
```

---

### 4.3 Floating Overlay

Komponen mengambang di atas canvas editor. Dua mode anchor:

| Mode | Deskripsi | Use case |
|------|-----------|----------|
| `'selection'` | Diposisikan otomatis tepat di bawah teks yang dipilih | Selection popover, quick-action toolbar |
| `'fixed'` | Plugin mengontrol posisi sendiri via `style` | Panel AI floating, corner widget |

```tsx
floatings: [
  {
    anchor: 'selection',
    // Visible hanya ketika ada teks terpilih
    visible: (ctx) => !ctx.selection.empty,
    component: MyFloating,
  },
  {
    anchor: 'fixed',
    // Selalu visible ketika dokumen terbuka
    visible: (ctx) => !!ctx.doc,
    component: MyFixedPanel,
  },
]
```

**Gunakan `.plugin-floating-card`** sebagai wrapper untuk tampilan konsisten (shadow, border, radius).

---

### 4.4 Modal Dialog

Dialog full-screen dipicu dengan `ui.openModal('modal-id', payload)`.

```tsx
modals: [
  {
    id: 'my-settings-modal',     // harus match dengan openModal('my-settings-modal')
    component: MySettingsModal,  // React.ComponentType<{ context; initialPayload; onClose }>
  },
]
```

**Gunakan struktur bawaan:**
```tsx
export function MySettingsModal({ context, initialPayload, onClose }) {
  return (
    <>
      <div className="plugin-modal-header">
        <span className="plugin-modal-title">Settings</span>
        <button className="plugin-btn-icon" onClick={onClose}>✕</button>
      </div>
      <div className="plugin-modal-body">
        {/* konten */}
      </div>
      <div className="plugin-modal-footer">
        <button className="plugin-btn-secondary" onClick={onClose}>Cancel</button>
        <button className="plugin-btn-primary" onClick={handleSave}>Save</button>
      </div>
    </>
  )
}
```

Dismiss: ESC key dan klik backdrop sudah ditangani otomatis oleh `PluginModalLayer`.

---

### 4.5 Status Bar Widget

Widget kecil di status bar bawah Docs.

```tsx
statusBar: {
  component: MyStatusWidget, // React.ComponentType<{ context: DocxPluginContext }>
}
```

Gunakan untuk: live stats, connection indicator, plugin state badge.
Jaga agar widget ringkas (≤ 120px wide).

---

## 5. DocxPluginContext API Reference

```ts
interface DocxPluginContext {
  editor: Editor | null        // Tiptap Editor instance
  doc: PluginDocState | null   // snapshot state dokumen
  selection: PluginSelection   // snapshot seleksi saat ini
  actions: PluginDocActions    // mutasi dokumen
  ui: PluginUiActions          // aksi chrome UI
}
```

### 5.1 `context.doc`

| Property | Type | Deskripsi |
|----------|------|-----------|
| `filePath` | `string \| null` | Path file lengkap; null = untitled |
| `isDirty` | `boolean` | Ada perubahan belum disimpan? |
| `isEmpty` | `boolean` | Dokumen kosong? |
| `blocks` | `Block[]` | Parsed block tree (read-only) |
| `wordCount` | `number` | Jumlah kata di body |

### 5.2 `context.selection`

| Property | Type | Deskripsi |
|----------|------|-----------|
| `empty` | `boolean` | Tidak ada seleksi? |
| `from` | `number` | ProseMirror `from` |
| `to` | `number` | ProseMirror `to` |
| `text` | `string` | Teks terpilih |
| `blockIndex` | `number \| null` | Index blok yang berisi karet |

### 5.3 `context.actions`

```ts
// Masukkan teks biasa di posisi karet
actions.insertText(text: string): void

// Ganti seleksi dengan teks baru
actions.replaceSelection(text: string): void

// Masukkan HTML fragment
actions.insertHtml(html: string): void

// Scroll ke blok dengan index tertentu
actions.scrollToBlock(blockIndex: number): void

// Fokus kembali ke editor
actions.focusEditor(): void
```

### 5.4 `context.ui`

```ts
// Toast notification (2s info/success, 4s error)
ui.showToast(message: string, kind?: 'info' | 'success' | 'error'): void

// Buka/tutup modal
ui.openModal(modalId: string, payload?: unknown): void
ui.closeModal(): void

// Expand/collapse sidebar plugin ini
ui.expandSidebar(): void
ui.collapseSidebar(): void
```

---

## 6. CSS Design Tokens

Plugin **wajib** menggunakan CSS custom properties dari design system. Tidak boleh hardcode warna.

### Token warna yang boleh digunakan

```css
/* Surface & chrome */
var(--surface)              /* background utama */
var(--surface-subtle)       /* background sekunder */
var(--border)               /* border default */
var(--border-subtle)        /* border sangat tipis */
var(--border-strong)        /* border tegas */
var(--hover)                /* hover state background */
var(--active-bg)            /* active/selected background */

/* Text */
var(--text-primary)         /* teks utama */
var(--text-secondary)       /* teks sekunder */
var(--text-tertiary)        /* teks muted */

/* Accent (word-blue) */
var(--accent)               /* warna primer app */
var(--accent-dark)          /* hover accent */
var(--accent-soft)          /* accent background lembut */

/* Status */
var(--danger)               /* merah */
var(--danger-bg)            /* background merah */
var(--success)              /* hijau */
var(--success-bg)           /* background hijau */
```

### CSS Classes yang Tersedia

Lihat [`plugin-system.css`](../plugins/plugin-system.css) untuk daftar lengkap. Ringkasan:

| Class | Deskripsi |
|-------|-----------|
| `.plugin-btn-primary` | Button utama (accent solid) |
| `.plugin-btn-secondary` | Button sekunder (outline) |
| `.plugin-btn-danger` | Button destruktif (merah) |
| `.plugin-btn-icon` | Icon button 28×28 |
| `.plugin-input` | Text input |
| `.plugin-textarea` | Textarea input |
| `.plugin-select` | Select dropdown |
| `.plugin-label` | Form label |
| `.plugin-field` | Form field wrapper |
| `.plugin-divider` | Garis pemisah horizontal |
| `.plugin-banner` | Info/warning/error/success banner |
| `.plugin-spinner` | Loading spinner |
| `.plugin-empty` | Empty state container |
| `.plugin-floating-card` | Floating popover card |
| `.plugin-ribbon-btn` | Ribbon button (icon + label) |
| `.plugin-ribbon-group` | Ribbon button group |
| `.plugin-list` | List container |
| `.plugin-list-item` | List item (clickable) |

---

## 7. Aturan yang Tidak Boleh Dilanggar

> [!CAUTION]
> Melanggar aturan ini akan menyebabkan **konflik merge** saat update dari upstream.

1. **JANGAN import** dari `../App.tsx`, `../components/Ribbon.tsx`, atau file upstream apapun
2. **JANGAN menggunakan** `document.querySelector` untuk target element upstream yang tidak punya slot `id="plugin-*"`
3. **JANGAN hardcode warna hex** — semua warna lewat CSS variables
4. **JANGAN simpan state** di module-level (top-level `let` / `const` yang mutable) — gunakan React state atau `onInit`/`onDestroy` lifecycle
5. **JANGAN mutasi** `context.doc.blocks` secara langsung — selalu lewat `context.actions`
6. **SELALU** export default manifest dari `index.ts` / `index.tsx` plugin
7. **SELALU** gunakan `id` yang unik (reverse-domain) — konflik id akan menyebabkan bug runtime

---

## 8. Checklist Sebelum Publish Plugin

- [ ] `id` menggunakan format reverse-domain yang unik
- [ ] Semua import hanya dari `../types` dan package NPM (bukan dari file upstream)
- [ ] Semua warna menggunakan CSS variables
- [ ] `onDestroy` membersihkan semua timer/subscriber/IPC listener dari `onInit`
- [ ] Plugin berfungsi saat sidebar tertutup (tidak ada crash)
- [ ] Plugin tidak error ketika `context.doc === null`
- [ ] Plugin tidak error ketika `context.editor === null`
- [ ] Tidak ada `console.error` atau unhandled Promise rejection saat operasi normal
- [ ] Setiap tombol memiliki `aria-label` atau teks yang jelas
- [ ] Sudah ditest: buka dokumen, tutup dokumen, buka dokumen lagi

---

## 9. Contoh Plugin Lanjutan

### Plugin dengan IPC (Electron)

```tsx
// my-plugin/index.tsx
onInit(context) {
  // Daftarkan IPC listener
  window.ipcRenderer?.on('my-plugin:update', handleUpdate)
},
onDestroy() {
  // Hapus listener — WAJIB
  window.ipcRenderer?.removeAllListeners('my-plugin:update')
},
```

### Plugin dengan External API

```tsx
// my-plugin/MySidebar.tsx
export function MySidebar({ context }: { context: DocxPluginContext }) {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function fetchFromApi() {
    setLoading(true)
    try {
      const res = await fetch('https://api.example.com/data')
      const data = await res.json()
      setResult(data.text)
    } catch (err) {
      context.ui.showToast('API error: ' + String(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        className="plugin-btn-primary"
        onClick={fetchFromApi}
        disabled={loading}
      >
        {loading ? <span className="plugin-spinner" /> : 'Fetch Data'}
      </button>
      {result && <p>{result}</p>}
    </div>
  )
}
```

### Plugin dengan localStorage persistence

```tsx
const STORAGE_KEY = 'com.perusahaan.my-plugin.prefs'

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function savePrefs(prefs: object) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}
```

---

## 10. Roadmap & Slot yang Akan Ditambahkan

Slot berikut direncanakan untuk versi mendatang. Jangan implementasikan sendiri sebelum slot resmi tersedia:

| Slot | Deskripsi |
|------|-----------|
| `contextMenu` | Item tambahan di right-click menu editor |
| `toolbar` | Shortcut button di floating formatting toolbar |
| `settingsPage` | Halaman pengaturan di dialog Preferences |
| `autocomplete` | Saran autocompletion di editor |
| `documentPanel` | Panel di dalam area dokumen (bukan chrome) |

---

*File ini adalah bagian dari `docs/PLUGIN_STANDARD.md`. Letakkan di `docs/` agar ikut ter-track di Git.*
