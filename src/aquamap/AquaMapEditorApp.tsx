import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AquaMapCanvas } from './AquaMapCanvas';
import { AquaMapSidebar } from './AquaMapSidebar';
import { createMapElement } from './elementDefaults';
import type { ElementType, MapElement } from './types';
import { useLocalStorageElements } from './useLocalStorage';

export function AquaMapEditorApp() {
  const [elements, setElements] = useLocalStorageElements([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: Math.max(280, Math.floor(r.width)), h: Math.max(240, Math.floor(r.height)) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const elementsSorted = useMemo(() => [...elements].sort((a, b) => a.y - b.y), [elements]);

  const selected = useMemo(
    () => (selectedId ? elements.find((e) => e.id === selectedId) ?? null : null),
    [elements, selectedId]
  );

  const onAdd = useCallback((type: ElementType) => {
    const next = createMapElement(type);
    setElements((prev) => [...prev, next]);
    setSelectedId(next.id);
  }, [setElements]);

  const onUpdateSelected = useCallback(
    (patch: Partial<Pick<MapElement, 'name' | 'color' | 'width' | 'height'>>) => {
      if (!selectedId) return;
      setElements((prev) => prev.map((el) => (el.id === selectedId ? { ...el, ...patch } : el)));
    },
    [selectedId, setElements]
  );

  const onElementDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      setElements((prev) => prev.map((el) => (el.id === id ? { ...el, x, y } : el)));
    },
    [setElements]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-950">
      <div ref={mapWrapRef} className="relative h-full w-[80%] min-w-0">
        <AquaMapCanvas
          width={stageSize.w}
          height={stageSize.h}
          elementsSorted={elementsSorted}
          camera={camera}
          setCamera={setCamera}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onElementDragEnd={onElementDragEnd}
        />
      </div>
      <AquaMapSidebar selected={selected} onAdd={onAdd} onUpdateSelected={onUpdateSelected} />
    </div>
  );
}
