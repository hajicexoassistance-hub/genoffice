import React, { useRef, useEffect, useState } from 'react'
import {
  StagingLine,
  useManuscriberStagingStore,
  manuscriberStagingStore,
} from './ManuscriberStagingStore'
import { QuickFixPopover } from './QuickFixPopover'
import { voiceDictationService } from '../services/VoiceDictationService'
import { dictationService } from './DictationService'
import { IconCheck, IconVolume, IconPlay, IconPause, IconStop } from '../components/icons'
import { showToast } from '../components/toast-bus'

interface StagingLineItemProps {
  line: StagingLine
  isActive: boolean
  onFocus: () => void
}

export const StagingLineItem: React.FC<StagingLineItemProps> = ({ line, isActive, onFocus }) => {
  const { speechLanguage, speakingLineId, speechStatus } = useManuscriberStagingStore()
  const [popoverWord, setPopoverWord] = useState<string | null>(null)
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const isThisLineSpeaking = speakingLineId === line.id
  const isPlaying = isThisLineSpeaking && speechStatus === 'playing'
  const isPaused = isThisLineSpeaking && speechStatus === 'paused'

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (manuscriberStagingStore.getState().speakingLineId === line.id) {
        const desktopApi = (window as any).desktop
        if (desktopApi?.winTtsStop) {
          void desktopApi.winTtsStop()
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
        manuscriberStagingStore.setSpeakingState(null, 'idle')
      }
    }
  }, [line.id])

  // Reset active word index when speaking stops and unblock selection
  useEffect(() => {
    if (!isThisLineSpeaking) {
      setActiveWordIdx(null)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (textareaRef.current && document.activeElement === textareaRef.current) {
        const len = textareaRef.current.value.length
        try {
          textareaRef.current.setSelectionRange(len, len)
        } catch {}
      }
    }
  }, [isThisLineSpeaking])

  // Memblok teks langsung di textarea saat narator bersuara
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    if (!isThisLineSpeaking || activeWordIdx === null) return

    const text = line.correctedText
    const regex = /\S+/g
    let match: RegExpExecArray | null
    let curIdx = 0
    let targetRange: { start: number; end: number } | null = null

    while ((match = regex.exec(text)) !== null) {
      if (curIdx === activeWordIdx) {
        targetRange = { start: match.index, end: match.index + match[0].length }
        break
      }
      curIdx++
    }

    if (targetRange) {
      try {
        el.focus({ preventScroll: true })
        el.setSelectionRange(targetRange.start, targetRange.end)
      } catch {}
    }
  }, [activeWordIdx, isThisLineSpeaking, line.correctedText])

  // Listen for native TTS completion event from main process
  useEffect(() => {
    const desktopApi = (window as any).desktop
    if (!desktopApi?.onTtsDone) return
    const unsubscribe = desktopApi.onTtsDone(() => {
      if (manuscriberStagingStore.getState().speakingLineId === line.id) {
        manuscriberStagingStore.setSpeakingState(null, 'idle')
        setActiveWordIdx(null)
      }
    })
    return () => unsubscribe()
  }, [line.id])

  const handlePlayTTS = () => {
    if (typeof window === 'undefined') return
    const textToRead = line.correctedText.trim()
    if (!textToRead) return

    const words = textToRead.split(/\s+/).filter(Boolean)

    // If currently paused, resume HTML5 Audio or Web Speech API
    if (isPaused) {
      if (audioRef.current) {
        void audioRef.current.play()
        manuscriberStagingStore.setSpeakingState(line.id, 'playing')
        return
      }
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
        manuscriberStagingStore.setSpeakingState(line.id, 'playing')
        return
      }
    }

    // Cancel any ongoing speech first
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    const playWithWebSpeech = () => {
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(textToRead)
        utter.lang = speechLanguage
        utter.rate = 0.85

        utter.onboundary = (e) => {
          const upToNow = textToRead.slice(0, e.charIndex)
          const wordCount = upToNow.trim() ? upToNow.trim().split(/\s+/).length : 0
          setActiveWordIdx(Math.min(words.length - 1, wordCount))
        }
        utter.onstart = () => {
          manuscriberStagingStore.setSpeakingState(line.id, 'playing')
          setActiveWordIdx(0)
        }
        utter.onpause = () => {
          manuscriberStagingStore.setSpeakingState(line.id, 'paused')
        }
        utter.onresume = () => {
          manuscriberStagingStore.setSpeakingState(line.id, 'playing')
        }
        utter.onend = () => {
          manuscriberStagingStore.setSpeakingState(null, 'idle')
          setActiveWordIdx(null)
        }
        utter.onerror = () => {
          manuscriberStagingStore.setSpeakingState(null, 'idle')
          setActiveWordIdx(null)
        }

        window.speechSynthesis.speak(utter)
      } else {
        showToast('Fitur Text-to-Speech tidak tersedia', 'error')
        manuscriberStagingStore.setSpeakingState(null, 'idle')
        setActiveWordIdx(null)
      }
    }

    // PRIMARY: Native Windows WinRT TTS with HTML5 Audio Playback & Progress
    const desktopApi = (window as any).desktop
    if (desktopApi?.winTtsSynthesize) {
      manuscriberStagingStore.setSpeakingState(line.id, 'playing')
      setActiveWordIdx(0)
      desktopApi
        .winTtsSynthesize({ text: textToRead, lang: speechLanguage, rate: 0.85 })
        .then((res: { ok: boolean; audioUrl?: string; error?: string }) => {
          if (res.ok && res.audioUrl) {
            const audio = new Audio(res.audioUrl)
            audioRef.current = audio

            audio.ontimeupdate = () => {
              if (!audio.duration || audio.duration <= 0) return
              const progress = audio.currentTime / audio.duration
              const idx = Math.min(words.length - 1, Math.floor(progress * words.length))
              setActiveWordIdx(idx)
            }

            audio.onended = () => {
              manuscriberStagingStore.setSpeakingState(null, 'idle')
              setActiveWordIdx(null)
              audioRef.current = null
            }

            audio.onerror = () => {
              manuscriberStagingStore.setSpeakingState(null, 'idle')
              setActiveWordIdx(null)
              audioRef.current = null
            }

            audio.onpause = () => {
              manuscriberStagingStore.setSpeakingState(line.id, 'paused')
            }

            audio.onplay = () => {
              manuscriberStagingStore.setSpeakingState(line.id, 'playing')
            }

            void audio.play().catch(() => {
              playWithWebSpeech()
            })
          } else {
            playWithWebSpeech()
          }
        })
        .catch(() => {
          playWithWebSpeech()
        })
      return
    }

    // FALLBACK: Web Speech API
    playWithWebSpeech()
  }

  const handlePauseTTS = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
    }
    manuscriberStagingStore.setSpeakingState(line.id, 'paused')
  }

  const handleStopTTS = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    const desktopApi = (window as any).desktop
    if (desktopApi?.winTtsStop) {
      void desktopApi.winTtsStop()
    }
    manuscriberStagingStore.setSpeakingState(null, 'idle')
    setActiveWordIdx(null)
  }

  // Dynamic textarea height adjustment to eliminate empty vertical gaps
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(42, textareaRef.current.scrollHeight)}px`
    }
  }, [line.correctedText])

  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    if (isActive && textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true })
    }
  }, [isActive])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Alt + Down ➔ Next Line
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault()
      manuscriberStagingStore.nextPointer()
    }
    // Alt + Up ➔ Prev Line
    else if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault()
      manuscriberStagingStore.prevPointer()
    }
    // Ctrl + Enter ➔ Toggle Verified
    else if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault()
      const nextStatus = line.status === 'verified' ? 'unverified' : 'verified'
      manuscriberStagingStore.setLineStatus(line.id, nextStatus)
      if (nextStatus === 'verified') {
        manuscriberStagingStore.nextPointer()
      }
    }
    // Ctrl + Shift + F ➔ Flagged
    else if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault()
      const nextStatus = line.status === 'flagged' ? 'unverified' : 'flagged'
      manuscriberStagingStore.setLineStatus(line.id, nextStatus)
    }
    // Escape ➔ Exit Focus Mode
    else if (e.key === 'Escape') {
      e.preventDefault()
      manuscriberStagingStore.setIsFocusMode(false)
    }
  }

  const getBlockTypeBadge = () => {
    switch (line.blockType) {
      case 'matan':
        return <span className="block-type-badge matan">📖 MATAN</span>
      case 'hasyiah':
        return <span className="block-type-badge hasyiah">📜 HASYIAH</span>
      case 'nadzom':
        return <span className="block-type-badge nadzom">📜 NADZOM</span>
      case 'margin':
        return <span className="block-type-badge margin">📌 MARGIN</span>
      case 'heading':
        return <span className="block-type-badge heading">🔖 JUDUL</span>
      default:
        return <span className="block-type-badge syarah">💡 SYARAH</span>
    }
  }

  const getStatusBadge = () => {
    switch (line.status) {
      case 'verified':
        return <span className="status-badge verified">✓ Shahih (Verified)</span>
      case 'flagged':
        return <span className="status-badge flagged">⚠️ Ragu (Flagged)</span>
      case 'edited':
        return <span className="status-badge edited">✏️ Ditingkatkan (Edited)</span>
      default:
        return <span className="status-badge unverified">○ Draf AI (Unverified)</span>
    }
  }

  return (
    <div
      ref={cardRef}
      className={`staging-line-card ${isActive ? 'active-focus' : ''} status-${line.status} ${isThisLineSpeaking ? 'is-speaking-narrator' : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'BUTTON') {
          onFocus()
        }
      }}
    >
      {/* Line Header - Standard LTR Layout for Badges on Left & Actions on Right */}
      <div className="line-card-header" dir="ltr">
        <div className="line-meta" dir="ltr">
          <span className="line-number">Blok {line.lineNumber}</span>
          {getBlockTypeBadge()}
          {getStatusBadge()}
          {line.confidenceScore < 0.85 && (
            <button
              type="button"
              className="warning-confidence-btn"
              onClick={(e) => {
                e.stopPropagation()
                setPopoverWord(line.correctedText.split(' ')[0] || line.correctedText)
              }}
              title={`Skor kepercayaan AI ${Math.round(line.confidenceScore * 100)}%. Klik untuk opsi kandidat.`}
            >
              💡 {Math.round(line.confidenceScore * 100)}%
            </button>
          )}
        </div>

        {/* Micro Toolbar */}
        <div className="line-micro-toolbar" dir="ltr" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Narrator TTS Controls */}
          {!isThisLineSpeaking ? (
            <button
              type="button"
              className="micro-btn tts-btn play"
              onClick={(e) => {
                e.stopPropagation()
                handlePlayTTS()
              }}
              title={`Putar Narator Suara (${speechLanguage})`}
            >
              <IconVolume size={14} />
            </button>
          ) : (
            <div className="tts-active-controls" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {isPlaying && (
                <button
                  type="button"
                  className="micro-btn tts-btn pause active"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePauseTTS()
                  }}
                  title="Jeda Narator"
                >
                  <IconPause size={14} />
                </button>
              )}
              {isPaused && (
                <button
                  type="button"
                  className="micro-btn tts-btn resume"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePlayTTS()
                  }}
                  title="Lanjutkan Narator"
                >
                  <IconPlay size={14} />
                </button>
              )}
              <button
                type="button"
                className="micro-btn tts-btn stop"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStopTTS()
                }}
                title="Hentikan Narator"
              >
                <IconStop size={14} />
              </button>
            </div>
          )}

          <button
            type="button"
            className={`micro-btn status-toggle-btn ${line.status === 'verified' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              manuscriberStagingStore.setLineStatus(
                line.id,
                line.status === 'verified' ? 'unverified' : 'verified'
              )
            }}
            title={line.status === 'verified' ? 'Batal Verification (Status: Shahih)' : 'Tandai Shahih (Ctrl+Enter)'}
          >
            <IconCheck size={14} />
          </button>
        </div>
      </div>

      {/* Editable Area - Arabic Textarea */}
      <div className="line-card-body" dir="rtl">
        <textarea
          ref={textareaRef}
          className="line-arabic-textarea"
          value={line.correctedText}
          onFocus={() => {
            dictationService.setTargetElement(textareaRef.current)
            onFocus()
          }}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            manuscriberStagingStore.updateLineText(line.id, e.target.value)
          }
          onKeyDown={handleKeyDown}
          onClick={() => {
            dictationService.setTargetElement(textareaRef.current)
            if (!isActive) {
              manuscriberStagingStore.setActiveLineId(line.id, false)
            }
          }}
          rows={1}
          style={{ overflowY: 'hidden' }}
          placeholder="Ketik atau edit teks Arab di sini..."
        />
      </div>

      {/* Quick Fix Popover if triggered */}
      {popoverWord && (
        <QuickFixPopover
          word={popoverWord}
          candidates={line.candidates}
          confidenceScore={line.confidenceScore}
          onSelectCandidate={(selected: string) => {
            manuscriberStagingStore.updateLineText(
              line.id,
              line.correctedText.replace(popoverWord, selected)
            )
            setPopoverWord(null)
          }}
          onClose={() => setPopoverWord(null)}
        />
      )}
    </div>
  )
}
