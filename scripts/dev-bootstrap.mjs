#!/usr/bin/env node
/**
 * Ayuda de desarrollo: la sesión admin en localhost ya está activa por defecto con `npm run dev`.
 * Este script solo imprime instrucciones. Para desactivar el modo, añade a `.env.local`:
 *   VITE_DEV_BOOTSTRAP=0
 * y reinicia Vite.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envLocal = path.join(root, '.env.local');

console.log('Modo localhost + npm run dev');
console.log('  → Sesión ficticia con permisos de admin ya activa por defecto (sin configurar nada).');
console.log('');
console.log('Para probar login real en localhost, desactívalo en .env.local:');
console.log('  VITE_DEV_BOOTSTRAP=0');
console.log(`  (archivo sugerido: ${envLocal})`);
console.log('  Luego reinicia el servidor de Vite.');
console.log('');
