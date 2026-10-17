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
  pegon: {
    id: 'pegon',
    title: 'Naskah Pegon & Makna Gandul',
    description: 'Naskah aksara Pegon/Jawi dengan baris gantung makna gandul pesantren',
    prompt: `Anda adalah filolog ahli naskah Pegon Nusantara (Arab Melayu, Arab Jawa, Arab Sunda) dan makna gandul pesantren.
Analisis tata letak naskah dengan aturan:
1. Matan/Teks Pokok (type=matan): Kalimat Arab pokok yang tertulis besar atau di baris utama.
2. Makna Gandul (type=syarah): Teks makna miring/gantung di bawah setiap kata (utawi, iku, ing dalem, dll).
3. Catatan Pinggir (type=margin): Keterangan tambahan di margin samping halaman.
4. Karakter Khusus: Pertahankan huruf konsonan Pegon khas (چ, ڠ, ڤ, ݢ, ڽ, dll) secara akurat tanpa menggantinya ke abjad Arab standar.`.trim(),
  },
  custom: {
    id: 'custom',
    title: 'Kustom Mandiri',
    description: 'Instruksi khusus buatan pengguna',
    prompt: `Anda adalah ahli transkripsi dan tahqiq naskah Arab klasik. Transkripsikan seluruh teks yang tampak dengan presisi tinggi dan terstruktur rapi.`.trim(),
  },
}

export const DEFAULT_USER_PROMPT = PROMPT_PRESETS.matanSyarah.prompt

export interface GenOfficeMediaAnalysisInfo {
  providerId: string
  providerLabel: string
  model: string
  apiKey: string
  baseUrl: string
  isConfigured: boolean
  isGenspark: boolean
  description: string
  statusSummary: string
}

export const KNOWN_MEDIA_PROVIDERS_META: Record<
  string,
  { label: string; defaultBaseUrl: string; defaultModel: string; description: string }
> = {
  genspark: {
    label: 'Genspark',
    defaultBaseUrl: '',
    defaultModel: 'genspark-media',
    description: 'Analisis media cerdas melalui akun login Genspark GenOffice',
  },
  gemini: {
    label: 'Gemini (Google)',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-3.8-flash',
    description: 'Gemini 3.8 Flash / 3.7 Flash native multimodal understanding',
  },
  openai: {
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.6-luna',
    description: 'GPT-6 / GPT-5.6 / GPT-4o multimodal chat completions',
  },
  doubao: {
    label: 'Doubao (Volcengine Ark)',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-seed-2-1-pro-260628',
    description: 'Doubao Seed multimodal understanding',
  },
  glm: {
    label: 'GLM (Zhipu)',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4.6v',
    description: 'GLM-4.6V vision understanding',
  },
  xai: {
    label: 'Grok (xAI)',
    defaultBaseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-4.6',
    description: 'Grok Vision multimodal',
  },
  qwen: {
    label: 'Qwen (Alibaba Cloud)',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com',
    defaultModel: 'qwen3-vl-plus',
    description: 'Qwen3-VL DashScope multimodal',
  },
  minimax: {
    label: 'MiniMax',
    defaultBaseUrl: 'https://api.minimax.io/v1',
    defaultModel: 'MiniMax-M3',
    description: 'MiniMax-M3 multimodal media analysis',
  },
  deepseek: {
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-flash',
    description: 'DeepSeek V4.1 Flash native multimodal understanding',
  },
  custom: {
    label: 'Custom Endpoint',
    defaultBaseUrl: '',
    defaultModel: '',
    description: 'OpenAI-compatible endpoint kustom mandiri',
  },
}

/**
 * Mengambil informasi penyedia Analisis Gambar aktif dari Pengaturan AI GenOffice
 */
