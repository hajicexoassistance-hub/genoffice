# Walkthrough: Sistem Plugin & Starter Template Modul PDF (`apps/pdf`)

## Ringkasan Pekerjaan
Arsitektur sistem plugin untuk modul PDF (`apps/pdf`) berhasil dibangun secara modular dan rapi sesuai spesifikasi pada [`docs/PLUGIN_STANDARD.md`](file:///d:/dev/genoffice/docs/PLUGIN_STANDARD.md) dan rencana implementasi di [`implementation_plan.md`](file:///C:/Users/AsifDzaki/.gemini/antigravity-ide/brain/be94b039-eff6-46ef-8cc0-5a356f28971f/implementation_plan.md).

### Standardisasi Visual & Fitur Tambahan
1. **Sidebar Dapat Di-resize Hingga 50% Lebar Layar**:
   - Di [`view-config.ts`](file:///d:/dev/genoffice/apps/pdf/src/renderer/view-config.ts), batas maksimum `clampSidebarW` dinaikkan dari yang sebelumnya terkunci di 320px (40%) menjadi **50% dari lebar jendela** (`Math.round(window.innerWidth * 0.5)`).
   - Sidebar thumbnail dan outline pada sisi kiri dapat ditarik bebas dengan lancar hingga memenuhi setengah layar.
   - Slot sidebar plugin ([`PluginSidebarPanel.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/ui/PluginSidebarPanel.tsx)) diposisikan di sisi kanan viewport dokumen di luar `.app-content` yang juga mendukung drag-resizing hingga **50% lebar layar**.
2. **Otomatis Tutup Gambar Mini Saat Plugin Terbuka**:
   - Ketika panel plugin dibuka (baik sidebar plugin, workbench canvas staging, maupun aktivasi ribbon tab plugin), panel Gambar Mini (`sidebar === 'thumbs'`) di sebelah kiri otomatis ditutup (`setSidebar(null)`) sehingga dokumen PDF dan area plugin mendapatkan ruang layar yang optimal.
   - Ketika plugin ditutup kembali, status Gambar Mini dipulihkan secara otomatis jika sebelumnya memang aktif terbuka.
3. **Adopsi Tinggi Bar Manuscriber (47px Unified Header)**:
   - Header Workbench Canvas Staging ([`StarterCanvasView.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/starter-plugin/StarterCanvasView.tsx)) dan Sidebar Plugin ([`PluginSidebarPanel.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/ui/PluginSidebarPanel.tsx)) mengadopsi tinggi bar standar **47px**, sejajar presisi dengan header panel Genspark AI (`.ai-panel-header`).
   - Dilengkapi tombol kembali compact (`.btn-workbench-icon` dengan panah SVG), pemisah garis 16px, badge file naskah terpotong rapi (`.workbench-file-badge`), dan pil statistik status (`.workbench-stats-pill`).
4. **Isolasi Tab Ribbon Plugin**:
   - Di [`App.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/App.tsx), event listener tab kini mendukung `plugin:...` sehingga panel Home (Genspark AI, Ringkasan, dll) disembunyikan sepenuhnya saat tab plugin aktif.
   - Panel ribbon plugin menggunakan `display: contents;` sehingga tombol-tombol grup langsung mengisi ribbon body 80px native tanpa clipping tinggi atau padding berlebih.
5. **100% Standar Ikon Vektor SVG**:
   - Seluruh emoji unicode informal telah digantikan dengan ikon SVG Fluent/Office resmi.

---

## Berkas yang Dibuat & Diperbarui

### 1. Fondasi Sistem Plugin PDF
- [`apps/pdf/src/renderer/plugins/types.ts`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/types.ts): Kontrak publik `PdfPluginContext`, `PdfPluginDocState`, `PdfPluginSelection`, `PdfPluginDocActions`, `PdfPluginUiActions`, dan `PdfPluginManifest`.
- [`apps/pdf/src/renderer/plugins/registry.ts`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/registry.ts): Registri plugin aktif.
- [`apps/pdf/src/renderer/plugins/PdfPluginHost.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/PdfPluginHost.tsx): Komponen host pengelola lifecycle, pelacakan seleksi teks, notifikasi toast SVG, dan portal rendering.
- [`apps/pdf/src/renderer/plugins/plugin-system.css`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/plugin-system.css): Styling terstandarisasi mengadopsi token Manuscriber (tinggi bar 47px, workbench header, tombol commit, status bar, modal, dan portal).
- [`apps/pdf/src/renderer/plugins/README.md`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/README.md): Panduan teknis pengembang.
- [`apps/pdf/src/renderer/view-config.ts`](file:///d:/dev/genoffice/apps/pdf/src/renderer/view-config.ts): Batas `clampSidebarW` dinaikkan ke 50% lebar layar.

### 2. Host Surface Renderers (`ui/`)
- [`apps/pdf/src/renderer/plugins/ui/PluginRibbonTab.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/ui/PluginRibbonTab.tsx)
- [`apps/pdf/src/renderer/plugins/ui/PluginSidebarPanel.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/ui/PluginSidebarPanel.tsx) (header 47px, drag-resizing responsif hingga 50%, ikon puzzle SVG)
- [`apps/pdf/src/renderer/plugins/ui/PluginCanvasView.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/ui/PluginCanvasView.tsx)
- [`apps/pdf/src/renderer/plugins/ui/PluginFloatingLayer.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/ui/PluginFloatingLayer.tsx)
- [`apps/pdf/src/renderer/plugins/ui/PluginModalLayer.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/ui/PluginModalLayer.tsx)
- [`apps/pdf/src/renderer/plugins/ui/PluginStatusBar.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/ui/PluginStatusBar.tsx)
- [`apps/pdf/src/renderer/plugins/ui/index.ts`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/ui/index.ts)

### 3. Starter Plugin Template (`starter-plugin/`)
- [`StarterIcon.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/starter-plugin/StarterIcon.tsx): Ikon puzzle add-in standar Office.
- [`StarterRibbon.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/starter-plugin/StarterRibbon.tsx): Tombol navigasi dan aksi dengan SVG tanpa clipping vertikal.
- [`StarterSidebar.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/starter-plugin/StarterSidebar.tsx): Ringkasan status dan aksi cepat dengan ikon SVG.
- [`StarterCanvasView.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/starter-plugin/StarterCanvasView.tsx): Workbench Staging dengan header 47px serasi Manuscriber.
- [`StarterFloating.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/starter-plugin/StarterFloating.tsx): Popover seleksi teks dengan tombol SVG Salin & Info.
- [`StarterModal.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/starter-plugin/StarterModal.tsx): Dialog pop-up responsif dengan tombol tutup SVG.
- [`StarterStatusBar.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/starter-plugin/StarterStatusBar.tsx): Widget footer status bar dengan `<StarterIcon size={12} />`.
- [`index.tsx`](file:///d:/dev/genoffice/apps/pdf/src/renderer/plugins/starter-plugin/index.tsx): Manifest entry point.

### 4. Integrasi Bersih di `apps/pdf/src/renderer/App.tsx`
- 5 slot portal DOM pasif (`#plugin-ribbon-tab-slot`, `#plugin-ribbon-panel-slot`, `#plugin-sidebar-slot`, `#plugin-canvas-slot`, `#plugin-statusbar-slot`).
- Mounting `<PdfPluginHost />`.
- Dukungan state `ribbonTab` dinamis untuk tab plugin.

---

## Hasil Verifikasi

### Pemeriksaan Statis TypeScript
```bash
npm --prefix apps/pdf run typecheck
```
**Hasil:** `Exit code 0` (0 error).
