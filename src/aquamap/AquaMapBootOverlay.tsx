type Props = {
  /** Texto bajo la barra (estilo splash Blender). */
  subtitle?: string;
};

/**
 * Overlay de arranque: fondo oscuro, acento naranja, tipografía monoespaciada.
 */
export function AquaMapBootOverlay({ subtitle = 'Sincronizando texturas del lienzo' }: Props) {
  return (
    <div
      className="aquamap-boot pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-[#141414]/94 backdrop-blur-[3px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="max-w-sm px-6 text-center">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[#e87d3e]">
          AquaMap
        </p>
        <p className="mt-3 font-mono text-sm font-medium leading-snug text-neutral-200">
          Cargando escena…
        </p>
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-neutral-500">{subtitle}</p>
      </div>
      <div className="w-52 max-w-[70%] aquamap-boot__bar" aria-hidden />
      <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Viewport · isometrico</p>
    </div>
  );
}
