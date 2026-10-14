/**
 * TASHIH-PRO: Project Store & File System Storage Helper
 * Menyimpan struktur proyek, metadata, koordinat anotasi PDF points, dan audit trail.
 * Mendukung File System Access API lokal transparan & fallback localStorage.
 */

import type {
  DomainPreset,
  PageAnnotationFile,
  SumopodAiSettings,
  TashihAnnotation,
  TashihProjectMetadata,
  VendorFileEntry,
} from './types'

// ── Backward Compatibility Types ─────────────────────────────────────
export type TashihCategory = 'rasm' | 'dhabth' | 'waqaf' | 'ayat' | 'umum'
export type PageVerificationStatus = 'belum' | 'revisi' | 'sah'

export interface TashihNote {
  id: string
  pageNo: number
  lineNo?: number
  category: TashihCategory
  selectedText?: string
  correctionText?: string
  description: string
  resolved: boolean
  createdAt: string
}

export interface TashihDocData {
  pageStatus: Record<number, PageVerificationStatus>
  notes: TashihNote[]
  pentashihName?: string
  lastUpdated?: string
}

const STORAGE_KEY_PREFIX = 'genoffice:tashih-pro:project:'
const ACTIVE_PROJECT_KEY = 'genoffice:tashih-pro:active-id'
const SETTINGS_KEY = 'genoffice:tashih-pro:sumopod-settings'
const LEGACY_STORAGE_PREFIX = 'genoffice-pdf-tashih-doc-'

export const DEFAULT_AI_SETTINGS: SumopodAiSettings = {
  baseUrl: 'https://api.sumopod.com/v1',
  apiKey: '',
  modelName: 'gpt-4o',
  temperature: 0.2,
}

export function loadSavedAiSettings(): SumopodAiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) }
    }
  } catch (err) {
    console.error('[tashih] Failed to load AI settings:', err)
  }
  return { ...DEFAULT_AI_SETTINGS }
}

export function saveAiSettings(settings: SumopodAiSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (err) {
    console.error('[tashih] Failed to persist AI settings:', err)
  }
}

export interface TashihProjectState {
  metadata: TashihProjectMetadata
  annotations: Record<number, TashihAnnotation[]> // key: page number
  activeVendorId: string
  overlayOpacity: number // 0 = 100% Master, 100 = 100% Vendor
  overlayMode: boolean
  isWorkbenchOpen: boolean
}

let activeDirectoryHandle: FileSystemDirectoryHandle | null = null

export function getActiveDirectoryHandle(): FileSystemDirectoryHandle | null {
  return activeDirectoryHandle
}

export function setActiveDirectoryHandle(handle: FileSystemDirectoryHandle | null): void {
  activeDirectoryHandle = handle
}

export function createDefaultProject(
  title: string,
  fileName = '',
  domainPreset: DomainPreset = 'mushaf'
): TashihProjectMetadata {
  const id = `prj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    title,
    domainPreset,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    leadEditor: '',
    masterPdf: {
      fileName: fileName || '',
    },
    vendors: [
      {
        id: 'vendor-1',
        name: 'Percetakan',
        fileName: '',
        rotationDeskew: 0,
      },
    ],
    aiSettings: loadSavedAiSettings(),
  }
}

/**
 * Memuat state proyek yang tersimpan
 */
export function loadProjectData(projectId?: string): TashihProjectState {
  const id = projectId || localStorage.getItem(ACTIVE_PROJECT_KEY) || 'default'
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`)
    if (raw) {
      const parsed = JSON.parse(raw) as {
        metadata: TashihProjectMetadata
        annotations: Record<number, TashihAnnotation[]>
        activeVendorId?: string
        overlayOpacity?: number
        overlayMode?: boolean
      }

      // Bersihkan nilai dummy/contoh lama dari penyimpanan browser
      if (parsed.metadata) {
        if (parsed.metadata.leadEditor === 'Ahmad (Editor Utama)') {
          parsed.metadata.leadEditor = ''
        }
        if (parsed.metadata.masterPdf?.fileName === 'naskah_master.pdf') {
          parsed.metadata.masterPdf.fileName = ''
        }
        if (Array.isArray(parsed.metadata.vendors)) {
          parsed.metadata.vendors = parsed.metadata.vendors.map((v) => {
            let name = v.name
            let fName = v.fileName
            if (name === 'Vendor A (PT Cetak Grafika)' || name === 'Vendor A') {
              name = 'Percetakan'
            }
            if (fName === 'cetak_coba_vendor_a.pdf' || fName === 'vendor_a.pdf') {
              fName = ''
            }
            return { ...v, name, fileName: fName }
          })
        }
      }

      const activeVId = parsed.metadata?.vendors?.[0]?.id || 'vendor-1'
      return {
        metadata: parsed.metadata,
        annotations: parsed.annotations || {},
        activeVendorId:
          parsed.activeVendorId && parsed.metadata?.vendors?.some((v) => v.id === parsed.activeVendorId)
            ? parsed.activeVendorId
            : activeVId,
        overlayOpacity: parsed.overlayOpacity ?? 50,
        overlayMode: parsed.overlayMode ?? false,
        isWorkbenchOpen: false,
      }
    }
  } catch (err) {
    console.error('[tashih] Error loading project data:', err)
  }

  // Buat default jika belum ada
  const defaultProj = createDefaultProject('Proyek Tashih', '', 'mushaf')
  return {
    metadata: defaultProj,
    annotations: {},
    activeVendorId: defaultProj.vendors[0]?.id || 'vendor-1',
    overlayOpacity: 50,
    overlayMode: false,
    isWorkbenchOpen: false,
  }
}

