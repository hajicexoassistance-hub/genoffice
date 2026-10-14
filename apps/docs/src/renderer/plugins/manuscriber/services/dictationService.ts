/**
 * Manuscriber Plugin — Dictation Service
 * Layanan dikte suara real-time berbasis Web Speech API.
 */

type SpeechRecognitionType = any

export class DictationService {
  private recognition: SpeechRecognitionType | null = null
  private listening = false
  private targetElement: HTMLTextAreaElement | HTMLInputElement | null = null
  private onResultCallback: ((text: string) => void) | null = null
  private onStateChangeCallback: ((isListening: boolean) => void) | null = null

  constructor() {
    this.initRecognition()
  }

  private initRecognition() {
    const SpeechClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechClass) return

    try {
      this.recognition = new SpeechClass()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = 'ar-SA' // Default Arabic

      this.recognition.onstart = () => {
        this.listening = true
        this.onStateChangeCallback?.(true)
      }

      this.recognition.onend = () => {
        this.listening = false
        this.onStateChangeCallback?.(false)
      }

      this.recognition.onerror = (_e: any) => {
        this.listening = false
        this.onStateChangeCallback?.(false)
      }

      this.recognition.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }

        if (finalTranscript) {
          if (this.onResultCallback) {
            this.onResultCallback(finalTranscript)
          } else if (this.targetElement) {
            const start = this.targetElement.selectionStart ?? this.targetElement.value.length
            const end = this.targetElement.selectionEnd ?? this.targetElement.value.length
            const prev = this.targetElement.value
            const next = prev.slice(0, start) + ' ' + finalTranscript.trim() + prev.slice(end)
            this.targetElement.value = next
            this.targetElement.selectionStart = start + finalTranscript.length + 1
            this.targetElement.selectionEnd = start + finalTranscript.length + 1
            this.targetElement.dispatchEvent(new Event('input', { bubbles: true }))
            this.targetElement.dispatchEvent(new Event('change', { bubbles: true }))
          }
        }
      }
    } catch {}
  }

  public setTargetElement(el: HTMLTextAreaElement | HTMLInputElement | null) {
    this.targetElement = el
  }

  public setLanguage(lang: 'ar-SA' | 'id-ID') {
    if (this.recognition) {
      this.recognition.lang = lang
    }
  }

  public onResult(cb: (text: string) => void) {
    this.onResultCallback = cb
  }

  public onStateChange(cb: (isListening: boolean) => void) {
    this.onStateChangeCallback = cb
  }

  public isListening(): boolean {
    return this.listening
  }

  public async start(): Promise<void> {
    if (!this.recognition) return
    if (this.listening) return
    try {
      this.recognition.start()
    } catch {}
  }

  public async stop(): Promise<void> {
    if (!this.recognition) return
    if (!this.listening) return
    try {
      this.recognition.stop()
    } catch {}
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
    if (!this.recognition) return false
    if (opts?.onTranscript) this.onResult(opts.onTranscript)
    void this.start()
    return true
  }

  public stopListening(): void {
    void this.stop()
  }
}

export const dictationService = new DictationService()
