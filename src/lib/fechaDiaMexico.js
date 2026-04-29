/** Fecha civil local MX para reservas por día (alinea Fase A con operación en México). */

export const TIMEZONE_MEXICO_CITY = 'America/Mexico_City';

/**
 * @param {Date} [d]
 * @returns {string} YYYY-MM-DD
 */
export function formatFechaDia(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_MEXICO_CITY,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * @param {string} value - input type=date
 * @returns {boolean}
 */
export function isValidFechaDia(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim())) return false;
  const t = Date.parse(`${value}T12:00:00`);
  return !Number.isNaN(t);
}
