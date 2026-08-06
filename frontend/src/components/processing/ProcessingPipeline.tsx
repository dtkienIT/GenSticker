import type { FC } from 'react';
import type { GenerationState } from '../../types/sticker';
import { ProgressBar } from '../common/ProgressBar';
import { CheckCircle2, Loader2, Sparkles, Clock } from 'lucide-react';

interface ProcessingPipelineProps {
  state: GenerationState;
}

export const ProcessingPipeline: FC<ProcessingPipelineProps> = ({ state }) => {
  const currentStep = state.steps[state.currentStepIndex] || state.steps[0];

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '99px',
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          color: '#c084fc',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '12px'
        }}>
          <Loader2 size={16} className="animate-spin-slow" />
          <span>AI Pipeline Engine Đang Hoạt Động</span>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>
          Đang Sinh Bộ Sticker Cho Bạn...
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
          Vui lòng đợi vài giây để hệ thống thực hiện 5 bước xử lý đồ họa AI chuyên sâu.
        </p>
      </div>

      {/* Main Glass Pipeline Card */}
      <div className="glass-panel" style={{ padding: '36px' }}>
        
        {/* Top Image Preview & Overall Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
          
          {/* Animated Avatar Glow Frame */}
          {state.originalImage && (
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '20px',
              overflow: 'hidden',
              border: '2px solid var(--accent-purple)',
              boxShadow: 'var(--shadow-glow)',
              flexShrink: 0,
              position: 'relative'
            }}>
              <img 
                src={state.originalImage} 
                alt="Source preview" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 40%, rgba(124, 58, 237, 0.6) 100%)'
              }} />
            </div>
          )}

          {/* Progress overview */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700 }}>Tổng Tiến Trình (Overall)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Clock size={14} />
                <span>Khoảng ~12 giây</span>
              </div>
            </div>
            <ProgressBar progress={state.overallProgress} height={14} showLabel={false} />
          </div>
        </div>

        {/* 5-Step Status List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {state.steps.map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isCurrent = idx === state.currentStepIndex && step.status === 'processing';

            return (
              <div
                key={step.id}
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: isCurrent 
                    ? 'rgba(139, 92, 246, 0.12)' 
                    : isCompleted 
                    ? 'rgba(16, 185, 129, 0.08)' 
                    : 'var(--btn-secondary-bg)',
                  border: isCurrent 
                    ? '1px solid var(--accent-purple)' 
                    : isCompleted 
                    ? '1px solid rgba(16, 185, 129, 0.3)' 
                    : '1px solid var(--border-subtle)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                {/* Status Indicator Icon */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: isCompleted 
                    ? 'rgba(16, 185, 129, 0.2)' 
                    : isCurrent 
                    ? 'rgba(139, 92, 246, 0.2)' 
                    : 'var(--btn-secondary-bg)',
                  color: isCompleted ? '#10b981' : isCurrent ? '#c084fc' : 'var(--text-muted)'
                }}>
                  {isCompleted ? (
                    <CheckCircle2 size={20} />
                  ) : isCurrent ? (
                    <Loader2 size={20} className="animate-spin-slow" />
                  ) : (
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{idx + 1}</span>
                  )}
                </div>

                {/* Step Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ 
                      fontSize: '0.98rem', 
                      fontWeight: 700, 
                      color: isCompleted ? '#10b981' : isCurrent ? 'var(--accent-purple)' : 'var(--text-primary)' 
                    }}>
                      Bước {idx + 1}: {step.title}
                    </h4>
                    {isCurrent && (
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-pink)' }}>
                        {step.progress}%
                      </span>
                    )}
                  </div>
                  
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {step.description}
                  </p>

                  {/* Sub progress bar for current active step */}
                  {isCurrent && (
                    <div style={{ marginTop: '10px' }}>
                      <ProgressBar progress={step.progress} height={6} showLabel={false} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Status Banner */}
        <div style={{
          marginTop: '28px',
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(139, 92, 246, 0.08)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          textAlign: 'center',
          fontSize: '0.88rem',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <Sparkles size={18} color="#c084fc" />
          <span>Đang tạo sticker cảm xúc: <strong>{currentStep?.title}</strong></span>
        </div>

      </div>
    </div>
  );
};
