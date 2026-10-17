import React, { useRef, useState } from 'react'
import {
  IconManuscript,
  IconFolderOpen,
  IconCheck,
  IconSparkles,
  IconKeyboard,
} from '../icons/ManuscriberIcons'

interface ManuscriberWelcomeCardProps {
  onLoadFile: (file: File) => void
}

export const ManuscriberWelcomeCard: React.FC<ManuscriberWelcomeCardProps> = ({ onLoadFile }) => {
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        onLoadFile(file)
      }
    }
  }

  return (
    <div
      className="manuscriber-welcome-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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

      <div className={`welcome-card-box ${isDragging ? 'dragging-over' : ''}`}>
        {/* Top Icon Badge */}
        <div className="welcome-icon-badge">
          <IconManuscript size={30} color="#185abd" />
        </div>

        {/* Title & Subtitle */}
        <h3 className="welcome-card-title">Tautkan Naskah PDF</h3>
        <p className="welcome-card-desc">
          Buka berkas PDF naskah turats untuk memulai transkripsi. Seluruh progres, koordinat OCR, dan baris tashih akan <strong>tersimpan otomatis di dokumen Word ini</strong>.
        </p>

        {/* Action Button */}
        <div className="welcome-card-actions">
          <button
            type="button"
            className="btn-welcome-primary"
            onClick={handleOpenPdf}
            title="Pilih berkas PDF naskah turats dari komputer"
          >
            <IconFolderOpen size={16} />
            <span>Pilih Berkas PDF Naskah</span>
          </button>
          <span className="welcome-drop-hint">atau seret & letakkan file PDF ke sini</span>
        </div>

        {/* Workflow Tips Box */}
        <div className="welcome-tips-box">
          <div className="tips-box-header">
            <IconSparkles size={14} color="#185abd" />
            <span>Fitur Terintegrasi Dokumen:</span>
          </div>
          <div className="tips-feature-list">
            <div className="tips-feature-item">
              <span className="feature-dot">
                <IconCheck size={12} color="#10b981" />
              </span>
              <span><strong>Otomatis Tersimpan:</strong> Riwayat naskah & tashih tersimpan otomatis di dokumen ini tanpa perlu file proyek manual.</span>
            </div>
            <div className="tips-feature-item">
              <span className="feature-dot">
                <IconSparkles size={12} color="#185abd" />
              </span>
              <span><strong>AI Vision OCR:</strong> Deteksi teks Arab/Pegon per baris berkoordinat kotak spotlight.</span>
            </div>
            <div className="tips-feature-item">
              <span className="feature-dot">
                <IconKeyboard size={12} color="#d97706" />
              </span>
              <span><strong>Papan Ketik Pegon 3-in-1:</strong> Ketik Pegon langsung ke kursor Word.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManuscriberWelcomeCard
