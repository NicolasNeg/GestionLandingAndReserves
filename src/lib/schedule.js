const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miercoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sabado' },
  { key: 'sunday', label: 'Domingo' }
];

export function scheduleDays() {
  return DAYS;
}

export function defaultScheduleConfig() {
  const days = {};
  DAYS.forEach((d) => {
    days[d.key] = { open: '09:00', close: '18:00', closed: false };
  });
  return {
    type: 'weekly_v1',
    days,
    specials: []
  };
}

export function parseScheduleConfig(raw) {
  const text = String(raw || '').trim();
  if (!text) return defaultScheduleConfig();
  try {
    const parsed = JSON.parse(text);
    if (parsed?.type !== 'weekly_v1' || !parsed?.days) return defaultScheduleConfig();
    const base = defaultScheduleConfig();
    DAYS.forEach((d) => {
      const src = parsed.days[d.key] || {};
      base.days[d.key] = {
        open: String(src.open || '09:00'),
        close: String(src.close || '18:00'),
        closed: Boolean(src.closed)
      };
    });
    base.specials = Array.isArray(parsed.specials)
      ? parsed.specials.map((s) => ({
          date: String(s.date || ''),
          label: String(s.label || ''),
          open: String(s.open || '09:00'),
          close: String(s.close || '18:00'),
          closed: Boolean(s.closed)
        }))
      : [];
    return base;
  } catch {
    return defaultScheduleConfig();
  }
}

export function serializeScheduleConfig(config) {
  return JSON.stringify(config);
}

export function renderScheduleText(config) {
  const lines = [];
  DAYS.forEach((d) => {
    const x = config.days[d.key];
    lines.push(`${d.label}: ${x.closed ? 'Cerrado' : `${x.open} - ${x.close}`}`);
  });
  if (config.specials.length) {
    lines.push('');
    lines.push('Fechas especiales:');
    config.specials.forEach((s) => {
      lines.push(`${s.date}${s.label ? ` (${s.label})` : ''}: ${s.closed ? 'Cerrado' : `${s.open} - ${s.close}`}`);
    });
  }
  return lines.join('\n');
}
