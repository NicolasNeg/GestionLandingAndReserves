import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react';
import { AquaMapBootOverlay } from './AquaMapBootOverlay';
import { AquaMapCanvas } from './AquaMapCanvas';
import { AquaMapContextMenu } from './AquaMapContextMenu';
import { AquaMapEditorChrome } from './AquaMapEditorChrome';
import { AquaMapLegend } from './AquaMapLegend';
import { AquaMapSidebar } from './AquaMapSidebar';
import { AquaMapZoomHud } from './AquaMapZoomHud';
import { createMapElement, presetSizeForType } from './elementDefaults';
import type { ElementType, MapElement } from './types';
import {
  ensureAquamapEnvelopeFromSiteJson,
  serializeAquamapSiteEnvelope,
  type AquamapSiteEnvelope
} from './siteEnvelope';
import { MAP_LAYER_CONFIG, type MapLayerContext } from './mapLayers';
import { defaultSpriteForType } from './spriteUrls';
import { useAquaMapEditorCommands } from './useAquaMapEditorCommands';
import './aquamapEditor.css';

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
  mapContext?: MapLayerContext;
  onChangeJson: (json: string) => void;
  onSaveSite: () => void;
  onPreviewPublic: () => void;
  mapBridgeNotifiers?: MapBridgeNotifiers | null;
};

function legacyViewForContext(ctx: MapLayerContext): string {
  if (ctx === 'mesas') return 'mesas';
  if (ctx === 'estacionamiento') return 'estacionamiento';
  if (ctx === 'albercas') return 'albercas';
  return 'global';
}

async function preloadImageUrls(urls: string[]): Promise<void> {
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          if (src.startsWith('data:')) {
            resolve();
            return;
          }
          const im = new window.Image();
          im.crossOrigin = 'anonymous';
          im.onload = () => resolve();
          im.onerror = () => resolve();
          im.src = src;
        })
    )
  );
}

function collectAssetUrls(envelope: AquamapSiteEnvelope): string[] {
  const set = new Set<string>();
  const types: ElementType[] = ['pool', 'slide', 'service', 'tree', 'mesa', 'parking'];
  for (const t of types) set.add(defaultSpriteForType(t));
  for (const el of envelope.elements) {
    const u = el.imgSrc?.trim();
    if (u && !u.startsWith('data:')) set.add(u);
  }
  return [...set];
}

