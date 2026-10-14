/**
 * TASHIH-PRO: Types & Data Schema
 * Standar koordinat PDF Points, Audit Trail, Preset Domain, dan Multi-Vendor
 */

export type DomainPreset = 'mushaf' | 'turats' | 'buku_umum'

export type SeverityLevel = 'sesuai' | 'koreksi' | 'kritis' // Hijau (Toleransi) | Kuning (Koreksi) | Merah (Kritis/Reprint)

export type ApprovalStatus = 'saran_ai' | 'disetujui' | 'revisi' | 'ditolak'

export interface DomainCategoryConfig {
  id: string
  label: string
  badgeColor: string
  description: string
}

export const DOMAIN_PRESETS: Record<
  DomainPreset,
  {
    title: string
    description: string
    categories: DomainCategoryConfig[]
  }
> = {
  mushaf: {
    title: 'Mushaf Al-Qur\'an',
    description: 'Pentashihan Mushaf Standar Kemenag / Rasm Utsmani',
    categories: [
      { id: 'rasm', label: 'Rasm Utsmani', badgeColor: '#c43e1c', description: 'Bentuk tulisan, penambahan, pengurangan, atau penggantian huruf' },
      { id: 'dhabth', label: 'Dhabth / Harakat', badgeColor: '#0078d4', description: 'Tanda baca, harakat fathah/kasrah/dhammah/sukun/tasydid' },
      { id: 'waqaf', label: 'Tanda Waqaf', badgeColor: '#107c41', description: 'Simbol waqaf lazim, jaiz, saktah, tanda ayat' },
      { id: 'ayat', label: 'Nomor / Tanda Ayat', badgeColor: '#8764b8', description: 'Penomoran ayat, hiasan juz, nama surah' },
      { id: 'cetak', label: 'Cacat Cetak / Noda', badgeColor: '#b4009e', description: 'Tinta blobor, teks putus, register warna meleset' },
      { id: 'umum', label: 'Lainnya', badgeColor: '#605e5c', description: 'Catatan umum lainnya' },
    ],
  },
  turats: {
    title: 'Kitab Kuning / Turats',
    description: 'Pentashihan Kitab Klasik, Matan, Syarah & Hasyiyah',
    categories: [
      { id: 'matan_syarah', label: 'Matan vs Syarah', badgeColor: '#d83b01', description: 'Pemisahan garis/tanda matan dan penjelasan syarah/hasyiyah' },
      { id: 'ruju_makna', label: 'Tanda Ruju\' / Makna Gandul', badgeColor: '#004e8c', description: 'Simbol ruju\' dhomir atau makna pegon/jawa' },
      { id: 'harakat_irab', label: 'Harakat / I\'rab', badgeColor: '#0078d4', description: 'Kesesuaian kaidah nahwu, sharaf, dan harakat akhir' },
      { id: 'typo_naskah', label: 'Salah Tulis Naskah', badgeColor: '#c43e1c', description: 'Huruf tertukar, kalimat melompat (saqith)' },
      { id: 'cetak_plat', label: 'Kualitas Plat / Tinta', badgeColor: '#b4009e', description: 'Tinta tembus, noda buram pada teks arab' },
      { id: 'umum', label: 'Lainnya', badgeColor: '#605e5c', description: 'Catatan naskah umum' },
    ],
  },
  buku_umum: {
    title: 'Buku Umum / Penerbitan',
    description: 'Naskah Buku Akademik, Monograf & Layout Penerbit',
    categories: [
      { id: 'typo', label: 'Typo / Salah Eja', badgeColor: '#c43e1c', description: 'Kesalahan ejaan kata sesuai KBBI / PUEBI' },
      { id: 'font_sub', label: 'Substitusi Font', badgeColor: '#d83b01', description: 'Font hilang, karakter rusak, glyph kotak' },
      { id: 'margin_layout', label: 'Margin & Running Header', badgeColor: '#0078d4', description: 'Posisi halaman, header/footer, batas potong (trim)' },
      { id: 'plat_cetak', label: 'Plat / Tinta Buram', badgeColor: '#b4009e', description: 'Noda tinta, bayangan plat, kontras rendah' },
      { id: 'halaman_posisi', label: 'Halaman Hilang / Terbalik', badgeColor: '#a80000', description: 'Urutan halaman tidak sesuai naskah master' },
      { id: 'umum', label: 'Lainnya', badgeColor: '#605e5c', description: 'Koreksi editorial lainnya' },
    ],
  },
}

export interface PdfCoordinates {
  pdf_x: number
  pdf_y: number
  width: number
  height: number
  rotation_degree?: number
}

export interface AnnotationContent {
  text_master?: string
  text_scan?: string
  error_category: string
  reason: string
  suggestion: string
}

export type MarkingCompleteness = 'complete' | 'pending_master' | 'pending_scan'

export interface AnnotationReview {
  severity: SeverityLevel
  approval_status: ApprovalStatus
  reviewed_by: string
  timestamp_reviewed: string
}

export interface TashihAnnotation {
  annotation_id: string
  vendor: string
  page_number: number
  marked_by: 'Vision AI' | 'Pixel Diff' | 'Editor Manusia'
  timestamp_created: string
  coordinates: PdfCoordinates           // Koordinat area di scan cetak
  master_coordinates?: PdfCoordinates  // Koordinat terpisah di master layout (jika posisi berbeda)
  scan_coordinates?: PdfCoordinates    // Alias eksplisit koordinat scan
  marking_status?: MarkingCompleteness // Status kelengkapan penandaan multi-dokumen
  content: AnnotationContent
  review: AnnotationReview
  cropThumbnail?: string // Base64 visual proof snippet (fallback umum)
  cropThumbnailMaster?: string // Base64 visual proof cuplikan naskah Master
  cropThumbnailScan?: string // Base64 visual proof cuplikan naskah Scan cetak
  item_number?: number // Nomor ID urut (#1, #2, #3...) agar sinkron antar kotak & kartu
  vendor_coordinates?: Record<string, PdfCoordinates> // Koordinat multi-vendor (vendorId -> coords)
  vendor_crops?: Record<string, string> // Cuplikan bukti visual per vendor (vendorId -> base64)
}

export interface PageAnnotationFile {
  page_number: number
  last_updated: string
  annotations: TashihAnnotation[]
}

export interface VendorFileEntry {
  id: string
  name: string
  fileName: string
  filePath?: string
  fileSize?: number
  pageCount?: number
  rotationDeskew: number // Derajat kemiringan (-5.0° s/d +5.0°, step 0.1°)
  anchorSyncY?: number   // Offset anchor dalam persen atau piksel
}

export interface SumopodAiSettings {
  baseUrl: string       // Default: https://api.sumopod.com/v1 atau kompatibel OpenAI
  apiKey: string
  modelName: string     // Default misal: gpt-4o atau claude-3-5-sonnet
  temperature: number
}

export interface TashihProjectMetadata {
  id: string
  title: string
  domainPreset: DomainPreset
  createdAt: string
  updatedAt: string
  leadEditor: string
  masterPdf: {
    fileName: string
    filePath?: string
    fileSize?: number
    pageCount?: number
  }
  vendors: VendorFileEntry[]
  aiSettings: SumopodAiSettings
}
