/**
 * Manuscriber Plugin — Digitizer Pipeline Service
 * 3-Stage Pipeline:
 *  - Pass 1: Two-Pass Page Geometry & Layout Detection
 *  - Pass 2: Coordinated Text Blocks Extraction
 *  - Pass 3: Multi-Language Linguistic Tahqiq (Arab, Jawa Pegon, Sunda, Melayu, ID)
 *  - 1:1 Docx HTML & Ops Compilation
 */

import type {
  PageGeometrySpec,
  DigitizerBlock,
  DigitizerLanguageProfile,
  VisionProviderConfig,
  BlockType,
} from '../types'
import {
  getVisionConfig,
  fetchGenOfficeMediaAnalysisInfo,
  callDirectVisionApi,
  isRtlText,
} from './visionService'

export const LANGUAGE_LABELS: Record<DigitizerLanguageProfile, { name: string; icon: string; description: string }> = {
  ar: {
    name: 'Bahasa Arab (Turats & Fusha)',
    icon: '📜',
    description: 'Kaidah Nahwu, Sharaf, Imla\', Hamzah, Harakat & Wazan Nadzom',
  },
  jawa_pegon: {
    name: 'Jawa Pegon (Makna Gandul Pesantren)',
    icon: '🕌',
    description: 'Rumus Tarkib (م, خ, ف, مف, ظ, ح) & Konsonan Pegon (چ, ڠ, ڤ, ݢ, ڽ)',
  },
  sunda_pegon: {
    name: 'Sunda Pegon',
    icon: '🌿',
    description: 'Kaidah Aksara Pegon Tatar Pasundan & Vokal Sunda',
  },
  melayu_klasik: {
    name: 'Melayu Klasik (Kitab Jawi)',
    icon: '🧭',
    description: 'Ejaan Jawi Melayu Kuno & Istilah Klasik',
  },
  id: {
    name: 'Bahasa Indonesia',
    icon: '🇮🇩',
    description: 'Kaidah Ejaan & Gramatika Bahasa Indonesia',
  },
}

/**
 * Universal caller for LLM Vision or Text analysis supporting both
 * GenOffice Desktop Bridge and Direct fetch fallback.
 */
async function callAiService(
  prompt: string,
  dataUrl?: string,
  overrideConfig?: VisionProviderConfig
): Promise<string> {
  const config = overrideConfig || getVisionConfig()
  const desktopApi = (window as any).desktop

  // 1. If GenOffice settings is enabled (default)
  if (config.useGenOfficeSettings !== false) {
    const genOfficeInfo = await fetchGenOfficeMediaAnalysisInfo()
    if (desktopApi?.analyzeMedia) {
      const res = await desktopApi.analyzeMedia({
        mediaUrls: dataUrl ? [dataUrl] : [],
        requirements: prompt,
      })
      if (!res.error && res.text) {
        return res.text.trim()
      }
      if (res.error && !genOfficeInfo.apiKey) {
        throw new Error(`Analisis AI GenOffice (${genOfficeInfo.providerLabel}): ${res.error}`)
      }
    }
    if (genOfficeInfo.apiKey && genOfficeInfo.baseUrl) {
      if (dataUrl) {
        return await callDirectVisionApi(dataUrl, prompt, {
          ...config,
          apiKey: genOfficeInfo.apiKey,
          baseUrl: genOfficeInfo.baseUrl,
          model: genOfficeInfo.model,
        })
      }
    }
  }

  // 2. Direct fetch fallback with config
  if (dataUrl && config.apiKey && config.baseUrl) {
    return await callDirectVisionApi(dataUrl, prompt, config)
  }

  // 3. Text-only direct fetch
  if (!dataUrl && config.apiKey && config.baseUrl) {
    const baseUrl = (config.baseUrl || 'https://ai.sumopod.com/v1').replace(/\/+$/, '')
    const url = `${baseUrl}/chat/completions`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`LLM Error (${res.status}): ${errText.slice(0, 200)}`)
    }

    const json = await res.json()
    const content = json.choices?.[0]?.message?.content ?? ''
    if (!content) throw new Error('Tidak ada respon teks yang diterima dari model.')
    return content.trim()
  }

  throw new Error('Penyedia AI belum dikonfigurasi. Pastikan Pengaturan AI GenOffice aktif atau atur API Key di Setelan Manuscriber.')
}

/**
 * Parses JSON response safely even if wrapped in markdown codeblocks.
 */
function parseSafeJson<T>(raw: string, fallback: T): T {
  try {
    const clean = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim()
    return JSON.parse(clean) as T
  } catch (err) {
    console.warn('Failed to parse JSON directly, attempting regex extraction:', err)
    const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T
      } catch {
        // ignored
      }
    }
    return fallback
  }
}

