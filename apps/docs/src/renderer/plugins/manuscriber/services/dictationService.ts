/**
 * Manuscriber Plugin — Dictation Service
 * Mendukung Dikte Ganda:
 * 1. Web Speech API bawaan browser (cepat, gratis, streaming real-time).
 * 2. Whisper Turbo dari Groq (model whisper-large-v3-turbo, akurasi tinggi harakat/Turats).
 */
import type { DictationConfig } from '../types'

export const DEFAULT_DICTATION_CONFIG: DictationConfig = {
  engine: 'webspeech',
  lang: 'ar-SA',
  groqApiKey: '',
  groqModel: 'whisper-large-v3-turbo',
  turatsVocabularyPrompt: 'قال المصنف رحمه الله تعالى ونفعنا بعلومe في الدارين آمين',
}

const STORAGE_KEY = 'manuscriber.dictation.config'

export function getDictationConfig(): DictationConfig {
  let cfg = { ...DEFAULT_DICTATION_CONFIG }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (raw) {
      cfg = { ...cfg, ...JSON.parse(raw) }
    }
  } catch {}
  return cfg
}

export function saveDictationConfig(patch: Partial<DictationConfig>): DictationConfig {
  const current = getDictationConfig()
  const next = { ...current, ...patch }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  } catch {}
  return next
}

export class DictationService {
  private config: DictationConfig = getDictationConfig()
  private recognition: any = null
  private listening = false
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private mediaStream: MediaStream | null = null

  private targetElement: HTMLTextAreaElement | HTMLInputElement | null = null
  private onResultCallback: ((text: string) => void) | null = null
  private onStateChangeCallback: ((isListening: boolean) => void) | null = null
  private onErrorCallback: ((err: any) => void) | null = null

  constructor() {
    this.initWebSpeech()
  }

  private initWebSpeech() {
    if (typeof window === 'undefined') return
    const SpeechClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechClass) return

    try {
      this.recognition = new SpeechClass()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = this.config.lang || 'ar-SA'

      this.recognition.onstart = () => {
        this.listening = true
        this.onStateChangeCallback?.(true)
      }

      this.recognition.onend = () => {
        this.listening = false
        this.onStateChangeCallback?.(false)
      }

      this.recognition.onerror = (e: any) => {
        this.listening = false
        this.onStateChangeCallback?.(false)
        this.onErrorCallback?.(e)
      }

      this.recognition.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }

