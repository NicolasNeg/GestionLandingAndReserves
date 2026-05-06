import { getAppThemeRow, upsertAppThemePayload } from './supabaseData.js';

export const DEFAULT_THEME = {
  primary: '#0f766e',
  primaryDark: '#115e59',
  accent: '#f59e0b',
  surface: '#f8fafc',
  text: '#0f172a',
  promoText: 'Promociones activas: compra anticipada, paquetes familiares y acceso rapido desde checkout.'
};

const colorKeys = ['primary', 'primaryDark', 'accent', 'surface', 'text'];
const THEME_READ_TIMEOUT_MS = 3500;

function isPermissionDenied(error) {
  return error?.code === 'permission-denied' || /insufficient permissions/i.test(String(error?.message || ''));
}

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
}

export function mergeTheme(data = {}) {
  const envMarquee = import.meta.env.VITE_PROMO_MARQUEE;
  const fromDb = data.promoText != null && String(data.promoText).trim() !== '';
  return {
    primary: safeColor(data.primary, DEFAULT_THEME.primary),
    primaryDark: safeColor(data.primaryDark, DEFAULT_THEME.primaryDark),
    accent: safeColor(data.accent, DEFAULT_THEME.accent),
    surface: safeColor(data.surface, DEFAULT_THEME.surface),
    text: safeColor(data.text, DEFAULT_THEME.text),
    promoText: String(
      fromDb
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
    const row = await Promise.race([
      getAppThemeRow(),
      new Promise((_, reject) => {
        globalThis.setTimeout(() => reject(new Error('Timeout leyendo tema')), THEME_READ_TIMEOUT_MS);
      })
    ]);
    const raw = row?.payload && typeof row.payload === 'object' ? row.payload : {};
    return mergeTheme(raw);
  } catch (error) {
    if (!isPermissionDenied(error)) {
      console.warn('Tema no disponible:', error);
    }
    return mergeTheme({});
  }
}

export async function saveThemeConfig(themeLike) {
  const merged = mergeTheme(themeLike || {});
  await upsertAppThemePayload({
    primary: merged.primary,
    primaryDark: merged.primaryDark,
    accent: merged.accent,
    surface: merged.surface,
    text: merged.text,
    promoText: merged.promoText
  });
  return merged;
}

export async function initTheme() {
  const theme = await readThemeConfig();
  applyTheme(theme);
  return theme;
}
