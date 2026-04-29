export function getSelectionBounds(items) {
  const selected = (items || []).filter(Boolean);
  if (!selected.length) return null;
  const minX = Math.min(...selected.map((item) => Number(item.x || 0)));
  const minY = Math.min(...selected.map((item) => Number(item.y || 0)));
  const maxX = Math.max(...selected.map((item) => Number(item.x || 0) + Number(item.width || 0)));
  const maxY = Math.max(...selected.map((item) => Number(item.y || 0) + Number(item.height || 0)));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function alignItems(items, mode) {
  const bounds = getSelectionBounds(items);
  if (!bounds) return;
  items.forEach((item) => {
    if (!item || item.locked) return;
    if (mode === 'left') item.x = bounds.x;
    if (mode === 'center') item.x = Math.round(bounds.x + bounds.width / 2 - Number(item.width || 0) / 2);
    if (mode === 'right') item.x = Math.round(bounds.x + bounds.width - Number(item.width || 0));
    if (mode === 'top') item.y = bounds.y;
    if (mode === 'middle') item.y = Math.round(bounds.y + bounds.height / 2 - Number(item.height || 0) / 2);
    if (mode === 'bottom') item.y = Math.round(bounds.y + bounds.height - Number(item.height || 0));
  });
}

export function distributeItems(items, axis) {
  const unlocked = (items || []).filter((item) => item && !item.locked);
  if (unlocked.length < 3) return;
  const isX = axis === 'horizontal';
  const sorted = [...unlocked].sort((a, b) => Number(a[isX ? 'x' : 'y'] || 0) - Number(b[isX ? 'x' : 'y'] || 0));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const start = Number(first[isX ? 'x' : 'y'] || 0);
  const end = Number(last[isX ? 'x' : 'y'] || 0);
  const step = (end - start) / (sorted.length - 1);
  sorted.forEach((item, index) => {
    item[isX ? 'x' : 'y'] = Math.round(start + step * index);
  });
}

