import { useState, useCallback, useEffect } from 'react';
import type { User, AuthMode } from '../types/auth';
import { AuthService } from '../services/authService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const openAuthModal = useCallback((mode: AuthMode = 'login') => {
    setAuthMode(mode);
    setError(null);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setError(null);
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInUser = await AuthService.login(email, pass);
      setUser(loggedInUser);
      setIsAuthModalOpen(false);
      return loggedInUser;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại!';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const registeredUser = await AuthService.register(name, email, pass);
      setUser(registeredUser);
      setIsAuthModalOpen(false);
      return registeredUser;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng ký thất bại. Vui lòng thử lại!';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const quickDemoLogin = useCallback(() => {
    const demoUser = AuthService.quickDemoLogin();
    setUser(demoUser);
    setIsAuthModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    AuthService.logout();
    setUser(null);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isAuthModalOpen,
    authMode,
    isLoading,
    error,
    openAuthModal,
    closeAuthModal,
    setAuthMode,
    login,
    register,
    quickDemoLogin,
    logout,
  };
}
