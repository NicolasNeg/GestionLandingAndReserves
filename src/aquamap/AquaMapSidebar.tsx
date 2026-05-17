import {
  ArrowUpLeft,
  Car,
  CopyPlus,
  Droplets,
  Settings,
  Square,
  Trash2,
  Trees,
  Upload,
  Waves,
  Wrench
} from 'lucide-react';
import { useMemo, useRef } from 'react';
import { presetSizeForType } from './elementDefaults';
import type { ElementType, MapElement, ParkingSpotStatus } from './types';
import { AQUAMAP_WORLD_MAX_H, AQUAMAP_WORLD_MAX_W } from './world';

const TYPE_META: Record<ElementType, { label: string; Icon: typeof Droplets }> = {
  pool: { label: 'Alberca', Icon: Droplets },
  slide: { label: 'Tobogán', Icon: Waves },
  service: { label: 'Servicio', Icon: Wrench },
  tree: { label: 'Árbol', Icon: Trees },
  mesa: { label: 'Mesa', Icon: Square },
  parking: { label: 'Cajón', Icon: Car }
};

const SWATCHES = ['#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#eab308', '#ef4444', '#64748b', '#f8fafc'];

type Props = {
  editorSkin?: 'aquatic' | 'parking';
  layerLabel: string;
  layerHint: string;
  allowedTypes: ElementType[];
  world: { w: number; h: number };
  elements: MapElement[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selected: MapElement | null;
  onAdd: (type: ElementType) => void;
  onUpdateSelected: (
    patch: Partial<
      Pick<MapElement, 'name' | 'color' | 'width' | 'height' | 'imgSrc' | 'description' | 'parkingStatus'>
    >
  ) => void;
  onWorldChange: (patch: Partial<{ w: number; h: number }>) => void;
  onApplyPresetSize: () => void;
  onDuplicateSelected?: () => void;
  onDeleteSelected?: () => void;
  onSaveClick: () => void;
  onPublishClick: () => void;
  /** En vista previa los botones de añadir quedan deshabilitados pero visibles. */
  addDisabled?: boolean;
  /** Oculta la cuadrícula rápida “Añadir al mapa” (p. ej. modo patio con barra propia). */
  hideQuickAdd?: boolean;
  /** Scroll al panel Sitio (guardar / pestañas). */
  onExitToSitePanel?: () => void;
};

export function AquaMapSidebar({
  editorSkin = 'aquatic',
  layerLabel,
  layerHint,
  allowedTypes,
  world,
  elements,
  selectedId,
  setSelectedId,
  selected,
  onAdd,
  onUpdateSelected,
  onWorldChange,
  onApplyPresetSize,
  onDuplicateSelected,
  onDeleteSelected,
  onSaveClick,
  onPublishClick,
  addDisabled = false,
  hideQuickAdd = false,
  onExitToSitePanel
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const maxW = Math.min(2400, Math.max(200, Math.round(world.w * 0.65)));
  const maxH = Math.min(2000, Math.max(160, Math.round(world.h * 0.65)));
  const preset = selected ? presetSizeForType(selected.type) : null;

  const addButtons = useMemo(
    () => allowedTypes.map((type) => ({ type, ...TYPE_META[type] })),
    [allowedTypes]
  );

  return (
    <aside
      className={`flex h-full w-[min(22%,300px)] min-w-[240px] flex-shrink-0 flex-col border-l shadow-[inset_1px_0_0_0_rgba(255,255,255,0.03)] ${
        editorSkin === 'parking'
          ? 'border-l-amber-900/40 bg-[#2c261c] text-[#f5f5f4]'
          : 'border-l-[#1a1a1a] bg-[#323232] text-[#e5e5e5]'
      }`}
    >
      <SidebarHeader editorSkin={editorSkin} layerLabel={layerLabel} layerHint={layerHint} />

      <section className="flex-shrink-0 border-b border-[#1f1f1f] px-3 py-2.5">
        <h2 className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#737373]">
          Tamaño del lienzo
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5 font-mono text-[9px] text-[#737373]">
            Ancho
            <input
              type="number"
              min={400}
              max={AQUAMAP_WORLD_MAX_W}
              step={10}
              className="rounded border border-[#1f1f1f] bg-[#1e1e1e] px-2 py-1 text-[11px] text-white"
              value={world.w}
              onChange={(e) => onWorldChange({ w: parseInt(e.target.value, 10) || world.w })}
            />
          </label>
          <label className="flex flex-col gap-0.5 font-mono text-[9px] text-[#737373]">
            Alto
            <input
              type="number"
              min={280}
              max={AQUAMAP_WORLD_MAX_H}
              step={10}
              className="rounded border border-[#1f1f1f] bg-[#1e1e1e] px-2 py-1 text-[11px] text-white"
              value={world.h}
              onChange={(e) => onWorldChange({ h: parseInt(e.target.value, 10) || world.h })}
            />
          </label>
        </div>
      </section>

      {!hideQuickAdd ? (
        <section className="flex-shrink-0 border-b border-[#1f1f1f] px-3 py-2.5">
          <h2 className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#737373]">
            Añadir al mapa
          </h2>
          <AddToolsGrid addButtons={addButtons} onAdd={onAdd} disabled={addDisabled} />
        </section>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {selected ? (
          <section>
            <h2 className="mb-3 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#737373]">
              Capa activa
            </h2>

            <label className="mb-3 flex flex-col gap-1 text-[12px]">
              <span className="font-mono text-[9px] text-[#737373]">Elemento</span>
              <select
                className="rounded border border-[#1f1f1f] bg-[#1e1e1e] px-2 py-1.5 text-[#e5e5e5] outline-none focus:border-[#5eead4]/60"
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value || null)}
              >
                {elements.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.name || el.type}
                  </option>
                ))}
              </select>
            </label>

            <p className="mb-2 font-mono text-[9px] leading-relaxed text-[#737373]">
              Arrastra en el mapa, clic derecho para acciones o usa las esquinas azules.
            </p>

            {onDuplicateSelected || onDeleteSelected ? (
              <div className="mb-3 grid grid-cols-2 gap-1.5">
                {onDuplicateSelected ? (
                  <button
                    type="button"
                    onClick={onDuplicateSelected}
                    className="aquamap-pressable flex items-center justify-center gap-1.5 rounded border border-[#404040] bg-[#2a2a2a] py-1.5 text-[10px] text-[#d4d4d4] hover:bg-[#333]"
                  >
                    <CopyPlus className="h-3.5 w-3.5 text-[#5eead4]" strokeWidth={2} />
                    Duplicar
                  </button>
                ) : null}
                {onDeleteSelected ? (
                  <button
                    type="button"
                    onClick={onDeleteSelected}
                    className="aquamap-pressable flex items-center justify-center gap-1.5 rounded border border-rose-900/50 bg-rose-950/30 py-1.5 text-[10px] text-rose-200 hover:bg-rose-950/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Eliminar
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-2.5 text-[12px]">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] text-[#737373]">Nombre</span>
                <input
                  className="rounded border border-[#1f1f1f] bg-[#1e1e1e] px-2 py-1.5 text-[#e5e5e5] outline-none focus:border-[#5eead4]/60"
                  value={selected.name}
                  onChange={(e) => onUpdateSelected({ name: e.target.value })}
                />
              </label>

              {selected.type === 'parking' ? (
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] text-[#737373]">Estado operativo</span>
                  <select
                    className="rounded border border-[#1f1f1f] bg-[#1e1e1e] px-2 py-1.5 text-[#e5e5e5] outline-none focus:border-[#5eead4]/60"
                    value={selected.parkingStatus ?? 'libre'}
                    onChange={(e) =>
                      onUpdateSelected({ parkingStatus: e.target.value as ParkingSpotStatus })
                    }
                  >
                    <option value="libre">Libre</option>
                    <option value="reservado">Reservado</option>
                    <option value="ocupado">Ocupado</option>
                    <option value="mantenimiento">Mantenimiento</option>
                  </select>
                </label>
              ) : null}

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] text-[#737373]">Descripción pública</span>
                <textarea
                  rows={3}
                  className="resize-y rounded border border-[#1f1f1f] bg-[#1e1e1e] px-2 py-1.5 text-[12px] text-[#e5e5e5] outline-none focus:border-[#5eead4]/60"
                  value={selected.description}
                  onChange={(e) => onUpdateSelected({ description: e.target.value })}
                />
              </label>

              <div className="rounded border border-[#2a2a2a] bg-[#262626] p-2.5">
                <SizePresetHeader onApplyPresetSize={onApplyPresetSize} preset={preset} />
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-0.5 font-mono text-[9px] text-[#737373]">
                    Ancho
                    <input
                      type="number"
                      min={24}
                      max={maxW}
                      value={Math.round(selected.width)}
                      onChange={(e) => onUpdateSelected({ width: Number(e.target.value) || selected.width })}
                      className="rounded border border-[#1f1f1f] bg-[#1e1e1e] px-2 py-1 text-[11px] text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 font-mono text-[9px] text-[#737373]">
                    Alto
                    <input
                      type="number"
                      min={24}
                      max={maxH}
                      value={Math.round(selected.height)}
                      onChange={(e) => onUpdateSelected({ height: Number(e.target.value) || selected.height })}
                      className="rounded border border-[#1f1f1f] bg-[#1e1e1e] px-2 py-1 text-[11px] text-white"
                    />
                  </label>
                </div>
                <label className="mt-2 flex flex-col gap-1">
                  <span className="font-mono text-[9px] text-[#737373]">Ancho (deslizador)</span>
                  <input
                    type="range"
                    min={24}
                    max={maxW}
                    value={Math.round(selected.width)}
                    onChange={(e) => onUpdateSelected({ width: Number(e.target.value) })}
                    className="accent-[#5eead4]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] text-[#737373]">Alto (deslizador)</span>
                  <input
                    type="range"
                    min={24}
                    max={maxH}
                    value={Math.round(selected.height)}
                    onChange={(e) => onUpdateSelected({ height: Number(e.target.value) })}
                    className="accent-[#5eead4]"
                  />
                </label>
              </div>

              {!(editorSkin === 'parking' && selected.type === 'parking') ? (
                <>
                  <div>
                    <span className="font-mono text-[9px] text-[#737373]">Color de acento</span>
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {SWATCHES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          title={c}
                          onClick={() => onUpdateSelected({ color: c })}
                          className={`aquamap-pressable h-7 w-full rounded border transition ${
                            selected.color.toLowerCase() === c.toLowerCase()
                              ? 'border-white ring-1 ring-[#5eead4]/50'
                              : 'border-transparent hover:border-[#525252]'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      className="mt-2 h-9 w-full cursor-pointer rounded border border-[#1f1f1f] bg-[#1e1e1e]"
                      value={selected.color}
                      onChange={(e) => onUpdateSelected({ color: e.target.value })}
                    />
                  </div>

                  <div className="rounded border border-dashed border-[#404040] bg-[#262626] p-2.5">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const r = reader.result;
                          if (typeof r === 'string') onUpdateSelected({ imgSrc: r });
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="aquamap-pressable flex w-full cursor-pointer flex-col items-center gap-1.5 rounded py-2 text-center text-[10px] text-[#a3a3a3] hover:bg-[#2e2e2e]"
                    >
                      <Upload className="h-5 w-5 text-[#5eead4]" strokeWidth={1.5} />
                      <span>Textura personalizada</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        ) : (
          <p className="rounded border border-dashed border-[#404040] bg-[#262626] p-3 text-[11px] leading-relaxed text-[#a3a3a3]">
            {hideQuickAdd
              ? 'Selecciona un spot en el mapa o usa “Agregar spot” en la barra superior.'
              : 'Selecciona un elemento en el mapa o añade uno con las herramientas de arriba.'}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-[#1f1f1f] bg-[#3c3c3c] p-2.5">
        {onExitToSitePanel ? (
          <button
            type="button"
            onClick={onExitToSitePanel}
            className="aquamap-pressable mb-1.5 flex w-full items-center justify-center gap-2 rounded border border-[#525252] bg-[#2a2a2a] py-2 text-[11px] font-semibold text-[#e5e5e5] hover:bg-[#333]"
          >
            <ArrowUpLeft className="h-3.5 w-3.5 shrink-0 text-[#a3a3a3]" strokeWidth={2} />
            Volver al panel Sitio
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSaveClick}
          className="aquamap-pressable w-full rounded border border-[#166534] bg-[#14532d] py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-[#166534]"
        >
          Guardar cambios
        </button>
        <button
          type="button"
          onClick={onPublishClick}
          className="aquamap-pressable mt-1.5 w-full rounded border border-[#404040] bg-[#2a2a2a] py-2 text-[12px] font-medium text-[#d4d4d4] hover:bg-[#333]"
        >
          Vista previa web
        </button>
      </div>
    </aside>
  );
}

function SidebarHeader({
  editorSkin,
  layerLabel,
  layerHint
}: {
  editorSkin: 'aquatic' | 'parking';
  layerLabel: string;
  layerHint: string;
}) {
  const accent =
    editorSkin === 'parking' ? 'text-amber-400' : 'text-[#5eead4]';
  const title =
    editorSkin === 'parking' ? 'Editor de estacionamiento' : 'Editor del mapa';
  return (
    <div className="flex-shrink-0 border-b border-[#1f1f1f] bg-[#3c3c3c] px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`font-mono text-[9px] font-semibold uppercase tracking-[0.18em] ${accent}`}>
            Capa · {layerLabel}
          </p>
          <h1 className="text-[13px] font-semibold tracking-tight text-[#f5f5f5]">{title}</h1>
          <p className="mt-1 text-[10px] leading-snug text-[#737373]">{layerHint}</p>
        </div>
        <Settings className="mt-0.5 h-4 w-4 shrink-0 text-[#737373]" strokeWidth={1.5} aria-hidden />
      </div>
    </div>
  );
}

function AddToolsGrid({
  addButtons,
  onAdd,
  disabled
}: {
  addButtons: { type: ElementType; label: string; Icon: typeof Droplets }[];
  onAdd: (type: ElementType) => void;
  disabled?: boolean;
}) {
  if (!addButtons.length) {
    return (
      <p className="text-[10px] leading-snug text-[#737373]">
        No hay herramientas para esta capa. Cambia de vista (Global, Mesas, etc.).
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {addButtons.map(({ type, label, Icon }) => (
        <button
          key={type}
          type="button"
          disabled={disabled}
          onClick={() => onAdd(type)}
          className={`aquamap-pressable flex flex-col items-center gap-1 rounded border px-1.5 py-2.5 text-[10px] font-medium ${
            disabled
              ? 'cursor-not-allowed border-[#333] bg-[#252525] text-[#525252]'
              : 'border-[#1f1f1f] bg-[#2a2a2a] text-[#d4d4d4] hover:border-[#525252] hover:bg-[#333]'
          }`}
        >
          <Icon className="h-4 w-4 text-[#5eead4]" strokeWidth={1.75} />
          {label}
        </button>
      ))}
    </div>
  );
}

function SizePresetHeader({
  onApplyPresetSize,
  preset
}: {
  onApplyPresetSize: () => void;
  preset: { width: number; height: number } | null;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="font-mono text-[9px] font-semibold uppercase text-[#737373]">Tamaño (px)</span>
      {preset ? (
        <button
          type="button"
          onClick={onApplyPresetSize}
          className="aquamap-pressable rounded border border-[#404040] px-2 py-0.5 text-[9px] text-[#a3a3a3] hover:bg-[#333]"
          title={`Restaurar ${preset.width}×${preset.height}`}
        >
          Tamaño tipo
        </button>
      ) : null}
    </div>
  );
}