        if (finalTranscript) {
          this.deliverTranscript(finalTranscript)
        }
      }
    } catch (err) {
      console.warn('[Dictation] Web Speech not available:', err)
    }
  }

  private deliverTranscript(text: string) {
    const cleaned = text.trim()
    if (!cleaned) return

    if (this.onResultCallback) {
      this.onResultCallback(cleaned)
    } else if (this.targetElement) {
      const start = this.targetElement.selectionStart ?? this.targetElement.value.length
      const end = this.targetElement.selectionEnd ?? this.targetElement.value.length
      const prev = this.targetElement.value
      const next = prev.slice(0, start) + ' ' + cleaned + prev.slice(end)
      this.targetElement.value = next
      this.targetElement.selectionStart = start + cleaned.length + 1
      this.targetElement.selectionEnd = start + cleaned.length + 1
      this.targetElement.dispatchEvent(new Event('input', { bubbles: true }))
      this.targetElement.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  public setConfig(patch: Partial<DictationConfig>): DictationConfig {
    this.config = saveDictationConfig(patch)
    if (this.recognition && patch.lang) {
      this.recognition.lang = patch.lang
    }
    return this.config
  }

  public getConfig(): DictationConfig {
    return this.config
  }

  public setTargetElement(el: HTMLTextAreaElement | HTMLInputElement | null) {
    this.targetElement = el
  }

  public setLanguage(lang: 'ar-SA' | 'id-ID' | 'en-US') {
    this.setConfig({ lang })
  }

  public onResult(cb: (text: string) => void) {
    this.onResultCallback = cb
  }

  public onStateChange(cb: (isListening: boolean) => void) {
    this.onStateChangeCallback = cb
  }

  public onError(cb: (err: any) => void) {
    this.onErrorCallback = cb
  }

  public isListening(): boolean {
    return this.listening
  }

  /**
   * Mulai Dikte Suara sesuai engine yang dipilih
   */
  public async start(): Promise<void> {
    if (this.listening) return
    this.config = getDictationConfig()

    // 1. Engine: Whisper Turbo dari Groq
    if (this.config.engine === 'groq-whisper' && this.config.groqApiKey) {
      await this.startGroqRecorder()
      return
    }

    // 2. Engine: Web Speech API Bawaan (Default / Fallback)
    if (this.recognition) {
      try {
        this.recognition.lang = this.config.lang || 'ar-SA'
        this.recognition.start()
      } catch (err) {
        console.warn('Web Speech start error:', err)
      }
    } else {
      // Fallback ke Groq jika Web Speech tidak ada dan ada API key
      if (this.config.groqApiKey) {
        await this.startGroqRecorder()
      } else {
        throw new Error('Web Speech API tidak didukung di browser ini. Silakan masukkan Groq API Key di Pengaturan.')
      }
    }
  }

  /**
   * Berhenti merekam / mendengarkan
   */
  public async stop(): Promise<void> {
    if (!this.listening) return

    // Hentikan Groq Recorder jika aktif
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
      return
    }

    // Hentikan Web Speech
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch {}
    }
  }

  public toggle(): void {
    if (this.listening) void this.stop()
    else void this.start()
  }

  public startListening(opts?: {
    onTranscript?: (newText: string) => void
    onError?: (err: any) => void
    onEnd?: () => void
  }): boolean {
    if (opts?.onTranscript) this.onResult(opts.onTranscript)
    if (opts?.onError) this.onError(opts.onError)
    void this.start().catch((err) => opts?.onError?.(err))
    return true
  }

  public stopListening(): void {
    void this.stop()
  }

  // ==========================================
  // Implementasi Groq Whisper Turbo Audio
  // ==========================================
  private async startGroqRecorder(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Perekaman audio mikrofon tidak didukung pada lingkungan ini.')
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      this.audioChunks = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType })

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data)
        }
      }

      this.mediaRecorder.onstart = () => {
        this.listening = true
        this.onStateChangeCallback?.(true)
      }

      this.mediaRecorder.onstop = async () => {
        this.listening = false
        this.onStateChangeCallback?.(false)

        // Hentikan mic stream
        this.mediaStream?.getTracks().forEach((track) => track.stop())
        this.mediaStream = null

        const audioBlob = new Blob(this.audioChunks, { type: mimeType })
        this.audioChunks = []

        if (audioBlob.size > 1000) {
          try {
            await this.transcribeWithGroq(audioBlob)
          } catch (err: any) {
            console.error('Groq Whisper Turbo failed:', err)
            this.onErrorCallback?.(err)
          }
        }
      }

      this.mediaRecorder.start(250) // Chunk tiap 250ms
    } catch (err: any) {
      this.listening = false
      this.onStateChangeCallback?.(false)
      throw new Error(`Gagal mengakses mikrofon: ${err?.message || err}`)
    }
  }

  private async transcribeWithGroq(audioBlob: Blob): Promise<void> {
    const apiKey = this.config.groqApiKey?.trim()
    if (!apiKey) throw new Error('Groq API Key belum diisi.')

    const formData = new FormData()
    formData.append('file', audioBlob, 'speech.webm')
    formData.append('model', this.config.groqModel || 'whisper-large-v3-turbo')
    formData.append('response_format', 'json')
    formData.append('temperature', '0')

    const langCode = this.config.lang === 'id-ID' ? 'id' : 'ar'
    formData.append('language', langCode)

    if (this.config.turatsVocabularyPrompt) {
      formData.append('prompt', this.config.turatsVocabularyPrompt)
    }

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Groq Whisper (${res.status}): ${errText.slice(0, 200)}`)
    }

    const data = (await res.json()) as { text?: string }
    if (data.text) {
      this.deliverTranscript(data.text)
    }
  }
}

export const dictationService = new DictationService()