/**
 * Generates a clean synthetic manuscript page image (canvas dataUrl)
 * containing parchment background, double border jadwal, heading, nadzom couplet,
 * syarah lines, and makna gandul annotations for instant testing.
 */
export function createSampleManuscriptDataUrl(): string {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 1100
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // 1. Parchment paper background
  ctx.fillStyle = '#fbf7ee'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 2. Double border (jadwal)
  ctx.strokeStyle = '#4a3525'
  ctx.lineWidth = 2.5
  ctx.strokeRect(45, 45, canvas.width - 90, canvas.height - 90)
  ctx.lineWidth = 1
  ctx.strokeRect(54, 54, canvas.width - 108, canvas.height - 108)

  // 3. Header text
  ctx.fillStyle = '#1a1a1a'
  ctx.font = 'bold 24px "Traditional Arabic", "Amiri", serif'
  ctx.textAlign = 'center'
  ctx.direction = 'rtl'
  ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ - بَابُ الْكَلَامِ', canvas.width / 2, 120)

  // 4. Nadzom Couplet Box
  ctx.font = 'bold 20px "Traditional Arabic", "Amiri", serif'
  ctx.fillText('كَلَامُنَا لَفْظٌ مُفِيدٌ كَاسْتَقِمْ  *  وَاسْمٌ وَفِعْلٌ ثُمَّ حَرْفٌ الْكَلِمْ', canvas.width / 2, 200)

  // 5. Syarah Lines
  ctx.font = '17px "Traditional Arabic", "Amiri", serif'
  ctx.textAlign = 'right'
  ctx.fillText('قَوْلُهُ: (كَلَامُنَا) أَيْ مَعَاشِرَ النُّحَاةِ، هُوَ اللَّفْظُ الْمُرَكَّبُ الْمُفِيدُ بِالْوَضْعِ.', canvas.width - 85, 275)
  ctx.fillText('وَأَقْسَامُهُ الَّتِي يَتَأَلَّفُ مِنْهَا ثَلَاثَةٌ: اسْمٌ، وَفِعْلٌ، وَحَرْفٌ جَاءَ لِمَعْنًى.', canvas.width - 85, 330)
  ctx.fillText('فَالِاسْمُ يُعْرَفُ بِالْخَفْضِ وَالتَّنْوِينِ وَدُخُولِ الْأَلِفِ وَاللَّامِ وَحُرُوفِ الْخَفْضِ.', canvas.width - 85, 385)
  ctx.fillText('وَالْفِعْلُ يُعْرَفُ بِقَدْ، وَالسِّينِ، وَسَوْفَ، وَتَاءِ التَّأْنِيثِ السَّاكِنَةِ.', canvas.width - 85, 440)
  ctx.fillText('وَالْحَرْفُ مَا لَا يَصْلُحُ مَعَهُ دَلِيلُ الِاسْمِ وَلَا دَلِيلُ الْفِعْلِ.', canvas.width - 85, 495)

  // 6. Makna Gandul / Pegon note
  ctx.font = 'italic 15px "Traditional Arabic", "Amiri", serif'
  ctx.fillStyle = '#3b4252'
  ctx.fillText('[م: utawi kalam iku] [خ: iku lafadz kang maedahi kelawan bener]', canvas.width - 85, 555)

  // 7. Margin / Hasyiah
  ctx.strokeStyle = '#8c7355'
  ctx.beginPath()
  ctx.moveTo(70, 720)
  ctx.lineTo(canvas.width - 70, 720)
  ctx.stroke()

  ctx.font = '14px "Traditional Arabic", "Amiri", serif'
  ctx.fillStyle = '#555555'
  ctx.fillText('[حَاشِيَةٌ] هَذَا الشَّرْحُ الْمُبَارَكُ عَلَى مَتْنِ الْآجُرُّومِيَّةِ لِأَهْلِ الْفَهْمِ وَالتَّحْقِيقِ.', canvas.width - 85, 760)

  return canvas.toDataURL('image/jpeg', 0.9)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Pass 1: Pixel-Accurate Physical Page Geometry & Layout Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fast, robust Computer Vision analysis of physical manuscript image:
 * Detects paper aspect ratio, parchment tone, presence of outer Jadwal frame,
 * frame border style ('double' vs 'single'), and pixel-accurate margin lengths.
 */
export async function analyzePhysicalPageGeometry(dataUrl: string): Promise<Partial<PageGeometrySpec>> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const w = img.naturalWidth || 800
        const h = img.naturalHeight || 1100
        const aspectRatio = Number((h / w).toFixed(3))

        // Determine standard paper size based on physical aspect ratio
        let paperSize: 'B5' | 'A4' | 'Letter' | 'Custom' = 'B5'
        let targetPaperWidthCm = 17.6
        let targetPaperHeightCm = 25.0

        if (aspectRatio >= 1.38 && aspectRatio <= 1.45) {
          paperSize = 'B5'
          targetPaperWidthCm = 17.6
          targetPaperHeightCm = 25.0
        } else if (aspectRatio < 1.35) {
          paperSize = 'Letter'
          targetPaperWidthCm = 21.59
          targetPaperHeightCm = 27.94
        } else if (aspectRatio > 1.45) {
          paperSize = 'Custom'
          targetPaperWidthCm = 18.0
          targetPaperHeightCm = Number((18.0 * aspectRatio).toFixed(1))
        }

        // Draw onto downscaled analysis canvas for high performance
        const maxDim = 800
        const scale = Math.min(1, maxDim / Math.max(w, h))
        const cw = Math.round(w * scale)
        const ch = Math.round(h * scale)

        const canvas = document.createElement('canvas')
        canvas.width = cw
        canvas.height = ch
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve({ paperSize, aspectRatio })
          return
        }

        ctx.drawImage(img, 0, 0, cw, ch)
        const imgData = ctx.getImageData(0, 0, cw, ch)
        const data = imgData.data

        // 1. Sample background parchment tone from 4 corners
        const cornerSamples: Array<[number, number, number]> = []
        const samplePoints = [
          [Math.max(2, Math.round(cw * 0.02)), Math.max(2, Math.round(ch * 0.02))],
          [Math.min(cw - 3, Math.round(cw * 0.98)), Math.max(2, Math.round(ch * 0.02))],
          [Math.max(2, Math.round(cw * 0.02)), Math.min(ch - 3, Math.round(ch * 0.98))],
          [Math.min(cw - 3, Math.round(cw * 0.98)), Math.min(ch - 3, Math.round(ch * 0.98))],
          [Math.round(cw * 0.5), Math.max(2, Math.round(ch * 0.02))],
        ]
        for (const [sx, sy] of samplePoints) {
          const idx = (sy * cw + sx) * 4
          cornerSamples.push([data[idx], data[idx + 1], data[idx + 2]])
        }
        const avgR = Math.round(cornerSamples.reduce((a, b) => a + b[0], 0) / cornerSamples.length)
        const avgG = Math.round(cornerSamples.reduce((a, b) => a + b[1], 0) / cornerSamples.length)
        const avgB = Math.round(cornerSamples.reduce((a, b) => a + b[2], 0) / cornerSamples.length)
        const bgLuminance = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB
        const hasShading = bgLuminance < 252
        const shadingTone = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`

        // 2. Scan for dark frame lines (Jadwal)
        const findHorizontalLine = (yStart: number, yEnd: number, step: number): number[] => {
          const lines: number[] = []
          const xStart = Math.round(cw * 0.15)
          const xEnd = Math.round(cw * 0.85)
          const spanLen = xEnd - xStart

          for (let y = yStart; step > 0 ? y <= yEnd : y >= yEnd; y += step) {
            let darkCount = 0
            for (let x = xStart; x <= xEnd; x += 2) {
              const idx = (y * cw + x) * 4
              const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
              if (lum < bgLuminance - 30) {
                darkCount++
              }
            }
            if (darkCount / (spanLen / 2) > 0.50) {
              if (lines.length === 0 || Math.abs(lines[lines.length - 1] - y) > 2) {
                lines.push(y)
              }
            }
          }
          return lines
        }

        const findVerticalLine = (xStart: number, xEnd: number, step: number): number[] => {
          const lines: number[] = []
          const yStart = Math.round(ch * 0.15)
          const yEnd = Math.round(ch * 0.85)
          const spanLen = yEnd - yStart

          for (let x = xStart; step > 0 ? x <= xEnd : x >= xEnd; x += step) {
            let darkCount = 0
            for (let y = yStart; y <= yEnd; y += 2) {
              const idx = (y * cw + x) * 4
              const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
              if (lum < bgLuminance - 30) {
                darkCount++
              }
            }
            if (darkCount / (spanLen / 2) > 0.50) {
              if (lines.length === 0 || Math.abs(lines[lines.length - 1] - x) > 2) {
                lines.push(x)
              }
            }
          }
          return lines
        }

        const topLines = findHorizontalLine(Math.round(ch * 0.01), Math.round(ch * 0.25), 1)
        const bottomLines = findHorizontalLine(Math.round(ch * 0.99), Math.round(ch * 0.75), -1)
        const leftLines = findVerticalLine(Math.round(cw * 0.01), Math.round(cw * 0.25), 1)
        const rightLines = findVerticalLine(Math.round(cw * 0.99), Math.round(cw * 0.75), -1)

        const hasBorder = topLines.length > 0 && bottomLines.length > 0 && leftLines.length > 0 && rightLines.length > 0
        const isDouble =
          topLines.length >= 2 || bottomLines.length >= 2 || leftLines.length >= 2 || rightLines.length >= 2

        let topFrac = 0.05
        let bottomFrac = 0.05
        let leftFrac = 0.06
        let rightFrac = 0.06

        if (hasBorder) {
          topFrac = topLines[0] / ch
          bottomFrac = (ch - bottomLines[0]) / ch
          leftFrac = leftLines[0] / cw
          rightFrac = (cw - rightLines[0]) / cw
        }

        const topCm = Math.max(0.6, Number((topFrac * targetPaperHeightCm).toFixed(1)))
        const bottomCm = Math.max(0.6, Number((bottomFrac * targetPaperHeightCm).toFixed(1)))
        const leftCm = Math.max(0.6, Number((leftFrac * targetPaperWidthCm).toFixed(1)))
        const rightCm = Math.max(0.6, Number((rightFrac * targetPaperWidthCm).toFixed(1)))

        resolve({
          paperSize,
          orientation: 'portrait',
          aspectRatio,
          margins: {
            top: `${topCm}cm`,
            bottom: `${bottomCm}cm`,
            left: `${leftCm}cm`,
            right: `${rightCm}cm`,
          },
          hasBorder,
          borderStyle: hasBorder ? (isDouble ? 'double' : 'single') : 'none',
          borderColor: '#4a3525',
          hasShading,
          shadingTone,
          jadwalInsetPercent: {
            top: Number((topFrac * 100).toFixed(1)),
            bottom: Number((bottomFrac * 100).toFixed(1)),
            left: Number((leftFrac * 100).toFixed(1)),
            right: Number((rightFrac * 100).toFixed(1)),
          },
          nadzomStructure: 'two_column_symmetric',
          estimatedHeadingFontSize: 16,
          estimatedBodyFontSize: 13,
          estimatedMarginFontSize: 10,
        })
      } catch (e) {
        console.warn('Physical geometry CV failed, falling back:', e)
        resolve({})
      }
    }
    img.onerror = () => resolve({})
    img.src = dataUrl
  })
}

export async function detectPageGeometryPass1(
  dataUrl: string,
  language: DigitizerLanguageProfile
): Promise<PageGeometrySpec> {
  // 1. Run Pixel-accurate Computer Vision detection first
  const measured = await analyzePhysicalPageGeometry(dataUrl)

  const prompt = `
