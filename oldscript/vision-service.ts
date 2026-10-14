import type { PDFDocumentProxy } from 'pdfjs-dist'
import { marked } from 'marked'

export interface VisionProviderConfig {
  baseUrl: string
  apiKey: string
  model: string
  userPrompt?: string
  activePreset?: string
  cachedModels?: string[]
}

export const SYSTEM_SPOTLIGHT_RULES = `
=== WAJIB: STRUKTUR OUTPUT & KOTAK SPOTLIGHT BOUNDING BOX (SYSTEM RULES) ===
Hasilkan output terstruktur per blok teks yang terdeteksi dengan format wajib:

[[BLOCK: type=matan|syarah|hasyiah|margin|nadzom|heading, bbox=[ymin,xmin,ymax,xmax]]]
Teks lengkap paragraf atau bait di sini dengan harakat dan tanda baca verbatim sesuai fisik naskah.
[[END_BLOCK]]

Aturan Koordinat Bounding Box (0 - 1000):
- ymin, xmin, ymax, xmax adalah integer 0-1000 relatif terhadap dimensi halaman (0,0 kiri-atas, 1000,1000 kanan-bawah).
- TIGHT BOUNDING BOX: Kotak harus pas mengelilingi batas fisik teks blok tersebut, jangan mencakup ruang kosong lebar.
- NON-OVERLAPPING: Blok terpisah tidak boleh saling tumpang tindih kecuali teks fisik memang bertumpuk.
- SHORT HEADINGS / TITLES / NUMBERS: Untuk judul pendek atau nomor bait, batas xmin dan xmax harus pas mengapit teks tersebut saja.
- PURE VISUAL TRANSCRIPTION: Transkripsikan HANYA teks yang tampak secara fisik. Jangan berhalusinasi atau menambah dari ingatan.
- Al-Qur'an diapit ﴿ ... ﴾, Hadits diapit « ... », teks rusak/tidak terbaca ditandai [غير مقروء].
`.trim()

export interface PromptPresetItem {
  id: string
  title: string
  description: string
  prompt: string
}

export const PROMPT_PRESETS: Record<string, PromptPresetItem> = {
  nadzom: {
    id: 'nadzom',
    title: 'Syarah Kitab Nadzom',
    description: 'Bait nadzom 2 kolom simetris (kanan-kiri) dengan paragraf syarah di bawahnya',
    prompt: `Anda adalah muhaqqiq ahli naskah Turats bertipe "Syarah Kitab Nadzom" (misal: Syarah Alfiyah, Syarah Imrithi, Syarah Jauharatut Tauhid, Syarah Sullam, dll).
Analisis tata letak halaman ini dengan aturan:
1. Nadzom (type=nadzom): Bait-bait syair yang tertata simetris dua kolom (syathr awal di kanan dan syathr tsani di kiri). Satukan kedua syathr dalam satu bait baris dengan tanda pemisah (...) atau (---), atau pertahankan per baris bait.
2. Syarah (type=syarah): Paragraf penjelas yang berada tepat di bawah bait-bait nadzom tersebut. Awali dengan kutipan matan jika ada (misal: "قوله: ...").
3. Urutan Transkripsi: Transkripsikan bait-bait nadzom terlebih dahulu secara utuh, baru kemudian uraian syarah penjelas di bawahnya.
4. Harakat: Pertahankan harakat wazan bahar syair pada bait nadzom secara lengkap.`.trim(),
  },
  matanSyarah: {
    id: 'matanSyarah',
    title: 'Standar Matan & Syarah',
    description: 'Matan inti di bagian atas/dalam kurung, diikuti uraian syarah mengalir',
    prompt: `Anda adalah pakar filologi naskah Turats Islam klasik berstruktur Matan & Syarah (misal: Fathul Qarib, Fathul Mu'in, Kifayatul Akhyar).
1. Heading (type=heading): Judul kitab, bab, fasal, atau bismillah di bagian atas.
2. Matan (type=matan): Teks dasar yang diletakkan di bagian atas, di dalam kurung kurawal/kotak (atau diawali "قال", "قوله").
3. Syarah (type=syarah): Uraian penjelasan yang mengalir berkesinambungan di sekeliling atau di bawah matan.
4. Jaga koherensi antar kalimat dalam satu paragraf syarah utuh.`.trim(),
  },
  hasyiah: {
    id: 'hasyiah',
    title: 'Kitab Ber-Hasyiah / Hamisy',
    description: 'Matan/Syarah di tengah, catatan kaki hasyiah di bawah, catatan ta\'liqat di margin tepi',
    prompt: `Analisis naskah ber-hasyiah dan multi-layer klasik (misal: I'anatut Thalibin, Bajuri, Tuhfatul Muhtaj):
1. Inti (type=syarah atau matan): Teks utama di kolom sentral tengah halaman.
2. Hasyiah (type=hasyiah): Catatan penjelas sekunder di bawah garis pemisah horizontal (---).
3. Catatan Margin (type=margin): Ta'liqat di tepi margin luar (hamisy) yang ditulis secara miring atau vertikal.`.trim(),
  },
  custom: {
    id: 'custom',
    title: 'Kustom Mandiri',
    description: 'Instruksi khusus buatan pengguna',
    prompt: `Anda adalah ahli transkripsi dan tahqiq naskah naskah Arab klasik. Transkripsikan seluruh teks yang tampak dengan presisi tinggi dan terstruktur rapi.`.trim(),
  },
}

