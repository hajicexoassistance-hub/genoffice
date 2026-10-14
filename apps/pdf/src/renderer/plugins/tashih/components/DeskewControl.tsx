import React from 'react'
import { FluentRotate } from '../TashihFluentIcons'

interface Props {
  rotationDegree: number
  onChange: (deg: number) => void
  onReset: () => void
  disabled?: boolean
}

export function DeskewControl({ rotationDegree, onChange, onReset, disabled }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '3px 8px',
        background: 'var(--surface-subtle)',
        borderRadius: 'var(--radius-6, 4px)',
        border: '1px solid var(--border)',
        fontSize: '11px',
      }}
    >
      <div
        className="tashih-slider-wrap"
        title="Rotasi mikro untuk meluruskan kemiringan kertas scan percetakan (step 0.1°)"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
          <FluentRotate size={13} />
          <span style={{ fontWeight: 600 }}>Deskew:</span>
        </div>
        <input
          type="range"
          min={-5}
          max={5}
          step={0.1}
          value={rotationDegree}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="tashih-slider"
        />
        <span
          style={{
            minWidth: '40px',
            fontFamily: 'monospace',
            fontWeight: 600,
            color: rotationDegree !== 0 ? 'var(--accent, #c43e1c)' : 'var(--text-primary)',
          }}
        >
          {rotationDegree > 0 ? `+${rotationDegree.toFixed(1)}°` : `${rotationDegree.toFixed(1)}°`}
        </span>
      </div>

      <button
        type="button"
        disabled={disabled || rotationDegree === 0}
        onClick={onReset}
        style={{
          padding: '2px 6px',
          borderRadius: 'var(--radius-6, 4px)',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text-secondary)',
          cursor: rotationDegree !== 0 ? 'pointer' : 'default',
          fontSize: '10px',
        }}
        title="Kembalikan sudut rotasi ke 0°"
      >
        Reset
      </button>
    </div>
  )
}
