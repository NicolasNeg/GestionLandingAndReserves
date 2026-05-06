export function parseDiscountRules(json) {
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json || '[]') : json;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function evaluateDiscountRules({ rules, cart, user, paymentMethod, now = new Date() }) {
  const msgs = [];
  const warnings = [];
  const subtotal = Number(cart?.subtotal || 0);
  const totalQty = Number(cart?.totalQty || 0);
  const today = now instanceof Date ? now.toISOString().slice(0, 10) : String(now).slice(0, 10);

  for (const rule of rules || []) {
    if (!rule || typeof rule !== 'object') continue;
    if (rule.type === 'minSubtotal') {
      const min = Number(rule.value || 0);
      if (subtotal < min) msgs.push(`Este cupon requiere una compra minima de $${min.toFixed(2)}.`);
      continue;
    }
    if (rule.type === 'minTotalQty') {
      const minQty = Math.max(1, Math.floor(Number(rule.value || 0)));
      if (totalQty < minQty) msgs.push(`Este cupon requiere minimo ${minQty} articulos.`);
      continue;
    }
    if (rule.type === 'dateRange') {
      const start = String(rule.start || '').slice(0, 10);
      const end = String(rule.end || '').slice(0, 10);
      if ((start && today < start) || (end && today > end)) msgs.push('Este cupon no esta vigente.');
      continue;
    }
    if (rule.type === 'oncePerUser') {
      // TODO: validar historial por usuario cuando exista endpoint/tabla formal de redencion.
      if (!user?.id && !user?.uid) warnings.push('Regla oncePerUser sin validacion backend por ahora.');
      continue;
    }
    if (rule.type === 'paymentMethod') {
      const required = String(rule.value || '');
      if (required && paymentMethod && required !== paymentMethod) {
        msgs.push(`Este cupon solo aplica para pago en ${required === 'online' ? 'linea' : 'taquilla'}.`);
      }
      continue;
    }
    warnings.push(`Regla desconocida ignorada: ${String(rule.type || 'unknown')}`);
  }

  return {
    ok: msgs.length === 0,
    reasons: msgs,
    warnings
  };
}

export function calculateDiscountAmount({ discount, cartSubtotal }) {
  const subtotal = Math.max(0, Number(cartSubtotal || 0));
  const value = Math.max(0, Number(discount?.descuento || 0));
  const tipo = String(discount?.tipo || 'monto');
  if (subtotal <= 0 || value <= 0) return 0;
  if (tipo === 'porcentaje') return Math.min(subtotal, (subtotal * value) / 100);
  return Math.min(subtotal, value);
}

export function applyDiscountToCart({ discount, cart, paymentMethod, user }) {
  const subtotal = Number(cart?.subtotal || 0);
  const totalQty = Number(cart?.totalQty || 0);
  if (!discount) {
    return { ok: false, reason: 'not_found', message: 'Codigo no encontrado.' };
  }
  if (!discount.activo) {
    return { ok: false, reason: 'inactive', message: 'Este cupon no esta activo.' };
  }
  if (Number(discount.usosRestantes || 0) <= 0) {
    return { ok: false, reason: 'agotado', message: 'Este cupon ya no tiene usos disponibles.' };
  }
  if (subtotal <= 0 || totalQty <= 0) {
    return { ok: false, reason: 'empty_cart', message: 'No se puede aplicar cupon con carrito vacio.' };
  }

  const rules = parseDiscountRules(discount.reglasJson || '[]');
  const evalRes = evaluateDiscountRules({
    rules,
    cart: { subtotal, totalQty },
    user,
    paymentMethod
  });
  if (!evalRes.ok) {
    return {
      ok: false,
      reason: 'rules_not_met',
      message: evalRes.reasons[0] || 'El cupon no cumple condiciones.',
      reasons: evalRes.reasons,
      warnings: evalRes.warnings
    };
  }

  const amount = calculateDiscountAmount({ discount, cartSubtotal: subtotal });
  const total = Math.max(0, subtotal - amount);
  return {
    ok: true,
    reason: 'applied',
    discountAmount: amount,
    subtotal,
    total,
    warnings: evalRes.warnings
  };
}
