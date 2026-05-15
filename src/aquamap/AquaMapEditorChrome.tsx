import type { ReactNode } from 'react';

type Props = {
  zoomPercent: number;
  children: ReactNode;
  /** Contenido extra a la derecha de la barra (p. ej. estado). */
  trailing?: ReactNode;
};

/**
 * Marco tipo Photoshop: barra superior oscura, lienzo con tablero de ajedrez, borde sutil.
 */
export function AquaMapEditorChrome({ zoomPercent, children, trailing }: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#1f1f1f] bg-[#323232] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#1a1a1a] bg-[#3c3c3c] px-3 py-1.5 text-[11px] text-[#d4d4d4]">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold tracking-wide text-[#e5e5e5]">Lienzo</span>
          <span className="hidden text-[#737373] sm:inline" aria-hidden>
            |
          </span>
          <span className="font-mono text-[#a3a3a3]" title="Zoom del mapa">
            {zoomPercent}%
          </span>
          <span className="hidden text-[#525252] md:inline" aria-hidden>
            ·
          </span>
          <span className="hidden max-w-[28rem] truncate text-[#737373] md:inline" title="Atajos">
            Clic derecho · menú · Ctrl+C/V/D · Supr · flechas · Espacio pan · rueda zoom
          </span>
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </header>
      <div className="aquamap-artboard relative min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.65]" aria-hidden />
        <div className="aquamap-canvas-mount relative h-full w-full shadow-[inset_0_0_80px_rgba(0,0,0,0.25)]">{children}</div>
      </div>
    </div>
  );
}
