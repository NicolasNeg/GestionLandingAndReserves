/**
 * Hero y ayuda/FAQ embebidos en botones_json (sin migración SQL).
 * Los botones de contacto siguen siendo whatsapp | mail | custom.
 */

import { ayudaFromBotonesArray, landingAyudaEntry } from './landingAyuda.js';

export const DEFAULT_LANDING_HERO = {
  kicker: 'Balneario San Antonio Texas',
  title: 'Tu dia perfecto empieza aqui',
  subtitle:
    'Reserva en linea, revisa paquetes y conoce el parque. Actualizado por el equipo desde un solo panel: horarios, mapa y catalogo.'
};

export function splitBotonesJson(raw) {
  let arr = [];
  try {
    const parsed = JSON.parse(raw || '[]');
    arr = Array.isArray(parsed) ? parsed : [];
  } catch {
    arr = [];
  }
  const heroEntries = arr.filter((x) => x && String(x.type || '') === 'landingHero');
  let hero = { ...DEFAULT_LANDING_HERO };
  if (heroEntries.length) {
    const h = heroEntries[heroEntries.length - 1];
    hero = {
      kicker: String(h.kicker ?? DEFAULT_LANDING_HERO.kicker),
      title: String(h.title ?? DEFAULT_LANDING_HERO.title),
      subtitle: String(h.subtitle ?? DEFAULT_LANDING_HERO.subtitle)
    };
  }
  const ayuda = ayudaFromBotonesArray(arr);
  const buttons = arr.filter(
    (b) => b && !['landingHero', 'landingAyuda'].includes(String(b.type || ''))
  );
  return { hero, ayuda, buttons };
}

export function mergeBotonesJson(hero, buttons, ayuda) {
  const safeHero = {
    type: 'landingHero',
    kicker: String(hero?.kicker ?? DEFAULT_LANDING_HERO.kicker),
    title: String(hero?.title ?? DEFAULT_LANDING_HERO.title),
    subtitle: String(hero?.subtitle ?? DEFAULT_LANDING_HERO.subtitle)
  };
  const rest = (buttons || []).filter(
    (b) => b && !['landingHero', 'landingAyuda'].includes(String(b.type || ''))
  );
  return JSON.stringify([safeHero, landingAyudaEntry(ayuda), ...rest]);
}

/** Solo botones públicos (sin landingHero ni landingAyuda). */
export function filterPublicBotones(arr) {
  return (arr || []).filter(
    (b) => b && !['landingHero', 'landingAyuda'].includes(String(b.type || ''))
  );
}
