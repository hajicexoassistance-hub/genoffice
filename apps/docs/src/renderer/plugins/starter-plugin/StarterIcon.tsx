import React from 'react'

/** Starter Plugin — Icon (Add-in / Puzzle mark) */
export function StarterIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      aria-hidden
    >
      <path d="M19.439 7.85c0-1.574-1.277-2.85-2.85-2.85h-1.738a2.5 2.5 0 0 1-4.702 0H8.411a2.85 2.85 0 0 0-2.85 2.85v1.738a2.5 2.5 0 0 1 0 4.702v1.738a2.85 2.85 0 0 0 2.85 2.85h1.738a2.5 2.5 0 0 0 4.702 0h1.738a2.85 2.85 0 0 0 2.85-2.85v-1.738a2.5 2.5 0 0 0 0-4.702V7.85Z" />
    </svg>
  )
}

