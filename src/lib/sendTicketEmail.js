/**
 * Envío opcional de aviso por correo vía EmailJS (solo clave pública en cliente).
 * Configura en .env:
 *   VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY
 * La plantilla en EmailJS debe usar las variables: to_email, ticket_id, cliente_nombre, reply_to
 */

const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';

/**
 * @param {{ toEmail: string, ticketId: string, clienteNombre?: string }} params
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<{ sent: boolean, reason?: string }>}
 */
export async function sendTicketEmailCopy({ toEmail, ticketId, clienteNombre = '' }, options = {}) {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  const timeoutMs = options.timeoutMs ?? 10000;

  if (!serviceId || !templateId || !publicKey) {
    return { sent: false, reason: 'no_config' };
  }

  const body = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: toEmail,
      ticket_id: ticketId,
      cliente_nombre: clienteNombre,
      reply_to: toEmail,
      message: `Tu ticket Balneario San Antonio: ${ticketId}. Conserva este correo o descarga el PDF desde "Mis tickets" en la web.`
    }
  };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(EMAILJS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[sendTicketEmailCopy]', res.status, text);
      return { sent: false, reason: 'request_failed' };
    }

    return { sent: true };
  } catch (e) {
    if (e?.name === 'AbortError') {
      console.warn('[sendTicketEmailCopy] timeout');
      return { sent: false, reason: 'timeout' };
    }
    console.warn('[sendTicketEmailCopy]', e);
    return { sent: false, reason: 'network' };
  } finally {
    clearTimeout(t);
  }
}
