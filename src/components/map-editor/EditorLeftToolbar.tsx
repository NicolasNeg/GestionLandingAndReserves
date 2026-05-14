import { MAP_ITEM_KINDS_V2 } from '../../lib/mapEngine/mapTypes.js';
import { useMapEditorStore } from '../../store/map-editor-store';

const TOOLS = [
  { kind: 'area', label: 'Área' },
  { kind: 'mesa', label: 'Mesa' },
  { kind: 'estacionamiento', label: 'Parking' },
  { kind: 'limitacion', label: 'Bloqueo' },
  { kind: 'alberca', label: 'Alberca' },
  { kind: 'palapa', label: 'Palapa' },
  { kind: 'servicio', label: 'Servicio' },
  { kind: 'entrada', label: 'Entrada' },
  { kind: 'text', label: 'Texto' },
  { kind: 'marker', label: 'Marcador' },
  { kind: 'rect', label: 'Rectángulo' },
  { kind: 'polygon', label: 'Polígono' },
  { kind: 'ellipse', label: 'Elipse' }
];

export function EditorLeftToolbar() {
  const addItem = useMapEditorStore((s) => s.addItem);
  const doc = useMapEditorStore((s) => s.doc);

  return (
    <aside className="flex w-[196px] shrink-0 flex-col border-r border-[color:var(--af-line)] bg-[color:var(--af-rail)]">
      <div
        className="border-b border-[color:var(--af-line)] px-3 py-3"
        style={{
          background: 'linear-gradient(180deg, var(--af-rail-edge) 0%, var(--af-rail) 100%)'
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-800/80">Biblioteca</p>
        <p className="mt-1 text-[11px] leading-snug text-[color:var(--af-muted)]">
          Clic: coloca en el centro del lienzo.
        </p>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {TOOLS.map((t) => {
          const meta = MAP_ITEM_KINDS_V2.find((k) => k.value === t.kind);
          const stroke = meta?.stroke || '#0ea5e9';
          return (
            <button
              key={t.kind}
              type="button"
              className="group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left text-[12px] font-medium text-[color:var(--af-text)] transition hover:border-[color:var(--af-line-strong)] hover:bg-[color:var(--af-panel)]"
              onClick={() =>
                addItem(t.kind, {
                  x: Math.max(24, doc.width / 2 - 60),
                  y: Math.max(24, doc.height / 2 - 40)
                })
              }
            >
              <span
                className="size-6 shrink-0 rounded-md border border-[color:var(--af-line)] shadow-inner transition group-hover:border-teal-400/50"
                style={{ background: `${String(stroke)}33` }}
              />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
