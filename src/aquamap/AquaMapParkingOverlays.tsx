const LEGEND_FULL = [
  { key: 'libre', label: 'Libre', dot: 'bg-emerald-400' },
  { key: 'reservado', label: 'Reservado', dot: 'bg-amber-400' },
  { key: 'ocupado', label: 'Ocupado', dot: 'bg-red-500' },
  { key: 'mantenimiento', label: 'Mantenimiento', dot: 'bg-slate-500' }
] as const;

const LEGEND_PUBLIC = [
  { key: 'libre', label: 'Libre', dot: 'bg-emerald-400' },
  { key: 'ocupado', label: 'Ocupado', dot: 'bg-slate-400' }
] as const;

const CORNERS = [
  { pos: 'left-3 top-14', text: 'Plano operativo' },
  { pos: 'right-3 top-14 text-right', text: 'Entrada / salida' },
  { pos: 'left-3 bottom-14', text: 'Patio' },
  { pos: 'right-3 bottom-14 text-right', text: 'Taller' }
] as const;

/** Leyenda de estados y etiquetas de orientación (solo lectura, encima del Stage). */
type OverlayProps = { publicOnly?: boolean };

export function AquaMapParkingOverlays({ publicOnly = false }: OverlayProps) {
  const legend = publicOnly ? LEGEND_PUBLIC : LEGEND_FULL;
  return (
    <>
      <div className="pointer-events-none absolute left-1/2 top-3 z-[16] flex -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full border border-teal-600/35 bg-[#0f172a]/88 px-4 py-1.5 font-mono text-[9px] uppercase tracking-wide text-slate-200 shadow-lg backdrop-blur-sm">
        {legend.map((row) => (
          <span key={row.key} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={`h-2 w-2 shrink-0 rounded-full shadow ${row.dot}`} aria-hidden />
            {row.label}
          </span>
        ))}
      </div>
      {CORNERS.map((c) => (
        <div
          key={c.text}
          className={`pointer-events-none absolute z-[15] max-w-[42%] rounded-full border border-teal-800/40 bg-[#0f172a]/75 px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-wider text-teal-100/90 shadow backdrop-blur-sm ${c.pos}`}
        >
          {c.text}
        </div>
      ))}
    </>
  );
}
