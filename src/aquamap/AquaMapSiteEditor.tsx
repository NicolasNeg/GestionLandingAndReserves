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
import type { AquaMapYardVariant } from './AquaMapCanvas';
import { AquaMapCanvas } from './AquaMapCanvas';
import { AquaMapContextMenu } from './AquaMapContextMenu';
import { AquaMapEditorChrome } from './AquaMapEditorChrome';
import { AquaMapEditorToolbar } from './AquaMapEditorToolbar';
import { AquaMapLegend } from './AquaMapLegend';
import { AquaMapParkingChrome } from './AquaMapParkingChrome';
import { AquaMapParkingOverlays } from './AquaMapParkingOverlays';
import { AquaMapSidebar } from './AquaMapSidebar';
import { AquaMapZoomHud } from './AquaMapZoomHud';
import {
  contentFitCamera,
  EDITOR_CAMERA_LIMITS,
  LANDING_CAMERA_LIMITS
} from './aquaMapCameraConstraints';
import { buildAquamapFilterChips } from './aquaMapPublicFilters';
import { createMapElement, presetSizeForType } from './elementDefaults';
import {
  computeNextParkingSpotPlacement,
  findParkingSpotByCode,
  normalizeParkingSpotCode,
  snapParkingGeometry
} from './parkingLayout';
import { countParkingSpots } from './parkingSpotStats';
import {
  removeParkingElementFromDbSafe,
  syncAllParkingElementsToDbSafe,
  syncParkingElementToDbSafe,
  syncParkingPatchToDbSafe
} from './parkingSpotsSync';
import type { ElementType, MapElement } from './types';
import {
  ensureAquamapEnvelopeFromSiteJson,
  serializeAquamapSiteEnvelope,
  type AquamapSiteEnvelope
} from './siteEnvelope';
import { MAP_LAYER_CONFIG, type MapLayerContext } from './mapLayers';
import { defaultSpriteForType } from './spriteUrls';
import { AQUAMAP_WORLD_MAX_H, AQUAMAP_WORLD_MAX_W } from './world';
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
  /** Vuelve el foco al panel Sitio (guardar / pestañas) sin abrir la landing. */
  onExitToSitePanel?: () => void;
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
  {
    initialJson,
    mapContext = 'parque',
    onChangeJson,
    onSaveSite,
    onPreviewPublic,
    onExitToSitePanel,
    mapBridgeNotifiers
  },
  ref
) {
  const layerConfig = MAP_LAYER_CONFIG[mapContext];
  const editorSkin = mapContext === 'estacionamiento' ? 'parking' : 'aquatic';
  const yardVariant: AquaMapYardVariant = mapContext === 'estacionamiento' ? 'parking' : 'island';
  const syncParkingDb = yardVariant === 'parking';
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
  const [editorTypeFilter, setEditorTypeFilter] = useState<string>('all');
  const [parkingSpotDraft, setParkingSpotDraft] = useState('');
  const [parkingSpotError, setParkingSpotError] = useState<string | null>(null);
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

  const filterChips = useMemo(
    () => buildAquamapFilterChips(envelope.elements),
    [envelope.elements]
  );

  const elementsSorted = useMemo(
    () => [...envelope.elements].sort((a, b) => a.y - b.y),
    [envelope.elements]
  );

  const selected = useMemo(
    () => (selectedId ? envelope.elements.find((e) => e.id === selectedId) ?? null : null),
    [envelope.elements, selectedId]
  );

  const parkingCounts = useMemo(
    () => (yardVariant === 'parking' ? countParkingSpots(envelope.elements) : undefined),
    [envelope.elements, yardVariant]
  );

  const onParkingSpotDraftChange = useCallback((v: string) => {
    setParkingSpotDraft(v);
    if (parkingSpotError) setParkingSpotError(null);
  }, [parkingSpotError]);

  const onAdd = useCallback(
    (type: ElementType) => {
      const next = createMapElement(type, envelope.world);
      if (syncParkingDb && type === 'parking') {
        const place = computeNextParkingSpotPlacement(envelope.elements, envelope.world);
        next.x = place.x;
        next.y = place.y;
        const code = normalizeParkingSpotCode(next.name);
        if (code) next.name = code;
      }
      setEnvelope((prev) => ({ ...prev, elements: [...prev.elements, next] }));
      setSelectedId(next.id);
      if (syncParkingDb && type === 'parking') syncParkingElementToDbSafe(next, envelope.world);
    },
    [envelope.elements, envelope.world, setEnvelope, syncParkingDb]
  );

  const onAddParkingSpot = useCallback(() => {
    const raw = parkingSpotDraft.trim();
    if (!raw) return;
    const code = normalizeParkingSpotCode(raw);
    if (findParkingSpotByCode(envelope.elements, code)) {
      setParkingSpotError(`Ya existe un cajón con el código «${code}».`);
      return;
    }
    const next = createMapElement('parking', envelope.world);
    next.name = code;
    const place = computeNextParkingSpotPlacement(envelope.elements, envelope.world);
    next.x = place.x;
    next.y = place.y;
    setEnvelope((prev) => ({ ...prev, elements: [...prev.elements, next] }));
    setSelectedId(next.id);
    setParkingSpotDraft('');
    setParkingSpotError(null);
    if (syncParkingDb) syncParkingElementToDbSafe(next, envelope.world);
  }, [envelope.elements, envelope.world, parkingSpotDraft, setEnvelope, syncParkingDb]);

  const onUpdateSelected = useCallback(
    (
      patch: Partial<
        Pick<MapElement, 'name' | 'color' | 'width' | 'height' | 'imgSrc' | 'description' | 'parkingStatus'>
      >
    ) => {
      if (!selectedId) return;
      const current = envelope.elements.find((e) => e.id === selectedId);
      if (!current) return;
      if (patch.name != null && yardVariant === 'parking') {
        const code = normalizeParkingSpotCode(patch.name);
        if (!code) return;
        const dup = findParkingSpotByCode(envelope.elements, code, selectedId);
        if (dup) {
          setParkingSpotError(`Ya existe un cajón con el código «${code}».`);
          return;
        }
        setParkingSpotError(null);
        patch = { ...patch, name: code };
      }
      const merged = { ...current, ...patch };
      setEnvelope((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => (el.id === selectedId ? merged : el))
      }));
      if (syncParkingDb && current.type === 'parking') {
        syncParkingPatchToDbSafe(current, envelope.world, patch);
      }
    },
    [envelope.elements, envelope.world, selectedId, setEnvelope, syncParkingDb, yardVariant]
  );

  const onElementGeometryChange = useCallback(
    (id: string, geom: { x: number; y: number; width: number; height: number }) => {
      const el = envelope.elements.find((e) => e.id === id);
      const nextGeom =
        yardVariant === 'parking' && el?.type === 'parking' ? snapParkingGeometry(geom) : geom;
      setEnvelope((prev) => ({
        ...prev,
        elements: prev.elements.map((e) => (e.id === id ? { ...e, ...nextGeom } : e))
      }));
      if (syncParkingDb && el?.type === 'parking') {
        syncParkingPatchToDbSafe(el, envelope.world, nextGeom);
      }
    },
    [envelope.elements, envelope.world, setEnvelope, syncParkingDb, yardVariant]
  );

  const onWorldChange = useCallback(
    (patch: Partial<{ w: number; h: number }>) => {
      setEnvelope((prev) => ({
        ...prev,
        world: {
          w: Math.min(
            AQUAMAP_WORLD_MAX_W,
            Math.max(400, Math.round(patch.w ?? prev.world.w))
          ),
          h: Math.min(
            AQUAMAP_WORLD_MAX_H,
            Math.max(280, Math.round(patch.h ?? prev.world.h))
          )
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

  const onParkingElementDeleted = useCallback(
    (el: MapElement) => {
      if (syncParkingDb && el.type === 'parking') removeParkingElementFromDbSafe(el);
    },
    [syncParkingDb]
  );

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
    setSelectedId,
    onElementDeleted: onParkingElementDeleted
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
    if (syncParkingDb) syncAllParkingElementsToDbSafe(envelope);
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 900);
    onSaveSite();
  }, [envelope, onSaveSite, syncParkingDb]);

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
      className="relative flex h-[min(68vh,620px)] w-full min-h-[min(52vh,480px)] overflow-hidden bg-[#262626]"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2 pr-1">
        {yardVariant === 'parking' && !previewMode ? (
          <AquaMapParkingChrome
            spotDraft={parkingSpotDraft}
            spotError={parkingSpotError}
            counts={parkingCounts}
            onSpotDraftChange={onParkingSpotDraftChange}
            onAddSpot={onAddParkingSpot}
            disabled={previewMode}
          />
        ) : null}
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
            {!booting && filterChips.length > 1 ? (
              <div className="pointer-events-auto absolute left-3 right-16 top-3 z-[18] flex flex-wrap gap-1 sm:right-20">
                {filterChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    title="Filtrar piezas visibles (solo resalta tipos; no borra nada)"
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow ${
                      editorTypeFilter === chip.id
                        ? 'border-[#5eead4]/60 bg-[#1a2e28] text-[#86efac]'
                        : 'border-[#404040] bg-[#2a2a2a]/95 text-[#a3a3a3] hover:border-[#525252]'
                    }`}
                    onClick={() => setEditorTypeFilter(chip.id)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            ) : null}
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
              publicFilter={editorTypeFilter}
              yardVariant={yardVariant}
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
            {yardVariant === 'parking' ? <AquaMapParkingOverlays /> : <AquaMapLegend />}
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
        editorSkin={editorSkin}
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
        onExitToSitePanel={onExitToSitePanel}
        addDisabled={previewMode}
        hideQuickAdd={yardVariant === 'parking'}
      />
    </div>
  );
});
