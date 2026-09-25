import { create } from 'zustand';

export type Language = 'it' | 'en';

interface SettingsState {
  language: Language;
  exportTriangleWarning: number;
  setLanguage: (lang: Language) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: navigator.language.toLowerCase().startsWith('it') ? 'it' : 'en',
  exportTriangleWarning: 10000,
  setLanguage: (lang) => set({ language: lang }),
}));
