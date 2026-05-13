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
    <div className="flex h-full min-h-[min(76vh,720px)] flex-col overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-b from-white via-sky-50/40 to-teal-50/50 shadow-xl ring-1 ring-teal-100/60">
      <EditorTopBar
        saveStatus={props.saveStatus}
        onSaveSite={props.onSaveSite}
        onPreviewPublic={props.onPreviewPublic}
      />
      <div className="flex min-h-0 flex-1">
        <EditorLeftToolbar />
        <div className="relative min-w-0 flex-1">
          <ZoomControls />
          <MapEditorCanvas />
        </div>
        <EditorInspector />
      </div>
      <EditorBottomBar />
    </div>
  );
}
