/**
 * Manuscriber Plugin — Pegon Transliteration Service
 * Mesin transliterasi cerdas Latin ke Pegon Nusantara (Jawa, Sunda, Melayu, Madura, Indonesia).
 * Mendukung kaidah:
 * 1. Kaidah Vokal Alif Awal Kata (alif mandiri, alif-ya, alif-wau)
 * 2. Digraf Konsonan Pegon (ng -> ڠ, ny -> ۑ, dh -> ڊ, th -> ڟ, ch/c -> چ, p -> ڤ, g -> ڮ, kh -> خ, sy -> ش)
 * 3. Vokal Medial & Final (a, i, u, e, o, pepet)
 * 4. Kosakata Turats & Khusus (Allah, bismillah, santri, pesantren, kitab, ulama, dsb.)
 */

// Kamus kata khusus yang memiliki ejaan baku/serapan Turats
const SPECIAL_WORDS: Record<string, string> = {
  allah: 'الله',
  lillah: 'لله',
  billah: 'بالله',
  alhamdulillah: 'الحمد لله',
  bismillah: 'بسم الله',
  bismillahi: 'بسم الله',
  subhanallah: 'سبحان الله',
  masyaallah: 'ما شاء الله',
  mashaallah: 'ما شاء الله',
  insyaallah: 'إن شاء الله',
  inshaallah: 'إن شاء الله',
  assalamualaikum: 'السلام عليكم',
  "assalamu'alaikum": 'السلام عليكم',
  waalaikumsalam: 'وعليكم السلام',
  "wa'alaikumussalam": 'وعليكم السلام',
  muhammad: 'محمد',
  rasulullah: 'رسول الله',
  nabi: 'نبي',
  islam: 'إسلام',
  iman: 'إيمان',
  ihsan: 'إحسان',
  quran: 'قرآن',
  'al-quran': 'القرآن',
  alquran: 'القرآن',
  hadits: 'حديث',
  hadis: 'حديث',
  sunnah: 'سنة',
  fiqih: 'فقه',
  fikih: 'فقه',
  tafsir: 'تفسير',
  tasawuf: 'تصوف',
  tauhid: 'توحيد',
  santri: 'سنتري',
  pesantren: 'ڤسانترين',
  kiai: 'كياي',
  kyai: 'كياي',
  gus: 'ڮوس',
  ajengan: 'اجڠن',
  kitab: 'كتاب',
  kutub: 'كتب',
  matan: 'متن',
  syarah: 'شرح',
  hasyiah: 'حاشية',
  hasyiyah: 'حاشية',
  nadzom: 'نظم',
  nadhom: 'نظم',
  makna: 'معنى',
  gandul: 'ڮاندول',
  utawi: 'اوتاوي',
  iku: 'ايكو',
  kelawan: 'كلاوان',
  saking: 'ساكيڠ',
  ing: 'ايڠ',
  marang: 'ماراڠ',
  ana: 'انا',
  sira: 'سيرا',
}

// Digraf Pegon (2 huruf Latin -> 1 huruf Pegon)
const DIGRAPHS: Record<string, string> = {
  ng: 'ڠ',
  ny: 'ۑ',
  dh: 'ڊ',
  th: 'ڟ',
  ch: 'چ',
  kh: 'خ',
  sy: 'ش',
  sh: 'ش',
  gh: 'غ',
  ts: 'ث',
  dz: 'ذ',
  zh: 'ظ',
}

// Konsonan Tunggal Pegon
const SINGLE_CONSONANTS: Record<string, string> = {
  b: 'ب',
  c: 'چ',
  d: 'د',
  f: 'ف',
  g: 'ڮ',
  h: 'ه',
  j: 'ج',
  k: 'ك',
  l: 'ل',
  m: 'م',
  n: 'ن',
  p: 'ڤ',
  q: 'ق',
  r: 'ر',
  s: 'س',
  t: 'ت',
  v: 'ڤ',
  w: 'و',
  y: 'ي',
  z: 'ز',
  "'": 'ع',
  '`': 'ع',
}

/**
 * Transliterasi satu kata Latin ke Pegon Nusantara
 */