Anda adalah pakar filologi dan insinyur layout naskah kuno (manuskrip / turats / kitab klasik).
Tugas Anda adalah memvalidasi GEOMETRI FISIK & STRUKTUR TATA LETAK halaman naskah ini.
Ukuran kertas terdeteksi: ${measured.paperSize || 'B5'}, Bingkai Jadwal: ${measured.borderStyle || 'double'}, Margin: Atas ${measured.margins?.top || '1.2cm'}, Kiri ${measured.margins?.left || '1.0cm'}.

Perhatikan elemen fisik halaman:
1. Struktur penataan bait puisi/syair ('nadzomStructure'):
   - 'none': teks prosa biasa
   - 'two_column_symmetric': bait syair dua kolom simetris (kanan syathr awal, kiri syathr tsani)
   - 'multi_couplet': kumpulan bait berangkai
2. Estimasi ukuran font relatif dalam satuan pt (heading: 14-20pt, body: 12-14pt, margin: 9-11pt).

WAJIB: Kembalikan HANYA format JSON valid:
{
  "paperSize": "${measured.paperSize || 'B5'}",
  "orientation": "portrait",
  "margins": {
    "top": "${measured.margins?.top || '1.2cm'}",
    "bottom": "${measured.margins?.bottom || '1.2cm'}",
    "left": "${measured.margins?.left || '1.0cm'}",
    "right": "${measured.margins?.right || '1.0cm'}"
  },
  "hasBorder": ${measured.hasBorder ?? true},
  "borderStyle": "${measured.borderStyle || 'double'}",
  "borderColor": "${measured.borderColor || '#4a3525'}",
  "hasShading": ${measured.hasShading ?? true},
  "shadingTone": "${measured.shadingTone || '#fbf7ee'}",
  "nadzomStructure": "two_column_symmetric",
  "estimatedHeadingFontSize": 16,
  "estimatedBodyFontSize": 13,
  "estimatedMarginFontSize": 10,
  "rawAnalysisNotes": "Geometri fisik terukur akurat dengan Computer Vision."
}
`.trim()

  try {
    const raw = await callAiService(prompt, dataUrl)
    const parsed = parseSafeJson<PageGeometrySpec>(raw, {} as PageGeometrySpec)
    return {
      paperSize: measured.paperSize || parsed.paperSize || 'B5',
      orientation: 'portrait',
      margins: {
        top: measured.margins?.top || parsed.margins?.top || '1.2cm',
        bottom: measured.margins?.bottom || parsed.margins?.bottom || '1.2cm',
        left: measured.margins?.left || parsed.margins?.left || '1.0cm',
        right: measured.margins?.right || parsed.margins?.right || '1.0cm',
      },
      hasBorder: measured.hasBorder ?? parsed.hasBorder ?? true,
      borderStyle: measured.borderStyle || parsed.borderStyle || 'double',
      borderColor: measured.borderColor || parsed.borderColor || '#4a3525',
      hasShading: measured.hasShading ?? parsed.hasShading ?? true,
      shadingTone: measured.shadingTone || parsed.shadingTone || '#fbf7ee',
      nadzomStructure: parsed.nadzomStructure || measured.nadzomStructure || 'two_column_symmetric',
      estimatedHeadingFontSize: parsed.estimatedHeadingFontSize || 16,
      estimatedBodyFontSize: parsed.estimatedBodyFontSize || 13,
      estimatedMarginFontSize: parsed.estimatedMarginFontSize || 10,
      aspectRatio: measured.aspectRatio || 1.375,
      jadwalInsetPercent: measured.jadwalInsetPercent || { top: 4.1, bottom: 4.1, left: 5.6, right: 5.6 },
      rawAnalysisNotes: parsed.rawAnalysisNotes || 'Geometri fisik dan margin berhasil terdeteksi dari citra.',
    }
  } catch (err) {
    console.warn('AI Pass 1 layout detection fallback:', err)
    return {
      paperSize: measured.paperSize || 'B5',
      orientation: 'portrait',
      margins: {
        top: measured.margins?.top || '1.2cm',
        bottom: measured.margins?.bottom || '1.2cm',
        left: measured.margins?.left || '1.0cm',
        right: measured.margins?.right || '1.0cm',
      },
      hasBorder: measured.hasBorder ?? true,
      borderStyle: measured.borderStyle || 'double',
      borderColor: measured.borderColor || '#4a3525',
      hasShading: measured.hasShading ?? true,
      shadingTone: measured.shadingTone || '#fbf7ee',
      nadzomStructure: measured.nadzomStructure || 'two_column_symmetric',
      estimatedHeadingFontSize: measured.estimatedHeadingFontSize || 16,
      estimatedBodyFontSize: measured.estimatedBodyFontSize || 13,
      estimatedMarginFontSize: measured.estimatedMarginFontSize || 10,
      aspectRatio: measured.aspectRatio || 1.375,
      jadwalInsetPercent: measured.jadwalInsetPercent || { top: 4.1, bottom: 4.1, left: 5.6, right: 5.6 },
      rawAnalysisNotes: 'Geometri fisik terukur dengan Computer Vision lokal.',
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Pass 2: Coordinated Text Blocks Extraction
// ─────────────────────────────────────────────────────────────────────────────

export async function extractBlocksPass2(
  dataUrl: string,
  geometry: PageGeometrySpec,
  language: DigitizerLanguageProfile,
  pageNo: number
): Promise<DigitizerBlock[]> {
  const langMeta = LANGUAGE_LABELS[language]

  const prompt = `
