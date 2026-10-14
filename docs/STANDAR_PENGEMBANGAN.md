# Standar Pengembangan Aplikasi & Panduan Sinkronisasi Upstream GenOffice

Dokumen ini adalah acuan standar arsitektur, struktur data, dan panduan teknis pengembangan bagi tim/kontributor pada repository **GenOffice**. 

Tujuan utama standar ini adalah **memastikan setiap fitur, modifikasi, dan kustomisasi dapat dikembangkan dengan aman tanpa merusak kompatibilitas serta memungkinkan repository asli (upstream) dapat di-update (pull/merge/rebase) secara berkala dengan konflik minimal atau tanpa konflik sama sekali.**

---

## 1. Arsitektur Monorepo & Pembagian Tanggung Jawab

GenOffice menggunakan **npm workspaces** dengan struktur monorepo yang terbagi secara ketat:

```text
genoffice/
├── apps/                        # Aplikasi Electron (Desktop runtime)
│   ├── docs/                    # Editor Dokumen Word (.docx)
│   ├── sheets/                  # Editor Spreadsheet Excel (.xlsx) + Rust sidecar
│   ├── slides/                  # Editor Presentasi PowerPoint (.pptx)
│   ├── pdf/                     # Editor & Viewer PDF (PDFium based)
│   ├── markdown/                # Editor Markdown berbasis blok (Tiptap)
│   ├── html/                    # AI Web Page & UI Builder
│   └── shell/                   # Host Electron utama (Tab bar, Windowing, Global Search, CLI)
├── packages/                    # Engine murni TypeScript (Headless, zero-Electron)
│   ├── docx-engine/             # Parser, OOXML generator, byte-patching DOCX
│   ├── pptx-engine/             # Model PPTX, inheritance resolver, byte-patching
│   ├── pptx-render/             # Canvas/Konva rendering engine untuk slides
│   ├── pptx-ops/                # DSL & operasi mutasi slides (transactions)
│   ├── xlsx-gateway/            # Gateway IO, DSL mutasi, dan pivot engine XLSX
│   ├── pdf2docx/                # Konversi PDF ke DOCX (PDFium character extraction)
│   ├── html2docx/               # Konversi HTML ke DOCX (Chromium DOM intent recognition)
│   ├── file-parse/              # Ekstraksi teks & metadata berkas lokal untuk AI
│   ├── agent-core/              # AI Agent loop, skill orchestrator & tools
│   ├── ai-provider/             # Abstraksi model AI (OpenAI, Claude, Gemini, DeepSeek, dll.)
│   ├── ai-search/               # Web search & media search tool provider
│   ├── ui/                      # Shared React UI components & tokens.css
│   ├── i18n/                    # Core lokalisasi (sharded dictionaries)
│   ├── electron-utils/          # Helper khusus proses utama Electron
│   ├── project-store/           # Manajemen berkas terkini (recent files) & SQLite index
│   └── cli/                     # Implementasi binary CLI headless `genoffice`
├── ee/                          # Modul Enterprise terisolasi (Lisensi komersial/private)
├── tools/                       # Skrip validasi, CI gate, font builder, OOXML validator
└── skills/                      # Skill AI (Claude Code, Cursor, Copilot, AGY, dll.)
```

### Prinsip Pemisahan Lapisan (Layer Separation)
1. **Packages (`packages/*`) Wajib Bersih dari Electron:**
   - Semua modul di bawah `packages/` adalah pustaka murni TypeScript yang dapat dijalankan secara headless (CLI, web worker, atau server).
   - Dilarang mengimpor modul bawaan Electron (`electron`, `BrowserWindow`, `ipcRenderer`, dll.) di dalam `packages/` kecuali `packages/electron-utils`.
2. **Apps (`apps/*`) Memisahkan Main & Renderer:**
   - `src/main`: Proses Electron utama (akses disk, IPC handler, lifecycle window).
   - `src/renderer`: Antarmuka React / UI. Tidak boleh mengakses Node.js API langsung; wajib melalui typed IPC bridge (`preload.ts`).

---

## 2. Tiga Prinsip Sakral Arsitektur Dokumen

### Prinsip 1: Byte-Preserving Round-Trip (Preservasi Format Asli)
> **"Jangan pernah membangun ulang seluruh file Office dari nol saat menyimpan."**

Format dokumen Office (`.docx`, `.xlsx`, `.pptx`) adalah paket ZIP berisi ratusan berkas XML, relasi (`.rels`), dan media. Pendekatan konvensional yang mem-parse dokumen menjadi JSON lalu me-generate ulang seluruh file XML akan menghapus fitur-fitur Word/Excel/PowerPoint yang tidak di-modelkan oleh editor (misal: macro VBA, custom XML parts, layout kompleks, smart art, ink, print settings).

