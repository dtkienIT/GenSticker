import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { ImageUploader } from './components/upload/ImageUploader';
import { ProcessingPipeline } from './components/processing/ProcessingPipeline';
import { StickerGrid } from './components/gallery/StickerGrid';
import { useStickerGenerator } from './hooks/useStickerGenerator';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const {
    state,
    setSelectedStyle,
    startGeneration,
    resetGenerator,
    toggleFavorite,
  } = useStickerGenerator();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navbar */}
      <Header 
        onReset={resetGenerator} 
        hasActiveSession={state.status !== 'idle'} 
      />

      {/* Main Container */}
      <main style={{ flex: 1, padding: '40px 24px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        
        {/* State: Idle (Upload & Configuration) */}
        {state.status === 'idle' && (
          <ImageUploader 
            onStartGeneration={startGeneration}
            selectedStyle={state.selectedStyle}
            onSelectStyle={setSelectedStyle}
          />
        )}

        {/* State: Processing (AI Pipeline in Progress) */}
        {state.status === 'processing' && (
          <ProcessingPipeline state={state} />
        )}

        {/* State: Completed (20 Stickers Grid Gallery) */}
        {state.status === 'completed' && (
          <StickerGrid 
            state={state}
            onReset={resetGenerator}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {/* State: Error */}
        {state.status === 'error' && (
          <div className="glass-panel" style={{ maxWidth: '600px', margin: '60px auto', padding: '40px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertCircle size={32} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Rất Tiếc, Có Lỗi Xảy Ra</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.92rem' }}>
              {state.errorMessage}
            </p>

            <button
              onClick={resetGenerator}
              className="btn-primary"
              style={{ marginTop: '24px' }}
            >
              <RefreshCw size={18} />
              <span>Thử Lại Ngay</span>
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}

export default App;
