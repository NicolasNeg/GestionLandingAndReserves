import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react';
import { subscribeParkingSpots } from '../lib/parkingRealtime.js';
import {
  slotsFromParkingSpots,
  YARD_STAGE_H,
  YARD_STAGE_W,
  type SlotDef
} from './parkingBjxSandboxLayout';
import './parkingBjxPublic.css';
import {
  PUBLIC_STATE_LABEL,
  publicStateForSpot,
  type PublicSlotState
} from './parkingPublicState';
import type { ParkingSpotLive } from './parkingSpotsSync';

export type ParkingBjxPublicMetrics = {
  libre: number;
  ocupado: number;
  reservado: number;
  mantenimiento: number;
  taller: number;
  total: number;
  disponiblePct: number;
};

export type ParkingBjxPublicPreviewHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  fit: () => void;
};

type Props = {
  onMetrics?: (metrics: ParkingBjxPublicMetrics) => void;
  onSpotsChange?: (spots: ParkingSpotLive[]) => void;
  onError?: (err: unknown) => void;
};

function buildAllSlots(parkingById: Record<string, ParkingSpotLive>): SlotDef[] {
  return slotsFromParkingSpots(parkingById);
}

function computeMetrics(
  parkingById: Record<string, ParkingSpotLive>,
  slots: SlotDef[]
): ParkingBjxPublicMetrics {
  const interactive = slots.filter((s) => !s.isArea && !s.isWorkshop);
  let libre = 0;
  let ocupado = 0;
  let reservado = 0;
  let mantenimiento = 0;
  let taller = 0;

  for (const slot of interactive) {
    const state = publicStateForSpot(parkingById[slot.label]);
    if (state === 'libre') libre += 1;
    else if (state === 'ocupado' || state === 'sucio') ocupado += 1;
    else if (state === 'reservado') reservado += 1;
    else if (state === 'mantenimiento') mantenimiento += 1;
    else if (state === 'taller') taller += 1;
  }

  const total = interactive.length;
  const disponiblePct = total ? Math.round((libre / total) * 100) : 0;
  return { libre, ocupado, reservado, mantenimiento, taller, total, disponiblePct };
}

function fitScale(viewportW: number, viewportH: number): number {
  const pad = 28;
  if (viewportW < 40 || viewportH < 40) return 0.35;
  return Math.min((viewportW - pad) / YARD_STAGE_W, (viewportH - pad) / YARD_STAGE_H, 1);
}

export const ParkingBjxPublicPreview = forwardRef<ParkingBjxPublicPreviewHandle, Props>(
  function ParkingBjxPublicPreview({ onMetrics, onSpotsChange, onError }, ref) {
    const [parkingById, setParkingById] = useState<Record<string, ParkingSpotLive>>({});
    const [scale, setScale] = useState(0.4);
    const [baseScale, setBaseScale] = useState(0.4);
    const viewportRef = useRef<HTMLDivElement>(null);

    const allSlots = useMemo(() => buildAllSlots(parkingById), [parkingById]);

    const metrics = useMemo(
      () => computeMetrics(parkingById, allSlots),
      [allSlots, parkingById]
    );

    useEffect(() => {
      onMetrics?.(metrics);
    }, [metrics, onMetrics]);

    const applyFit = useCallback(() => {
      const el = viewportRef.current;
      if (!el) return;
      const next = fitScale(el.clientWidth, el.clientHeight);
      setBaseScale(next);
      setScale(next);
    }, []);

    useEffect(() => {
      applyFit();
      const el = viewportRef.current;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => applyFit());
      ro.observe(el);
      return () => ro.disconnect();
    }, [applyFit]);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => setScale((s) => Math.min(2.2, s * 1.12)),
        zoomOut: () => setScale((s) => Math.max(0.12, s * 0.89)),
        reset: () => setScale(baseScale),
        fit: applyFit
      }),
      [applyFit, baseScale]
    );

    useEffect(() => {
      return subscribeParkingSpots(
        (spots) => {
          const next: Record<string, ParkingSpotLive> = {};
          for (const s of spots) {
            if (s?.id) next[String(s.id)] = s as ParkingSpotLive;
          }
          setParkingById(next);
          onSpotsChange?.(spots as ParkingSpotLive[]);
        },
        (err) => onError?.(err)
      );
    }, [onError, onSpotsChange]);

    return (
      <div className="parking-bjx-public" aria-label="Mapa de estacionamiento">
        <header className="parking-bjx-public__bar">
          <div className="parking-bjx-public__chip">
            <strong>Patio</strong>
            <span>{metrics.disponiblePct}% disponible</span>
          </div>
          <div className="parking-bjx-public__metrics" aria-label="Resumen de cajones">
            <span>
              <strong>{metrics.libre}</strong>
              <small>Libres</small>
            </span>
            <span>
              <strong>{metrics.ocupado}</strong>
              <small>Ocupados</small>
            </span>
            <span>
              <strong>{metrics.reservado}</strong>
              <small>Reservados</small>
            </span>
          </div>
        </header>

        <div className="parking-bjx-public__viewport" ref={viewportRef}>
          <section
            className="parking-bjx-public__stage"
            style={{ width: YARD_STAGE_W, height: YARD_STAGE_H, transform: `scale(${scale})` }}
          >
            {allSlots.map((slot) => {
              const interactive = !slot.isArea && !slot.isWorkshop;
              const state: PublicSlotState = interactive
                ? publicStateForSpot(parkingById[slot.label])
                : 'libre';
              const stateLabel = PUBLIC_STATE_LABEL[state];

              return (
                <div
                  key={slot.label}
                  className={[
                    slot.isArea ? 'parking-bjx-area' : 'parking-bjx-slot',
                    slot.wide ? 'is-wide' : '',
                    slot.isWorkshop ? 'is-workshop' : '',
                    interactive ? 'is-interactive' : '',
                    interactive ? `state-${state}` : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    left: slot.left,
                    top: slot.top,
                    width: slot.w,
                    height: slot.h
                  }}
                  data-label={slot.label}
                  aria-label={
                    interactive ? `Cajón ${slot.label}, ${stateLabel}` : `Zona ${slot.label}`
                  }
                >
                  {interactive && state !== 'libre' ? (
                    <span className="parking-bjx-slot__state" aria-hidden="true">
                      {stateLabel}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </section>
        </div>
      </div>
    );
  }
);