export async function fetchGenOfficeMediaAnalysisInfo(): Promise<GenOfficeMediaAnalysisInfo> {
  const desktopApi = (window as any).desktop
  const pdfApi = (window as any).pdfApi
  const getSettingsFn = desktopApi?.getAiSettings || pdfApi?.getAiSettings

  if (!getSettingsFn) {
    return {
      providerId: 'unknown',
      providerLabel: 'GenOffice Desktop AI Tidak Terdeteksi',
      model: 'none',
      apiKey: '',
      baseUrl: '',
      isConfigured: false,
      isGenspark: false,
      description: 'Desktop bridge tidak ditemukan.',
      statusSummary: 'Tidak terhubung ke bridge desktop GenOffice',
    }
  }

  try {
    const settings = await getSettingsFn()
    const media = settings?.media
    const analysisProviderId = media?.analysisProvider || 'genspark'
    const providerConfig = media?.providers?.[analysisProviderId] || {}
    const meta = KNOWN_MEDIA_PROVIDERS_META[analysisProviderId] || {
      label: analysisProviderId.toUpperCase(),
      defaultBaseUrl: '',
      defaultModel: '',
      description: 'Penyedia media GenOffice',
    }

    const apiKey = (providerConfig.apiKey || '').trim()
    const baseUrl = (providerConfig.baseUrl || meta.defaultBaseUrl || '').trim()
    const model = (providerConfig.analysisModel || meta.defaultModel || '').trim()
    const isGenspark = analysisProviderId === 'genspark'
    const isConfigured = isGenspark || Boolean(apiKey) || (analysisProviderId === 'custom' && Boolean(baseUrl))

    let statusSummary = ''
    if (isGenspark) {
      statusSummary = 'Genspark Cloud Tool (Menggunakan Akun Login GenOffice)'
    } else if (isConfigured) {
      statusSummary = `Aktif (${meta.label} • Model: ${model || 'default'})`
    } else {
      statusSummary = `Belum Dikonfigurasi (${meta.label}: membutuhkan API Key di Pengaturan GenOffice)`
    }

    return {
      providerId: analysisProviderId,
      providerLabel: meta.label,
      model,
      apiKey,
      baseUrl,
      isConfigured,
      isGenspark,
      description: meta.description,
      statusSummary,
    }
  } catch (err: any) {
    return {
      providerId: 'error',
      providerLabel: 'Gagal Membaca Pengaturan GenOffice',
      model: '',
      apiKey: '',
      baseUrl: '',
      isConfigured: false,
      isGenspark: false,
      description: String(err?.message || err),
      statusSummary: 'Terjadi kesalahan saat membaca ai-settings.json',
    }
  }
}

/**
 * Mendaftarkan listener untuk memantau perubahan pengaturan AI GenOffice
 */
export function subscribeGenOfficeAiSettings(callback: () => void): () => void {
  const desktopApi = (window as any).desktop
  const pdfApi = (window as any).pdfApi
  if (desktopApi?.onAiSettingsChanged) {
    return desktopApi.onAiSettingsChanged(callback)
  }
  if (pdfApi?.onAiSettingsChanged) {
    return pdfApi.onAiSettingsChanged(callback)
  }
  return () => { }
}

export const DEFAULT_VISION_CONFIG: VisionProviderConfig = {
  baseUrl: 'https://ai.sumopod.com/v1',
  apiKey: '',
  model: 'gemini/gemini-3.8-flash',
  providerName: 'Pengaturan Analisis Gambar GenOffice',
  providerId: 'genoffice',
  userPrompt: DEFAULT_USER_PROMPT,
  activePreset: 'matanSyarah',
  useGenOfficeSettings: true,
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
  } catch { }
  return config
}

