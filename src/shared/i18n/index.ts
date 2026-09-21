import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { defaultNS, resources } from './resources';

// Les traductions sont embarquées dans le bundle : aucun chargement réseau, donc hors ligne garanti.
void i18n.use(initReactI18next).init({
  resources,
  lng: 'fr',
  fallbackLng: 'fr',
  defaultNS,
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language;

export { i18n };
