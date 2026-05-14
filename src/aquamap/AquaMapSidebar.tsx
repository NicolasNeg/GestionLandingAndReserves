import { Droplets, Trees, Waves, Wrench } from 'lucide-react';
import type { ElementType, MapElement } from './types';

const ADD_BUTTONS: { type: ElementType; label: string; Icon: typeof Droplets }[] = [
  { type: 'pool', label: 'Alberca', Icon: Droplets },
  { type: 'slide', label: 'Tobogán', Icon: Waves },
  { type: 'service', label: 'Servicio', Icon: Wrench },
  { type: 'tree', label: 'Árbol', Icon: Trees }
];

type Props = {
  selected: MapElement | null;
  onAdd: (type: ElementType) => void;
  onUpdateSelected: (patch: Partial<Pick<MapElement, 'name' | 'color' | 'width' | 'height'>>) => void;
};

export function AquaMapSidebar({ selected, onAdd, onUpdateSelected }: Props) {
  return (
    <aside className="flex h-full w-[20%] flex-shrink-0 flex-col border-l border-slate-700/80 bg-slate-900 text-slate-100 shadow-xl">
      <div className="border-b border-slate-700 px-4 py-3">
        <h1 className="text-sm font-bold tracking-tight text-white">AquaMap Editor Pro</h1>
        <p className="mt-0.5 text-[11px] text-slate-400">Mapa 2.5D · localStorage</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Añadir elemento</h2>
          <div className="grid grid-cols-2 gap-2">
            {ADD_BUTTONS.map(({ type, label, Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => onAdd(type)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2 py-3 text-[11px] font-medium text-slate-200 transition hover:border-teal-500/60 hover:bg-slate-800"
              >
                <Icon className="h-5 w-5 text-teal-400" strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>
        </section>

        {selected ? (
          <section className="mt-8 border-t border-slate-700 pt-6">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Propiedades</h2>
            <div className="flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">Nombre</span>
                <input
                  className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-slate-100 outline-none focus:border-teal-500"
                  value={selected.name}
                  onChange={(e) => onUpdateSelected({ name: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">Color</span>
                <input
                  type="color"
                  className="h-9 w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-950"
                  value={selected.color}
                  onChange={(e) => onUpdateSelected({ color: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">Ancho</span>
                <input
                  type="number"
                  min={16}
                  className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-slate-100 outline-none focus:border-teal-500"
                  value={Math.round(selected.width)}
                  onChange={(e) => onUpdateSelected({ width: Number(e.target.value) || 16 })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">Alto</span>
                <input
                  type="number"
                  min={16}
                  className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-slate-100 outline-none focus:border-teal-500"
                  value={Math.round(selected.height)}
                  onChange={(e) => onUpdateSelected({ height: Number(e.target.value) || 16 })}
                />
              </label>
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