=== EKSTRAKSI BLOK TEKS NASKAH TERKOORDINAT (STAGE 2) ===
Bahasa Naskah Terpilih: ${langMeta.name} (${langMeta.description}).
Tata Letak Terdeteksi: Kertas ${geometry.paperSize}, Bingkai Jadwal: ${geometry.borderStyle}, Nadzom: ${geometry.nadzomStructure}.

Instruksi Tugas:
1. Pindai dan ekstrak SEMUA blok teks fisik pada halaman ini.
2. Setiap blok harus memiliki bounding box [ymin, xmin, ymax, xmax] dengan koordinat integer 0-1000 (0,0 kiri-atas, 1000,1000 kanan-bawah).
   - Kotak harus TIGHT mengitari batas fisik teks blok tersebut.
3. Klasifikasikan tipe blok ("type"):
   - "heading": Judul kitab, bab, fashl, basmalah pembuka, hamdalah
   - "matan": Teks pokok naskah
   - "syarah": Paragraf penjelasan mengalir
   - "nadzom": Bait syair (dua belahan yang disatukan atau dipisahkan tanda bintang * atau | )
   - "hasyiah": Catatan kaki penjelas di bawah garis batas
   - "margin": Catatan pinggir / ta'liqat di luar kotak jadwal
   - "numbering": Nomor bait, angka arab timur (١, ٢, ٣), atau abjadun
