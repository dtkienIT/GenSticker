import React, { useState, useCallback } from 'react';
import { LanguageContext } from './i18n/i18n';
import { AppStep, Language, Sticker } from './types';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { UploadPage } from './pages/UploadPage';
import { GeneratingPage } from './pages/GeneratingPage';
import { PreviewPage } from './pages/PreviewPage';
import { TrayPage } from './pages/TrayPage';

export const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [step, setStep] = useState<AppStep>('landing');
  
  const [imageBase64, setImageBase64] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [regenCount, setRegenCount] = useState(3);

  const handleNavigate = useCallback((newStep: AppStep) => {
    setStep(newStep);
  }, []);

  const handleRegenerate = useCallback(() => {
    if (regenCount > 0) {
      setRegenCount(prev => prev - 1);
      setStep('generating');
    }
  }, [regenCount]);

  const handleImageReady = useCallback((b64: string, mime: string) => {
    setImageBase64(b64);
    setMimeType(mime);
    setRegenCount(3); // Reset regen count for new photo
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <div className="app-container">
        <Header 
          showBack={step !== 'landing' && step !== 'tray'} 
          onBack={() => setStep('landing')} 
        />
        
        <main className="main-content">
          {step === 'landing' && <LandingPage onNavigate={handleNavigate} />}
          {step === 'upload' && (
            <UploadPage 
              onNavigate={handleNavigate} 
              onImageReady={handleImageReady} 
            />
          )}
          {step === 'generating' && (
             <GeneratingPage 
                imageBase64={imageBase64} 
                mimeType={mimeType} 
                onDone={setStickers} 
                onNavigate={handleNavigate} 
             />
          )}
          {step === 'preview' && (
             <PreviewPage 
                initialStickers={stickers} 
                regenCount={regenCount}
                onRegenerate={handleRegenerate}
                onNavigate={handleNavigate} 
             />
          )}
          {step === 'tray' && <TrayPage onNavigate={handleNavigate} />}
        </main>
      </div>
    </LanguageContext.Provider>
  );
};

export default App;
