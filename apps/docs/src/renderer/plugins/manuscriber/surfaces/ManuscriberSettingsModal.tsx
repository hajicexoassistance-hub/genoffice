import React, { useState, useEffect } from 'react'
import type { DocxPluginContext } from '../../types'
import { useManuscriberPluginStore } from '../store/manuscriberPluginStore'
import { deleteDocumentSession } from '../services/documentSessionStore'
import {
  PROMPT_PRESETS,
  DEFAULT_USER_PROMPT,
  fetchGenOfficeMediaAnalysisInfo,
  subscribeGenOfficeAiSettings,
  type GenOfficeMediaAnalysisInfo,
} from '../services/visionService'
import { getDictationConfig, saveDictationConfig } from '../services/dictationService'
import type { VisionProviderConfig, DictationConfig, PromptPresetItem } from '../types'
import {
  IconSettings,
  IconDismiss,
  IconSoundOn,
  IconSparkles,
  IconManuscript,
  IconRefresh,
  IconDocument,
  IconTrash,
} from '../components/icons/ManuscriberIcons'

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
  const [activeTab, setActiveTab] = useState<'connection' | 'prompt' | 'dictation' | 'session'>('connection')

  // Vision Config State
  const [config, setConfig] = useState<VisionProviderConfig>({
    ...store.visionConfig,
    useGenOfficeSettings: store.visionConfig.useGenOfficeSettings !== false,
    userPrompt: store.visionConfig.userPrompt || DEFAULT_USER_PROMPT,
  })
  const [selectedPreset, setSelectedPreset] = useState<string>(
    config.activePreset || config.promptPreset || 'matanSyarah'
  )
  const [genOfficeInfo, setGenOfficeInfo] = useState<GenOfficeMediaAnalysisInfo | null>(null)
  const [isLoadingGenOffice, setIsLoadingGenOffice] = useState<boolean>(true)
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  })

  // Dictation Config State
  const [dictationCfg, setDictationCfg] = useState<DictationConfig>(getDictationConfig())

  const loadGenOfficeInfo = async () => {
    setIsLoadingGenOffice(true)
    try {
      const info = await fetchGenOfficeMediaAnalysisInfo()
      setGenOfficeInfo(info)
    } finally {
      setIsLoadingGenOffice(false)
    }
  }

  useEffect(() => {
    loadGenOfficeInfo()
    const unsubscribe = subscribeGenOfficeAiSettings(() => {
      loadGenOfficeInfo()
    })
    return () => unsubscribe()
  }, [])

  const handleVisionChange = (field: keyof VisionProviderConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleDictationChange = (field: keyof DictationConfig, value: any) => {
    setDictationCfg((prev: DictationConfig) => ({ ...prev, [field]: value }))
  }

  // Prompt Preset Handlers (diadopsi dari oldscript/PdfViewerPanel.tsx)
  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId)
    const found = PROMPT_PRESETS[presetId]
    if (found) {
      setConfig((c) => ({
        ...c,
        userPrompt: found.prompt,
        activePreset: presetId,
        promptPreset: presetId,
      }))
    }
  }

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setConfig((c) => ({
      ...c,
      userPrompt: val,
      activePreset: 'custom',
      promptPreset: 'custom',
    }))
    setSelectedPreset('custom')
  }

  const handleResetPrompt = () => {
    handleApplyPreset('matanSyarah')
  }

  const handleOpenGenOfficeSettings = () => {
    const desktopApi = (window as any).desktop
    if (desktopApi?.openAiModelSettings) {
      desktopApi.openAiModelSettings()
    } else {
      context.ui.showToast('Gunakan menu Pengaturan > AI Model di jendela utama GenOffice', 'info')
    }
  }

  const handleSave = () => {
    const updatedConfig: VisionProviderConfig = {
      ...config,
      activePreset: selectedPreset,
      promptPreset: selectedPreset,
      userPrompt: config.userPrompt || DEFAULT_USER_PROMPT,
    }
    store.setVisionConfig(updatedConfig)
    saveDictationConfig(dictationCfg)
    context.ui.showToast('Pengaturan Vision AI & Dikte Suara berhasil disimpan', 'success')
    onClose()
  }

  const handleTestVision = async () => {
    setTestResult({ status: 'testing', message: 'Menguji koneksi ke endpoint Vision...' })
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

      setTestResult({ status: 'success', message: 'Koneksi berhasil! Endpoint Vision merespons dengan baik.' })
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
            <span>Pengaturan Manuscriber (Vision AI & Dikte Suara)</span>
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

        {/* 3-Tab Switcher: Penyedia AI, Struktur Prompt, Dikte Suara */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            borderBottom: '1px solid var(--border)',
            padding: '8px 16px 0',
            background: 'var(--surface-subtle, rgba(0,0,0,0.02))',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('connection')}
            style={{
              padding: '7px 14px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'connection' ? '2.5px solid var(--word-blue, #185abd)' : '2.5px solid transparent',
              color: activeTab === 'connection' ? 'var(--word-blue, #185abd)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'connection' ? 700 : 500,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 120ms ease',
            }}
          >
            <IconSparkles size={13} />
            <span>Penyedia Vision AI</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            style={{
              padding: '7px 14px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'prompt' ? '2.5px solid var(--word-blue, #185abd)' : '2.5px solid transparent',
              color: activeTab === 'prompt' ? 'var(--word-blue, #185abd)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'prompt' ? 700 : 500,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 120ms ease',
            }}
          >
            <IconManuscript size={13} />
            <span>Struktur Naskah & Prompt</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dictation')}
            style={{
              padding: '7px 14px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'dictation' ? '2.5px solid var(--word-blue, #185abd)' : '2.5px solid transparent',
              color: activeTab === 'dictation' ? 'var(--word-blue, #185abd)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'dictation' ? 700 : 500,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 120ms ease',
            }}
          >
            <IconSoundOn size={13} />
            <span>Dikte Suara</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('session')}
            style={{
              padding: '7px 14px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'session' ? '2.5px solid var(--word-blue, #185abd)' : '2.5px solid transparent',
              color: activeTab === 'session' ? 'var(--word-blue, #185abd)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'session' ? 700 : 500,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 120ms ease',
            }}
          >
            <IconDocument size={13} />
            <span>Naskah Dokumen</span>
          </button>
        </div>

        <div className="manuscriber-modal-body">
          {/* ─────────────────────────────────────────────────────────────
              TAB 1: Penyedia Vision AI (Koneksi & Model)
             ───────────────────────────────────────────────────────────── */}
          {activeTab === 'connection' && (
            <>
              {/* Mode Selection: GenOffice Settings (Recommended) vs Custom Plugin Config */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginBottom: '14px',
                  padding: '12px',
                  background: 'var(--surface-subtle, rgba(0,0,0,0.02))',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              >
                <label style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconSparkles size={14} />
                  <span>Sumber Penyedia Analisis Gambar (Vision LLM):</span>
                </label>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: config.useGenOfficeSettings !== false ? 600 : 400,
                      color: config.useGenOfficeSettings !== false ? 'var(--word-blue, #185abd)' : 'inherit',
                    }}
                  >
                    <input
                      type="radio"
                      name="visionSource"
                      checked={config.useGenOfficeSettings !== false}
                      onChange={() => handleVisionChange('useGenOfficeSettings', true)}
                    />
                    <span>Gunakan Pengaturan GenOffice (Rekomendasi)</span>
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: config.useGenOfficeSettings === false ? 600 : 400,
                      color: config.useGenOfficeSettings === false ? 'var(--word-blue, #185abd)' : 'inherit',
                    }}
                  >
                    <input
                      type="radio"
                      name="visionSource"
                      checked={config.useGenOfficeSettings === false}
                      onChange={() => handleVisionChange('useGenOfficeSettings', false)}
                    />
                    <span>Kustom Khusus Plugin Manuscriber</span>
                  </label>
                </div>
              </div>

              {config.useGenOfficeSettings !== false ? (
                /* Card info GenOffice AI Media Settings */
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Penyedia Analisis Gambar Aktif di GenOffice:
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
                        {isLoadingGenOffice ? 'Memuat pengaturan...' : genOfficeInfo?.providerLabel || 'Tidak diketahui'}
                      </div>
                    </div>
                    {genOfficeInfo && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: genOfficeInfo.isConfigured ? 'rgba(40, 167, 69, 0.15)' : 'rgba(255, 193, 7, 0.2)',
                          color: genOfficeInfo.isConfigured ? '#28a745' : '#856404',
                          border: `1px solid ${genOfficeInfo.isConfigured ? 'rgba(40, 167, 69, 0.3)' : 'rgba(255, 193, 7, 0.4)'}`,
                        }}
                      >
                        {genOfficeInfo.isConfigured ? '✓ Siap Digunakan' : '⚠ Perlu Konfigurasi'}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    <div><strong>Model Vision:</strong> {genOfficeInfo?.model || 'Bawaan Provider'}</div>
                    <div style={{ marginTop: '3px' }}><strong>Status:</strong> {genOfficeInfo?.statusSummary || 'Mengecek ketersediaan...'}</div>
                    {genOfficeInfo?.description && (
                      <div style={{ marginTop: '3px', fontStyle: 'italic', opacity: 0.85 }}>
                        {genOfficeInfo.description}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn-test-conn"
                      onClick={handleOpenGenOfficeSettings}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      ⚙ Buka Pengaturan AI GenOffice
                    </button>
                    <button
                      type="button"
                      onClick={loadGenOfficeInfo}
                      disabled={isLoadingGenOffice}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {isLoadingGenOffice ? 'Memuat...' : '🔄 Segarkan'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Custom Manual Configuration Form */
                <>
                  {/* Provider Presets */}
                  <div className="form-group">
                    <label>Penyedia AI Vision:</label>
                    <select
                      value={config.provider}
                      onChange={(e) => {
                        const prov = e.target.value as any
                        let defaultUrl = 'https://ai.sumopod.com/v1'
                        let defaultModel = 'google/gemini-2.5-flash'

                        if (prov === 'groq') {
                          defaultUrl = 'https://api.groq.com/openai/v1'
                          defaultModel = 'llama-3.2-11b-vision-preview'
                        } else if (prov === 'openrouter') {
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
                      <option value="sumopod">SumoPod AI (Gemini / OpenAI Compatible)</option>
                      <option value="groq">Groq Vision (Llama-3.2-11b/90b Vision - Ultra Cepat)</option>
                      <option value="openrouter">OpenRouter API</option>
                      <option value="ollama">Ollama (Lokal / Offline)</option>
                      <option value="custom">Kustom OpenAI Endpoint</option>
                    </select>
                  </div>

                  {/* Base URL */}
                  <div className="form-group">
                    <label>Base URL Endpoint Vision:</label>
                    <input
                      type="text"
                      value={config.baseUrl}
                      onChange={(e) => handleVisionChange('baseUrl', e.target.value)}
                      placeholder="https://ai.sumopod.com/v1"
                    />
                    <span className="form-hint">URL endpoint OpenAI-compatible (berakhiran /v1)</span>
                  </div>

                  {/* API Key */}
                  <div className="form-group">
                    <label>API Key Vision:</label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => handleVisionChange('apiKey', e.target.value)}
                      placeholder="Masukkan API Key (sk-... / gsk_...)"
                    />
                  </div>

                  {/* Model Name */}
                  <div className="form-group">
                    <label>Nama Model AI Vision:</label>
                    <input
                      type="text"
                      value={config.model}
                      onChange={(e) => handleVisionChange('model', e.target.value)}
                      placeholder="llama-3.2-11b-vision-preview / google/gemini-2.5-flash"
                    />
                  </div>

                  {/* Test Connection Button */}
                  <div className="test-connection-row">
                    <button
                      type="button"
                      className="btn-test-conn"
                      onClick={handleTestVision}
                      disabled={testResult.status === 'testing'}
                    >
                      {testResult.status === 'testing' ? 'Menguji...' : '🔍 Uji Sambungan Vision API'}
                    </button>
                    {testResult.message && (
                      <span className={`test-result-text ${testResult.status}`}>
                        {testResult.message}
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Informative Link to Prompt Tab */}
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--surface-subtle, rgba(0,0,0,0.02))',
                  border: '1px solid var(--border)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Kaidah & Preset Aktif: </span>
                  <strong style={{ color: 'var(--word-blue, #185abd)' }}>
                    {PROMPT_PRESETS[selectedPreset]?.title || selectedPreset}
                  </strong>
                </div>
                <button
                  type="button"
                  className="btn-reset-prompt"
                  onClick={() => setActiveTab('prompt')}
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                >
                  Edit Prompt Naskah →
                </button>
              </div>
            </>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: Struktur Naskah & Prompt (Adopsi 100% dari Oldscript)
             ───────────────────────────────────────────────────────────── */}
          {activeTab === 'prompt' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Presets Chips Bar */}
              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Pilih Preset Kaidah Naskah:
                </label>
                <div className="vision-presets-bar">
                  {Object.values(PROMPT_PRESETS).map((p: PromptPresetItem) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`preset-chip ${selectedPreset === p.id ? 'active' : ''}`}
                      onClick={() => handleApplyPreset(p.id)}
                      title={p.description}
                    >
                      {p.title || (p as any).name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toolbar: Description & Reset Button */}
              <div className="vision-prompt-toolbar">
                <span>
                  {PROMPT_PRESETS[selectedPreset]?.description || 'Instruksi khusus tahqiq naskah pengguna'}
                </span>
                <button
                  type="button"
                  className="btn-reset-prompt"
                  onClick={handleResetPrompt}
                  title="Kembalikan prompt ke standar default Matan & Syarah"
                >
                  <IconRefresh size={11} />
                  <span>Reset ke Default</span>
                </button>
              </div>

              {/* Editable Prompt Textarea */}
              <div className="form-group">
                <textarea
                  className="vision-prompt-textarea"
                  value={config.userPrompt ?? DEFAULT_USER_PROMPT}
                  onChange={handlePromptChange}
                  placeholder="Ketik instruksi tata letak atau kaidah tahqiq khusus di sini..."
                  rows={9}
                />
              </div>

              {/* System Rules Callout Banner */}
              <div className="vision-system-rules-banner">
                <div>
                  <strong>🛡️ Aturan Spotlight & Bounding Box (Otomatis Dikunci Sistem)</strong>
                </div>
                <div>
                  Format tag <code>[[BLOCK: type=..., bbox=[ymin,xmin,ymax,xmax]]]</code> dan koordinat 0–1000 selalu disematkan otomatis di akhir prompt oleh sistem agar penyorot halaman PDF tetap presisi.
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: Dikte Suara (Speech-to-Text)
             ───────────────────────────────────────────────────────────── */}
          {activeTab === 'dictation' && (
            <>
              {/* Dictation Engine */}
              <div className="form-group">
                <label>Mesin Dikte Suara:</label>
                <select
                  value={dictationCfg.engine}
                  onChange={(e) => handleDictationChange('engine', e.target.value as any)}
                >
                  <option value="webspeech">Web Speech API Bawaan Browser (Gratis, Real-time Streaming)</option>
                  <option value="groq-whisper">Whisper Turbo dari Groq (whisper-large-v3-turbo, Ultra Akurat)</option>
                </select>
                <span className="form-hint">
                  {dictationCfg.engine === 'webspeech'
                    ? 'Memanfaatkan engine suara bawaan peramban (Chrome/Edge). Langsung jalan tanpa perlu API key.'
                    : 'Mengirim rekaman suara ke Groq Cloud API dengan model whisper-large-v3-turbo untuk akurasi tertinggi bahasa Arab & Turats.'}
                </span>
              </div>

              {/* Groq API Key if Groq is selected */}
              {dictationCfg.engine === 'groq-whisper' && (
                <>
                  <div className="form-group">
                    <label>Groq API Key:</label>
                    <input
                      type="password"
                      value={dictationCfg.groqApiKey || ''}
                      onChange={(e) => handleDictationChange('groqApiKey', e.target.value)}
                      placeholder="gsk_..."
                    />
                    <span className="form-hint">Dapatkan API Key gratis di console.groq.com</span>
                  </div>

                  <div className="form-group">
                    <label>Model Whisper Groq:</label>
                    <input
                      type="text"
                      value={dictationCfg.groqModel || 'whisper-large-v3-turbo'}
                      onChange={(e) => handleDictationChange('groqModel', e.target.value)}
                      placeholder="whisper-large-v3-turbo"
                    />
                  </div>

                  <div className="form-group">
                    <label>Prompt Kosakata Khusus Turats / Istilah:</label>
                    <input
                      type="text"
                      value={dictationCfg.turatsVocabularyPrompt || ''}
                      onChange={(e) => handleDictationChange('turatsVocabularyPrompt', e.target.value)}
                      placeholder="قال المصنف رحمه الله ونفعنا بعلومه في الدارين آمين"
                    />
                    <span className="form-hint">Kamus petunjuk awal agar Whisper mengenali istilah kitab & nahwu</span>
                  </div>
                </>
              )}

              {/* Language Selector */}
              <div className="form-group">
                <label>Bahasa Dikte Utama:</label>
                <select
                  value={dictationCfg.lang}
                  onChange={(e) => handleDictationChange('lang', e.target.value as any)}
                >
                  <option value="ar-SA">Bahasa Arab (العربية - ar-SA)</option>
                  <option value="id-ID">Bahasa Indonesia (id-ID)</option>
                  <option value="en-US">Bahasa Inggris (en-US)</option>
                </select>
              </div>
            </>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 4: Naskah Dokumen & Penyimpanan Otomatis (IndexedDB)
             ───────────────────────────────────────────────────────────── */}
          {activeTab === 'session' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: 'var(--surface-active, rgba(0,0,0,0.03))',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Penyimpanan Naskah Otomatis Terikat Dokumen Word
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Setiap dokumen Word (.docx) secara otomatis menyimpan berkas PDF naskah, halaman aktif,
                  posisi zoom, dan seluruh baris transkripsi tashih secara terpusat di basis data lokal aplikasi.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label>Dokumen Word Aktif:</label>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', wordBreak: 'break-all' }}>
                    {context.doc?.filePath || `Dokumen Baru (ID Sementara: ${store.activeDocKey || 'Draft'})`}
                  </div>
                </div>

                <div className="form-group">
                  <label>Naskah PDF Acuan:</label>
                  <div style={{ fontSize: '12px', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                    {store.pdfFileName ? (
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        📄 {store.pdfFileName} (Halaman {store.currentPage} dari {store.totalPages || 1})
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Belum ada PDF yang dimuat pada dokumen Word ini.</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Jumlah Baris Tashih:</label>
                    <div style={{ fontSize: '12px', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                      {store.lines.length} baris ({store.lines.filter((l) => l.status === 'verified').length} terverifikasi)
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Terakhir Disimpan Otomatis:</label>
                    <div style={{ fontSize: '12px', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                      {store.lastSavedTimestamp ? new Date(store.lastSavedTimestamp).toLocaleTimeString() : 'Belum disimpan'}
                    </div>
                  </div>
                </div>

                {store.pdfFileName && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      Ingin menghapus riwayat naskah untuk dokumen Word ini?
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Hapus seluruh riwayat naskah dan baris tashih untuk dokumen ini? Data di IndexedDB akan dihapus.')) {
                          return
                        }
                        if (store.activeDocKey) {
                          await deleteDocumentSession(store.activeDocKey)
                        }
                        store.resetProjectData()
                        context.ui.showToast('Riwayat naskah dokumen ini berhasil dihapus.', 'info')
                        onClose()
                      }}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid var(--danger, #dc3545)',
                        color: 'var(--danger, #dc3545)',
                        borderRadius: '4px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <IconTrash size={12} />
                      <span>Hapus Naskah Dokumen Ini</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
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
