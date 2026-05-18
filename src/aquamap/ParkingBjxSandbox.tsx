import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { upsertParkingSpot } from '../lib/parkingRealtime.js';
import './parkingBjxSandbox.css';
import {
  allInteractiveSlotLabels,
  BJX_SLOTS,
  type BjxUnit,
  type HistoryItem,
  estadoToSandboxStatus,
  fuelFill,
  layerForSlot,
  nowLabel,
  placeForSlot,
  sandboxStatusToEstado,
  STATUS_LABEL,
  STATUS_STYLE,
  YARD_STAGE_H,
  YARD_STAGE_W,
  type SlotDef
} from './parkingBjxSandboxLayout';
import { syncParkingOperationalToDb } from './parkingSpotsSync';
import type { ParkingSpotLive } from './parkingSpotsSync';

const SIM_USERS = ['Ana · Admin', 'Luis · Patio', 'Marta · Taller', 'Diego · Supervisor'];
const LAYER_OPTIONS = ['limbo', 'patio', 'oficina', 'taller', 'bano'] as const;

type Props = {
  parkingById: Record<string, ParkingSpotLive>;
  plazaCode?: string;
  onBack?: () => void;
};

function unitsFromParking(parkingById: Record<string, ParkingSpotLive>): Record<string, BjxUnit> {
  const out: Record<string, BjxUnit> = {};
  for (const spot of Object.values(parkingById)) {
    if (!spot?.id) continue;
    const slot = spot.id;
    const hasVehicle =
      Boolean(spot.placas?.trim() || spot.modelo?.trim()) ||
      !['libre', ''].includes(String(spot.estado || '').toLowerCase());
    if (!hasVehicle) continue;
    const status = estadoToSandboxStatus(spot.estado);
    out[slot] = {
      id: spot.placas?.trim() || slot,
      slot,
      status,
      fuel: 'F',
      place: spot.ubicacion || placeForSlot(slot),
      model: spot.modelo || '',
      plates: spot.placas || '',
      notes: spot.reservadoPor || '',
      color: STATUS_STYLE[status] || 'gray',
      savedAt: nowLabel()
    };
  }
  return out;
}

/**
 * Patio operativo (sandbox BJX). No usa mapaEstacionamientoJson ni el editor Konva.
 * Solo parking_spots en tiempo real + layout fijo del sandbox.
 */