4. Transkripsikan teks verbatim sesuai apa yang tampak (pertahankan harakat lengkap dan karakter khas bahasa).
   - Jangan berhalusinasi atau menambah teks yang tidak ada di kertas.
   - Tandai bagian naskah robek/lapuk tak terbaca dengan [غير مقروء].

WAJIB: Kembalikan HANYA format JSON valid:
{
  "blocks": [
    {
      "type": "heading" | "matan" | "syarah" | "nadzom" | "hasyiah" | "margin" | "numbering",
      "bbox": [ymin, xmin, ymax, xmax],
      "text": "Teks transkripsi verbatim blok di sini..."
    }
  ]
}
`.trim()

  try {
    const raw = await callAiService(prompt, dataUrl)
    const parsed = parseSafeJson<{ blocks: Array<{ type: string; bbox: [number, number, number, number]; text: string }> }>(
      raw,
      { blocks: [] }
    )

    if (parsed.blocks && parsed.blocks.length > 0) {
      return parsed.blocks.map((b, idx) => {
        const rawText = (b.text || '').trim()
        return {
          id: `block_p${pageNo}_${idx + 1}_${Date.now().toString(36)}`,
          pageNo,
          type: (b.type as BlockType) || 'syarah',
          bbox: Array.isArray(b.bbox) && b.bbox.length === 4 ? b.bbox : [100 + idx * 50, 100, 140 + idx * 50, 900],
          rawOcrText: rawText,
          tahqiqText: rawText,
          confidence: 0.95,
          status: 'raw',
          isRtl: isRtlText(rawText),
        }
      })
    }
    throw new Error('AI Vision tidak menemukan blok teks terdeteksi pada halaman PDF ini.')
  } catch (err: any) {
    console.error('AI Pass 2 text extraction error:', err)
    throw new Error(err?.message || 'Gagal mengekstrak teks dari citra naskah PDF.')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Pass 3: Multi-Language Linguistic Tahqiq
// ─────────────────────────────────────────────────────────────────────────────

export async function runLinguisticTahqiqPass3(
  blocks: DigitizerBlock[],
  language: DigitizerLanguageProfile,
  dataUrl?: string
): Promise<DigitizerBlock[]> {
  if (blocks.length === 0) return []

  const langMeta = LANGUAGE_LABELS[language]

  let languageGuidelines = ''
  if (language === 'ar') {
    languageGuidelines = `