export function transliterateWord(rawWord: string): string {
  if (!rawWord) return ''
  const lower = rawWord.toLowerCase()

  // 1. Cek kata khusus
  if (SPECIAL_WORDS[lower]) {
    return SPECIAL_WORDS[lower]
  }

  let result = ''
  let i = 0
  const len = rawWord.length

  while (i < len) {
    const isStart = i === 0
    const char = lower[i]
    const nextChar = i + 1 < len ? lower[i + 1] : ''
    const twoChars = char + nextChar

    // 2. Cek Digraf (ng, ny, dh, th, ch, kh, sy, sh, gh, ts, dz, zh)
    if (DIGRAPHS[twoChars]) {
      result += DIGRAPHS[twoChars]
      i += 2
      continue
    }

    // 3. Kaidah Vokal Awal Kata (Kaidah Vokal Alif Pegon)
    if (isStart) {
      if (char === 'a') {
        result += 'ا'
        i++
        continue
      }
      if (char === 'i') {
        result += 'اي'
        i++
        continue
      }
      if (char === 'u') {
        result += 'او'
        i++
        continue
      }
      if (char === 'e' || char === 'é' || char === 'è') {
        result += 'اي'
        i++
        continue
      }
      if (char === 'o') {
        result += 'او'
        i++
        continue
      }
    }

    // 4. Vokal Medial & Final
    if (char === 'a') {
      result += 'ا'
      i++
      continue
    }
    if (char === 'i') {
      result += 'ي'
      i++
      continue
    }
    if (char === 'u') {
      result += 'و'
      i++
      continue
    }
    if (char === 'e' || char === 'é' || char === 'è') {
      result += 'ي'
      i++
      continue
    }
    if (char === 'o') {
      result += 'و'
      i++
      continue
    }

    // 5. Konsonan Tunggal
    if (SINGLE_CONSONANTS[char]) {
      result += SINGLE_CONSONANTS[char]
      i++
      continue
    }

    // Karakter lainnya (angka, tanda baca, huruf tak dikenal)
    if (char >= '0' && char <= '9') {
      const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
      result += arabicNumerals[parseInt(char, 10)] || char
    } else {
      result += char
    }
    i++
  }

  return result
}

/**
 * Transliterasi teks penuh (kalimat/paragraf) dari Latin ke Pegon Nusantara
 */
export function transliterateLatinToPegon(text: string): string {
  if (!text) return ''

  // Pisahkan berdasarkan pembatas kata (spasi, tanda baca, dsb.)
  return text.replace(/[a-zA-Z0-9'"`éèê]+/g, (match) => {
    return transliterateWord(match)
  })
}

/**
 * Cek apakah teks mengandung huruf Latin (bisa ditransliterasi)
 */
export function hasLatinText(text: string): boolean {
  return /[a-zA-Z]/.test(text)
}

export const PEGON_MAP_NORM: Record<string, string> = {
  '`': 'ڊ',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩',
  '0': '٠',
  '-': 'ث',
  '=': 'ح',
  q: 'ق',
  w: 'و',
  e: 'ي',
  r: 'ر',
  t: 'ت',
  y: 'ي',
  u: 'و',
  i: 'ي',
  o: 'و',
  p: 'ڤ',
  '[': 'ڠ',
  ']': 'ۑ',
  '\\': 'ڟ',
  a: 'ا',
  s: 'س',
  d: 'د',
  f: 'ف',
  g: 'ڮ',
  h: 'ه',
  j: 'ج',
  k: 'ك',
  l: 'ل',
  ';': 'ط',
  "'": 'ع',
  z: 'ز',
  x: 'خ',
  c: 'چ',
  v: 'ش',
  b: 'ب',
  n: 'ن',
  m: 'م',
  ',': 'ص',
  '.': 'ض',
  '/': 'ظ',
}

export const PEGON_MAP_SHIFT: Record<string, string> = {
  '~': 'ذ',
  _: 'لا',
  '+': 'خ',
  Q: 'ء',
  W: '\u0651',
  E: '\u0653',
  R: 'آ',
  T: 'ة',
  Y: 'ى',
  U: '\u064F',
  I: '\u0650',
  O: '\u0652',
  P: 'ڤ',
  '{': 'غ',
  '}': 'ى',
  '|': 'ة',
  A: '\u064E',
  S: 'ص',
  D: 'ض',
  F: 'ف',
  G: 'غ',
  H: 'ح',
  J: 'ج',
  K: 'ق',
  L: 'ل',
  ':': ':',
  '"': 'ء',
  Z: 'ظ',
  X: 'ئ',
  C: 'أ',
  V: 'إ',
  B: 'ب',
  N: 'ن',
  M: 'م',
  '<': '،',
  '>': '.',
  '?': '؟',
}

