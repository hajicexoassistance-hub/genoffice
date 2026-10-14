import React from 'react'

/**
 * Tashih Plugin Icon — Simbol Resmi Mushaf & Verifikasi Pentashihan berstandar Fluent UI
 */
export function TashihIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      aria-hidden
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      {/* Fluent Book Open */}
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      {/* Fluent Verification Tick */}
      <path d="m14.5 8.5 2 2 4.5-4.5" strokeWidth={1.8} />
    </svg>
  )
}
