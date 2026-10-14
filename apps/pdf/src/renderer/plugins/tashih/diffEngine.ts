/**
 * TASHIH-PRO: Offline Canvas Pixel Diff Engine
 * Membandingkan kanvas Master vs Scan secara lokal (zero-token cost),
 * mendeteksi kluster perbedaan piksel, dan mengekstrak thumbnail crop untuk Visual Proof.
 */

import type { PdfCoordinates } from './types'

export interface DetectedBox {
  id: string
  boxPx: { x: number; y: number; width: number; height: number }
  pdfCoords: PdfCoordinates
  confidence: number
  cropThumbnail: string
  cropThumbnailMaster?: string
  cropThumbnailScan?: string
}

export interface DiffEngineOptions {
  threshold?: number   // Ambang batas selisih piksel (0-255), default 35
  gridSize?: number    // Ukuran sel grid clustering (piksel), default 24
  minDiffPixels?: number // Minimal piksel berbeda per sel, default 5
  pagePdfWidth?: number  // Lebar halaman PDF dalam points (default 595.28 / A4)
  pagePdfHeight?: number // Tinggi halaman PDF dalam points (default 841.89 / A4)
}

/**
 * Membandingkan dua canvas dan menghasilkan bounding boxes perbedaan
 */
export function runPixelDiff(
  masterCanvas: HTMLCanvasElement,
  scanCanvas: HTMLCanvasElement,
  options: DiffEngineOptions = {}
): DetectedBox[] {
  const threshold = options.threshold ?? 35
  const gridSize = options.gridSize ?? 24
  const minDiffPixels = options.minDiffPixels ?? 6
  const pdfWidth = options.pagePdfWidth ?? 595.28
  const pdfHeight = options.pagePdfHeight ?? 841.89

  const width = Math.min(masterCanvas.width, scanCanvas.width)
  const height = Math.min(masterCanvas.height, scanCanvas.height)

  if (width <= 0 || height <= 0) return []

  const masterCtx = masterCanvas.getContext('2d', { willReadFrequently: true })
  const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true })
  if (!masterCtx || !scanCtx) return []

  const masterData = masterCtx.getImageData(0, 0, width, height).data
  const scanData = scanCtx.getImageData(0, 0, width, height).data

  const cols = Math.ceil(width / gridSize)
  const rows = Math.ceil(height / gridSize)
  const grid = new Uint16Array(cols * rows)

  // 1. Scan perbedaan piksel ke dalam grid
  for (let y = 0; y < height; y++) {
    const rowIdx = Math.floor(y / gridSize) * cols
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const mR = masterData[idx]
      const mG = masterData[idx + 1]
      const mB = masterData[idx + 2]

      const sR = scanData[idx]
      const sG = scanData[idx + 1]
      const sB = scanData[idx + 2]

      // Luma difference
      const diff = Math.abs(0.299 * (mR - sR) + 0.587 * (mG - sG) + 0.114 * (mB - sB))
      if (diff > threshold) {
        const colIdx = Math.floor(x / gridSize)
        grid[rowIdx + colIdx]++
      }
    }
  }

  // 2. Kumpulkan sel grid yang memiliki perbedaan signifikan
  const activeCells: Array<{ c: number; r: number }> = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r * cols + c] >= minDiffPixels) {
        activeCells.push({ c, r })
      }
    }
  }

  if (activeCells.length === 0) return []

  // 3. Gabungkan sel-sel berdekatan (Clustering Flood-Fill sederhana)
  const visited = new Set<string>()
  const clusters: Array<Array<{ c: number; r: number }>> = []

  const cellMap = new Set(activeCells.map((cell) => `${cell.c},${cell.r}`))

  for (const cell of activeCells) {
    const key = `${cell.c},${cell.r}`
    if (visited.has(key)) continue

    const cluster: Array<{ c: number; r: number }> = []
    const queue = [cell]
    visited.add(key)

    while (queue.length > 0) {
      const current = queue.shift()!
      cluster.push(current)

      // 8-neighborhood check dengan toleransi 1 gap
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue
          const nc = current.c + dc
          const nr = current.r + dr
          const neighborKey = `${nc},${nr}`
          if (cellMap.has(neighborKey) && !visited.has(neighborKey)) {
            visited.add(neighborKey)
            queue.push({ c: nc, r: nr })
          }
        }
      }
    }

    clusters.push(cluster)
  }

  // 4. Hitung bounding box per cluster & konversi ke koordinat PDF
  const detected: DetectedBox[] = []

  // Sort by cluster size descending, limit maksimal 30 box per halaman agar efisien
  const topClusters = clusters.sort((a, b) => b.length - a.length).slice(0, 30)

  topClusters.forEach((cluster, idx) => {
    let minC = cols
    let maxC = 0
    let minR = rows
    let maxR = 0

    for (const c of cluster) {
      if (c.c < minC) minC = c.c
      if (c.c > maxC) maxC = c.c
      if (c.r < minR) minR = c.r
      if (c.r > maxR) maxR = c.r
    }

    // Padding 4px
    const xPx = Math.max(0, minC * gridSize - 4)
    const yPx = Math.max(0, minR * gridSize - 4)
    const wPx = Math.min(width - xPx, (maxC - minC + 1) * gridSize + 8)
    const hPx = Math.min(height - yPx, (maxR - minR + 1) * gridSize + 8)

    if (wPx < 10 || hPx < 10) return

    // Konversi piksel ke PDF points (72 DPI)
    const scaleX = pdfWidth / width
    const scaleY = pdfHeight / height

    const pdf_x = Math.round(xPx * scaleX * 10) / 10
    const pdf_y = Math.round(yPx * scaleY * 10) / 10
    const bWidth = Math.round(wPx * scaleX * 10) / 10
    const bHeight = Math.round(hPx * scaleY * 10) / 10

    // Buat visual proof thumbnail crop dari kedua naskah (Master & Scan)
    const cropThumbnailScan = extractCropSnippet(scanCanvas, xPx, yPx, wPx, hPx)
    const cropThumbnailMaster = extractCropSnippet(masterCanvas, xPx, yPx, wPx, hPx)

    detected.push({
      id: `diff-${Date.now()}-${idx + 1}`,
      boxPx: { x: xPx, y: yPx, width: wPx, height: hPx },
      pdfCoords: {
        pdf_x,
        pdf_y,
        width: bWidth,
        height: bHeight,
      },
      confidence: Math.min(0.99, 0.6 + (cluster.length / 50) * 0.4),
      cropThumbnail: cropThumbnailScan || cropThumbnailMaster,
      cropThumbnailMaster,
      cropThumbnailScan,
    })
  })

  return detected
}