export const AquaMapSiteEditor = forwardRef<AquaMapSiteEditorHandle, Props>(function AquaMapSiteEditor(
  { initialJson, mapContext = 'parque', onChangeJson, onSaveSite, onPreviewPublic, mapBridgeNotifiers },
  ref
) {
  const layerConfig = MAP_LAYER_CONFIG[mapContext];
  const legacyView = legacyViewForContext(mapContext);
  const [envelope, setEnvelope] = useState<AquamapSiteEnvelope>(() =>
    ensureAquamapEnvelopeFromSiteJson(initialJson, { view: legacyView })
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [saveFlash, setSaveFlash] = useState(false);
  const [booting, setBooting] = useState(true);
  const [spaceDown, setSpaceDown] = useState(false);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });
  const externalSyncRef = useRef(false);
  const envelopeRef = useRef(envelope);
  const skipNextChangeEmitRef = useRef(true);
  envelopeRef.current = envelope;

  const zoomPercentUi = Math.round(100 * camera.scale);

  useImperativeHandle(ref, () => ({
    getJson: () => serializeAquamapSiteEnvelope(envelopeRef.current),
    setJson: (json: string) => {
      externalSyncRef.current = true;
      skipNextChangeEmitRef.current = true;
      setEnvelope(ensureAquamapEnvelopeFromSiteJson(json, { view: legacyView }));
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
    let cancelled = false;
    setBooting(true);
    const env = ensureAquamapEnvelopeFromSiteJson(initialJson, { view: legacyView });
    const urls = collectAssetUrls(env);
    void (async () => {
      await preloadImageUrls(urls);
      await new Promise((r) => window.setTimeout(r, 260));
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialJson, legacyView]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      const root = document.querySelector('[data-aquamap-editor-root]');
      if (!root) return;
      if (t && t !== document.body && !root.contains(t)) return;
      e.preventDefault();
      setSpaceDown(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, []);

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

  const onElementGeometryChange = useCallback(
    (id: string, geom: { x: number; y: number; width: number; height: number }) => {
      setEnvelope((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => (el.id === id ? { ...el, ...geom } : el))
      }));
    },
    []
  );

  const onWorldChange = useCallback((patch: Partial<{ w: number; h: number }>) => {
    setEnvelope((prev) => ({
      ...prev,
      world: {
        w: Math.max(400, Math.round(patch.w ?? prev.world.w)),
        h: Math.max(280, Math.round(patch.h ?? prev.world.h))
      }
    }));
  }, []);

  const onApplyPresetSize = useCallback(() => {
    if (!selected) return;
    const { width, height } = presetSizeForType(selected.type);
    onUpdateSelected({ width, height });
  }, [selected, onUpdateSelected]);

  const {
    contextMenu,
    closeContextMenu,
    openContextMenu,
    runContextAction,
    canPaste,
    hasSelection,
    deleteSelected,
    duplicateSelected
  } = useAquaMapEditorCommands({
    envelope,
    setEnvelope,
    selectedId,
    setSelectedId
  });

  const onZoomIn = useCallback(() => {
    setCamera((c) => ({ ...c, scale: Math.min(2.35, c.scale * 1.12) }));
  }, []);
  const onZoomOut = useCallback(() => {
    setCamera((c) => ({ ...c, scale: Math.max(0.42, c.scale / 1.12) }));
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

  const chromeTrailing = spaceDown ? (
    <span className="rounded border border-[#e87d3e]/40 bg-[#2a2018] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[#f4a261]">
      Pan · suelta Espacio para editar
    </span>
  ) : null;

  return (
    <div
      data-aquamap-editor-root
      className="relative flex h-[min(76vh,760px)] w-full min-h-[min(64vh,600px)] overflow-hidden bg-[#262626]"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2 pr-1">
        <AquaMapEditorChrome
          zoomPercent={zoomPercentUi}
          trailing={
            <>
              <span className="font-mono text-[10px] text-[#a3a3a3]">{layerConfig.label}</span>
              {chromeTrailing}
            </>
          }
        >
          <div
            ref={mapWrapRef}
            className={`relative h-full w-full min-h-[280px] ${spaceDown ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            {booting ? <AquaMapBootOverlay /> : null}
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
              onElementGeometryChange={onElementGeometryChange}
              readOnly={false}
              blockElementPointer={spaceDown}
              onContextRequest={spaceDown ? undefined : openContextMenu}
            />
            <AquaMapContextMenu
              open={contextMenu.open}
              x={contextMenu.x}
              y={contextMenu.y}
              hasSelection={hasSelection}
              canPaste={canPaste}
              onAction={runContextAction}
              onClose={closeContextMenu}
            />
            <AquaMapLegend />
            <AquaMapZoomHud
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onReset={onResetView}
              zoomPercent={zoomPercentUi}
            />
            {saveFlash ? (
              <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded border border-[#2a5248] bg-[#1a2e28]/95 px-4 py-1.5 font-mono text-[11px] font-medium text-[#86efac] shadow-lg transition-opacity duration-300">
                Listo · Guardar en el panel del sitio para publicar
              </div>
            ) : null}
          </div>
        </AquaMapEditorChrome>
      </div>
      <AquaMapSidebar
        layerLabel={layerConfig.label}
        layerHint={layerConfig.shortHint}
        allowedTypes={layerConfig.allowedTypes}
        world={envelope.world}
        elements={envelope.elements}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        selected={selected}
        onAdd={onAdd}
        onUpdateSelected={onUpdateSelected}
        onWorldChange={onWorldChange}
        onApplyPresetSize={onApplyPresetSize}
        onDuplicateSelected={duplicateSelected}
        onDeleteSelected={deleteSelected}
        onSaveClick={onSaveClick}
        onPublishClick={onPublishClick}
      />
    </div>
  );
});
