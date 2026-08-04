import type { User } from '../types/auth';

const STORAGE_KEY_USER = 'gensticker_user_session';

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

  static async login(email: string, password: string): Promise<User> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (!email || !email.includes('@')) {
      throw new Error('Vui lòng nhập email hợp lệ.');
    }

    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải từ 6 ký tự trở lên.');
    }

    const mockName = email.split('@')[0];
    const user: User = {
      id: `usr_${Date.now()}`,
      email: email.toLowerCase(),
      name: mockName.charAt(0).toUpperCase() + mockName.slice(1),
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return user;
  }

  static async register(name: string, email: string, password: string): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (!name.trim()) {
      throw new Error('Vui lòng nhập họ và tên.');
    }

    if (!email || !email.includes('@')) {
      throw new Error('Vui lòng nhập email hợp lệ.');
    }

    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải từ 6 ký tự trở lên.');
    }

    const user: User = {
      id: `usr_${Date.now()}`,
      email: email.toLowerCase(),
      name: name.trim(),
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return user;
  }

  static logout(): void {
    localStorage.removeItem(STORAGE_KEY_USER);
  }

  static quickDemoLogin(): User {
    const demoUser: User = {
      id: 'usr_demo_vip',
      email: 'demo.user@gensticker.ai',
      name: 'Vip Creator',
      avatarUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%237c3aed"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="35" cy="40" r="4" fill="%231e1b4b"/><circle cx="65" cy="40" r="4" fill="%231e1b4b"/><path d="M 35 65 Q 50 80 65 65" stroke="white" stroke-width="5" fill="none" stroke-linecap="round"/></svg>',
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(demoUser));
    return demoUser;
  }
}
