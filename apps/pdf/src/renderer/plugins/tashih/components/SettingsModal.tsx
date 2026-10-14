import React, { useState } from 'react'
import type { SumopodAiSettings } from '../types'
import { saveAiSettings } from '../tashihStore'
import { FluentSettings, FluentDismiss } from '../TashihFluentIcons'

interface Props {
  settings: SumopodAiSettings
  isOpen: boolean
  onClose: () => void
  onSave: (newSettings: SumopodAiSettings) => void
}

export function SettingsModal({ settings, isOpen, onClose, onSave }: Props) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl || 'https://api.sumopod.com/v1')
  const [apiKey, setApiKey] = useState(settings.apiKey || '')
  const [modelName, setModelName] = useState(settings.modelName || 'gpt-4o')
  const [temperature, setTemperature] = useState(settings.temperature ?? 0.2)

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const updated: SumopodAiSettings = {
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      modelName: modelName.trim(),
      temperature,
    }
    saveAiSettings(updated)
    onSave(updated)
    onClose()
  }

  return (
    <div className="tashih-modal-backdrop" onClick={onClose}>
      <div
        className="tashih-modal-dialog"
        style={{ width: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FluentSettings size={18} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Pengaturan AI Vision (Sumopod / OpenAI API)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
            }}
          >
            <FluentDismiss size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Base URL Endpoint (OpenAI-compatible)
            </label>
            <input
              type="text"
              required
              placeholder="https://api.sumopod.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '8px 10px',
                borderRadius: 'var(--radius-6, 4px)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
              Mendukung endpoint Sumopod atau penyedia AI multimodal kompatibel OpenAI.
            </span>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              API Key (Sumopod)
            </label>
            <input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '8px 10px',
                borderRadius: 'var(--radius-6, 4px)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
              Kunci API disimpan secara aman di komputer lokal (localStorage).
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Model Multimodal
              </label>
              <input
                type="text"
                placeholder="gpt-4o"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-6, 4px)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Temperature ({temperature})
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="tashih-slider"
                style={{ width: '100%', marginTop: '12px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-6, 4px)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-6, 4px)',
                border: 'none',
                background: 'var(--accent, #c43e1c)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
