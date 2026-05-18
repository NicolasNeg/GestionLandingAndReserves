import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createMapElement } from './elementDefaults';
import {
  alignParkingSpotsY,
  buildParkingRowElements,
  computeNextParkingSpotPlacement,
  findParkingSpotByCode,
  normalizeParkingSpotCode,
  suggestNextParkingCode
} from './parkingLayout';
import './parkingYardSandbox.css';
import {
  elementCenterPercent,
  mergeParkingLiveIntoElements,
  removeParkingElementFromDbSafe,
  syncParkingElementToDbSafe,
  syncParkingOperationalToDb,
  syncParkingPatchToDbSafe,
  type ParkingSpotLive
} from './parkingSpotsSync';
import { countParkingSpots } from './parkingSpotStats';
import type { AquamapSiteEnvelope } from './siteEnvelope';
import type { MapElement } from './types';

type Props = {
  envelope: AquamapSiteEnvelope;
  setEnvelope: React.Dispatch<React.SetStateAction<AquamapSiteEnvelope>>;
  parkingById: Record<string, ParkingSpotLive>;
  readOnly?: boolean;
  onBack?: () => void;
};

type SlotView = {
  elementId: string;
  code: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
};

const STATUS_TONE: Record<string, string> = {
  libre: 'tone-gray',
  reservado: 'tone-amber',
  ocupado: 'tone-blue',
  sucio: 'tone-amber',
  mantenimiento: 'tone-red',
  taller: 'tone-red'
};

function unitLabel(live: ParkingSpotLive | undefined, code: string): string {
  if (!live) return code;
  const p = (live.placas || '').trim();
  const m = (live.modelo || '').trim();
  if (p) return p;
  if (m) return m.length > 10 ? `${m.slice(0, 9)}…` : m;
  if (live.estado !== 'libre') return code;
  return '';
}

function hasVehicle(live: ParkingSpotLive | undefined): boolean {
  if (!live) return false;
  if (live.placas?.trim() || live.modelo?.trim()) return true;
  return ['ocupado', 'reservado', 'sucio', 'mantenimiento', 'taller'].includes(
    String(live.estado || '').toLowerCase()
  );
}

function slotsFromElements(elements: MapElement[], world: { w: number; h: number }): SlotView[] {
  return elements
    .filter((e) => e.type === 'parking')
    .map((el) => {
      const code = normalizeParkingSpotCode(el.name);
      return {
        elementId: el.id,
        code,
        leftPct: (el.x / world.w) * 100,
        topPct: (el.y / world.h) * 100,
        widthPct: (el.width / world.w) * 100,
        heightPct: (el.height / world.h) * 100
      };
    })
    .filter((s) => s.code);
}

function findElementByCode(elements: MapElement[], code: string): MapElement | undefined {
  return elements.find(
    (e) => e.type === 'parking' && normalizeParkingSpotCode(e.name) === normalizeParkingSpotCode(code)
  );
}

