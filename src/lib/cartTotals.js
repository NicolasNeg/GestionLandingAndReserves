export const CART_TAX_RATE = 0.089;

export function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)} MXN`;
}

export function calculateCartSubtotal(items = []) {
  return (items || []).reduce(
    (acc, item) => acc + Number(item?.price || 0) * Number(item?.qty || 0),
    0
  );
}

export function calculateCartTax(subtotalAfterDiscount, options = {}) {
  const rate = Number(options?.taxRate ?? CART_TAX_RATE);
  const base = Math.max(0, Number(subtotalAfterDiscount || 0));
  return Math.max(0, base * Math.max(0, rate));
}

export function calculateCartDiscount({ subtotal = 0, discountAmount = 0 } = {}) {
  return Math.max(0, Math.min(Number(subtotal || 0), Number(discountAmount || 0)));
}

export function calculateCartTotal({ items = [], discountAmount = 0, taxRate = CART_TAX_RATE } = {}) {
  const subtotal = calculateCartSubtotal(items);
  const finalDiscount = calculateCartDiscount({ subtotal, discountAmount });
  const taxableBase = Math.max(0, subtotal - finalDiscount);
  const taxAmount = calculateCartTax(taxableBase, { taxRate });
  const total = Math.max(0, taxableBase + taxAmount);
  return { subtotal, discountAmount: finalDiscount, taxAmount, total };
}

