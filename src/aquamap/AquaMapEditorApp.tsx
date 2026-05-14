import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AquaMapCanvas } from './AquaMapCanvas';
import { AquaMapLegend } from './AquaMapLegend';
import { AquaMapSidebar } from './AquaMapSidebar';
import { AquaMapZoomHud } from './AquaMapZoomHud';
import { createMapElement } from './elementDefaults';
import type { ElementType, MapElement } from './types';
import { useLocalStorageElements } from './useLocalStorage';
import { AQUAMAP_WORLD_H, AQUAMAP_WORLD_W } from './world';

export function AquaMapEditorApp() {
  const [elements, setElements] = useLocalStorageElements([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [saveFlash, setSaveFlash] = useState(false);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    if (selectedId && !elements.some((e) => e.id === selectedId)) setSelectedId(null);
  }, [elements, selectedId]);

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

  const onAdd = useCallback(
    (type: ElementType) => {
      const next = createMapElement(type);
      setElements((prev) => [...prev, next]);
      setSelectedId(next.id);
    },
    [setElements]
  );

  const onUpdateSelected = useCallback(
    (patch: Partial<Pick<MapElement, 'name' | 'color' | 'width' | 'height' | 'imgSrc'>>) => {
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

  const onZoomIn = useCallback(() => {
    setCamera((c) => ({ ...c, scale: Math.min(2.2, c.scale * 1.12) }));
  }, []);
  const onZoomOut = useCallback(() => {
    setCamera((c) => ({ ...c, scale: Math.max(0.45, c.scale / 1.12) }));
  }, []);
  const onResetView = useCallback(() => {
    setCamera({ x: 0, y: 0, scale: 1 });
  }, []);

  const onSaveClick = useCallback(() => {
    try {
      localStorage.setItem('aquamap-editor-pro-elements', JSON.stringify(elements));
    } catch {
      /* ignore */
    }
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 900);
  }, [elements]);

  const onPublishClick = useCallback(async () => {
    const json = JSON.stringify({ elements }, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      window.alert('Mapa copiado al portapapeles (JSON). Sin servidor, esto sustituye a publicar.');
    } catch {
      window.alert(json);
    }
  }, [elements]);

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-950">
      <div ref={mapWrapRef} className="relative h-full w-[80%] min-w-0">
        <AquaMapCanvas
          width={stageSize.w}
          height={stageSize.h}
          worldW={AQUAMAP_WORLD_W}
          worldH={AQUAMAP_WORLD_H}
          elementsSorted={elementsSorted}
          camera={camera}
          setCamera={setCamera}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onElementDragEnd={onElementDragEnd}
        />
        <AquaMapLegend />
        <AquaMapZoomHud onZoomIn={onZoomIn} onZoomOut={onZoomOut} onReset={onResetView} />
        {saveFlash ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-teal-500/40 bg-teal-950/90 px-4 py-1.5 text-xs font-semibold text-teal-100 shadow-lg">
            Guardado en localStorage
          </div>
        ) : null}
      </div>
      <AquaMapSidebar
        elements={elements}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        selected={selected}
        onAdd={onAdd}
        onUpdateSelected={onUpdateSelected}
        onSaveClick={onSaveClick}
        onPublishClick={onPublishClick}
      />
    </div>
  );
}
