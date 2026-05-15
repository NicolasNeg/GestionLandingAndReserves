import { Minus, Plus, RotateCcw } from 'lucide-react';

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  /** Zoom en porcentaje (100 = encuadre base). */
  zoomPercent: number;
};

export function AquaMapZoomHud({ onZoomIn, onZoomOut, onReset, zoomPercent }: Props) {
  const pct = Math.round(Math.max(42, Math.min(235, zoomPercent)));
  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-0.5 rounded-md border border-[#1f1f1f] bg-[#3c3c3c]/95 p-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <button
        type="button"
        onClick={onZoomIn}
        className="aquamap-pressable flex h-8 w-9 items-center justify-center rounded text-[#e5e5e5] hover:bg-[#4a4a4a] hover:text-white active:bg-[#333]"
        title="Acercar"
        aria-label="Acercar"
      >
        <Plus className="h-4 w-4" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className="aquamap-pressable flex h-8 w-9 items-center justify-center rounded text-[#e5e5e5] hover:bg-[#4a4a4a] hover:text-white active:bg-[#333]"
        title="Alejar"
        aria-label="Alejar"
      >
        <Minus className="h-4 w-4" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="aquamap-pressable flex h-8 w-9 items-center justify-center rounded text-[#e5e5e5] hover:bg-[#4a4a4a] hover:text-white active:bg-[#333]"
        title="Restablecer vista y zoom"
        aria-label="Restablecer vista y zoom"
      >
        <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
      <div className="mx-0.5 mb-0.5 mt-1 border-t border-[#2a2a2a] pt-1 text-center font-mono text-[9px] font-semibold text-[#a3a3a3]">
        {pct}%
      </div>
    </div>
  );
}
