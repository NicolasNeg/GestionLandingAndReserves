import { useMapEditorStore } from '../../store/map-editor-store';

export function ZoomControls() {
  const zoom = useMapEditorStore((s) => s.zoom);
  const setZoom = useMapEditorStore((s) => s.setZoom);
  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-xl border border-cyan-100 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur">
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-lg text-lg font-bold text-slate-700 hover:bg-sky-50"
        onClick={() => setZoom(zoom - 0.12)}
      >
        −
      </button>
      <span className="min-w-[3.2rem] text-center text-xs font-black text-teal-800">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-lg text-lg font-bold text-slate-700 hover:bg-sky-50"
        onClick={() => setZoom(zoom + 0.12)}
      >
        +
      </button>
      <button
        type="button"
        className="rounded-lg px-2 py-1 text-[10px] font-black uppercase text-slate-500 hover:bg-sky-50"
        onClick={() => {
          useMapEditorStore.getState().setZoom(1);
          useMapEditorStore.getState().setPan(0, 0);
        }}
      >
        Ajustar
      </button>
    </div>
  );
}
