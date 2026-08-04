import type { FC } from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  showLabel?: boolean;
  animated?: boolean;
}

export const ProgressBar: FC<ProgressBarProps> = ({
  progress,
  height = 10,
  showLabel = true,
  animated = true,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Tiến Trình Xử Lý</span>
          <span className="text-gradient">{clampedProgress}%</span>
        </div>
      )}
      
      <div style={{
        width: '100%',
        height: `${height}px`,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '99px',
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{
          height: '100%',
          width: `${clampedProgress}%`,
          background: 'linear-gradient(90deg, #7c3aed 0%, #ec4899 50%, #06b6d4 100%)',
          borderRadius: '99px',
          transition: 'width 0.3s ease-out',
          boxShadow: '0 0 12px rgba(124, 58, 237, 0.6)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {animated && clampedProgress < 100 && (
            <div className="shimmer-bg" style={{ position: 'absolute', inset: 0 }} />
          )}
        </div>
      </div>
    </div>
  );
};
