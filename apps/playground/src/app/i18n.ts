/// <reference types="vite/client" />
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import deCommon from '../locales/de/common.json' with { type: 'json' };
import deMission from '../locales/de/mission.json' with { type: 'json' };
import deProtocolFlow from '../locales/de/protocol-flow.json' with { type: 'json' };
import enCommon from '../locales/en/common.json' with { type: 'json' };
import enMission from '../locales/en/mission.json' with { type: 'json' };
import enProtocolFlow from '../locales/en/protocol-flow.json' with { type: 'json' };

export const localeStorageKey = 'auth-protocol-playground.locale';

function initialLanguage() {
  try {
    const saved = localStorage.getItem(localeStorageKey);
    return saved === 'en' ? 'en' : 'de';
  } catch {
    // A denied preference store must not block the learning interface.
    return 'de';
  }
}

export async function initializeLocalization() {
  await i18n.use(initReactI18next).init({
    lng: initialLanguage(),
    fallbackLng: 'de',
    supportedLngs: ['de', 'en'],
    load: 'languageOnly',
    ns: ['common', 'mission', 'protocol-flow'],
    defaultNS: 'common',
    resources: {
      de: { common: deCommon, mission: deMission, 'protocol-flow': deProtocolFlow },
      en: { common: enCommon, mission: enMission, 'protocol-flow': enProtocolFlow },
    },
    interpolation: { escapeValue: false }, // React renders interpolated values as text.
    returnEmptyString: false,
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (_languages, namespace, key) => {
      console.error(`Missing translation: ${namespace}:${key}`);
    },
  });
  document.documentElement.lang = i18n.language;
}

export async function selectLanguage(language: string) {
  if (language !== 'de' && language !== 'en') {
    return;
  }
  await i18n.changeLanguage(language);
  document.documentElement.lang = language;
  try {
    localStorage.setItem(localeStorageKey, language);
  } catch {
    // The active locale still works in memory when persistence is unavailable.
  }
}
