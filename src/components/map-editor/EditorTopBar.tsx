import * as React from 'react';
import { useMapEditorStore } from '../../store/map-editor-store';

const MAP_VIEWS = [
  { id: 'parque', label: 'Global' },
  { id: 'mesas', label: 'Mesas' },
  { id: 'estacionamiento', label: 'Estacionamiento' },
  { id: 'albercas', label: 'Albercas' }
] as const;

function readMapContextSelect(): string {
  const sel = document.getElementById('map-context-select') as HTMLSelectElement | null;
  return sel?.value || 'parque';
}

function dispatchMapViewChange(value: string) {
  const sel = document.getElementById('map-context-select') as HTMLSelectElement | null;
  if (!sel) return;
  sel.value = value;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}

export function EditorTopBar(props: {
  saveStatus: string;
  onSaveSite: () => void;
  onPreviewPublic: () => void;
}) {
  const [mapView, setMapView] = React.useState(readMapContextSelect);
  const undo = useMapEditorStore((s) => s.undo);
  const redo = useMapEditorStore((s) => s.redo);
  const setPreviewMode = useMapEditorStore((s) => s.setPreviewMode);
  const previewMode = useMapEditorStore((s) => s.previewMode);
  const tool = useMapEditorStore((s) => s.tool);
  const setTool = useMapEditorStore((s) => s.setTool);
  const gridVisible = useMapEditorStore((s) => s.gridVisible);
  const setGridVisible = useMapEditorStore((s) => s.setGridVisible);

  React.useEffect(() => {
    const sel = document.getElementById('map-context-select') as HTMLSelectElement | null;
    if (!sel) return;
    const onChange = () => setMapView(sel.value || 'parque');
    sel.addEventListener('change', onChange);
    setMapView(sel.value || 'parque');
    return () => sel.removeEventListener('change', onChange);
  }, []);

  const togglePreviewCanvas = () => {
    const next = !useMapEditorStore.getState().previewMode;
    setPreviewMode(next);
  };

  const toggleFocusMode = () => {
    document.getElementById('mapa-focus-toggle')?.click();
  };

  return (
    <header className="flex flex-col gap-3 border-b border-cyan-100/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-600 text-lg text-white shadow-md">
            🗺
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black tracking-tight text-slate-900">Editor del mapa</h2>
            <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">{props.saveStatus}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => undo()}
          >
            Deshacer
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => redo()}
          >
            Rehacer
          </button>
          <button
            type="button"
            className={`rounded-xl border px-3 py-2 text-xs font-black shadow-sm ${
              previewMode
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100'
            }`}
            onClick={togglePreviewCanvas}
          >
            {previewMode ? 'Salir preview' : 'Vista previa lienzo'}
          </button>
          <button
            type="button"
            className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-900 hover:bg-sky-50"
            onClick={props.onPreviewPublic}
          >
            Vista previa web
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
            onClick={toggleFocusMode}
            title="Igual que Modo enfoque del panel"
          >
            Modo enfoque
          </button>
          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2 text-xs font-black text-white shadow-md hover:from-teal-500 hover:to-cyan-500"
            onClick={props.onSaveSite}
          >
            Guardar sitio
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <nav
          className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-100 bg-slate-50/80 p-1"
          aria-label="Vista del mapa"
        >
          {MAP_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              data-map-view-tab={v.id}
              onClick={() => {
                dispatchMapViewChange(v.id);
                setMapView(v.id);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                mapView === v.id ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {v.label}
            </button>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 sm:border-t-0 sm:pt-0">
          <span className="hidden text-[10px] font-black uppercase text-slate-400 sm:inline">Herramienta</span>
          <button
            type="button"
            data-map-mode="select"
            onClick={() => setTool('select')}
            className={`rounded-lg px-3 py-1.5 text-xs font-black ${
              tool === 'select' ? 'bg-teal-600 text-white shadow' : 'bg-white text-slate-700 ring-1 ring-slate-200'
            }`}
          >
            Seleccionar
          </button>
          <button
            type="button"
            data-map-mode="pan"
            onClick={() => setTool('pan')}
            className={`rounded-lg px-3 py-1.5 text-xs font-black ${
              tool === 'pan' ? 'bg-teal-600 text-white shadow' : 'bg-white text-slate-700 ring-1 ring-slate-200'
            }`}
          >
            Mano
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={gridVisible}
              onChange={(e) => setGridVisible(e.target.checked)}
            />
            Grid
          </label>
        </div>
      </div>
    </header>
  );
}
