import { useEffect, useState } from 'react';
import { subscribeParkingSpots } from '../lib/parkingRealtime.js';
import { ParkingBjxSandbox } from './ParkingBjxSandbox';
import type { ParkingSpotLive } from './parkingSpotsSync';

type Props = {
  onBack?: () => void;
};

export function ParkingWorkerApp({ onBack }: Props) {
  const [parkingById, setParkingById] = useState<Record<string, ParkingSpotLive>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 120);
    return () => window.clearTimeout(t);
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

  return (
    <ParkingBjxSandbox parkingById={parkingById} plazaCode="Patio" onBack={onBack} />
  );
}
