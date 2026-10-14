import React from 'react'
import type { ScanSession } from '../../store/manuscriberPluginStore'
import {
  IconHistory,
  IconRefresh,
  IconTrash,
  IconDismiss,
} from '../icons/ManuscriberIcons'

interface StagingHistoryDrawerProps {
  sessions: ScanSession[]
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export const StagingHistoryDrawer: React.FC<StagingHistoryDrawerProps> = ({
  sessions,
  onRestore,
  onDelete,
  onClose,
}) => {
  return (
    <div className="staging-history-drawer">
      <div className="history-drawer-header">
        <div className="history-header-title">
          <IconHistory size={15} />
          <span>Riwayat Sesi Staging ({sessions.length})</span>
        </div>
        <button
          type="button"
          className="btn-drawer-close"
          onClick={onClose}
          title="Tutup Panel Riwayat"
          aria-label="Tutup Riwayat"
        >
          <IconDismiss size={13} />
        </button>
      </div>

      <div className="history-drawer-body">
        {sessions.length === 0 ? (
          <div className="history-empty-state">
            <IconHistory size={32} color="var(--text-tertiary, #909499)" />
            <p>Belum ada riwayat sesi scan.</p>
            <span className="subtext">
              Riwayat otomatis dicatat saat Anda melakukan transkripsi AI pada halaman naskah.
            </span>
          </div>
        ) : (
          <div className="history-cards-list">
            {sessions.map((session) => (
              <div key={session.id} className="history-session-card">
                <div className="session-card-info">
                  <h4 className="session-card-title">Scan Halaman {session.pageNo}</h4>
                  <div className="session-card-meta">
                    Halaman {session.pageNo} • {session.blockCount} Blok • {session.verifiedCount}/{session.blockCount} Verified
                  </div>
                  <div className="session-card-time">{session.timestamp}</div>
                </div>

                <div className="session-card-actions">
                  <button
                    type="button"
                    className="btn-session-action restore"
                    onClick={() => onRestore(session.id)}
                    title="Pulihkan dan muat baris sesi ini ke Staging"
                    aria-label="Pulihkan Sesi"
                  >
                    <IconRefresh size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-session-action delete"
                    onClick={() => onDelete(session.id)}
                    title="Hapus riwayat sesi ini"
                    aria-label="Hapus Sesi"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