export const DEFAULT_USER_PROMPT = PROMPT_PRESETS.matanSyarah.prompt

export const DEFAULT_VISION_CONFIG: VisionProviderConfig = {
  baseUrl: 'https://ai.sumopod.com/v1',
  apiKey: 'sk-2DyeaNslcr93j-i51xq8Hw',
  model: 'seed-2-0-mini',
  userPrompt: DEFAULT_USER_PROMPT,
  activePreset: 'matanSyarah',
}

const STORAGE_KEY = 'manuscriber.vision.config'

export function getVisionConfig(): VisionProviderConfig {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        baseUrl: parsed.baseUrl || DEFAULT_VISION_CONFIG.baseUrl,
        apiKey: parsed.apiKey || DEFAULT_VISION_CONFIG.apiKey,
        model: parsed.model || DEFAULT_VISION_CONFIG.model,
        userPrompt: typeof parsed.userPrompt === 'string' ? parsed.userPrompt : DEFAULT_USER_PROMPT,
        activePreset: parsed.activePreset || 'matanSyarah',
        cachedModels: Array.isArray(parsed.cachedModels) ? parsed.cachedModels : undefined,
      }
    }
  } catch { }
  return { ...DEFAULT_VISION_CONFIG }
}

export function saveVisionConfig(config: Partial<VisionProviderConfig>): VisionProviderConfig {
  const current = getVisionConfig()
  const next = { ...current, ...config }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  } catch { }
  return next
}

export function buildFullTranscriptionPrompt(userCustomPrompt?: string): string {
  const userPart = (userCustomPrompt || getVisionConfig().userPrompt || DEFAULT_USER_PROMPT).trim()
  return `${userPart}\n\n${SYSTEM_SPOTLIGHT_RULES}`
}

export const MANUSCRIPT_TRANSCRIPTION_PROMPT = buildFullTranscriptionPrompt()

/**
 * Render a single PDF page to an offscreen HTML5 canvas at high DPI (e.g. 2.0x)
 * and return the image as a base64 PNG data URL.
 */
