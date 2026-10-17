# GenOffice Docs Plugin System — Standar & Panduan Pengembangan

Sistem plugin GenOffice dirancang dengan prinsip **Additive & Zero-Collision**:
1. **Tidak merusak atau memodifikasi logika inti** upstream Docs (Word engine, Tiptap, ribbons).
2. **Modular dan terisolasi**: Setiap plugin memiliki manifest, runtime context, dan siklus hidupnya sendiri.
3. **Mengikuti Standar Desain Fluent & GenOffice**: Otomatis beradaptasi dengan mode Gelap/Terang, CSS variables (`--color-text-primary`, `--surface`, dsb.).

---

## 1. Daftar Surface yang Didukung

Plugin dapat menggunakan satu atau beberapa surface sesuai kebutuhan:

| Surface | Deklarasi Manifest | Penjelasan & Use-Case |
| :--- | :--- | :--- |
| **Canvas View (Workbench)** *(Baru)* | `canvasView` | Container layar utama yang **menutupi lembar kertas Word**. Sangat cocok untuk: mode Staging, transkripsi per blok manuskrip, verifikasi side-by-side, form input khusus, atau diff viewer. Lembar kerja Word di baliknya tetap utuh. |
| **Sidebar Panel** | `sidebar` | Panel vertikal collapsible di sisi kanan lembar kerja (lebar default `360px`, identik dengan dock Genspark). |
| **Ribbon Tab** | `ribbon` | Tab toolbar kustom di pita menu Office. Ketika aktif, ribbon body menampilkan grup alat kustom plugin secara eksklusif. |
| **Floating Overlays** | `floatings` | Popover melayang yang menempel pada seleksi teks aktif (`anchor: 'selection'`) atau koordinat tetap (`anchor: 'fixed'`). |
| **Modal Dialogs** | `modals` | Dialog modal popup di tengah layar untuk konfigurasi atau alur kerja interaktif mendalam. |
| **Status Bar** | `statusBar` | Widget inline chip di bilah status bawah jendela untuk menampilkan info real-time. |

---

## 2. Struktur Direktori Plugin

Setiap plugin baru disarankan dibuat di dalam subfolder tersendiri di `apps/docs/src/renderer/plugins/`:

```text
apps/docs/src/renderer/plugins/
├── DocxPluginHost.tsx          # Host container & Context Provider
├── plugin-system.css           # Styling dasar, token Fluent, & surface styles
├── registry.ts                 # Daftar plugin yang aktif terpasang
├── types.ts                    # TypeScript interface & API contracts
├── ui/                         # Portal components untuk masing-masing surface
│   ├── PluginCanvasView.tsx    # Portal ke #plugin-canvas-slot
│   ├── PluginSidebarPanel.tsx  # Portal ke #plugin-sidebar-slot
│   ├── PluginRibbonTab.tsx     # Portal ke #plugin-ribbon-tab-slot & panel
│   ├── PluginFloatingLayer.tsx # Portal overlay melayang
│   ├── PluginModalLayer.tsx    # Portal dialog modal
│   └── PluginStatusBar.tsx     # Portal widget status bar
└── starter-plugin/             # Template acuan lengkap (Starter Plugin)
    ├── index.tsx               # Entry point & DocxPluginManifest
    ├── StarterCanvasView.tsx   # Contoh Canvas Workbench (Mode Staging)
    ├── StarterSidebar.tsx      # Contoh Sidebar panel
    ├── StarterRibbon.tsx       # Contoh Ribbon tab
    ├── StarterFloating.tsx     # Contoh Floating overlay
    ├── StarterModal.tsx        # Contoh Modal dialog
    ├── StarterStatusBar.tsx    # Contoh Status bar widget
    └── StarterIcon.tsx         # Ikon SVG plugin
```

---

## 3. Anatomi Plugin (`DocxPluginManifest`)

```tsx
import type { DocxPluginManifest } from '../types'
import { MyCanvasWorkbench } from './MyCanvasWorkbench'
import { MySidebar } from './MySidebar'
import { MyRibbon } from './MyRibbon'

export const myPlugin: DocxPluginManifest = {
  id: 'com.mycompany.my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Deskripsi fungsionalitas plugin.',
  icon: <MyIcon />,

  // 1. Canvas View (Workbench yang menutupi kertas)
  canvasView: {
    title: 'Mode Staging Transkripsi',
    defaultOpen: false,
    component: MyCanvasWorkbench,
  },

  // 2. Sidebar Panel
  sidebar: {
    minWidth: 360,
    defaultOpen: false,
    headerActions: MySidebarHeaderActions, // Opsional: icon buttons di app bar sebelah tombol tutup
    component: MySidebar,
  },

  // 3. Ribbon Tab
  ribbon: {
    label: 'Alat Kustom',
    component: MyRibbon,
  },
}
```

---

## 4. Menggunakan `DocxPluginContext`

Setiap komponen surface menerima props `context: DocxPluginContext`:

```tsx
export function MyComponent({ context }: { context: DocxPluginContext }) {
  const { actions, ui, doc, selection, editor } = context

  // Operasi Dokumen:
  actions.insertText('Teks baru')
  actions.replaceSelection('Ganti seleksi')
  actions.insertParagraphAfterSelection('Paragraf baru di bawah seleksi')
  actions.insertHtml('<p>Paragraf</p>')

  // Kontrol UI:
  ui.showToast('Berhasil disimpan!', 'success')
  ui.openCanvasView()          // Buka Canvas View (menutupi kertas Word)
  ui.closeCanvasView()         // Tutup Canvas View (kembali ke kertas Word)
  ui.toggleCanvasView()        // Toggle Canvas View
  ui.expandSidebar()           // Buka sidebar
  ui.collapseSidebar()         // Tutup sidebar
  ui.openModal('my-modal-id')  // Buka dialog modal
}
```

---

## 5. Standar Styling & Identitas Visual
* **Ukuran Identik dengan Genspark**:
  * **Posisi di Luar Editor**: Panel Sidebar diletakkan di dalam `.app-main` sejajar dengan `.app-content`, sehingga berjalan penuh dari pita ribbon hingga dasar jendela (status bar berada di kolom editor dan tidak menumpuk di bawah sidebar).
  * **Resizable hingga Maks 50%**: Sidebar dapat ditarik (*drag resize*) pada tepi kirinya dengan batas maksimum 50% dari lebar layar (`max-width: 50vw`), dengan batas minimum `360px` (atau `minWidth` plugin). Ukuran tersimpan otomatis di `localStorage`.
  * **Header & Tombol**: Header tinggi `47px` (`padding: 10px 12px 10px 14px`). Tombol aksi menggunakan kelas `.ai-header-btn` (26×26px, `border-radius: var(--radius-8)`).
* **Canvas Workbench**:
  * Menggunakan kelas `.plugin-canvas-header` (48px), `.plugin-canvas-badge`, dan `.plugin-canvas-body`.
  * Selalu gunakan CSS variables untuk warna agar otomatis mendukung Light & Dark theme.
