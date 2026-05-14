import { isDevBootstrapActive } from '../../lib/devBootstrap.js';
import { EditorBottomBar } from './EditorBottomBar';
import { MapEditorCanvas } from './EditorCanvas';
import { EditorInspector } from './EditorInspector';
import { EditorLeftToolbar } from './EditorLeftToolbar';
import { EditorTopBar } from './EditorTopBar';
import { ZoomControls } from './ZoomControls';

export function MapEditorShell(props: {
  saveStatus: string;
  onSaveSite: () => void;
  onPreviewPublic: () => void;
}) {
  return (
    <div className="park-map-editor flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-[color:var(--af-root)] shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
      <EditorTopBar
        saveStatus={props.saveStatus}
        onSaveSite={props.onSaveSite}
        onPreviewPublic={props.onPreviewPublic}
      />
      {isDevBootstrapActive() ? (
        <div
          className="shrink-0 border-b px-4 py-1.5 text-center text-[11px] leading-snug"
          style={{
            borderColor: 'var(--af-warn-border)',
            background: 'var(--af-warn-bg)',
            color: 'var(--af-warn-text)'
          }}
        >
          Modo desarrollo local: permisos elevados. Las escrituras a Supabase pueden fallar sin JWT. Desactiva con{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[10px] text-amber-950">VITE_DEV_BOOTSTRAP=0</code>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <EditorLeftToolbar />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-gradient-to-b from-[color:var(--af-chrome)] to-stone-100/40 p-4 md:p-6">
          <ZoomControls />
          <MapEditorCanvas />
        </div>
        <EditorInspector />
      </div>
      <EditorBottomBar />
    </div>
  );
}