export function ParkingYardSandbox({
  envelope,
  setEnvelope,
  parkingById,
  readOnly = false,
  onBack
}: Props) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [dragCode, setDragCode] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [spotDraft, setSpotDraft] = useState('');
  const [spotError, setSpotError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(0);
  const touchDrag = useRef<{ code: string; x: number; y: number } | null>(null);

  const displayElements = useMemo(
    () =>
      mergeParkingLiveIntoElements(envelope.elements, parkingById, {
        world: envelope.world,
        audience: 'worker'
      }),
    [envelope.elements, envelope.world, parkingById]
  );

  const slots = useMemo(
    () => slotsFromElements(displayElements, envelope.world),
    [displayElements, envelope.world]
  );

  const counts = useMemo(() => countParkingSpots(displayElements), [displayElements]);

  const selectedEl = useMemo(
    () => (selectedCode ? findElementByCode(displayElements, selectedCode) : undefined),
    [displayElements, selectedCode]
  );

  const selectedLive = selectedCode ? parkingById[selectedCode] : undefined;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2000);
  }, []);

  useEffect(() => {
    if (!spotDraft && slots.length) {
      setSpotDraft(suggestNextParkingCode(displayElements));
    }
  }, [displayElements, spotDraft, slots.length]);

  const moveUnitToSlot = useCallback(
    async (fromCode: string, targetCode: string) => {
      if (readOnly || fromCode === targetCode) return;
      const fromEl = findElementByCode(envelope.elements, fromCode);
      const targetEl = findElementByCode(envelope.elements, targetCode);
      if (!fromEl || !targetEl) return;

      const targetCenter = elementCenterPercent(targetEl, envelope.world);
      const fromCenter = elementCenterPercent(fromEl, envelope.world);
      const targetLive = parkingById[targetCode];
      const fromLive = parkingById[fromCode];

      try {
        if (targetLive && hasVehicle(targetLive)) {
          await syncParkingOperationalToDb(fromCode, { x: fromCenter.x, y: fromCenter.y });
          await syncParkingOperationalToDb(targetCode, {
            x: targetCenter.x,
            y: targetCenter.y
          });
          showToast(`Intercambio ${fromCode} ↔ ${targetCode}`);
        } else {
          await syncParkingOperationalToDb(fromCode, {
            x: targetCenter.x,
            y: targetCenter.y,
            estado: fromLive?.estado || 'ocupado'
          });
          showToast(`${fromCode} → ${targetCode}`);
        }

        setEnvelope((prev) => ({
          ...prev,
          elements: prev.elements.map((e) => {
            if (e.id === fromEl.id) {
              return {
                ...e,
                x: targetEl.x,
                y: targetEl.y
              };
            }
            if (targetLive && hasVehicle(targetLive) && e.id === targetEl.id) {
              return { ...e, x: fromEl.x, y: fromEl.y };
            }
            return e;
          })
        }));
        setSelectedCode(targetCode);
      } catch (e) {
        console.warn(e);
        showToast('No se pudo mover');
      }
    },
    [envelope.elements, envelope.world, parkingById, readOnly, setEnvelope, showToast]
  );

  const onSlotActivate = useCallback(
    (code: string) => {
      if (readOnly) {
        setSelectedCode(code);
        setSheetOpen(true);
        return;
      }
      if (selectedCode && selectedCode !== code && hasVehicle(parkingById[selectedCode])) {
        void moveUnitToSlot(selectedCode, code);
        return;
      }
      setSelectedCode(code);
      setSheetOpen(true);
    },
    [moveUnitToSlot, parkingById, readOnly, selectedCode]
  );

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
    syncParkingElementToDbSafe(next, envelope.world);
    setSpotDraft(suggestNextParkingCode([...envelope.elements, next]));
    setSpotError(null);
    setSelectedCode(code);
    setSheetOpen(true);
    showToast(`Cajón ${code} creado`);
  }, [envelope.elements, envelope.world, setEnvelope, showToast, spotDraft]);

  const onAddRow = useCallback(
    (n: number) => {
      const row = buildParkingRowElements(envelope.elements, envelope.world, n);
      if (!row.length) return;
      setEnvelope((prev) => ({ ...prev, elements: [...prev.elements, ...row] }));
      row.forEach((el) => syncParkingElementToDbSafe(el, envelope.world));
      showToast(`Fila de ${row.length} cajones`);
    },
    [envelope.elements, envelope.world, setEnvelope, showToast]
  );

  const onAlignRow = useCallback(() => {
    setEnvelope((prev) => ({
      ...prev,
      elements: alignParkingSpotsY(prev.elements, prev.world)
    }));
    envelope.elements
      .filter((e) => e.type === 'parking')
      .forEach((el) => syncParkingPatchToDbSafe(el, envelope.world, alignParkingSpotsY([el], envelope.world)[0]));
    showToast('Fila alineada');
  }, [envelope.elements, envelope.world, setEnvelope, showToast]);

  const filteredSlots = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return slots;
    return slots.filter((s) => {
      const live = parkingById[s.code];
      const hay = [
        s.code,
        live?.placas,
        live?.modelo,
        live?.estado,
        live?.reservadoPor
      ]
        .join(' ')
        .toUpperCase();
      return hay.includes(q);
    });
  }, [parkingById, search, slots]);

  const saveSheet = useCallback(
    async (patch: { estado: string; placas: string; modelo: string; reservadoPor: string }) => {
      if (!selectedCode || readOnly) return;
      setSaving(true);
      try {
        await syncParkingOperationalToDb(selectedCode, patch);
        const st = patch.estado as MapElement['parkingStatus'];
        const el = findElementByCode(envelope.elements, selectedCode);
        if (el) {
          setEnvelope((prev) => ({
            ...prev,
            elements: prev.elements.map((e) =>
              normalizeParkingSpotCode(e.name) === selectedCode
                ? { ...e, parkingStatus: st }
                : e
            )
          }));
        }
        showToast('Guardado');
      } finally {
        setSaving(false);
      }
    },
    [envelope.elements, readOnly, selectedCode, setEnvelope, showToast]
  );

  const deleteSpot = useCallback(() => {
    if (!selectedEl || readOnly) return;
    removeParkingElementFromDbSafe(selectedEl);
    setEnvelope((prev) => ({
      ...prev,
      elements: prev.elements.filter((e) => e.id !== selectedEl.id)
    }));
    setSelectedCode(null);
    setSheetOpen(false);
    showToast('Cajón eliminado');
  }, [readOnly, selectedEl, setEnvelope, showToast]);

  return (
    <div className="parking-yard-app">
      <header className="parking-yard-scoreboard">
        {onBack ? (
          <button type="button" className="w-full rounded-lg border border-white/15 py-2 text-xs font-bold" onClick={onBack}>
            ← Volver
          </button>
        ) : null}
        <div className="parking-yard-metric">
          <strong>{counts.total}</strong>
          <span>Totales</span>
        </div>
        <div className="parking-yard-metric">
          <strong style={{ color: 'var(--py-green)' }}>{counts.libre}</strong>
          <span>Libres</span>
        </div>
        <div className="parking-yard-metric">
          <strong style={{ color: 'var(--py-amber)' }}>{counts.reservado}</strong>
          <span>Reservados</span>
        </div>
        <div className="parking-yard-metric">
          <strong style={{ color: 'var(--py-red)' }}>{counts.ocupado}</strong>
          <span>Ocupados</span>
        </div>
        <div className="parking-yard-metric">
          <strong>{counts.mantenimiento}</strong>
          <span>Mant.</span>
        </div>
      </header>

      {!readOnly ? (
        <div className="parking-yard-toolbar">
          <input
            type="search"
            placeholder="Buscar placa, MVA, modelo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="text"
            placeholder="ID cajón"
            value={spotDraft}
            onChange={(e) => {
              setSpotDraft(e.target.value);
              setSpotError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && onAddSpot()}
          />
          <button type="button" className="is-primary" onClick={onAddSpot}>
            + Cajón
          </button>
          <button type="button" onClick={() => onAddRow(5)}>
            Fila ×5
          </button>
          <button type="button" onClick={onAlignRow}>
            Alinear
          </button>
        </div>
      ) : (
        <div className="parking-yard-toolbar">
          <input
            type="search"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {spotError ? (
        <p className="px-3 text-[11px] font-semibold text-rose-400" role="alert">
          {spotError}
        </p>
      ) : null}

      <p className="px-3 pb-1 text-[10px] text-slate-400">
        {readOnly
          ? 'Vista de patio.'
          : 'Arrastra un auto entre cajones o selecciona uno y toca otro cajón para moverlo.'}
      </p>

      <div className="parking-yard-viewport">
        <div
          className="parking-yard-stage"
          style={{
            width: '100%',
            aspectRatio: `${envelope.world.w} / ${envelope.world.h}`,
            maxWidth: '100%'
          }}
        >
          <div className="parking-yard-frame" aria-hidden />
          {filteredSlots.map((slot) => {
            const live = parkingById[slot.code];
            const label = unitLabel(live, slot.code);
            const tone = STATUS_TONE[String(live?.estado || 'libre').toLowerCase()] || 'tone-gray';
            const isSelected = selectedCode === slot.code;
            const isDrop = dropTarget === slot.code;
            return (
              <div
                key={slot.elementId}
                className={`parking-yard-slot is-interactive ${isSelected ? 'is-selected' : ''} ${isDrop ? 'is-drop-target' : ''}`}
                data-label={slot.code}
                style={{
                  left: `${slot.leftPct}%`,
                  top: `${slot.topPct}%`,
                  width: `${slot.widthPct}%`,
                  height: `${slot.heightPct}%`
                }}
                onClick={() => onSlotActivate(slot.code)}
                onDragOver={(e) => {
                  if (readOnly) return;
                  e.preventDefault();
                  setDropTarget(slot.code);
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropTarget(null);
                  const code = e.dataTransfer.getData('text/plain') || dragCode;
                  if (code) void moveUnitToSlot(code, slot.code);
                }}
              >
                {label ? (
                  <button
                    type="button"
                    draggable={!readOnly}
                    className={`parking-yard-unit ${tone} ${dragCode === slot.code ? 'is-dragging' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCode(slot.code);
                      setSheetOpen(true);
                    }}
                    onDragStart={(e) => {
                      setDragCode(slot.code);
                      e.dataTransfer.setData('text/plain', slot.code);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDragCode(null)}
                    onTouchStart={(e) => {
                      if (readOnly) return;
                      touchDrag.current = {
                        code: slot.code,
                        x: e.touches[0].clientX,
                        y: e.touches[0].clientY
                      };
                      setSelectedCode(slot.code);
                    }}
                    onTouchMove={(e) => {
                      if (!touchDrag.current || readOnly) return;
                      const t = e.touches[0];
                      const el = document.elementFromPoint(t.clientX, t.clientY);
                      const slotEl = el?.closest('[data-label]') as HTMLElement | null;
                      const code = slotEl?.getAttribute('data-label');
                      if (code) setDropTarget(code);
                    }}
                    onTouchEnd={(e) => {
                      if (!touchDrag.current || readOnly) return;
                      const t = e.changedTouches[0];
                      const el = document.elementFromPoint(t.clientX, t.clientY);
                      const slotEl = el?.closest('[data-label]') as HTMLElement | null;
                      const target = slotEl?.getAttribute('data-label');
                      if (target && target !== touchDrag.current.code) {
                        void moveUnitToSlot(touchDrag.current.code, target);
                      }
                      touchDrag.current = null;
                      setDropTarget(null);
                    }}
                  >
                    {label}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {sheetOpen && selectedCode ? (
        <WorkerSheet
          spotCode={selectedCode}
          live={selectedLive}
          readOnly={readOnly}
          saving={saving}
          onClose={() => setSheetOpen(false)}
          onSave={saveSheet}
          onDelete={deleteSpot}
        />
      ) : null}

      <div className={`parking-yard-toast ${toast ? 'is-visible' : ''}`}>{toast}</div>
    </div>
  );
}

function WorkerSheet({
  spotCode,
  live,
  readOnly,
  saving,
  onClose,
  onSave,
  onDelete
}: {
  spotCode: string;
  live: ParkingSpotLive | undefined;
  readOnly: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (p: { estado: string; placas: string; modelo: string; reservadoPor: string }) => void;
  onDelete: () => void;
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
    <div className="parking-yard-sheet">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-lg font-black">{spotCode}</p>
        <button type="button" onClick={onClose} className="text-xs font-bold text-slate-400">
          Cerrar
        </button>
      </div>
      <label className="mb-2 block text-[10px] font-bold uppercase text-slate-500">Estado</label>
      <select
        disabled={readOnly}
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
            disabled={readOnly}
            value={placas}
            onChange={(e) => setPlacas(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-[#0b1220] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-[10px] font-bold uppercase text-slate-500">
          Modelo
          <input
            disabled={readOnly}
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-[#0b1220] px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <label className="mt-2 block text-[10px] font-bold uppercase text-slate-500">
        Nota
        <input
          disabled={readOnly}
          value={reservadoPor}
          onChange={(e) => setReservadoPor(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-[#0b1220] px-2 py-1.5 text-sm"
        />
      </label>
      {!readOnly ? (
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
      ) : null}
    </div>
  );
}
