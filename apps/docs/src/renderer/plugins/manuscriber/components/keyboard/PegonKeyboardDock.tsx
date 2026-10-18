/**
 * Manuscriber Plugin — Pegon Virtual Keyboard Dock (3-in-1 Mode)
 * Papan ketik virtual ANSI QWERTY 5 baris:
 * 1. ⌨️ Pegon: Layout Pegon Nusantara + Smart Digraphs + Kaidah Alif Awal
 * 2. ⚡ Translit: Transliterasi kata Latin otomatis saat Spasi/Enter
 * 3. 🕌 Arab: Layout Hijaiyah Standar (fonetik Arab murni)
 */
import React, { useState, useEffect, useRef } from 'react'
import type { DocxPluginContext } from '../../../types'
import { useManuscriberPluginStore } from '../../store/manuscriberPluginStore'
import { dictationService } from '../../services/dictationService'
import type { KeyboardInputMode } from '../../types'
import {
  transliterateLatinToPegon,
  transliterateWord,
  hasLatinText,
  getPegonChar,
  getArabic101Char,
  ARABIC_101_KEY_DEFS,
  HAROKAT_MODE_KEYS,
  getHarokatChar,
  applyHarokatAtCursor,
  skipToNextConsonant,
  stepBackToPrevConsonantAndStrip,
} from '../../services/pegonTranslitService'
import {
  IconKeyboard,
  IconLightning,
  IconArabic,
  IconSoundOn,
  IconSoundMute,
  IconMic,
  IconEyeHide,
  IconInfo,
  IconMinus,
  IconChevronUp,
  IconDismiss,
} from '../icons/ManuscriberIcons'
import { renderHarokatIcon, HarokatFathah } from '../icons/HarakatIcons'

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

// Pemetaan tombol fisik (KeyboardEvent.code) ke KeyItem.id
const CODE_TO_KEY_ID: Record<string, string> = {
  // Baris 1: Angka & Simbol
  Backquote: 'grave',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  Digit0: '0',
  Minus: 'minus',
  Equal: 'equal',
  Backspace: 'backspace',

  // Baris 2: QWERTY
  Tab: 'tab',
  KeyQ: 'q',
  KeyW: 'w',
  KeyE: 'e',
  KeyR: 'r',
  KeyT: 't',
  KeyY: 'y',
  KeyU: 'u',
  KeyI: 'i',
  KeyO: 'o',
  KeyP: 'p',
  BracketLeft: 'bracket_l',
  BracketRight: 'bracket_r',
  Backslash: 'backslash',

  // Baris 3: ASDF
  CapsLock: 'caps',
  KeyA: 'a',
  KeyS: 's',
  KeyD: 'd',
  KeyF: 'f',
  KeyG: 'g',
  KeyH: 'h',
  KeyJ: 'j',
  KeyK: 'k',
  KeyL: 'l',
  Semicolon: 'semicolon',
  Quote: 'quote',
  Enter: 'enter',
  NumpadEnter: 'enter',

  // Baris 4: ZXCV
  ShiftLeft: 'shift_l',
  KeyZ: 'z',
  KeyX: 'x',
  KeyC: 'c',
  KeyV: 'v',
  KeyB: 'b',
  KeyN: 'n',
  KeyM: 'm',
  Comma: 'comma',
  Period: 'period',
  Slash: 'slash',
  ShiftRight: 'shift_r',

  // Baris 5: Bawah
  ControlLeft: 'ctrl_l',
  AltLeft: 'alt_l',
  Space: 'space',
  AltRight: 'alt_r',
  ControlRight: 'ctrl_r',
}

const FALLBACK_KEY_MAP: Record<string, string> = {
  '`': 'grave',
  '~': 'grave',
  '1': '1',
  '!': '1',
  '2': '2',
  '@': '2',
  '3': '3',
  '#': '3',
  '4': '4',
  $: '4',
  '5': '5',
  '%': '5',
  '6': '6',
  '^': '6',
  '7': '7',
  '&': '7',
  '8': '8',
  '*': '8',
  '9': '9',
  '(': '9',
  '0': '0',
  ')': '0',
  '-': 'minus',
  _: 'minus',
  '=': 'equal',
  '+': 'equal',
  Backspace: 'backspace',
  Tab: 'tab',
  '[': 'bracket_l',
  '{': 'bracket_l',
  ']': 'bracket_r',
  '}': 'bracket_r',
  '\\': 'backslash',
  '|': 'backslash',
  CapsLock: 'caps',
  ';': 'semicolon',
  ':': 'semicolon',
  "'": 'quote',
  '"': 'quote',
  Enter: 'enter',
  Shift: 'shift_l',
  ',': 'comma',
  '<': 'comma',
  '.': 'period',
  '>': 'period',
  '/': 'slash',
  '?': 'slash',
  Control: 'ctrl_l',
  Alt: 'alt_l',
  ' ': 'space',
}

function resolveKeyId(e: KeyboardEvent): string | undefined {
  if (e.code && CODE_TO_KEY_ID[e.code]) {
    return CODE_TO_KEY_ID[e.code]
  }
  if (e.key && FALLBACK_KEY_MAP[e.key]) {
    return FALLBACK_KEY_MAP[e.key]
  }
  if (e.key && e.key.length === 1 && /[a-z]/i.test(e.key)) {
    return e.key.toLowerCase()
  }
  return undefined
}

