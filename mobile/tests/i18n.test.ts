import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue('vi'),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
}));

import { translate, translations } from '../src/i18n';

describe('i18n translation system', () => {
  it('translates keys in Vietnamese', () => {
    expect(translate('vi', 'tabs.home')).toBe('Trang chủ');
    expect(translate('vi', 'tabs.library')).toBe('Thư viện');
    expect(translate('vi', 'home.brand')).toBe('Gen Sticker');
  });

  it('translates keys in English', () => {
    expect(translate('en', 'tabs.home')).toBe('Home');
    expect(translate('en', 'tabs.library')).toBe('Library');
    expect(translate('en', 'home.brand')).toBe('Gen Sticker');
    expect(translate('en', 'home.hero.startButton')).toBe('Start Creating Stickers');
  });

  it('interpolates parameters into translation templates correctly', () => {
    expect(translate('vi', 'preview.saveButton', { count: 5 })).toBe('Lưu 5 sticker');
    expect(translate('en', 'preview.saveButton', { count: 5 })).toBe('Save 5 stickers');
    expect(translate('vi', 'library.packMeta', { count: 8 })).toBe('8 sticker · Riêng tư');
    expect(translate('en', 'library.packMeta', { count: 8 })).toBe('8 stickers · Private');
  });

  it('has identical keys for both Vietnamese and English dictionaries', () => {
    const viKeys = Object.keys(translations.vi).sort();
    const enKeys = Object.keys(translations.en).sort();
    expect(viKeys).toEqual(enKeys);
  });
});