GenOffice menerapkan **Surgical Patching**:
- Saat file dibuka, berkas asli di-cache dan di-hash (SHA-256).
- Parser hanya mengekstrak bagian yang dapat diedit dan menyematkan **jangkar (anchor)** ke posisi byte / index XML aslinya:
  - **DOCX**: Menggunakan `docxIndex` (indeks elemen di `<w:body>`), `originalXml`, `rawPPr` (properties paragraf mentah), dan `rawRPr` (properties run mentah).
  - **PPTX**: Menggunakan `slideXmlRange` dan `originalXml`.
  - **XLSX**: Menggunakan temporary row chunks (256-row streaming) dan copy-on-write OOXML gateway.
- Saat disimpan, **hanya blok yang kotor/berubah (dirty)** yang dikonversi menjadi fragmen XML baru dan disisipkan (splice) ke berkas asli. Seluruh elemen yang tidak disentuh disalin secara byte-for-byte.

### Prinsip 2: Pemisahan Mutlak Tema UI Chrome vs. Konten Dokumen
- Tema UI (Light, Dark, System) diatur secara semantik di `packages/ui/src/tokens.css`.
- **Aturan Tegas**: Tema UI **tidak boleh** mengubah data warna asli pada dokumen. Halaman kertas Word, isi sel Excel, dan warna shape PPTX adalah data permanen dokumen yang harus menghasilkan output export/print yang identik di mode gelap maupun terang.
- Mode gelap pada kanvas kerja (misal: Dark Page pada Docs atau Sheets) hanya merupakan *display-time CSS filter / remap layer* di layar dan tidak pernah disimpan ke file.

### Prinsip 3: Reversibilitas dan Transaction Journaling
- Setiap mutasi dokumen (terutama yang dipicu oleh AI atau script) harus melalui **Op Executor** (`runTxn` / `WorkbookAdapter.apply`).
- Perubahan dicatat dalam jurnal operasi berurutan (`OpLogEntry`) yang menyimpan status `before` dan `after`. Hal ini memungkinkan:
  - Fitur Undo/Redo multi-level.
  - Review AI dengan fitur rollback sekali klik.
  - Kolaborasi sinkronisasi state.

---

## 3. Pemetaan Struktur Data Utama (Data Structure Models)

### A. Struktur Data Dokumen Word (`packages/docx-engine`)
Setiap dokumen dimodelkan sebagai deretan **`Block`**:
```typescript
interface Block {
  id: string                     // UUID stabil untuk state editor
  type: BlockType                // 'paragraph' | 'heading' | 'listItem' | 'table' | 'image' | 'passthrough'
  docxIndex: number | null       // Indeks top-level di <w:body> file XML asli (null jika blok baru)
  originalXml: string | null     // Potongan XML asli (digunakan jika blok tidak diubah)
  rawPPr?: string                // Tag <w:pPr> asli verbatim
  format?: ParaFormat            // Properti perataan, spasi, indentasi, dll.
  level?: number                 // Level heading 1-9
  list?: { kind: 'bullet' | 'ordered'; numId: string; ilvl: number }
  runs?: Run[]                   // Potongan teks berformat
}

interface Run {
  text: string
  rawRPr?: string                // Tag <w:rPr> asli verbatim
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  color?: string                 // Hex tanpa '#' (misal: "1F2937")
  sizeHalfPoints?: number        // Ukuran font dalam satuan half-points OOXML (misal: 24 = 12pt)
  font?: string                  // Family nama font
  highlight?: string             // Highlight warna OOXML ("yellow", "green", dll.)
}
```

### B. Struktur Data Presentasi PowerPoint (`packages/pptx-engine` & `pptx-ops`)
Elemen slide dimodelkan dengan satuan presisi OOXML:
```typescript
// Satuan koordinat: EMU (English Metric Unit: 1 inci = 914400 EMU, 1 px @96dpi = 9525 EMU)
interface EmuRect {
  x: number; y: number; cx: number; cy: number
}

interface Transform {
  offset: EmuRect
  rot: number                   // 1/60000 derajat (misal: rot = 90 * 60000)
  flipH: boolean
  flipV: boolean
}

// Elemen di dalam Slide:
interface SlideElement {
  id: string
  name: string
  type: 'shape' | 'text' | 'picture' | 'table' | 'chart' | 'group' | 'connector'
  transform: Transform
  slideXmlRange?: [number, number] // Byte range dalam file slide XML asli
  originalXml?: string             // XML asli passthrough
  resolved: {                      // Nilai styling hasil kalkulasi (Slide -> Layout -> Master -> Theme)
    fill: Fill
    stroke?: Stroke
  }
}
```