/**
 * Menyimpan seluruh proyek ke LocalStorage & mengabarkan ke semua listener
 */
export function saveProjectData(state: TashihProjectState): void {
  try {
    const payload = {
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString(),
      },
      annotations: state.annotations,
    }
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${state.metadata.id}`, JSON.stringify(payload))
    localStorage.setItem(ACTIVE_PROJECT_KEY, state.metadata.id)
    addRecentProject(state.metadata)

    // Simpan juga secara asinkron ke file system jika directory handle aktif
    if (activeDirectoryHandle) {
      writeProjectToDisk(activeDirectoryHandle, state).catch((err) =>
        console.warn('[tashih] Auto-save disk warning:', err)
      )
    }

    // Broadcast event
    window.dispatchEvent(
      new CustomEvent('genoffice:tashih-project-change', {
        detail: { projectId: state.metadata.id, state },
      })
    )
  } catch (err) {
    console.error('[tashih] Error saving project data:', err)
  }
}

const RECENT_PROJECTS_KEY = 'genoffice:tashih-pro:recent-projects'

export function getRecentProjects(): TashihProjectMetadata[] {
  try {
    const raw = localStorage.getItem(RECENT_PROJECTS_KEY)
    if (raw) {
      return JSON.parse(raw) as TashihProjectMetadata[]
    }
  } catch (err) {
    console.error('[tashih] Failed to get recent projects:', err)
  }
  return []
}

export function addRecentProject(meta: TashihProjectMetadata): void {
  try {
    const list = getRecentProjects().filter((p) => p.id !== meta.id)
    list.unshift(meta)
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(list.slice(0, 8)))
  } catch (err) {
    console.error('[tashih] Failed to save recent projects:', err)
  }
}

export function deleteRecentProject(id: string): void {
  try {
    const list = getRecentProjects().filter((p) => p.id !== id)
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(list))
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`)
  } catch (err) {
    console.error('[tashih] Failed to delete recent project:', err)
  }
}

/**
 * Membaca file JSON project (project.json atau export .tashih) dari objek File
 */
export async function readProjectFromFile(file: File): Promise<TashihProjectState | null> {
  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    if (parsed.id && parsed.vendors) {
      // Direct metadata file
      return {
        metadata: parsed,
        annotations: {},
        activeVendorId: parsed.vendors[0]?.id || 'vendor-1',
        overlayOpacity: 50,
        overlayMode: false,
        isWorkbenchOpen: false,
      }
    } else if (parsed.metadata && parsed.metadata.id) {
      // Full Project state file
      return {
        metadata: parsed.metadata,
        annotations: parsed.annotations || {},
        activeVendorId: parsed.activeVendorId || parsed.metadata.vendors[0]?.id || 'vendor-1',
        overlayOpacity: parsed.overlayOpacity ?? 50,
        overlayMode: parsed.overlayMode ?? false,
        isWorkbenchOpen: false,
      }
    }
    return null
  } catch (err) {
    console.error('[tashih] Failed to parse project file:', err)
    return null
  }
}

/**
 * Membuka File System Folder Proyek menggunakan File System Access API
 */
export async function pickProjectDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const win = window as unknown as {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
  }
  if (typeof win.showDirectoryPicker !== 'function') {
    throw new Error('File System Access API tidak didukung pada browser ini.')
  }
  const dirHandle = await win.showDirectoryPicker({ mode: 'readwrite' })
  setActiveDirectoryHandle(dirHandle)
  return dirHandle
}

