import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { ContextMenuAction } from './AquaMapContextMenu';
import {
  bringElementToFront,
  duplicateElement,
  nudgeElement,
  pasteFromClipboard,
  sendElementToBack
} from './aquaMapEditorCommands';
import { presetSizeForType } from './elementDefaults';
import type { MapElement } from './types';
import type { AquamapSiteEnvelope } from './siteEnvelope';

export type AquaMapContextRequest = {
  target: 'element' | 'stage';
  elementId?: string;
  clientX: number;
  clientY: number;
  worldX: number;
  worldY: number;
};

type Args = {
  envelope: AquamapSiteEnvelope;
  setEnvelope: Dispatch<SetStateAction<AquamapSiteEnvelope>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  editorRootSelector?: string;
};

function isTypingTarget(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t) return false;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return true;
  return Boolean(t.isContentEditable);
}

function isEditorFocused(rootSelector: string): boolean {
  const root = document.querySelector(rootSelector);
  if (!root) return false;
  const active = document.activeElement;
  if (!active || active === document.body) return true;
  return root.contains(active);
}

export function useAquaMapEditorCommands({
  envelope,
  setEnvelope,
  selectedId,
  setSelectedId,
  editorRootSelector = '[data-aquamap-editor-root]'
}: Args) {
  const clipboardRef = useRef<MapElement | null>(null);
  const [clipboardTick, setClipboardTick] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    pasteWorld: { x: number; y: number } | null;
  }>({ open: false, x: 0, y: 0, pasteWorld: null });

  const selected = selectedId
    ? envelope.elements.find((e) => e.id === selectedId) ?? null
    : null;

  const closeContextMenu = useCallback(() => {
    setContextMenu((m) => (m.open ? { ...m, open: false } : m));
  }, []);

  const openContextMenu = useCallback((req: AquaMapContextRequest) => {
    if (req.elementId) setSelectedId(req.elementId);
    setContextMenu({
      open: true,
      x: req.clientX,
      y: req.clientY,
      pasteWorld: { x: req.worldX, y: req.worldY }
    });
  }, [setSelectedId]);

  const copySelected = useCallback(() => {
    if (!selected) return;
    clipboardRef.current = { ...selected };
    setClipboardTick((n) => n + 1);
  }, [selected]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setEnvelope((prev) => ({
      ...prev,
      elements: prev.elements.filter((e) => e.id !== selectedId)
    }));
    setSelectedId(null);
  }, [selectedId, setEnvelope, setSelectedId]);

  const pasteAt = useCallback(
    (at?: { x: number; y: number }) => {
      const clip = clipboardRef.current;
      if (!clip) return;
      const next = pasteFromClipboard(clip, envelope.world, at);
      setEnvelope((prev) => ({ ...prev, elements: [...prev.elements, next] }));
      setSelectedId(next.id);
    },
    [envelope.world, setEnvelope, setSelectedId]
  );

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const next = duplicateElement(selected);
    setEnvelope((prev) => ({ ...prev, elements: [...prev.elements, next] }));
    setSelectedId(next.id);
  }, [selected, setEnvelope, setSelectedId]);

  const applyPresetToSelected = useCallback(() => {
    if (!selectedId || !selected) return;
    const { width, height } = presetSizeForType(selected.type);
    setEnvelope((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedId ? { ...el, width, height } : el
      )
    }));
  }, [selected, selectedId, setEnvelope]);

  const reorderSelected = useCallback(
    (mode: 'front' | 'back') => {
      if (!selected) return;
      const updated =
        mode === 'front'
          ? bringElementToFront(selected, envelope.elements)
          : sendElementToBack(selected, envelope.elements);
      setEnvelope((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => (el.id === selected.id ? updated : el))
      }));
    },
    [envelope.elements, selected, setEnvelope]
  );

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (!selected) return;
      const updated = nudgeElement(selected, dx, dy, envelope.world);
      setEnvelope((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => (el.id === selected.id ? updated : el))
      }));
    },
    [envelope.world, selected, setEnvelope]
  );

  const runContextAction = useCallback(
    (action: ContextMenuAction) => {
      switch (action) {
        case 'copy':
          copySelected();
          break;
        case 'paste':
          pasteAt(contextMenu.pasteWorld ?? undefined);
          break;
        case 'duplicate':
          duplicateSelected();
          break;
        case 'delete':
          deleteSelected();
          break;
        case 'bringFront':
          reorderSelected('front');
          break;
        case 'sendBack':
          reorderSelected('back');
          break;
        case 'presetSize':
          applyPresetToSelected();
          break;
        default:
          break;
      }
    },
    [
      applyPresetToSelected,
      contextMenu.pasteWorld,
      copySelected,
      deleteSelected,
      duplicateSelected,
      pasteAt,
      reorderSelected
    ]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isEditorFocused(editorRootSelector)) return;
      if (isTypingTarget(e.target)) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'c' && selected) {
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && key === 'v' && clipboardRef.current) {
        e.preventDefault();
        pasteAt(contextMenu.pasteWorld ?? undefined);
        return;
      }
      if (mod && key === 'd' && selected) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (selected && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 32 : 8;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        nudgeSelected(dx, dy);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [
    contextMenu.pasteWorld,
    copySelected,
    deleteSelected,
    duplicateSelected,
    editorRootSelector,
    nudgeSelected,
    pasteAt,
    selected,
    selectedId
  ]);

  return {
    contextMenu,
    closeContextMenu,
    openContextMenu,
    runContextAction,
    canPaste: clipboardTick > 0 && Boolean(clipboardRef.current),
    hasSelection: Boolean(selectedId),
    copySelected,
    deleteSelected,
    duplicateSelected,
    pasteAt
  };
}
