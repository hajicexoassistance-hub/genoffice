import React, { useRef } from 'react'
import {
  IconManuscript,
  IconFolderOpen,
  IconDocument,
  IconBulb,
} from '../icons/ManuscriberIcons'

interface ManuscriberWelcomeCardProps {
  onLoadFile: (file: File) => void
}

export const ManuscriberWelcomeCard: React.FC<ManuscriberWelcomeCardProps> = ({ onLoadFile }) => {
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const manusInputRef = useRef<HTMLInputElement>(null)

  const handleOpenPdf = async () => {
    try {
      const desktop = (window as any).desktop
      if (desktop?.pickPdf) {
        const res = await desktop.pickPdf()
        if (!res.canceled && res.fileData && res.name) {
          const file = new File([res.fileData], res.name, { type: 'application/pdf' })
          onLoadFile(file)
          return
        }
      }
    } catch {}
    pdfInputRef.current?.click()
  }

  const handleOpenManus = async () => {
    try {
      const desktop = (window as any).desktop
      if (desktop?.pickPdf) {
        const res = await desktop.pickPdf()
        if (!res.canceled && res.fileData && res.name) {
          const file = new File([res.fileData], res.name, { type: 'application/json' })
          onLoadFile(file)
          return
        }
      }
    } catch {}
    manusInputRef.current?.click()
  }

  return (
    <div className="manuscriber-welcome-container">
      <input
        type="file"
        ref={pdfInputRef}
        style={{ display: 'none' }}
        accept=".pdf"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onLoadFile(file)
          e.target.value = ''
        }}
      />
      <input
        type="file"
        ref={manusInputRef}
        style={{ display: 'none' }}
        accept=".manus"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onLoadFile(file)
          e.target.value = ''
        }}
      />

      <div className="welcome-card-box">
        {/* Top Icon Badge */}
        <div className="welcome-icon-badge">
          <IconManuscript size={32} color="#185abd" />
        </div>

        {/* Title & Subtitle */}
        <h3 className="welcome-card-title">Mulai Proyek Manuscriber</h3>
        <p className="welcome-card-desc">
          Buka file PDF naskah untuk memulai transkripsi baru, atau buka file proyek <code>.manus</code> yang sudah pernah Anda simpan.
        </p>

        {/* Action Buttons */}
        <div className="welcome-card-actions">
          <button
            type="button"
            className="btn-welcome-primary"
            onClick={handleOpenPdf}
            title="Buka berkas PDF naskah kuno / kitab turats"
          >
            <IconFolderOpen size={16} />
            <span>Buka PDF (Mulai Proyek Baru)</span>
          </button>

          <button
            type="button"
            className="btn-welcome-secondary"
            onClick={handleOpenManus}
            title="Buka berkas proyek .manus yang telah tersimpan"
          >
            <IconDocument size={16} />
            <span>Buka Proyek (.manus)</span>
          </button>
        </div>

        {/* Workflow Tips Box */}
        <div className="welcome-tips-box">
          <div className="tips-box-header">
            <IconBulb size={15} color="#d89b00" />
            <span>Cara Kerja Proyek Manuscriber:</span>
          </div>
          <ol className="tips-box-list">
            <li>Buka PDF naskah yang ingin ditranskripsikan.</li>
            <li>Transkripsikan halaman per halaman dengan tombol AI.</li>
            <li>
              Klik <strong>Simpan Proyek</strong> di toolbar atas untuk menyimpan PDF dan dokumen Word sekaligus ke dalam satu file <code>.manus</code>.
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
