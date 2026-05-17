import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { subscribeParkingSpots } from '../lib/parkingRealtime.js';
import { getLandingPage } from '../lib/dataLayer.js';
import { AquaMapCanvas } from './AquaMapCanvas';
import { AquaMapParkingOverlays } from './AquaMapParkingOverlays';
import { AquaMapZoomHud } from './AquaMapZoomHud';
import { LANDING_CAMERA_LIMITS, contentFitCamera } from './aquaMapCameraConstraints';
import { createMapElement } from './elementDefaults';
import {
  computeNextParkingSpotPlacement,
  findParkingSpotByCode,
  normalizeParkingSpotCode,
  snapParkingGeometry
} from './parkingLayout';
import { countParkingSpots } from './parkingSpotStats';
import {
  estadoToParkingStatus,
  mergeParkingLiveIntoElements,
  removeParkingElementFromDbSafe,
  syncParkingElementToDbSafe,
  syncParkingOperationalToDb,
  syncParkingPatchToDbSafe,
  type ParkingSpotLive
} from './parkingSpotsSync';
import { ensureAquamapEnvelopeFromSiteJson, type AquamapSiteEnvelope } from './siteEnvelope';
import type { MapElement } from './types';
import './aquamapEditor.css';

const LANDING_PAGE_ID = 'main';
const DEFAULT_JSON = '{"format":"aquamap-v1","world":{"w":1000,"h":620},"elements":[]}';

type Props = {
  onBack?: () => void;
};

