import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import it from './it.json';
import en from './en.json';
import { useSettingsStore } from '../store/useSettingsStore';

void i18next.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  lng: useSettingsStore.getState().language,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

useSettingsStore.subscribe((state) => {
  void i18next.changeLanguage(state.language);
});

export default i18next;
