import { Minus, Plus, RotateCcw } from 'lucide-react';

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export function AquaMapZoomHud({ onZoomIn, onZoomOut, onReset }: Props) {
  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-xl border border-white/10 bg-slate-900/70 p-1 shadow-lg backdrop-blur-md">
      <button
        type="button"
        onClick={onZoomIn}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-100 transition hover:bg-white/10"
        title="Acercar"
        aria-label="Acercar"
      >
        <Plus className="h-5 w-5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-100 transition hover:bg-white/10"
        title="Alejar"
        aria-label="Alejar"
      >
        <Minus className="h-5 w-5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-100 transition hover:bg-white/10"
        title="Centrar zoom"
        aria-label="Centrar zoom"
      >
        <RotateCcw className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