/**
 * Pemetaan Tombol Alt Pegon:
 * - Alt + W / Alt + Shift + W: ؤ (Waw Hamzah)
 * - Alt + A / Alt + Shift + A: ً (Tanwin Fathah)
 * - Alt + I / Alt + Shift + I: ٍ (Tanwin Kasrah)
 * - Alt + U / Alt + Shift + U: ٌ (Tanwin Dhommah)
 */
export const PEGON_MAP_ALT: Record<string, string> = {
  w: 'ؤ',
  W: 'ؤ',
  a: '\u064B',
  A: '\u064B',
  i: '\u064D',
  I: '\u064D',
  u: '\u064C',
  U: '\u064C',
}

export function getPegonChar(
  key: string,
  isShift: boolean,
  isAlt: boolean = false,
): string | undefined {
  const lk = key.toLowerCase()
  const uk = key.toUpperCase()

  if (isAlt) {
    if (PEGON_MAP_ALT[key]) return PEGON_MAP_ALT[key]
    if (PEGON_MAP_ALT[lk]) return PEGON_MAP_ALT[lk]
    if (PEGON_MAP_ALT[uk]) return PEGON_MAP_ALT[uk]
  }

  if (isShift) {
    if (PEGON_MAP_SHIFT[key]) return PEGON_MAP_SHIFT[key]
    if (PEGON_MAP_SHIFT[uk]) return PEGON_MAP_SHIFT[uk]
    if (PEGON_MAP_SHIFT[lk]) return PEGON_MAP_SHIFT[lk]
  }

  if (PEGON_MAP_NORM[lk]) return PEGON_MAP_NORM[lk]
  if (PEGON_MAP_NORM[key]) return PEGON_MAP_NORM[key]

  if (isShift && PEGON_MAP_NORM[lk]) {
    return PEGON_MAP_NORM[lk]
  }

  return undefined
}

/**
 * Penataan Standar Lengkap On-Screen Keyboard Windows (Arabic 101)
 */
export const ARABIC_101_NORM: Record<string, string> = {
  '`': 'ذ',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '0': '0',
  '-': '-',
  '=': '=',
  q: 'ض',
  w: 'ص',
  e: 'ث',
  r: 'ق',
  t: 'ف',
  y: 'غ',
  u: 'ع',
  i: 'ه',
  o: 'خ',
  p: 'ح',
  '[': 'ج',
  ']': 'د',
  '\\': '\\',
  a: 'ش',
  s: 'س',
  d: 'ي',
  f: 'ب',
  g: 'ل',
  h: 'ا',
  j: 'ت',
  k: 'ن',
  l: 'م',
  ';': 'ك',
  "'": 'ط',
  z: 'ئ',
  x: 'ء',
  c: 'ؤ',
  v: 'ر',
  b: 'لا',
  n: 'ى',
  m: 'ة',
  ',': 'و',
  '.': 'ز',
  '/': 'ظ',
}

export const ARABIC_101_SHIFT: Record<string, string> = {
  '~': '\u0651',
  '`': '\u0651',
  '!': '!',
  '@': '@',
  '#': '#',
  $: '$',
  '%': '%',
  '^': '^',
  '&': '&',
  '*': '*',
  '(': ')',
  ')': '(',
  _: '_',
  '+': '+',
  Q: '\u064E',
  q: '\u064E', // Fathah (َ)
  W: '\u064B',
  w: '\u064B', // Tanwin Fathah (ً)
  E: '\u064F',
  e: '\u064F', // Dhommah (ُ)
  R: '\u064C',
  r: '\u064C', // Tanwin Dhommah (ٌ)
  T: 'لإ',
  t: 'لإ', // Lam Alif Hamzah Bawah
  Y: 'إ',
  y: 'إ', // Alif Hamzah Bawah
  U: '‘',
  u: '‘', // Left single quote
  I: '÷',
  i: '÷', // Bagi
  O: '×',
  o: '×', // Kali
  P: '؛',
  p: '؛', // Titik Koma Arab
  '{': '<',
  '[': '<',
  '}': '>',
  ']': '>',
  '|': '|',
  '\\': '|',
  A: '\u0650',
  a: '\u0650', // Kasrah (ِ)
  S: '\u064D',
  s: '\u064D', // Tanwin Kasrah (ٍ)
  D: ']',
  d: ']',
  F: '[',
  f: '[',
  G: 'لأ',
  g: 'لأ', // Lam Alif Hamzah Atas
  H: 'أ',
  h: 'أ', // Alif Hamzah Atas
  J: 'ـ',
  j: 'ـ', // Tatweel
  K: '،',
  k: '،', // Koma Arab
  L: '/',
  l: '/',
  ':': ':',
  ';': ':',
  '"': '"',
  "'": '"',
  Z: '~',
  z: '~',
  X: '\u0652',
  x: '\u0652', // Sukun (ْ)
  C: '}',
  c: '}',
  V: '{',
  v: '{',
  B: 'لآ',
  b: 'لآ', // Lam Alif Maddah
  N: 'آ',
  n: 'آ', // Alif Maddah
  M: "'",
  m: "'",
  '<': ',',
  ',': ',',
  '>': '.',
  '.': '.',
  '?': '؟',
  '/': '؟', // Tanda Tanya Arab
}

