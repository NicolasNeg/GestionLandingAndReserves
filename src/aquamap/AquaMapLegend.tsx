const ROWS: { label: string; color: string }[] = [
  { label: 'Alberca', color: '#0ea5e9' },
  { label: 'Tobogán', color: '#f97316' },
  { label: 'Servicio', color: '#a855f7' },
  { label: 'Árbol', color: '#22c55e' },
  { label: 'Mesa', color: '#10b981' },
  { label: 'Cajón', color: '#f59e0b' }
];

export function AquaMapLegend() {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[11rem] rounded-md border border-[#1f1f1f] bg-[#3c3c3c]/90 px-2.5 py-2 font-mono text-[9px] text-[#d4d4d4] shadow-[0_6px_20px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#a3a3a3]">Leyenda</p>
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
