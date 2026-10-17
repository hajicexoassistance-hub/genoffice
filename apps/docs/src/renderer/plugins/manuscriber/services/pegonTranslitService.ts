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
  "al-quran": 'القرآن',
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
  '`': 'ڊ', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩', '0': '٠',
  '-': 'ث', '=': 'ح', 'q': 'ق', 'w': 'و', 'e': 'ي', 'r': 'ر', 't': 'ت', 'y': 'ي', 'u': 'و', 'i': 'ي', 'o': 'و', 'p': 'ڤ',
  '[': 'ڠ', ']': 'ۑ', '\\': 'ڟ', 'a': 'ا', 's': 'س', 'd': 'د', 'f': 'ف', 'g': 'ڮ', 'h': 'ه', 'j': 'ج', 'k': 'ك', 'l': 'ل',
  ';': 'ط', "'": 'ع', 'z': 'ز', 'x': 'خ', 'c': 'چ', 'v': 'ش', 'b': 'ب', 'n': 'ن', 'm': 'م', ',': 'ص', '.': 'ض', '/': 'ظ',
}

export const PEGON_MAP_SHIFT: Record<string, string> = {
  '~': 'ذ', '_': 'لا', '+': 'خ', 'Q': 'ء', 'W': 'ؤ', 'E': '\u0653', 'R': 'آ', 'T': 'ة', 'Y': 'ى', 'U': '\u064F',
  'I': '\u0650', 'O': '\u0652', 'P': 'ڤ', '{': 'غ', '}': 'ى', '|': 'ة', 'A': '\u064E', 'S': 'ص', 'D': 'ض', 'F': 'ف',
  'G': 'غ', 'H': 'ح', 'J': 'ج', 'K': 'ق', 'L': 'ل', ':': ':', '"': 'ء', 'Z': 'ظ', 'X': 'ئ', 'C': 'أ', 'V': 'إ',
  'B': 'ب', 'N': 'ن', 'M': 'م', '<': '،', '>': '.', '?': '؟',
}

export function getPegonChar(key: string, isShift: boolean): string | undefined {
  const lk = key.toLowerCase()
  const uk = key.toUpperCase()

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
