import {
  ArrowDown,
  ArrowUp,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Maximize2,
  Trash2
} from 'lucide-react';
import { useEffect, useRef } from 'react';

export type ContextMenuAction =
  | 'copy'
  | 'paste'
  | 'duplicate'
  | 'delete'
  | 'bringFront'
  | 'sendBack'
  | 'presetSize';

type Props = {
  open: boolean;
  x: number;
  y: number;
  hasSelection: boolean;
  canPaste: boolean;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
};

type ItemDef = {
  id: ContextMenuAction;
  label: string;
  shortcut?: string;
  Icon: typeof Copy;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
};

export function AquaMapContextMenu({
  open,
  x,
  y,
  hasSelection,
  canPaste,
  onAction,
  onClose
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onPointer, true);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onPointer, true);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  const items: ItemDef[] = [
    { id: 'copy', label: 'Copiar', shortcut: 'Ctrl+C', Icon: Copy, disabled: !hasSelection },
    { id: 'paste', label: 'Pegar', shortcut: 'Ctrl+V', Icon: ClipboardPaste, disabled: !canPaste },
    { id: 'duplicate', label: 'Duplicar', shortcut: 'Ctrl+D', Icon: CopyPlus, disabled: !hasSelection },
    { id: 'bringFront', label: 'Traer al frente', Icon: ArrowUp, disabled: !hasSelection, separatorBefore: true },
    { id: 'sendBack', label: 'Enviar atrás', Icon: ArrowDown, disabled: !hasSelection },
    { id: 'presetSize', label: 'Tamaño por tipo', Icon: Maximize2, disabled: !hasSelection },
    {
      id: 'delete',
      label: 'Eliminar',
      shortcut: 'Supr',
      Icon: Trash2,
      disabled: !hasSelection,
      danger: true,
      separatorBefore: true
    }
  ];

  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
  const left = Math.min(x, vw - 220);
  const top = Math.min(y, vh - 320);

  return (
    <div
      ref={menuRef}
      className="aquamap-context-menu fixed z-[200] min-w-[210px] overflow-hidden rounded-lg border border-[#404040] bg-[#2d2d2d] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
      style={{ left, top }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="border-b border-[#404040] px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#737373]">
        Acciones
      </p>
      {items.map(({ id, label, shortcut, Icon, disabled, danger, separatorBefore }) => (
        <div key={id}>
          {separatorBefore ? <div className="my-1 border-t border-[#404040]" /> : null}
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] transition ${
              disabled
                ? 'cursor-not-allowed text-[#525252]'
                : danger
                  ? 'text-rose-300 hover:bg-rose-950/50'
                  : 'text-[#e5e5e5] hover:bg-[#3d3d3d]'
            }`}
            onClick={() => {
              if (disabled) return;
              onAction(id);
              onClose();
            }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} />
            <span className="flex-1">{label}</span>
            {shortcut ? (
              <span className="font-mono text-[9px] text-[#737373]">{shortcut}</span>
            ) : null}
          </button>
        </div>
      ))}
    </div>
  );
}