export function ParkingBjxSandbox({ parkingById, plazaCode = 'Patio', onBack }: Props) {
  const units = useMemo(() => unitsFromParking(parkingById), [parkingById]);

  const [selectedSlot, setSelectedSlot] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [simulationPaused, setSimulationPaused] = useState(false);
  const [toast, setToast] = useState('');
  const [currentScale, setCurrentScale] = useState(1);
  const [draggingSlot, setDraggingSlot] = useState('');
  const [dropTarget, setDropTarget] = useState('');
  const toastTimer = useRef(0);

  const [filterQuery, setFilterQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [filterLayers, setFilterLayers] = useState<Set<string>>(
    () => new Set(LAYER_OPTIONS)
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 1800);
  }, []);

  const addHistory = useCallback((action: string, detail: string, actor = 'Tú') => {
    setHistory((prev) =>
      [{ action, detail, actor, at: nowLabel() }, ...prev].slice(0, 80)
    );
  }, []);

  const selectedUnit = selectedSlot ? units[selectedSlot] : undefined;

  const unitMatchesFilters = useCallback(
    (unit: BjxUnit) => {
      const query = filterQuery.trim().toUpperCase();
      const layer = layerForSlot(unit.slot);
      const statusOk = filterStatus === 'TODOS' || unit.status === filterStatus;
      const layerOk = filterLayers.has(layer);
      const searchText = [unit.id, unit.slot, unit.status, unit.place, unit.model, unit.plates]
        .join(' ')
        .toUpperCase();
      const queryOk = !query || searchText.includes(query);
      return statusOk && layerOk && queryOk;
    },
    [filterLayers, filterQuery, filterStatus]
  );

  const metrics = useMemo(() => {
    const list = Object.values(units);
    const total = list.length;
    const listo = list.filter((u) => u.status === 'LISTO').length;
    const sucio = list.filter((u) => u.status === 'SUCIO').length;
    const manto = list.filter((u) => u.status === 'MANTENIMIENTO').length;
    const taller = list.filter((u) => u.slot.startsWith('TLLRS')).length;
    const patio = total - taller;
    const occupied = Math.round((total / Math.max(BJX_SLOTS.length, 1)) * 100);
    return { total, listo, sucio, manto, patio, taller, occupied };
  }, [units]);

  const persistUnit = useCallback(
    async (slot: string, unit: Partial<BjxUnit>) => {
      const spot = parkingById[slot];
      await upsertParkingSpot({
        id: slot,
        x: spot?.x ?? 20,
        y: spot?.y ?? 20,
        estado: sandboxStatusToEstado(String(unit.status || 'LISTO')),
        placas: unit.plates ?? unit.id ?? '',
        modelo: unit.model ?? '',
        reservadoPor: unit.notes ?? '',
        ubicacion: unit.place || placeForSlot(slot),
        tipoVehiculo: ''
      });
    },
    [parkingById]
  );

  const clearSlot = useCallback(async (slot: string) => {
    await syncParkingOperationalToDb(slot, {
      estado: 'libre',
      placas: '',
      modelo: '',
      reservadoPor: ''
    });
  }, []);

  const moveUnit = useCallback(
    async (fromSlot: string, targetSlot: string) => {
      if (!fromSlot || fromSlot === targetSlot) return;
      const from = units[fromSlot];
      if (!from) return;
      const targetSpot = parkingById[targetSlot];
      const targetUnit = units[targetSlot];

      try {
        if (targetUnit) {
          await persistUnit(targetSlot, { ...from, slot: targetSlot });
          await persistUnit(fromSlot, { ...targetUnit, slot: fromSlot });
          addHistory('Movimiento', `${from.id}: ${fromSlot} ↔ ${targetSlot}`);
        } else {
          let status = from.status;
          let color = from.color;
          if (targetSlot.startsWith('TLLRS')) {
            status = 'EN TALLER';
            color = 'orange';
          }
          await persistUnit(targetSlot, { ...from, slot: targetSlot, status, color });
          await clearSlot(fromSlot);
          addHistory('Movimiento', `${from.id}: ${fromSlot} → ${targetSlot}`);
        }
        setSelectedSlot(targetSlot);
        showToast(`${from.id} movido`);
      } catch (e) {
        console.warn(e);
        showToast('No se pudo mover');
      }
    },
    [addHistory, clearSlot, parkingById, persistUnit, showToast, units]
  );

  const selectUnit = useCallback((slot: string) => {
    if (!units[slot]) return;
    setSelectedSlot(slot);
    setPopoverOpen(true);
  }, [units]);

  const closeUnit = useCallback(() => {
    setPopoverOpen(false);
    setSelectedSlot('');
  }, []);

  const openAdd = useCallback(
    (slotId = '') => {
      const slot = slotId || 'L-1';
      if (units[slot]) {
        selectUnit(slot);
        return;
      }
      void persistUnit(slot, {
        id: slot,
        slot,
        status: 'LISTO',
        fuel: 'F',
        place: placeForSlot(slot),
        model: '',
        plates: '',
        notes: '',
        color: 'green'
      }).then(() => {
        addHistory('Alta', `${slot} en patio`);
        setSelectedSlot(slot);
        setPopoverOpen(true);
        showToast(`Unidad en ${slot}`);
      });
    },
    [addHistory, persistUnit, selectUnit, showToast, units]
  );

  const saveEditor = useCallback(
    async (draft: BjxUnit) => {
      const slot = draft.slot.trim();
      if (!slot) {
        showToast('Cajón requerido');
        return;
      }
      try {
        await persistUnit(slot, draft);
        if (selectedSlot && selectedSlot !== slot) {
          await clearSlot(selectedSlot);
        }
        addHistory('Edición', `${draft.plates || draft.id} en ${slot}`);
        showToast(`${draft.plates || draft.id} guardado`);
        setSelectedSlot(slot);
        closeUnit();
      } catch (e) {
        console.warn(e);
        showToast('Error al guardar');
      }
    },
    [addHistory, clearSlot, closeUnit, persistUnit, selectedSlot, showToast]
  );

  const deleteSelected = useCallback(async () => {
    if (!selectedSlot) return;
    const removed = units[selectedSlot];
    try {
      await clearSlot(selectedSlot);
      addHistory('Baja', `${removed?.id || selectedSlot} eliminado`);
      closeUnit();
      showToast('Unidad eliminada');
    } catch (e) {
      showToast('No se pudo eliminar');
    }
  }, [addHistory, clearSlot, closeUnit, selectedSlot, showToast, units]);

  const duplicateSelected = useCallback(async () => {
    const source = units[selectedSlot];
    if (!source) return showToast('Selecciona una unidad');
    const free = allInteractiveSlotLabels().find((s) => !units[s]);
    if (!free) return showToast('Sin cajones libres');
    const copy = { ...source, slot: free, savedAt: nowLabel() };
    try {
      await persistUnit(free, copy);
      addHistory('Duplicado', `${source.id} → ${free}`);
      selectUnit(free);
      showToast(`Duplicado en ${free}`);
    } catch {
      showToast('No se pudo duplicar');
    }
  }, [addHistory, persistUnit, selectUnit, selectedSlot, showToast, units]);

  const exportCsv = useCallback(() => {
    const rows = [['MVA', 'Estado', 'Cajón', 'Ubicación', 'Gasolina', 'Modelo', 'Placas', 'Notas']];
    Object.values(units).forEach((u) => {
      rows.push([u.id, u.status, u.slot, u.place, u.fuel, u.model, u.plates, u.notes]);
    });
    const csv = rows.map((row) => row.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patio-inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addHistory('Export CSV', `${Object.keys(units).length} unidades`);
    showToast('CSV descargado');
  }, [addHistory, showToast, units]);

  const clearMapFilters = useCallback(() => {
    setFilterQuery('');
    setFilterStatus('TODOS');
    setFilterLayers(new Set(LAYER_OPTIONS));
    showToast('Filtros limpiados');
  }, [showToast]);

  const saveSandbox = useCallback(() => {
    showToast('Cambios guardados');
  }, [showToast]);

  const resetSandbox = useCallback(async () => {
    const ok = window.confirm('¿Vaciar todas las unidades del patio?');
    if (!ok) return;
    try {
      await Promise.all(Object.keys(units).map((slot) => clearSlot(slot)));
      setHistory([]);
      closeUnit();
      showToast('Patio reiniciado');
    } catch {
      showToast('Error al reiniciar');
    }
  }, [clearSlot, closeUnit, showToast, units]);

  const zoomMap = useCallback((factor: number) => {
    setCurrentScale((s) => Math.max(0.72, Math.min(1.45, s * factor)));
  }, []);

  const simulateRealtimeMove = useCallback(() => {
    if (simulationPaused) return;
    const list = Object.values(units);
    if (!list.length) return;
    const unit = list[Math.floor(Math.random() * list.length)];
    const actor = SIM_USERS[Math.floor(Math.random() * SIM_USERS.length)];
    if (Math.random() < 0.6) {
      const slots = allInteractiveSlotLabels().filter(
        (s) => s !== unit.slot && !s.startsWith('B-') && !units[s]
      );
      if (slots.length) {
        const target = slots[Math.floor(Math.random() * slots.length)];
        void moveUnit(unit.slot, target).then(() => {
          addHistory('Movimiento remoto', `${unit.id} → ${target}`, actor);
          showToast(`${actor.split('·')[0]?.trim()} movió ${unit.id}`);
        });
      }
    } else {
      const statuses = ['LISTO', 'SUCIO', 'MANTENIMIENTO', 'NO ARRENDABLE'] as const;
      const next = statuses[Math.floor(Math.random() * statuses.length)];
      void persistUnit(unit.slot, { ...unit, status: next, color: STATUS_STYLE[next] }).then(() => {
        addHistory('Cambio de estado', `${unit.id}: ${unit.status} → ${next}`, actor);
      });
    }
  }, [addHistory, moveUnit, persistUnit, showToast, simulationPaused, units]);

  useEffect(() => {
    const t = window.setInterval(simulateRealtimeMove, 5500);
    return () => window.clearInterval(t);
  }, [simulateRealtimeMove]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
        setSummaryOpen(false);
        setInventoryOpen(false);
        setHistoryOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveSandbox();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saveSandbox]);

  const onSlotClick = (slotId: string) => {
    if (selectedSlot && units[selectedSlot] && selectedSlot !== slotId) {
      void moveUnit(selectedSlot, slotId);
      return;
    }
    if (units[slotId]) {
      selectUnit(slotId);
    } else {
      openAdd(slotId);
    }
  };

  const inventoryUnits = Object.values(units).filter(unitMatchesFilters).sort((a, b) => a.id.localeCompare(b.id));

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

  return (
    <div className="parking-sandbox-app">
      <header className="top-shell" aria-label="Resumen del mapa">
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
          <button className="plaza-card" type="button" onClick={() => setSummaryOpen(true)} aria-label="Abrir resumen">
            <span>
              <strong>{plazaCode}</strong>
              <small>{metrics.occupied}% ocupado</small>
              <span className="mini-counts" aria-hidden="true">
                <span className="mini-ok">{metrics.listo}</span>
                <span className="mini-warn">{metrics.sucio}</span>
                <span className="mini-bad">{metrics.manto}</span>
              </span>
            </span>
          </button>
          <button className="scoreboard" type="button" onClick={() => setSummaryOpen(true)} aria-label="Abrir resumen de flota">
            <span className="metric">
              <strong>{metrics.total}</strong>
              <span>Totales</span>
            </span>
            <span className="metric">
              <strong style={{ color: 'var(--green)' }}>{metrics.listo}</strong>
              <span>Listos</span>
            </span>
            <span className="metric">
              <strong style={{ color: 'var(--yellow)' }}>{metrics.sucio}</strong>
              <span>Sucios</span>
            </span>
            <span className="metric">
              <strong style={{ color: 'var(--pink)' }}>{metrics.manto}</strong>
              <span>Mantenimiento</span>
            </span>
            <span className="metric">
              <strong style={{ color: 'var(--cyan)' }}>{metrics.patio}</strong>
              <span>En patio</span>
            </span>
            <span className="metric">
              <strong style={{ color: 'var(--orange)' }}>{metrics.taller}</strong>
              <span>En taller</span>
            </span>
          </button>
        </div>
      </header>

      <main className="yard-wrap" aria-label="Mapa vivo del patio">
        <div className="yard-viewport" id="yardViewport">
          <section
            className="yard-stage"
            id="yardStage"
            style={{ transform: `scale(${currentScale})` }}
          >
            {allSlots.map((slot) => {
              const unit = units[slot.label];
              const layer = layerForSlot(slot.label);
              const layerHidden = !filterLayers.has(layer);
              const query = filterQuery.trim().toUpperCase();
              const searchHit =
                query &&
                unit &&
                unitMatchesFilters(unit) &&
                [unit.id, unit.slot, unit.model, unit.plates].join(' ').toUpperCase().includes(query);
              const filteredOut = unit && !unitMatchesFilters(unit);
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
                    layerHidden ? 'layer-hidden' : '',
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
                    if (!slot.isArea && !slot.isWorkshop) onSlotClick(slot.label);
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
                        unit.color || STATUS_STYLE[unit.status] || 'gray',
                        selectedSlot === slot.label ? 'selected' : '',
                        draggingSlot === slot.label ? 'dragging' : '',
                        filteredOut ? 'filtered-out' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-id={unit.id}
                      data-slot={unit.slot}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectUnit(slot.label);
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
                      {unit.id}
                      {unit.fuel && unit.fuel !== 'N/A' ? (
                        <span className="fuel" data-fuel={unit.fuel}>
                          <i style={{ ['--fill' as string]: fuelFill(unit.fuel) }} />
                        </span>
                      ) : null}
                      <span className="drag-token" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </section>
        </div>
      </main>

      <aside className="map-tools" aria-label="Herramientas del mapa">
        <section className="tool-card">
          <div className="tool-title">Buscar unidad</div>
          <input
            className="map-search"
            type="search"
            placeholder="MVA, placas, modelo..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            autoComplete="off"
          />
        </section>
        <section className="tool-card">
          <div className="tool-title">Estados</div>
          <div className="filter-row">
            {['TODOS', 'LISTO', 'SUCIO', 'MANTENIMIENTO', 'EN TALLER'].map((st) => (
              <button
                key={st}
                type="button"
                className={`filter-chip ${filterStatus === st ? 'active' : ''}`}
                onClick={() => setFilterStatus(st)}
              >
                {st === 'TODOS' ? 'Todos' : st === 'EN TALLER' ? 'Taller' : st === 'MANTENIMIENTO' ? 'Manto' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </section>
        <section className="tool-card">
          <div className="tool-title">Capas</div>
          <div className="layer-list">
            {LAYER_OPTIONS.map((layer) => (
              <label key={layer} className="layer-chip">
                <input
                  type="checkbox"
                  checked={filterLayers.has(layer)}
                  onChange={(e) => {
                    setFilterLayers((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(layer);
                      else next.delete(layer);
                      return next;
                    });
                  }}
                />{' '}
                {layer.charAt(0).toUpperCase() + layer.slice(1)}
              </label>
            ))}
          </div>
        </section>
        <section className="tool-card">
          <div className="tool-title">Datos</div>
          <div className="tool-actions">
            <button type="button" className="tool-link" onClick={() => setInventoryOpen((v) => !v)}>
              Inventario
            </button>
            <button type="button" className="tool-link" onClick={exportCsv}>
              Export CSV
            </button>
            <button type="button" className="tool-link" onClick={clearMapFilters}>
              Limpiar
            </button>
            <button type="button" className="tool-link" onClick={() => setSummaryOpen(true)}>
              Resumen
            </button>
          </div>
        </section>
      </aside>

      <aside className={`unit-popover ${popoverOpen && selectedUnit ? 'open' : ''}`} aria-live="polite">
        {selectedUnit ? (
          <UnitPopover
            unit={selectedUnit}
            slotOptions={allInteractiveSlotLabels()}
            onClose={closeUnit}
            onSave={saveEditor}
            onDelete={deleteSelected}
            onDuplicate={duplicateSelected}
          />
        ) : null}
      </aside>

      <aside className={`inventory-drawer ${inventoryOpen ? 'open' : ''}`} aria-label="Inventario de unidades">
        <div className="inventory-head">
          <span>Inventario visible</span>
          <button type="button" className="icon-button" onClick={() => setInventoryOpen(false)} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="inventory-list">
          {inventoryUnits.length ? (
            inventoryUnits.map((u) => (
              <button
                key={u.slot}
                type="button"
                className="inventory-row"
                onClick={() => {
                  document
                    .querySelector(`.slot[data-label="${u.slot}"]`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  selectUnit(u.slot);
                  setInventoryOpen(false);
                }}
              >
                <strong>{u.id}</strong>
                <span>{u.model || 'Sin modelo'}</span>
                <span>{STATUS_LABEL[u.status] || u.status}</span>
                <span>{u.slot}</span>
              </button>
            ))
          ) : (
            <div className="history-item">Sin unidades visibles</div>
          )}
        </div>
      </aside>

      <aside className={`history-drawer ${historyOpen ? 'open' : ''}`} aria-label="Historial sandbox">
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
            <div className="history-item">Sin movimientos</div>
          )}
        </div>
      </aside>

      <section
        className={`summary-modal ${summaryOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Resumen de flota"
        onClick={(e) => {
          if (e.target === e.currentTarget) setSummaryOpen(false);
        }}
      >
        <article className="summary-card">
          <div className="summary-head">
            <div className="summary-chip">
              BALNEARIO <b>{plazaCode}</b>
            </div>
            <h2>RESUMEN DE FLOTA</h2>
            <p>{new Date().toLocaleDateString('es-MX')}</p>
            <button type="button" className="summary-close" onClick={() => setSummaryOpen(false)}>
              ✕
            </button>
          </div>
          <div className="summary-body">
            <div className="summary-grid">
              <div className="summary-stat">
                <span>Total flota</span>
                <strong>{metrics.total}</strong>
              </div>
              <div className="summary-stat" style={{ borderLeftColor: '#00c66f' }}>
                <span>En patio</span>
                <strong style={{ color: '#00b765' }}>{metrics.patio}</strong>
              </div>
              <div className="summary-stat" style={{ borderLeftColor: '#5a58ff' }}>
                <span>En taller</span>
                <strong style={{ color: '#5a58ff' }}>{metrics.taller}</strong>
              </div>
            </div>
            <div className="summary-wide-grid">
              <div className="summary-wide">
                <span>Listos para renta</span>
                <strong style={{ color: '#00b765' }}>{metrics.listo}</strong>
              </div>
              <div className="summary-wide">
                <span>No arrendables</span>
                <strong>
                  {Object.values(units).filter((u) => u.status === 'NO ARRENDABLE').length}
                </strong>
              </div>
            </div>
          </div>
        </article>
      </section>

      <div className="sandbox-toolbar" aria-label="Controles del sandbox">
        <span className="sandbox-mark">SANDBOX</span>
        <button type="button" onClick={() => openAdd()}>
          + Nuevo
        </button>
        <button type="button" onClick={saveSandbox}>
          Guardar
        </button>
        <button type="button" onClick={() => setHistoryOpen((v) => !v)}>
          Movimientos
        </button>
        <button type="button" onClick={() => setInventoryOpen((v) => !v)}>
          Inventario
        </button>
        <button type="button" onClick={exportCsv}>
          CSV
        </button>
        <button type="button" onClick={() => setSimulationPaused((v) => !v)}>
          {simulationPaused ? 'Reanudar vivo' : 'Pausar vivo'}
        </button>
        <button type="button" onClick={resetSandbox}>
          Reset
        </button>
      </div>

      <div className="zoom-stack" aria-label="Controles de zoom">
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

function UnitPopover({
  unit,
  slotOptions,
  onClose,
  onSave,
  onDelete,
  onDuplicate
}: {
  unit: BjxUnit;
  slotOptions: string[];
  onClose: () => void;
  onSave: (u: BjxUnit) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [draft, setDraft] = useState(unit);

  useEffect(() => {
    setDraft(unit);
  }, [unit]);

  return (
    <>
      <div className="popover-head">
        <div>
          <div className="eyebrow">
            {draft.place || placeForSlot(draft.slot)} · {draft.slot}
          </div>
          <div className="popover-title">{draft.id}</div>
        </div>
        <button type="button" className="icon-button" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="popover-body">
        <div className="field-grid">
          <div className="field">
            <label>MVA / Placas</label>
            <input
              value={draft.plates || draft.id}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  plates: e.target.value.toUpperCase(),
                  id: e.target.value.toUpperCase()
                }))
              }
            />
          </div>
          <div className="field">
            <label>Cajón</label>
            <select
              value={draft.slot}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  slot: e.target.value,
                  place: placeForSlot(e.target.value)
                }))
              }
            >
              {slotOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Estado</label>
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  status: e.target.value,
                  color: STATUS_STYLE[e.target.value] || 'gray'
                }))
              }
            >
              <option>LISTO</option>
              <option>SUCIO</option>
              <option>MANTENIMIENTO</option>
              <option>NO ARRENDABLE</option>
              <option>EN TALLER</option>
              <option>TRASLADO</option>
            </select>
          </div>
          <div className="field">
            <label>Gasolina</label>
            <select
              value={draft.fuel}
              onChange={(e) => setDraft((d) => ({ ...d, fuel: e.target.value }))}
            >
              <option>F</option>
              <option>3/4</option>
              <option>1/2</option>
              <option>1/4</option>
              <option>E</option>
              <option>N/A</option>
            </select>
          </div>
          <div className="field">
            <label>Ubicación</label>
            <input
              value={draft.place}
              onChange={(e) => setDraft((d) => ({ ...d, place: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Placas</label>
            <input
              value={draft.plates}
              onChange={(e) => setDraft((d) => ({ ...d, plates: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="field full">
            <label>Modelo</label>
            <input value={draft.model} onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))} />
          </div>
          <div className="field full">
            <label>Notas</label>
            <textarea value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
          </div>
        </div>
        <div className="panel-actions">
          <button type="button" className="primary-action" onClick={() => onSave(draft)}>
            Guardar
          </button>
          <button type="button" className="secondary-action" onClick={onDuplicate}>
            Duplicar
          </button>
          <button type="button" className="danger-action" onClick={onDelete}>
            Eliminar
          </button>
          <button type="button" className="secondary-action" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}
