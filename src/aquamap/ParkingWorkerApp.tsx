import { useEffect, useState } from 'react';
import { subscribeParkingSpots } from '../lib/parkingRealtime.js';
import { getLandingPage } from '../lib/dataLayer.js';
import { ParkingYardSandbox } from './ParkingYardSandbox';
import { ensureAquamapEnvelopeFromSiteJson, type AquamapSiteEnvelope } from './siteEnvelope';
import type { ParkingSpotLive } from './parkingSpotsSync';

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-[#121329] text-sm text-slate-400">
        Cargando patio…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-[#121329] p-4 text-center text-sm text-rose-300">
        {loadError}
      </div>
    );
  }

  return (
    <ParkingYardSandbox
      envelope={envelope}
      setEnvelope={setEnvelope}
      parkingById={parkingById}
      onBack={onBack}
    />
  );
}
