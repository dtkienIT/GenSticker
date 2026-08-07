import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { StickerPackHistoryItem } from '../../services/stickerService';
import type { StickerItem } from '../../types/sticker';
import { History, X, Clock, Layers, Sparkles, Send, Eye, Calendar, Trash2, AlertTriangle, LoaderCircle } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyPacks: StickerPackHistoryItem[];
  isLoading?: boolean;
  onSelectPack: (stickers: StickerItem[], title: string) => void;
  onExportTelegram: (title: string, styleName?: string, stickers?: StickerItem[]) => void;
  onDeletePack: (packId: string) => Promise<void>;
}

export const HistoryModal: FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  historyPacks,
  isLoading = false,
  onSelectPack,
  onExportTelegram,
  onDeletePack,
}) => {
  const [deleteCandidate, setDeleteCandidate] = useState<StickerPackHistoryItem | null>(null);
  const [deletingPackId, setDeletingPackId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDeleteCandidate(null);
      setDeletingPackId(null);
      setDeleteError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (deletingPackId) return;
    setDeleteCandidate(null);
    setDeleteError(null);
    onClose();
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate || deletingPackId) return;

    setDeletingPackId(deleteCandidate.id);
    setDeleteError(null);
    try {
      await onDeletePack(deleteCandidate.id);
      setDeleteCandidate(null);
    } catch (error: unknown) {
      setDeleteError(error instanceof Error ? error.message : 'Không thể xóa lịch sử. Vui lòng thử lại.');
    } finally {
      setDeletingPackId(null);
    }
  };

  if (!isOpen) return null;

  const totalPacks = historyPacks.length;
  const totalStickers = historyPacks.reduce((acc, p) => acc + (p.total_stickers || p.stickers?.length || 20), 0);

  const formatDate = (isoString: string) => {
    if (!isoString) return 'Vừa xong';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="modal-overlay-backdrop" onClick={handleClose}>
      <div
        className="glass-panel responsive-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
          position: 'relative',
          padding: '0'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '22px 28px',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(236, 72, 153, 0.12) 100%)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
              flexShrink: 0
            }}>
              <History size={24} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Lịch Sử Tạo Sticker
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                Quản lý các bộ sticker đã khởi tạo trong tài khoản của bạn
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={Boolean(deletingPackId)}
            style={{
              background: 'var(--btn-secondary-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px 28px' }}>

          {/* Stats Summary Bar */}
          <div className="history-stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              padding: '14px 16px',
              borderRadius: '16px',
              background: 'var(--badge-purple-bg)',
              border: '1px solid var(--badge-purple-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Layers size={22} color="var(--accent-purple)" />
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tổng Bộ Sticker</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 800 }}>{totalPacks} Bộ</strong>
              </div>
            </div>

            <div style={{
              padding: '14px 16px',
              borderRadius: '16px',
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Sparkles size={22} color="#06b6d4" />
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tổng Sticker Sinh Ra</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 800 }}>{totalStickers} Ảnh</strong>
              </div>
            </div>

            <div style={{
              padding: '14px 16px',
              borderRadius: '16px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Clock size={22} color="#10b981" />
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Trạng Thái DB</span>
                <strong style={{ fontSize: '0.88rem', color: '#10b981', fontWeight: 700 }}>Đồng Bộ Supabase</strong>
              </div>
            </div>
          </div>

          {/* History Item Cards List */}
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Sparkles size={32} className="spin" style={{ marginBottom: '12px', color: 'var(--accent-purple)' }} />
              <p>Đang tải lịch sử tạo sticker từ máy chủ...</p>
            </div>
          ) : historyPacks.length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              borderRadius: '20px',
              background: 'var(--btn-secondary-bg)',
              border: '1px dashed var(--border-subtle)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--badge-purple-bg)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}>
                <History size={32} color="var(--accent-purple)" />
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Chưa có lịch sử tạo sticker
              </h4>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '380px', margin: '6px auto 0' }}>
                Hãy tải 1 bức ảnh chân dung lên và nhấn nút sinh bộ sticker để tự động lưu lịch sử vào tài khoản của bạn!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {historyPacks.map((pack) => {
                const sampleStickers = pack.stickers ? pack.stickers.slice(0, 4) : [];
                return (
                  <div
                    key={pack.id}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '18px',
                      background: 'var(--btn-secondary-bg)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap',
                      transition: 'transform 0.2s ease, border-color 0.2s ease'
                    }}
                  >
                    {/* Left: Info & Thumbnail strip */}
                    <div className="history-pack-info" style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
                      {/* Thumbnail strip */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '3px',
                        width: '68px',
                        height: '68px',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        padding: '3px',
                        flexShrink: 0
                      }}>
                        {sampleStickers.length > 0 ? (
                          sampleStickers.map((stk, idx) => (
                            stk.imageUrl ? (
                              <img
                                key={idx}
                                src={stk.imageUrl}
                                alt={stk.title}
                                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
                              />
                            ) : (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                <Layers size={14} />
                              </div>
                            )
                          ))
                        ) : (
                          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <Layers size={20} />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            {pack.title || 'Bộ Sticker AI'}
                          </h4>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '99px',
                            background: 'var(--badge-purple-bg)',
                            color: 'var(--badge-purple-text)',
                            border: '1px solid var(--badge-purple-border)',
                            fontWeight: 600
                          }}>
                            {pack.style_name || '3D Chibi Cutie'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} />
                            {formatDate(pack.created_at)}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284c7', fontWeight: 600 }}>
                            <Layers size={13} />
                            {pack.total_stickers || pack.stickers?.length || 20} Stickers
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Action buttons */}
                    <div className="history-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {pack.stickers && pack.stickers.length > 0 && (
                        <button
                          onClick={() => {
                            onSelectPack(pack.stickers, pack.title);
                            handleClose();
                          }}
                          disabled={Boolean(deletingPackId)}
                          className="btn-secondary"
                          style={{ padding: '8px 14px', fontSize: '0.82rem', borderRadius: '10px' }}
                          title="Xem lại trọn bộ sticker"
                        >
                          <Eye size={15} />
                          <span>Xem Lại</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onExportTelegram(pack.title, pack.style_name, pack.stickers);
                          handleClose();
                        }}
                        disabled={Boolean(deletingPackId)}
                        className="btn-primary"
                        style={{
                          padding: '8px 14px',
                          fontSize: '0.82rem',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #229ED9 0%, #0088cc 100%)',
                          boxShadow: '0 4px 12px rgba(34, 158, 217, 0.3)'
                        }}
                      >
                        <Send size={15} />
                        <span>Xuất Telegram</span>
                      </button>

                      <button
                        onClick={() => {
                          setDeleteCandidate(pack);
                          setDeleteError(null);
                        }}
                        className="btn-secondary history-delete-button"
                        disabled={Boolean(deletingPackId)}
                        style={{
                          padding: '8px 12px',
                          fontSize: '0.82rem',
                          borderRadius: '10px',
                          color: '#dc2626',
                          borderColor: 'rgba(239, 68, 68, 0.35)'
                        }}
                        title="Xóa bộ sticker khỏi lịch sử"
                      >
                        <Trash2 size={15} />
                        <span>Xóa</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {deleteCandidate && (
          <div
            className="modal-overlay-backdrop"
            style={{ zIndex: 1100 }}
            onClick={(event) => {
              event.stopPropagation();
              if (!deletingPackId) {
                setDeleteCandidate(null);
                setDeleteError(null);
              }
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-history-title"
              className="glass-panel history-delete-dialog"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '430px',
                padding: '28px',
                borderRadius: '20px',
                background: 'var(--bg-card)',
                border: '1px solid rgba(239, 68, 68, 0.35)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#dc2626',
                  background: 'rgba(239, 68, 68, 0.12)'
                }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h4 id="delete-history-title" style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    Xóa bộ sticker khỏi lịch sử?
                  </h4>
                  <p style={{ margin: '6px 0 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                    “{deleteCandidate.title}” sẽ không còn xuất hiện trong lịch sử của bạn.
                  </p>
                </div>
              </div>

              {deleteError && (
                <p
                  role="alert"
                  style={{
                    marginTop: '16px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    color: 'var(--alert-error-text)',
                    background: 'var(--alert-error-bg)',
                    border: '1px solid var(--alert-error-border)',
                    fontSize: '0.82rem'
                  }}
                >
                  {deleteError}
                </p>
              )}

              <div className="history-delete-dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                <button
                  onClick={() => {
                    setDeleteCandidate(null);
                    setDeleteError(null);
                  }}
                  className="btn-secondary"
                  disabled={Boolean(deletingPackId)}
                  style={{ padding: '8px 16px', borderRadius: '10px' }}
                >
                  Hủy
                </button>
                <button
                  onClick={() => void handleConfirmDelete()}
                  className="btn-primary"
                  disabled={Boolean(deletingPackId)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: '#dc2626',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  {deletingPackId ? <LoaderCircle size={16} className="spin" /> : <Trash2 size={16} />}
                  <span>{deletingPackId ? 'Đang xóa...' : 'Xóa khỏi lịch sử'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
