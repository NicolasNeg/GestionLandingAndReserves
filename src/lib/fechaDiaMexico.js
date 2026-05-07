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

/**
 * Suma días a una fecha civil YYYY-MM-DD (zona operativa MX no usa DST; aritmética UTC segura).
 * @param {string} ymd
 * @param {number} deltaDays
 * @returns {string} YYYY-MM-DD
 */
export function addCalendarDaysMexico(ymd, deltaDays) {
  const s = String(ymd || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return formatFechaDia();
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d));
  dt.setUTCDate(dt.getUTCDate() + Number(deltaDays) || 0);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