export function getArabic101Char(key: string, isShift: boolean): string | undefined {
  const lk = key.toLowerCase()
  const uk = key.toUpperCase()

  if (isShift) {
    if (ARABIC_101_SHIFT[key]) return ARABIC_101_SHIFT[key]
    if (ARABIC_101_SHIFT[uk]) return ARABIC_101_SHIFT[uk]
    if (ARABIC_101_SHIFT[lk]) return ARABIC_101_SHIFT[lk]
  }

  if (ARABIC_101_NORM[lk]) return ARABIC_101_NORM[lk]
  if (ARABIC_101_NORM[key]) return ARABIC_101_NORM[key]

  if (isShift && ARABIC_101_NORM[lk]) {
    return ARABIC_101_NORM[lk]
  }

  return undefined
}

export interface ArabicKeyDef {
  norm: string
  shift: string
  displayNorm?: string
  displayShift?: string
  normLabel: string
  shiftLabel: string
}

export const ARABIC_101_KEY_DEFS: Record<string, ArabicKeyDef> = {
  // Row 1
  grave: { norm: 'ذ', shift: '\u0651', displayShift: '◌ّ', normLabel: '` ذ', shiftLabel: '~ ّ' },
  '1': { norm: '1', shift: '!', normLabel: '1', shiftLabel: '!' },
  '2': { norm: '2', shift: '@', normLabel: '2', shiftLabel: '@' },
  '3': { norm: '3', shift: '#', normLabel: '3', shiftLabel: '#' },
  '4': { norm: '4', shift: '$', normLabel: '4', shiftLabel: '$' },
  '5': { norm: '5', shift: '%', normLabel: '5', shiftLabel: '%' },
  '6': { norm: '6', shift: '^', normLabel: '6', shiftLabel: '^' },
  '7': { norm: '7', shift: '&', normLabel: '7', shiftLabel: '&' },
  '8': { norm: '8', shift: '*', normLabel: '8', shiftLabel: '*' },
  '9': { norm: '9', shift: ')', normLabel: '9', shiftLabel: ')' },
  '0': { norm: '0', shift: '(', normLabel: '0', shiftLabel: '(' },
  minus: { norm: '-', shift: '_', normLabel: '-', shiftLabel: '_' },
  equal: { norm: '=', shift: '+', normLabel: '=', shiftLabel: '+' },

  // Row 2
  q: { norm: 'ض', shift: '\u064E', displayShift: '◌َ', normLabel: 'q ض', shiftLabel: 'Q َ' },
  w: { norm: 'ص', shift: '\u064B', displayShift: '◌ً', normLabel: 'w ص', shiftLabel: 'W ً' },
  e: { norm: 'ث', shift: '\u064F', displayShift: '◌ُ', normLabel: 'e ث', shiftLabel: 'E ُ' },
  r: { norm: 'ق', shift: '\u064C', displayShift: '◌ٌ', normLabel: 'r ق', shiftLabel: 'R ٌ' },
  t: { norm: 'ف', shift: 'لإ', normLabel: 't ف', shiftLabel: 'T لإ' },
  y: { norm: 'غ', shift: 'إ', normLabel: 'y غ', shiftLabel: 'Y إ' },
  u: { norm: 'ع', shift: '‘', normLabel: 'u ع', shiftLabel: 'U ‘' },
  i: { norm: 'ه', shift: '÷', normLabel: 'i ه', shiftLabel: 'I ÷' },
  o: { norm: 'خ', shift: '×', normLabel: 'o خ', shiftLabel: 'O ×' },
  p: { norm: 'ح', shift: '؛', normLabel: 'p ح', shiftLabel: 'P ؛' },
  bracket_l: { norm: 'ج', shift: '<', normLabel: '[ ج', shiftLabel: '{ <' },
  bracket_r: { norm: 'د', shift: '>', normLabel: '] د', shiftLabel: '} >' },
  backslash: { norm: '\\', shift: '|', normLabel: '\\', shiftLabel: '|' },

  // Row 3
  a: { norm: 'ش', shift: '\u0650', displayShift: '◌ِ', normLabel: 'a ش', shiftLabel: 'A ِ' },
  s: { norm: 'س', shift: '\u064D', displayShift: '◌ٍ', normLabel: 's س', shiftLabel: 'S ٍ' },
  d: { norm: 'ي', shift: ']', normLabel: 'd ي', shiftLabel: 'D ]' },
  f: { norm: 'ب', shift: '[', normLabel: 'f ب', shiftLabel: 'F [' },
  g: { norm: 'ل', shift: 'لأ', normLabel: 'g ل', shiftLabel: 'G لأ' },
  h: { norm: 'ا', shift: 'أ', normLabel: 'h ا', shiftLabel: 'H أ' },
  j: { norm: 'ت', shift: 'ـ', normLabel: 'j ت', shiftLabel: 'J ـ' },
  k: { norm: 'ن', shift: '،', normLabel: 'k ن', shiftLabel: 'K ،' },
  l: { norm: 'م', shift: '/', normLabel: 'l م', shiftLabel: 'L /' },
  semicolon: { norm: 'ك', shift: ':', normLabel: '; ك', shiftLabel: ': :' },
  quote: { norm: 'ط', shift: '"', normLabel: "' ط", shiftLabel: '" "' },

  // Row 4
  z: { norm: 'ئ', shift: '~', normLabel: 'z ئ', shiftLabel: 'Z ~' },
  x: { norm: 'ء', shift: '\u0652', displayShift: '◌ْ', normLabel: 'x ء', shiftLabel: 'X ْ' },
  c: { norm: 'ؤ', shift: '}', normLabel: 'c ؤ', shiftLabel: 'C }' },
  v: { norm: 'ر', shift: '{', normLabel: 'v ر', shiftLabel: 'V {' },
  b: { norm: 'لا', shift: 'لآ', normLabel: 'b لا', shiftLabel: 'B لآ' },
  n: { norm: 'ى', shift: 'آ', normLabel: 'n ى', shiftLabel: 'N آ' },
  m: { norm: 'ة', shift: "'", normLabel: 'm ة', shiftLabel: "M '" },
  comma: { norm: 'و', shift: ',', normLabel: ', و', shiftLabel: '< ,' },
  period: { norm: 'ز', shift: '.', normLabel: '. ز', shiftLabel: '> .' },
  slash: { norm: 'ظ', shift: '؟', normLabel: '/ ظ', shiftLabel: '? ؟' },

  // Row 5
  pepet_quick: {
    norm: '\u0651',
    shift: '\u0651',
    displayNorm: '◌ّ',
    displayShift: '◌ّ',
    normLabel: 'tasydid',
    shiftLabel: 'tasydid',
  },
}