// BARIS 1: Number Row
const KEYBOARD_ROW_1: KeyItem[] = [
  {
    id: 'grave',
    norm: '` dh',
    normChar: 'ڊ',
    shift: '~ dzal',
    shiftChar: 'ذ',
    widthFlex: 1,
    isSpecialPegon: true,
  },
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
  {
    id: 'minus',
    norm: '- ts',
    normChar: 'ث',
    shift: '_ lam-alif',
    shiftChar: 'لا',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  {
    id: 'equal',
    norm: '= ch',
    normChar: 'ح',
    shift: '+ kho',
    shiftChar: 'خ',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  {
    id: 'backspace',
    norm: '⌫',
    normChar: '',
    shift: '⌫',
    shiftChar: '',
    widthFlex: 2,
    isFuncKey: true,
  },
]

// BARIS 2: Tab, Q W E R T Y U I O P [ ] \
const KEYBOARD_ROW_2: KeyItem[] = [
  {
    id: 'tab',
    norm: 'Tab',
    normChar: '',
    shift: 'Tab',
    shiftChar: '',
    widthFlex: 1.5,
    isFuncKey: true,
  },
  { id: 'q', norm: 'q', normChar: 'ق', shift: 'Q hamzah', shiftChar: 'ء', widthFlex: 1 },
  {
    id: 'w',
    norm: 'w',
    normChar: 'و',
    shift: 'tasydid',
    shiftChar: '\u0651',
    displayShiftChar: '◌ّ',
    widthFlex: 1,
  },
  {
    id: 'e',
    norm: 'e',
    normChar: 'ي',
    shift: 'pepet',
    shiftChar: '\u0653',
    displayShiftChar: '◌ٓ',
    widthFlex: 1,
  },
  { id: 'r', norm: 'r', normChar: 'ر', shift: 'R maddah', shiftChar: 'آ', widthFlex: 1 },
  { id: 't', norm: 't', normChar: 'ت', shift: 'T marbuthah', shiftChar: 'ة', widthFlex: 1 },
  { id: 'y', norm: 'y', normChar: 'ي', shift: 'Y maqshurah', shiftChar: 'ى', widthFlex: 1 },
  {
    id: 'u',
    norm: 'u',
    normChar: 'و',
    shift: 'dhommah',
    shiftChar: '\u064F',
    displayShiftChar: '◌ُ',
    widthFlex: 1,
  },
  {
    id: 'i',
    norm: 'i',
    normChar: 'ي',
    shift: 'kasrah',
    shiftChar: '\u0650',
    displayShiftChar: '◌ِ',
    widthFlex: 1,
  },
  {
    id: 'o',
    norm: 'o',
    normChar: 'و',
    shift: 'sukun',
    shiftChar: '\u0652',
    displayShiftChar: '◌ْ',
    widthFlex: 1,
  },
  {
    id: 'p',
    norm: 'p',
    normChar: 'ڤ',
    shift: 'P',
    shiftChar: 'ڤ',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  {
    id: 'bracket_l',
    norm: '[ ng',
    normChar: 'ڠ',
    shift: '{ gh',
    shiftChar: 'غ',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  {
    id: 'bracket_r',
    norm: '] ny',
    normChar: 'ۑ',
    shift: '} maqshurah',
    shiftChar: 'ى',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  {
    id: 'backslash',
    norm: '\\ th',
    normChar: 'ڟ',
    shift: '| marbuthah',
    shiftChar: 'ة',
    widthFlex: 1.5,
    isSpecialPegon: true,
  },
]

// BARIS 3: Caps, A S D F G H J K L ; ' Enter
const KEYBOARD_ROW_3: KeyItem[] = [
  {
    id: 'caps',
    norm: 'Caps',
    normChar: '',
    shift: 'Caps',
    shiftChar: '',
    widthFlex: 1.8,
    isFuncKey: true,
  },
  {
    id: 'a',
    norm: 'a',
    normChar: 'ا',
    shift: 'fathah',
    shiftChar: '\u064E',
    displayShiftChar: '◌َ',
    widthFlex: 1,
  },
  { id: 's', norm: 's', normChar: 'س', shift: 'S sho', shiftChar: 'ص', widthFlex: 1 },
  { id: 'd', norm: 'd', normChar: 'د', shift: 'D dlo', shiftChar: 'ض', widthFlex: 1 },
  { id: 'f', norm: 'f', normChar: 'ف', shift: 'F', shiftChar: 'ف', widthFlex: 1 },
  {
    id: 'g',
    norm: 'g',
    normChar: 'ڮ',
    shift: 'gh',
    shiftChar: 'غ',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  { id: 'h', norm: 'h', normChar: 'ه', shift: 'H ha-pedas', shiftChar: 'ح', widthFlex: 1 },
  { id: 'j', norm: 'j', normChar: 'ج', shift: 'J', shiftChar: 'ج', widthFlex: 1 },
  { id: 'k', norm: 'k', normChar: 'ك', shift: 'K qof', shiftChar: 'ق', widthFlex: 1 },
  { id: 'l', norm: 'l', normChar: 'ل', shift: 'L', shiftChar: 'ل', widthFlex: 1 },
  {
    id: 'semicolon',
    norm: '; tho',
    normChar: 'ط',
    shift: ': titik dua',
    shiftChar: ':',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  {
    id: 'quote',
    norm: "' 'ain",
    normChar: 'ع',
    shift: '" hamzah',
    shiftChar: 'ء',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  {
    id: 'enter',
    norm: 'Enter ↵',
    normChar: '\n',
    shift: 'Enter ↵',
    shiftChar: '\n',
    widthFlex: 2.2,
    isFuncKey: true,
  },
]

// BARIS 4: Shift, Z X C V B N M , . / Shift
const KEYBOARD_ROW_4: KeyItem[] = [
  {
    id: 'shift_l',
    norm: 'Shift ⇧',
    normChar: '',
    shift: 'Shift ⇧',
    shiftChar: '',
    widthFlex: 2.4,
    isFuncKey: true,
  },
  { id: 'z', norm: 'z', normChar: 'ز', shift: 'Z zho', shiftChar: 'ظ', widthFlex: 1 },
  {
    id: 'x',
    norm: 'kh',
    normChar: 'خ',
    shift: 'X ya-hamzah',
    shiftChar: 'ئ',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  {
    id: 'c',
    norm: 'c',
    normChar: 'چ',
    shift: 'C alif-atas',
    shiftChar: 'أ',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  {
    id: 'v',
    norm: 'sy',
    normChar: 'ش',
    shift: 'V alif-bawah',
    shiftChar: 'إ',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  { id: 'b', norm: 'b', normChar: 'ب', shift: 'B', shiftChar: 'ب', widthFlex: 1 },
  { id: 'n', norm: 'n', normChar: 'ن', shift: 'N', shiftChar: 'ن', widthFlex: 1 },
  { id: 'm', norm: 'm', normChar: 'م', shift: 'M', shiftChar: 'م', widthFlex: 1 },
  {
    id: 'comma',
    norm: ', sho',
    normChar: 'ص',
    shift: '< koma',
    shiftChar: '،',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  {
    id: 'period',
    norm: '. dlo',
    normChar: 'ض',
    shift: '> titik',
    shiftChar: '.',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  {
    id: 'slash',
    norm: '/ zho',
    normChar: 'ظ',
    shift: '? tanya',
    shiftChar: '؟',
    widthFlex: 1,
    isSpecialPegon: true,
  },
  {
    id: 'shift_r',
    norm: 'Shift ⇧',
    normChar: '',
    shift: 'Shift ⇧',
    shiftChar: '',
    widthFlex: 2.6,
    isFuncKey: true,
  },
]

// BARIS 5: Ctrl, Dikte, Alt, Space, Pepet Cepat, Alt, Ctrl
const KEYBOARD_ROW_5: KeyItem[] = [
  {
    id: 'ctrl_l',
    norm: 'Ctrl',
    normChar: '',
    shift: 'Ctrl',
    shiftChar: '',
    widthFlex: 1.4,
    isFuncKey: true,
  },
  {
    id: 'win',
    norm: 'Dikte',
    normChar: '',
    shift: 'Dikte',
    shiftChar: '',
    widthFlex: 1.4,
    isFuncKey: true,
    isMicKey: true,
  },
  {
    id: 'alt_l',
    norm: 'Alt',
    normChar: '',
    shift: 'Alt',
    shiftChar: '',
    widthFlex: 1.2,
    isFuncKey: true,
  },
  {
    id: 'space',
    norm: 'SPASI (SPACE)',
    normChar: ' ',
    shift: 'SPASI (SPACE)',
    shiftChar: ' ',
    widthFlex: 6.2,
    isFuncKey: true,
  },
  {
    id: 'pepet_quick',
    norm: 'pepet',
    normChar: '\u0653',
    shift: 'pepet',
    shiftChar: '\u0653',
    displayNormChar: '◌ٓ',
    displayShiftChar: '◌ٓ',
    widthFlex: 1.5,
    isSpecialPegon: true,
  },
  {
    id: 'alt_r',
    norm: 'Alt',
    normChar: '',
    shift: 'Alt',
    shiftChar: '',
    widthFlex: 1.2,
    isFuncKey: true,
  },
  {
    id: 'ctrl_r',
    norm: 'Ctrl',
    normChar: '',
    shift: 'Ctrl',
    shiftChar: '',
    widthFlex: 1.4,
    isFuncKey: true,
  },
]

const QUICK_HARAKAT = [
  { label: 'Pepet (ٓ)', char: '\u0653', display: '◌ٓ', isPegon: true },
  { label: 'Fathah (َ)', char: '\u064E', display: '◌َ' },
  { label: 'Kasrah (ِ)', char: '\u0650', display: '◌ِ' },
  { label: 'Dhommah (ُ)', char: '\u064F', display: '◌ُ' },
  { label: 'Sukun (ْ)', char: '\u0652', display: '◌ْ' },
  { label: 'Tasydid (ّ)', char: '\u0651', display: '◌ّ' },
  { label: 'Fathatain (ً)', char: '\u064B', display: '◌ً' },
  { label: 'Kasrotain (ٍ)', char: '\u064D', display: '◌ٍ' },
  { label: 'Dhumatain (ٌ)', char: '\u064C', display: '◌ٌ' },
  { label: 'Alif Khanjariyah (ٰ)', char: '\u0670', display: '◌ٰ' },
  { label: 'Hamzah (ء)', char: 'ء', display: 'ء' },
  { label: 'Waw Hamzah (ؤ)', char: 'ؤ', display: 'ؤ' },
  { label: 'Ta Marbuthah (ة)', char: 'ة', display: 'ة' },
  { label: 'Lam Alif (لا)', char: 'لا', display: 'لا' },
]

export interface PegonKeyboardDockProps {
  context?: DocxPluginContext
  onClose?: () => void
  onOpenGuide?: () => void
}

export function PegonKeyboardDock({ context, onClose, onOpenGuide }: PegonKeyboardDockProps) {
  const keyboardMode = useManuscriberPluginStore((s) => s.keyboardMode)
  const setKeyboardMode = useManuscriberPluginStore((s) => s.setKeyboardMode)
  const isKeyboardVisible = useManuscriberPluginStore((s) => s.isKeyboardVisible)
  const setIsKeyboardVisible = useManuscriberPluginStore((s) => s.setIsKeyboardVisible)
  const activeInputElement = useManuscriberPluginStore((s) => s.activeInputElement)
  const activeLineId = useManuscriberPluginStore((s) => s.activeLineId)
  const updateLine = useManuscriberPluginStore((s) => s.updateLine)
  const lines = useManuscriberPluginStore((s) => s.lines)

  const [isShiftActive, setIsShiftActive] = useState(false)
  const [isCapsLock, setIsCapsLock] = useState(false)
  const [pressedKeyIds, setPressedKeyIds] = useState<Set<string>>(new Set())
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const isKeyboardMinimized = useManuscriberPluginStore((s) => s.isKeyboardMinimized)
  const setIsKeyboardMinimized = useManuscriberPluginStore((s) => s.setIsKeyboardMinimized)
  const isMinimized = isKeyboardMinimized
  const setIsMinimized = setIsKeyboardMinimized
  const [isDragging, setIsDragging] = useState(false)

  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('manuscriber_keyboard_coords')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (
          typeof parsed.x === 'number' &&
          typeof parsed.y === 'number' &&
          parsed.x >= 0 &&
          parsed.x < window.innerWidth - 80 &&
          parsed.y >= 0 &&
          parsed.y < window.innerHeight - 80
        ) {
          return parsed
        }
      }
    } catch {}
    return null
  })

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
  const dockRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(
    null,
  )
  const dragMovedRef = useRef<boolean>(false)

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

  // Dragging event handler pada header dock
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest(
        'button, input, select, .pegon-mode-selector, .keyboard-scale-selector',
      )
    ) {
      return
    }

    const currentX = position
      ? position.x
      : dockRef.current
        ? dockRef.current.getBoundingClientRect().left
        : Math.max(20, (window.innerWidth - 690) / 2)

    const currentY = position
      ? position.y
      : dockRef.current
        ? dockRef.current.getBoundingClientRect().top
        : Math.max(20, window.innerHeight - 340)

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentX,
      posY: currentY,
    }
    dragMovedRef.current = false
    setIsDragging(true)
  }

  // Dragging event handler pada chip melayang saat diminimalkan
  const handleMinimizedMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return
    }

    dragMovedRef.current = false

    const currentX = position
      ? position.x
      : dockRef.current
        ? dockRef.current.getBoundingClientRect().left
        : Math.max(20, window.innerWidth - 260)

    const currentY = position
      ? position.y
      : dockRef.current
        ? dockRef.current.getBoundingClientRect().top
        : Math.max(20, window.innerHeight - 70)

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentX,
      posY: currentY,
    }
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const deltaX = e.clientX - dragRef.current.startX
      const deltaY = e.clientY - dragRef.current.startY

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragMovedRef.current = true
      }

      const dockWidth = dockRef.current ? dockRef.current.offsetWidth : isMinimized ? 240 : 690
      const dockHeight = dockRef.current ? dockRef.current.offsetHeight : isMinimized ? 44 : 300

      const nextX = Math.max(
        10,
        Math.min(window.innerWidth - dockWidth - 10, dragRef.current.posX + deltaX),
      )
      const nextY = Math.max(
        10,
        Math.min(window.innerHeight - dockHeight - 10, dragRef.current.posY + deltaY),
      )

      setPosition({ x: nextX, y: nextY })
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      if (dragRef.current) {
        const deltaX = e.clientX - dragRef.current.startX
        const deltaY = e.clientY - dragRef.current.startY
        const dockWidth = dockRef.current ? dockRef.current.offsetWidth : isMinimized ? 240 : 690
        const dockHeight = dockRef.current ? dockRef.current.offsetHeight : isMinimized ? 44 : 300
        const finalX = Math.max(
          10,
          Math.min(window.innerWidth - dockWidth - 10, dragRef.current.posX + deltaX),
        )
        const finalY = Math.max(
          10,
          Math.min(window.innerHeight - dockHeight - 10, dragRef.current.posY + deltaY),
        )
        const finalPos = { x: finalX, y: finalY }
        setPosition(finalPos)
        try {
          localStorage.setItem('manuscriber_keyboard_coords', JSON.stringify(finalPos))
        } catch {}
      }
      dragRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isMinimized])

  function getActiveTextarea(): HTMLTextAreaElement | null {
    const active = document.activeElement
    if (active && active.tagName === 'TEXTAREA') {
      return active as HTMLTextAreaElement
    }
    if (
      activeInputElement &&
      activeInputElement.tagName === 'TEXTAREA' &&
      document.body.contains(activeInputElement)
    ) {
      return activeInputElement as HTMLTextAreaElement
    }
    return document.querySelector(
      '.staging-focus-container textarea, .manuscriber-line-card.active textarea, .manuscriber-line-card textarea, textarea.line-card-textarea, textarea.pegon-input-target, .focus-line-container textarea, .staging-line-card.active textarea, .plugin-canvas-block-textarea, textarea:focus',
    ) as HTMLTextAreaElement | null
  }

  function updateTextareaValue(
    ta: HTMLTextAreaElement,
    nextVal: string,
    nextCaretStart: number,
    nextCaretEnd = nextCaretStart,
  ) {
    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set
    const prototype = Object.getPrototypeOf(ta)
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(ta, nextVal)
    } else if (valueSetter) {
      valueSetter.call(ta, nextVal)
    } else {
      ta.value = nextVal
    }

    ta.selectionStart = nextCaretStart
    ta.selectionEnd = nextCaretEnd
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    ta.dispatchEvent(new Event('change', { bubbles: true }))

    if (activeLineId) {
      updateLine(activeLineId, { text: nextVal })
    }
  }

  function insertText(char: string) {
    playClick()
    const ta = getActiveTextarea()
    const isTaActive =
      ta &&
      (document.activeElement === ta ||
        (!context?.editor?.isFocused && document.querySelector('.manuscriber-workbench-body')))

    if (ta && (isTaActive || !context?.editor?.isFocused)) {
      const start = ta.selectionStart ?? ta.value.length
      const end = ta.selectionEnd ?? ta.value.length
      const prev = ta.value
      const next = prev.slice(0, start) + char + prev.slice(end)
      const nextCaret = start + char.length
      updateTextareaValue(ta, next, nextCaret)
      ta.focus()
      return
    }

    // Jika di Dokumen Word (Tiptap ProseMirror)
    if (context?.editor) {
      context.editor.chain().focus().insertContent(char).run()
      return
    }

    if (context?.actions?.insertText) {
      context.actions.insertText(char)
      return
    }

    if (ta) {
      const start = ta.selectionStart ?? ta.value.length
      const end = ta.selectionEnd ?? ta.value.length
      const prev = ta.value
      const next = prev.slice(0, start) + char + prev.slice(end)
      const nextCaret = start + char.length
      updateTextareaValue(ta, next, nextCaret)
      ta.focus()
    }
  }

  function handleBackspace() {
    playClick()
    const ta = getActiveTextarea()
    const isTaActive =
      ta &&
      (document.activeElement === ta ||
        (!context?.editor?.isFocused && document.querySelector('.manuscriber-workbench-body')))

    if (ta && (isTaActive || !context?.editor?.isFocused)) {
      let start = ta.selectionStart ?? ta.value.length
      let end = ta.selectionEnd ?? ta.value.length
      const prev = ta.value
      if (start === end) {
        if (start === 0) return
        start = start - 1
      }
      const next = prev.slice(0, start) + prev.slice(end)
      updateTextareaValue(ta, next, start)
      ta.focus()
      return
    }

    if (context?.editor) {
      const { from, to, empty } = context.editor.state.selection
      if (empty) {
        if (from > 1) {
          context.editor
            .chain()
            .focus()
            .deleteRange({ from: from - 1, to: from })
            .run()
        }
      } else {
        context.editor.chain().focus().deleteRange({ from, to }).run()
      }
    }
  }

  // Intersep Keyboard Fisik Penuh (Hardware Keyboard Takeover)
  useEffect(() => {
    if (!isKeyboardVisible) return

    const onKeyDown = (e: KeyboardEvent) => {
      // Keystroke visual reaction: catat tombol fisik yang sedang ditekan
      const pressedId = resolveKeyId(e)
      if (pressedId) {
        setPressedKeyIds((prev) => {
          if (prev.has(pressedId)) return prev
          const next = new Set(prev)
          next.add(pressedId)
          return next
        })
      }

      const activeEl = document.activeElement as HTMLElement | null
      if (activeEl) {
        if (
          activeEl.closest(
            '.manuscriber-modal, .manuscriber-settings-modal, .manuscriber-guide-modal',
          )
        ) {
          return
        }
        if (activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type === 'text') {
          if (!activeEl.classList.contains('pegon-input-target')) return
        }
      }

      if (typeof e.getModifierState === 'function') {
        const caps = e.getModifierState('CapsLock')
        if (caps !== isCapsLock) {
          setIsCapsLock(caps)
        }
      }

      if (e.key === 'Shift') {
        setIsShiftActive(true)
        return
      }
      if (e.key === 'CapsLock') {
        return
      }

      const ta = getActiveTextarea()
      const isTaActive =
        ta &&
        (activeEl === ta ||
          (!context?.editor?.isFocused && document.querySelector('.manuscriber-workbench-body')))
      const isWordActive =
        context?.editor && (context.editor.isFocused || activeEl?.closest('.ProseMirror, .tiptap'))

      if (!isTaActive && !isWordActive && !ta && !context?.editor) return

      // ── Mode Pegon Shortcut Alt: Alt+W (ؤ), Alt+A (ً), Alt+I (ٍ), Alt+U (ٌ) ──
      if (keyboardMode === 'pegon' && e.altKey && !e.ctrlKey && !e.metaKey) {
        const altChar = getPegonChar(e.key, e.shiftKey || isShiftActive, true)
        if (altChar) {
          e.preventDefault()
          e.stopPropagation()
          playClick()
          insertText(altChar)
          if (isShiftActive) setIsShiftActive(false)
          return
        }
      }

      // ── MODE HAROKAT CEPAT (Fast Harakat with Auto-Advance) ───────────────────
      if (keyboardMode === 'harokat') {
        const isPhysicalShift = e.shiftKey || isShiftActive

        // Navigasi panah tetap dibiarkan bebas
        if (
          [
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
            'PageUp',
            'PageDown',
            'Escape',
          ].includes(e.key)
        )
          return

        // 1. Spasi: Lewati 1 konsonan (Skip ke konsonan berikutnya tanpa menyisipkan spasi)
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault()
          e.stopPropagation()
          playClick()
          if (isTaActive && ta) {
            const currentPos = ta.selectionStart || 0
            const nextCaret = skipToNextConsonant(ta.value, currentPos)
            ta.selectionStart = nextCaret
            ta.selectionEnd = nextCaret
          }
          return
        }

        // 2. Backspace: Hapus harakat di konsonan sebelumnya lalu mundur
        if (e.key === 'Backspace') {
          if (isTaActive && ta) {
            e.preventDefault()
            e.stopPropagation()
            playClick()
            const currentPos = ta.selectionStart || 0
            const { nextText, nextCaret } = stepBackToPrevConsonantAndStrip(ta.value, currentPos)
            updateTextareaValue(ta, nextText, nextCaret)
          }
          return
        }

        // 3. Tombol Harakat: o, p, [, ], l, ;, ' (normal & shift)
        const harokat = getHarokatChar(e.key, isPhysicalShift)
        if (harokat) {
          e.preventDefault()
          e.stopPropagation()
          playClick()

          if (isTaActive && ta) {
            const start = ta.selectionStart || 0
            const end = ta.selectionEnd || 0
            const { nextText, nextCaret } = applyHarokatAtCursor(
              ta.value,
              start,
              end,
              harokat.char,
              harokat.isTasydid,
            )
            updateTextareaValue(ta, nextText, nextCaret)
          } else if (context?.editor) {
            context.editor.chain().focus().insertContent(harokat.char).run()
          } else {
            insertText(harokat.char)
          }

          if (isShiftActive) setIsShiftActive(false)
          return
        }

        // Cegah tombol huruf acak lain agar pengguna fokus hanya pada tombol harokat
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }

      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (
        [
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          'Home',
          'End',
          'PageUp',
          'PageDown',
          'Escape',
        ].includes(e.key)
      )
        return
      if (e.key === 'Backspace' || e.key === 'Delete') return

      if (e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        insertText('    ')
        return
      }

      playClick()

      // ── MODE ARAB (Penataan Standar Windows Arabic 101 Lengkap) ───────────────
      if (keyboardMode === 'arabic') {
        const isPhysicalShift = e.shiftKey || isShiftActive
        const char = getArabic101Char(e.key, isPhysicalShift)

        if (char) {
          e.preventDefault()
          e.stopPropagation()
          insertText(char)
          if (isShiftActive) setIsShiftActive(false)
        }
        return
      }

      // ── MODE PEGON ────────────────────────────────────────────────────────────
      if (keyboardMode === 'pegon') {
        const DIGRAPHS: Record<string, Record<string, string>> = {
          ن: { g: 'ڠ', y: 'ۑ' },
          د: { h: 'ڊ' },
          ت: { h: 'ڟ' },
          ك: { h: 'خ' },
          س: { y: 'ش' },
          چ: { h: 'ح' },
          ڮ: { h: 'غ' },
        }

        const isPhysicalShift = e.shiftKey || isShiftActive
        const lk = e.key.toLowerCase()

        // Cek target textarea
        if (isTaActive && ta) {
          const start = ta.selectionStart ?? 0
          const textVal = ta.value || ''
          const charBefore = start > 0 ? textVal[start - 1] : ''

          // 1. Smart Digraphs (Case-Insensitive)
          if (charBefore && DIGRAPHS[charBefore] && DIGRAPHS[charBefore][lk]) {
            e.preventDefault()
            e.stopPropagation()
            const rep = DIGRAPHS[charBefore][lk]
            const repStart = start - 1
            const nextVal = textVal.slice(0, repStart) + rep + textVal.slice(start)
            const nextCaret = repStart + rep.length
            updateTextareaValue(ta, nextVal, nextCaret)
            return
          }

          // 2. Kaidah Vokal Alif Awal Kata
          const isWordStart =
            start === 0 || charBefore <= ' ' || ',.;:!?()[]{}<>-/"\''.includes(charBefore)
          if (isWordStart) {
            if (lk === 'a') {
              e.preventDefault()
              e.stopPropagation()
              insertText(isPhysicalShift ? 'ا\u064E' : 'ا')
              return
            }
            if (lk === 'i') {
              e.preventDefault()
              e.stopPropagation()
              insertText(isPhysicalShift ? 'ا\u0650' : 'اي')
              return
            }
            if (lk === 'u') {
              e.preventDefault()
              e.stopPropagation()
              insertText(isPhysicalShift ? 'ا\u064F' : 'او')
              return
            }
            if (lk === 'e') {
              e.preventDefault()
              e.stopPropagation()
              insertText(isPhysicalShift ? 'ا\u0653' : 'اي')
              return
            }
            if (lk === 'o') {
              e.preventDefault()
              e.stopPropagation()
              insertText(isPhysicalShift ? 'ا\u0652' : 'او')
              return
            }
          }
        } else if (context?.editor) {
          // Target Word Editor (Tiptap)
          const editor = context.editor
          const { from, empty } = editor.state.selection
          const pos = from
          const charBefore = pos > 1 && empty ? editor.state.doc.textBetween(pos - 1, pos) : ''

          // 1. Smart Digraphs di Word (Case-Insensitive)
          if (charBefore && DIGRAPHS[charBefore] && DIGRAPHS[charBefore][lk]) {
            e.preventDefault()
            e.stopPropagation()
            const rep = DIGRAPHS[charBefore][lk]
            editor
              .chain()
              .focus()
              .deleteRange({ from: pos - 1, to: pos })
              .insertContent(rep)
              .run()
            return
          }

          // 2. Kaidah Vokal Alif Awal Kata di Word
          const isWordStart =
            pos <= 1 || charBefore <= ' ' || ',.;:!?()[]{}<>-/"\''.includes(charBefore)
          if (isWordStart) {
            if (lk === 'a') {
              e.preventDefault()
              e.stopPropagation()
              insertText(isPhysicalShift ? 'ا\u064E' : 'ا')
              return
            }
            if (lk === 'i') {
              e.preventDefault()
              e.stopPropagation()
              insertText(isPhysicalShift ? 'ا\u0650' : 'اي')
              return
            }
            if (lk === 'u') {
              e.preventDefault()
              e.stopPropagation()
              insertText(isPhysicalShift ? 'ا\u064F' : 'او')
              return
            }
            if (lk === 'e') {
              e.preventDefault()
              e.stopPropagation()
              insertText(isPhysicalShift ? 'ا\u0653' : 'اي')
              return
            }
            if (lk === 'o') {
              e.preventDefault()
              e.stopPropagation()
              insertText(isPhysicalShift ? 'ا\u0652' : 'او')
              return
            }
          }
        }

        // 3. Pemetaan Pegon Case-Insensitive (Bekerja Baik Huruf Kecil Maupun CapsLock)
        const char = getPegonChar(e.key, isPhysicalShift)
        if (char) {
          e.preventDefault()
          e.stopPropagation()
          insertText(char)
          if (isShiftActive) setIsShiftActive(false)
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const pressedId = resolveKeyId(e)
      if (pressedId) {
        setPressedKeyIds((prev) => {
          if (!prev.has(pressedId)) return prev
          const next = new Set(prev)
          next.delete(pressedId)
          return next
        })
      }
      if (e.key === 'Shift') setIsShiftActive(false)
    }

    const onWindowBlur = () => {
      setPressedKeyIds(new Set())
      setIsShiftActive(false)
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [keyboardMode, isShiftActive, isCapsLock, isKeyboardVisible, context])

  const currentLine = lines.find((l) => l.id === activeLineId)
  const currentText = currentLine?.text || ''
  const hasLatin = hasLatinText(currentText)

  const handleTransliterateActiveText = () => {
    playClick()
    const ta = getActiveTextarea()
    const textToConvert = ta?.value || currentText
    if (!textToConvert) return

    const converted = transliterateLatinToPegon(textToConvert)
    if (ta) {
      updateTextareaValue(ta, converted, converted.length)
      ta.focus()
    } else if (activeLineId) {
      updateLine(activeLineId, { text: converted })
    }
  }

  function handleKeyClick(key: KeyItem) {
    if (keyboardMode === 'harokat') {
      const ta = getActiveTextarea()
      const isTaActive =
        ta &&
        (document.activeElement === ta ||
          (!context?.editor?.isFocused && document.querySelector('.manuscriber-workbench-body')))
      const effShift = isShiftActive || isCapsLock

      if (key.id === 'space') {
        playClick()
        if (ta && isTaActive) {
          const currentPos = ta.selectionStart || 0
          const nextCaret = skipToNextConsonant(ta.value, currentPos)
          ta.selectionStart = nextCaret
          ta.selectionEnd = nextCaret
        }
        return
      }

      if (key.id === 'backspace') {
        playClick()
        if (ta && isTaActive) {
          const currentPos = ta.selectionStart || 0
          const { nextText, nextCaret } = stepBackToPrevConsonantAndStrip(ta.value, currentPos)
          updateTextareaValue(ta, nextText, nextCaret)
        }
        return
      }

      if (key.id === 'shift_l' || key.id === 'shift_r') {
        setIsShiftActive((p) => !p)
        return
      }

      const harokat = getHarokatChar(key.id, effShift)
      if (harokat) {
        playClick()
        if (ta && isTaActive) {
          const start = ta.selectionStart || 0
          const end = ta.selectionEnd || 0
          const { nextText, nextCaret } = applyHarokatAtCursor(
            ta.value,
            start,
            end,
            harokat.char,
            harokat.isTasydid,
          )
          updateTextareaValue(ta, nextText, nextCaret)
        } else if (context?.editor) {
          context.editor.chain().focus().insertContent(harokat.char).run()
        } else {
          insertText(harokat.char)
        }
        if (isShiftActive && !isCapsLock) setIsShiftActive(false)
        return
      }

      return
    }

    if (key.id === 'backspace') {
      handleBackspace()
      return
    }
    if (key.id === 'caps') {
      setIsCapsLock((p) => !p)
      return
    }
    if (key.id === 'shift_l' || key.id === 'shift_r') {
      setIsShiftActive((p) => !p)
      return
    }
    if (key.id === 'space') {
      insertText(' ')
      return
    }
    if (key.id === 'enter') {
      insertText('\n')
      return
    }
    if (key.id === 'tab') {
      insertText('    ')
      return
    }
    if (key.isFuncKey) return

    if (key.isMicKey) {
      dictationService.setTargetElement(getActiveTextarea())
      dictationService.toggle()
      return
    }

    const effShift = isShiftActive || isCapsLock
    let char = effShift ? key.shiftChar : key.normChar

    if (keyboardMode === 'arabic') {
      const arabDef = ARABIC_101_KEY_DEFS[key.id]
      if (arabDef) {
        char = effShift ? arabDef.shift : arabDef.norm
      }
    }

    if (char) {
      insertText(char)
      if (isShiftActive && !isCapsLock) setIsShiftActive(false)
    }
  }

  // Pintasan Keyboard Global Manuscriber:
  // - Ctrl + Q : Buka / Tutup Virtual Keyboard Pegon
  // - Ctrl + Shift + Q : Minimize / Maximize Virtual Keyboard Pegon
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // 1. Ctrl + Shift + Q: Minimize / Maximize Keyboard
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault()
        e.stopImmediatePropagation()
        const s = useManuscriberPluginStore.getState()
        if (!s.isKeyboardVisible) {
          s.setIsKeyboardVisible(true)
          s.setIsKeyboardMinimized(false)
        } else {
          s.toggleKeyboardMinimized()
        }
        return
      }

      // 2. Ctrl + Q (tanpa Shift): Buka / Tutup Keyboard
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (e.key === 'q' || e.key === 'Q')
      ) {
        e.preventDefault()
        e.stopImmediatePropagation()
        useManuscriberPluginStore.getState().toggleKeyboardVisible()
        return
      }
    }

    window.addEventListener('keydown', handleGlobalShortcuts, true)
    return () => window.removeEventListener('keydown', handleGlobalShortcuts, true)
  }, [])

  if (!isKeyboardVisible) return null

  const handleRestore = () => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }
    if (position) {
      const estimatedWidth = keyboardScale === 's' ? 580 : keyboardScale === 'l' ? 800 : 690
      const estimatedHeight = 320
      const clampedX = Math.max(10, Math.min(window.innerWidth - estimatedWidth - 10, position.x))
      const clampedY = Math.max(10, Math.min(window.innerHeight - estimatedHeight - 10, position.y))
      setPosition({ x: clampedX, y: clampedY })
    }
    setIsMinimized(false)
  }

  const cycleMode = () => {
    if (keyboardMode === 'pegon') setKeyboardMode('arabic')
    else if (keyboardMode === 'arabic') setKeyboardMode('harokat')
    else setKeyboardMode('pegon')
  }

  if (isMinimized) {
    return (
      <div
        ref={dockRef}
        className={`pegon-keyboard-minimized-chip ${isDragging ? 'is-dragging' : ''}`}
        style={
          position
            ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
            : { bottom: 24, right: 32 }
        }
        onMouseDown={handleMinimizedMouseDown}
        dir="ltr"
        role="region"
        aria-label="Papan Ketik Pegon Diminimalkan"
      >
        {/* Drag Handle / Icon Button Avatar: Klik untuk membuka/maximize papan ketik */}
        <button
          type="button"
          className="minimized-chip-icon-badge"
          title="Buka Papan Ketik Pegon (Klik untuk membuka / memperbesar)"
          aria-label="Buka Papan Ketik Pegon"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            handleRestore()
          }}
        >
          <IconKeyboard size={15} />
        </button>

        {/* Mode Switcher Button: Klik langsung untuk berganti mode (Fluent UI) */}
        <button
          type="button"
          className="minimized-mode-badge"
          title={`Mode input: ${keyboardMode.toUpperCase()} (Klik untuk beralih mode)`}
          aria-label={`Mode input: ${keyboardMode.toUpperCase()}, klik untuk beralih mode`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            cycleMode()
          }}
        >
          <span className="mode-dot" />
          <span className="mode-text">
            {keyboardMode === 'pegon' ? 'PEGON' : keyboardMode === 'arabic' ? 'ARAB' : 'HAROKAT'}
          </span>
        </button>

        {/* Actions Group */}
        <div className="minimized-chip-actions">
          {/* Close Button dengan styling X Fluent UI yang bagus */}
          <button
            type="button"
            className="minimized-action-btn minimized-close-btn"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              if (onClose) onClose()
              setIsKeyboardVisible(false)
            }}
            title="Tutup Papan Ketik"
            aria-label="Tutup Papan Ketik"
          >
            <IconDismiss size={11} />
          </button>
        </div>
      </div>
    )
  }

  const isShiftEffective = isShiftActive || isCapsLock

  const renderRow = (rowItems: KeyItem[]) => (
    <div className="pegon-keyboard-row">
      {rowItems.map((item) => {
        let displayChar = isShiftEffective
          ? item.displayShiftChar || item.shiftChar
          : item.displayNormChar || item.normChar
        let displayLabel = isShiftEffective ? item.shift : item.norm

        if (keyboardMode === 'arabic') {
          const arabDef = ARABIC_101_KEY_DEFS[item.id]
          if (arabDef) {
            displayChar = isShiftEffective
              ? arabDef.displayShift || arabDef.shift
              : arabDef.displayNorm || arabDef.norm
            displayLabel = isShiftEffective ? arabDef.shiftLabel : arabDef.normLabel
          }
        }

        let isHarokatActiveKey = false
        let isHarokatGhost = false
        let isHarokatSpace = false
        let harokatBadge = ''

        if (keyboardMode === 'harokat') {
          const hDef = HAROKAT_MODE_KEYS[item.id]
          if (hDef) {
            isHarokatActiveKey = true
            harokatBadge = hDef.displayKey
            displayChar =
              isShiftEffective && hDef.displayShift ? hDef.displayShift : hDef.displayNorm
            displayLabel = isShiftEffective && hDef.shiftLabel ? hDef.shiftLabel : hDef.label
          } else if (item.id === 'space') {
            isHarokatSpace = true
            harokatBadge = 'Space'
            displayChar = ''
            displayLabel = 'LEWATI HURUF (SKIP ⇥)'
          } else if (item.id === 'backspace') {
            displayChar = ''
            displayLabel = '⌫ BATAL'
          } else if (item.id === 'shift_l' || item.id === 'shift_r') {
            displayChar = ''
            displayLabel = isShiftActive ? '⇧ TANWIN ON' : '⇧ SHIFT (TANWIN)'
          } else {
            isHarokatGhost = true
            displayChar = ''
            displayLabel = item.norm.toUpperCase()
          }
        }

        const isShiftKey = item.id === 'shift_l' || item.id === 'shift_r'
        const isShiftHighlighted = isShiftKey && isShiftActive
        const isCapsKey = item.id === 'caps'
        const isSpecialPegonHighlight = item.isSpecialPegon && keyboardMode === 'pegon'
        const isPhysicallyPressed = pressedKeyIds.has(item.id)

        const extraClasses = [
          isPhysicallyPressed ? 'is-physically-pressed' : '',
          isSpecialPegonHighlight ? 'key-special-pegon' : '',
          item.isFuncKey ? 'key-func' : '',
          item.isMicKey ? 'key-mic' : '',
          isShiftHighlighted ? 'key-shift-active' : '',
          isHarokatActiveKey ? 'key-harokat-active' : '',
          isHarokatGhost ? 'key-harokat-ghost' : '',
          isHarokatSpace ? 'key-harokat-space-active' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <button
            key={item.id}
            type="button"
            className={`pegon-key-base ${extraClasses}`}
            style={{
              flex: item.widthFlex,
              ...(isHarokatGhost ? { pointerEvents: 'none', cursor: 'default' } : {}),
            }}
            tabIndex={isHarokatGhost ? -1 : 0}
            onMouseDown={(e) => {
              e.preventDefault()
              if (!isHarokatGhost) handleKeyClick(item)
            }}
            title={
              isHarokatGhost
                ? ''
                : item.isMicKey && keyboardMode !== 'harokat'
                  ? 'Mode Dikte Suara'
                  : `${displayLabel}${displayChar ? ` → ${displayChar}` : ''}`
            }
          >
            {/* Badge Tombol Fisik Khusus Mode Harokat */}
            {keyboardMode === 'harokat' && isHarokatActiveKey && (
              <span className="harokat-key-badge">{harokatBadge}</span>
            )}

            {item.isMicKey && keyboardMode !== 'harokat' ? (
              <span className="key-mic-content">
                <IconMic size={14} />
                <span className="key-mic-label">Dikte</span>
              </span>
            ) : keyboardMode === 'harokat' && isHarokatActiveKey ? (
              <span className="key-harokat-icon-container">
                {renderHarokatIcon(item.id, isShiftEffective, 25)}
              </span>
            ) : displayChar ? (
              <span className="key-main-arabic">{displayChar}</span>
            ) : (
              <span className="key-main-func">{displayLabel}</span>
            )}

            {keyboardMode !== 'harokat' && !item.isMicKey && displayChar && (
              <span className={`key-sub-latin ${isSpecialPegonHighlight ? 'sub-pegon' : ''}`}>
                {displayLabel}
              </span>
            )}

            {keyboardMode === 'harokat' && isHarokatActiveKey && (
              <span className="harokat-sub-latin">{displayLabel}</span>
            )}

            {isCapsKey && isCapsLock && <div className="caps-indicator-dot" />}
          </button>
        )
      })}
    </div>
  )

  return (
    <div
      ref={dockRef}
      className={`pegon-keyboard-dock scale-${keyboardScale} ${isDragging ? 'is-dragging' : ''}`}
      style={
        position
          ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
          : { bottom: 24, right: 32 }
      }
      dir="ltr"
    >
      {/* Dock Header & Control Bar (Draggable) */}
      <div className="pegon-keyboard-header" onMouseDown={handleHeaderMouseDown}>
        <div className="dock-title-group">
          <IconKeyboard size={15} />
          <span className="dock-title">Qeyboard</span>

          {/* 3 Mode Selector: Pegon, Arab, Harokat */}
          <div className="pegon-mode-selector">
            <button
              type="button"
              className={`mode-toggle-btn ${keyboardMode === 'pegon' ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                setKeyboardMode('pegon')
              }}
              title="Mode Pegon: Layout Pegon Nusantara (QWERTY Fonetik Pegon)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <IconKeyboard size={12} />
              <span>Pegon</span>
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${keyboardMode === 'arabic' ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                setKeyboardMode('arabic')
              }}
              title="Mode Arab: Layout Standar Lengkap Total On-Screen Keyboard Windows (Arabic 101)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <IconArabic size={12} />
              <span>Arab</span>
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${keyboardMode === 'harokat' ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                setKeyboardMode('harokat')
              }}
              title="Mode Harokat: Papan khusus harokatisasi cepat dengan Auto-Advance kursor otomatis"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <HarokatFathah size={14} />
              <span>Harokat</span>
            </button>
          </div>

          {/* Quick Action: Ubah teks Latin di baris aktif ke Pegon */}
          {hasLatin && (
            <button
              type="button"
              className="dock-translit-action-btn"
              onMouseDown={(e) => {
                e.preventDefault()
                handleTransliterateActiveText()
              }}
              title="Transliterasikan kata Latin di baris aktif ini langsung menjadi Pegon"
            >
              <IconLightning size={11} />
              <span>Ubah ke Pegon</span>
            </button>
          )}

          {/* Aspect-Ratio Preserving Scale Selector (S / M / L) */}
          <div
            className="keyboard-scale-selector"
            title="Skala Ukuran Keyboard (Aspect Ratio Tetap)"
          >
            <button
              type="button"
              className={`scale-btn ${keyboardScale === 's' ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                handleChangeScale('s')
              }}
              title="Ukuran Ringkas (S)"
            >
              S
            </button>
            <button
              type="button"
              className={`scale-btn ${keyboardScale === 'm' ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                handleChangeScale('m')
              }}
              title="Ukuran Sedang (M) - Standar Proporsional"
            >
              M
            </button>
            <button
              type="button"
              className={`scale-btn ${keyboardScale === 'l' ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                handleChangeScale('l')
              }}
              title="Ukuran Besar (L)"
            >
              L
            </button>
          </div>

          {isCapsLock && <span className="dock-badge-caps">CAPS ON</span>}
          {isShiftActive && <span className="dock-badge-shift">SHIFT ON</span>}
        </div>

        <div className="dock-actions-group">
          {/* Suara ON / OFF — icon only */}
          <button
            type="button"
            className={`dock-icon-btn ${isSoundEnabled ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsSoundEnabled((p) => !p)}
            title={
              isSoundEnabled
                ? 'Suara Tombol: Aktif (Klik untuk matikan)'
                : 'Suara Tombol: Senyap (Klik untuk aktifkan)'
            }
            aria-label="Pengaturan Suara Ketik"
          >
            {isSoundEnabled ? <IconSoundOn size={13} /> : <IconSoundMute size={13} />}
          </button>

          {/* Panduan — icon only */}
          {onOpenGuide && (
            <button
              type="button"
              className="dock-icon-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onOpenGuide}
              title="Buka Pedoman Aksara Pegon & Kaidah Vokal Alif"
              aria-label="Panduan Pegon"
            >
              <IconInfo size={13} />
            </button>
          )}

          {/* Kecilkan [−] */}
          <button
            type="button"
            className="dock-icon-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsMinimized(true)}
            title="Kecilkan ke Chip Melayang Ringkas"
            aria-label="Kecilkan Papan Ketik"
          >
            <IconMinus size={13} />
          </button>

          {/* Tutup [✕] — paling kanan */}
          <button
            type="button"
            className="dock-icon-btn dock-icon-btn-close"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (onClose) onClose()
              setIsKeyboardVisible(false)
            }}
            title="Tutup Papan Ketik Pegon"
            aria-label="Tutup Papan Ketik"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Bar Harakat: Quick Harakat (di Pegon & Arab) atau Banner Informatif Auto-Advance (di Harokat) */}
      {keyboardMode === 'harokat' ? (
        <div className="harokat-status-banner">
          <div className="harokat-status-pill">
            <span className="harokat-pulse-dot" />
            <span>AUTO-ADVANCE ON</span>
          </div>
          <div className="harokat-status-guide">
            Ketik tombol fisik <strong>]</strong> Fathah, <strong>[</strong> Kasroh,{' '}
            <strong>P</strong> Dhumah, <strong>O</strong> Sukun, <strong>L</strong> Tasydid. Kursor
            otomatis maju!
          </div>
          <div className="harokat-status-tags">
            <span className="harokat-mini-tag">
              <kbd>Space</kbd> Lewati ⇥
            </span>
            <span className="harokat-mini-tag">
              <kbd>⌫</kbd> Mundur
            </span>
            <span className="harokat-mini-tag">
              <kbd>Shift</kbd> Tanwin
            </span>
          </div>
        </div>
      ) : (
        <div className="pegon-harakat-bar">
          <span className="harakat-bar-label">Harakat:</span>
          <div className="harakat-pills">
            {QUICK_HARAKAT.map((h, idx) => (
              <button
                key={idx}
                type="button"
                className={`harakat-square ${h.isPegon ? 'harakat-pegon' : ''}`}
                title={h.label}
                onMouseDown={(e) => {
                  e.preventDefault()
                  insertText(h.char)
                }}
              >
                {h.display}
              </button>
            ))}
          </div>
        </div>
      )}

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
