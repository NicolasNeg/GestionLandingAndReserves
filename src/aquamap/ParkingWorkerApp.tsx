import { useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/authProvider.js';
import { getUserAccess } from '../lib/accessControl.js';
import { subscribeParkingSpots } from '../lib/parkingRealtime.js';
import { ParkingBjxSandbox } from './ParkingBjxSandbox';
import type { ParkingSpotLive } from './parkingSpotsSync';

type Props = {
  onBack?: () => void;
};

export function ParkingWorkerApp({ onBack }: Props) {
  const [parkingById, setParkingById] = useState<Record<string, ParkingSpotLive>>({});
  const [loading, setLoading] = useState(true);
  const [canEditMapLayout, setCanEditMapLayout] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 120);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    void (async () => {
      const user = getCurrentUser();
      if (!user) return;
      const access = await getUserAccess(user);
      setCanEditMapLayout(
        Boolean(access.isProgramador || access.can('admin.panel') || access.can('dashboard.manage'))
      );
    })();
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
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#121329] text-sm text-slate-400">
        Cargando patio…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ParkingBjxSandbox
        parkingById={parkingById}
        plazaCode="Patio"
        onBack={onBack}
        canEditMapLayout={canEditMapLayout}
      />
    </div>
  );
}
