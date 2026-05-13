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
      metrics = `Area aprox. ${Math.round(a)} u² · Perimetro ${Math.round(p)} u`;
    } else if (item.width && item.height) {
      metrics = `Area aprox. ${Math.round(Number(item.width) * Number(item.height))} u²`;
    }
  }

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-cyan-100/80 bg-white/90 px-4 py-3 text-sm text-slate-700">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-teal-700">Seleccion</p>
        <p className="truncate font-bold text-slate-900">
          {item ? String(item.label || item.id) : 'Nada seleccionado'}
        </p>
        {item ? (
          <p className="text-xs text-slate-500">
            {String(item.kind || item.type)} · {metrics}
          </p>
        ) : null}
      </div>
      <label className="flex min-w-[200px] max-w-md flex-1 flex-col text-[10px] font-bold uppercase text-slate-500">
        Notas internas
        <textarea
          rows={2}
          className="mt-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800"
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
