import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { upsertParkingSpot } from '../lib/parkingRealtime.js';
import { showConfirm } from '../lib/appDialog.js';
import './parkingBjxSandbox.css';
import {
  allInteractiveSlotLabels,
  BJX_SLOTS,
  encodeUbicacionMeta,
  limboSlots,
  nowLabel,
  parkingCajonSlots,
  placeForSlot,
  spotHasVehicle,
  type BjxUnit,
  type HistoryItem,
  type SlotDef,
  unitFromParkingSpot,
  UNIT_COLOR_OPTIONS,
  YARD_STAGE_H,
  YARD_STAGE_W
} from './parkingBjxSandboxLayout';
import type { ParkingSpotLive } from './parkingSpotsSync';

type Props = {
  parkingById: Record<string, ParkingSpotLive>;
  plazaCode?: string;
  onBack?: () => void;
  canEditMapLayout?: boolean;
};

type VehicleDraft = {
  identificador: string;
  model: string;
  plates: string;
  titular: string;
  color: string;
  slot: string;
};

const EMPTY_DRAFT: VehicleDraft = {
  identificador: '',
  model: '',
  plates: '',
  titular: '',
  color: 'green',
  slot: ''
};

function unitsFromParking(parkingById: Record<string, ParkingSpotLive>): Record<string, BjxUnit> {
  const out: Record<string, BjxUnit> = {};
  for (const spot of Object.values(parkingById)) {
    if (!spot?.id || !spotHasVehicle(spot)) continue;
    out[spot.id] = unitFromParkingSpot(spot);
  }
  return out;
}

function unitLabel(unit: BjxUnit): string {
  return unit.identificador || unit.plates || unit.slot;
}

/**
 * Patio operativo: registro de cajones ocupados (matrícula, titular, modelo).
 * Sin estados operativos ni simulación.
 */