export function saveVisionConfig(patch: Partial<VisionProviderConfig>): VisionProviderConfig {
  const current = getVisionConfig()
  const updated = { ...current, ...patch }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  } catch { }
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

    // Mode 1: Gunakan Penyedia Analisis Gambar dari Pengaturan GenOffice (Default & Terintegrasi)
    if (config.useGenOfficeSettings !== false) {
      const genOfficeInfo = await fetchGenOfficeMediaAnalysisInfo()

      // Prioritas 1.A: Gunakan bridge resmi desktop.analyzeMedia (Terpusat & Menangani Semua Provider BYOK + Genspark)
      if (desktopApi?.analyzeMedia) {
        const res = await desktopApi.analyzeMedia({
          mediaUrls: [dataUrl],
          requirements: prompt,
        })
        if (!res.error && res.text) {
          rawText = res.text.trim()
        } else if (res.error) {
          // Jika analyzeMedia gagal karena issue tertentu tapi info GenOffice memiliki direct apiKey/baseUrl, coba direct fetch
          if (genOfficeInfo.apiKey && genOfficeInfo.baseUrl) {
            rawText = await callDirectVisionApi(dataUrl, prompt, {
              ...config,
              apiKey: genOfficeInfo.apiKey,
              baseUrl: genOfficeInfo.baseUrl,
              model: genOfficeInfo.model,
            })
          } else {
            throw new Error(`Analisis Gambar GenOffice (${genOfficeInfo.providerLabel}): ${res.error}`)
          }
        }
      } else if (genOfficeInfo.apiKey && genOfficeInfo.baseUrl) {
        // Direct fetch menggunakan kredensial GenOffice
        rawText = await callDirectVisionApi(dataUrl, prompt, {
          ...config,
          apiKey: genOfficeInfo.apiKey,
          baseUrl: genOfficeInfo.baseUrl,
          model: genOfficeInfo.model,
        })
      } else {
        throw new Error(
          `Penyedia Analisis Gambar (${genOfficeInfo.providerLabel}) belum dikonfigurasi di Pengaturan GenOffice. Buka Pengaturan AI GenOffice atau atur manual di Pengaturan Plugin.`,
        )
      }
    } else {
      // Mode 2: Kustom Mandiri di Plugin Manuscriber
      if (desktopApi?.visionTranscribe) {
        const res = await desktopApi.visionTranscribe({ dataUrl, prompt, config })
        if (!res.ok) throw new Error(res.error || 'Gagal memanggil Vision AI.')
        rawText = (res.text ?? '').trim()
      } else if (config.apiKey && config.baseUrl) {
        rawText = await callDirectVisionApi(dataUrl, prompt, config)
      } else {
        throw new Error('API Key Vision AI kustom belum diisi. Silakan atur di Pengaturan Manuscriber.')
      }
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

  let cleanedText = (rawText || '').trim()
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
  }

  // Flexible regex yang mendukung [[BLOCK: type=...]], <BLOCK type=...>, tanda kutip, dan berbagai variasi
  const blockRegex = /(?:\[{1,2}|<)BLOCK:?\s*(?:type=)?["']?([a-zA-Z0-9_-]+)?["']?(?:[,\s]+bbox=\[?([0-9,\-\. ]+)\]?)?(?:\]{1,2}|>)([\s\S]*?)(?:(?:\[{1,2}|<)\/?END_BLOCK(?:\]{1,2}|>)|(?=(?:\[{1,2}|<)BLOCK)|$)/gi

  let match: RegExpExecArray | null
  let blockIdx = 0

  while ((match = blockRegex.exec(cleanedText)) !== null) {
    const rawType = (match[1] || 'syarah').toLowerCase()
    const bboxStr = match[2]
    const rawContent = match[3] || ''

    let content = rawContent
      .replace(/\[{1,2}\/?END_BLOCK\]{1,2}/gi, '')
      .replace(/\[{1,2}BLOCK:.*?\]{1,2}/gi, '')
      .trim()

    if (!content) continue
    blockIdx++

    let tag = 'SYARAH'
    let typeStr: string = 'syarah'
    if (rawType.includes('head') || rawType.includes('title') || rawType.includes('judul')) {
      tag = 'HEADING'
      typeStr = 'heading'
    } else if (rawType.includes('matan')) {
      tag = 'MATAN'
      typeStr = 'matan'
    } else if (rawType.includes('hasy') || rawType.includes('foot') || rawType.includes('note')) {
      tag = 'HASYIAH'
      typeStr = 'hasyiah'
    } else if (rawType.includes('marg') || rawType.includes('side')) {
      tag = 'MARGIN'
      typeStr = 'margin'
    } else if (rawType.includes('nadz') || rawType.includes('verse') || rawType.includes('poem')) {
      tag = 'NADZOM'
      typeStr = 'nadzom'
    } else {
      tag = rawType.toUpperCase()
      typeStr = rawType
    }

    let bbox: [number, number, number, number] | undefined
    let box_2d: [number, number, number, number] | undefined

    if (bboxStr) {
      const parts = bboxStr.split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n))
      if (parts.length === 4) {
        const [n0, n1, n2, n3] = parts
        let ymin = 0, xmin = 0, ymax = 0, xmax = 0

        if (n2 > n0 && n3 > n1) {
          // Format standard [ymin, xmin, ymax, xmax]
          ymin = n0
          xmin = n1
          ymax = n2
          xmax = n3
        } else if (n2 <= 1000 && n3 <= 1000 && n0 + n2 <= 1000 && n1 + n3 <= 1000) {
          // Format [x, y, w, h]
          xmin = n0
          ymin = n1
          xmax = n0 + n2
          ymax = n1 + n3
        } else {
          ymin = Math.min(n0, n2)
          xmin = Math.min(n1, n3)
          ymax = Math.max(n0, n2)
          xmax = Math.max(n1, n3)
        }

        box_2d = [Math.round(ymin), Math.round(xmin), Math.round(ymax), Math.round(xmax)]
        const xPct = Math.max(0, Math.min(98, xmin / 10))
        const yPct = Math.max(0, Math.min(98, ymin / 10))
        const wPct = Math.max(2, Math.min(100 - xPct, (xmax - xmin) / 10))
        const hPct = Math.max(1.5, Math.min(100 - yPct, (ymax - ymin) / 10))
        bbox = [xPct, yPct, wPct, hPct]
      }
    }

    if (!bbox) {
      // Default spatial block placement jika AI tidak menyertakan koordinat
      const topPct = Math.min(90, Math.round(8 + (blockIdx - 1) * 9))
      const leftPct = typeStr === 'margin' ? 5 : 10
      const widthPct = typeStr === 'margin' ? 25 : 80
      bbox = [leftPct, topPct, widthPct, 7]
      box_2d = [topPct * 10, leftPct * 10, (topPct + 7) * 10, (leftPct + widthPct) * 10]
    }

    lines.push({
      id: `p${pageNumber}_b${blockIdx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      pageNumber,
      pageNo: pageNumber,
      bbox,
      box_2d,
      originalText: content,
      correctedText: content,
      text: content,
      tag,
      type: typeStr,
      status: 'unverified',
      isRtl: isRtlText(content),
    })
  }

  // Fallback jika Vision AI tidak menggunakan tag [[BLOCK]] sama sekali
  if (lines.length === 0 && cleanedText) {
    const paragraphs = cleanedText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    const count = paragraphs.length
    paragraphs.forEach((p, idx) => {
      const topPct = Math.min(90, Math.round(10 + (idx / Math.max(1, count)) * 80))
      const heightPct = Math.max(4, Math.round(75 / Math.max(1, count)))
      const bbox: [number, number, number, number] = [10, topPct, 80, heightPct]
      const box_2d: [number, number, number, number] = [topPct * 10, 100, (topPct + heightPct) * 10, 900]

      lines.push({
        id: `p${pageNumber}_fb${idx + 1}_${Date.now()}`,
        pageNumber,
        pageNo: pageNumber,
        bbox,
        box_2d,
        originalText: p,
        correctedText: p,
        text: p,
        tag: 'PARAGRAF',
        type: 'syarah',
        status: 'unverified',
        isRtl: isRtlText(p),
      })
    })
  }

  return lines
}

// ============================================================================
// AI Line Prompting & Tashih Prompts & Service
// ============================================================================

export const PEGON_BAKU_SYSTEM_PROMPT = `
Anda adalah Mahaguru dan Pakar Utama Filologi Aksara Pegon Nusantara (Jawa, Sunda, Madura, Melayu).
Tugas Anda adalah menuliskan atau menyempurnakan teks ke dalam Aksara Pegon Baku Pesantren Tradisional Nusantara dengan tingkat ketepatan tertinggi (100% akurat).

=== KAIDAH EMAS EJAAN PEGON BAKU NUSANTARA ===

1. KONSONAN KHAS PEGON (WAJIB DIGUNAKAN, JANGAN DITUKAR KE ARAB STANDAR):
- Cha (c) = چ (Jim dengan 3 titik di dalam/bawah)
- Nga (ng) = ڠ ('Ain dengan 3 titik di atas)
- Pa (p) = ڤ (Fa dengan 3 titik di atas)
- Ga (g) = ڮ (Kaf dengan 3 titik di atas) atau ݢ (Kaf garis atas)
- Nya (ny) = ۑ (Ya dengan 3 titik di bawah) atau ڽ (Nun dengan 3 titik di dalam)
- Dha (dh / d tebal) = ڊ (Dal dengan 1 titik di bawah) atau Dal dengan 3 titik
- Tha (th / t tebal) = ڟ (Tho dengan 3 titik di atas)

2. KAIDAH VOKAL AWAL KATA:
- Vokal /a/ di awal kata = Alif mandiri (ا), contoh: ana = آنا / ان
- Vokal /i/ atau /e/ (taling) di awal kata = Alif diikuti Ya (اي), contoh: iki = ايكي, eling = ايليڠ
- Vokal /u/ atau /o/ di awal kata = Alif diikuti Wawu (او), contoh: urip = اوريڤ, omahe = اوماهي
- Vokal /ĕ/ (pepet) di awal kata = Alif ber-pepet tanpa mad (ا٘ / اَ / أ), contoh: enem = انم / ا٘ن٘م

3. KAIDAH VOKAL MEDIAL (TENGAH) & FINAL (AKHIR):
- Bunyi /a/: suku kata terbuka di akhir kata memakai Alif (ا), contoh: rupa = روڤا, bisa = بيسا. Suku kata tertutup tidak perlu alif kecuali untuk membedakan ambigu (fathah/alif).
- Bunyi /i/: menggunakan Ya (ي), contoh: siji = سيجي, batin = باطين.
- Bunyi /u/: menggunakan Wawu (و), contoh: guru = ڮورو, turu = تورو.
- Bunyi /e/ (taling/téléng): menggunakan Ya (ي), contoh: lele = ليلي.
- Bunyi /o/: menggunakan Wawu (و), contoh: loro = لورو, soto = سوتو.
- Bunyi /ĕ/ (pepet): TIDAK MENGGUNAKAN HURUF 'ILLAT (tanpa Alif, Ya, atau Wawu), melainkan ditulis konsonan langsung atau dengan tanda pepet di atasnya (misal: sega = سڮا / س٘ڮا, bener = بنر / ب٘ن٘ر). Ini sangat krusial agar tidak tertukar dengan /i/ atau /e/.

4. KATA SERAPAN ARAB / ISTILAH TURATS:
- Istilah serapan dari bahasa Arab (Allah, Rasul, shalat, zakat, wudhu, fardhu, kitab, dsb.) HARUS TETAP DITULIS MENURUT EJAAN ARAB ASLINYA (contoh: صلاة bukan سلات, فرض bukan ڤردو, وضوء bukan ودو).

5. ATURAN HASIL OUTPUT:
- Berikan HANYA teks akhir beraksara Pegon yang rapi dan benar.
- JANGAN sertakan pengantar, tanda kutip ekstra, salam, atau penjelasan apapun.
`.trim()

export const HAROKATI_SYSTEM_PROMPT = `
Anda adalah pakar nahwu, sharaf, dan i'rab naskah Arab/Turats.
Tugas Anda: Berikan harakat (syakal/tashkil) lengkap dan tepat pada teks Arab/Pegon yang diberikan.
- Fathah, kasrah, dhammah, sukun, tasydid, dan tanwin harus tepat secara gramatikal (nahwu & sharaf).
- Hasilkan HANYA teks berharakat lengkap tanpa catatan kaki atau penjelasan apapun.
`.trim()

export const MAKNANI_SYSTEM_PROMPT = `
Anda adalah ahli Nahwu, Sharaf, Balaghah, dan tradisi Makna Gandul (Tarjamah Menggantung) kitab kuning Turats pesantren salaf.

Tugas: Berikan makna gandul bahasa Jawa tradisi pesantren salaf pada teks Arab Turats yang diberikan dengan format mengalir yang siap dilafalkan oleh Text-to-Speech (TTS).

---

### 1. RULES PEMOSISIAN JAWA & ARAB (SANGAT PENTING UNTUK TTS):

A. DIBACA SEBELUM LAFADZ ARAB:
   Tulis kata makna Jawa berikut SEBELUM lafadz Arabnya:
   - Khobar: "iku" / "ono iku" (Contoh: iku قَائِمٌ)
   - Khobar Kana: "ono iku" / "ora ono iku" (Contoh: ora ono iku قَائِمًا)
   - Fa'il / Na'ibul Fa'il: "sopo" (berakal) / "opo" (tidak berakal) (Contoh: sopo زَيْدٌ)
   - Tamyiz: "apane" / "ing apane" (Contoh: apane وَجْهًا)

B. DIBACA SESUDAH LAFADZ ARAB:
   Semua jenis makna tarkib lainnya ditulis SETELAH lafadz Arabnya.
   - Mubtada': زَيْدٌ utawi Zaid
   - Maf'ul Bih: زَيْدًا ing Zaid
   - Hal: رَاكِبًا hale wong kang numpak
   - Sifat/Na'at: العَالِمُ kang alim
   - Mudhof Ilaih: كِتَابُ زَيْدٍ kitabe Zaid
   - Syarat: إِنْ lamun ..., Jawab Syarat: ... mongko ...

C. PENGELOMPOKAN KATA & FRASA:
   - Kata Tunggal: Maknai langsung per kata.
   - Frasa / Gabungan Kata (Idhofah, Jar-Majrur, Na'at-Man'ut): Boleh digabung menjadi satu kesatuan frasa pelafalan agar ritme pembacaan TTS natural dan tidak terputus-putus.

---

### 2. PANDUAN RINGKAS TARKIB & MAKNA GANDUL:

* Marfu'at:
  - Mubtada': [Lafadz] utawi ...
  - Khobar / Khobar Inna: iku [Lafadz] / ono iku [Lafadz]
  - Fa'il / Na'ibul Fa'il: sopo [Lafadz] (berakal) | opo [Lafadz] (tidak berakal)
  - Isim Kana: [Lafadz] ono sopo / ono opo ...
  - jika ada mubtada' yang taqddiri maka makna tetap di baca, seperti : "fashlun" ay "hadza fashlun", utawi iki, iku fasl suwiji.

* Manshubat:
  - Maf'ul Bih: [Lafadz] ing ...
  - Maf'ul Fih (Zhorof): [Lafadz] ing dalem / ing ngarepe ...
  - Maf'ul Liajlih: [Lafadz] kerono / arahe ...
  - Maf'ul Muthlaq: [Lafadz] kelawan ... temenan
  - Hal: [Lafadz] hale / kalih ...
  - Tamyiz: apane [Lafadz]
  - Khobar Kana: ono iku [Lafadz] / ora ono iku [Lafadz]
  - Isim Inna: [Lafadz] sak temene ...
  - Munada: [Lafadz] he / duh ...

* Majrurat & Tawabi':
  - Mudhof Ilaih: [Lafadz]-e / -ne / ing duweke ...
  - Sifat/Na'at: [Lafadz] kang ...
  - Badal / Athof Bayan: [Lafadz] nyatane / rupane ...
  - Athof Nasaq: [Lafadz] lan / sarto / nuli / utowo ...

* Fi'il, Huruf & Ketentuan Lain:
  - Zaman Fi'il: Madhi ([Lafadz] wis ...), Mudhore' ([Lafadz] lagi / bakal ...)
  - Nafi / Negasi: ora / ora ono [Lafadz]
  - Syarat & Jawab: [Lafadz] lamun ... mongko ...

---

### 3. FORMAT OUTPUT TTS (STRICT):
1. DILARANG keras menggunakan kode huruf/singkatan bracket (seperti [م:], [خ:], [ف:], [مف:]).
2. Wajib memberikan syakal/harakat LENGKAP pada setiap lafadz Arab agar fonetik TTS akurat.
3. Gunakan tanda baca koma (,) atau titik (.) untuk memberi jeda napas yang pas saat dilafalkan mesin TTS.
4. Hasilkan HANYA teks akhir hasil pemaknaan gandul tanpa salam, pembuka, atau penjelasan tambahan apa pun.

Contoh Output Ideal:
- زَيْدٌ utawi Zaid, iku قَائِمٌ wong kang ngadeg.
- قَامَ wis ngadeg, sopo زَيْدٌ Zaid.
- كَبُرَ wus agung, apane كَلِمَةً keucapane.
`.trim();


function cleanAiLineResponse(text: string): string {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim()
  }
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith('«') && cleaned.endsWith('»'))) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  return cleaned
}

export async function callAiTextPrompt(
  userText: string,
  instruction: string,
  systemPrompt?: string,
): Promise<string> {
  const config = getVisionConfig()
  const sys = systemPrompt || 'Anda adalah ahli filologi naskah Arab dan Pegon Nusantara.'
  const fullPrompt = `${sys}\n\nTEKS SUMBER:\n"""\n${userText}\n"""\n\nINSTRUKSI PENGGUNA:\n"""\n${instruction}\n"""\n\nATURAN WAJIB:\n- Hasilkan HANYA teks akhir hasil modifikasi.\n- JANGAN tambahkan penjelasan, terjemahan, kata pengantar, atau tanda kutip tambahan.`

  const desktopApi = (window as any).desktop

  // 1. Coba lewat Pengaturan GenOffice (Default)
  if (config.useGenOfficeSettings !== false) {
    const genOfficeInfo = await fetchGenOfficeMediaAnalysisInfo()

    if (desktopApi?.analyzeMedia) {
      const dummyUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAA'
      try {
        const res = await desktopApi.analyzeMedia({
          mediaUrls: [dummyUrl],
          requirements: fullPrompt,
        })
        if (!res.error && res.text) {
          return cleanAiLineResponse(res.text)
        }
      } catch { }
    }

    if (genOfficeInfo.apiKey && genOfficeInfo.baseUrl) {
      return await callDirectChatApi(fullPrompt, {
        apiKey: genOfficeInfo.apiKey,
        baseUrl: genOfficeInfo.baseUrl,
        model: genOfficeInfo.model || 'gemini/gemini-2.5-flash',
      })
    }
  }

  // 2. Kustom mandiri di Plugin
  if (config.apiKey && config.baseUrl) {
    return await callDirectChatApi(fullPrompt, {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
    })
  }

  throw new Error('Penyedia AI belum dikonfigurasi. Silakan atur di Pengaturan GenOffice atau Manuscriber.')
}

async function callDirectChatApi(
  prompt: string,
  cfg: { apiKey: string; baseUrl: string; model: string },
): Promise<string> {
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60_000)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
        temperature: 0.2,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`AI (${res.status}): ${errText.slice(0, 180)}`)
    }
    const json = await res.json()
    const content = json.choices?.[0]?.message?.content ?? ''
    return cleanAiLineResponse(content)
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') throw new Error('Permintaan AI time-out (60 detik).')
    throw err
  }
}
