/**
 * Manuscriber Plugin — Pegon Virtual Keyboard Dock (3-in-1 Mode)
 * Papan ketik virtual ANSI QWERTY 5 baris:
 * 1. ⌨️ Pegon: Layout Pegon Nusantara + Smart Digraphs + Kaidah Alif Awal
 * 2. ⚡ Translit: Transliterasi kata Latin otomatis saat Spasi/Enter
 * 3. 🕌 Arab: Layout Hijaiyah Standar (fonetik Arab murni)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useManuscriberPluginStore } from '../../store/manuscriberPluginStore'
import { dictationService } from '../../services/dictationService'
import type { KeyboardInputMode } from '../../types'
import {
  IconKeyboard,
  IconLightning,
  IconArabic,
  IconSoundOn,
  IconSoundMute,
  IconChevronDown,
  IconMic,
  IconDismiss,
  IconEyeHide,
  IconInfo,
} from '../icons/ManuscriberIcons'

interface KeyItem {
  id: string
  norm: string
  normChar: string
  shift: string
  shiftChar: string
  displayNormChar?: string
  displayShiftChar?: string
  widthFlex: number
  isSpecialPegon?: boolean
  isFuncKey?: boolean
  isMicKey?: boolean
}

// BARIS 1: Number Row
const KEYBOARD_ROW_1: KeyItem[] = [
  { id: 'grave', norm: '` dh', normChar: 'ڊ', shift: '~ dzal', shiftChar: 'ذ', widthFlex: 1, isSpecialPegon: true },
  { id: '1', norm: '1', normChar: '١', shift: '!', shiftChar: '!', widthFlex: 1 },
  { id: '2', norm: '2', normChar: '٢', shift: '@', shiftChar: '@', widthFlex: 1 },
  { id: '3', norm: '3', normChar: '٣', shift: '#', shiftChar: '#', widthFlex: 1 },
  { id: '4', norm: '4', normChar: '٤', shift: '$', shiftChar: '$', widthFlex: 1 },
  { id: '5', norm: '5', normChar: '٥', shift: '%', shiftChar: '%', widthFlex: 1 },
  { id: '6', norm: '6', normChar: '٦', shift: '^', shiftChar: '^', widthFlex: 1 },
  { id: '7', norm: '7', normChar: '٧', shift: '&', shiftChar: '&', widthFlex: 1 },
  { id: '8', norm: '8', normChar: '٨', shift: '*', shiftChar: '*', widthFlex: 1 },
  { id: '9', norm: '9', normChar: '٩', shift: '(', shiftChar: '(', widthFlex: 1 },
  { id: '0', norm: '0', normChar: '٠', shift: ')', shiftChar: ')', widthFlex: 1 },
  { id: 'minus', norm: '- ts', normChar: 'ث', shift: '_ lam-alif', shiftChar: 'لا', widthFlex: 1, isSpecialPegon: true },
  { id: 'equal', norm: '= ch', normChar: 'ح', shift: '+ kho', shiftChar: 'خ', widthFlex: 1, isSpecialPegon: true },
  { id: 'backspace', norm: '⌫', normChar: '', shift: '⌫', shiftChar: '', widthFlex: 2, isFuncKey: true },
]

// BARIS 2: Tab, Q W E R T Y U I O P [ ] \
const KEYBOARD_ROW_2: KeyItem[] = [
  { id: 'tab', norm: 'Tab', normChar: '', shift: 'Tab', shiftChar: '', widthFlex: 1.5, isFuncKey: true },
  { id: 'q', norm: 'q', normChar: 'ق', shift: 'Q hamzah', shiftChar: 'ء', widthFlex: 1 },
  { id: 'w', norm: 'w', normChar: 'و', shift: 'W waw-hamzah', shiftChar: 'ؤ', widthFlex: 1 },
  { id: 'e', norm: 'e', normChar: 'ي', shift: 'pepet', shiftChar: '\u0653', displayShiftChar: '◌ٓ', widthFlex: 1 },
  { id: 'r', norm: 'r', normChar: 'ر', shift: 'R maddah', shiftChar: 'آ', widthFlex: 1 },
  { id: 't', norm: 't', normChar: 'ت', shift: 'T marbuthah', shiftChar: 'ة', widthFlex: 1 },
  { id: 'y', norm: 'y', normChar: 'ي', shift: 'Y maqshurah', shiftChar: 'ى', widthFlex: 1 },
  { id: 'u', norm: 'u', normChar: 'و', shift: 'dhommah', shiftChar: '\u064F', displayShiftChar: '◌ُ', widthFlex: 1 },
  { id: 'i', norm: 'i', normChar: 'ي', shift: 'kasrah', shiftChar: '\u0650', displayShiftChar: '◌ِ', widthFlex: 1 },
  { id: 'o', norm: 'o', normChar: 'و', shift: 'sukun', shiftChar: '\u0652', displayShiftChar: '◌ْ', widthFlex: 1 },
  { id: 'p', norm: 'p', normChar: 'ڤ', shift: 'P', shiftChar: 'ڤ', widthFlex: 1, isSpecialPegon: true },
  { id: 'bracket_l', norm: '[ ng', normChar: 'ڠ', shift: '{ gh', shiftChar: 'غ', widthFlex: 1, isSpecialPegon: true },
  { id: 'bracket_r', norm: '] ny', normChar: 'ۑ', shift: '} maqshurah', shiftChar: 'ى', widthFlex: 1, isSpecialPegon: true },
  { id: 'backslash', norm: '\\ th', normChar: 'ڟ', shift: '| marbuthah', shiftChar: 'ة', widthFlex: 1.5, isSpecialPegon: true },
]

// BARIS 3: Caps, A S D F G H J K L ; ' Enter
const KEYBOARD_ROW_3: KeyItem[] = [
  { id: 'caps', norm: 'Caps', normChar: '', shift: 'Caps', shiftChar: '', widthFlex: 1.8, isFuncKey: true },
  { id: 'a', norm: 'a', normChar: 'ا', shift: 'fathah', shiftChar: '\u064E', displayShiftChar: '◌َ', widthFlex: 1 },
  { id: 's', norm: 's', normChar: 'س', shift: 'S sho', shiftChar: 'ص', widthFlex: 1 },
  { id: 'd', norm: 'd', normChar: 'د', shift: 'D dlo', shiftChar: 'ض', widthFlex: 1 },
  { id: 'f', norm: 'f', normChar: 'ف', shift: 'F', shiftChar: 'ف', widthFlex: 1 },
  { id: 'g', norm: 'g', normChar: 'ڮ', shift: 'gh', shiftChar: 'غ', widthFlex: 1, isSpecialPegon: true },
  { id: 'h', norm: 'h', normChar: 'ه', shift: 'H ha-pedas', shiftChar: 'ح', widthFlex: 1 },
  { id: 'j', norm: 'j', normChar: 'ج', shift: 'J', shiftChar: 'ج', widthFlex: 1 },
  { id: 'k', norm: 'k', normChar: 'ك', shift: 'K qof', shiftChar: 'ق', widthFlex: 1 },
  { id: 'l', norm: 'l', normChar: 'ل', shift: 'L', shiftChar: 'ل', widthFlex: 1 },
  { id: 'semicolon', norm: '; tho', normChar: 'ط', shift: ': titik dua', shiftChar: ':', widthFlex: 1, isSpecialPegon: true },
  { id: 'quote', norm: "' 'ain", normChar: 'ع', shift: '" hamzah', shiftChar: 'ء', widthFlex: 1, isSpecialPegon: true },
  { id: 'enter', norm: 'Enter ↵', normChar: '\n', shift: 'Enter ↵', shiftChar: '\n', widthFlex: 2.2, isFuncKey: true },
]

// BARIS 4: Shift, Z X C V B N M , . / Shift
const KEYBOARD_ROW_4: KeyItem[] = [
  { id: 'shift_l', norm: 'Shift ⇧', normChar: '', shift: 'Shift ⇧', shiftChar: '', widthFlex: 2.4, isFuncKey: true },
  { id: 'z', norm: 'z', normChar: 'ز', shift: 'Z zho', shiftChar: 'ظ', widthFlex: 1 },
  { id: 'x', norm: 'kh', normChar: 'خ', shift: 'X ya-hamzah', shiftChar: 'ئ', widthFlex: 1, isSpecialPegon: true },
  { id: 'c', norm: 'c', normChar: 'چ', shift: 'C alif-atas', shiftChar: 'أ', widthFlex: 1, isSpecialPegon: true },
  { id: 'v', norm: 'sy', normChar: 'ش', shift: 'V alif-bawah', shiftChar: 'إ', widthFlex: 1, isSpecialPegon: true },
  { id: 'b', norm: 'b', normChar: 'ب', shift: 'B', shiftChar: 'ب', widthFlex: 1 },
  { id: 'n', norm: 'n', normChar: 'ن', shift: 'N', shiftChar: 'ن', widthFlex: 1 },
  { id: 'm', norm: 'm', normChar: 'م', shift: 'M', shiftChar: 'م', widthFlex: 1 },
  { id: 'comma', norm: ', sho', normChar: 'ص', shift: '< koma', shiftChar: '،', widthFlex: 1, isSpecialPegon: true },
  { id: 'period', norm: '. dlo', normChar: 'ض', shift: '> titik', shiftChar: '.', widthFlex: 1, isSpecialPegon: true },
  { id: 'slash', norm: '/ zho', normChar: 'ظ', shift: '? tanya', shiftChar: '؟', widthFlex: 1, isSpecialPegon: true },
  { id: 'shift_r', norm: 'Shift ⇧', normChar: '', shift: 'Shift ⇧', shiftChar: '', widthFlex: 2.6, isFuncKey: true },
]

// BARIS 5: Ctrl, Dikte, Alt, Space, Pepet Cepat, Alt, Ctrl
const KEYBOARD_ROW_5: KeyItem[] = [
  { id: 'ctrl_l', norm: 'Ctrl', normChar: '', shift: 'Ctrl', shiftChar: '', widthFlex: 1.4, isFuncKey: true },
  { id: 'win', norm: 'Dikte', normChar: '', shift: 'Dikte', shiftChar: '', widthFlex: 1.4, isFuncKey: true, isMicKey: true },
  { id: 'alt_l', norm: 'Alt', normChar: '', shift: 'Alt', shiftChar: '', widthFlex: 1.2, isFuncKey: true },
  { id: 'space', norm: 'SPASI (SPACE)', normChar: ' ', shift: 'SPASI (SPACE)', shiftChar: ' ', widthFlex: 6.2, isFuncKey: true },
  { id: 'pepet_quick', norm: 'pepet', normChar: '\u0653', shift: 'pepet', shiftChar: '\u0653', displayNormChar: '◌ٓ', displayShiftChar: '◌ٓ', widthFlex: 1.5, isSpecialPegon: true },
  { id: 'alt_r', norm: 'Alt', normChar: '', shift: 'Alt', shiftChar: '', widthFlex: 1.2, isFuncKey: true },
  { id: 'ctrl_r', norm: 'Ctrl', normChar: '', shift: 'Ctrl', shiftChar: '', widthFlex: 1.4, isFuncKey: true },
]

const QUICK_HARAKAT = [
  { label: 'Pepet (ٓ)', char: '\u0653', display: '◌ٓ', isPegon: true },
  { label: 'Fathah (َ)', char: '\u064E', display: '◌َ' },
  { label: 'Kasrah (ِ)', char: '\u0650', display: '◌ِ' },
  { label: 'Dhommah (ُ)', char: '\u064F', display: '◌ُ' },
  { label: 'Sukun (ْ)', char: '\u0652', display: '◌ْ' },
  { label: 'Tasydid (ّ)', char: '\u0651', display: '◌ّ' },
  { label: 'Tanwin Fathah (ً)', char: '\u064B', display: '◌ً' },
  { label: 'Tanwin Kasrah (ٍ)', char: '\u064D', display: '◌ٍ' },
  { label: 'Tanwin Dhommah (ٌ)', char: '\u064C', display: '◌ٌ' },
  { label: 'Alif Khanjariyah (ٰ)', char: '\u0670', display: '◌ٰ' },
  { label: 'Hamzah (ء)', char: 'ء', display: 'ء' },
  { label: 'Ta Marbuthah (ة)', char: 'ة', display: 'ة' },
  { label: 'Lam Alif (لا)', char: 'لا', display: 'لا' },
]

export interface PegonKeyboardDockProps {
  onClose?: () => void
  onOpenGuide?: () => void
}

export function PegonKeyboardDock({ onClose, onOpenGuide }: PegonKeyboardDockProps) {
  const keyboardMode = useManuscriberPluginStore((s) => s.keyboardMode)
  const setKeyboardMode = useManuscriberPluginStore((s) => s.setKeyboardMode)
  const isKeyboardOpen = useManuscriberPluginStore((s) => s.isKeyboardOpen)
  const setKeyboardOpen = useManuscriberPluginStore((s) => s.setKeyboardOpen)

  const [isShiftActive, setIsShiftActive] = useState(false)
  const [isCapsLock, setIsCapsLock] = useState(false)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [keyboardScale, setKeyboardScale] = useState<'s' | 'm' | 'l'>(() => {
    try {
      const saved = localStorage.getItem('manuscriber_keyboard_scale')
      if (saved === 's' || saved === 'm' || saved === 'l') return saved
    } catch {}
    return 'm'
  })

  const handleChangeScale = (scale: 's' | 'm' | 'l') => {
    setKeyboardScale(scale)
    try {
      localStorage.setItem('manuscriber_keyboard_scale', scale)
    } catch {}
  }

  const audioCtxRef = useRef<AudioContext | null>(null)

  function playClick() {
    if (!isSoundEnabled) return
    try {
      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtxClass) audioCtxRef.current = new AudioCtxClass()
      }
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state === 'suspended') void audioCtxRef.current.resume()
        const osc = audioCtxRef.current.createOscillator()
        const gain = audioCtxRef.current.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(540, audioCtxRef.current.currentTime)
        osc.frequency.exponentialRampToValueAtTime(140, audioCtxRef.current.currentTime + 0.035)
        gain.gain.setValueAtTime(0.09, audioCtxRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.035)
        osc.connect(gain)
        gain.connect(audioCtxRef.current.destination)
        osc.start()
        osc.stop(audioCtxRef.current.currentTime + 0.035)
      }
    } catch {}
  }

  function getActiveTextarea(): HTMLTextAreaElement | null {
    return document.querySelector(
      '.focus-line-container textarea, .staging-line-card.active textarea, .plugin-canvas-block-textarea, textarea:focus'
    ) as HTMLTextAreaElement | null
  }

  function insertText(char: string) {
    playClick()
    const ta = getActiveTextarea()
    if (!ta) return
    const start = ta.selectionStart ?? ta.value.length
    const end = ta.selectionEnd ?? ta.value.length
    const prev = ta.value
    const next = prev.slice(0, start) + char + prev.slice(end)
    ta.value = next
    const nextCaret = start + char.length
    ta.selectionStart = nextCaret
    ta.selectionEnd = nextCaret
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    ta.dispatchEvent(new Event('change', { bubbles: true }))
    ta.focus()
  }

  function handleBackspace() {
    playClick()
    const ta = getActiveTextarea()
    if (!ta) return
    let start = ta.selectionStart ?? ta.value.length
    let end = ta.selectionEnd ?? ta.value.length
    const prev = ta.value
    if (start === end) {
      if (start === 0) return
      start = start - 1
    }
    const next = prev.slice(0, start) + prev.slice(end)
    ta.value = next
    ta.selectionStart = start
    ta.selectionEnd = start
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    ta.dispatchEvent(new Event('change', { bubbles: true }))
    ta.focus()
  }

  // Intersep Keyboard Fisik
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') { setIsShiftActive(true); return; }
      if (e.key === 'CapsLock') { setIsCapsLock((p) => !p); return; }

      const ta = getActiveTextarea()
      if (!ta || document.activeElement !== ta) return

      playClick()

      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Escape'].includes(e.key)) return
      if (e.key === 'Backspace' || e.key === 'Delete') return

      if (e.key === 'Tab') {
        e.preventDefault()
        insertText('    ')
        return
      }

      if (keyboardMode === 'arabic') {
        // Pemetaan tombol mode Arab
        const ARAB_MAP_NORM: Record<string, string> = {
          '`': 'ذ', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩', '0': '٠',
          '-': 'ث', '=': 'ح', 'q': 'ق', 'w': 'و', 'e': 'ي', 'r': 'ر', 't': 'ت', 'y': 'ي', 'u': 'و', 'i': 'ي', 'o': 'و', 'p': 'ف',
          '[': 'ج', ']': 'د', '\\': 'ط', 'a': 'ا', 's': 'س', 'd': 'د', 'f': 'ف', 'g': 'غ', 'h': 'ه', 'j': 'ج', 'k': 'ك', 'l': 'ل',
          ';': 'ط', "'": 'ع', 'z': 'ز', 'x': 'خ', 'c': 'ث', 'v': 'ش', 'b': 'ب', 'n': 'ن', 'm': 'م', ',': '،', '.': '.', '/': '؟',
        }
        const ARAB_MAP_SHIFT: Record<string, string> = {
          '~': 'ّ', '_': 'لا', '+': 'خ', 'Q': 'ء', 'W': 'ؤ', 'E': '\u0651', 'R': 'آ', 'T': 'ة', 'Y': 'ى', 'U': '\u064F',
          'I': '\u0650', 'O': '\u0652', 'P': 'ب', '{': 'غ', '}': 'ى', '|': 'ة', 'A': '\u064E', 'S': 'ص', 'D': 'ض', 'F': 'ف',
          'G': 'غ', 'H': 'ح', 'J': 'ج', 'K': 'ق', 'L': 'ل', ':': ':', '"': 'ء', 'Z': 'ظ', 'X': 'ئ', 'C': 'أ', 'V': 'إ',
          'B': 'ب', 'N': 'ن', 'M': 'م', '<': '،', '>': '.', '?': '؟',
        }
        const effShift = e.shiftKey || isShiftActive || isCapsLock
        const char = effShift ? ARAB_MAP_SHIFT[e.key] : ARAB_MAP_NORM[e.key]
        if (char) {
          e.preventDefault()
          insertText(char)
          if (isShiftActive && !isCapsLock) setIsShiftActive(false)
        }
        return
      }

      if (keyboardMode === 'pegon') {
        const start = ta.selectionStart ?? 0
        const textVal = ta.value || ''
        const charBefore = start > 0 ? textVal[start - 1] : ''

        // Smart Digraphs
        const DIGRAPHS: Record<string, Record<string, string>> = {
          'ن': { g: 'ڠ', G: 'ڠ', y: 'ۑ', Y: 'ۑ' },
          'د': { h: 'ڊ', H: 'ڊ' },
          'ت': { h: 'ڟ', H: 'ڟ' },
          'ك': { h: 'خ', H: 'خ' },
          'س': { y: 'ش', Y: 'ش' },
          'چ': { h: 'ح', H: 'ح' },
          'ڮ': { h: 'غ', H: 'غ' },
        }
        if (charBefore && DIGRAPHS[charBefore] && DIGRAPHS[charBefore][e.key]) {
          e.preventDefault()
          const rep = DIGRAPHS[charBefore][e.key]
          const repStart = start - 1
          ta.value = textVal.slice(0, repStart) + rep + textVal.slice(start)
          ta.selectionStart = repStart + rep.length
          ta.selectionEnd = repStart + rep.length
          ta.dispatchEvent(new Event('input', { bubbles: true }))
          return
        }

        // Kaidah Vokal Alif Awal Kata
        const isWordStart = start === 0 || charBefore <= ' ' || ',.;:!?()[]{}<>-/"\''.includes(charBefore)
        if (isWordStart) {
          const lk = e.key.toLowerCase()
          if (lk === 'a') { e.preventDefault(); insertText(e.shiftKey ? 'ا\u064E' : 'ا'); return; }
          if (lk === 'i') { e.preventDefault(); insertText(e.shiftKey ? 'ا\u0650' : 'اي'); return; }
          if (lk === 'u') { e.preventDefault(); insertText(e.shiftKey ? 'ا\u064F' : 'او'); return; }
          if (lk === 'e') { e.preventDefault(); insertText(e.shiftKey ? 'ا\u0653' : 'اي'); return; }
          if (lk === 'o') { e.preventDefault(); insertText(e.shiftKey ? 'ا\u0652' : 'او'); return; }
        }

        const PEGON_MAP_NORM: Record<string, string> = {
          '`': 'ڊ', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩', '0': '٠',
          '-': 'ث', '=': 'ح', 'q': 'ق', 'w': 'و', 'e': 'ي', 'r': 'ر', 't': 'ت', 'y': 'ي', 'u': 'و', 'i': 'ي', 'o': 'و', 'p': 'ڤ',
          '[': 'ڠ', ']': 'ۑ', '\\': 'ڟ', 'a': 'ا', 's': 'س', 'd': 'د', 'f': 'ف', 'g': 'ڮ', 'h': 'ه', 'j': 'ج', 'k': 'ك', 'l': 'ل',
          ';': 'ط', "'": 'ع', 'z': 'ز', 'x': 'خ', 'c': 'چ', 'v': 'ش', 'b': 'ب', 'n': 'ن', 'm': 'م', ',': 'ص', '.': 'ض', '/': 'ظ',
        }
        const PEGON_MAP_SHIFT: Record<string, string> = {
          '~': 'ذ', '_': 'لا', '+': 'خ', 'Q': 'ء', 'W': 'ؤ', 'E': '\u0653', 'R': 'آ', 'T': 'ة', 'Y': 'ى', 'U': '\u064F',
          'I': '\u0650', 'O': '\u0652', 'P': 'ڤ', '{': 'غ', '}': 'ى', '|': 'ة', 'A': '\u064E', 'S': 'ص', 'D': 'ض', 'F': 'ف',
          'G': 'غ', 'H': 'ح', 'J': 'ج', 'K': 'ق', 'L': 'ل', ':': ':', '"': 'ء', 'Z': 'ظ', 'X': 'ئ', 'C': 'أ', 'V': 'إ',
          'B': 'ب', 'N': 'ن', 'M': 'م', '<': '،', '>': '.', '?': '؟',
        }
        const effShift = e.shiftKey || isShiftActive || isCapsLock
        const char = effShift ? PEGON_MAP_SHIFT[e.key] : PEGON_MAP_NORM[e.key]
        if (char) {
          e.preventDefault()
          insertText(char)
          if (isShiftActive && !isCapsLock) setIsShiftActive(false)
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftActive(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [keyboardMode, isShiftActive, isCapsLock])

  function handleKeyClick(key: KeyItem) {
    if (key.id === 'backspace') { handleBackspace(); return; }
    if (key.id === 'caps') { setIsCapsLock((p) => !p); return; }
    if (key.id === 'shift_l' || key.id === 'shift_r') { setIsShiftActive((p) => !p); return; }
    if (key.id === 'space') { insertText(' '); return; }
    if (key.id === 'enter') { insertText('\n'); return; }
    if (key.id === 'tab') { insertText('    '); return; }
    if (key.isFuncKey) return

    if (key.isMicKey) {
      dictationService.setTargetElement(getActiveTextarea())
      dictationService.toggle()
      return
    }

    const effShift = isShiftActive || isCapsLock
    let char = effShift ? key.shiftChar : key.normChar

    if (keyboardMode === 'arabic') {
      if (key.id === 'grave') char = 'ذ'
      else if (key.id === 'p') char = effShift ? 'ب' : 'ف'
      else if (key.id === 'g') char = 'غ'
      else if (key.id === 'c') char = effShift ? 'أ' : 'ث'
      else if (key.id === 'bracket_l') char = effShift ? 'غ' : 'ج'
      else if (key.id === 'bracket_r') char = effShift ? 'ذ' : 'د'
      else if (key.id === 'backslash') char = effShift ? 'ظ' : 'ط'
      else if (key.id === 'pepet_quick') char = '\u0651'
    }

    if (char) {
      insertText(char)
      if (isShiftActive && !isCapsLock) setIsShiftActive(false)
    }
  }

  if (!isKeyboardOpen) {
    return (
      <div className="pegon-keyboard-trigger-banner" onClick={() => setKeyboardOpen(true)}>
        <button
          type="button"
          className="btn-expand-pegon-keyboard"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconKeyboard size={15} />
          <span>Buka Papan Ketik Pegon</span>
        </button>
      </div>
    )
  }

  const isShiftEffective = isShiftActive || isCapsLock

  const renderRow = (rowItems: KeyItem[]) => (
    <div className="pegon-keyboard-row">
      {rowItems.map((item) => {
        let displayChar = isShiftEffective ? item.displayShiftChar || item.shiftChar : item.displayNormChar || item.normChar
        let displayLabel = isShiftEffective ? item.shift : item.norm

        if (keyboardMode === 'arabic') {
          if (item.id === 'grave') { displayChar = 'ذ'; displayLabel = 'dz'; }
          else if (item.id === 'p') { displayChar = isShiftEffective ? 'ب' : 'ف'; displayLabel = isShiftEffective ? 'B' : 'f'; }
          else if (item.id === 'g') { displayChar = 'غ'; displayLabel = 'gh'; }
          else if (item.id === 'c') { displayChar = isShiftEffective ? 'أ' : 'ث'; displayLabel = isShiftEffective ? 'A' : 'ts'; }
          else if (item.id === 'bracket_l') { displayChar = isShiftEffective ? 'غ' : 'ج'; displayLabel = isShiftEffective ? 'gh' : 'j'; }
          else if (item.id === 'bracket_r') { displayChar = isShiftEffective ? 'ذ' : 'د'; displayLabel = isShiftEffective ? 'dz' : 'd'; }
          else if (item.id === 'backslash') { displayChar = isShiftEffective ? 'ظ' : 'ط'; displayLabel = isShiftEffective ? 'zh' : 'th'; }
          else if (item.id === 'pepet_quick') { displayChar = '◌ّ'; displayLabel = 'tasydid'; }
        }

        const isShiftKey = item.id === 'shift_l' || item.id === 'shift_r'
        const isShiftHighlighted = isShiftKey && isShiftActive
        const isCapsKey = item.id === 'caps'
        const isSpecialPegonHighlight = item.isSpecialPegon && keyboardMode === 'pegon'

        return (
          <button
            key={item.id}
            type="button"
            className={`pegon-key-base ${isSpecialPegonHighlight ? 'key-special-pegon' : ''} ${
              item.isFuncKey ? 'key-func' : ''
            } ${item.isMicKey ? 'key-mic' : ''} ${isShiftHighlighted ? 'key-shift-active' : ''}`}
            style={{ flex: item.widthFlex }}
            onMouseDown={(e) => {
              e.preventDefault()
              handleKeyClick(item)
            }}
            title={item.isMicKey ? 'Mode Dikte Suara' : `${item.norm.toUpperCase()}${displayChar ? ` → ${displayChar}` : ''}`}
          >
            {item.isMicKey ? (
              <span className="key-mic-content">
                <IconMic size={14} />
                <span className="key-mic-label">Dikte</span>
              </span>
            ) : displayChar ? (
              <span className="key-main-arabic">{displayChar}</span>
            ) : (
              <span className="key-main-func">{displayLabel}</span>
            )}

            {!item.isMicKey && displayChar && (
              <span className={`key-sub-latin ${isSpecialPegonHighlight ? 'sub-pegon' : ''}`}>
                {displayLabel}
              </span>
            )}

            {isCapsKey && isCapsLock && <div className="caps-indicator-dot" />}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className={`pegon-keyboard-dock scale-${keyboardScale}`} dir="ltr">
      {/* Dock Header & Control Bar */}
      <div className="pegon-keyboard-header">
        <div className="dock-title-group">
          <IconKeyboard size={15} />
          <span className="dock-title">Papan Ketik Pegon</span>

          {/* Compact 3-in-1 Mode Selector */}
          <div className="pegon-mode-selector">
            <button
              type="button"
              className={`mode-toggle-btn ${keyboardMode === 'pegon' ? 'active' : ''}`}
              onClick={() => setKeyboardMode('pegon')}
              title="Mode Pegon: QWERTY Pegon Nusantara"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <IconKeyboard size={12} />
              <span>Pegon</span>
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${keyboardMode === 'translit' ? 'active' : ''}`}
              onClick={() => setKeyboardMode('translit')}
              title="Mode Transliterasi: Ketik Latin terjemah ke Pegon saat spasi"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <IconLightning size={12} />
              <span>Translit</span>
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${keyboardMode === 'arabic' ? 'active' : ''}`}
              onClick={() => setKeyboardMode('arabic')}
              title="Mode Arab: Layout Arab Hijaiyah Standar"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <IconArabic size={12} />
              <span>Arab</span>
            </button>
          </div>

          {/* Aspect-Ratio Preserving Scale Selector (S / M / L) */}
          <div className="keyboard-scale-selector" title="Skala Ukuran Keyboard (Aspect Ratio Tetap)">
            <button
              type="button"
              className={`scale-btn ${keyboardScale === 's' ? 'active' : ''}`}
              onClick={() => handleChangeScale('s')}
              title="Ukuran Ringkas (S)"
            >
              S
            </button>
            <button
              type="button"
              className={`scale-btn ${keyboardScale === 'm' ? 'active' : ''}`}
              onClick={() => handleChangeScale('m')}
              title="Ukuran Sedang (M) - Standar Proporsional"
            >
              M
            </button>
            <button
              type="button"
              className={`scale-btn ${keyboardScale === 'l' ? 'active' : ''}`}
              onClick={() => handleChangeScale('l')}
              title="Ukuran Besar (L)"
            >
              L
            </button>
          </div>

          {isCapsLock && <span className="dock-badge-caps">CAPS ON</span>}
          {isShiftActive && <span className="dock-badge-shift">SHIFT ON</span>}
        </div>

        <div className="dock-actions-group">
          {/* Suara ON / OFF Pill */}
          <button
            type="button"
            className={`dock-pill-btn ${isSoundEnabled ? 'active' : ''}`}
            onClick={() => setIsSoundEnabled((p) => !p)}
            title={isSoundEnabled ? 'Suara Tombol: Aktif (Klik untuk matikan)' : 'Suara Tombol: Senyap (Klik untuk aktifkan)'}
            aria-label="Pengaturan Suara Ketik"
          >
            {isSoundEnabled ? <IconSoundOn size={12} /> : <IconSoundMute size={12} />}
            <span>{isSoundEnabled ? 'Suara ON' : 'Suara OFF'}</span>
          </button>

          {/* Sembunyi Pill */}
          <button
            type="button"
            className="dock-pill-btn"
            onClick={() => {
              if (onClose) onClose()
              setKeyboardOpen(false)
            }}
            title="Sembunyikan Papan Ketik Pegon"
            aria-label="Sembunyi Papan Ketik"
          >
            <IconEyeHide size={12} />
            <span>Sembunyi</span>
          </button>

          {/* Panduan Pill */}
          {onOpenGuide && (
            <button
              type="button"
              className="dock-pill-btn"
              onClick={onOpenGuide}
              title="Buka Pedoman Aksara Pegon & Kaidah Vokal Alif"
              aria-label="Panduan Pegon"
            >
              <IconInfo size={12} />
              <span>Panduan</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Harakat Bar */}
      <div className="pegon-harakat-bar">
        <span className="harakat-bar-label">Harakat:</span>
        <div className="harakat-pills">
          {QUICK_HARAKAT.map((h, idx) => (
            <button
              key={idx}
              type="button"
              className={`harakat-pill ${h.isPegon ? 'harakat-pegon' : ''}`}
              title={h.label}
              onMouseDown={(e) => {
                e.preventDefault()
                insertText(h.char)
              }}
            >
              <span className="harakat-char">{h.display}</span>
              <span className="harakat-name">{h.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Rows */}
      <div className="pegon-keyboard-body">
        <div className="pegon-rows-container">
          {renderRow(KEYBOARD_ROW_1)}
          {renderRow(KEYBOARD_ROW_2)}
          {renderRow(KEYBOARD_ROW_3)}
          {renderRow(KEYBOARD_ROW_4)}
          {renderRow(KEYBOARD_ROW_5)}
        </div>
      </div>
    </div>
  )
}
