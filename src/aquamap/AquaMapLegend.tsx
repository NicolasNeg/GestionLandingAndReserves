import { ELEMENT_COLORS, ELEMENT_LABELS } from './elementCatalog';
import type { ElementType } from './types';

const LEGEND_TYPES: ElementType[] = [
  'pool',
  'slide',
  'service',
  'tree',
  'mesa',
  'parking',
  'palapa',
  'entrada',
  'area',
  'bar',
  'camino',
  'banos'
];

export function AquaMapLegend() {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 max-h-[min(42vh,320px)] max-w-[11rem] overflow-y-auto rounded-md border border-[#1f1f1f] bg-[#3c3c3c]/90 px-2.5 py-2 font-mono text-[9px] text-[#d4d4d4] shadow-[0_6px_20px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#a3a3a3]">Leyenda</p>
      <ul className="space-y-1">
        {LEGEND_TYPES.map((t) => (
          <li key={t} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm shadow"
              style={{ backgroundColor: ELEMENT_COLORS[t] }}
            />
            <span>{ELEMENT_LABELS[t]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
