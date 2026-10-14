# GenOffice PDF Plugin System

Dokumentasi arsitektur sistem plugin untuk modul PDF (`apps/pdf`).

Mengacu pada standar global [`docs/PLUGIN_STANDARD.md`](../../../../docs/PLUGIN_STANDARD.md).

---

## 1. Prinsip Utama

| Prinsip | Implementasi |
|---|---|
| **Zero Upstream Collision** | Seluruh kode plugin berada di `apps/pdf/src/renderer/plugins/` |
| **Additive Only** | Plugin menambah antarmuka/fungsionalitas tanpa memodifikasi logika inti rendering PDF |
| **Context-First** | Akses ke state dokumen dan UI dilakukan lewat `PdfPluginContext` |
| **Merge-Safe** | Update pada aplikasi PDF tidak akan berkonflik dengan plugin kustom |
| **Layak Dinonaktifkan** | Cukup beri komentar pada entri di `registry.ts` untuk mematikan plugin |

---

## 2. Struktur Direktori

```
apps/pdf/src/renderer/plugins/
├── types.ts              # Kontrak publik: PdfPluginContext, Manifest, Surfaces
├── registry.ts           # Daftar plugin aktif (edit berkas ini untuk menambah/menonaktifkan plugin)
├── PdfPluginHost.tsx     # Host React & lifecycle manager
├── plugin-system.css     # Styling dasar permukaan plugin
├── ui/                   # Internal portal renderers
│   ├── PluginRibbonTab.tsx
│   ├── PluginSidebarPanel.tsx
│   ├── PluginCanvasView.tsx
│   ├── PluginFloatingLayer.tsx
│   ├── PluginModalLayer.tsx
│   └── PluginStatusBar.tsx
├── starter-plugin/       # Boilerplate referensi lengkap (nonaktif)
│   ├── index.tsx
│   └── ...
└── tashih/               # Plugin Pentashihan Mushaf Al-Qur'an & Naskah (aktif)
    ├── index.tsx         # Manifest plugin
    ├── tashihStore.ts    # Penyimpanan catatan koreksi & status per halaman
    ├── TashihIcon.tsx    # Ikon vektor SVG Mushaf & Tashih
    ├── TashihRibbon.tsx  # Ribbon tab verifikasi & navigasi
    ├── TashihSidebar.tsx # Panel sidebar temuan catatan koreksi (resize 50%)
    ├── TashihCanvasView.tsx # Workbench penelaahan teliti naskah
    ├── TashihFloating.tsx# Popover seleksi lafadz cepat (+ Rasm / + Dhabth)
    ├── TashihModal.tsx   # Dialog berita acara rekapitulasi pentashihan
    └── TashihStatusBar.tsx # Status bar live badge
```

---

## 3. Cara Membuat Plugin PDF Baru

1. **Salin Folder Template**:
   ```bash
   cp -r apps/pdf/src/renderer/plugins/starter-plugin apps/pdf/src/renderer/plugins/nama-plugin-anda
   ```
2. **Ubah `id` & Informasi di `index.tsx`**:
   Gunakan reverse-domain unik, misalnya `com.perusahaan.pdf-watermark`.
3. **Pilih Surface yang Diperlukan**:
   Hapus surface yang tidak digunakan (misalnya hapus `canvasView` jika tidak butuh workbench overlay penuh).
4. **Daftarkan di `registry.ts`**:
   Tambahkan import dan masukkan ke array `REGISTERED_PLUGINS`.

---

## 4. Standar Styling & Posisi Sidebar (Adopsi Manuscriber Docs)

- **Posisi di Luar Editor**: Panel Sidebar diletakkan di dalam `.app-main` sejajar dengan `.app-content` (kolom editor PDF), sehingga berjalan penuh dari pita ribbon hingga dasar jendela (status bar berada di kolom editor dan tidak menumpuk di bawah sidebar).
- **Drag-Resizable hingga 50%**: Sidebar mendukung drag horizontal dari sisi kiri panel dengan pointer capture mulus, dapat di-resize hingga maksimal `50vw` (50% lebar layar).
- **Unified Header Bar (47px)**: Header app bar sidebar menggunakan tinggi 47px (`height: 47px; min-height: 47px;`), selaras dengan header Manuscriber dan panel Genspark AI.
- **Vertical Collapsed Rail (34px)**: Saat ditutup, sidebar menciut menjadi icon rail vertikal selebar 34px di pojok kanan layar tanpa mengganggu viewport dokumen PDF.
