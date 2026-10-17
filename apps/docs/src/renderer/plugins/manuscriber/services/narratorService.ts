/**
 * Narrator Service (Text-to-Speech) — Manuscriber Plugin
 * Mendukung pembacaan suara baris naskah turats Arab & Latin secara presisi
 * dengan penyorotan kata aktif (word boundary tracking) dan kontrol Play/Pause/Stop.
 */

import { manuscriberPluginStore } from '../store/manuscriberPluginStore'

export interface NarratorOptions {
  lang?: string
  rate?: number
  onStart?: () => void
  onPause?: () => void
  onResume?: () => void
  onEnd?: () => void
  onError?: (err?: any) => void
  onBoundary?: (wordIdx: number, charIndex: number) => void
}

class NarratorService {
  private currentAudio: HTMLAudioElement | null = null
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private activeLineId: string | null = null
  private activeWords: string[] = []
  private options: NarratorOptions = {}

  /**
   * Cek apakah teks mengandung aksara Arab atau Pegon
   */
  public isArabicOrPegon(text: string): boolean {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
  }

  /**
   * Dapatkan bahasa default berdasarkan karakter teks
   */
  public detectLanguage(text: string): string {
    return this.isArabicOrPegon(text) ? 'ar-SA' : 'id-ID'
  }

  /**
   * Mainkan pembacaan teks untuk baris naskah tertentu
   */
  public speak(lineId: string, text: string, options: NarratorOptions = {}) {
    if (typeof window === 'undefined') return
    const textToRead = text.trim()
    if (!textToRead) return

    // Jika sedang di-pause pada baris yang sama, lanjutkan (resume)
    const store = manuscriberPluginStore.getState()
    if (this.activeLineId === lineId && store.speechStatus === 'paused') {
      this.resume()
      return
    }

    // Hentikan pembacaan sebelumnya
    this.stop()

    this.activeLineId = lineId
    this.options = options
    this.activeWords = textToRead.split(/\s+/).filter(Boolean)
    const speechLang = options.lang || this.detectLanguage(textToRead)
    const rate = options.rate ?? 0.85

    // Update store state
    manuscriberPluginStore.getState().setSpeakingState(lineId, 'playing')
    this.options.onStart?.()

    // 1. PRIMARY: Native Windows WinRT TTS jika di lingkungan desktop
    const desktopApi = (window as any).desktop
    if (desktopApi?.winTtsSynthesize) {
      desktopApi
        .winTtsSynthesize({ text: textToRead, lang: speechLang, rate })
        .then((res: { ok: boolean; audioUrl?: string; error?: string }) => {
          if (res.ok && res.audioUrl) {
            const audio = new Audio(res.audioUrl)
            this.currentAudio = audio

            audio.ontimeupdate = () => {
              if (!audio.duration || audio.duration <= 0) return
              const progress = audio.currentTime / audio.duration
              const idx = Math.min(this.activeWords.length - 1, Math.floor(progress * this.activeWords.length))
              this.options.onBoundary?.(idx, Math.floor(progress * textToRead.length))
            }

            audio.onended = () => {
              this.handleEnd()
            }

            audio.onerror = (e) => {
              console.warn('Native WinRT TTS audio playback error, falling back to Web Speech:', e)
              this.currentAudio = null
              this.speakWithWebSpeech(lineId, textToRead, speechLang, rate)
            }

            audio.onpause = () => {
              if (this.activeLineId === lineId) {
                manuscriberPluginStore.getState().setSpeakingState(lineId, 'paused')
                this.options.onPause?.()
              }
            }

            audio.onplay = () => {
              if (this.activeLineId === lineId) {
                manuscriberPluginStore.getState().setSpeakingState(lineId, 'playing')
                this.options.onResume?.()
              }
            }

            void audio.play().catch(() => {
              this.speakWithWebSpeech(lineId, textToRead, speechLang, rate)
            })
            return
          }
          this.speakWithWebSpeech(lineId, textToRead, speechLang, rate)
        })
        .catch(() => {
          this.speakWithWebSpeech(lineId, textToRead, speechLang, rate)
        })
      return
    }

    // 2. STANDARD: Web Speech API (Browser & Chromium built-in)
    this.speakWithWebSpeech(lineId, textToRead, speechLang, rate)
  }