### C. Struktur Data Spreadsheet Excel (`packages/xlsx-gateway`)
Pemisahan antara state tampilan Univer dan state persistensi XLSX:
```typescript
interface CellState {
  readonly value: string | number | boolean | null
  readonly formula?: string
  readonly rawValue?: string | number | boolean | null
}

interface WorksheetState {
  readonly id: string
  readonly name: string
  readonly cells: Readonly<Record<string, CellState>> // Key: Cell address (misal: "A1", "C15")
  readonly styles?: Readonly<Record<string, CellFormatState>>
  readonly merges?: readonly string[]                  // Range string (misal: ["A1:C1"])
  readonly rowHeights?: Readonly<Record<string, number>>
  readonly colWidths?: Readonly<Record<string, number>>
}

interface WorkbookSnapshot {
  readonly revision: number
  readonly sheets: readonly WorksheetState[]
}
```

---

## 4. Strategi Pengembangan Agar Selalu Mudah Sinkron dengan Upstream

Repository hulu (upstream) aktif menerima perbaikan dan pembaruan berkala dari `https://github.com/genspark-ai/genoffice.git`. Agar cabang kustom kita tidak terjebak dalam *merge hell*, terapkan panduan berikut:

### A. Konfigurasi Remote Git Wajib
Setiap developer wajib memiliki dua remote di repositorinya:
```bash
# 1. Remote origin (repo fork / internal tim):
git remote set-url origin https://github.com/hajicexoassistance-hub/genoffice.git

# 2. Remote upstream (repo asli genspark-ai):
git remote add upstream https://github.com/genspark-ai/genoffice.git

# Verifikasi:
git remote -v
```

### B. Strategi Percabangan (Branching Model)
1. **`upstream-tracking` (atau pertahankan `main` bersih):** Cabang yang 100% mencerminkan commit dari `upstream/main`. Jangan pernah commit langsung ke cabang ini.
2. **`develop`:** Cabang integrasi internal tim.
3. **`feature/<nama-fitur>`:** Cabang pembuatan fitur kustom.

```text
upstream/main (genspark-ai)
      │  (git fetch upstream)
      ▼
upstream-tracking (cermin bersih)
      │  (merge/rebase berkala)
      ▼
develop (kode stabil tim)
      │
      ├──► feature/custom-auth
      └──► feature/custom-cloud-sync
```

### C. Pola Desain Anti-Konflik (Conflict-Free Design Patterns)

1. **Prinsip "Extension over Modification" (Open-Closed Principle):**
   - **Hindari mengubah logika internal yang ada di `packages/docx-engine`, `packages/pptx-engine`, atau `packages/xlsx-gateway` secara langsung** jika hanya untuk menambahkan fungsionalitas baru.
   - Buat fungsi/modul pembungkus (Wrapper / Adapter) di package terpisah atau file terpisah.
   
2. **Lokasi Penambahan Kode Kustom:**
   - **Fitur Enterprise / Modul Tertutup:** Letakkan di folder `ee/` (sesuai ketentuan lisensi repo hulu). Folder ini diabaikan oleh kontributor eksternal upstream.
   - **Package Tambahan Baru:** Tambahkan folder baru di `packages/nama-fitur-baru/` dan daftarkan di `package.json` workspaces. Upstream tidak akan memiliki file ini, sehingga tidak akan terjadi merge conflict.
   - **Komponen UI Tambahan:** Buat folder komponen terisolasi (misal: `apps/shell/src/renderer/features/my-custom-feature/`).

3. **Penanda Khusus Jika Terpaksa Mengubah File Upstream:**
   Jika suatu file inti upstream MUTLAK harus dimodifikasi (misal: menambah route di shell atau menambah menu di toolbar):
   - Buat perubahan seminimal mungkin (minimal diff).
   - Berikan komentar penanda yang jelas:
     ```typescript
     // ==========================================
     // [CUSTOM-EXTENSION: AUTH-SSO] - START
     // Rationale: Menambahkan integrasi SSO internal
     // ==========================================
     if (customAuthService.isEnabled()) {
       customAuthService.attach(session);
     }
     // ==========================================
     // [CUSTOM-EXTENSION: AUTH-SSO] - END
     // ==========================================
     ```
   - Penanda ini memudahkan developer saat melakukan resolusi konflik ketika rebase.

### D. SOP Sinkronisasi (Merge Upstream Workflow)

Lakukan sinkronisasi mingguan atau berkala dengan langkah berikut:

```bash
# 1. Ambil update terbaru dari repository asli
git fetch upstream

# 2. Update cabang pelacak upstream lokal
git checkout main
git merge upstream/main --ff-only

# 3. Pindah ke cabang develop dan integrasikan update upstream
git checkout develop
git merge main --no-edit

# Jika ada konflik:
# - Selesaikan konflik dengan memprioritaskan perbaikan bug hulu
# - Pastikan blok [CUSTOM-EXTENSION] Anda tetap terjaga
# - Jalankan test lengkap (lihat bagian Quality Gate)

# 4. Push update ke origin (repo tim)
git push origin main
git push origin develop
```

