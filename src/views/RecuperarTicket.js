import { recoverTicketByEmailAndFolio } from '../lib/ticketEmail.js';
import { navigateTo } from '../router.js';

const RecuperarTicket = {
  render: () => `
    <section class="mx-auto max-w-lg px-4 py-10">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 class="text-2xl font-black text-slate-900">Recuperar mi ticket</h1>
        <p class="mt-2 text-sm text-slate-600">Ingresa correo y folio. Si los datos coinciden, enviaremos una copia del ticket.</p>
        <form id="recover-ticket-form" class="mt-5 space-y-4">
          <label class="block">
            <span class="mb-1 block text-sm font-bold text-slate-700">Correo</span>
            <input id="recover-email" type="email" required class="w-full rounded-xl border border-slate-300 px-3 py-3" placeholder="correo@ejemplo.com" />
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-bold text-slate-700">Folio / código</span>
            <input id="recover-folio" type="text" required class="w-full rounded-xl border border-slate-300 px-3 py-3 uppercase" placeholder="abcd1234 o UUID" />
          </label>
          <button id="recover-submit" type="submit" class="w-full rounded-xl bg-blue-700 py-3 text-sm font-black text-white hover:bg-blue-800">Reenviar ticket</button>
        </form>
        <p id="recover-msg" class="mt-4 text-sm font-semibold text-slate-600"></p>
        <button id="recover-back" type="button" class="mt-4 w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Volver a inicio de sesión</button>
      </div>
    </section>
  `,
  mount: () => {
    const form = document.getElementById('recover-ticket-form');
    const emailEl = document.getElementById('recover-email');
    const folioEl = document.getElementById('recover-folio');
    const msg = document.getElementById('recover-msg');
    const btn = document.getElementById('recover-submit');
    document.getElementById('recover-back')?.addEventListener('click', () => navigateTo('/login'));

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = String(emailEl?.value || '').trim();
      const folio = String(folioEl?.value || '').trim();
      if (!email || !folio) return;
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      msg.textContent = '';
      try {
        await recoverTicketByEmailAndFolio({ email, folio }, { timeoutMs: 10000 });
        msg.className = 'mt-4 text-sm font-semibold text-emerald-700';
        msg.textContent = 'Si los datos coinciden, enviaremos el ticket al correo indicado.';
      } catch {
        // respuesta genérica anti-enumeración
        msg.className = 'mt-4 text-sm font-semibold text-slate-700';
        msg.textContent = 'Si los datos coinciden, enviaremos el ticket al correo indicado.';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Reenviar ticket';
      }
    });
  }
};

export default RecuperarTicket;

