/**
 * Manuscriber Plugin — Digitizer Studio Reactive Store
 * Manages per-page streaming state, page geometry, blocks, and tahqiq diffs.
 * Built with useSyncExternalStore for zero overhead and instant reactivity.
 */

import { useSyncExternalStore } from 'react'
import type {
  DigitizerPageData,
  DigitizerBlock,
  PageGeometrySpec,
  DigitizerLanguageProfile,
} from '../types'

export const DEFAULT_PAGE_GEOMETRY: PageGeometrySpec = {
  paperSize: 'B5',
  orientation: 'portrait',
  margins: {
    top: '2.2cm',
    bottom: '2.2cm',
    left: '2.0cm',
    right: '2.0cm',
  },
  hasBorder: true,
  borderStyle: 'double',
  borderColor: '#4a3525',
  hasShading: true,
  shadingTone: '#fcf8ee',
  nadzomStructure: 'none',
  estimatedHeadingFontSize: 16,
  estimatedBodyFontSize: 13,
  estimatedMarginFontSize: 10,
}

export interface DigitizerBatchProgress {
  current: number
  total: number
  message: string
}

export interface DigitizerStudioState {
  isOpen: boolean
  currentPage: number
  zoomScale: number
  contrastLevel: number
  brightnessLevel: number
  activeTab: 'preview' | 'tahqiq' | 'geometry'
  selectedBlockId: string | null
  showBoundingBoxes: boolean
  showJadwalBorder: boolean
  defaultLanguage: DigitizerLanguageProfile
  pagesData: Record<number, DigitizerPageData>
  isBatchProcessing: boolean
  batchProgress: DigitizerBatchProgress | null
}

const initialState: DigitizerStudioState = {
  isOpen: false,
  currentPage: 1,
  zoomScale: 1.0,
  contrastLevel: 100,
  brightnessLevel: 100,
  activeTab: 'preview',
  selectedBlockId: null,
  showBoundingBoxes: true,
  showJadwalBorder: true,
  defaultLanguage: 'ar',
  pagesData: {},
  isBatchProcessing: false,
  batchProgress: null,
}

class DigitizerStoreClass {
  private state: DigitizerStudioState = { ...initialState }
  private listeners: Set<() => void> = new Set()

  public getState(): DigitizerStudioState {
    return this.state
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emitChange(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  public setState(partial: Partial<DigitizerStudioState> | ((prev: DigitizerStudioState) => Partial<DigitizerStudioState>)): void {
    const next = typeof partial === 'function' ? partial(this.state) : partial
    this.state = { ...this.state, ...next }
    this.emitChange()
  }

  public getOrCreatePageData(pageNo: number): DigitizerPageData {
    if (!this.state.pagesData[pageNo]) {
      const newPage: DigitizerPageData = {
        pageNo,
        status: 'idle',
        geometry: { ...DEFAULT_PAGE_GEOMETRY },
        blocks: [],
        language: this.state.defaultLanguage,
      }
      this.state.pagesData[pageNo] = newPage
      return newPage
    }
    return this.state.pagesData[pageNo]
  }

  public updatePageData(pageNo: number, updates: Partial<DigitizerPageData>): void {
    const existing = this.getOrCreatePageData(pageNo)
    this.state = {
      ...this.state,
      pagesData: {
        ...this.state.pagesData,
        [pageNo]: {
          ...existing,
          ...updates,
          lastUpdated: new Date().toISOString(),
        },
      },
    }
    this.emitChange()
  }

  public updateBlock(pageNo: number, blockId: string, updates: Partial<DigitizerBlock>): void {
    const page = this.getOrCreatePageData(pageNo)
    const updatedBlocks = page.blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b))
    this.updatePageData(pageNo, { blocks: updatedBlocks })
  }

  public updateGeometry(pageNo: number, geometryUpdates: Partial<PageGeometrySpec>): void {
    const page = this.getOrCreatePageData(pageNo)
    const currentGeometry = page.geometry || { ...DEFAULT_PAGE_GEOMETRY }
    this.updatePageData(pageNo, {
      geometry: { ...currentGeometry, ...geometryUpdates },
    })
  }

  public setPageLanguage(pageNo: number, language: DigitizerLanguageProfile): void {
    this.updatePageData(pageNo, { language })
  }

  public resetStudio(): void {
    this.state = { ...initialState }
    this.emitChange()
  }
}

export const digitizerStore = new DigitizerStoreClass()

export function useDigitizerStore<T = DigitizerStudioState>(
  selector: (state: DigitizerStudioState) => T = (s) => s as unknown as T
): T {
  return useSyncExternalStore(
    (cb) => digitizerStore.subscribe(cb),
    () => selector(digitizerStore.getState())
  )
}
