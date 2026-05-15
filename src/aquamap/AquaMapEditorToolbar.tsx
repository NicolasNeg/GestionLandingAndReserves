import { Eye, EyeOff, Redo2, RotateCcw, Undo2 } from 'lucide-react';

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  previewMode: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePreview: () => void;
  onFit: () => void;
};

export function AquaMapEditorToolbar({
  canUndo,
  canRedo,
  previewMode,
  onUndo,
  onRedo,
  onTogglePreview,
  onFit
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <ToolbarBtn
        title="Deshacer (Ctrl+Z)"
        disabled={!canUndo || previewMode}
        onClick={onUndo}
        Icon={Undo2}
        label="Deshacer"
      />
      <ToolbarBtn
        title="Rehacer (Ctrl+Y)"
        disabled={!canRedo || previewMode}
        onClick={onRedo}
        Icon={Redo2}
        label="Rehacer"
      />
      <span className="mx-0.5 h-4 w-px bg-[#525252]" aria-hidden />
      <ToolbarBtn
        title={previewMode ? 'Salir de vista previa' : 'Vista previa (como en la web)'}
        onClick={onTogglePreview}
        Icon={previewMode ? EyeOff : Eye}
        label={previewMode ? 'Editar' : 'Vista previa'}
        active={previewMode}
      />
      <ToolbarBtn title="Encuadrar contenido" onClick={onFit} Icon={RotateCcw} label="Encuadrar" />
    </div>
  );
}

function ToolbarBtn({
  title,
  disabled,
  onClick,
  Icon,
  label,
  active
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  Icon: typeof Undo2;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`aquamap-pressable flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold transition ${
        disabled
          ? 'cursor-not-allowed border-[#333] text-[#525252]'
          : active
            ? 'border-[#5eead4]/50 bg-[#1a2e28] text-[#86efac]'
            : 'border-[#404040] bg-[#2a2a2a] text-[#d4d4d4] hover:bg-[#333]'
      }`}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
