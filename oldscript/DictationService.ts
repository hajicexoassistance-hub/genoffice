/**
 * DictationService.ts
 * Layanan Voice Typing Bahasa Arab Offline menggunakan engine whisper.cpp lokal.
 * Merekam audio 16kHz WAV in-memory dan menyisipkan hasil transkripsi
 * langsung ke TipTap Editor aktif atau elemen input yang sedang fokus.
 */

import { manuscriberStagingStore, type SpeechLanguage } from './ManuscriberStagingStore'
import { showToast } from '../components/toast-bus'
import { AudioRecorder16k } from '../services/AudioRecorder16k'
import type { Editor } from '@tiptap/react'
import type { ModelTier } from '../components/WhisperModelModal'

export type DictationState = 'idle' | 'starting' | 'listening' | 'transcribing' | 'stopping' | 'stopped' | 'error'

export interface DictationConfig {
  lang: SpeechLanguage
}

export class DictationService {
  private static instance: DictationService | null = null

  private state: DictationState = 'idle'
  private activeEditor: Editor | null = null
  private lastFocusedElement: HTMLElement | null = null
  private listeners: Set<(state: DictationState) => void> = new Set()
  private recorder: AudioRecorder16k = new AudioRecorder16k()
  private selectedModelTier: ModelTier = (localStorage.getItem('whisper_selected_model') as ModelTier) || 'small'

