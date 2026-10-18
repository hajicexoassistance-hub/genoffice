import React from 'react'
import type { DocxPluginContext } from '../../types'
import { IconInfo, IconDismiss } from '../components/icons/ManuscriberIcons'

interface ManuscriberAppGuideModalProps {
  context: DocxPluginContext
  initialPayload: unknown
  onClose: () => void
}

export const ManuscriberAppGuideModal: React.FC<ManuscriberAppGuideModalProps> = ({ onClose }) => {
  return (
    <div className="manuscriber-modal-backdrop" onClick={onClose}>
      <div
        className="manuscriber-modal-card wide"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 740 }}
      >
        <div className="manuscriber-modal-header">
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--word-blue, #185abd)', display: 'inline-flex' }}>
              <IconInfo size={18} />
            </span>
            <span>Panduan Pintasan Keyboard Aplikasi</span>
          </h3>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            title="Tutup dialog (Esc)"
          >
            <IconDismiss size={14} />
          </button>
        </div>

        <div
          className="manuscriber-modal-body guide-content"
          style={{ maxHeight: '72vh', overflowY: 'auto', padding: '16px 20px' }}
        >
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            Gunakan pintasan keyboard berikut untuk mempercepat alur kerja digitasi, navigasi
            halaman naskah, tashih ejaan, dan penyisipan ke Dokumen Word:
          </p>

          {/* Grup 1: Global & Antarmuka Utama */}
          <section className="guide-section" style={{ marginBottom: 18 }}>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                margin: '0 0 8px 0',
                color: 'var(--word-blue, #185abd)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>1. Global & Antarmuka Utama</span>
            </h4>
            <div className="shortcuts-grid">
              <div className="shortcut-item">
                <kbd>Ctrl</kbd> + <kbd>T</kbd>
                <span>Buka / Tutup Staging Workbench di mana saja</span>
              </div>
              <div className="shortcut-item">
                <kbd>Esc</kbd>
                <span>Tutup Workbench & kembali ke Dokumen Word</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl</kbd> + <kbd>Q</kbd>
                <span>Buka / Tutup Papan Ketik Pegon 3-in-1</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Q</kbd>
                <span>Minimize / Maximize Papan Ketik Pegon (chip melayang)</span>
              </div>
              <div className="shortcut-item">
                <kbd>Shift</kbd> + <kbd>W</kbd>
                <span>Mode Pegon: Tanda Tasydid / Shaddah (ّ)</span>
              </div>
              <div className="shortcut-item">
                <kbd>Alt</kbd> + <kbd>W</kbd>
                <span>Mode Pegon: Huruf Waw Hamzah (ؤ)</span>
              </div>
              <div className="shortcut-item">
                <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> / <kbd>I</kbd> / <kbd>U</kbd>
                <span>Mode Pegon: Harakat Tanwin (ً / ٍ / ٌ)</span>
              </div>
            </div>
          </section>

          {/* Grup 2: Staging Workbench & Navigasi */}
          <section className="guide-section" style={{ marginBottom: 18 }}>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                margin: '0 0 8px 0',
                color: 'var(--word-blue, #185abd)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>2. Navigasi Halaman & Blok Naskah</span>
            </h4>
            <div className="shortcuts-grid">
              <div className="shortcut-item">
                <kbd>Alt</kbd> + <kbd>→</kbd>
                <span>Pindah ke Halaman Naskah Berikutnya</span>
              </div>
              <div className="shortcut-item">
                <kbd>Alt</kbd> + <kbd>←</kbd>
                <span>Pindah ke Halaman Naskah Sebelumnya</span>
              </div>
              <div className="shortcut-item">
                <kbd>Alt</kbd> + <kbd>↓</kbd>
                <span>Pindah ke Blok Baris Berikutnya (fokus kursor otomatis)</span>
              </div>
              <div className="shortcut-item">
                <kbd>Alt</kbd> + <kbd>↑</kbd>
                <span>Pindah ke Blok Baris Sebelumnya (fokus kursor otomatis)</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl</kbd> + <kbd>D</kbd>
                <span>Beralih Mode Tampilan: Mode Fokus ⟷ Mode Daftar</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl</kbd> + <kbd>[</kbd> / <kbd>]</kbd>
                <span>Perkecil / Perbesar Ukuran Huruf Workbench Staging</span>
              </div>
              <div className="shortcut-item">
                <kbd>Alt</kbd> + <kbd>0</kbd>
                <span>Reset Ukuran Huruf Staging ke Standar (16px)</span>
              </div>
            </div>
          </section>

          {/* Grup 3: Tashih & Penyuntingan Teks Blok */}
          <section className="guide-section" style={{ marginBottom: 18 }}>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                margin: '0 0 8px 0',
                color: 'var(--word-blue, #185abd)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>3. Tashih & Penyuntingan Teks Naskah</span>
            </h4>
            <div className="shortcuts-grid">
              <div className="shortcut-item">
                <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
                <span>Kunci Shahih (Beku Abu) / Buka Kuncian Shahih untuk Mengedit</span>
              </div>
              <div className="shortcut-item">
                <kbd>Alt</kbd> + <kbd>H</kbd>
                <span>Hapus Harakat kata yang diblok / kursor (Mendukung Undo Ctrl+Z)</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl</kbd> + <kbd>E</kbd>
                <span>Buka Popover QuickFix Ejaan & AI Harakat</span>
              </div>
              <div className="shortcut-item">
                <kbd>Alt</kbd> + <kbd>Enter</kbd>
                <span>Pecah baris pada posisi kursor menjadi 2 blok naskah</span>
              </div>
              <div className="shortcut-item">
                <kbd>Backspace</kbd> (awal)
                <span>Gabungkan baris dengan blok naskah sebelumnya</span>
              </div>
              <div className="shortcut-item">
                <kbd>Alt</kbd> + <kbd>1</kbd> .. <kbd>5</kbd>
                <span>Ubah jenis blok: 1: Matan, 2: Syarah, 3: Hasyiah, 4: Nadzom, 5: Heading</span>
              </div>
              <div className="shortcut-item">
                <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd>
                <span>Navigasi sekuensial tombol-tombol aksi pada kartu naskah</span>
              </div>
            </div>
          </section>

          {/* Grup 4: Penerapan ke Dokumen Word */}
          <section className="guide-section" style={{ marginBottom: 18 }}>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                margin: '0 0 8px 0',
                color: 'var(--word-blue, #185abd)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>4. Penerapan ke Dokumen Word</span>
            </h4>
            <div className="shortcuts-grid">
              <div className="shortcut-item" style={{ gridColumn: 'span 2' }}>
                <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Enter</kbd>
                <span>
                  <strong>Terapkan ke Word:</strong> Menyisipkan baris naskah halaman aktif ke
                  posisi kursor dokumen Word (dengan konfirmasi jika belum Shahih) & menutup
                  Workbench otomatis.
                </span>
              </div>
            </div>
          </section>

          {/* Grup 5: Mode Harokat Cepat (Auto-Advance) */}
          <section className="guide-section" style={{ marginBottom: 10 }}>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                margin: '0 0 8px 0',
                color: 'var(--word-blue, #185abd)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>5. Mode Harokat Cepat (Auto-Advance Kursor)</span>
            </h4>
            <div className="shortcuts-grid">
              <div className="shortcut-item">
                <kbd>]</kbd> / <kbd>Shift</kbd>+<kbd>]</kbd>
                <span>Fathah (َ) / Tanwin Fathah (ً) & otomatis maju ke konsonan berikutnya</span>
              </div>
              <div className="shortcut-item">
                <kbd>[</kbd> / <kbd>Shift</kbd>+<kbd>[</kbd>
                <span>Kasroh (ِ) / Tanwin Kasroh (ٍ) & otomatis maju ke konsonan berikutnya</span>
              </div>
              <div className="shortcut-item">
                <kbd>P</kbd> / <kbd>Shift</kbd>+<kbd>P</kbd>
                <span>Dhumah (ُ) / Tanwin Dhumah (ٌ) & otomatis maju ke konsonan berikutnya</span>
              </div>
              <div className="shortcut-item">
                <kbd>O</kbd>
                <span>Sukun (ْ) & otomatis maju ke konsonan berikutnya</span>
              </div>
              <div className="shortcut-item">
                <kbd>L</kbd>
                <span>
                  Tasydid (ّ) — kursor tetap di huruf ini agar bisa langsung diberi harakat vokal
                </span>
              </div>
              <div className="shortcut-item">
                <kbd>;</kbd> / <kbd>Shift</kbd>+<kbd>;</kbd>
                <span>Pepet Pegon (ٓ) / Kasrah Tegak (ٖ)</span>
              </div>
              <div className="shortcut-item">
                <kbd>'</kbd> / <kbd>Shift</kbd>+<kbd>'</kbd>
                <span>Fathah Tegak (ٰ) / Dhommah Terbalik (ٗ)</span>
              </div>
              <div className="shortcut-item">
                <kbd>Space</kbd> / <kbd>Backspace</kbd>
                <span>
                  Space: Lewati 1 konsonan (Skip) | Backspace: Hapus harakat konsonan sebelumnya &
                  mundur
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="manuscriber-modal-footer">
          <button type="button" className="btn-modal-save" onClick={onClose}>
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  )
}
