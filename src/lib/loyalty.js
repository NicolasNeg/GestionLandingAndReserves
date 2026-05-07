export function getLoyaltyLevel(visitsCount = 0) {
  const n = Math.max(0, Number(visitsCount || 0));
  if (n >= 10) return 'Embajador';
  if (n >= 5) return 'VIP';
  if (n >= 2) return 'Frecuente';
  return 'Visitante';
}

export function getNextLoyaltyLevel(level) {
  if (level === 'Visitante') return { level: 'Frecuente', min: 2 };
  if (level === 'Frecuente') return { level: 'VIP', min: 5 };
  if (level === 'VIP') return { level: 'Embajador', min: 10 };
  return null;
}

export function calculateCustomerLoyalty({ tickets = [], reservas = [] } = {}) {
  const ticketCount = (tickets || []).length;
  const usedTickets = (tickets || []).filter(
    (t) => t?.estadoTicket === 'escaneado' || Boolean(t?.fechaEscaneo)
  ).length;
  const reservasCount = (reservas || []).length;
  const visits = Math.max(usedTickets, reservasCount);
  const level = getLoyaltyLevel(visits);
  const next = getNextLoyaltyLevel(level);
  const remaining = next ? Math.max(0, next.min - visits) : 0;
  return { ticketCount, usedTickets, reservasCount, visits, level, next, remaining };
}

export function formatLoyaltyMessage(loyalty) {
  if (!loyalty?.next) return 'Ya estás en el nivel más alto por ahora.';
  return `Te faltan ${loyalty.remaining} visita(s) para llegar a ${loyalty.next.level}.`;
}

