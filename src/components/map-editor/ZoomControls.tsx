import { clamp } from '../../lib/mapEngine/mapSchema.js';
import { useMapEditorStore } from '../../store/map-editor-store';

export function ZoomControls() {
  const zoom = useMapEditorStore((s) => s.zoom);
  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-10 flex items-center gap-0.5 rounded-lg border border-stone-200/90 bg-white/95 px-1 py-0.5 shadow-md shadow-stone-900/8 backdrop-blur-sm">
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-md text-[15px] font-normal text-[color:var(--af-text)] hover:bg-[color:var(--af-accent-soft)]"
        onClick={() => {
          const st = useMapEditorStore.getState();
          const nz = clamp(st.zoom - 0.12, 0.25, 3);
          st.setZoomAnchored(nz, st.editorViewportW / 2, st.editorViewportH / 2);
        }}
        aria-label="Alejar"
      >
        −
      </button>
      <span className="min-w-[3rem] px-1 text-center text-[11px] font-medium tabular-nums text-[color:var(--af-muted)]">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-md text-[15px] font-normal text-[color:var(--af-text)] hover:bg-[color:var(--af-accent-soft)]"
        onClick={() => {
          const st = useMapEditorStore.getState();
          const nz = clamp(st.zoom + 0.12, 0.25, 3);
          st.setZoomAnchored(nz, st.editorViewportW / 2, st.editorViewportH / 2);
        }}
        aria-label="Acercar"
      >
        +
      </button>
      <button
        type="button"
        className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--af-muted)] hover:bg-[color:var(--af-accent-soft)] hover:text-[color:var(--af-text)]"
        onClick={() => {
          useMapEditorStore.getState().setZoom(1);
          useMapEditorStore.getState().setPan(0, 0);
        }}
      >
        Centrar
      </button>
    </div>
  );
}
