import type { ParkingSpotCounts } from './parkingSpotStats';

type Props = {
  spotDraft: string;
  spotError?: string | null;
  counts?: ParkingSpotCounts;
  onSpotDraftChange: (v: string) => void;
  onAddSpot: () => void;
  onSuggestNextId?: () => void;
  onAddRow?: (count: number) => void;
  onAlignRow?: () => void;
  disabled?: boolean;
};

export function AquaMapParkingChrome({
  spotDraft,
  spotError,
  counts,
  onSpotDraftChange,
  onAddSpot,
  onSuggestNextId,
  onAddRow,
  onAlignRow,
  disabled
}: Props) {
  return (
    <div className="mb-2 flex shrink-0 flex-col gap-2 rounded-lg border border-teal-900/35 bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#0c1524] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(45,212,191,0.12)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-bold uppercase tracking-[0.08em] text-[#e2e8f0]">Diseño del plano</h2>
          <p className="mt-0.5 max-w-xl text-[11px] leading-snug text-slate-400">
            Coloca cajones y zonas para la vista pública. Para mover autos y estados usa Gestión → Patio operativo
            (sandbox).
          </p>
        </div>
        {counts && counts.total > 0 ? (
          <span className="inline-flex items-center rounded-full border border-teal-900/40 bg-[#0b1220]/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide text-slate-300">
            {counts.total} cajón{counts.total === 1 ? '' : 'es'} en el plano
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAddRow?.(5)}
          className="aquamap-pressable rounded-md border border-teal-800/50 bg-[#0b1220] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-100 hover:bg-teal-950/60 disabled:opacity-40"
        >
          Fila ×5
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAddRow?.(10)}
          className="aquamap-pressable rounded-md border border-teal-800/50 bg-[#0b1220] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-100 hover:bg-teal-950/60 disabled:opacity-40"
        >
          Fila ×10
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onAlignRow}
          className="aquamap-pressable rounded-md border border-slate-600/50 bg-[#0b1220] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300 hover:bg-slate-900/60 disabled:opacity-40"
        >
          Alinear fila
        </button>
        {onSuggestNextId ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onSuggestNextId}
            className="aquamap-pressable rounded-md border border-slate-600/50 bg-[#0b1220] px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-900/60 disabled:opacity-40"
          >
            Siguiente ID
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-end">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
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
            aria-invalid={spotError ? true : undefined}
            className={`min-w-[10rem] flex-1 rounded-md border bg-[#0b1220] px-2.5 py-1.5 font-mono text-[12px] text-slate-100 placeholder:text-slate-600 outline-none ring-teal-500/30 focus:ring-2 disabled:opacity-50 sm:min-w-[11rem] sm:flex-none ${
              spotError
                ? 'border-rose-500/60 focus:border-rose-500/50'
                : 'border-teal-900/40 focus:border-teal-500/50'
            }`}
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
        {spotError ? (
          <p className="text-[11px] font-medium text-rose-400 sm:text-right" role="alert">
            {spotError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
