import type { User } from '../types/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const STORAGE_KEY_USER = 'gensticker_user_session';
const STORAGE_KEY_TOKEN = 'gensticker_access_token';

interface AuthApiResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
  };
}

export class AuthService {
  static readonly SESSION_CHANGED_EVENT = 'gensticker:auth-session-changed';

  private static notifySessionChanged(reason: 'signed-in' | 'signed-out' | 'expired'): void {
    window.dispatchEvent(new CustomEvent(AuthService.SESSION_CHANGED_EVENT, {
      detail: { reason },
    }));
  }

  private static saveSession(user: User, token: string): void {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    AuthService.notifySessionChanged('signed-in');
  }

  private static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // exp is in seconds, Date.now() is in milliseconds
      return payload.exp * 1000 < Date.now();
    } catch {
      return true; // Treat malformed tokens as expired
    }
  }

  static getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      const token = AuthService.getAccessToken();
      if (stored && token) {
        return JSON.parse(stored) as User;
      }
    } catch (e) {
      console.error('Error reading user session from localStorage', e);
    }
    return null;
  }

  static getAccessToken(): string | null {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (!token) return null;
    const isAllowedLocalDemoToken = (
      token === 'local-dev-only' &&
      import.meta.env.DEV &&
      import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'
    );
    if (!isAllowedLocalDemoToken && AuthService.isTokenExpired(token)) {
      AuthService.invalidateSession();
      return null;
    }
    return token;
  }

  static async login(email: string, password: string): Promise<User> {
    if (!email || !email.includes('@')) {
      throw new Error('Vui lòng nhập email hợp lệ.');
    }
    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải từ 6 ký tự trở lên.');
    }

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message = errorData?.detail || 'Email hoặc mật khẩu không chính xác.';
      throw new Error(message);
    }

    const data: AuthApiResponse = await response.json();

    const user: User = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      avatarUrl: data.user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.user.email)}`,
      createdAt: new Date().toISOString(),
    };

    AuthService.saveSession(user, data.access_token);
    return user;
  }

  static async register(name: string, email: string, password: string): Promise<User> {
    if (!name.trim()) {
      throw new Error('Vui lòng nhập họ và tên.');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Vui lòng nhập email hợp lệ.');
    }
    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải từ 6 ký tự trở lên.');
    }

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message = errorData?.detail || 'Đăng ký thất bại. Vui lòng thử lại.';
      throw new Error(message);
    }

    const data: AuthApiResponse = await response.json();

    const user: User = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name || name,
      avatarUrl: data.user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.user.email)}`,
      createdAt: new Date().toISOString(),
    };

    AuthService.saveSession(user, data.access_token);
    return user;
  }

  static logout(): void {
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    AuthService.notifySessionChanged('signed-out');
  }

  static invalidateSession(): void {
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    AuthService.notifySessionChanged('expired');
  }

  static async quickDemoLogin(): Promise<User> {
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      const demoUser: User = {
        id: 'local-demo-user',
        email: 'demo@localhost',
        name: 'Local Demo',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=local-demo',
        createdAt: new Date().toISOString(),
      };
      AuthService.saveSession(demoUser, 'local-dev-only');
      return demoUser;
    }
    return AuthService.login('demo@gensticker.ai', 'Demo@2026!');
  }
}
