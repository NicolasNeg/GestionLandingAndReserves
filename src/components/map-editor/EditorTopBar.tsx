import * as React from 'react';
import { useMapEditorStore } from '../../store/map-editor-store';

const MAP_VIEWS = [
  { id: 'parque', label: 'Global' },
  { id: 'mesas', label: 'Mesas' },
  { id: 'estacionamiento', label: 'Parking' },
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

/** Marca suave alineada con la landing (teal + sol). */
function ParkMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#ecfdf5" stroke="#99f6e4" strokeWidth="1" />
      <circle cx="22" cy="10" r="4" fill="#fcd34d" opacity="0.95" />
      <path
        d="M6 22c3.5-2.5 7-2.5 10 0s6.5 2.5 10 0"
        stroke="#0f766e"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path d="M6 25h20" stroke="#d6d3d1" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
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

  const btn =
    'inline-flex h-8 items-center justify-center rounded-lg border px-3 text-[12px] font-medium tracking-tight transition-colors';
  const btnGhost =
    'border-[color:var(--af-line)] bg-[color:var(--af-panel)] text-[color:var(--af-text)] hover:border-[color:var(--af-line-strong)] hover:bg-stone-50';
  const btnQuiet = 'border-transparent bg-transparent text-[color:var(--af-muted)] hover:text-[color:var(--af-text)]';

  return (
    <header className="shrink-0 border-b border-[color:var(--af-line)] bg-[color:var(--af-panel)] px-4 py-3 shadow-sm shadow-stone-900/5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <ParkMark className="h-9 w-9 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] font-medium tracking-wide text-[color:var(--af-muted)]">Mapa del parque</p>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-[color:var(--af-text)]">
              Editor del plano
            </h1>
            <p className="truncate text-[11px] text-[color:var(--af-muted)]">{props.saveStatus}</p>
          </div>
        </div>

        <nav
          className="flex flex-wrap items-center gap-1 rounded-lg border border-[color:var(--af-line)] bg-[color:var(--af-panel)] p-1"
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
              className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${
                mapView === v.id
                  ? 'bg-[color:var(--af-accent-soft)] text-[color:var(--af-accent)] ring-1 ring-[color:var(--af-line-strong)]'
                  : 'text-[color:var(--af-muted)] hover:bg-stone-100 hover:text-[color:var(--af-text)]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="mr-1 hidden h-6 w-px bg-[color:var(--af-line)] sm:block" aria-hidden />
          <button type="button" data-map-mode="select" className={`${btn} ${tool === 'select' ? btnGhost + ' ring-1 ring-[color:var(--af-accent)]' : btnGhost}`} onClick={() => setTool('select')}>
            Seleccionar
          </button>
          <button type="button" data-map-mode="pan" className={`${btn} ${tool === 'pan' ? btnGhost + ' ring-1 ring-[color:var(--af-accent)]' : btnGhost}`} onClick={() => setTool('pan')}>
            Mano
          </button>
          <label className={`${btn} ${btnGhost} cursor-pointer gap-2`}>
            <input
              type="checkbox"
              className="size-3.5 rounded border-[color:var(--af-line)] bg-white text-teal-600"
              checked={gridVisible}
              onChange={(e) => setGridVisible(e.target.checked)}
            />
            <span>Cuadrícula</span>
          </label>
          <button type="button" className={`${btn} ${btnGhost}`} onClick={() => undo()}>
            Deshacer
          </button>
          <button type="button" className={`${btn} ${btnGhost}`} onClick={() => redo()}>
            Rehacer
          </button>
          <button
            type="button"
            className={`${btn} ${previewMode ? btnGhost + ' ring-1 ring-amber-400/50' : btnGhost}`}
            onClick={togglePreviewCanvas}
          >
            {previewMode ? 'Salir preview' : 'Preview lienzo'}
          </button>
          <button type="button" className={`${btn} ${btnGhost}`} onClick={props.onPreviewPublic}>
            Preview web
          </button>
          <button type="button" className={`${btn} ${btnQuiet}`} onClick={toggleFocusMode} title="Modo enfoque del panel">
            Enfoque
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-lg bg-teal-600 px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-teal-700"
            onClick={props.onSaveSite}
          >
            Guardar sitio
          </button>
        </div>
      </div>
    </header>
  );
}
