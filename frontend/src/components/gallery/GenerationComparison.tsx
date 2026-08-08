import type { FC } from 'react';

interface GenerationComparisonProps {
  originalImage: string | null;
  previewImageUrls: string[];
  qualityStatus: 'reviewing' | 'accepted' | 'rejected' | null;
}

export const GenerationComparison: FC<GenerationComparisonProps> = ({
  originalImage,
  previewImageUrls,
  qualityStatus,
}) => {
  if (!originalImage && previewImageUrls.length === 0) return null;

  return (
    <section className="glass-panel" style={{ maxWidth: '1180px', margin: '0 auto 28px', padding: '28px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>So sánh ảnh đầu vào và kết quả OpenAI</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '0.9rem' }}>
          Kiểm tra khuôn mặt, kiểu tóc, màu tóc, phụ kiện và trang phục có được giữ nhất quán hay không.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.7fr) minmax(0, 2fr)', gap: '22px', alignItems: 'start' }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: '10px' }}>Ảnh selfie đầu vào</div>
          {originalImage && (
            <img
              src={originalImage}
              alt="Ảnh selfie đầu vào"
              style={{ width: '100%', maxHeight: '520px', objectFit: 'contain', borderRadius: '16px', background: 'rgba(255,255,255,0.04)' }}
            />
          )}
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: '10px' }}>
            Kết quả: {previewImageUrls.length} bảng 4×2
            {qualityStatus === 'rejected' ? ' — cần đánh giá thủ công' : ''}
          </div>
          <div style={{ display: 'grid', gap: '16px' }}>
            {previewImageUrls.map((url, index) => (
              <div key={`sheet-${index + 1}`}>
                <img
                  src={url}
                  alt={`Bảng sticker ${index + 1}`}
                  style={{ width: '100%', display: 'block', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}
                />
                <a
                  href={url}
                  download={`GenSticker_Sheet_${index + 1}.png`}
                  style={{ display: 'inline-block', marginTop: '8px', color: 'var(--accent-purple-light)', fontWeight: 700, textDecoration: 'none' }}
                >
                  Tải bảng {index + 1}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
