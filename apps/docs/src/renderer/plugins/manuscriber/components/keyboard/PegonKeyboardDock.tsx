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
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
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
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null)
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
    if ((e.target as HTMLElement).closest('button, input, select, .pegon-mode-selector, .keyboard-scale-selector')) {
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

      const dockWidth = dockRef.current ? dockRef.current.offsetWidth : (isMinimized ? 240 : 690)
      const dockHeight = dockRef.current ? dockRef.current.offsetHeight : (isMinimized ? 44 : 300)

      const nextX = Math.max(10, Math.min(window.innerWidth - dockWidth - 10, dragRef.current.posX + deltaX))
      const nextY = Math.max(10, Math.min(window.innerHeight - dockHeight - 10, dragRef.current.posY + deltaY))

      setPosition({ x: nextX, y: nextY })
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      if (dragRef.current) {
        const deltaX = e.clientX - dragRef.current.startX
        const deltaY = e.clientY - dragRef.current.startY
        const dockWidth = dockRef.current ? dockRef.current.offsetWidth : (isMinimized ? 240 : 690)
        const dockHeight = dockRef.current ? dockRef.current.offsetHeight : (isMinimized ? 44 : 300)
        const finalX = Math.max(10, Math.min(window.innerWidth - dockWidth - 10, dragRef.current.posX + deltaX))
        const finalY = Math.max(10, Math.min(window.innerHeight - dockHeight - 10, dragRef.current.posY + deltaY))
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
      '.staging-focus-container textarea, .manuscriber-line-card.active textarea, .manuscriber-line-card textarea, textarea.line-card-textarea, textarea.pegon-input-target, .focus-line-container textarea, .staging-line-card.active textarea, .plugin-canvas-block-textarea, textarea:focus'
    ) as HTMLTextAreaElement | null
  }

  function updateTextareaValue(
    ta: HTMLTextAreaElement,
    nextVal: string,
    nextCaretStart: number,
    nextCaretEnd = nextCaretStart
  ) {
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
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
    const isTaActive = ta && (document.activeElement === ta || (!context?.editor?.isFocused && document.querySelector('.manuscriber-workbench-body')))

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
    const isTaActive = ta && (document.activeElement === ta || (!context?.editor?.isFocused && document.querySelector('.manuscriber-workbench-body')))

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
          context.editor.chain().focus().deleteRange({ from: from - 1, to: from }).run()
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
      const activeEl = document.activeElement as HTMLElement | null
      if (activeEl) {
        if (activeEl.closest('.manuscriber-modal, .manuscriber-settings-modal, .manuscriber-guide-modal')) {
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

      if (e.key === 'Shift') { setIsShiftActive(true); return; }
      if (e.key === 'CapsLock') { return; }

      const ta = getActiveTextarea()
      const isTaActive = ta && (activeEl === ta || (!context?.editor?.isFocused && document.querySelector('.manuscriber-workbench-body')))
      const isWordActive = context?.editor && (context.editor.isFocused || activeEl?.closest('.ProseMirror, .tiptap'))

      if (!isTaActive && !isWordActive && !ta && !context?.editor) return

      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Escape'].includes(e.key)) return
      if (e.key === 'Backspace' || e.key === 'Delete') return

      if (e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        insertText('    ')
        return
      }

      // ── MODE TRANSLIT ──────────────────────────────────────────────────────────
      if (keyboardMode === 'translit') {
        // Transliterasi kata Latin saat menekan Spasi, Enter, atau Tanda Baca
        if (e.key === ' ' || e.key === 'Enter' || [',', '.', ';', ':', '!', '?'].includes(e.key)) {
          if (isTaActive && ta) {
            const start = ta.selectionStart ?? ta.value.length
            const textVal = ta.value || ''
            const textBefore = textVal.slice(0, start)
            const match = textBefore.match(/([a-zA-Z0-9'"`éèê]+)$/)

            if (match) {
              e.preventDefault()
              e.stopPropagation()
              playClick()

              const latinWord = match[1]
              const wordStart = start - latinWord.length
              const pegonWord = transliterateWord(latinWord)
              const delimiter = e.key === 'Enter' ? '\n' : e.key
              const nextVal = textVal.slice(0, wordStart) + pegonWord + delimiter + textVal.slice(start)
              const nextCaret = wordStart + pegonWord.length + delimiter.length
              updateTextareaValue(ta, nextVal, nextCaret)
              return
            }
          } else if (context?.editor) {
            const editor = context.editor
            const { from } = editor.state.selection
            const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from)
            const match = textBefore.match(/([a-zA-Z0-9'"`éèê]+)$/)

            if (match) {
              e.preventDefault()
              e.stopPropagation()
              playClick()

              const latinWord = match[1]
              const wordStart = from - latinWord.length
              const pegonWord = transliterateWord(latinWord)
              const delimiter = e.key === 'Enter' ? '\n' : e.key

              editor.chain().focus().deleteRange({ from: wordStart, to: from }).insertContent(pegonWord + delimiter).run()
              return
            }
          }
        }
        // Biarkan tombol karakter Latin biasa diketik secara natural agar pengguna dapat melihat kata sebelum spasi
        return
      }

      playClick()

      // ── MODE ARAB ─────────────────────────────────────────────────────────────
      if (keyboardMode === 'arabic') {
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
        const isPhysicalShift = e.shiftKey || isShiftActive
        const lk = e.key.toLowerCase()
        const uk = e.key.toUpperCase()

        let char: string | undefined = undefined
        if (isPhysicalShift) {
          char = ARAB_MAP_SHIFT[e.key] || ARAB_MAP_SHIFT[uk] || ARAB_MAP_SHIFT[lk]
        }
        if (!char) {
          char = ARAB_MAP_NORM[lk] || ARAB_MAP_NORM[e.key]
        }
        if (!char && isPhysicalShift) {
          char = ARAB_MAP_NORM[lk]
        }
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
          'ن': { g: 'ڠ', y: 'ۑ' },
          'د': { h: 'ڊ' },
          'ت': { h: 'ڟ' },
          'ك': { h: 'خ' },
          'س': { y: 'ش' },
          'چ': { h: 'ح' },
          'ڮ': { h: 'غ' },
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
          const isWordStart = start === 0 || charBefore <= ' ' || ',.;:!?()[]{}<>-/"\''.includes(charBefore)
          if (isWordStart) {
            if (lk === 'a') { e.preventDefault(); e.stopPropagation(); insertText(isPhysicalShift ? 'ا\u064E' : 'ا'); return; }
            if (lk === 'i') { e.preventDefault(); e.stopPropagation(); insertText(isPhysicalShift ? 'ا\u0650' : 'اي'); return; }
            if (lk === 'u') { e.preventDefault(); e.stopPropagation(); insertText(isPhysicalShift ? 'ا\u064F' : 'او'); return; }
            if (lk === 'e') { e.preventDefault(); e.stopPropagation(); insertText(isPhysicalShift ? 'ا\u0653' : 'اي'); return; }
            if (lk === 'o') { e.preventDefault(); e.stopPropagation(); insertText(isPhysicalShift ? 'ا\u0652' : 'او'); return; }
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
            editor.chain().focus().deleteRange({ from: pos - 1, to: pos }).insertContent(rep).run()
            return
          }

          // 2. Kaidah Vokal Alif Awal Kata di Word
          const isWordStart = pos <= 1 || charBefore <= ' ' || ',.;:!?()[]{}<>-/"\''.includes(charBefore)
          if (isWordStart) {
            if (lk === 'a') { e.preventDefault(); e.stopPropagation(); insertText(isPhysicalShift ? 'ا\u064E' : 'ا'); return; }
            if (lk === 'i') { e.preventDefault(); e.stopPropagation(); insertText(isPhysicalShift ? 'ا\u0650' : 'اي'); return; }
            if (lk === 'u') { e.preventDefault(); e.stopPropagation(); insertText(isPhysicalShift ? 'ا\u064F' : 'او'); return; }
            if (lk === 'e') { e.preventDefault(); e.stopPropagation(); insertText(isPhysicalShift ? 'ا\u0653' : 'اي'); return; }
            if (lk === 'o') { e.preventDefault(); e.stopPropagation(); insertText(isPhysicalShift ? 'ا\u0652' : 'او'); return; }
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
      if (e.key === 'Shift') setIsShiftActive(false)
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
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
    if (keyboardMode === 'pegon') setKeyboardMode('translit')
    else if (keyboardMode === 'translit') setKeyboardMode('arabic')
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
        {/* Drag Handle / Icon Avatar Badge */}
        <div
          className="minimized-chip-icon-badge"
          title="Papan Ketik Pegon (Klik untuk buka, seret untuk memindahkan)"
          onClick={handleRestore}
        >
          <IconKeyboard size={16} />
        </div>

        {/* Content clickable to restore */}
        <div
          className="minimized-chip-content"
          onClick={handleRestore}
          title="Klik untuk membuka kembali Papan Ketik Pegon"
        >
          <span className="minimized-chip-title">Pegon</span>
          <span
            className={`minimized-mode-badge mode-${keyboardMode}`}
            title={`Mode input: ${keyboardMode.toUpperCase()} (Klik untuk ganti)`}
            onClick={(e) => {
              e.stopPropagation()
              cycleMode()
            }}
          >
            <span className="mode-dot" />
            {keyboardMode === 'translit' ? 'TRANSLIT' : keyboardMode === 'pegon' ? 'PEGON' : 'ARAB'}
          </span>
        </div>

        {/* Actions Group */}
        <div className="minimized-chip-actions">
          {/* Quick Mode Switcher */}
          <button
            type="button"
            className="minimized-action-btn minimized-mode-cycle-btn"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              cycleMode()
            }}
            title={`Ganti mode (Saat ini: ${keyboardMode.toUpperCase()})`}
          >
            Mode
          </button>

          {/* Expand Button */}
          <button
            type="button"
            className="minimized-action-btn minimized-expand-btn"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              handleRestore()
            }}
            title="Buka Papan Ketik Pegon"
            aria-label="Buka Papan Ketik Pegon"
          >
            <IconChevronUp size={14} />
          </button>

          {/* Close Button */}
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
            ✕
          </button>
        </div>
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
          <span className="dock-title">Papan Ketik Pegon</span>

          {/* Compact 3-in-1 Mode Selector */}
          <div className="pegon-mode-selector">
            <button
              type="button"
              className={`mode-toggle-btn ${keyboardMode === 'pegon' ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                setKeyboardMode('pegon')
              }}
              title="Mode Pegon: QWERTY Pegon Nusantara Langsung"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <IconKeyboard size={12} />
              <span>Pegon</span>
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${keyboardMode === 'translit' ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                setKeyboardMode('translit')
              }}
              title="Mode Transliterasi: Ketik Latin terjemah ke Pegon saat spasi"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <IconLightning size={12} />
              <span>Translit</span>
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${keyboardMode === 'arabic' ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                setKeyboardMode('arabic')
              }}
              title="Mode Arab: Layout Arab Hijaiyah Standar"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <IconArabic size={12} />
              <span>Arab</span>
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
          <div className="keyboard-scale-selector" title="Skala Ukuran Keyboard (Aspect Ratio Tetap)">
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
            title={isSoundEnabled ? 'Suara Tombol: Aktif (Klik untuk matikan)' : 'Suara Tombol: Senyap (Klik untuk aktifkan)'}
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

      {/* Quick Harakat Bar — compact 1:1 squares, Arabic char only */}
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
