import { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { ImageUploader } from './components/upload/ImageUploader';
import { ProcessingPipeline } from './components/processing/ProcessingPipeline';
import { StickerGrid } from './components/gallery/StickerGrid';
import { AuthModal } from './components/auth/AuthModal';
import { HistoryModal } from './components/history/HistoryModal';
import { useStickerGenerator } from './hooks/useStickerGenerator';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { StickerService, type StickerPackHistoryItem } from './services/stickerService';
import type { StickerItem } from './types/sticker';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const { theme, toggleTheme } = useTheme();

  const {
    state,
    setSelectedStyle,
    startGeneration,
    loadStickerPack,
    resetGenerator,
    toggleFavorite,
  } = useStickerGenerator();

  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historyPacks, setHistoryPacks] = useState<StickerPackHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const historyRequestIdRef = useRef(0);

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
  };

  const handleSelectHistoryPack = (stickers: StickerItem[]) => {
    loadStickerPack(stickers);
  };

  const handleExportHistoryTelegram = (_title: string, _styleName?: string, stickers?: StickerItem[]) => {
    if (stickers && stickers.length > 0) {
      loadStickerPack(stickers);
    }
  };

  const handleDeleteHistoryPack = async (packId: string) => {
    await StickerService.deleteHistoryPack(packId);
    setHistoryPacks((packs) => packs.filter((pack) => pack.id !== packId));
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navbar */}
      <Header 
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAuth={openAuthModal}
        onLogout={handleLogout}
        onReset={resetGenerator} 
        hasActiveSession={state.status !== 'idle'} 
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

      {/* History Modal */}
      <HistoryModal
        isOpen={isAuthenticated && isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyPacks={historyPacks}
        isLoading={isHistoryLoading}
        onSelectPack={handleSelectHistoryPack}
        onExportTelegram={handleExportHistoryTelegram}
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