/**
 * Mengekstrak potongan gambar (crop) dari canvas sebagai dataURL JPEG/PNG
 */
export function extractCropSnippet(
  sourceCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  maxDim = 180
): string {
  try {
    const cropCanvas = document.createElement('canvas')
    const aspect = width / Math.max(1, height)
    let targetW = width
    let targetH = height

    if (targetW > maxDim || targetH > maxDim) {
      if (aspect >= 1) {
        targetW = maxDim
        targetH = Math.round(maxDim / aspect)
      } else {
        targetH = maxDim
        targetW = Math.round(maxDim * aspect)
      }
    }

    cropCanvas.width = Math.max(1, targetW)
    cropCanvas.height = Math.max(1, targetH)

    const ctx = cropCanvas.getContext('2d')
    if (!ctx) return ''

    ctx.drawImage(
      sourceCanvas,
      x,
      y,
      width,
      height,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    )

    return cropCanvas.toDataURL('image/jpeg', 0.82)
  } catch {
    return ''
  }
}

/**
 * Mengekstrak potongan gambar (crop) dari canvas berdasarkan koordinat PDF (points)
 */
export function extractCropSnippetFromPdfCoords(
  canvas: HTMLCanvasElement | null,
  coords: PdfCoordinates,
  maxDim = 240
): string {
  if (!canvas || !coords) return ''
  try {
    const ratioX = canvas.width / 595.28
    const ratioY = canvas.height / 841.89
    const xPx = Math.max(0, Math.floor(coords.pdf_x * ratioX))
    const yPx = Math.max(0, Math.floor(coords.pdf_y * ratioY))
    const wPx = Math.min(canvas.width - xPx, Math.ceil(coords.width * ratioX))
    const hPx = Math.min(canvas.height - yPx, Math.ceil(coords.height * ratioY))
    if (wPx <= 0 || hPx <= 0) return ''
    return extractCropSnippet(canvas, xPx, yPx, wPx, hPx, maxDim)
  } catch {
    return ''
  }
}
