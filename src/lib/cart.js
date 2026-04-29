const CART_KEY = 'balneario_cart_v1';

function readRaw() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart:changed'));
}

export function listCartItems() {
  return readRaw();
}

export function addToCart(item) {
  const items = readRaw();
  const key = item.key || `${item.type}:${item.id || item.name}`;
  const idx = items.findIndex((x) => x.key === key);
  if (idx >= 0) {
    items[idx].qty = Math.max(1, (items[idx].qty || 1) + (item.qty || 1));
  } else {
    items.push({
      key,
      type: item.type || 'custom',
      id: item.id || null,
      name: item.name || 'Item',
      price: Number(item.price || 0),
      qty: Math.max(1, Number(item.qty || 1)),
      meta: item.meta || {}
    });
  }
  writeRaw(items);
  return items;
}

export function setCartQty(key, qty) {
  const items = readRaw();
  const next = Math.max(0, Number(qty || 0));
  const idx = items.findIndex((x) => x.key === key);
  if (idx < 0) return items;
  if (next === 0) items.splice(idx, 1);
  else items[idx].qty = next;
  writeRaw(items);
  return items;
}

export function removeFromCart(key) {
  const items = readRaw().filter((x) => x.key !== key);
  writeRaw(items);
  return items;
}

export function clearCart() {
  writeRaw([]);
}

export function cartCount() {
  return readRaw().reduce((acc, x) => acc + Number(x.qty || 0), 0);
}

export function cartSubtotal() {
  return readRaw().reduce((acc, x) => acc + Number(x.price || 0) * Number(x.qty || 0), 0);
}