  private config: DictationConfig = {
    lang: 'ar-SA',
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('focusin', (e) => {
        const target = e.target as HTMLElement | null
        if (target && target !== document.body) {
          // Jika fokus di input atau textarea, selalu simpan sebagai target utama
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            this.lastFocusedElement = target
          } else if (target.closest('.ProseMirror')) {
            this.lastFocusedElement = target
          }
        }
      })
    }
  }

  public static getInstance(): DictationService {
    if (!DictationService.instance) {
      DictationService.instance = new DictationService()
    }
    return DictationService.instance
  }

  public setTargetElement(el: HTMLElement | null) {
    if (el) {
      this.lastFocusedElement = el
    }
  }

  public getState(): DictationState {
    return this.state
  }

  public isListening(): boolean {
    return this.state === 'listening' || this.state === 'starting'
  }

  public isProcessing(): boolean {
    return this.state === 'transcribing'
  }

  public getModelTier(): ModelTier {
    return this.selectedModelTier
  }

  public setModelTier(tier: ModelTier): void {
    this.selectedModelTier = tier
    localStorage.setItem('whisper_selected_model', tier)
  }

  public subscribeState(listener: (state: DictationState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  private setState(nextState: DictationState) {
    this.state = nextState
    manuscriberStagingStore.setIsDictating(nextState === 'listening' || nextState === 'starting')
    this.listeners.forEach((fn) => fn(nextState))
  }

  public setActiveEditor(editor: Editor | null) {
    this.activeEditor = editor
  }

  public captureFocus() {
    const active = document.activeElement as HTMLElement | null
    if (active && active !== document.body) {
      this.lastFocusedElement = active
    }
  }

  /**
   * Cek apakah model yang dipilih sudah terpasang di komputer
   */
  public async isModelReady(tier = this.selectedModelTier): Promise<boolean> {
    const desktopApi = (window as any).desktop
    if (!desktopApi?.getWhisperModelsStatus) return false
    try {
      const status = await desktopApi.getWhisperModelsStatus()
      return !!status[tier]?.installed
    } catch {
      return false
    }
  }

  /**
   * Buka modal dialog pemilihan/unduhan model Whisper
   */
  public openModelModal() {
    window.dispatchEvent(new CustomEvent('manuscriber:open-whisper-model-modal'))
  }

  /**
   * Memulai sesi perekaman suara
   */
  public async start(config?: Partial<DictationConfig>): Promise<boolean> {
    if (this.isListening() || this.isProcessing()) return false

    if (config) {
      this.config = { ...this.config, ...config }
    }

    const currentLang = manuscriberStagingStore.getState().speechLanguage || this.config.lang
    this.config.lang = currentLang

    // Pastikan model sudah terunduh sebelum mulai merekam
    const ready = await this.isModelReady(this.selectedModelTier)
    if (!ready) {
      this.openModelModal()
      showToast(`Model Whisper (${this.selectedModelTier}) belum diunduh. Silakan unduh model terlebih dahulu.`, 'warning')
      return false
    }

    this.captureFocus()
    this.setState('starting')

    try {
      await this.recorder.start()
      this.setState('listening')
      showToast('Mendengarkan... Bicaralah dalam Bahasa Arab, lalu klik kembali tombol dikte saat selesai.')
      return true
    } catch (err: any) {
      console.error('[DictationService] Gagal mengakses mikrofon:', err)
      showToast('Gagal mengakses mikrofon: ' + (err?.message || 'Izin mikrofon ditolak'), 'error')
      this.setState('error')
      this.setState('idle')
      return false
    }
  }

  /**
   * Menghentikan perekaman dan mengeksekusi transkripsi whisper
   */
  public async stop(): Promise<void> {
    if (!this.recorder.isRecording && !this.isListening()) return

    this.setState('stopping')
    this.setState('transcribing')
    showToast('Sedang mentranskripsi suara dengan Whisper offline...')

    try {
      const wavBuffer = await this.recorder.stop()
      const desktopApi = (window as any).desktop

      if (!desktopApi?.transcribeAudio) {
        throw new Error('API transcribeAudio tidak tersedia di desktop bridge.')
      }

      // Kirim buffer audio ke Main Process
      const langParam = this.config.lang === 'ar-SA' ? 'ar' : 'ar'
      const res = await desktopApi.transcribeAudio(wavBuffer, this.selectedModelTier, langParam)

      if (res?.success && res.text) {
        this.injectText(res.text)
        showToast('Transkripsi berhasil disisipkan!', 'success')
      } else if (res?.success && !res.text) {
        showToast('Tidak ada ucapan yang terdeteksi.', 'warning')
      } else {
        throw new Error(res?.error || 'Gagal mentranskripsikan audio.')
      }
    } catch (err: any) {
      console.error('[DictationService] Transcribe error:', err)
      showToast('Gagal memproses dikte suara: ' + (err?.message || 'Error tidak diketahui'), 'error')
    } finally {
      this.setState('stopped')
      this.setState('idle')
    }
  }

  /**
   * Toggle mulai / berhenti dikte
   */
  public async toggle(editor?: Editor | null, config?: Partial<DictationConfig>): Promise<boolean> {
    if (editor) {
      this.setActiveEditor(editor)
    }

    if (this.isListening()) {
      await this.stop()
      return false
    } else {
      return this.start(config)
    }
  }

  /**
   * Menyisipkan teks hasil transkripsi secara cerdas:
   * Prioritas 1: Input/Textarea DOM aktif (misalnya baris Staging Line Manuscriber)
   * Prioritas 2: Baris aktif di Manuscriber Staging Store jika panel staging terbuka
   * Prioritas 3: TipTap Docx Editor aktif jika pengguna sedang di editor lembar kerja
   */
  private injectText(text: string) {
    if (!text) return
    const formatted = text.trim() + ' '

    // 1. Cek elemen fokus terakhir atau elemen yang sedang aktif di DOM
    const activeEl = document.activeElement as HTMLElement | null
    const candidateEl = (
      this.lastFocusedElement && document.body.contains(this.lastFocusedElement)
        ? this.lastFocusedElement
        : activeEl
    ) as HTMLInputElement | HTMLTextAreaElement | null

    const isDomInputOrTextarea =
      candidateEl && (candidateEl.tagName === 'INPUT' || candidateEl.tagName === 'TEXTAREA')

    if (isDomInputOrTextarea) {
      try {
        const start = candidateEl.selectionStart ?? candidateEl.value.length
        const end = candidateEl.selectionEnd ?? candidateEl.value.length
        const prev = candidateEl.value
        const nextVal = prev.slice(0, start) + formatted + prev.slice(end)

        // Gunakan setter prototype agar React state change tracker ikut terpicu
        const proto = candidateEl.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
        if (nativeSetter) {
          nativeSetter.call(candidateEl, nextVal)
        } else {
          candidateEl.value = nextVal
        }

        candidateEl.selectionStart = candidateEl.selectionEnd = start + formatted.length
        candidateEl.dispatchEvent(new Event('input', { bubbles: true }))
        candidateEl.dispatchEvent(new Event('change', { bubbles: true }))
        candidateEl.focus()

        // Jika ini adalah baris staging, sinkronkan juga ke ManuscriberStagingStore
        const staging = manuscriberStagingStore.getState()
        if (staging.isOpen && staging.activeLineId) {
          manuscriberStagingStore.updateLineText(staging.activeLineId, candidateEl.value)
        }
        return
      } catch (err) {
        console.warn('[DictationService] Gagal menyisipkan ke DOM input/textarea:', err)
      }
    }

    // 2. Jika panel staging Manuscriber terbuka dan ada baris aktif (misal saat klik mic di Ribbon)
    const staging = manuscriberStagingStore.getState()
    if (staging.isOpen && staging.activeLineId) {
      const activeLine = staging.lines.find((l) => l.id === staging.activeLineId)
      if (activeLine) {
        // Cari textarea aktif di dalam kartu baris staging
        const activeTextarea = document.querySelector(
          `.staging-line-card.active-focus textarea, .staging-line-card textarea`
        ) as HTMLTextAreaElement | null

        if (activeTextarea) {
          const start = activeTextarea.selectionStart ?? activeLine.correctedText.length
          const end = activeTextarea.selectionEnd ?? activeLine.correctedText.length
          const newText = activeLine.correctedText.slice(0, start) + formatted + activeLine.correctedText.slice(end)
          
          activeTextarea.value = newText
          activeTextarea.selectionStart = activeTextarea.selectionEnd = start + formatted.length
          activeTextarea.dispatchEvent(new Event('input', { bubbles: true }))
          activeTextarea.focus()
          manuscriberStagingStore.updateLineText(activeLine.id, newText)
          return
        } else {
          const newText = (activeLine.correctedText ? activeLine.correctedText.trim() + ' ' : '') + formatted
          manuscriberStagingStore.updateLineText(activeLine.id, newText)
          return
        }
      }
    }

    // 3. Fallback: Sisipkan ke TipTap Docx Editor jika pengguna sedang berada di editor dokumen
    if (this.activeEditor && !this.activeEditor.isDestroyed) {
      try {
        if (this.config.lang === 'ar-SA') {
          try {
            this.activeEditor.chain().focus().setTextDirection('rtl').insertContent(formatted).run()
          } catch {
            this.activeEditor.chain().focus().insertContent(formatted).run()
          }
        } else {
          this.activeEditor.chain().focus().insertContent(formatted).run()
        }
        return
      } catch (err) {
        console.warn('[DictationService] TipTap insertContent failed:', err)
      }
    }
  }

  public destroy() {
    this.listeners.clear()
    this.activeEditor = null
    this.lastFocusedElement = null
    if (this.recorder.isRecording) {
      void this.recorder.stop()
    }
  }
}

export const dictationService = DictationService.getInstance()
