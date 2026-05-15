import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react';
import { AquaMapCanvas } from './AquaMapCanvas';
import { AquaMapLegend } from './AquaMapLegend';
import { AquaMapSidebar } from './AquaMapSidebar';
import { AquaMapZoomHud } from './AquaMapZoomHud';
import { createMapElement } from './elementDefaults';
import type { ElementType, MapElement } from './types';
import {
  ensureAquamapEnvelopeFromSiteJson,
  serializeAquamapSiteEnvelope,
  type AquamapSiteEnvelope
} from './siteEnvelope';

export type AquaMapSiteEditorHandle = {
  getJson: () => string;
  setJson: (json: string) => void;
};

type MapBridgeNotifiers = {
  notifySelection: () => void;
  notifyDocument: () => void;
};

type Props = {
  initialJson: string;
  onChangeJson: (json: string) => void;
  onSaveSite: () => void;
  onPreviewPublic: () => void;
  mapBridgeNotifiers?: MapBridgeNotifiers | null;
};

export const AquaMapSiteEditor = forwardRef<AquaMapSiteEditorHandle, Props>(function AquaMapSiteEditor(
  { initialJson, onChangeJson, onSaveSite, onPreviewPublic, mapBridgeNotifiers },
  ref
) {
  const [envelope, setEnvelope] = useState<AquamapSiteEnvelope>(() => ensureAquamapEnvelopeFromSiteJson(initialJson));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [saveFlash, setSaveFlash] = useState(false);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });
  const externalSyncRef = useRef(false);
  const envelopeRef = useRef(envelope);
  const skipNextChangeEmitRef = useRef(true);
  envelopeRef.current = envelope;

  useImperativeHandle(ref, () => ({
    getJson: () => serializeAquamapSiteEnvelope(envelopeRef.current),
    setJson: (json: string) => {
      externalSyncRef.current = true;
      skipNextChangeEmitRef.current = true;
      setEnvelope(ensureAquamapEnvelopeFromSiteJson(json));
      setSelectedId(null);
      setCamera({ x: 0, y: 0, scale: 1 });
      window.requestAnimationFrame(() => {
        externalSyncRef.current = false;
      });
    }
  }));

  useEffect(() => {
    if (skipNextChangeEmitRef.current) {
      skipNextChangeEmitRef.current = false;
      return;
    }
    if (externalSyncRef.current) return;
    onChangeJson(serializeAquamapSiteEnvelope(envelope));
  }, [envelope, onChangeJson]);

  useEffect(() => {
    if (selectedId && !envelope.elements.some((e) => e.id === selectedId)) setSelectedId(null);
  }, [envelope.elements, selectedId]);

  useEffect(() => {
    mapBridgeNotifiers?.notifyDocument();
  }, [envelope, mapBridgeNotifiers]);

  useEffect(() => {
    mapBridgeNotifiers?.notifySelection();
  }, [selectedId, mapBridgeNotifiers]);

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

  const elementsSorted = useMemo(
    () => [...envelope.elements].sort((a, b) => a.y - b.y),
    [envelope.elements]
  );

  const selected = useMemo(
    () => (selectedId ? envelope.elements.find((e) => e.id === selectedId) ?? null : null),
    [envelope.elements, selectedId]
  );

  const onAdd = useCallback(
    (type: ElementType) => {
      const next = createMapElement(type, envelope.world);
      setEnvelope((prev) => ({ ...prev, elements: [...prev.elements, next] }));
      setSelectedId(next.id);
    },
    [envelope.world]
  );

  const onUpdateSelected = useCallback(
    (patch: Partial<Pick<MapElement, 'name' | 'color' | 'width' | 'height' | 'imgSrc' | 'description'>>) => {
      if (!selectedId) return;
      setEnvelope((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => (el.id === selectedId ? { ...el, ...patch } : el))
      }));
    },
    [selectedId]
  );

  const onElementDragEnd = useCallback((id: string, x: number, y: number) => {
    setEnvelope((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, x, y } : el))
    }));
  }, []);

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
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 900);
    onSaveSite();
  }, [onSaveSite]);

  const onPublishClick = useCallback(() => {
    onPreviewPublic();
  }, [onPreviewPublic]);

  return (
    <div className="relative flex h-[min(76vh,760px)] w-full min-h-[min(64vh,600px)] overflow-hidden bg-slate-950">
      <div ref={mapWrapRef} className="relative h-full w-[80%] min-w-0">
        <AquaMapCanvas
          width={stageSize.w}
          height={stageSize.h}
          worldW={envelope.world.w}
          worldH={envelope.world.h}
          elementsSorted={elementsSorted}
          camera={camera}
          setCamera={setCamera}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onElementDragEnd={onElementDragEnd}
          readOnly={false}
        />
        <AquaMapLegend />
        <AquaMapZoomHud onZoomIn={onZoomIn} onZoomOut={onZoomOut} onReset={onResetView} />
        {saveFlash ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-teal-500/40 bg-teal-950/90 px-4 py-1.5 text-xs font-semibold text-teal-100 shadow-lg">
            Listo: pulsa Guardar en el panel del sitio para publicar
          </div>
        ) : null}
      </div>
      <AquaMapSidebar
        elements={envelope.elements}
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
});