/**
 * Menulis struktur folder proyek ke disk lokal
 */
export async function writeProjectToDisk(
  dirHandle: FileSystemDirectoryHandle,
  state: TashihProjectState
): Promise<void> {
  try {
    // 1. Tulis project.json di root
    const projectFile = await dirHandle.getFileHandle('project.json', { create: true })
    const projectWritable = await projectFile.createWritable()
    await projectWritable.write(JSON.stringify(state.metadata, null, 2))
    await projectWritable.close()

    // 2. Buat folder annotations jika belum ada
    const annotDir = await dirHandle.getDirectoryHandle('annotations', { create: true })

    // Tulis page_xx.json
    for (const [pageStr, annots] of Object.entries(state.annotations)) {
      const pageNo = parseInt(pageStr, 10)
      const pageFileName = `page_${String(pageNo).padStart(2, '0')}.json`
      const pageFile = await annotDir.getFileHandle(pageFileName, { create: true })
      const pageWritable = await pageFile.createWritable()
      const fileData: PageAnnotationFile = {
        page_number: pageNo,
        last_updated: new Date().toISOString(),
        annotations: annots,
      }
      await pageWritable.write(JSON.stringify(fileData, null, 2))
      await pageWritable.close()
    }

    // 3. Siapkan folder exports, master_pdf, vendor_scans
    await dirHandle.getDirectoryHandle('master_pdf', { create: true })
    await dirHandle.getDirectoryHandle('vendor_scans', { create: true })
    await dirHandle.getDirectoryHandle('exports', { create: true })
  } catch (err) {
    console.error('[tashih] Gagal menulis ke folder lokal:', err)
  }
}

/**
 * Membaca project.json dan annotations dari folder disk lokal
 */
export async function readProjectFromDisk(
  dirHandle: FileSystemDirectoryHandle
): Promise<TashihProjectState | null> {
  try {
    const projectFile = await dirHandle.getFileHandle('project.json')
    const file = await projectFile.getFile()
    const text = await file.text()
    const metadata = JSON.parse(text) as TashihProjectMetadata

    const annotations: Record<number, TashihAnnotation[]> = {}

    try {
      const annotDir = await dirHandle.getDirectoryHandle('annotations')
      // @ts-expect-error entries() ada pada Chromium FileSystemDirectoryHandle
      for await (const [name, handle] of annotDir.entries()) {
        if (name.startsWith('page_') && name.endsWith('.json')) {
          const pFile = await handle.getFile()
          const pText = await pFile.text()
          const pData = JSON.parse(pText) as PageAnnotationFile
          if (pData && pData.page_number) {
            annotations[pData.page_number] = pData.annotations || []
          }
        }
      }
    } catch {
      // Ignored
    }

    return {
      metadata,
      annotations,
      activeVendorId: metadata.vendors[0]?.id || 'vendor-1',
      overlayOpacity: 50,
      overlayMode: false,
      isWorkbenchOpen: false,
    }
  } catch (err) {
    console.warn('[tashih] Folder belum memiliki project.json yang valid:', err)
    return null
  }
}

// ── Backward Compatibility Functions ─────────────────────────────────
export function getTashihStorageKey(filePath: string | null | undefined): string {
  if (!filePath) return `${LEGACY_STORAGE_PREFIX}untitled`
  return `${LEGACY_STORAGE_PREFIX}${encodeURIComponent(filePath)}`
}

export function loadTashihData(filePath: string | null | undefined): TashihDocData {
  const key = getTashihStorageKey(filePath)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { pageStatus: {}, notes: [] }
    const parsed = JSON.parse(raw) as TashihDocData
    return {
      pageStatus: parsed.pageStatus || {},
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      pentashihName: parsed.pentashihName || 'Pentashih Mushaf',
      lastUpdated: parsed.lastUpdated,
    }
  } catch {
    return { pageStatus: {}, notes: [] }
  }
}

export function saveTashihData(filePath: string | null | undefined, data: TashihDocData): void {
  const key = getTashihStorageKey(filePath)
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        ...data,
        lastUpdated: new Date().toISOString(),
      }),
    )
    window.dispatchEvent(
      new CustomEvent('genoffice:tashih-data-change', {
        detail: { filePath, data },
      }),
    )
  } catch (err) {
    console.error('[tashih] Failed to persist data:', err)
  }
}