export function ParkingWorkerApp({ onBack }: Props) {
  const [envelope, setEnvelope] = useState<AquamapSiteEnvelope>(() =>
    ensureAquamapEnvelopeFromSiteJson(DEFAULT_JSON, { view: 'estacionamiento' })
  );
  const [parkingById, setParkingById] = useState<Record<string, ParkingSpotLive>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [spotDraft, setSpotDraft] = useState('');
  const [spotError, setSpotError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 360, h: 480 });

  const viewport = useMemo(() => ({ width: stageSize.w, height: stageSize.h }), [stageSize]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await getLandingPage({ id: LANDING_PAGE_ID });
        const row = res.data?.landingPage;
        const json =
          row?.mapaEstacionamientoJson || row?.mapaDistribucionJson || DEFAULT_JSON;
        if (!cancelled) {
          setEnvelope(ensureAquamapEnvelopeFromSiteJson(json, { view: 'estacionamiento' }));
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError('No se pudo cargar el plano del patio.');
          console.warn(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeParkingSpots(
      (spots) => {
        const next: Record<string, ParkingSpotLive> = {};
        for (const s of spots) {
          if (s?.id) next[String(s.id)] = s as ParkingSpotLive;
        }
        setParkingById(next);
      },
      (err) => console.warn('[parking worker]', err)
    );
  }, []);

  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStageSize({
        w: Math.max(280, Math.floor(r.width)),
        h: Math.max(320, Math.floor(r.height))
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!loading) {
      setCamera(
        contentFitCamera(viewport, envelope.world, envelope.elements, LANDING_CAMERA_LIMITS)
      );
    }
  }, [loading, envelope.world.w, envelope.world.h, viewport.width, viewport.height]);

  const displayElements = useMemo(
    () =>
      mergeParkingLiveIntoElements(envelope.elements, parkingById, {
        world: envelope.world,
        audience: 'worker'
      }),
    [envelope.elements, envelope.world, parkingById]
  );

  const elementsSorted = useMemo(
    () => [...displayElements].sort((a, b) => a.y - b.y),
    [displayElements]
  );

  const selected = useMemo(
    () => (selectedId ? displayElements.find((e) => e.id === selectedId) ?? null : null),
    [displayElements, selectedId]
  );

  const liveSelected = useMemo(() => {
    if (!selected || selected.type !== 'parking') return null;
    const code = normalizeParkingSpotCode(selected.name);
    return code ? parkingById[code] : null;
  }, [parkingById, selected]);

  const counts = useMemo(() => countParkingSpots(displayElements), [displayElements]);

  const onAddSpot = useCallback(() => {
    const raw = spotDraft.trim();
    if (!raw) return;
    const code = normalizeParkingSpotCode(raw);
    if (findParkingSpotByCode(envelope.elements, code)) {
      setSpotError(`Ya existe «${code}».`);
      return;
    }
    const next = createMapElement('parking', envelope.world);
    next.name = code;
    const place = computeNextParkingSpotPlacement(envelope.elements, envelope.world);
    next.x = place.x;
    next.y = place.y;
    setEnvelope((prev) => ({ ...prev, elements: [...prev.elements, next] }));
    setSelectedId(next.id);
    setSpotDraft('');
    setSpotError(null);
    syncParkingElementToDbSafe(next, envelope.world);
  }, [envelope.elements, envelope.world, spotDraft]);

  const onDeleteSelected = useCallback(() => {
    if (!selected) return;
    removeParkingElementFromDbSafe(selected);
    setEnvelope((prev) => ({
      ...prev,
      elements: prev.elements.filter((e) => e.id !== selected.id)
    }));
    setSelectedId(null);
  }, [selected]);

  const onGeometryChange = useCallback(
    (id: string, geom: { x: number; y: number; width: number; height: number }) => {
      const el = envelope.elements.find((e) => e.id === id);
      if (!el || el.type !== 'parking') return;
      const nextGeom = snapParkingGeometry(geom);
      setEnvelope((prev) => ({
        ...prev,
        elements: prev.elements.map((e) => (e.id === id ? { ...e, ...nextGeom } : e))
      }));
      syncParkingPatchToDbSafe(el, envelope.world, nextGeom);
    },
    [envelope.elements, envelope.world]
  );

  const saveOperational = useCallback(
    async (patch: {
      estado: string;
      placas: string;
      modelo: string;
      reservadoPor: string;
    }) => {
      if (!selected || selected.type !== 'parking') return;
      const code = normalizeParkingSpotCode(selected.name);
      if (!code) return;
      setSaving(true);
      try {
        await syncParkingOperationalToDb(code, patch);
        const st = patch.estado as ParkingSpotStatus;
        setEnvelope((prev) => ({
          ...prev,
          elements: prev.elements.map((e) =>
            e.id === selected.id ? { ...e, parkingStatus: st } : e
          )
        }));
      } finally {
        setSaving(false);
      }
    },
    [selected]
  );

  const zoomPercent = Math.round(100 * camera.scale);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f172a] text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-teal-900/40 bg-[#111827] px-3 py-2.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-600 px-2.5 py-1.5 text-[11px] font-bold text-slate-200"
          >
            ← Volver
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-black uppercase tracking-wide text-white">Patio · operación</h1>
          <p className="text-[10px] text-slate-400">Arrastra cajones · toca para datos del vehículo</p>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
          {counts.libre} libres
        </span>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-teal-900/30 px-3 py-2">
        <input
          type="text"
          placeholder="ID cajón (P-01)"
          value={spotDraft}
          onChange={(e) => {
            setSpotDraft(e.target.value);
            if (spotError) setSpotError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && onAddSpot()}
          className="min-w-0 flex-1 rounded-lg border border-teal-800/50 bg-[#0b1220] px-2.5 py-2 font-mono text-sm"
        />
        <button
          type="button"
          disabled={!spotDraft.trim()}
          onClick={onAddSpot}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-black uppercase text-white disabled:opacity-40"
        >
          + Cajón
        </button>
      </div>
      {spotError ? (
        <p className="px-3 pb-1 text-[11px] font-medium text-rose-400" role="alert">
          {spotError}
        </p>
      ) : null}

      <div ref={mapWrapRef} className="relative min-h-0 flex-1">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Cargando plano…
          </div>
        ) : loadError ? (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-rose-300">
            {loadError}
          </div>
        ) : (
          <>
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
              onElementGeometryChange={onGeometryChange}
              readOnly={false}
              cameraLimits={LANDING_CAMERA_LIMITS}
              visualMode="editor"
              yardVariant="parking"
              parkingAudience="worker"
            />
            <AquaMapParkingOverlays />
            <AquaMapZoomHud
              onZoomIn={() =>
                setCamera((c) => ({
                  ...c,
                  scale: Math.min(LANDING_CAMERA_LIMITS.maxScale, c.scale * 1.12)
                }))
              }
              onZoomOut={() =>
                setCamera((c) => ({
                  ...c,
                  scale: Math.max(LANDING_CAMERA_LIMITS.minScale, c.scale / 1.12)
                }))
              }
              onReset={() =>
                setCamera(
                  contentFitCamera(
                    viewport,
                    envelope.world,
                    envelope.elements,
                    LANDING_CAMERA_LIMITS
                  )
                )
              }
              zoomPercent={zoomPercent}
            />
          </>
        )}
      </div>

      {selected && selected.type === 'parking' ? (
        <WorkerSpotSheet
          spotCode={normalizeParkingSpotCode(selected.name)}
          live={liveSelected}
          saving={saving}
          onClose={() => setSelectedId(null)}
          onDelete={onDeleteSelected}
          onSave={saveOperational}
        />
      ) : null}
    </div>
  );
}