export function ParkingBjxSandbox({
  parkingById,
  plazaCode = 'Patio',
  onBack,
  canEditMapLayout = false
}: Props) {
  const units = useMemo(() => unitsFromParking(parkingById), [parkingById]);

  const [selectedSlot, setSelectedSlot] = useState('');
  const [vehicleDialog, setVehicleDialog] = useState<VehicleDraft | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [toast, setToast] = useState('');
  const [currentScale, setCurrentScale] = useState(1);
  const [draggingSlot, setDraggingSlot] = useState('');
  const [dropTarget, setDropTarget] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const toastTimer = useRef(0);

  const cajones = useMemo(() => parkingCajonSlots(), []);
  const selectedUnit = selectedSlot ? units[selectedSlot] : undefined;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 1800);
  }, []);

  const addHistory = useCallback((action: string, detail: string, actor = 'Tú') => {
    setHistory((prev) => [{ action, detail, actor, at: nowLabel() }, ...prev].slice(0, 120));
  }, []);

  const metrics = useMemo(() => {
    const vehiculos = Object.keys(units).length;
    const ocupados = cajones.filter((s) => units[s]).length;
    const libres = cajones.length - ocupados;
    return { vehiculos, libres, ocupados, cajonesTotal: cajones.length };
  }, [cajones, units]);

  const persistUnit = useCallback(
    async (slot: string, unit: Partial<BjxUnit>) => {
      const spot = parkingById[slot];
      const color = unit.color || 'green';
      await upsertParkingSpot({
        id: slot,
        x: spot?.x ?? 20,
        y: spot?.y ?? 20,
        estado: 'ocupado',
        tipoVehiculo: unit.identificador || '',
        placas: unit.plates || '',
        modelo: unit.model || '',
        reservadoPor: unit.titular || '',
        ubicacion: encodeUbicacionMeta(slot, color),
      });
    },
    [parkingById]
  );

  const clearSlot = useCallback(
    async (slot: string) => {
      const spot = parkingById[slot];
      await upsertParkingSpot({
        id: slot,
        x: spot?.x ?? 20,
        y: spot?.y ?? 20,
        estado: 'libre',
        tipoVehiculo: '',
        placas: '',
        modelo: '',
        reservadoPor: '',
        ubicacion: 'patio|green'
      });
    },
    [parkingById]
  );

  const moveUnit = useCallback(
    async (fromSlot: string, targetSlot: string) => {
      if (!fromSlot || fromSlot === targetSlot) return;
      const from = units[fromSlot];
      if (!from) return;
      const targetUnit = units[targetSlot];

      try {
        if (targetUnit) {
          await persistUnit(targetSlot, { ...from, slot: targetSlot });
          await persistUnit(fromSlot, { ...targetUnit, slot: fromSlot });
          addHistory(
            'Cambio de posición',
            `${unitLabel(from)}: ${fromSlot} ↔ ${targetSlot} (intercambio)`
          );
        } else {
          await persistUnit(targetSlot, { ...from, slot: targetSlot });
          await clearSlot(fromSlot);
          addHistory('Cambio de posición', `${unitLabel(from)}: ${fromSlot} → ${targetSlot}`);
        }
        setSelectedSlot(targetSlot);
        showToast(`${unitLabel(from)} movido`);
      } catch (e) {
        console.warn(e);
        showToast('No se pudo mover');
      }
    },
    [addHistory, clearSlot, persistUnit, showToast, units]
  );

  const openEditDialog = useCallback((unit: BjxUnit) => {
    setSelectedSlot(unit.slot);
    setVehicleDialog({
      identificador: unit.identificador,
      model: unit.model,
      plates: unit.plates,
      titular: unit.titular,
      color: unit.color,
      slot: unit.slot
    });
  }, []);

  const openCreateDialog = useCallback((slot: string) => {
    setSelectedSlot(slot);
    setVehicleDialog({
      ...EMPTY_DRAFT,
      slot
    });
  }, []);

  const onSlotClick = useCallback(
    async (slotId: string) => {
      if (selectedSlot && units[selectedSlot] && selectedSlot !== slotId) {
        void moveUnit(selectedSlot, slotId);
        return;
      }
      if (units[slotId]) {
        openEditDialog(units[slotId]);
        return;
      }
      const ok = await showConfirm('¿Desea insertar un vehículo en este cajón?', {
        title: 'Cajón libre',
        confirmText: 'Sí, insertar',
        cancelText: 'Cancelar'
      });
      if (ok) openCreateDialog(slotId);
    },
    [moveUnit, openCreateDialog, openEditDialog, selectedSlot, units]
  );

  const saveVehicle = useCallback(
    async (draft: VehicleDraft, isNew: boolean) => {
      const identificador = draft.identificador.trim().toUpperCase();
      const plates = draft.plates.trim().toUpperCase();
      const model = draft.model.trim();
      const titular = draft.titular.trim();
      const slot = draft.slot.trim();

      if (!identificador) {
        showToast('Identificador requerido');
        return;
      }
      if (!model) {
        showToast('Modelo requerido');
        return;
      }
      if (!plates) {
        showToast('Placas requeridas');
        return;
      }
      if (!titular) {
        showToast('Titular requerido');
        return;
      }
      if (!slot) {
        showToast('Cajón requerido');
        return;
      }

      const payload: BjxUnit = {
        identificador,
        slot,
        model,
        plates,
        titular,
        color: draft.color || 'green',
        place: placeForSlot(slot)
      };

      try {
        const prevSlot = selectedSlot;
        await persistUnit(slot, payload);
        if (prevSlot && prevSlot !== slot && units[prevSlot]) {
          await clearSlot(prevSlot);
        }
        if (isNew) {
          addHistory('Creación', `${identificador} en ${slot}`);
        } else {
          addHistory('Edición', `${identificador} · ${slot}`);
        }
        setVehicleDialog(null);
        setSelectedSlot(slot);
        showToast(isNew ? 'Vehículo registrado' : 'Cambios guardados');
      } catch (e) {
        console.warn(e);
        showToast('Error al guardar');
      }
    },
    [addHistory, clearSlot, persistUnit, selectedSlot, showToast, units]
  );

  const deleteVehicle = useCallback(async () => {
    if (!selectedSlot || !units[selectedSlot]) return;
    const removed = units[selectedSlot];
    const ok = await showConfirm(`¿Eliminar ${unitLabel(removed)} del patio?`, {
      title: 'Eliminar vehículo',
      variant: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });
    if (!ok) return;
    try {
      await clearSlot(selectedSlot);
      addHistory('Eliminación', `${unitLabel(removed)} · ${selectedSlot}`);
      setVehicleDialog(null);
      setSelectedSlot('');
      showToast('Vehículo eliminado');
    } catch {
      showToast('No se pudo eliminar');
    }
  }, [addHistory, clearSlot, selectedSlot, showToast, units]);

  const unitMatchesSearch = useCallback(
    (unit: BjxUnit) => {
      const q = filterQuery.trim().toUpperCase();
      if (!q) return true;
      return [unit.identificador, unit.plates, unit.model, unit.titular, unit.slot]
        .join(' ')
        .toUpperCase()
        .includes(q);
    },
    [filterQuery]
  );

  const zoomMap = useCallback((factor: number) => {
    setCurrentScale((s) => Math.max(0.72, Math.min(1.45, s * factor)));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVehicleDialog(null);
        setHistoryOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const allSlots = useMemo(() => {
    const labels = new Set(BJX_SLOTS.map((s) => s.label));
    const extras: SlotDef[] = [];
    for (const id of Object.keys(parkingById)) {
      if (labels.has(id)) continue;
      const spot = parkingById[id];
      const cx = (Number(spot?.x ?? 20) / 100) * YARD_STAGE_W;
      const cy = (Number(spot?.y ?? 20) / 100) * YARD_STAGE_H;
      extras.push({
        label: id,
        left: Math.max(8, Math.round(cx - 46)),
        top: Math.max(8, Math.round(cy - 66)),
        w: 92,
        h: 132
      });
    }
    return [...BJX_SLOTS, ...extras];
  }, [parkingById]);

  const isNewVehicle = Boolean(vehicleDialog && !units[vehicleDialog.slot]);

  return (
    <div className="parking-sandbox-app">
      <header className="top-shell" aria-label="Resumen del patio">
        {onBack ? (
          <button
            type="button"
            className="absolute left-3 top-2 z-[80] rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-[10px] font-black uppercase text-white"
            onClick={onBack}
          >
            ← Volver
          </button>
        ) : null}
        <div className="command-bar">
          <div className="plaza-card" aria-hidden="true">
            <span>
              <strong>{plazaCode}</strong>
              <small>Patio operativo</small>
            </span>
          </div>
          <div className="scoreboard" aria-label="Indicadores del patio">
            <span className="metric">
              <strong>{metrics.vehiculos}</strong>
              <span>Vehículos totales</span>
            </span>
            <span className="metric">
              <strong style={{ color: 'var(--green)' }}>{metrics.libres}</strong>
              <span>Cajones libres</span>
            </span>
            <span className="metric">
              <strong style={{ color: 'var(--cyan)' }}>{metrics.ocupados}</strong>
              <span>Cajones ocupados</span>
            </span>
          </div>
        </div>
      </header>

      <main className="yard-wrap" aria-label="Mapa del patio">
        <div className="yard-viewport" id="yardViewport">
          <section
            className="yard-stage"
            id="yardStage"
            style={{ transform: `scale(${currentScale})` }}
          >
            {allSlots.map((slot) => {
              const unit = units[slot.label];
              const query = filterQuery.trim().toUpperCase();
              const searchHit =
                query &&
                unit &&
                unitMatchesSearch(unit) &&
                [unit.identificador, unit.plates, unit.model, unit.titular]
                  .join(' ')
                  .toUpperCase()
                  .includes(query);
              const filteredOut = unit && !unitMatchesSearch(unit);
              const isDrop = dropTarget === slot.label;
              const isSelected = selectedSlot === slot.label;

              return (
                <div
                  key={slot.label}
                  className={[
                    slot.isArea ? 'area' : 'slot',
                    slot.wide ? 'wide' : '',
                    slot.isWorkshop ? 'workshop' : '',
                    !slot.isArea && !slot.isWorkshop ? 'interactive' : '',
                    isDrop ? 'drop-target' : '',
                    isSelected ? 'selected-slot' : '',
                    searchHit ? 'search-hit' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-label={slot.label}
                  style={{
                    left: slot.left,
                    top: slot.top,
                    width: slot.w,
                    height: slot.h
                  }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.unit')) return;
                    if (!slot.isArea && !slot.isWorkshop) void onSlotClick(slot.label);
                  }}
                  onDragOver={(e) => {
                    if (slot.isArea || slot.isWorkshop) return;
                    e.preventDefault();
                    setDropTarget(slot.label);
                  }}
                  onDragLeave={() => setDropTarget('')}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropTarget('');
                    const slotKey = e.dataTransfer.getData('text/plain') || draggingSlot;
                    if (slotKey) void moveUnit(slotKey, slot.label);
                  }}
                >
                  {unit ? (
                    <button
                      type="button"
                      draggable
                      className={[
                        'unit',
                        unit.color || 'green',
                        isSelected ? 'selected' : '',
                        draggingSlot === slot.label ? 'dragging' : '',
                        filteredOut ? 'filtered-out' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-slot={unit.slot}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(unit);
                      }}
                      onDragStart={(e) => {
                        setDraggingSlot(slot.label);
                        e.dataTransfer.setData('text/plain', slot.label);
                      }}
                      onDragEnd={() => {
                        setDraggingSlot('');
                        setDropTarget('');
                      }}
                    >
                      <span className="unit-id">{unit.identificador}</span>
                      <span className="unit-plates">{unit.plates}</span>
                      <span className="drag-token" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </section>
        </div>
      </main>

      <aside className="map-tools" aria-label="Herramientas">
        <section className="tool-card">
          <div className="tool-title">Buscar vehículo</div>
          <input
            className="map-search"
            type="search"
            placeholder="Identificador, placas, titular..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            autoComplete="off"
          />
        </section>
        <section className="tool-card">
          <div className="tool-title">Acciones</div>
          <div className="tool-actions tool-actions--stack">
            <button type="button" className="tool-link" onClick={() => setHistoryOpen((v) => !v)}>
              Movimientos
            </button>
            {canEditMapLayout ? (
              <a
                href="/admin/dashboard?section=sitio&mapfocus=1"
                className="tool-link tool-link--admin"
                data-link
                title="Editor del plano (solo administración)"
              >
                Editar plano del mapa
              </a>
            ) : null}
          </div>
        </section>
        {limboSlots().length ? (
          <section className="tool-card">
            <p className="text-[10px] leading-relaxed text-[#8e99b5]">
              Los cajones <strong className="text-[#b7c1d9]">L-*</strong> son limbo temporal.
              Arrastra al patio cuando asignes lugar.
            </p>
          </section>
        ) : null}
      </aside>

      <aside className={`history-drawer ${historyOpen ? 'open' : ''}`} aria-label="Movimientos">
        <div className="history-head">
          <span>Movimientos</span>
          <button type="button" className="icon-button" onClick={() => setHistoryOpen(false)} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="history-list">
          {history.length ? (
            history.map((item, i) => (
              <div key={`${item.at}-${i}`} className="history-item">
                <strong>{item.action}</strong>
                <span>
                  {item.detail} · {item.actor} · {item.at}
                </span>
              </div>
            ))
          ) : (
            <div className="history-item">Sin movimientos registrados</div>
          )}
        </div>
      </aside>

      {vehicleDialog ? (
        <VehicleDialog
          draft={vehicleDialog}
          slotOptions={allInteractiveSlotLabels()}
          isNew={isNewVehicle}
          onChange={setVehicleDialog}
          onClose={() => setVehicleDialog(null)}
          onSave={() => saveVehicle(vehicleDialog, isNewVehicle)}
          onDelete={deleteVehicle}
        />
      ) : null}

      <div className="sandbox-toolbar" aria-label="Controles">
        <span className="sandbox-mark">PATIO</span>
        <button type="button" onClick={() => setHistoryOpen((v) => !v)}>
          Movimientos
        </button>
      </div>

      <div className="zoom-stack" aria-label="Zoom">
        <button type="button" onClick={() => zoomMap(1.12)} aria-label="Acercar">
          +
        </button>
        <button type="button" onClick={() => zoomMap(0.89)} aria-label="Alejar">
          −
        </button>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}

function VehicleDialog({
  draft,
  slotOptions,
  isNew,
  onChange,
  onClose,
  onSave,
  onDelete
}: {
  draft: VehicleDraft;
  slotOptions: string[];
  isNew: boolean;
  onChange: (d: VehicleDraft) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <aside className="unit-popover open" aria-label={isNew ? 'Nuevo vehículo' : 'Editar vehículo'}>
      <div className="popover-head">
        <div>
          <div className="eyebrow">{isNew ? 'Alta de vehículo' : 'Edición'} · {draft.slot || '—'}</div>
          <div className="popover-title">{draft.identificador || 'Nuevo'}</div>
        </div>
        <button type="button" className="icon-button" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="popover-body">
        <div className="field-grid">
          <div className="field full">
            <label>Identificador *</label>
            <input
              value={draft.identificador}
              onChange={(e) =>
                onChange({ ...draft, identificador: e.target.value.toUpperCase() })
              }
              placeholder="MVA / folio interno"
            />
          </div>
          <div className="field">
            <label>Modelo *</label>
            <input
              value={draft.model}
              onChange={(e) => onChange({ ...draft, model: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Placas *</label>
            <input
              value={draft.plates}
              onChange={(e) => onChange({ ...draft, plates: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="field full">
            <label>Titular *</label>
            <input
              value={draft.titular}
              onChange={(e) => onChange({ ...draft, titular: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Color (opcional)</label>
            <select value={draft.color} onChange={(e) => onChange({ ...draft, color: e.target.value })}>
              {UNIT_COLOR_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Cajón *</label>
            <select value={draft.slot} onChange={(e) => onChange({ ...draft, slot: e.target.value })}>
              {slotOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="panel-actions">
          <button type="button" className="primary-action" onClick={onSave}>
            {isNew ? 'Registrar' : 'Guardar'}
          </button>
          {!isNew ? (
            <button type="button" className="danger-action" onClick={onDelete}>
              Eliminar
            </button>
          ) : null}
          <button type="button" className="secondary-action" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </aside>
  );
}