/**
 * Menghilangkan seluruh tanda harakat / syakal Arab dan Pegon secara terprogram (tanpa AI).
 * Menghapus:
 * - Fathah, Kasrah, Dhammah, Sukun, Tasydid, Tanwin (U+064B - U+0652)
 * - Maddah, Hamza diakritik, tanda vokal khusus (U+0653 - U+065F)
 * - Dagger Alif (U+0670)
 * - Tanda waqaf & tilawah Al-Qur'an (U+06D6 - U+06ED)
 * - Diakritik Arab Extended-A & Pegon vocalic marks (U+08E4 - U+08FF)
 * - Tatweel / Kashida (U+0640)
 */
export function stripHarakat(text: string): string {
  if (!text) return ''
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u08E4-\u08FF]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u200C\u200D\u200E\u200F]/g, '')
    .trim()
}

/**
 * Menghilangkan tanda harakat dari teks terseleksi (kata/frasa yang diblok)
 * dengan mempertahankan spasi, indentasi, atau pemisah baris asli di sekitarnya.
 */
export function stripHarakatSelection(text: string): string {
  if (!text) return ''
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u08E4-\u08FF]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u200C\u200D\u200E\u200F]/g, '')
}

/**
 * ── MODE HAROKAT CEPAT (FAST HARAKAT DOCK) ──────────────────────────────────
 * Pemetaan Tombol Khusus Mode Harokat:
 * - O: Sukun (ْ)
 * - P: Dhumah (ُ) / Shift+P: Tanwin Dhumah (ٌ)
 * - [: Kasroh (ِ) / Shift+[: Tanwin Kasroh (ٍ)
 * - ]: Fathah (َ) / Shift+]: Tanwin Fathah (ً)
 * - L: Tasydid (ّ)
 * - ;: Pepet Pegon (ٓ) / Shift+;: Kasrah Tegak (ٖ)
 * - ': Fathah Tegak / Alif Khanjariyah (ٰ) / Shift+': Dhommah Terbalik (ٗ)
 */
