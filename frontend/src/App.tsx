import { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { MeteorBackground } from './components/common/MeteorBackground';
import { ImageUploader } from './components/upload/ImageUploader';
import { ProcessingPipeline } from './components/processing/ProcessingPipeline';
import { StickerGrid } from './components/gallery/StickerGrid';
import { GenerationComparison } from './components/gallery/GenerationComparison';
import { AuthModal } from './components/auth/AuthModal';
import { HistoryModal } from './components/history/HistoryModal';
import { DocumentationPage } from './components/docs/DocumentationPage';
import { useStickerGenerator } from './hooks/useStickerGenerator';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { StickerService, type StickerPackHistoryItem } from './services/stickerService';
import type { StickerItem } from './types/sticker';
import { getErrorRecoveryAction } from './utils/errorRecovery';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeView, setActiveView] = useState<'generator' | 'docs'>(() => (
    window.location.hash === '#tai-lieu' ? 'docs' : 'generator'
  ));

  const {
    state,
    setSelectedStyle,
    startGeneration,
    loadStickerPack,
    retryGeneration,
    resetGenerator,
    toggleFavorite,
  } = useStickerGenerator();

  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historyPacks, setHistoryPacks] = useState<StickerPackHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const historyRequestIdRef = useRef(0);

  useEffect(() => {
    const syncViewWithLocation = () => {
      setActiveView(window.location.hash === '#tai-lieu' ? 'docs' : 'generator');
    };

    window.addEventListener('hashchange', syncViewWithLocation);
    window.addEventListener('popstate', syncViewWithLocation);
    return () => {
      window.removeEventListener('hashchange', syncViewWithLocation);
      window.removeEventListener('popstate', syncViewWithLocation);
    };
  }, []);

  // Scroll to top whenever the generator state or top-level view changes.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeView, state.status]);

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

  const loadHistory = useCallback(async () => {
    const requestId = ++historyRequestIdRef.current;

    if (!user?.id) {
      setHistoryPacks([]);
      setIsHistoryLoading(false);
      return;
    }

    setIsHistoryLoading(true);
    try {
      const packs = await StickerService.getUserHistory();
      if (requestId === historyRequestIdRef.current) {
        setHistoryPacks(packs);
      }
    } finally {
      if (requestId === historyRequestIdRef.current) {
        setIsHistoryLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsHistoryOpen(false);
    }
    void loadHistory();
  }, [isAuthenticated, loadHistory, state.status]);

  const handleLogout = () => {
    historyRequestIdRef.current += 1;
    setHistoryPacks([]);
    setIsHistoryLoading(false);
    setIsHistoryOpen(false);
    logout();
    resetGenerator();
  };

  const handleSelectHistoryPack = (stickers: StickerItem[]) => {
    loadStickerPack(stickers);
    // Switch to generator view if currently on docs page
    if (activeView !== 'generator') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      setActiveView('generator');
    }
  };

  const handleDeleteHistoryPack = async (packId: string) => {
    await StickerService.deleteHistoryPack(packId);
    setHistoryPacks((packs) => packs.filter((pack) => pack.id !== packId));
  };

  const openDocumentation = useCallback(() => {
    if (window.location.hash !== '#tai-lieu') {
      window.location.hash = 'tai-lieu';
      return;
    }
    setActiveView('docs');
  }, []);

  const closeDocumentation = useCallback(() => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setActiveView('generator');
  }, []);

  const handleReset = useCallback(() => {
    if (window.location.hash === '#tai-lieu') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      setActiveView('generator');
    }
    resetGenerator();
  }, [resetGenerator]);

  const errorRecoveryAction = getErrorRecoveryAction({
    jobId: state.jobId,
    qualityStatus: state.qualityStatus,
    previewCount: state.previewImageUrls.length,
  });

  return (
    <div className="app-shell">
      <MeteorBackground />
      
      {/* Navbar */}
      <Header 
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAuth={openAuthModal}
        onLogout={handleLogout}
        onReset={handleReset}
        onOpenDocs={openDocumentation}
        isDocsActive={activeView === 'docs'}
        onOpenHistory={() => {
          if (!isAuthenticated) {
            openAuthModal('login');
            return;
          }
          void loadHistory();
          setIsHistoryOpen(true);
        }}
        historyCount={historyPacks.length}
      />

      {/* Main Container */}
      <main className="main-content">
        {activeView === 'docs' && (
          <DocumentationPage onBack={closeDocumentation} />
        )}

        {/* State: Idle (Upload & Configuration) */}
        {activeView === 'generator' && state.status === 'idle' && (
          <ImageUploader 
            onStartGeneration={startGeneration}
            selectedStyle={state.selectedStyle}
            onSelectStyle={setSelectedStyle}
            isAuthenticated={isAuthenticated}
            onRequestAuth={() => openAuthModal('login')}
          />
        )}

        {/* State: Processing (AI Pipeline in Progress) */}
        {activeView === 'generator' && state.status === 'processing' && (
          <ProcessingPipeline state={state} />
        )}

        {/* State: Completed (20 Stickers Grid Gallery) */}
        {activeView === 'generator' && state.status === 'completed' && (
          <StickerGrid
            state={state}
            onReset={handleReset}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {/* State: Error */}
        {activeView === 'generator' && state.status === 'error' && (
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
              onClick={errorRecoveryAction === 'retry-partial' ? retryGeneration : handleReset}
              className="btn-primary"
              style={{ marginTop: '24px' }}
            >
              <RefreshCw size={18} />
              <span>
                {errorRecoveryAction === 'retry-partial'
                  ? 'Tiếp Tục Bảng Còn Thiếu'
                  : 'Thử Lại Ngay'}
              </span>
            </button>
          </div>
        )}

      </main>

      {/* History Modal */}
      <HistoryModal
        isOpen={isAuthenticated && isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyPacks={historyPacks}
        isLoading={isHistoryLoading}
        onSelectPack={handleSelectHistoryPack}
        onDeletePack={handleDeleteHistoryPack}
      />

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