  /**
   * Menggunakan Web Speech API built-in
   */
  private speakWithWebSpeech(lineId: string, textToRead: string, lang: string, rate: number) {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis API tidak didukung pada browser ini.')
      this.handleEnd()
      return
    }

    try {
      window.speechSynthesis.cancel()

      const utter = new SpeechSynthesisUtterance(textToRead)
      this.currentUtterance = utter
      utter.lang = lang
      utter.rate = rate

      // Cari suara yang cocok dengan bahasa target
      const voices = window.speechSynthesis.getVoices()
      const matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)))
      if (matchedVoice) {
        utter.voice = matchedVoice
      }

      utter.onstart = () => {
        if (this.activeLineId === lineId) {
          manuscriberPluginStore.getState().setSpeakingState(lineId, 'playing')
          this.options.onStart?.()
        }
      }

      utter.onboundary = (e) => {
        if (this.activeLineId === lineId) {
          const upToNow = textToRead.slice(0, e.charIndex)
          const wordCount = upToNow.trim() ? upToNow.trim().split(/\s+/).length : 0
          const activeIdx = Math.min(this.activeWords.length - 1, wordCount)
          this.options.onBoundary?.(activeIdx, e.charIndex)
        }
      }

      utter.onpause = () => {
        if (this.activeLineId === lineId) {
          manuscriberPluginStore.getState().setSpeakingState(lineId, 'paused')
          this.options.onPause?.()
        }
      }

      utter.onresume = () => {
        if (this.activeLineId === lineId) {
          manuscriberPluginStore.getState().setSpeakingState(lineId, 'playing')
          this.options.onResume?.()
        }
      }

      utter.onend = () => {
        this.handleEnd()
      }

      utter.onerror = (err) => {
        // Abaikan cancel error saat berganti baris
        if (err.error === 'canceled' || err.error === 'interrupted') return
        console.error('Speech synthesis utterance error:', err)
        this.handleEnd()
      }

      window.speechSynthesis.speak(utter)
    } catch (e) {
      console.error('Failed to trigger speech synthesis:', e)
      this.handleEnd()
    }
  }

  /**
   * Jeda narator suara
   */
  public pause() {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause()
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
    }
    if (this.activeLineId) {
      manuscriberPluginStore.getState().setSpeakingState(this.activeLineId, 'paused')
      this.options.onPause?.()
    }
  }

  /**
   * Lanjutkan narator suara
   */
  public resume() {
    if (this.currentAudio && this.currentAudio.paused) {
      void this.currentAudio.play()
      if (this.activeLineId) {
        manuscriberPluginStore.getState().setSpeakingState(this.activeLineId, 'playing')
        this.options.onResume?.()
      }
      return
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      if (this.activeLineId) {
        manuscriberPluginStore.getState().setSpeakingState(this.activeLineId, 'playing')
        this.options.onResume?.()
      }
    }
  }

  /**
   * Hentikan narator suara secara menyeluruh
   */
  public stop() {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    const desktopApi = (window as any).desktop
    if (desktopApi?.winTtsStop) {
      void desktopApi.winTtsStop()
    }

    this.currentUtterance = null
    this.handleEnd()
  }

  private handleEnd() {
    const prevLineId = this.activeLineId
    this.activeLineId = null
    this.activeWords = []
    manuscriberPluginStore.getState().setSpeakingState(null, 'idle')
    if (prevLineId) {
      this.options.onEnd?.()
    }
  }

  public getActiveLineId(): string | null {
    return this.activeLineId
  }
}

export const narratorService = new NarratorService()
