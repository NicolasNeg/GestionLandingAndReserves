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

function normalizeFolio(v: string) {
  return String(v || '').trim().toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json(405, { ok: false });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceRoleKey) return json(200, { ok: true, generic: true });

  const sb = createClient(supabaseUrl, serviceRoleKey);
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || '').trim().toLowerCase();
  const folio = normalizeFolio(String(body?.folio || ''));

  if (!email || !folio) return json(200, { ok: true, generic: true });

  const shortFolio = folio.slice(0, 8);
  const { data: rows } = await sb
    .from('tickets')
    .select('id, cliente_email, codigo_corto')
    .ilike('cliente_email', email)
    .order('created_at', { ascending: false })
    .limit(50);

  const match = (rows || []).find((row) => {
    const id = String(row.id || '').toUpperCase();
    const code = normalizeFolio(String(row.codigo_corto || ''));
    return id === folio || id.startsWith(shortFolio) || code === folio || code.startsWith(shortFolio);
  });

  if (match) {
    await sb.functions.invoke('send-ticket-email', {
      body: {
        ticketId: match.id,
        toEmail: email,
        mode: 'resend'
      }
    });
  } else {
    await sb.from('ticket_delivery_logs').insert({
      ticket_id: `recovery:${shortFolio || 'unknown'}`,
      email,
      channel: 'email',
      status: 'failed',
      error: 'recovery_no_match',
      metadata: { mode: 'recovery' }
    });
  }

  return json(200, { ok: true, generic: true, message: 'Si los datos coinciden, enviaremos el ticket al correo indicado.' });
});

