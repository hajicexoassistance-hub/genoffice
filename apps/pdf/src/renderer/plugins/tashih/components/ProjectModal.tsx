import React, { useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { DomainPreset, TashihProjectMetadata, VendorFileEntry } from '../types'
import { DOMAIN_PRESETS } from '../types'
import {
  createDefaultProject,
  getRecentProjects,
  deleteRecentProject,
  pickProjectDirectory,
  readProjectFromDisk,
  readProjectFromFile,
  saveProjectData,
  writeProjectToDisk,
} from '../tashihStore'
import {
  formatBytes,
  loadPdfDocumentFromFile,
  savePdfToStorage,
} from '../tashihPdfLoader'
import {
  FluentFolder,
  FluentDismiss,
  FluentAdd,
  FluentDelete,
  FluentDocumentPdf,
  FluentArrowUpload,
  FluentHistory,
  FluentCheckmark,
  FluentBook,
  FluentSettings,
  FluentChevronRight,
} from '../TashihFluentIcons'

interface Props {
  currentMetadata: TashihProjectMetadata
  isOpen: boolean
  onClose: () => void
  onProjectLoaded: (metadata: TashihProjectMetadata) => void
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void
  hostDocument?: {
    filePath: string | null
    fileName: string
    pageCount: number
    pdfDocument?: PDFDocumentProxy | null
  } | null
  onRegisterPdf?: (key: 'master' | string, pdfDoc: PDFDocumentProxy, fileName: string) => void
}

export function ProjectModal({
  currentMetadata,
  isOpen,
  onClose,
  onProjectLoaded,
  showToast,
  hostDocument,
  onRegisterPdf,
}: Props) {
  const [activeTab, setActiveTab] = useState<'create' | 'open' | 'settings'>('create')

  // Create / Edit State
  const [projectId] = useState(() => `prj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  const [title, setTitle] = useState(
    currentMetadata.title === 'Proyek Tashih Baru' ? '' : currentMetadata.title
  )
  const [domainPreset, setDomainPreset] = useState<DomainPreset>(currentMetadata.domainPreset)
  const [leadEditor, setLeadEditor] = useState(
    currentMetadata.leadEditor === 'Ahmad (Editor Utama)' ? '' : currentMetadata.leadEditor
  )

  // Master PDF State
  const [masterFileName, setMasterFileName] = useState(() => {
    if (hostDocument?.fileName) return hostDocument.fileName
    if (currentMetadata.masterPdf?.fileName && currentMetadata.masterPdf.fileName !== 'naskah_master.pdf') {
      return currentMetadata.masterPdf.fileName
    }
    return 'Belum dipilih'
  })
  const [masterFileSize, setMasterFileSize] = useState<number | undefined>(currentMetadata.masterPdf?.fileSize)
  const [masterPageCount, setMasterPageCount] = useState<number | undefined>(
    currentMetadata.masterPdf?.pageCount || hostDocument?.pageCount
  )
  const [isMasterLoaded, setIsMasterLoaded] = useState(Boolean(hostDocument?.pdfDocument))

  // Vendor Scans State
  const [vendors, setVendors] = useState<VendorFileEntry[]>(() => {
    const cleaned = currentMetadata.vendors.map((v) => {
      let name = v.name
      let fName = v.fileName
      if (name.includes('Vendor A') || name.includes('PT Cetak Grafika')) {
        name = 'Percetakan'
      }
      if (fName === 'cetak_coba_vendor_a.pdf' || fName === 'vendor_a.pdf') {
        fName = 'Belum ada file'
      }
      return { ...v, name, fileName: fName }
    })
    return cleaned.length > 0
      ? cleaned
      : [{ id: 'vendor-1', name: 'Percetakan', fileName: 'Belum ada file', rotationDeskew: 0 }]
  })
  const [newVendorName, setNewVendorName] = useState('')
  const [activeVendorUploadId, setActiveVendorUploadId] = useState<string | null>(null)

  // File Inputs Refs
  const masterInputRef = useRef<HTMLInputElement>(null)
  const vendorInputRef = useRef<HTMLInputElement>(null)
  const projectJsonInputRef = useRef<HTMLInputElement>(null)

  // Recent Projects List
  const [recentProjects, setRecentProjects] = useState<TashihProjectMetadata[]>(() => getRecentProjects())

  if (!isOpen) return null

  // ── Handler Pemilihan Berkas Master PDF Nyata ──
  const handleMasterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      showToast(`Memuat berkas Master PDF: ${file.name}...`, 'info')
      const result = await loadPdfDocumentFromFile(file)
      setMasterFileName(result.fileName)
      setMasterFileSize(result.fileSize)
      setMasterPageCount(result.pageCount)
      setIsMasterLoaded(true)

      // Simpan ke IndexedDB
      await savePdfToStorage(projectId, 'master', result.fileName, result.buffer)
      if (onRegisterPdf) {
        onRegisterPdf('master', result.pdfDoc, result.fileName)
      }
      showToast(`Master PDF "${file.name}" berhasil dimuat (${result.pageCount} hal).`, 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Gagal membaca Master PDF: ${msg}`, 'error')
    } finally {
      if (e.target) e.target.value = ''
    }
  }

  // Gunakan PDF yang Sedang Dibuka di GenOffice sebagai Master
  const handleUseHostDocAsMaster = () => {
    if (!hostDocument || !hostDocument.pdfDocument) {
      showToast('Tidak ada dokumen PDF yang aktif di GenOffice.', 'info')
      return
    }
    setMasterFileName(hostDocument.fileName)
    setMasterPageCount(hostDocument.pageCount)
    setIsMasterLoaded(true)
    if (onRegisterPdf) {
      onRegisterPdf('master', hostDocument.pdfDocument, hostDocument.fileName)
    }
    showToast(`Dokumen aktif GenOffice (${hostDocument.fileName}) disetel sebagai Master.`, 'success')
  }

  // ── Handler Pemilihan Berkas Vendor PDF Nyata ──
  const handleTriggerVendorUpload = (vendorId: string) => {
    setActiveVendorUploadId(vendorId)
    vendorInputRef.current?.click()
  }

  const handleVendorFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const vendorId = activeVendorUploadId
    if (!file || !vendorId) return

    try {
      showToast(`Memuat berkas Scan Vendor: ${file.name}...`, 'info')
      const result = await loadPdfDocumentFromFile(file)

      // Perbarui entry vendor
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendorId
            ? {
                ...v,
                fileName: result.fileName,
                fileSize: result.fileSize,
                pageCount: result.pageCount,
              }
            : v
        )
      )

      // Simpan ke IndexedDB
      await savePdfToStorage(projectId, vendorId, result.fileName, result.buffer)
      if (onRegisterPdf) {
        onRegisterPdf(vendorId, result.pdfDoc, result.fileName)
      }
      showToast(`Scan PDF "${file.name}" berhasil ditautkan ke ${vendorId} (${result.pageCount} hal).`, 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Gagal membaca Scan PDF: ${msg}`, 'error')
    } finally {
      setActiveVendorUploadId(null)
      if (e.target) e.target.value = ''
    }
  }

  const handleAddVendor = () => {
    if (!newVendorName.trim()) return
    const id = `vendor-${Date.now().toString(36)}`
    const newEntry: VendorFileEntry = {
      id,
      name: newVendorName.trim(),
      fileName: 'Belum ada file',
      rotationDeskew: 0,
    }
    setVendors([...vendors, newEntry])
    setNewVendorName('')
  }

  const handleRemoveVendor = (id: string) => {
    if (vendors.length <= 1) {
      showToast('Minimal harus ada 1 vendor percetakan.', 'info')
      return
    }
    setVendors(vendors.filter((v) => v.id !== id))
  }

  // ── Buka Folder Fisik Proyek di Komputer ──
  const handleOpenFolder = async () => {
    try {
      const handle = await pickProjectDirectory()
      if (!handle) return
      const loaded = await readProjectFromDisk(handle)
      if (loaded) {
        saveProjectData(loaded)
        onProjectLoaded(loaded.metadata)
        showToast(`Folder proyek berhasil dibuka: ${loaded.metadata.title}`, 'success')
        onClose()
      } else {
        const newProj = createDefaultProject(handle.name, masterFileName, domainPreset)
        const newState = {
          metadata: newProj,
          annotations: {},
          activeVendorId: newProj.vendors[0]?.id || 'vendor-1',
          overlayOpacity: 50,
          overlayMode: false,
          isWorkbenchOpen: false,
        }
        await writeProjectToDisk(handle, newState)
        saveProjectData(newState)
        onProjectLoaded(newProj)
        showToast(`Struktur proyek baru dibuat di folder "${handle.name}"`, 'success')
        onClose()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('aborted') && !msg.includes('cancel')) {
        showToast(`Gagal membuka folder: ${msg}`, 'error')
      }
    }
  }

  // ── Buka Berkas JSON / .tashih dari File Picker ──
  const handleProjectFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const loaded = await readProjectFromFile(file)
      if (loaded) {
        saveProjectData(loaded)
        onProjectLoaded(loaded.metadata)
        showToast(`Proyek "${loaded.metadata.title}" berhasil dimuat!`, 'success')
        onClose()
      } else {
        showToast('Format berkas proyek tidak valid.', 'error')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('aborted') && !msg.includes('cancel')) {
        showToast(`Gagal membuka berkas proyek: ${msg}`, 'error')
      }
    } finally {
      if (e.target) e.target.value = ''
    }
  }

  // ── Submit Bentuk Proyek Baru / Simpan Pengaturan ──
  const handleSubmitProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      showToast('Judul proyek tidak boleh kosong.', 'info')
      return
    }

    const updated: TashihProjectMetadata = {
      ...currentMetadata,
      id: activeTab === 'create' ? projectId : currentMetadata.id,
      title: title.trim(),
      domainPreset,
      leadEditor: leadEditor.trim() || 'Pentashih Utama',
      masterPdf: {
        fileName: masterFileName,
        fileSize: masterFileSize,
        pageCount: masterPageCount,
      },
      vendors,
      updatedAt: new Date().toISOString(),
    }

    onProjectLoaded(updated)
    showToast(
      activeTab === 'create'
        ? `Proyek "${updated.title}" berhasil dibentuk!`
        : 'Pengaturan proyek disimpan.',
      'success'
    )
    onClose()
  }

  return (
    <div className="tashih-modal-backdrop" onClick={onClose}>
      <div
        className="tashih-modal-dialog"
        style={{ width: '620px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={masterInputRef}
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={handleMasterFileChange}
        />
        <input
          type="file"
          ref={vendorInputRef}
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={handleVendorFileChange}
        />
        <input
          type="file"
          ref={projectJsonInputRef}
          accept=".json,.tashih"
          style={{ display: 'none' }}
          onChange={handleProjectFileSelected}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FluentFolder size={18} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Manajemen Proyek Tashih-Pro
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
            }}
            title="Tutup (Esc)"
          >
            <FluentDismiss size={16} />
          </button>
        </div>

        {/* Tab Strip */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            padding: '4px 18px',
            background: 'var(--surface-subtle)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            type="button"
            className={`tashih-vendor-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
            style={{ fontSize: '11px', padding: '5px 12px', fontWeight: activeTab === 'create' ? 600 : 500, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <FluentAdd size={12} />
            <span>Proyek Baru</span>
          </button>
          <button
            type="button"
            className={`tashih-vendor-tab ${activeTab === 'open' ? 'active' : ''}`}
            onClick={() => setActiveTab('open')}
            style={{ fontSize: '11px', padding: '5px 12px', fontWeight: activeTab === 'open' ? 600 : 500, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <FluentFolder size={12} />
            <span>Buka Proyek</span>
          </button>
          <button
            type="button"
            className={`tashih-vendor-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            style={{ fontSize: '11px', padding: '5px 12px', fontWeight: activeTab === 'settings' ? 600 : 500, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <FluentSettings size={12} />
            <span>Pengaturan</span>
          </button>
        </div>

        {/* Tab Content 1: Bentuk Proyek Baru (atau Edit Settings) */}
        {(activeTab === 'create' || activeTab === 'settings') && (
          <form
            onSubmit={handleSubmitProject}
            style={{
              padding: '18px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              flex: 1,
            }}
          >
            {/* Judul & Preset */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Judul Proyek / Nama Kitab
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan judul proyek / nama kitab"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-6, 4px)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Preset Domain
                </label>
                <select
                  value={domainPreset}
                  onChange={(e) => setDomainPreset(e.target.value as DomainPreset)}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-6, 4px)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                >
                  <option value="mushaf">Mushaf Al-Qur'an</option>
                  <option value="turats">Kitab Kuning / Turats</option>
                  <option value="buku_umum">Buku Umum / Penerbitan</option>
                </select>
              </div>
            </div>

            {/* Editor Utama & Info Domain */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {DOMAIN_PRESETS[domainPreset].description}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PIC:</span>
                <input
                  type="text"
                  value={leadEditor}
                  onChange={(e) => setLeadEditor(e.target.value)}
                  placeholder="Nama Pentashih / Editor"
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-6, 4px)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    width: '160px',
                  }}
                />
              </div>
            </div>

            {/* ── SEKSI 1: BERKAS MASTER PDF NYATA ── */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-6, 6px)',
                padding: '12px',
                background: 'var(--surface-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FluentDocumentPdf size={16} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    1. Berkas Master PDF (Naskah Acuan Penerbit)
                  </span>
                </div>
                {isMasterLoaded && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--success)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontWeight: 600,
                    }}
                  >
                    <FluentCheckmark size={12} />
                    <span>Terhubung</span>
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--surface)',
                  borderRadius: 'var(--radius-6, 4px)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {masterFileName}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {masterPageCount ? `${masterPageCount} Halaman` : 'Belum dihitung'}
                    {masterFileSize ? ` • ${formatBytes(masterFileSize)}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {hostDocument?.pdfDocument && (
                    <button
                      type="button"
                      onClick={handleUseHostDocAsMaster}
                      className="btn-workbench-action"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      title="Gunakan berkas PDF yang sedang dibuka di GenOffice"
                    >
                      Pakai PDF Aktif
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => masterInputRef.current?.click()}
                    className="btn-workbench-action primary"
                    style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FluentArrowUpload size={12} />
                    <span>{isMasterLoaded ? 'Ganti File...' : 'Pilih Berkas PDF...'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── SEKSI 2: BERKAS VENDOR SCAN CETAK NYATA (MULTI-VENDOR) ── */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-6, 6px)',
                padding: '12px',
                background: 'var(--surface-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FluentBook size={16} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    2. Berkas Scan Vendor (Naskah Fisik)
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  Multi-Vendor ({vendors.length})
                </span>
              </div>

              {/* List Vendor Entries */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {vendors.map((v) => {
                  const hasRealFile =
                    v.fileName &&
                    v.fileName !== 'Belum ada file' &&
                    v.fileName !== 'cetak_coba_vendor_a.pdf' &&
                    v.fileName !== 'vendor_a.pdf'
                  return (
                    <div
                      key={v.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-6, 4px)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {v.name}
                        </div>
                        <div style={{ fontSize: '11px', color: hasRealFile ? 'var(--accent, #c43e1c)' : 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FluentDocumentPdf size={12} />
                          <span>{v.fileName} {v.pageCount ? `(${v.pageCount} Hal)` : ''} {v.fileSize ? `• ${formatBytes(v.fileSize)}` : ''}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleTriggerVendorUpload(v.id)}
                          className="btn-workbench-action"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderColor: !hasRealFile ? 'var(--accent, #c43e1c)' : undefined,
                            color: !hasRealFile ? 'var(--accent, #c43e1c)' : undefined,
                            fontWeight: !hasRealFile ? 600 : undefined,
                          }}
                          title={`Unggah berkas scan PDF untuk ${v.name}`}
                        >
                          <FluentArrowUpload size={12} />
                          <span>{hasRealFile ? 'Ganti PDF' : 'Pilih Berkas PDF Scan'}</span>
                        </button>

                        {vendors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVendor(v.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Hapus vendor ini"
                          >
                            <FluentDelete size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Tambah Vendor Form */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <input
                  type="text"
                  placeholder="Nama vendor percetakan baru..."
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-6, 4px)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddVendor}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-6, 4px)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <FluentAdd size={12} />
                  <span>Tambah Vendor</span>
                </button>
              </div>
            </div>

            {/* Opsi Folder Simpan Lokal */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-6, 4px)',
                border: '1px dashed var(--border)',
                background: 'var(--surface-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <FluentFolder size={12} />
                <span>Simpan otomatis catatan & koordinat langsung ke folder PC (Bebas lock-in)</span>
              </span>
              <button
                type="button"
                onClick={handleOpenFolder}
                className="btn-workbench-action"
                style={{ padding: '3px 8px', fontSize: '10px' }}
              >
                Pilih Folder PC...
              </button>
            </div>

            {/* Submit / Batal Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-workbench-action"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-workbench-action primary"
                style={{ padding: '6px 18px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>{activeTab === 'create' ? 'Buka Workbench' : 'Simpan Pengaturan'}</span>
                {activeTab === 'create' && <FluentChevronRight size={13} />}
              </button>
            </div>
          </form>
        )}

        {/* Tab Content 2: Buka Proyek Tersimpan */}
        {activeTab === 'open' && (
          <div
            style={{
              padding: '18px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              flex: 1,
            }}
          >
            {/* 2 Tombol Aksi Pembuka Cepat */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={handleOpenFolder}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-6, 6px)',
                  border: '1px solid var(--accent, #c43e1c)',
                  background: 'rgba(196, 62, 28, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <FluentFolder size={24} color="var(--accent, #c43e1c)" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Buka Folder Proyek di PC
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  Folder lokal berisi project.json & koordinat
                </span>
              </button>

              <button
                type="button"
                onClick={() => projectJsonInputRef.current?.click()}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-6, 6px)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <FluentDocumentPdf size={24} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Buka Berkas project.json
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  Pilih file JSON proyek langsung dari komputer
                </span>
              </button>
            </div>

            {/* Riwayat Proyek Terakhir */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                <FluentHistory size={15} />
                <span>Riwayat Proyek Terakhir</span>
              </div>

              {recentProjects.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    background: 'var(--surface-subtle)',
                    borderRadius: 'var(--radius-6, 4px)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Belum ada riwayat proyek. Bentuk proyek baru untuk memulai!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {recentProjects.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-6, 4px)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.title}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Preset: {DOMAIN_PRESETS[p.domainPreset]?.title || p.domainPreset} • PIC: {p.leadEditor} • Vendor: {p.vendors.map((v) => v.name).join(', ')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            onProjectLoaded(p)
                            showToast(`Proyek "${p.title}" dibuka!`, 'success')
                            onClose()
                          }}
                          className="btn-workbench-action primary"
                          style={{ padding: '3px 10px', fontSize: '11px' }}
                        >
                          Buka
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteRecentProject(p.id)
                            setRecentProjects(getRecentProjects())
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '3px',
                          }}
                          title="Hapus dari daftar riwayat"
                        >
                          <FluentDelete size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
