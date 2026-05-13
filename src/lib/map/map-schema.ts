import { z } from 'zod';

/** Subconjunto validado del documento persistido (compatible con mapSchema.normalizeMapDocument). */
export const mapPublicBlockSchema = z.object({
  visible: z.boolean().optional(),
  showLabel: z.boolean().optional(),
  shortDescription: z.string().optional(),
  image: z.string().optional(),
  tips: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export const mapObjectStyleSchema = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().optional(),
  dash: z.union([z.array(z.number()), z.boolean()]).optional(),
  fontSize: z.number().optional(),
  color: z.string().optional(),
  background: z.string().optional(),
  cornerRadius: z.number().optional()
});

export const mapObjectSchema = z.object({
  id: z.string(),
  type: z.string(),
  kind: z.string().optional(),
  label: z.string().optional(),
  notes: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  points: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  opacity: z.number().optional(),
  zIndex: z.number().optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  layerId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  public: mapPublicBlockSchema.optional()
});

export const mapCanvasSchema = z.object({
  width: z.number(),
  height: z.number(),
  backgroundType: z.enum(['park', 'color', 'image', 'none']).optional(),
  backgroundImage: z.string().optional(),
  fit: z.enum(['cover', 'contain', 'stretch']).optional()
});

export const mapDocumentSchema = z.object({
  version: z.number(),
  view: z.string(),
  width: z.number(),
  height: z.number(),
  renderProfile: z.string().optional(),
  navGraph: z.unknown().optional(),
  publicMapUi: z.unknown().optional(),
  background: z.record(z.unknown()).optional(),
  grid: z.record(z.unknown()).optional(),
  layers: z.array(z.record(z.unknown())).optional(),
  items: z.array(mapObjectSchema)
});

export type MapObjectInput = z.infer<typeof mapObjectSchema>;
export type MapDocumentInput = z.infer<typeof mapDocumentSchema>;
