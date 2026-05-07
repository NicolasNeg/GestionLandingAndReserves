// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

function money(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : '$0.00';
}

function buildItemsHtml(items: any[]) {
  if (!Array.isArray(items) || !items.length) return '<li>Acceso general</li>';
  return items
    .map((it) => {
      const label = String(it?.nombre || it?.name || it?.label || 'Producto');
      const qty = Number(it?.cantidad || it?.qty || 1);
      const subtotal = money(it?.subtotal ?? it?.total ?? (Number(it?.precio || it?.price || 0) * qty));
      return `<li>${qty} x ${label} — ${subtotal}</li>`;
    })
    .join('');
}

function buildEmailHtml(ticket: any, toEmail: string) {
  const md = ticket?.metadata && typeof ticket.metadata === 'object' ? ticket.metadata : {};
  const items = Array.isArray(md.items) ? md.items : [];
  const folio = String(ticket?.codigo_corto || ticket?.id || '').slice(0, 12).toUpperCase();
  const cliente = String(ticket?.cliente_nombre || md.clienteNombre || 'Cliente');
  const total = money(ticket?.total ?? md.total);
  const qr = String(ticket?.qr_data || md.qrData || '');
  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') || '';
  const ticketUrl = siteUrl ? `${siteUrl.replace(/\/+$/, '')}/recuperar-ticket` : '';
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.45;color:#0f172a">
      <h2 style="margin:0 0 12px">Tu ticket está listo</h2>
      <p>Hola <strong>${cliente}</strong>, esta es tu confirmación de compra.</p>
      <p><strong>Folio:</strong> ${folio}<br/><strong>Correo:</strong> ${toEmail}<br/><strong>Total:</strong> ${total}</p>
      <p><strong>Resumen:</strong></p>
      <ul>${buildItemsHtml(items)}</ul>
      ${qr ? `<p><strong>Código QR:</strong><br/><code>${qr}</code></p>` : ''}
      <p>Presenta tu QR o folio en el acceso del parque.</p>
      ${ticketUrl ? `<p>Si necesitas otra copia, recupéralo aquí: <a href="${ticketUrl}">${ticketUrl}</a></p>` : ''}
      <hr/>
      <small>Este mensaje fue enviado automáticamente, por favor no respondas este correo.</small>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceRoleKey) return json(500, { error: 'supabase_env_missing' });

  const sb = createClient(supabaseUrl, serviceRoleKey);
  const body = await req.json().catch(() => ({}));
  const ticketId = String(body?.ticketId || '').trim();
  const toEmailOverride = String(body?.toEmail || '').trim();
  const mode = String(body?.mode || 'send');
  if (!ticketId) return json(400, { error: 'ticket_id_required' });

  const { data: ticket, error: ticketErr } = await sb
    .from('tickets')
    .select('id, codigo_corto, cliente_email, cliente_nombre, total, qr_data, metadata')
    .eq('id', ticketId)
    .maybeSingle();
  if (ticketErr || !ticket) return json(404, { error: 'ticket_not_found' });

  const toEmail = (toEmailOverride || ticket.cliente_email || '').trim();
  if (!toEmail) return json(400, { error: 'ticket_email_missing' });

  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
  const from = Deno.env.get('TICKET_EMAIL_FROM') || '';
  if (!resendApiKey || !from) return json(500, { error: 'Proveedor de correo no configurado.' });

  const html = buildEmailHtml(ticket, toEmail);
  const subject = `Tu ticket del parque (${String(ticket.codigo_corto || ticket.id).slice(0, 8).toUpperCase()})`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject,
      html
    })
  });
  const payload = await res.json().catch(() => ({}));
  const success = res.ok;

  await sb.from('ticket_delivery_logs').insert({
    ticket_id: String(ticket.id),
    email: toEmail,
    channel: 'email',
    status: success ? (mode === 'resend' ? 'resent' : 'sent') : 'failed',
    error: success ? null : String(payload?.message || payload?.error || `resend_${res.status}`),
    metadata: { provider: 'resend', mode, resendResponseId: payload?.id || null }
  });

  if (!success) return json(502, { sent: false, error: payload?.message || 'email_provider_error' });
  return json(200, { sent: true, provider: 'resend', id: payload?.id || null });
});