export async function capturePdfPageAsDataUrl(
  doc: PDFDocumentProxy,
  pageNo: number,
  scale = 2.0,
): Promise<string> {
  const page = await doc.getPage(pageNo)
  const unscaledVp = page.getViewport({ scale: 1.0 })
  const maxDim = Math.max(unscaledVp.width, unscaledVp.height)
  let effectiveScale = scale
  // Cap max dimension to 2048px to prevent gigantic payloads while preserving crisp Arabic diacritics
  if (maxDim * effectiveScale > 2048) {
    effectiveScale = Math.max(1.0, Number((2048 / maxDim).toFixed(2)))
  }
  const viewport = page.getViewport({ scale: effectiveScale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Failed to obtain 2D canvas context')

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const renderTask = page.render({
    canvas,
    viewport,
  })

  await renderTask.promise
  // Use JPEG with 0.88 quality for fast transport and compact payload (~200KB - 400KB)
  return canvas.toDataURL('image/jpeg', 0.88)
}

export interface TranscriptionResult {
  ok: boolean
  text: string
  html: string
  error?: string
  isRtl?: boolean
}

/**
 * Detects if a text contains predominantly Right-to-Left (Arabic, Hebrew, Persian, etc.) characters
 */
export function isRtlText(text: string): boolean {
  const rtlChars = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/
  return rtlChars.test(text)
}

/**
 * Direct call to OpenAI-compatible Vision API
 */
async function callDirectVisionApi(
  dataUrl: string,
  prompt: string,
  config: VisionProviderConfig,
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 4000,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Vision API (${res.status}): ${errorBody}`)
  }

  const json = await res.json()
  const content = json.choices?.[0]?.message?.content ?? ''
  if (!content) throw new Error('No content returned from Vision AI')
  return content
}

/**
 * Transcribes a PDF page image using Vision AI.
 */
export async function transcribePageImage(
  dataUrl: string,
  customPrompt?: string,
): Promise<TranscriptionResult> {
  const config = getVisionConfig()
  const prompt = customPrompt || buildFullTranscriptionPrompt(config.userPrompt)

  try {
    let rawText = ''
    const desktopApi = (window as any).desktop

    // 1. PRIMARY: Main Process IPC handler (Zero CORS, 3-minute timeout, direct Node fetch)
    if (desktopApi?.visionTranscribe) {
      const res = await desktopApi.visionTranscribe({ dataUrl, prompt, config })
      if (!res.ok) {
        throw new Error(res.error || 'Gagal mentranskripsi halaman via Vision AI.')
      }
      rawText = (res.text ?? '').trim()
    } else if (config.apiKey && config.baseUrl) {
      // 2. Direct renderer fetch fallback
      rawText = await callDirectVisionApi(dataUrl, prompt, config)
    } else if (desktopApi?.analyzeMedia) {
      // 3. Fallback to desktop analyzeMedia
      const res = await desktopApi.analyzeMedia({
        mediaUrls: [dataUrl],
        requirements: prompt,
      })
      if (res.error) throw new Error(res.error)
      rawText = (res.text ?? '').trim()
    } else {
      throw new Error('Konfigurasi Vision AI tidak tersedia.')
    }

    rawText = rawText.trim()
    if (!rawText) {
      return { ok: false, text: '', html: '', error: 'Tidak ada teks yang terdeteksi dari Vision AI.' }
    }

    // Clean up markdown block fences if any
    if (rawText.startsWith('```markdown')) {
      rawText = rawText.replace(/^```markdown\n/, '').replace(/\n```$/, '')
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '')
    }

    const rtl = isRtlText(rawText)
    const html = await marked.parse(rawText)

    return { ok: true, text: rawText, html, isRtl: rtl }
  } catch (err) {
    const msg = String(err).replace(/^Error:\s*/, '')
    return { ok: false, text: '', html: '', error: msg }
  }
}

export type BlockType = 'matan' | 'syarah' | 'hasyiah' | 'margin' | 'nadzom' | 'heading'

export interface StagingBlockItem {
  id: string
  lineNumber: number
  rawText: string
  correctedText: string
  bbox?: [number, number, number, number]
  confidenceScore: number
  status: 'unverified' | 'verified' | 'flagged' | 'edited'
  blockType?: BlockType
  columnIndex?: number
  candidates?: string[]
  auditNotes?: string
}

/**
 * Parses OCR transcription into multi-column Paragraph Blocks.
 * Supports structured [[BLOCK:...]] tags or falls back to intelligent paragraph splitting.
 */
