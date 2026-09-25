import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'it' | 'en';

interface SettingsState {
  language: Language;
  exportTriangleWarning: number;
  setLanguage: (lang: Language) => void;
  setExportTriangleWarning: (n: number) => void;
}

/**
 * Persisted to localStorage (D-06): app settings survive a reload/update
 * as long as the browser profile is kept. Viewport-session state (shading,
 * snap toggles, etc.) stays in `useViewStore` and is intentionally not
 * persisted here — it resets with a new document, which is the desired
 * default per the PRD.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: navigator.language.toLowerCase().startsWith('it') ? 'it' : 'en',
      exportTriangleWarning: 10000,
      setLanguage: (lang) => set({ language: lang }),
      setExportTriangleWarning: (n) => set({ exportTriangleWarning: n }),
    }),
    { name: 'fabricator-settings' },
  ),
);
