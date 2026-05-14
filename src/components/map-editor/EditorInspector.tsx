import * as React from 'react';
import { clamp } from '../../lib/mapEngine/mapSchema.js';
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
  const setPublicMapUi = useMapEditorStore((s) => s.setPublicMapUi);
  const item = doc.items.find((it: any) => it.id === selectedIds[0]);

  const itemsSorted = [...(doc.items || [])].sort(
    (a: any, b: any) => (Number(b.zIndex) || 0) - (Number(a.zIndex) || 0)
  );

  const multi = selectedIds.length > 1;
  const isoOn = Boolean(doc.publicMapUi?.isometric);

  const supportsLayoutFields =
    item && item.type !== 'polygon' && item.type !== 'line';

  const applyLayoutPatch = (patch: Record<string, unknown>) => {
    if (!item) return;
    const ix = Number(item.x || 0);
    const iy = Number(item.y || 0);
    const iw = Number(item.width || 0);
    const ih = Number(item.height || 0);
    const next: Record<string, unknown> = {};
    if ('x' in patch) next.x = clamp(Math.round(Number(patch.x)), 0, Math.max(0, doc.width - iw));
    if ('y' in patch) next.y = clamp(Math.round(Number(patch.y)), 0, Math.max(0, doc.height - ih));
    if ('width' in patch)
      next.width = clamp(Math.round(Number(patch.width)), 8, Math.max(8, doc.width - ix));
    if ('height' in patch)
      next.height = clamp(Math.round(Number(patch.height)), 8, Math.max(8, doc.height - iy));
    if ('rotation' in patch) next.rotation = clamp(Math.round(Number(patch.rotation)), -180, 180);
    if (Object.keys(next).length) updateSelected(next);
  };

  const applyVisibilityPatch = (key: 'global' | 'mesas' | 'estacionamiento' | 'albercas', checked: boolean) => {
    if (!item) return;
    const vis = readVisibilityByView(item);
    vis[key] = checked;
    updateSelected({
      metadata: { ...(item.metadata || {}), visibilityByView: vis }
    });
  };

  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-l border-[color:var(--af-line)] bg-[color:var(--af-panel)]">
      <div className="border-b border-[color:var(--af-line)] px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-800/80">Inspector</p>
        <div className="mt-2 grid grid-cols-3 gap-0.5 rounded-lg border border-[color:var(--af-line)] bg-[color:var(--af-canvas-void)] p-0.5">
          {(
            [
              ['props', 'Props'],
              ['vis', 'Vistas'],
              ['layers', 'Capas']
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                tab === id
                  ? 'bg-[color:var(--af-accent-soft)] text-[color:var(--af-accent)] ring-1 ring-[color:var(--af-line-strong)]'
                  : 'text-[color:var(--af-muted)] hover:bg-stone-100 hover:text-[color:var(--af-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-[12px] text-[color:var(--af-text)]">
        {tab === 'layers' ? (
          <ul className="space-y-1">
            {itemsSorted.map((it: any) => (
              <li key={it.id}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium ${
                    selectedIds.includes(it.id)
                      ? 'border-[color:var(--af-line-strong)] bg-[color:var(--af-accent-soft)] text-[color:var(--af-accent)]'
                      : 'border-transparent text-[color:var(--af-muted)] hover:border-[color:var(--af-line)] hover:bg-[color:var(--af-chrome)] hover:text-[color:var(--af-text)]'
                  }`}
                  onClick={() => selectItemById(it.id, false)}
                >
                  <span className="truncate">{it.label || it.id}</span>
                  <span className="text-[10px] text-[color:var(--af-muted)]">{it.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : tab === 'vis' ? (
          !item || multi ? (
            <p className="text-[11px] leading-snug text-[color:var(--af-muted)]">
              {multi
                ? 'Selecciona una sola pieza para editar visibilidad por vista.'
                : 'Selecciona un objeto en el lienzo.'}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] leading-snug text-[color:var(--af-muted)]">
                Dónde se muestra esta pieza en el sitio.
              </p>
              <div className="space-y-1 rounded-md border border-[color:var(--af-line)] bg-[color:var(--af-canvas-void)] p-2">
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
                    <label key={key} className="flex items-center justify-between gap-2 text-[11px] font-medium text-[color:var(--af-text)]">
                      <span className="leading-tight">{label}</span>
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-[color:var(--af-line-strong)] bg-[color:var(--af-chrome)]"
                        checked={!!vis[key]}
                        onChange={(e) => applyVisibilityPatch(key, e.target.checked)}
                      />
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-[color:var(--af-muted)]">
                Los valores por defecto dependen del tipo de pieza; puedes forzar visibilidad activando el check.
              </p>
            </div>
          )
        ) : !item ? (
          <div className="space-y-3">
            <div className="space-y-2 rounded-md border border-[color:var(--af-line)] bg-[color:var(--af-canvas-void)] p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-800/80">Mapa público</p>
              <label className="flex cursor-pointer items-start gap-2 text-[11px] font-medium text-[color:var(--af-text)]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[color:var(--af-line-strong)]"
                  checked={isoOn}
                  onChange={(e) => setPublicMapUi({ isometric: e.target.checked })}
                />
                <span>Vista isométrica (2.5D): inclina el lienzo y ordena piezas por profundidad.</span>
              </label>
              <p className="text-[10px] leading-snug text-[color:var(--af-muted)]">
                Con cuadrícula y ajuste activos en la barra, al soltar una pieza se alinea a una rejilla oblicua (útil
                para PNG en perspectiva).
              </p>
            </div>
            <p className="text-[11px] text-[color:var(--af-muted)]">Selecciona un objeto en el lienzo.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {supportsLayoutFields ? (
              <fieldset className="space-y-1.5 rounded-md border border-[color:var(--af-line)] bg-[color:var(--af-canvas-void)] p-2">
                <legend className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--af-muted)]">Geometría</legend>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="text-[10px] font-medium text-[color:var(--af-muted)]">
                    X
                    <input
                      type="number"
                      className="mt-0.5 w-full rounded-md border border-[color:var(--af-line-strong)] bg-[color:var(--af-chrome)] px-1.5 py-1 text-[11px] text-[color:var(--af-text)]"
                      value={Math.round(Number(item.x || 0))}
                      onChange={(e) => applyLayoutPatch({ x: e.target.value })}
                    />
                  </label>
                  <label className="text-[10px] font-medium text-[color:var(--af-muted)]">
                    Y
                    <input
                      type="number"
                      className="mt-0.5 w-full rounded-md border border-[color:var(--af-line-strong)] bg-[color:var(--af-chrome)] px-1.5 py-1 text-[11px] text-[color:var(--af-text)]"
                      value={Math.round(Number(item.y || 0))}
                      onChange={(e) => applyLayoutPatch({ y: e.target.value })}
                    />
                  </label>
                  <label className="text-[10px] font-medium text-[color:var(--af-muted)]">
                    Ancho
                    <input
                      type="number"
                      className="mt-0.5 w-full rounded-md border border-[color:var(--af-line-strong)] bg-[color:var(--af-chrome)] px-1.5 py-1 text-[11px] text-[color:var(--af-text)]"
                      value={Math.round(Number(item.width || 0))}
                      onChange={(e) => applyLayoutPatch({ width: e.target.value })}
                    />
                  </label>
                  <label className="text-[10px] font-medium text-[color:var(--af-muted)]">
                    Alto
                    <input
                      type="number"
                      className="mt-0.5 w-full rounded-md border border-[color:var(--af-line-strong)] bg-[color:var(--af-chrome)] px-1.5 py-1 text-[11px] text-[color:var(--af-text)]"
                      value={Math.round(Number(item.height || 0))}
                      onChange={(e) => applyLayoutPatch({ height: e.target.value })}
                    />
                  </label>
                </div>
                <label className="block text-[10px] font-medium text-[color:var(--af-muted)]">
                  Rotación (°)
                  <input
                    type="number"
                    step={1}
                    min={-180}
                    max={180}
                    className="mt-0.5 w-full rounded-md border border-[color:var(--af-line-strong)] bg-[color:var(--af-chrome)] px-1.5 py-1 text-[11px] text-[color:var(--af-text)]"
                    value={Math.round(Number(item.rotation || 0))}
                    onChange={(e) => applyLayoutPatch({ rotation: e.target.value })}
                  />
                </label>
              </fieldset>
            ) : (
              <p className="rounded-md border border-[color:var(--af-line)] bg-[color:var(--af-canvas-void)] p-2 text-[10px] leading-snug text-[color:var(--af-muted)]">
                Polígono o línea: ajusta la forma arrastrando en el lienzo (nodos próximamente en inspector).
              </p>
            )}
            <label className="block text-[10px] font-medium uppercase tracking-wide text-[color:var(--af-muted)]">
              Nombre
              <input
                className="mt-0.5 w-full rounded-md border border-[color:var(--af-line-strong)] bg-[color:var(--af-canvas-void)] px-1.5 py-1 text-[11px] font-medium text-[color:var(--af-text)] focus:border-teal-600/45 focus:outline-none"
                value={String(item.label || '')}
                onChange={(e) => updateSelected({ label: e.target.value })}
              />
            </label>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-[color:var(--af-muted)]">
              Descripción
              <textarea
                rows={2}
                className="mt-0.5 w-full rounded-md border border-[color:var(--af-line-strong)] bg-[color:var(--af-canvas-void)] px-1.5 py-1 text-[11px] text-[color:var(--af-text)] focus:border-teal-600/45 focus:outline-none"
                value={String(item.metadata?.description || item.notes || '')}
                onChange={(e) =>
                  updateSelected({ metadata: { ...(item.metadata || {}), description: e.target.value } })
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--af-muted)]">
                Relleno
                <input
                  type="color"
                  className="mt-0.5 h-8 w-full cursor-pointer rounded-md border border-[color:var(--af-line-strong)] bg-[color:var(--af-canvas-void)]"
                  value={toHex(item.fill || '#99f6e4')}
                  onChange={(e) => updateSelected({ fill: e.target.value })}
                />
              </label>
              <label className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--af-muted)]">
                Trazo
                <input
                  type="color"
                  className="mt-0.5 h-8 w-full cursor-pointer rounded-md border border-[color:var(--af-line-strong)] bg-[color:var(--af-canvas-void)]"
                  value={toHex(item.stroke || '#0f766e')}
                  onChange={(e) => updateSelected({ stroke: e.target.value })}
                />
              </label>
            </div>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-[color:var(--af-muted)]">
              Opacidad
              <input
                type="number"
                step={0.05}
                min={0.05}
                max={1}
                className="mt-0.5 w-full rounded-md border border-[color:var(--af-line-strong)] bg-[color:var(--af-canvas-void)] px-1.5 py-1 text-[11px] text-[color:var(--af-text)] focus:border-teal-600/45 focus:outline-none"
                value={Number(item.opacity ?? 1)}
                onChange={(e) => updateSelected({ opacity: Number(e.target.value) })}
              />
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                className="flex-1 rounded-md border border-[color:var(--af-line)] bg-[color:var(--af-panel)] py-1 text-[11px] font-medium text-[color:var(--af-text)] hover:bg-[color:var(--af-elevated)]"
                onClick={() => useMapEditorStore.getState().duplicateSelected()}
              >
                Duplicar
              </button>
              <button
                type="button"
                className="flex-1 rounded-md border border-rose-900/50 bg-rose-950/30 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-950/50"
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
