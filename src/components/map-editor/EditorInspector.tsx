import * as React from 'react';
import { useMapEditorStore } from '../../store/map-editor-store';

function defaultVisibilityByKind(kindValue: string, typeValue = '') {
  const k = String(kindValue || '').toLowerCase();
  const t = String(typeValue || '').toLowerCase();
  const isMesa = k === 'mesa' || k === 'table' || t === 'table';
  const isParking = k === 'estacionamiento' || k === 'parkingspot' || t === 'parkingspot';
  const isPool = k === 'alberca' || k === 'pool' || t === 'pool';
  return {
    global: true,
    mesas: isMesa,
    estacionamiento: isParking,
    albercas: isPool
  };
}

function readVisibilityByView(item: any) {
  const fallback = defaultVisibilityByKind(item?.kind, item?.type);
  const raw =
    item?.metadata && typeof item.metadata === 'object' && item.metadata.visibilityByView
      ? item.metadata.visibilityByView
      : null;
  return {
    global: raw && Object.prototype.hasOwnProperty.call(raw, 'global') ? raw.global !== false : fallback.global,
    mesas: raw && Object.prototype.hasOwnProperty.call(raw, 'mesas') ? raw.mesas !== false : fallback.mesas,
    estacionamiento:
      raw && Object.prototype.hasOwnProperty.call(raw, 'estacionamiento')
        ? raw.estacionamiento !== false
        : fallback.estacionamiento,
    albercas:
      raw && Object.prototype.hasOwnProperty.call(raw, 'albercas') ? raw.albercas !== false : fallback.albercas
  };
}

export function EditorInspector() {
  const [tab, setTab] = React.useState<'props' | 'vis' | 'layers'>('props');
  const doc = useMapEditorStore((s) => s.doc);
  const selectedIds = useMapEditorStore((s) => s.selectedIds);
  const updateSelected = useMapEditorStore((s) => s.updateSelected);
  const selectItemById = useMapEditorStore((s) => s.selectItemById);
  const item = doc.items.find((it: any) => it.id === selectedIds[0]);

  const itemsSorted = [...(doc.items || [])].sort(
    (a: any, b: any) => (Number(b.zIndex) || 0) - (Number(a.zIndex) || 0)
  );

  const multi = selectedIds.length > 1;

  const applyVisibilityPatch = (key: 'global' | 'mesas' | 'estacionamiento' | 'albercas', checked: boolean) => {
    if (!item) return;
    const vis = readVisibilityByView(item);
    vis[key] = checked;
    updateSelected({
      metadata: { ...(item.metadata || {}), visibilityByView: vis }
    });
  };

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-cyan-100/80 bg-white/95">
      <div className="border-b border-cyan-50 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-teal-800">Inspector</p>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-slate-100 bg-slate-50 p-1">
          {(
            [
              ['props', 'Propiedades'],
              ['vis', 'Visibilidad'],
              ['layers', 'Capas']
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-md px-2 py-1.5 text-[10px] font-black ${
                tab === id ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-sm">
        {tab === 'layers' ? (
          <ul className="space-y-1">
            {itemsSorted.map((it: any) => (
              <li key={it.id}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg border px-2 py-2 text-left text-xs font-bold ${
                    selectedIds.includes(it.id)
                      ? 'border-teal-300 bg-teal-50 text-teal-950'
                      : 'border-slate-100 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                  onClick={() => selectItemById(it.id, false)}
                >
                  <span className="truncate">{it.label || it.id}</span>
                  <span className="text-[10px] text-slate-400">{it.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : tab === 'vis' ? (
          !item || multi ? (
            <p className="text-xs text-slate-600">
              {multi
                ? 'Selecciona una sola pieza para editar visibilidad por vista.'
                : 'Selecciona un objeto en el lienzo.'}
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-600">
                Controla en qué vistas del sitio aparece esta pieza (landing global, reservar mesas, parking, albercas).
              </p>
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                {(
                  [
                    ['global', 'Vista global (/home)'],
                    ['mesas', 'Reserva de mesas'],
                    ['estacionamiento', 'Estacionamiento'],
                    ['albercas', 'Albercas / acuáticas']
                  ] as const
                ).map(([key, label]) => {
                  const vis = readVisibilityByView(item);
                  return (
                    <label key={key} className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800">
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={!!vis[key]}
                        onChange={(e) => applyVisibilityPatch(key, e.target.checked)}
                      />
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500">
                Los valores por defecto dependen del tipo de pieza; puedes forzar visibilidad activando el check.
              </p>
            </div>
          )
        ) : !item ? (
          <p className="text-xs text-slate-500">Selecciona un objeto en el lienzo.</p>
        ) : (
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase text-slate-500">
              Nombre
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm font-semibold"
                value={String(item.label || '')}
                onChange={(e) => updateSelected({ label: e.target.value })}
              />
            </label>
            <label className="block text-[10px] font-black uppercase text-slate-500">
              Descripcion
              <textarea
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                value={String(item.metadata?.description || item.notes || '')}
                onChange={(e) =>
                  updateSelected({ metadata: { ...(item.metadata || {}), description: e.target.value } })
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-black uppercase text-slate-500">
                Relleno
                <input
                  type="color"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200"
                  value={toHex(item.fill || '#99f6e4')}
                  onChange={(e) => updateSelected({ fill: e.target.value })}
                />
              </label>
              <label className="text-[10px] font-black uppercase text-slate-500">
                Trazo
                <input
                  type="color"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200"
                  value={toHex(item.stroke || '#0f766e')}
                  onChange={(e) => updateSelected({ stroke: e.target.value })}
                />
              </label>
            </div>
            <label className="block text-[10px] font-black uppercase text-slate-500">
              Opacidad
              <input
                type="number"
                step={0.05}
                min={0.05}
                max={1}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2"
                value={Number(item.opacity ?? 1)}
                onChange={(e) => updateSelected({ opacity: Number(e.target.value) })}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-black text-slate-800 hover:bg-slate-50"
                onClick={() => useMapEditorStore.getState().duplicateSelected()}
              >
                Duplicar
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-rose-200 bg-rose-50 py-2 text-xs font-black text-rose-800 hover:bg-rose-100"
                onClick={() => useMapEditorStore.getState().deleteSelected()}
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function toHex(c: string) {
  if (/^#/.test(c)) return c.slice(0, 7);
  const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return '#0f766e';
  const r = (+m[1]).toString(16).padStart(2, '0');
  const g = (+m[2]).toString(16).padStart(2, '0');
  const b = (+m[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}
