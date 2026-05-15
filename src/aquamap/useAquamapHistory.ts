import { useCallback, useRef, useState } from 'react';
import type { AquamapSiteEnvelope } from './siteEnvelope';

const MAX_HISTORY = 80;

function cloneEnvelope(env: AquamapSiteEnvelope): AquamapSiteEnvelope {
  return JSON.parse(JSON.stringify(env)) as AquamapSiteEnvelope;
}

export function useAquamapHistory(initial: AquamapSiteEnvelope) {
  const pastRef = useRef<AquamapSiteEnvelope[]>([]);
  const futureRef = useRef<AquamapSiteEnvelope[]>([]);
  const [envelope, setEnvelopeState] = useState<AquamapSiteEnvelope>(initial);
  const envelopeRef = useRef(envelope);
  const applyingRef = useRef(false);
  const [tick, setTick] = useState(0);

  envelopeRef.current = envelope;

  const bump = useCallback(() => setTick((n) => n + 1), []);

  const commitEnvelope = useCallback(
    (next: AquamapSiteEnvelope | ((prev: AquamapSiteEnvelope) => AquamapSiteEnvelope)) => {
      if (applyingRef.current) {
        setEnvelopeState((prev) => (typeof next === 'function' ? next(prev) : next));
        return;
      }
      setEnvelopeState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        pastRef.current.push(cloneEnvelope(prev));
        if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
        futureRef.current = [];
        bump();
        return resolved;
      });
    },
    [bump]
  );

  const setEnvelope = commitEnvelope;

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (!past.length) return;
    applyingRef.current = true;
    futureRef.current.push(cloneEnvelope(envelopeRef.current));
    const prev = past.pop()!;
    setEnvelopeState(prev);
    applyingRef.current = false;
    bump();
  }, [bump]);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (!future.length) return;
    applyingRef.current = true;
    pastRef.current.push(cloneEnvelope(envelopeRef.current));
    const next = future.pop()!;
    setEnvelopeState(next);
    applyingRef.current = false;
    bump();
  }, [bump]);

  const resetHistory = useCallback(
    (next: AquamapSiteEnvelope) => {
      applyingRef.current = true;
      pastRef.current = [];
      futureRef.current = [];
      setEnvelopeState(next);
      applyingRef.current = false;
      bump();
    },
    [bump]
  );

  return {
    envelope,
    setEnvelope,
    commitEnvelope,
    undo,
    redo,
    canUndo: tick >= 0 && pastRef.current.length > 0,
    canRedo: tick >= 0 && futureRef.current.length > 0,
    resetHistory
  };
}