export interface HarokatKeyDef {
  norm: string
  shift?: string
  isTasydid?: boolean
  label: string
  shiftLabel?: string
  displayNorm: string
  displayShift?: string
  displayKey: string
}

export const HAROKAT_MODE_KEYS: Record<string, HarokatKeyDef> = {
  o: { norm: '\u0652', label: 'Sukun', displayNorm: 'ـْ', displayKey: 'O' },
  p: {
    norm: '\u064F',
    shift: '\u064C',
    label: 'Dhumah',
    shiftLabel: 'Dhumatain',
    displayNorm: 'ـُ',
    displayShift: 'ـٌ',
    displayKey: 'P',
  },
  bracket_l: {
    norm: '\u0650',
    shift: '\u064D',
    label: 'Kasroh',
    shiftLabel: 'Kasrotain',
    displayNorm: 'ـِ',
    displayShift: 'ـٍ',
    displayKey: '[',
  },
  bracket_r: {
    norm: '\u064E',
    shift: '\u064B',
    label: 'Fathah',
    shiftLabel: 'Fathatain',
    displayNorm: 'ـَ',
    displayShift: 'ـً',
    displayKey: ']',
  },
  l: { norm: '\u0651', isTasydid: true, label: 'Tasydid', displayNorm: 'ـّ', displayKey: 'L' },
  semicolon: {
    norm: '\u0653',
    shift: '\u0656',
    label: 'Pepet',
    shiftLabel: 'Kasroh Tegak',
    displayNorm: 'ـٓ',
    displayShift: 'ـٖ',
    displayKey: ';',
  },
  quote: {
    norm: '\u0670',
    shift: '\u0657',
    label: 'Fathah Tegak',
    shiftLabel: 'Dhumah Balik',
    displayNorm: 'ـٰ',
    displayShift: 'ـٗ',
    displayKey: "'",
  },
}

export function isArabicHarakat(char: string): boolean {
  if (!char) return false
  return /[\u064B-\u065F\u0670\u06D6-\u06ED\u08E4-\u08FF]/.test(char)
}

export function isArabicLetter(char: string): boolean {
  if (!char) return false
  return /[\u0621-\u064A\u0671-\u06D3\u06FB-\u06FC\u0750-\u077F\u08A0-\u08BF]/.test(char)
}

export function getHarokatKeyDef(key: string): HarokatKeyDef | undefined {
  const lk = key.toLowerCase()
  if (HAROKAT_MODE_KEYS[lk]) return HAROKAT_MODE_KEYS[lk]
  if (key === '[') return HAROKAT_MODE_KEYS['bracket_l']
  if (key === ']') return HAROKAT_MODE_KEYS['bracket_r']
  if (key === ';') return HAROKAT_MODE_KEYS['semicolon']
  if (key === "'") return HAROKAT_MODE_KEYS['quote']
  return undefined
}

export function getHarokatChar(
  key: string,
  isShift: boolean,
): { char: string; isTasydid?: boolean } | undefined {
  const def = getHarokatKeyDef(key)
  if (!def) return undefined
  if (isShift && def.shift) {
    return { char: def.shift }
  }
  return { char: def.norm, isTasydid: def.isTasydid }
}