export function parseTranscriptionToStagingLines(
  rawText: string,
  _pageWidth?: number,
  _pageHeight?: number,
): StagingBlockItem[] {
  const result: StagingBlockItem[] = []

  // Pre-clean raw text if wrapped in codeblocks
  let cleanedText = rawText.trim()
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
  }

  // Flexible block parser regex matching any variant of [[BLOCK: type=..., bbox=[...]]]
  const blockRegex = /(?:\[{1,2}|<)BLOCK:?\s*(?:type=)?([a-zA-Z0-9_-]+)?(?:[,\s]+bbox=\[?([0-9,\-\. ]+)\]?)?(?:\]{1,2}|>)([\s\S]*?)(?:(?:\[{1,2}|<)\/?END_BLOCK(?:\]{1,2}|>)|(?=(?:\[{1,2}|<)BLOCK)|$)/gi

  let match: RegExpExecArray | null
  let blockIdx = 0

  while ((match = blockRegex.exec(cleanedText)) !== null) {
    const rawType = (match[1] || 'syarah').toLowerCase()
    const bboxStr = match[2]
    const rawContent = match[3] || ''

    // Clean internal block tags from content
    let content = rawContent
      .replace(/\[{1,2}\/?END_BLOCK\]{1,2}/gi, '')
      .replace(/\[{1,2}BLOCK:.*?\]{1,2}/gi, '')
      .trim()

    if (!content) continue

    blockIdx++

    // Map raw type string to valid BlockType
    let typeStr: BlockType = 'syarah'
    if (rawType.includes('head') || rawType.includes('title') || rawType.includes('judul')) {
      typeStr = 'heading'
    } else if (rawType.includes('matan')) {
      typeStr = 'matan'
    } else if (rawType.includes('hasy') || rawType.includes('foot') || rawType.includes('note')) {
      typeStr = 'hasyiah'
    } else if (rawType.includes('marg') || rawType.includes('side')) {
      typeStr = 'margin'
    } else if (rawType.includes('nadz') || rawType.includes('verse') || rawType.includes('poem')) {
      typeStr = 'nadzom'
    }

    // Collapse internal newlines into spaces for prose paragraphs to prevent empty line gaps
    if (typeStr !== 'nadzom') {
      content = content.replace(/\s*\n\s*/g, ' ').replace(/ {2,}/g, ' ')
    }

    let bbox: [number, number, number, number] | undefined = undefined
    if (bboxStr) {
      const nums = bboxStr.split(',').map((n) => parseInt(n.trim(), 10))
      if (nums.length === 4 && !nums.some(isNaN)) {
        const [n0, n1, n2, n3] = nums

        let ymin = 0
        let xmin = 0
        let ymax = 0
        let xmax = 0

        if (n2 > n0 && n3 > n1) {
          // Standard [ymin, xmin, ymax, xmax] format directly from Vision AI (0-1000 grid)
          ymin = n0
          xmin = n1
          ymax = n2
          xmax = n3
        } else if (n2 <= 1000 && n3 <= 1000 && n0 + n2 <= 1000 && n1 + n3 <= 1000) {
          // Direct [x, y, w, h] format -> convert to [ymin, xmin, ymax, xmax]
          xmin = n0
          ymin = n1
          xmax = n0 + n2
          ymax = n1 + n3
        } else {
          // Fallback parsing: n0=top, n1=left, n2=bottom, n3=right
          ymin = Math.min(n0, n2)
          xmin = Math.min(n1, n3)
          ymax = Math.max(n0, n2)
          xmax = Math.max(n1, n3)
        }

        const x = Math.max(0, Math.min(985, Math.round(xmin)))
        const y = Math.max(0, Math.min(985, Math.round(ymin)))
        const w = Math.max(15, Math.min(1000 - x, Math.round(xmax - xmin)))
        const h = Math.max(12, Math.min(1000 - y, Math.round(ymax - ymin)))

        bbox = [x, y, w, h]
      }
    }

    if (!bbox) {
      // Default spatial block calculation if AI omitted coordinates
      const top = Math.round(50 + (blockIdx * 70) % 850)
      const defaultWidth = typeStr === 'margin' ? 250 : 800
      const defaultLeft = typeStr === 'margin' ? 50 : 100
      bbox = [defaultLeft, top, defaultWidth, 50]
    }

    result.push({
      id: `block-${blockIdx}-${Math.random().toString(36).substring(2, 7)}`,
      lineNumber: blockIdx,
      rawText: content,
      correctedText: content,
      bbox,
      confidenceScore: content.includes('[؟]') || content.includes('[غير مقروء]') ? 0.75 : 0.95,
      status: 'unverified',
      blockType: typeStr,
    })
  }

  // Fallback: If blockRegex produced 0 items, sanitize rawText by stripping any raw block tags and split into paragraphs
  if (result.length === 0) {
    const sanitizedText = cleanedText
      .replace(/\[{1,2}\/?END_BLOCK\]{1,2}/gi, '')
      .replace(/\[{1,2}BLOCK:.*?\]{1,2}/gi, '')
      .trim()

    const paragraphs = sanitizedText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)

    const total = paragraphs.length || 1

    paragraphs.forEach((para, idx) => {
      let blockType: BlockType = 'syarah'
      if (para.startsWith('> ') || para.includes('وَقَوْلُهُ')) {
        blockType = 'matan'
      } else if (para.startsWith('قوله:') || para.includes('حاشية')) {
        blockType = 'hasyiah'
      } else if (para.includes('*')) {
        blockType = 'nadzom'
      } else if (para.startsWith('#')) {
        blockType = 'heading'
      }

      const top = Math.round(40 + (idx / total) * 820)
      const height = Math.round(Math.max(50, 800 / total - 15))

      result.push({
        id: `block-${idx + 1}-${Math.random().toString(36).substring(2, 7)}`,
        lineNumber: idx + 1,
        rawText: para,
        correctedText: para,
        bbox: [70, top, 860, height],
        confidenceScore: para.includes('[؟]') || para.includes('[غير مقروء]') ? 0.75 : 0.95,
        status: 'unverified',
        blockType,
      })
    })
  }

  return result
}


