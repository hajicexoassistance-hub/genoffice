/**
 * Manuscriber Plugin — Vision AI Service
 * Menyediakan prompt engineering Turats (Nadzom, Matan/Syarah, Hasyiah, Custom),
 * penangkapan halaman PDF ke format gambar, dan pemanggilan OpenAI-compatible Vision API.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { VisionProviderConfig, PromptPresetItem, TranscriptionResult, StagingLine } from '../types'

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
    prompt: `Anda adalah ahli transkripsi dan tahqiq naskah Arab klasik. Transkripsikan seluruh teks yang tampak dengan presisi tinggi dan terstruktur rapi.`.trim(),
  },
}

export const DEFAULT_USER_PROMPT = PROMPT_PRESETS.matanSyarah.prompt

export const DEFAULT_VISION_CONFIG: VisionProviderConfig = {
  baseUrl: 'https://ai.sumopod.com/v1',
  apiKey: '',
  model: 'gemini/gemini-3.8-flash',
  providerName: 'Sumopod AI',
  providerId: 'sumopod',
  userPrompt: DEFAULT_USER_PROMPT,
  activePreset: 'matanSyarah',
}

const STORAGE_KEY = 'manuscriber.vision.config'

export function getVisionConfig(): VisionProviderConfig {
  let config: VisionProviderConfig = { ...DEFAULT_VISION_CONFIG }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      config = { ...config, ...parsed }
    } else {
      // Fallback ke general studio settings jika ada
      const studioRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('pegon_studio_settings_v1') : null
      if (studioRaw) {
        const parsed = JSON.parse(studioRaw)
        const activeProvider = parsed.activeProvider || 'sumopod'
        const p = parsed.providers?.[activeProvider] || {}
        if (p.apiKey) config.apiKey = p.apiKey
        if (p.baseUrl) config.baseUrl = p.baseUrl
        if (p.model) config.model = p.model
      }
    }
  } catch {}
  return config
}

export function saveVisionConfig(patch: Partial<VisionProviderConfig>): VisionProviderConfig {
  const current = getVisionConfig()
  const updated = { ...current, ...patch }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  } catch {}
  return updated
}

export function buildFullTranscriptionPrompt(userCustomPrompt?: string): string {
  const userPart = (userCustomPrompt || getVisionConfig().userPrompt || DEFAULT_USER_PROMPT).trim()
  return `${userPart}\n\n${SYSTEM_SPOTLIGHT_RULES}`
}

/**
 * Render single page PDF ke canvas dan hasilkan base64 dataUrl (JPEG quality 0.88)
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
  if (maxDim * effectiveScale > 2048) {
    effectiveScale = Math.max(1.0, Number((2048 / maxDim).toFixed(2)))
  }
  const viewport = page.getViewport({ scale: effectiveScale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Gagal mendapatkan 2D context canvas.')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const renderTask = page.render({ canvas, viewport })
  await renderTask.promise
  return canvas.toDataURL('image/jpeg', 0.88)
}

export function isRtlText(text: string): boolean {
  const rtlChars = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/
  return rtlChars.test(text)
}

export async function callDirectVisionApi(
  dataUrl: string,
  prompt: string,
  config: VisionProviderConfig,
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 180_000)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
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
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Vision AI (${res.status}): ${errText.slice(0, 250)}`)
    }

    const json = (await res.json()) as any
    const content = json.choices?.[0]?.message?.content ?? ''
    if (!content) throw new Error('Tidak ada teks yang dikembalikan oleh Vision AI.')
    return content
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') throw new Error('Permintaan transkripsi time-out (180 detik).')
    throw err
  }
}

export async function transcribePageImage(
  dataUrl: string,
  customPrompt?: string,
): Promise<TranscriptionResult> {
  const config = getVisionConfig()
  const prompt = customPrompt || buildFullTranscriptionPrompt(config.userPrompt)

  try {
    let rawText = ''
    const desktopApi = (window as any).desktop

    // 1. Jika ada bridge desktop Electron khusus
    if (desktopApi?.visionTranscribe) {
      const res = await desktopApi.visionTranscribe({ dataUrl, prompt, config })
      if (!res.ok) throw new Error(res.error || 'Gagal memanggil Vision AI.')
      rawText = (res.text ?? '').trim()
    } else if (config.apiKey && config.baseUrl) {
      // 2. Direct fetch (Zero Dependency on Electron main)
      rawText = await callDirectVisionApi(dataUrl, prompt, config)
    } else if (desktopApi?.analyzeMedia) {
      // 3. Fallback Genspark analyzeMedia
      const res = await desktopApi.analyzeMedia({
        mediaUrls: [dataUrl],
        requirements: prompt,
      })
      if (res.error) throw new Error(res.error)
      rawText = (res.text ?? '').trim()
    } else {
      throw new Error('API Key Vision AI belum diisi. Silakan atur di Pengaturan Manuscriber.')
    }

    rawText = rawText.trim()
    if (!rawText) {
      return { ok: false, text: '', html: '', error: 'Tidak ada teks yang terdeteksi dari Vision AI.' }
    }

    // Pembersihan markdown fences jika ada
    if (rawText.startsWith('```markdown')) {
      rawText = rawText.replace(/^```markdown\n/, '').replace(/\n```$/, '')
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '')
    }

    return { ok: true, text: rawText, html: rawText, isRtl: isRtlText(rawText) }
  } catch (err: any) {
    const msg = String(err.message || err).replace(/^Error:\s*/, '')
    return { ok: false, text: '', html: '', error: msg }
  }
}

/**
 * Parse output string terstruktur dari Vision AI menjadi array StagingLine
 */
export function parseSpotlightBlocks(rawText: string, pageNumber: number): StagingLine[] {
  const lines: StagingLine[] = []
  const blockRegex = /\[\[BLOCK:\s*type=([a-zA-Z0-9_-]+)(?:,\s*bbox=\[([0-9\s,]+)\])?\]\]([\s\S]*?)\[\[END_BLOCK\]\]/gi

  let match: RegExpExecArray | null
  let blockIdx = 0

  while ((match = blockRegex.exec(rawText)) !== null) {
    blockIdx++
    const tag = (match[1] || 'TEKS').toUpperCase()
    const bboxStr = match[2]
    const content = (match[3] || '').trim()

    let bbox: [number, number, number, number] | undefined
    if (bboxStr) {
      const parts = bboxStr.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
      if (parts.length === 4) {
        bbox = [parts[0], parts[1], parts[2], parts[3]]
      }
    }

    if (content) {
      lines.push({
        id: `p${pageNumber}_b${blockIdx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        pageNumber,
        bbox,
        originalText: content,
        correctedText: content,
        text: content,
        tag,
        status: 'verified', // Default verified saat terdeteksi
        isRtl: isRtlText(content),
      })
    }
  }

  // Fallback jika Vision AI tidak menggunakan tag [[BLOCK]]
  if (lines.length === 0 && rawText.trim()) {
    const paragraphs = rawText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    paragraphs.forEach((p, idx) => {
      lines.push({
        id: `p${pageNumber}_fb${idx + 1}_${Date.now()}`,
        pageNumber,
        originalText: p,
        correctedText: p,
        text: p,
        tag: 'PARAGRAF',
        status: 'verified',
        isRtl: isRtlText(p),
      })
    })
  }

  return lines
}
