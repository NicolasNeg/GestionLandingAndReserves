const pathAttrs = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const ICON_PATHS = {
  home: `<path ${pathAttrs} d="m3 11 9-8 9 8"/><path ${pathAttrs} d="M5 10v10h14V10"/><path ${pathAttrs} d="M9 20v-6h6v6"/>`,
  login: `<path ${pathAttrs} d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path ${pathAttrs} d="M10 17l5-5-5-5"/><path ${pathAttrs} d="M15 12H3"/>`,
  user: `<path ${pathAttrs} d="M20 21a8 8 0 0 0-16 0"/><circle ${pathAttrs} cx="12" cy="7" r="4"/>`,
  users: `<path ${pathAttrs} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle ${pathAttrs} cx="9" cy="7" r="4"/><path ${pathAttrs} d="M22 21v-2a4 4 0 0 0-3-3.87"/><path ${pathAttrs} d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  settings: `<path ${pathAttrs} d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path ${pathAttrs} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.47.51.84 1 1h.09a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1 1Z"/>`,
  logout: `<path ${pathAttrs} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path ${pathAttrs} d="m16 17 5-5-5-5"/><path ${pathAttrs} d="M21 12H9"/>`,
  menu: `<path ${pathAttrs} d="M4 6h16M4 12h16M4 18h16"/>`,
  chevronDown: `<path ${pathAttrs} d="m6 9 6 6 6-6"/>`,
  collapse: `<path ${pathAttrs} d="M4 4h16v16H4z"/><path ${pathAttrs} d="M9 4v16"/><path ${pathAttrs} d="m15 9-3 3 3 3"/>`,
  expand: `<path ${pathAttrs} d="M4 4h16v16H4z"/><path ${pathAttrs} d="M9 4v16"/><path ${pathAttrs} d="m12 9 3 3-3 3"/>`,
  compass: `<circle ${pathAttrs} cx="12" cy="12" r="10"/><path ${pathAttrs} d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12Z"/>`,
  info: `<circle ${pathAttrs} cx="12" cy="12" r="10"/><path ${pathAttrs} d="M12 16v-4"/><path ${pathAttrs} d="M12 8h.01"/>`,
  sparkles: `<path ${pathAttrs} d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path ${pathAttrs} d="M5 3v4"/><path ${pathAttrs} d="M3 5h4"/><path ${pathAttrs} d="M19 17v4"/><path ${pathAttrs} d="M17 19h4"/>`,
  clock: `<circle ${pathAttrs} cx="12" cy="12" r="10"/><path ${pathAttrs} d="M12 6v6l4 2"/>`,
  map: `<path ${pathAttrs} d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path ${pathAttrs} d="M9 3v15"/><path ${pathAttrs} d="M15 6v15"/>`,
  image: `<rect ${pathAttrs} x="3" y="3" width="18" height="18" rx="2"/><circle ${pathAttrs} cx="9" cy="9" r="2"/><path ${pathAttrs} d="m21 15-5-5L5 21"/>`,
  package: `<path ${pathAttrs} d="m21 8-9-5-9 5 9 5 9-5Z"/><path ${pathAttrs} d="M3 8v8l9 5 9-5V8"/><path ${pathAttrs} d="M12 13v8"/>`,
  phone: `<path ${pathAttrs} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.91.32 1.79.59 2.64a2 2 0 0 1-.45 2.11L8 9.72a16 16 0 0 0 6 6l1.25-1.25a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.64.59A2 2 0 0 1 22 16.92Z"/>`,
  ticket: `<path ${pathAttrs} d="M2 9a3 3 0 1 0 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 1 0 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v3Z"/><path ${pathAttrs} d="M13 5v2M13 17v2M13 11v2"/>`,
  scan: `<path ${pathAttrs} d="M3 7V5a2 2 0 0 1 2-2h2"/><path ${pathAttrs} d="M17 3h2a2 2 0 0 1 2 2v2"/><path ${pathAttrs} d="M21 17v2a2 2 0 0 1-2 2h-2"/><path ${pathAttrs} d="M7 21H5a2 2 0 0 1-2-2v-2"/><path ${pathAttrs} d="M7 12h10"/>`,
  briefcase: `<path ${pathAttrs} d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><rect ${pathAttrs} x="3" y="6" width="18" height="14" rx="2"/><path ${pathAttrs} d="M3 12h18"/><path ${pathAttrs} d="M12 12v2"/>`,
  dashboard: `<rect ${pathAttrs} x="3" y="3" width="7" height="9" rx="1"/><rect ${pathAttrs} x="14" y="3" width="7" height="5" rx="1"/><rect ${pathAttrs} x="14" y="12" width="7" height="9" rx="1"/><rect ${pathAttrs} x="3" y="16" width="7" height="5" rx="1"/>`,
  code: `<path ${pathAttrs} d="m16 18 6-6-6-6"/><path ${pathAttrs} d="m8 6-6 6 6 6"/><path ${pathAttrs} d="m14 4-4 16"/>`,
  palette: `<path ${pathAttrs} d="M12 22a10 10 0 1 1 10-10c0 1.7-1 3-2.7 3h-1.1c-.9 0-1.6.7-1.6 1.6 0 .4.2.8.4 1.1.3.4.5.8.5 1.3 0 1.7-2.2 3-5.5 3Z"/><circle ${pathAttrs} cx="6.5" cy="11.5" r=".5"/><circle ${pathAttrs} cx="9.5" cy="7.5" r=".5"/><circle ${pathAttrs} cx="14.5" cy="7.5" r=".5"/><circle ${pathAttrs} cx="17.5" cy="11.5" r=".5"/>`,
  shield: `<path ${pathAttrs} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path ${pathAttrs} d="m9 12 2 2 4-4"/>`,
  key: `<circle ${pathAttrs} cx="7.5" cy="15.5" r="4.5"/><path ${pathAttrs} d="m11 12 9-9"/><path ${pathAttrs} d="m15 4 3 3"/><path ${pathAttrs} d="m17 2 3 3"/>`,
  chart: `<path ${pathAttrs} d="M3 3v18h18"/><path ${pathAttrs} d="m7 14 4-4 3 3 5-6"/>`
};

export function icon(name, className = 'h-5 w-5') {
  const paths = ICON_PATHS[name] || ICON_PATHS.info;
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" aria-hidden="true">${paths}</svg>`;
}
