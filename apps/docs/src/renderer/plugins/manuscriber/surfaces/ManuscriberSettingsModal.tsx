import React, { useState } from 'react'
import type { DocxPluginContext } from '../../types'
import { useManuscriberPluginStore } from '../store/manuscriberPluginStore'
import { PROMPT_PRESETS } from '../services/visionService'
import type { VisionProviderConfig } from '../types'
import { IconSettings, IconDismiss } from '../components/icons/ManuscriberIcons'

interface ManuscriberSettingsModalProps {
  context: DocxPluginContext
  initialPayload: unknown
  onClose: () => void
}

export const ManuscriberSettingsModal: React.FC<ManuscriberSettingsModalProps> = ({
  context,
  onClose,
}) => {
  const store = useManuscriberPluginStore()
  const [config, setConfig] = useState<VisionProviderConfig>({ ...store.visionConfig })
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  })

  const handleChange = (field: keyof VisionProviderConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    store.setVisionConfig(config)
    context.ui.showToast('Pengaturan AI Vision berhasil disimpan', 'success')
    onClose()
  }

  const handleTestConnection = async () => {
    setTestResult({ status: 'testing', message: 'Menguji koneksi ke endpoint...' })
    try {
      const url = `${config.baseUrl.replace(/\/$/, '')}/models`
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      setTestResult({ status: 'success', message: 'Koneksi berhasil! Endpoint merespons dengan baik.' })
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: `Koneksi gagal: ${err?.message || 'Pastikan API Key dan URL benar'}`,
      })
    }
  }

  return (
    <div className="manuscriber-modal-backdrop" onClick={onClose}>
      <div className="manuscriber-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="manuscriber-modal-header">
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <IconSettings size={17} />
            <span>Konfigurasi AI Vision Manuscriber</span>
          </h3>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            title="Tutup dialog"
          >
            <IconDismiss size={14} />
          </button>
        </div>

        <div className="manuscriber-modal-body">
          {/* Provider Presets */}
          <div className="form-group">
            <label>Penyedia AI Vision:</label>
            <select
              value={config.provider}
              onChange={(e) => {
                const prov = e.target.value as any
                let defaultUrl = 'https://ai.sumopod.com/v1'
                let defaultModel = 'google/gemini-2.5-flash'

                if (prov === 'openrouter') {
                  defaultUrl = 'https://openrouter.ai/api/v1'
                  defaultModel = 'google/gemini-2.5-flash'
                } else if (prov === 'ollama') {
                  defaultUrl = 'http://localhost:11434/v1'
                  defaultModel = 'llava'
                }

                setConfig((prev) => ({
                  ...prev,
                  provider: prov,
                  baseUrl: defaultUrl,
                  model: defaultModel,
                }))
              }}
            >
              <option value="sumopod">SumoPod AI (KIE AI / OpenAI Compatible)</option>
              <option value="openrouter">OpenRouter API</option>
              <option value="ollama">Ollama (Lokal / Offline)</option>
              <option value="custom">Kustom OpenAI Endpoint</option>
            </select>
          </div>

          {/* Base URL */}
          <div className="form-group">
            <label>Base URL Endpoint:</label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => handleChange('baseUrl', e.target.value)}
              placeholder="https://ai.sumopod.com/v1"
            />
            <span className="form-hint">URL endpoint OpenAI-compatible (harus berakhiran /v1)</span>
          </div>

          {/* API Key */}
          <div className="form-group">
            <label>API Key:</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              placeholder="Masukkan API Key (sk-...)"
            />
          </div>

          {/* Model Name */}
          <div className="form-group">
            <label>Nama Model AI:</label>
            <input
              type="text"
              value={config.model}
              onChange={(e) => handleChange('model', e.target.value)}
              placeholder="google/gemini-2.5-flash"
            />
          </div>

          {/* Prompt Preset */}
          <div className="form-group">
            <label>Preset Prompt Kitab:</label>
            <select
              value={config.promptPreset}
              onChange={(e) => handleChange('promptPreset', e.target.value)}
            >
              {Object.entries(PROMPT_PRESETS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.title ?? (item as any).name} — {item.description}
                </option>
              ))}
            </select>
          </div>

          {/* Test Connection Button */}
          <div className="test-connection-row">
            <button
              type="button"
              className="btn-test-conn"
              onClick={handleTestConnection}
              disabled={testResult.status === 'testing'}
            >
              {testResult.status === 'testing' ? 'Menguji...' : '🔍 Uji Sambungan API'}
            </button>
            {testResult.message && (
              <span className={`test-result-text ${testResult.status}`}>
                {testResult.message}
              </span>
            )}
          </div>
        </div>

        <div className="manuscriber-modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn-modal-save" onClick={handleSave}>
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  )
}
