import { useMapEditorStore } from '../../store/map-editor-store';
import { polygonAreaPx, polygonPerimeterPx } from '../../lib/map/map-utils';

export function EditorBottomBar() {
  const doc = useMapEditorStore((s) => s.doc);
  const selectedIds = useMapEditorStore((s) => s.selectedIds);
  const item = doc.items.find((it: any) => it.id === selectedIds[0]);

  let metrics = '';
  if (item) {
    if (item.type === 'polygon' && Array.isArray(item.points) && item.points.length >= 3) {
      const a = polygonAreaPx(item.points);
      const p = polygonPerimeterPx(item.points);
      metrics = `${Math.round(a)} u² · ${Math.round(p)} u`;
    } else if (item.width && item.height) {
      metrics = `${Math.round(Number(item.width) * Number(item.height))} u²`;
    }
  }

  return (
    <footer className="flex shrink-0 flex-wrap items-end gap-4 border-t border-[color:var(--af-line)] bg-[color:var(--af-chrome)] px-4 py-2.5 text-[12px]">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--af-muted)]">Selección</p>
        <p className="truncate font-medium text-[color:var(--af-text)]">
          {item ? String(item.label || item.id) : '—'}
        </p>
        {item ? (
          <p className="truncate text-[11px] text-[color:var(--af-muted)]">
            {String(item.kind || item.type)} · {metrics}
          </p>
        ) : null}
      </div>
      <label className="flex min-w-[160px] max-w-md flex-1 flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--af-muted)]">
        Notas internas
        <textarea
          rows={1}
          className="resize-none rounded-lg border border-[color:var(--af-line-strong)] bg-[color:var(--af-canvas-void)] px-2 py-1.5 text-[12px] font-normal text-[color:var(--af-text)] placeholder:text-[color:var(--af-muted)] focus:border-teal-600/45 focus:outline-none disabled:opacity-40"
          value={item ? String(item.notes || '') : ''}
          disabled={!item}
          onChange={(e) => {
            if (!item) return;
            useMapEditorStore.getState().updateSelected({ notes: e.target.value });
          }}
        />
      </label>
    </footer>
  );
}
