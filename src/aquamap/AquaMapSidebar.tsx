import {
  Droplets,
  Settings,
  Trees,
  Upload,
  Waves,
  Wrench
} from 'lucide-react';
import { useRef } from 'react';
import type { ElementType, MapElement } from './types';

const ADD_BUTTONS: { type: ElementType; label: string; Icon: typeof Droplets }[] = [
  { type: 'pool', label: 'Alberca', Icon: Droplets },
  { type: 'slide', label: 'Tobogán', Icon: Waves },
  { type: 'service', label: 'Servicio', Icon: Wrench },
  { type: 'tree', label: 'Árbol', Icon: Trees }
];

const SWATCHES = ['#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#eab308', '#ef4444', '#64748b', '#f8fafc'];

type Props = {
  elements: MapElement[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selected: MapElement | null;
  onAdd: (type: ElementType) => void;
  onUpdateSelected: (
    patch: Partial<Pick<MapElement, 'name' | 'color' | 'width' | 'height' | 'imgSrc' | 'description'>>
  ) => void;
  onSaveClick: () => void;
  onPublishClick: () => void;
};

export function AquaMapSidebar({
  elements,
  selectedId,
  setSelectedId,
  selected,
  onAdd,
  onUpdateSelected,
  onSaveClick,
  onPublishClick
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <aside className="flex h-full w-[20%] flex-shrink-0 flex-col border-l border-slate-700/90 bg-slate-900 text-slate-100 shadow-2xl">
      <div className="flex items-start justify-between gap-2 border-b border-slate-700 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Panel de control
          </p>
          <h1 className="text-sm font-bold tracking-tight text-white">Administrador del mapa</h1>
        </div>
        <Settings className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.5} aria-hidden />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Anadir al mapa
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {ADD_BUTTONS.map(({ type, label, Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => onAdd(type)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-2 py-3 text-[11px] font-medium text-slate-200 transition hover:border-teal-500/50 hover:bg-slate-800"
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

            <label className="mb-3 flex flex-col gap-1 text-sm">
              <span className="text-[11px] text-slate-400">Elemento</span>
              <select
                className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-slate-100 outline-none focus:border-teal-500"
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value || null)}
              >
                {elements.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.name || el.type}
                  </option>
                ))}
              </select>
            </label>

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
                <span className="text-[11px] text-slate-400">Descripcion publica</span>
                <textarea
                  rows={3}
                  className="resize-y rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-teal-500"
                  value={selected.description}
                  onChange={(e) => onUpdateSelected({ description: e.target.value })}
                />
              </label>

              <div>
                <span className="text-[11px] text-slate-400">Color de acento</span>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      onClick={() => onUpdateSelected({ color: c })}
                      className={`h-8 w-full rounded-lg border-2 transition ${
                        selected.color.toLowerCase() === c.toLowerCase()
                          ? 'border-white ring-2 ring-teal-400/60'
                          : 'border-transparent hover:border-white/30'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-950"
                  value={selected.color}
                  onChange={(e) => onUpdateSelected({ color: e.target.value })}
                />
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">Ancho (px)</span>
                <input
                  type="range"
                  min={48}
                  max={280}
                  value={Math.round(selected.width)}
                  onChange={(e) => onUpdateSelected({ width: Number(e.target.value) })}
                  className="accent-teal-500"
                />
                <span className="text-right text-[10px] text-slate-500">{Math.round(selected.width)} px</span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">Alto (px)</span>
                <input
                  type="range"
                  min={40}
                  max={240}
                  value={Math.round(selected.height)}
                  onChange={(e) => onUpdateSelected({ height: Number(e.target.value) })}
                  className="accent-teal-500"
                />
                <span className="text-right text-[10px] text-slate-500">{Math.round(selected.height)} px</span>
              </label>

              <div className="rounded-xl border border-dashed border-slate-600 bg-slate-950/60 p-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const r = reader.result;
                      if (typeof r === 'string') onUpdateSelected({ imgSrc: r });
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg py-2 text-center text-[11px] text-slate-400 transition hover:bg-slate-800/80"
                >
                  <Upload className="h-6 w-6 text-teal-400" strokeWidth={1.5} />
                  <span>Insertar imagen (PNG con transparencia)</span>
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <div className="border-t border-slate-700 p-3">
        <button
          type="button"
          onClick={onSaveClick}
          className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-500"
        >
          Guardar cambios
        </button>
        <button
          type="button"
          onClick={onPublishClick}
          className="mt-2 w-full rounded-xl border border-slate-600 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          Publicar mapa
        </button>
      </div>
    </aside>
  );
}
