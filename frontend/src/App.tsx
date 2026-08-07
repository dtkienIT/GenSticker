import { useEffect } from 'react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { ImageUploader } from './components/upload/ImageUploader';
import { ProcessingPipeline } from './components/processing/ProcessingPipeline';
import { StickerGrid } from './components/gallery/StickerGrid';
import { GenerationComparison } from './components/gallery/GenerationComparison';
import { AuthModal } from './components/auth/AuthModal';
import { useStickerGenerator } from './hooks/useStickerGenerator';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const { theme, toggleTheme } = useTheme();

  const {
    state,
    setSelectedStyle,
    startGeneration,
    retryGeneration,
    resetGenerator,
    toggleFavorite,
  } = useStickerGenerator();

  // Scroll to top of window whenever page view state changes (idle, processing, completed, error)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.status]);

  const {
    user,
    isAuthenticated,
    isAuthModalOpen,
    authMode,
    isLoading: isAuthLoading,
    error: authError,
    openAuthModal,
    closeAuthModal,
    setAuthMode,
    login,
    register,
    quickDemoLogin,
    logout,
  } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navbar */}
      <Header 
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAuth={openAuthModal}
        onLogout={logout}
        onReset={resetGenerator} 
      />

      {/* Main Container */}
      <main className="main-content">
        
        {/* State: Idle (Upload & Configuration) */}
        {state.status === 'idle' && (
          <ImageUploader 
            onStartGeneration={startGeneration}
            selectedStyle={state.selectedStyle}
            onSelectStyle={setSelectedStyle}
            isAuthenticated={isAuthenticated}
            onRequestAuth={() => openAuthModal('login')}
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
          <div className="glass-panel" style={{ maxWidth: state.qualityStatus === 'rejected' && state.previewImageUrl ? '1100px' : '600px', margin: '60px auto', padding: '40px', textAlign: 'center' }}>
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

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              {state.qualityStatus === 'rejected' && state.previewImageUrl ? 'Các Bảng Sticker OpenAI Đã Tạo' : 'Rất Tiếc, Có Lỗi Xảy Ra'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.92rem' }}>
              {state.errorMessage}
            </p>

            {state.previewImageUrls.length > 0 && (
              <div style={{ marginTop: '24px', textAlign: 'left' }}>
                <GenerationComparison
                  originalImage={state.originalImage}
                  previewImageUrls={state.previewImageUrls}
                  qualityStatus={state.qualityStatus}
                />
              </div>
            )}

            <button
              onClick={state.qualityStatus === 'rejected' && state.jobId ? retryGeneration : resetGenerator}
              className="btn-primary"
              style={{ marginTop: '24px' }}
            >
              <RefreshCw size={18} />
              <span>Thử Lại Ngay</span>
            </button>
          </div>
        )}

      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        mode={authMode}
        isLoading={isAuthLoading}
        error={authError}
        onClose={closeAuthModal}
        onSwitchMode={setAuthMode}
        onLogin={login}
        onRegister={register}
        onQuickDemoLogin={quickDemoLogin}
      />

      {/* Footer */}
      <Footer />

    </div>
  );
}

export default App;