/**
 * Sisipkan harakat pada kursor secara cerdas dan pindahkan kursor otomatis
 * ke konsonan berikutnya (Auto-Advance), kecuali jika karakter yang disisipkan adalah Tasydid.
 */
export function applyHarokatAtCursor(
  text: string,
  start: number,
  end: number,
  harokatChar: string,
  isTasydid = false,
): { nextText: string; nextCaret: number } {
  const prevText = text || ''
  const hasSelection = start < end

  // Jika ada teks diblok, timpa teks terseleksi
  if (hasSelection) {
    const nextText = prevText.slice(0, start) + harokatChar + prevText.slice(end)
    const nextCaret = start + harokatChar.length
    return { nextText, nextCaret }
  }

  // Jika kursor di posisi awal (indeks 0) dan karakter pertama adalah konsonan,
  // letakkan harakat setelah konsonan pertama tersebut
  let insertPos = start
  if (insertPos === 0 && prevText.length > 0 && isArabicLetter(prevText[0])) {
    insertPos = 1
  }

  // Periksa apakah karakter tepat sebelum kursor adalah harakat vokal yang sudah ada
  // Jika iya, dan harokat yang baru bukan tasydid, timpa harakat lama tersebut
  let deleteStart = insertPos
  const charBefore = insertPos > 0 ? prevText[insertPos - 1] : ''
  if (!isTasydid && charBefore && isArabicHarakat(charBefore) && charBefore !== '\u0651') {
    deleteStart = insertPos - 1
  }

  const nextText = prevText.slice(0, deleteStart) + harokatChar + prevText.slice(insertPos)
  const posAfterChar = deleteStart + harokatChar.length

  // Jika tombol yang ditekan adalah Tasydid, tahan kursor di huruf ini (jangan auto-advance)
  if (isTasydid) {
    return { nextText, nextCaret: posAfterChar }
  }

  // Auto-Advance ke konsonan berikutnya
  const nextCaret = skipToNextConsonant(nextText, posAfterChar)
  return { nextText, nextCaret }
}

/**
 * Melompati konsonan saat ini menuju tepat setelah konsonan berikutnya (Skip)
 */
export function skipToNextConsonant(text: string, currentPos: number): number {
  let i = currentPos
  const len = text.length

  // 1. Lewati sisa harakat di konsonan sekarang
  while (i < len && isArabicHarakat(text[i])) {
    i++
  }

  // 2. Lewati karakter non-konsonan (spasi, tanda baca, enter)
  while (i < len && !isArabicLetter(text[i])) {
    i++
  }

  // 3. Jika menemukan konsonan berikutnya, posisikan kursor tepat setelahnya
  if (i < len && isArabicLetter(text[i])) {
    i++
    // Jika konsonan tersebut sudah punya tasydid, lewati tasydidnya
    while (i < len && text[i] === '\u0651') {
      i++
    }
  }

  return i
}

/**
 * Mundur ke konsonan sebelumnya dan hapus harakat yang baru saja disisipkan di konsonan itu
 */
export function stepBackToPrevConsonantAndStrip(
  text: string,
  currentPos: number,
): { nextText: string; nextCaret: number } {
  if (currentPos <= 0 || !text) {
    return { nextText: text, nextCaret: 0 }
  }

  let i = currentPos - 1

  // 1. Mundur melewati harakat di posisi saat ini jika ada
  while (i >= 0 && isArabicHarakat(text[i])) {
    i--
  }

  // 2. Mundur melewati spasi / tanda baca
  while (i >= 0 && !isArabicLetter(text[i])) {
    i--
  }

  // Sekarang i berada di konsonan sebelumnya (atau i < 0)
  if (i < 0) {
    return { nextText: text, nextCaret: 0 }
  }

  // Konsonan ada di index i. Cek apakah ada harakat setelah konsonan i ini
  let harakatEnd = i + 1
  while (harakatEnd < text.length && isArabicHarakat(text[harakatEnd])) {
    harakatEnd++
  }

  // Hapus semua harakat yang menempel pada konsonan i ini
  const nextText = text.slice(0, i + 1) + text.slice(harakatEnd)
  const nextCaret = i + 1

  return { nextText, nextCaret }
}
