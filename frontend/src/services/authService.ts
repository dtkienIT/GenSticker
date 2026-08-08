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
  static getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      if (stored) {
        return JSON.parse(stored) as User;
      }
    } catch (e) {
      console.error('Error reading user session from localStorage', e);
    }
    return null;
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
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

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
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

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
    return user;
  }

  static logout(): void {
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
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
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(demoUser));
      localStorage.setItem(STORAGE_KEY_TOKEN, 'local-dev-only');
      return demoUser;
    }
    return AuthService.login('demo@gensticker.ai', 'Demo@2026!');
  }
}
