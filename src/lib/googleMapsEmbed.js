/**
 * Convierte enlace o dirección del panel en URL de embed / apertura de Google Maps.
 * Prioridad: coordenadas en URL → dirección configurada → parámetro q → texto del enlace.
 */

function clampZoom(z) {
  const n = Number(z);
  if (!Number.isFinite(n)) return '17';
  return String(Math.min(20, Math.max(10, Math.round(n))));
}

function isShortMapsLink(raw) {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(raw);
}

/**
 * @param {string} rawUrl
 * @returns {{ embed: string, open: string } | null}
 */
function parseMapsUrl(rawUrl) {
  const raw = String(rawUrl || '').trim();
  if (!raw) return null;

  if (raw.includes('/maps/embed')) {
    return { embed: raw, open: raw };
  }

  try {
    const parsed = new URL(raw);
    const coordMatch = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?)z)?/i);
    if (coordMatch) {
      const [, lat, lng, zoom] = coordMatch;
      const z = clampZoom(zoom);
      const q = `${lat},${lng}`;
      return {
        embed: `https://www.google.com/maps?q=${q}&z=${z}&output=embed`,
        open: `https://www.google.com/maps?q=${q}&z=${z}`
      };
    }

    const queryParam = parsed.searchParams.get('q') || parsed.searchParams.get('query');
    if (queryParam) {
      const z = clampZoom(parsed.searchParams.get('z') || '17');
      return {
        embed: `https://www.google.com/maps?q=${encodeURIComponent(queryParam)}&z=${z}&output=embed`,
        open: `https://www.google.com/maps?q=${encodeURIComponent(queryParam)}&z=${z}`
      };
    }

    const placeMatch = decodeURIComponent(parsed.pathname).match(/\/place\/([^/]+)/);
    if (placeMatch?.[1]) {
      const place = placeMatch[1].replace(/\+/g, ' ');
      return {
        embed: `https://www.google.com/maps?q=${encodeURIComponent(place)}&z=17&output=embed`,
        open: `https://www.google.com/maps?q=${encodeURIComponent(place)}&z=17`
      };
    }

    if (isShortMapsLink(raw)) {
      return null;
    }
  } catch {
    if (!/^https?:\/\//i.test(raw)) {
      return null;
    }
  }

  return null;
}

/**
 * @param {{ url?: string, address?: string }} opts
 * @returns {string}
 */
export function googleMapsEmbedUrl(opts = {}) {
  const address = String(opts.address ?? opts.googleMapsAddress ?? '').trim();
  const url = String(opts.url ?? opts.googleMapsUrl ?? '').trim();

  const fromUrl = parseMapsUrl(url);
  if (fromUrl?.embed) return fromUrl.embed;

  if (address) {
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=17&output=embed`;
  }

  if (url && !isShortMapsLink(url)) {
    if (/^https?:\/\//i.test(url)) {
      return `https://www.google.com/maps?q=${encodeURIComponent(url)}&z=17&output=embed`;
    }
    return `https://www.google.com/maps?q=${encodeURIComponent(url)}&z=17&output=embed`;
  }

  return '';
}

/**
 * @param {{ url?: string, address?: string }} opts
 * @returns {string}
 */
export function googleMapsOpenUrl(opts = {}) {
  const address = String(opts.address ?? opts.googleMapsAddress ?? '').trim();
  const url = String(opts.url ?? opts.googleMapsUrl ?? '').trim();

  if (url && /^https?:\/\//i.test(url) && !isShortMapsLink(url)) {
    const fromUrl = parseMapsUrl(url);
    return fromUrl?.open || url;
  }

  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  if (url && /^https?:\/\//i.test(url)) {
    return url;
  }

  if (url) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(url)}`;
  }

  return '';
}