---

## 5. Konvensi Koding & Standar Kualitas

Setiap baris kode yang dibuat wajib mematuhi aturan berikut agar lolos pemeriksaan automated CI:

### 1. Standar Bahasa (Language Policy)
- **English Only:** Semua nama variabel, fungsi, interface, komentar kode (`// ...`), dan commit messages **wajib menggunakan bahasa Inggris**.
- **User-Facing Strings:** Teks yang dilihat pengguna akhir (label, tombol, pesan dialog) **dilarang ditulis hardcoded**. Wajib didaftarkan melalui modul `i18n`.

### 2. Standar Lokalisasi (i18n)
- Kamus UI di-shard per bahasa: `src/renderer/i18n/<domain>/<lang>.ts`.
- File `zh.ts` mendefinisikan kontrak kunci utama.
- File bahasa lain (misal: `id.ts`, `en.ts`) wajib menggunakan:
  ```typescript
  import type { zh } from './zh'
  export default {
    // ...
  } satisfies Record<keyof typeof zh, string>
  ```
  Ini memastikan jika ada kunci baru atau kunci yang hilang, TypeScript akan langsung mengeluarkan type error saat kompilasi.
- **Peringatan Penting:** Fungsi translasi `t` dari `useI18n()` tidak referensial-stabil. Jangan pernah memasukkan `t` ke dalam dependency array `useEffect` atau `useMemo`. Simpan string key-nya dan terjemahkan pada saat render.

### 3. Standar Warna & Tema (Theming)
- **Dilarang menuliskan raw color** seperti `#ffffff`, `rgb(...)`, atau `hsl(...)` di dalam berkas CSS renderer atau inline styles.
- Gunakan token semantik dari `packages/ui/src/tokens.css`:
  - `var(--surface)`
  - `var(--text)`
  - `var(--hover)`
  - `var(--accent)` (aksen spesifik per aplikasi)
- Nilai hex mentah hanya diizinkan pada baris deklarasi custom properties (`--x: #...;`). CI memeriksa ini melalui `tools/check-theme-colors.mjs`.

### 4. Standar Type-Safety & Build
- Gunakan TypeScript ketat (`strict: true`). Hindari `any`.
- Kode proses utama aplikasi (`apps/*/src/main`) dikompilasi ke dalam build `shell`. Setelah mengubah kode main-process, build ulang shell (`npm run dev` atau rebuild shell).
- Perubahan pada script preload memerlukan restart/rebuild agar renderer tidak blank.
- Dependensi package workspace yang dicantumkan di `dependencies` aplikasi harus dimasukkan ke daftar `exclude` pada `externalizeDepsPlugin` di konfigurasi Vite, agar tidak crash saat di-package.

---

## 6. Checklist & Quality Gate Pra-Commit

Sebelum melakukan commit atau membuat Pull Request, jalankan perintah wajib berikut:

```bash
# 1. Periksa format kode (hanya file yang diubah/baru)
npm run format:check

# 2. Jalankan linter ESLint (0 errors wajib)
npm run lint

# 3. Jalankan typechecker TypeScript di seluruh workspace
npm run typecheck

# 4. Jalankan unit test (engine TS + Rust sidecar)
npm test

# 5. Jalankan pemeriksaan kepatuhan lisensi dependensi baru
npm run licenses

# 6. Jalankan pemeriksaan warna tema
npm run check:theme-colors

# 7. Jalankan pemeriksaan komentar bahasa Inggris
npm run check:english-comments
```

### Format Otomatis
Untuk memformat file yang baru diubah secara aman tanpa menimbulkan diff formatting di file lain:
```bash
npm run format
```

---

## 7. Rangkuman Panduan untuk Pengembang Baru

| Yang Boleh & Disarankan | Yang Dilarang Keras |
| :--- | :--- |
| Membuat package baru di `packages/` untuk fitur baru | Mengubah file parser inti (`docx-engine/parse.ts`, dll.) tanpa izin arsitek |
| Menggunakan token CSS `var(--surface)` | Menuliskan hardcoded `#hex` / `rgb()` di CSS UI renderer |
| Menyimpan dokumen dengan patch byte-preserving | Menghasilkan ulang seluruh file ZIP Office dari scratch |
| Menempatkan teks UI di kamus `i18n` | Menuliskan teks Indonesia/Inggris hardcoded di komponen JSX |
| Menulis komentar dan commit dalam bahasa Inggris | Menulis komentar kode dalam bahasa selain bahasa Inggris |
| Melakukan fetch & merge berkala dari `upstream/main` | Bekerja berbulan-bulan di cabang kustom tanpa rebase hulu |