function WorkerSpotSheet({
  spotCode,
  live,
  saving,
  onClose,
  onDelete,
  onSave
}: {
  spotCode: string;
  live: ParkingSpotLive | null;
  saving: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSave: (p: { estado: string; placas: string; modelo: string; reservadoPor: string }) => void;
}) {
  const [estado, setEstado] = useState(live?.estado || 'libre');
  const [placas, setPlacas] = useState(live?.placas || '');
  const [modelo, setModelo] = useState(live?.modelo || '');
  const [reservadoPor, setReservadoPor] = useState(live?.reservadoPor || '');

  useEffect(() => {
    setEstado(live?.estado || 'libre');
    setPlacas(live?.placas || '');
    setModelo(live?.modelo || '');
    setReservadoPor(live?.reservadoPor || '');
  }, [live, spotCode]);

  return (
    <div className="shrink-0 border-t border-teal-800/50 bg-[#111827] p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.35)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-lg font-black text-white">{spotCode || '—'}</p>
        <button type="button" onClick={onClose} className="text-xs font-bold text-slate-400">
          Cerrar
        </button>
      </div>
      <label className="mb-2 block text-[10px] font-bold uppercase text-slate-500">Estado</label>
      <select
        value={estado}
        onChange={(e) => setEstado(e.target.value)}
        className="mb-3 w-full rounded-lg border border-slate-600 bg-[#0b1220] px-2 py-2 text-sm"
      >
        <option value="libre">Libre</option>
        <option value="reservado">Reservado</option>
        <option value="ocupado">Ocupado</option>
        <option value="sucio">Sucio</option>
        <option value="mantenimiento">Mantenimiento</option>
        <option value="taller">Taller</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] font-bold uppercase text-slate-500">
          Placas
          <input
            value={placas}
            onChange={(e) => setPlacas(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-[#0b1220] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-[10px] font-bold uppercase text-slate-500">
          Modelo
          <input
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-[#0b1220] px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <label className="mt-2 block text-[10px] font-bold uppercase text-slate-500">
        Nota / reservado por
        <input
          value={reservadoPor}
          onChange={(e) => setReservadoPor(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-[#0b1220] px-2 py-1.5 text-sm"
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave({ estado, placas, modelo, reservadoPor })}
          className="rounded-lg bg-teal-600 py-2.5 text-sm font-black text-white disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-rose-800 bg-rose-950/50 py-2.5 text-sm font-black text-rose-200"
        >
          Eliminar cajón
        </button>
      </div>
    </div>
  );
}
