const ROWS: { label: string; color: string }[] = [
  { label: 'Alberca', color: '#0ea5e9' },
  { label: 'Tobogan', color: '#f97316' },
  { label: 'Servicio', color: '#a855f7' },
  { label: 'Arbol', color: '#22c55e' },
  { label: 'Mesa', color: '#94a3b8' },
  { label: 'Cajon', color: '#64748b' }
];

export function AquaMapLegend() {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[11rem] rounded-xl border border-white/10 bg-slate-900/55 px-3 py-2.5 text-[10px] text-slate-100 shadow-lg backdrop-blur-md">
      <p className="mb-1.5 font-bold uppercase tracking-wide text-slate-300">Leyenda</p>
      <ul className="space-y-1">
        {ROWS.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm shadow" style={{ backgroundColor: r.color }} />
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
