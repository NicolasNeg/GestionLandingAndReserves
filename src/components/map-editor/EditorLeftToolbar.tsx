import { MAP_ITEM_KINDS_V2 } from '../../lib/mapEngine/mapTypes.js';
import { useMapEditorStore } from '../../store/map-editor-store';

const TOOLS = [
  { kind: 'area', label: 'Area' },
  { kind: 'mesa', label: 'Mesa' },
  { kind: 'estacionamiento', label: 'Parking' },
  { kind: 'limitacion', label: 'Zona bloqueada' },
  { kind: 'alberca', label: 'Alberca' },
  { kind: 'palapa', label: 'Palapa' },
  { kind: 'servicio', label: 'Servicio' },
  { kind: 'entrada', label: 'Entrada / salida' },
  { kind: 'text', label: 'Texto' },
  { kind: 'marker', label: 'Marcador' },
  { kind: 'rect', label: 'Rectangulo' },
  { kind: 'polygon', label: 'Poligono' },
  { kind: 'ellipse', label: 'Elipse' }
];

export function EditorLeftToolbar() {
  const addItem = useMapEditorStore((s) => s.addItem);
  const doc = useMapEditorStore((s) => s.doc);

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-cyan-100/80 bg-white/95">
      <div className="border-b border-cyan-50 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-teal-800">Elementos</p>
        <p className="text-[11px] text-slate-500">Clic para colocar en el centro del lienzo.</p>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {TOOLS.map((t) => {
          const meta = MAP_ITEM_KINDS_V2.find((k) => k.value === t.kind);
          const stroke = meta?.stroke || '#0f766e';
          return (
            <button
              key={t.kind}
              type="button"
              className="flex w-full items-center gap-2 rounded-xl border border-slate-100 bg-white px-2 py-2 text-left text-xs font-bold text-slate-800 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/50"
              onClick={() =>
                addItem(t.kind, {
                  x: Math.max(24, doc.width / 2 - 60),
                  y: Math.max(24, doc.height / 2 - 40)
                })
              }
            >
              <span
                className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-slate-100"
                style={{ background: `${stroke}22` }}
              />
              {t.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
