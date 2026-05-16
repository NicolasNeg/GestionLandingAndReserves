type Props = {
  spotDraft: string;
  onSpotDraftChange: (v: string) => void;
  onAddSpot: () => void;
  disabled?: boolean;
};

/**
 * Barra superior tipo sandbox: título del patio + alta rápida por código de cajón.
 */
export function AquaMapParkingChrome({ spotDraft, onSpotDraftChange, onAddSpot, disabled }: Props) {
  return (
    <div className="mb-2 flex shrink-0 flex-col gap-2 rounded-lg border border-teal-900/35 bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#0c1524] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(45,212,191,0.12)] sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-bold uppercase tracking-[0.08em] text-[#e2e8f0]">Plano del patio</h2>
        <p className="mt-0.5 max-w-xl text-[11px] leading-snug text-slate-400">
          Arrastra una unidad para actualizar su ubicación. Escribe un código y agrégalo al lienzo.
        </p>
      </div>
      <div className="flex w-full flex-shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        <label className="sr-only" htmlFor="aquamap-parking-spot-id">
          ID del spot
        </label>
        <input
          id="aquamap-parking-spot-id"
          type="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="ID spot (ej. P-01)"
          disabled={disabled}
          value={spotDraft}
          onChange={(e) => onSpotDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddSpot();
            }
          }}
          className="min-w-[10rem] flex-1 rounded-md border border-teal-900/40 bg-[#0b1220] px-2.5 py-1.5 font-mono text-[12px] text-slate-100 placeholder:text-slate-600 outline-none ring-teal-500/30 focus:border-teal-500/50 focus:ring-2 disabled:opacity-50 sm:flex-none sm:min-w-[11rem]"
        />
        <button
          type="button"
          disabled={disabled || !spotDraft.trim()}
          onClick={onAddSpot}
          className="aquamap-pressable rounded-md border border-emerald-700/50 bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-40"
        >
          Agregar spot
        </button>
      </div>
    </div>
  );
}
