import React from 'react'
import type { DocxPluginContext } from '../../types'
import { IconBookOpen, IconDismiss } from '../components/icons/ManuscriberIcons'

interface ManuscriberGuideModalProps {
  context: DocxPluginContext
  initialPayload: unknown
  onClose: () => void
}

export const ManuscriberGuideModal: React.FC<ManuscriberGuideModalProps> = ({ onClose }) => {
  return (
    <div className="manuscriber-modal-backdrop" onClick={onClose}>
      <div className="manuscriber-modal-card wide" onClick={(e) => e.stopPropagation()}>
        <div className="manuscriber-modal-header">
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <IconBookOpen size={17} />
            <span>Panduan Aksara Pegon & Kaidah Transkripsi</span>
          </h3>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            title="Tutup dialog"
          >
            <IconDismiss size={14} />
          </button>
        </div>

        <div className="manuscriber-modal-body guide-content">
          <section className="guide-section">
            <h4>1. Huruf Khusus Pegon (Nusantara)</h4>
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Huruf</th>
                  <th>Nama Pegon</th>
                  <th>Bunyi Latin</th>
                  <th>Keterangan / Tombol</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="ar-cell">چ</td>
                  <td>Ca</td>
                  <td>C / c</td>
                  <td>Jim dengan 3 titik di dalam (Tombol <strong>C</strong>)</td>
                </tr>
                <tr>
                  <td className="ar-cell">ڠ</td>
                  <td>Nga</td>
                  <td>Ng / ng</td>
                  <td>Ain dengan 3 titik di atas (Ketik <strong>ng</strong> atau tombol <strong>X</strong>)</td>
                </tr>
                <tr>
                  <td className="ar-cell">ڤ</td>
                  <td>Pa</td>
                  <td>P / p</td>
                  <td>Fa dengan 3 titik di atas (Tombol <strong>P</strong>)</td>
                </tr>
                <tr>
                  <td className="ar-cell">ݢ</td>
                  <td>Ga</td>
                  <td>G / g</td>
                  <td>Kaf dengan 1 titik di bawah/atas (Tombol <strong>G</strong>)</td>
                </tr>
                <tr>
                  <td className="ar-cell">ڽ</td>
                  <td>Nya</td>
                  <td>Ny / ny</td>
                  <td>Nun dengan 3 titik di atas (Ketik <strong>ny</strong>)</td>
                </tr>
                <tr>
                  <td className="ar-cell">ط / ڎ</td>
                  <td>Tha / Dha</td>
                  <td>Th / Dh</td>
                  <td>Bunyi retrofleks Jawa (Ketik <strong>th</strong> / <strong>dh</strong>)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="guide-section">
            <h4>2. Kaidah Vokal & Alif Awal Kata</h4>
            <ul className="guide-list">
              <li>
                <strong>Vokal di Awal Kata:</strong> Huruf hidup (a, i, u, e, o, è) di awal kata wajib diawali huruf Alif (ا).
                Contoh: <em>aku</em> → <span className="ar-cell">اكو</span>, <em>ibu</em> → <span className="ar-cell">ايبو</span>, <em>utawa</em> → <span className="ar-cell">اوتاوا</span>.
              </li>
              <li>
                <strong>Pepet (e lemah seperti 'sepatu'):</strong> Ditulis tanpa huruf illat atau menggunakan tanda fathah tegak/pepet di atas huruf konsonan.
              </li>
              <li>
                <strong>Taling (è kuat seperti 'sate'):</strong> Ditulis menggunakan Ya (ي) setelah konsonan.
              </li>
              <li>
                <strong>Wau Vokal (u & o):</strong> Digunakan untuk merepresentasikan bunyi 'u' atau 'o'.
              </li>
            </ul>
          </section>

          <section className="guide-section">
            <h4>3. Pintasan Tombol Cepat (Keyboard Shortcuts)</h4>
            <div className="shortcuts-grid">
              <div className="shortcut-item">
                <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
                <span>Tandai baris Shahih ✓ / Batalkan Tashih</span>
              </div>
              <div className="shortcut-item">
                <kbd>Alt</kbd> + <kbd>Enter</kbd>
                <span>Pecah baris di posisi kursor</span>
              </div>
              <div className="shortcut-item">
                <kbd>Backspace</kbd> (di awal teks)
                <span>Gabungkan baris dengan baris sebelumnya</span>
              </div>
              <div className="shortcut-item">
                <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>Alt</kbd> + <kbd>↓</kbd>
                <span>Navigasi blok baris di Mode Fokus</span>
              </div>
              <div className="shortcut-item">
                <kbd>Esc</kbd>
                <span>Keluar dari Mode Fokus ke Tampilan Daftar</span>
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
