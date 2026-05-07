import { supabase } from '../supabase/client.js';
import { sendTicketEmailCopy } from './sendTicketEmail.js';

/**
 * Envío best-effort del ticket por correo (Edge Function si existe, si no EmailJS).
 * No usa service role ni secretos extra en el cliente.
 *
 * Edge Function opcional: `send-ticket-email` con body `{ ticketId, toEmail?, clienteNombre? }`.
 * Si no está desplegada, se ignora el error y se intenta EmailJS.
 *
 * @param {{ ticketId: string, toEmail: string, clienteNombre?: string }} payload
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<{ sent: boolean, channel?: string, reason?: string }>}
 */
export async function sendTicketEmailBestEffort(payload, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 10000;
  const { ticketId, toEmail, clienteNombre = '' } = payload;

  const edgeAttempt = async () => {
    const { error } = await supabase.functions.invoke('send-ticket-email', {
      body: { ticketId, toEmail, clienteNombre }
    });
    if (error) throw error;
    return { sent: true, channel: 'edge' };
  };

  try {
    const result = await Promise.race([
      edgeAttempt(),
      new Promise((_, rej) =>
        setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })), timeoutMs)
      )
    ]);
    if (result?.sent) return result;
  } catch (e) {
    console.warn('[sendTicketEmailBestEffort] Edge Function no disponible o timeout:', e?.message || e);
  }

  return sendTicketEmailCopy({ toEmail, ticketId, clienteNombre }, { timeoutMs });
}
