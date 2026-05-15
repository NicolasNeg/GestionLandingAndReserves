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
import { AquaMapEditorToolbar } from './AquaMapEditorToolbar';
import { AquaMapLegend } from './AquaMapLegend';
import { AquaMapSidebar } from './AquaMapSidebar';
import { AquaMapZoomHud } from './AquaMapZoomHud';
import {
  contentFitCamera,
  EDITOR_CAMERA_LIMITS,
  LANDING_CAMERA_LIMITS
} from './aquaMapCameraConstraints';
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
import { useAquamapHistory } from './useAquamapHistory';
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

function isTypingTarget(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t) return false;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return true;
  return Boolean(t.isContentEditable);
}

export const AquaMapSiteEditor = forwardRef<AquaMapSiteEditorHandle, Props>(function AquaMapSiteEditor(
  { initialJson, mapContext = 'parque', onChangeJson, onSaveSite, onPreviewPublic, mapBridgeNotifiers },
  ref
) {
  const layerConfig = MAP_LAYER_CONFIG[mapContext];
  const legacyView = legacyViewForContext(mapContext);
  const initialEnvelope = useMemo(
    () => ensureAquamapEnvelopeFromSiteJson(initialJson, { view: legacyView }),
    [initialJson, legacyView]
  );

  const {
    envelope,
    setEnvelope,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory
  } = useAquamapHistory(initialEnvelope);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [previewMode, setPreviewMode] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [booting, setBooting] = useState(true);
  const [spaceDown, setSpaceDown] = useState(false);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });
  const externalSyncRef = useRef(false);
  const envelopeRef = useRef(envelope);
  const skipNextChangeEmitRef = useRef(true);
  envelopeRef.current = envelope;

  const viewport = useMemo(() => ({ width: stageSize.w, height: stageSize.h }), [stageSize]);
  const cameraLimits = previewMode ? LANDING_CAMERA_LIMITS : EDITOR_CAMERA_LIMITS;
  const visualMode = previewMode ? 'public' : 'editor';
  const canvasReadOnly = previewMode;

  const zoomPercentUi = Math.round(100 * camera.scale);

  const fitCameraToContent = useCallback(() => {
    const limits = previewMode ? LANDING_CAMERA_LIMITS : EDITOR_CAMERA_LIMITS;
    const next = contentFitCamera(viewport, envelope.world, envelope.elements, limits);
    setCamera(next);
  }, [envelope.elements, envelope.world, previewMode, viewport]);

  useImperativeHandle(ref, () => ({
    getJson: () => serializeAquamapSiteEnvelope(envelopeRef.current),
    setJson: (json: string) => {
      externalSyncRef.current = true;
      skipNextChangeEmitRef.current = true;
      const next = ensureAquamapEnvelopeFromSiteJson(json, { view: legacyView });
      resetHistory(next);
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
      const t = e.target as HTMLElement | null;
      const root = document.querySelector('[data-aquamap-editor-root]');
      if (!root || (t && t !== document.body && !root.contains(t))) return;

      if (e.code === 'Space' && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSpaceDown(true);
        return;
      }

      if (isTypingTarget(e.target) || previewMode) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
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
  }, [previewMode, redo, undo]);

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

  useEffect(() => {
    if (!booting && previewMode) fitCameraToContent();
  }, [booting, previewMode, fitCameraToContent]);

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
    [envelope.world, setEnvelope]
  );

  const onUpdateSelected = useCallback(
    (patch: Partial<Pick<MapElement, 'name' | 'color' | 'width' | 'height' | 'imgSrc' | 'description'>>) => {
      if (!selectedId) return;
      setEnvelope((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => (el.id === selectedId ? { ...el, ...patch } : el))
      }));
    },
    [selectedId, setEnvelope]
  );

  const onElementGeometryChange = useCallback(
    (id: string, geom: { x: number; y: number; width: number; height: number }) => {
      setEnvelope((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => (el.id === id ? { ...el, ...geom } : el))
      }));
    },
    [setEnvelope]
  );

  const onWorldChange = useCallback(
    (patch: Partial<{ w: number; h: number }>) => {
      setEnvelope((prev) => ({
        ...prev,
        world: {
          w: Math.max(400, Math.round(patch.w ?? prev.world.w)),
          h: Math.max(280, Math.round(patch.h ?? prev.world.h))
        }
      }));
    },
    [setEnvelope]
  );

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
    setCamera((c) => ({ ...c, scale: Math.min(cameraLimits.maxScale, c.scale * 1.12) }));
  }, [cameraLimits.maxScale]);
  const onZoomOut = useCallback(() => {
    setCamera((c) => ({ ...c, scale: Math.max(cameraLimits.minScale, c.scale / 1.12) }));
  }, [cameraLimits.minScale]);
  const onResetView = useCallback(() => {
    if (previewMode) fitCameraToContent();
    else setCamera({ x: 0, y: 0, scale: 1 });
  }, [fitCameraToContent, previewMode]);

  const onTogglePreview = useCallback(() => {
    setPreviewMode((p) => {
      const next = !p;
      if (next) {
        window.requestAnimationFrame(() => fitCameraToContent());
      }
      return next;
    });
  }, [fitCameraToContent]);

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
  ) : previewMode ? (
    <span className="rounded border border-[#5eead4]/40 bg-[#1a2e28] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[#86efac]">
      Vista previa publica
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
          toolbar={
            <AquaMapEditorToolbar
              canUndo={canUndo}
              canRedo={canRedo}
              previewMode={previewMode}
              onUndo={undo}
              onRedo={redo}
              onTogglePreview={onTogglePreview}
              onFit={fitCameraToContent}
            />
          }
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
              readOnly={canvasReadOnly}
              blockElementPointer={spaceDown || previewMode}
              onContextRequest={spaceDown || previewMode ? undefined : openContextMenu}
              cameraLimits={cameraLimits}
              visualMode={visualMode}
            />
            {!previewMode ? (
              <AquaMapContextMenu
                open={contextMenu.open}
                x={contextMenu.x}
                y={contextMenu.y}
                hasSelection={hasSelection}
                canPaste={canPaste}
                onAction={runContextAction}
                onClose={closeContextMenu}
              />
            ) : null}
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
        addDisabled={previewMode}
      />
    </div>
  );
});
