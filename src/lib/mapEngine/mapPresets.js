/** Plantillas rápidas para el editor de mapa (se agregan al documento actual). */

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const MAP_QUICK_PRESETS = {
  GLOBAL_KIT: 'global-kit',
  MESAS_GRID_4: 'mesas-grid-4',
  MESAS_ROW: 'mesas-row',
  MESAS_VIP: 'mesas-vip',
  PARKING_ROW: 'parking-row',
  PARKING_BLOCK: 'parking-block',
  PARKING_YARD: 'parking-yard'
};

/**
 * @param {string} presetId
 * @param {{ width: number; height: number }} doc
 * @returns {Array<Record<string, unknown>>}
 */
export function buildPresetItemDefs(presetId, doc) {
  const W = Math.max(320, Number(doc.width) || 1000);
  const H = Math.max(220, Number(doc.height) || 620);

  switch (presetId) {
    case MAP_QUICK_PRESETS.GLOBAL_KIT:
      return [
        {
          id: uid('alberca'),
          kind: 'alberca',
          x: Math.round(W * 0.3),
          y: Math.round(H * 0.2),
          width: Math.min(Math.round(W * 0.38), 420),
          height: Math.min(Math.round(H * 0.36), 280),
          label: 'Alberca',
          metadata: { description: 'Zona de alberca', publicName: 'Alberca principal' }
        },
        {
          id: uid('palapa'),
          kind: 'palapa',
          x: Math.round(W * 0.06),
          y: Math.round(H * 0.1),
          width: 130,
          height: 95,
          label: 'Palapa norte',
          metadata: { description: 'Sombra familiar' }
        },
        {
          id: uid('palapa2'),
          kind: 'palapa',
          x: Math.round(W * 0.72),
          y: Math.round(H * 0.12),
          width: 130,
          height: 95,
          label: 'Palapa sur',
          metadata: { description: 'Sombra / grupos' }
        },
        {
          id: uid('servicio'),
          kind: 'servicio',
          x: Math.round(W * 0.08),
          y: Math.round(H * 0.72),
          width: Math.min(220, Math.round(W * 0.26)),
          height: 78,
          label: 'Servicios',
          metadata: { category: 'general', description: 'Baños, regaderas, lockers', icon: 'info' }
        },
        {
          id: uid('entrada'),
          kind: 'entrada',
          x: Math.round(W * 0.42),
          y: Math.round(H * 0.82),
          width: Math.min(200, Math.round(W * 0.22)),
          height: 64,
          label: 'Entrada principal',
          metadata: { description: 'Acceso visitantes' }
        }
      ];

    case MAP_QUICK_PRESETS.MESAS_GRID_4: {
      const cols = 4;
      const rows = 4;
      const gap = 14;
      const cell = Math.min(78, Math.floor((W - 120 - gap * (cols - 1)) / cols));
      const startX = 56;
      const startY = Math.min(100, Math.round(H * 0.14));
      const out = [];
      let n = 1;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          out.push({
            id: uid(`mesa-${n}`),
            kind: 'mesa',
            x: startX + c * (cell + gap),
            y: startY + r * (cell + gap),
            width: cell,
            height: cell,
            label: `Mesa ${n}`,
            metadata: { publicName: `Mesa ${n}`, capacidad: 4, reservable: true }
          });
          n += 1;
        }
      }
      return out;
    }

    case MAP_QUICK_PRESETS.MESAS_ROW: {
      const count = 8;
      const gap = 16;
      const cellW = Math.min(80, Math.floor((W - 100 - gap * (count - 1)) / count));
      const cellH = Math.min(76, cellW);
      const startY = Math.min(120, Math.round(H * 0.22));
      return Array.from({ length: count }, (_, i) => ({
        id: uid(`mesa-r-${i + 1}`),
        kind: 'mesa',
        x: 48 + i * (cellW + gap),
        y: startY,
        width: cellW,
        height: cellH,
        label: `Mesa ${i + 1}`,
        metadata: { publicName: `Mesa fila ${i + 1}`, capacidad: 4 }
      }));
    }

    case MAP_QUICK_PRESETS.MESAS_VIP:
      return [
        {
          id: uid('vip-zona'),
          kind: 'area',
          x: Math.round(W * 0.12),
          y: Math.round(H * 0.12),
          width: Math.min(Math.round(W * 0.76), W - 96),
          height: Math.min(Math.round(H * 0.62), H - 120),
          label: 'Zona VIP',
          metadata: { description: 'Área preferente', publicName: 'Zona VIP' }
        },
        {
          id: uid('vip-1'),
          kind: 'mesa',
          x: Math.round(W * 0.22),
          y: Math.round(H * 0.28),
          width: 84,
          height: 84,
          label: 'VIP 1',
          metadata: { publicName: 'Mesa VIP 1', capacidad: 6, vip: true, precio: 0 }
        },
        {
          id: uid('vip-2'),
          kind: 'mesa',
          x: Math.round(W * 0.42),
          y: Math.round(H * 0.28),
          width: 84,
          height: 84,
          label: 'VIP 2',
          metadata: { publicName: 'Mesa VIP 2', capacidad: 6, vip: true, precio: 0 }
        },
        {
          id: uid('vip-3'),
          kind: 'mesa',
          x: Math.round(W * 0.62),
          y: Math.round(H * 0.28),
          width: 84,
          height: 84,
          label: 'VIP 3',
          metadata: { publicName: 'Mesa VIP 3', capacidad: 6, vip: true, precio: 0 }
        }
      ];

    case MAP_QUICK_PRESETS.PARKING_ROW: {
      const count = 10;
      const gap = 12;
      const spotW = Math.min(52, Math.floor((W - 80 - gap * (count - 1)) / count));
      const spotH = Math.min(102, Math.round(H * 0.22));
      return Array.from({ length: count }, (_, i) => ({
        id: uid(`p-${i + 1}`),
        kind: 'estacionamiento',
        x: 40 + i * (spotW + gap),
        y: Math.round(H * 0.35),
        width: spotW,
        height: spotH,
        label: `P${i + 1}`,
        metadata: { spotCode: `P${String(i + 1).padStart(2, '0')}`, zone: 'General', baseStatus: 'libre' }
      }));
    }

    case MAP_QUICK_PRESETS.PARKING_BLOCK: {
      const cols = 5;
      const rows = 3;
      const gap = 10;
      const spotW = Math.min(48, Math.floor((W - 80 - gap * (cols - 1)) / cols));
      const spotH = Math.min(95, Math.round(H * 0.18));
      const startX = 44;
      const startY = Math.round(H * 0.28);
      const out = [];
      let n = 1;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          out.push({
            id: uid(`pb-${n}`),
            kind: 'estacionamiento',
            x: startX + c * (spotW + gap),
            y: startY + r * (spotH + gap),
            width: spotW,
            height: spotH,
            label: `B${n}`,
            metadata: {
              spotCode: `B${String(n).padStart(2, '0')}`,
              zone: 'Bloque',
              baseStatus: 'libre'
            }
          });
          n += 1;
        }
      }
      return out;
    }

    case MAP_QUICK_PRESETS.PARKING_YARD:
      return [
        {
          id: uid('patio'),
          kind: 'area',
          x: Math.round(W * 0.06),
          y: Math.round(H * 0.12),
          width: Math.round(W * 0.42),
          height: Math.round(H * 0.72),
          label: 'Patio',
          metadata: { description: 'Circulación y estacionamiento temporal', publicName: 'Patio' }
        },
        {
          id: uid('taller'),
          kind: 'area',
          x: Math.round(W * 0.52),
          y: Math.round(H * 0.12),
          width: Math.round(W * 0.42),
          height: Math.round(H * 0.72),
          label: 'Taller',
          metadata: { description: 'Zona de mantenimiento', publicName: 'Taller' }
        },
        {
          id: uid('bloq1'),
          kind: 'limitacion',
          x: Math.round(W * 0.04),
          y: Math.round(H * 0.02),
          width: Math.round(W * 0.92),
          height: 36,
          label: 'No estacionar',
          metadata: { description: 'Pasillo de acceso' }
        }
      ];

    default:
      return [];
  }
}
