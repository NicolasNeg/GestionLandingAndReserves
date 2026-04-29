import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config.js';

export const DEFAULT_THEME = {
  primary: '#0f766e',
  primaryDark: '#115e59',
  accent: '#f59e0b',
  surface: '#f8fafc',
  text: '#0f172a',
  promoText: 'Promociones activas: compra anticipada, paquetes familiares y acceso rapido desde checkout.'
};

const colorKeys = ['primary', 'primaryDark', 'accent', 'surface', 'text'];

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
}

export function mergeTheme(data = {}) {
  const envMarquee = import.meta.env.VITE_PROMO_MARQUEE;
  const fromFirestore = data.promoText != null && String(data.promoText).trim() !== '';
  return {
    primary: safeColor(data.primary, DEFAULT_THEME.primary),
    primaryDark: safeColor(data.primaryDark, DEFAULT_THEME.primaryDark),
    accent: safeColor(data.accent, DEFAULT_THEME.accent),
    surface: safeColor(data.surface, DEFAULT_THEME.surface),
    text: safeColor(data.text, DEFAULT_THEME.text),
    promoText: String(
      fromFirestore
        ? data.promoText
        : (envMarquee && String(envMarquee).trim()) || DEFAULT_THEME.promoText
    )
  };
}

export function applyTheme(theme = DEFAULT_THEME) {
  const merged = mergeTheme(theme);
  const root = document.documentElement;
  colorKeys.forEach((key) => {
    root.style.setProperty(`--app-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`, merged[key]);
  });
  root.style.setProperty('--app-promo-text', `"${merged.promoText.replace(/"/g, '\\"')}"`);
  return merged;
}

export async function readThemeConfig() {
  try {
    const snap = await getDoc(doc(db, 'appConfig', 'theme'));
    return mergeTheme(snap.exists() ? snap.data() : {});
  } catch (error) {
    console.warn('Tema Firestore no disponible:', error);
    return DEFAULT_THEME;
  }
}

export async function initTheme() {
  const theme = await readThemeConfig();
  applyTheme(theme);
  return theme;
}