- Anda adalah Muhaqqiq Senior Kitab Turats & Pakar Linguistik Arab Fusha.
- Periksa kesesuaian gramatika (Nahwu & Sharaf): huruf 'illat, hamzah washl/qath'i, tanda waqaf, marfu'/manshub/majrur.
- Perbaiki harakat yang terputus atau salah baca titik (misal: nun terbaca ba, qaf terbaca fa).
- Untuk bait nadzom, pastikan wazan bahar syair selaras dan seimbang.
- Jaga keaslian redaksi penulis: JANGAN mengubah diksi atau memparafrase kalimat pengarang.
`
  } else if (language === 'jawa_pegon') {
    languageGuidelines = `
- Anda adalah Filolog Naskah Pegon Jawa dan Ahli Makna Gandul Pesantren Salaf.
- Konsonan Pegon Khas Wajib Dipertahankan: چ (ca), ڠ (nga), ڤ (pa), ݢ (ga), ڽ (nya). Jangan menurunkannya ke huruf Arab standar (misal: ݢ jangan jadi kaf biasa).
- Rumus Tarkib Makna Gandul: Validasi konsistensi kode tarkib:
  * م = utawi (Mubtada')
  * خ = iku (Khobar)
  * ف = sopo/opo (Fa'il)
  * مف = ing (Maf'ul bih)
  * ظ = ing dalem (Zhorof)
  * ح = hale (Hal)
  * ت = apane (Tamyiz)
  * ص = kang (Sifat/Na'at)
  * ب = rupane (Badal)
  * ع = lan (Athaf)
  * ش = lamun (Syarat)
  * ج = mongko (Jawab)
- Perbaiki huruf yang terdistorsi saat OCR tanpa menghilangkan dialek lokal naskah.
`
  } else if (language === 'sunda_pegon') {
    languageGuidelines = `
- Anda adalah Ahli Naskah Pegon Sunda Tatar Pasundan.
- Pertahankan konsonan Pegon khas Sunda dan vokal khusus (eu, o, dll).
- Koreksi salah baca OCR dengan tetap menjaga redaksi Sunda buhun/klasik.
`
  } else if (language === 'melayu_klasik') {
    languageGuidelines = `
- Anda adalah Pakar Filologi Kitab Jawi Melayu Klasik.
- Pertahankan ejaan Jawi Melayu kuno (huruf gha, nya, cha, nga, pa).
- Koreksi saltik OCR sesuai leksikon naskah Melayu kuno.
`
  } else {
    languageGuidelines = `
- Anda adalah Editor Tata Bahasa Indonesia Formal.
- Koreksi saltik OCR, ejaan huruf rusak, dan tanda baca dengan tetap mempertahankan arti kalimat.
`
  }

  const promptPayload = blocks.map((b, i) => ({
    index: i,
    type: b.type,
    text: b.rawOcrText,
  }))

  const prompt = `
=== PROSES TAHQIQ & KOREKSI OCR CERDAS (${langMeta.name}) ===
Pedoman Keilmuan:
${languageGuidelines.trim()}

Daftar Blok Transkripsi Naskah:
${JSON.stringify(promptPayload, null, 2)}

Tugas Anda:
1. Analisis setiap blok teks.
2. Bandingkan kemungkinan salah baca visual OCR (huruf titik kabur, noda tinta, harakat bergeser).
3. Berikan teks hasil tahqiq ("tahqiqText") yang benar, valid, gramatikal, dan dapat dibaca sempurna.
4. Tulis catatan singkat ("diffNotes") jika ada koreksi (misal: "Memperbaiki huruf ݢ yang terbaca kaf", "Menyelaraskan harakat nashob maf'ul"). Jika teks sudah sempurna, isi diffNotes dengan "Sesuai fisik naskah".

WAJIB: Kembalikan HANYA format JSON valid:
{
  "results": [
    {
      "index": 0,
      "tahqiqText": "Teks hasil tahqiq...",
      "diffNotes": "Alasan perbaikan..."
    }
  ]
}
`.trim()

  try {
    const raw = await callAiService(prompt, dataUrl)
    const parsed = parseSafeJson<{ results: Array<{ index: number; tahqiqText: string; diffNotes: string }> }>(
      raw,
      { results: [] }
    )

    const updatedBlocks = [...blocks]
    for (const res of parsed.results || []) {
      if (typeof res.index === 'number' && updatedBlocks[res.index]) {
        updatedBlocks[res.index] = {
          ...updatedBlocks[res.index],
          tahqiqText: (res.tahqiqText || updatedBlocks[res.index].rawOcrText).trim(),
          diffNotes: res.diffNotes || 'Telah divalidasi',
          status: 'tahqiq_done',
        }
      }
    }
    return updatedBlocks
  } catch (err) {
    console.warn('Linguistic Tahqiq fallback due to error:', err)
    return blocks.map((b) => ({
      ...b,
      tahqiqText: b.rawOcrText,
      diffNotes: 'Validasi lokal (melewati LLM)',
      status: 'tahqiq_done',
    }))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Compilation to Docx 1:1 HTML & GenOffice Formatting
// ─────────────────────────────────────────────────────────────────────────────

export function compileToDocxHtml(
  geometry: PageGeometrySpec,
  blocks: DigitizerBlock[],
  includeOuterPageWrapper: boolean = true
): string {
  const isRtl = blocks.some((b) => b.isRtl)
  const dirAttr = isRtl ? 'dir="rtl"' : 'dir="ltr"'
  const fontFamily = isRtl ? "'Traditional Arabic', 'Amiri Quran', Arial" : "'Segoe UI', Arial, sans-serif"

  const borderCss = geometry.hasBorder
    ? geometry.borderStyle === 'double'
      ? `border: 3px double ${geometry.borderColor || '#4a3525'};`
      : `border: 1.5px solid ${geometry.borderColor || '#4a3525'};`
    : 'border: none;'

  const bgCss = geometry.hasShading && geometry.shadingTone
    ? `background-color: ${geometry.shadingTone};`
    : 'background-color: #ffffff;'

  const marginPadding = `padding: ${geometry.margins.top || '1.2cm'} ${geometry.margins.right || '1.0cm'} ${geometry.margins.bottom || '1.2cm'} ${geometry.margins.left || '1.0cm'};`

  let innerContent = ''

  for (const block of blocks) {
    const text = (block.tahqiqText || block.rawOcrText).trim()
    if (!text) continue

    const bidiPayload = isRtl ? `data-para='{"bidi":true}'` : ''

    switch (block.type) {
      case 'heading':
      case 'header':
        innerContent += `
          <h2 ${bidiPayload} ${dirAttr} style="text-align: center; font-size: ${geometry.estimatedHeadingFontSize || 16}pt; margin: 12px 0 8px 0; color: #111827; font-weight: bold; font-family: ${fontFamily};">
            ${escapeHtml(text)}
          </h2>`
        break

      case 'nadzom': {
        // Render high-contrast symmetric 2-column couplet table
        let hemistich1 = text
        let hemistich2 = ''
        if (text.includes(' * ')) {
          const parts = text.split(' * ')
          hemistich1 = parts[0].trim()
          hemistich2 = parts[1].trim()
        } else if (text.includes(' | ')) {
          const parts = text.split(' | ')
          hemistich1 = parts[0].trim()
          hemistich2 = parts[1].trim()
        } else if (text.includes(' ... ')) {
          const parts = text.split(' ... ')
          hemistich1 = parts[0].trim()
          hemistich2 = parts[1].trim()
        }

        if (hemistich2) {
          innerContent += `
            <table class="nadzom-table" style="width: 100%; border-collapse: collapse; margin: 10px 0; font-family: ${fontFamily}; background: transparent; border: none;">
              <tbody>
                <tr>
                  <td style="width: 46%; text-align: right; font-weight: bold; font-size: ${geometry.estimatedBodyFontSize || 13}pt; color: #111827; padding: 4px 6px; border: none; line-height: 1.6;" ${dirAttr}>
                    ${escapeHtml(hemistich1)}
                  </td>
                  <td style="width: 8%; text-align: center; font-size: 13pt; color: #8c7355; font-weight: bold; border: none; vertical-align: middle;">
                    *
                  </td>
                  <td style="width: 46%; text-align: left; font-weight: bold; font-size: ${geometry.estimatedBodyFontSize || 13}pt; color: #111827; padding: 4px 6px; border: none; line-height: 1.6;" ${dirAttr}>
                    ${escapeHtml(hemistich2)}
                  </td>
                </tr>
              </tbody>
            </table>`
        } else {
          innerContent += `
            <p ${bidiPayload} ${dirAttr} style="text-align: center; font-weight: bold; font-size: ${geometry.estimatedBodyFontSize || 13}pt; margin: 8px 0; color: #111827; font-family: ${fontFamily};">
              ${escapeHtml(text)}
            </p>`
        }
        break
      }

      case 'matan':
        innerContent += `
          <p ${bidiPayload} ${dirAttr} style="font-size: ${geometry.estimatedBodyFontSize || 13}pt; font-weight: bold; line-height: 1.8; margin: 8px 0; color: #111827; font-family: ${fontFamily};">
            ${escapeHtml(text)}
          </p>`
        break

      case 'hasyiah':
        innerContent += `
          <div class="hasyiah-block" style="border-top: 1.5px solid #8c7355; margin: 16px 0 6px 0; padding-top: 6px;">
            <p ${bidiPayload} ${dirAttr} style="font-size: ${geometry.estimatedMarginFontSize || 10}pt; line-height: 1.6; color: #4b5563; margin: 0; font-family: ${fontFamily};">
              [حاشية] ${escapeHtml(text)}
            </p>
          </div>`
        break

      case 'margin':
        innerContent += `
          <p ${bidiPayload} ${dirAttr} style="font-size: ${geometry.estimatedMarginFontSize || 10}pt; font-style: italic; color: #6b7280; margin: 4px 12px; border-right: 2px solid #b388ff; padding-right: 8px; font-family: ${fontFamily};">
            [هامش] ${escapeHtml(text)}
          </p>`
        break

      case 'numbering':
        innerContent += `
          <p ${bidiPayload} ${dirAttr} style="text-align: center; font-size: 11pt; color: #6b7280; margin: 4px 0; font-family: ${fontFamily};">
            ${escapeHtml(text)}
          </p>`
        break

      case 'syarah':
      default:
        innerContent += `
          <p ${bidiPayload} ${dirAttr} style="font-size: ${geometry.estimatedBodyFontSize || 13}pt; line-height: 1.85; margin: 6px 0; text-indent: 18px; color: #1f2937; font-family: ${fontFamily};">
            ${escapeHtml(text)}
          </p>`
        break
    }
  }

  if (!includeOuterPageWrapper) {
    return innerContent
  }

  return `
    <div class="manuscriber-1to1-page" style="${marginPadding} ${borderCss} ${bgCss} box-sizing: border-box; min-height: 600px; font-family: ${fontFamily};">
      ${innerContent}
    </div>
  `.trim()
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
