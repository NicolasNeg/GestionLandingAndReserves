import { defaultMapJson } from '../mapEngine/mapMigrations.js';

export function defaultMapJsonString(view: string = 'global') {
  return defaultMapJson(view);
}
