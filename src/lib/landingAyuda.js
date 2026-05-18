/**
 * Bloque landingAyuda embebido en botones_json (sin migración SQL).
 */

export const DEFAULT_LANDING_AYUDA = {
  intro:
    '¿Tienes dudas sobre tu visita, tickets o estacionamiento? Aquí encontrarás respuestas rápidas y las formas de contactarnos.',
  faq: [
    {
      q: '¿Cómo compro tickets?',
      a: 'Puedes comprarlos en la sección de tickets de esta página, agregarlos al carrito y pagar en línea. También puedes adquirirlos en taquilla el día de tu visita, sujeto a disponibilidad.'
    },
    {
      q: '¿Puedo usar mi ticket otro día?',
      a: 'Los tickets son válidos para la fecha indicada al comprar, salvo que el tipo de entrada indique lo contrario. Si necesitas reprogramar, escríbenos por WhatsApp con tu folio.'
    },
    {
      q: '¿Hay estacionamiento?',
      a: 'Sí. Consulta la sección Estacionamiento para ver disponibilidad en tiempo real. La capacidad puede variar en temporada alta.'
    },
    {
      q: '¿Cuál es el horario del parque?',
      a: 'Revisa la sección Horario y estado en esta página. Los horarios especiales o feriados se publican ahí cuando aplican.'
    },
    {
      q: '¿Puedo llevar alimentos y bebidas?',
      a: 'Consulta en taquilla las políticas vigentes. En general se permiten snacks personales; algunas zonas pueden tener restricciones.'
    },
    {
      q: '¿Cómo los contacto?',
      a: 'Usa los botones de WhatsApp o correo en esta sección. Te responderemos lo antes posible en horario de operación.'
    }
  ]
};

function cleanFaqItem(item) {
  const q = String(item?.q ?? '').trim();
  const a = String(item?.a ?? '').trim();
  if (!q || !a) return null;
  return { q, a };
}

export function normalizeLandingAyuda(raw) {
  const base = { ...DEFAULT_LANDING_AYUDA };
  if (!raw || typeof raw !== 'object') return base;
  const intro = String(raw.intro ?? base.intro).trim() || base.intro;
  const faqRaw = Array.isArray(raw.faq) ? raw.faq : base.faq;
  const faq = faqRaw.map(cleanFaqItem).filter(Boolean);
  return {
    intro,
    faq: faq.length ? faq : base.faq
  };
}

export function ayudaFromBotonesArray(arr) {
  const entry = (arr || []).find((x) => x && String(x.type || '') === 'landingAyuda');
  if (!entry) return { ...DEFAULT_LANDING_AYUDA };
  return normalizeLandingAyuda(entry);
}

export function landingAyudaEntry(ayuda) {
  return {
    type: 'landingAyuda',
    ...normalizeLandingAyuda(ayuda)
  };
}
