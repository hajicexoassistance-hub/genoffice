import React from 'react'

export interface FluentIconProps {
  size?: number
  color?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Standard Fluent Icon SVG Wrapper
 * Mengikuti spesifikasi Fluent System Icons (24x24 viewBox, stroke width 1.5, stroke-linecap/join round)
 */
function FluentSvg({
  size = 20,
  color = 'currentColor',
  className,
  style,
  children,
}: FluentIconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Fluent: Folder (Proyek) */
export function FluentFolder(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M20 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </FluentSvg>
  )
}

/** Fluent: Book / Kitab / Naskah (Domain Preset) */
export function FluentBook(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z" />
      <path d="M6 6h10" />
      <path d="M6 10h10" />
      <path d="M6 14h6" />
    </FluentSvg>
  )
}

/** Fluent: Checkmark (Sah / Lolos) */
export function FluentCheckmark(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M20 6 9 17l-5-5" strokeWidth={2} />
    </FluentSvg>
  )
}

/** Fluent: Dismiss / Cross / Batal */
export function FluentDismiss(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M18 6 6 18M6 6l12 12" strokeWidth={1.75} />
    </FluentSvg>
  )
}

/** Fluent: Warning (Perlu Revisi / Cacat Cetak) */
export function FluentWarning(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4M12 17h.01" strokeWidth={2} />
    </FluentSvg>
  )
}

/** Fluent: Error Circle (Kritis / Reprint) */
export function FluentErrorCircle(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v5M12 16h.01" strokeWidth={2} />
    </FluentSvg>
  )
}

/** Fluent: Chevron Left */
export function FluentChevronLeft(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="m15 18-6-6 6-6" strokeWidth={1.75} />
    </FluentSvg>
  )
}

/** Fluent: Chevron Right */
export function FluentChevronRight(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="m9 18 6-6-6-6" strokeWidth={1.75} />
    </FluentSvg>
  )
}

/** Fluent: Split Screen / Dual View (Mode Teliti / Workbench) */
export function FluentSplitScreen(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M12 3v18" />
    </FluentSvg>
  )
}

/** Fluent: Sparkle / AI Vision */
export function FluentSparkle(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
    </FluentSvg>
  )
}

/** Fluent: Lightning / Pixel Diff */
export function FluentFlash(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
    </FluentSvg>
  )
}

/** Fluent: Document Table / Surat Perintah Revisi */
export function FluentDocumentTable(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
    </FluentSvg>
  )
}

/** Fluent: Layers / Onion-Skin Overlay */
export function FluentLayers(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="m12 2 9 4.5-9 4.5-9-4.5L12 2Z" />
      <path d="m3 12 9 4.5 9-4.5" />
      <path d="m3 16.5 9 4.5 9-4.5" />
    </FluentSvg>
  )
}

/** Fluent: Arrow Rotate Clockwise / Deskew */
export function FluentRotate(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" />
      <path d="M21 3v5h-5" />
    </FluentSvg>
  )
}

/** Fluent: Settings / Pengaturan */
export function FluentSettings(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </FluentSvg>
  )
}

/** Fluent: Add / Plus */
export function FluentAdd(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M12 5v14M5 12h14" strokeWidth={1.75} />
    </FluentSvg>
  )
}

/** Fluent: Delete / Trash */
export function FluentDelete(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </FluentSvg>
  )
}

/** Fluent: Print */
export function FluentPrint(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </FluentSvg>
  )
}

/** Fluent: Download / Export */
export function FluentDownload(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </FluentSvg>
  )
}

/** Fluent: Arrow Back / Return */
export function FluentArrowLeft(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth={1.75} />
    </FluentSvg>
  )
}

/** Fluent: Zoom In (+) */
export function FluentZoomIn(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
      <path d="M11 8v6M8 11h6" />
    </FluentSvg>
  )
}

/** Fluent: Zoom Out (-) */
export function FluentZoomOut(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
      <path d="M8 11h6" />
    </FluentSvg>
  )
}

/** Fluent: Zoom Fit / Maximize */
export function FluentZoomFit(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </FluentSvg>
  )
}

/** Fluent: Link / Chain (Relasi Posisi Master & Scan) */
export function FluentLink(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </FluentSvg>
  )
}

/** Fluent: Target / Crosshair (Tandai Beda Tempat) */
export function FluentTarget(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </FluentSvg>
  )
}

/** Fluent: Unlink / Putus Relasi Koordinat */
export function FluentUnlink(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="m18.84 12.25 1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="m5.16 11.75-1.72 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      <line x1="2" y1="2" x2="22" y2="22" strokeWidth={1.75} />
    </FluentSvg>
  )
}

/** Fluent: Broom / Sapu (Bersihkan Halaman) */
export function FluentBroom(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="m14 3 7 7-3 3-7-7 3-3z" />
      <path d="M12 7 4 15l-1 6 6-1 8-8" />
      <path d="m5 17 2 2" />
    </FluentSvg>
  )
}

/** Fluent: Document PDF */
export function FluentDocumentPdf(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13v4" />
      <path d="M9 13h2a1.5 1.5 0 0 1 0 3H9" />
    </FluentSvg>
  )
}

/** Fluent: Upload / Arrow Upload */
export function FluentArrowUpload(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </FluentSvg>
  )
}

/** Fluent: History / Recent Clock */
export function FluentHistory(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 3" />
    </FluentSvg>
  )
}

/** Fluent: Eye / Preview */
export function FluentEye(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </FluentSvg>
  )
}

/** Fluent: Info */
export function FluentInfo(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" strokeWidth={2} />
    </FluentSvg>
  )
}

/** Fluent: Hand / Pan Tool */
export function FluentHand(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M18 11V6a2 2 0 0 0-4 0v5" />
      <path d="M14 10V4a2 2 0 0 0-4 0v7" />
      <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
      <path d="M6 14v1a7 7 0 0 0 14 0v-5a2 2 0 0 0-4 0" />
    </FluentSvg>
  )
}

/** Fluent: Select Square / Marker Box Tool */
export function FluentSelectSquare(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M3 8V5a2 2 0 0 1 2-2h3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <rect x="7" y="7" width="10" height="10" rx="1" strokeDasharray="2 2" />
    </FluentSvg>
  )
}

/** Fluent: Save / Simpan */
export function FluentSave(props: FluentIconProps) {
  return (
    <FluentSvg {...props}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </FluentSvg>
  )
}

