import { auth } from '../firebase-config.js';
import { signOut, updateProfile } from 'firebase/auth';
import { navigateTo } from '../router.js';
import { listUserTickets, getUserProfile, upsertUser } from '../dataconnect-generated';
import QRCode from 'qrcode';
import { downloadTicketPdf } from '../lib/ticketPdf.js';
import { showAlert } from '../lib/appDialog.js';
import { getUserAccess } from '../lib/accessControl.js';

function activeSection() {
  return window.location.pathname.startsWith('/cliente/configuracion') ? 'configuracion' : 'tickets';
}

const ClienteDashboard = {
  render: () => {
    const section = activeSection();
    return `
      <div class="min-h-[calc(100vh-92px)] bg-slate-50">
        <div class="mx-auto flex w-full max-w-6xl gap-6 p-4 sm:p-6">
          <aside class="hidden w-64 shrink-0 lg:flex lg:flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-100 p-4">
              <p class="text-xs font-black uppercase tracking-wider text-teal-700">Panel Cliente</p>
              <p class="text-sm text-slate-500">Navega tus opciones</p>
            </div>
            <nav class="flex flex-col gap-1 p-3">
              <a href="/cliente/configuracion" data-link class="rounded-xl px-3 py-2 font-semibold ${section === 'configuracion' ? 'bg-teal-100 text-teal-900' : 'text-slate-700 hover:bg-slate-100'}">Ajustes</a>
              <a href="/cliente/tickets" data-link class="rounded-xl px-3 py-2 font-semibold ${section === 'tickets' ? 'bg-teal-100 text-teal-900' : 'text-slate-700 hover:bg-slate-100'}">Mis tickets</a>
            </nav>
            <div class="mt-auto border-t border-slate-100 p-3">
              <button id="btn-logout" class="w-full rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100">Cerrar sesión</button>
            </div>
          </aside>

          <main class="min-w-0 flex-1 space-y-4">
            <div class="lg:hidden flex gap-2 rounded-2xl border border-slate-200 bg-white p-2">
              <a href="/cliente/configuracion" data-link class="flex-1 rounded-lg px-3 py-2 text-center font-semibold ${section === 'configuracion' ? 'bg-teal-100 text-teal-900' : 'text-slate-700'}">Ajustes</a>
              <a href="/cliente/tickets" data-link class="flex-1 rounded-lg px-3 py-2 text-center font-semibold ${section === 'tickets' ? 'bg-teal-100 text-teal-900' : 'text-slate-700'}">Mis tickets</a>
              <button id="btn-logout-mobile" class="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">Salir</button>
            </div>

            <section id="cliente-section-configuracion" class="${section === 'configuracion' ? '' : 'hidden'} rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h1 class="text-2xl font-black text-slate-900">Configuración</h1>
              <p class="mt-1 text-sm text-slate-500">Administra tu perfil y accesos.</p>
              <div class="mt-5 grid gap-6 lg:grid-cols-[280px_1fr]">
                <div class="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
                  <div class="mx-auto mb-3 h-20 w-20 rounded-full bg-blue-100 text-blue-600 text-3xl font-bold flex items-center justify-center" id="profile-initial">--</div>
                  <p id="profile-name" class="font-bold text-slate-900">Cargando...</p>
                  <p id="profile-email" class="text-sm text-slate-500">---</p>
                  <span id="profile-role" class="mt-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase text-blue-800">Cliente</span>
                  <button id="btn-edit-profile" type="button" class="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Editar perfil</button>
                </div>
                <div class="rounded-2xl border border-slate-100 p-5">
                  <h2 class="font-bold text-slate-800">Escáner QR</h2>
                  <p id="scan-status-text" class="mt-1 text-sm text-slate-500">Verificando permisos...</p>
                  <button id="btn-open-scanner" type="button" class="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-black">Abrir escáner</button>
                </div>
              </div>
            </section>

            <section id="cliente-section-tickets" class="${section === 'tickets' ? '' : 'hidden'} space-y-4">
              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h1 class="text-2xl font-black text-slate-900">Mis tickets</h1>
                <p class="mt-1 text-sm text-slate-500">Consulta estado, QR y descarga de tus entradas.</p>
              </div>
              <div id="tickets-container" class="space-y-4">
                <div class="text-center py-10 bg-white rounded-xl border border-slate-200">
                  <i class="fas fa-spinner fa-spin text-slate-400 text-3xl mb-3"></i>
                  <p class="text-slate-500">Cargando tickets...</p>
                </div>
              </div>
            </section>
          </main>
        </div>

        <div id="modal-qr" class="fixed inset-0 bg-black/60 hidden flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center shadow-2xl">
            <h2 class="text-xl font-bold text-gray-800 mb-2">Tu Código de Acceso</h2>
            <p class="text-sm text-gray-500 mb-6 text-center">Muestra este código en taquilla o escáner.</p>
            <div class="bg-white p-2 rounded-xl shadow-inner border mb-6"><canvas id="qr-canvas"></canvas></div>
            <p class="font-mono text-gray-400 text-xs mb-6" id="qr-ticket-id">---</p>
            <button id="btn-close-qr" class="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition">Cerrar</button>
          </div>
        </div>

        <div id="modal-edit-profile" class="fixed inset-0 bg-black/60 hidden flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 class="text-xl font-bold text-gray-800 mb-1">Editar perfil</h3>
            <p class="text-sm text-gray-500 mb-5">Actualiza tu nombre para tickets y panel.</p>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input id="edit-name" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 mb-4" placeholder="Tu nombre" />
            <label class="block text-sm font-medium text-gray-700 mb-1">Correo</label>
            <input id="edit-email" type="email" class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 mb-6 text-gray-500" readonly />
            <div class="flex gap-3">
              <button id="btn-cancel-edit-profile" type="button" class="flex-1 rounded-lg border border-gray-200 py-2 font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button id="btn-save-edit-profile" type="button" class="flex-1 rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  mount: () => {
    const btnLogout = document.getElementById('btn-logout');
    const btnLogoutMobile = document.getElementById('btn-logout-mobile');
    const ticketsContainer = document.getElementById('tickets-container');
    const modalQr = document.getElementById('modal-qr');
    const btnCloseQr = document.getElementById('btn-close-qr');
    const qrCanvas = document.getElementById('qr-canvas');
    const qrTicketId = document.getElementById('qr-ticket-id');
    const btnEditProfile = document.getElementById('btn-edit-profile');
    const modalEdit = document.getElementById('modal-edit-profile');
    const btnCancelEdit = document.getElementById('btn-cancel-edit-profile');
    const btnSaveEdit = document.getElementById('btn-save-edit-profile');
    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email');
    const btnOpenScanner = document.getElementById('btn-open-scanner');
    const scanStatusText = document.getElementById('scan-status-text');
    const pInitial = document.getElementById('profile-initial');
    const pName = document.getElementById('profile-name');
    const pEmail = document.getElementById('profile-email');
    const pRole = document.getElementById('profile-role');

    let user = auth.currentUser;
    const ticketById = new Map();
    let profileSnapshot = { nombre: '', email: '', rol: 'cliente' };
    let accessSnapshot = null;

    const runLogout = async () => {
      try {
        await signOut(auth);
        navigateTo('/login');
      } catch (error) {
        console.error('Error al cerrar sesión', error);
      }
    };

    const loadProfile = async () => {
      if (!user) return;
      try {
        const profileRes = await getUserProfile({ id: user.uid });
        const userData = profileRes.data?.user;
        const name = userData?.nombre || user.displayName || 'Sin Nombre';
        profileSnapshot = {
          nombre: name,
          email: userData?.email || user.email || '',
          rol: userData?.rol || 'cliente'
        };
        if (pName) pName.textContent = name;
        if (pEmail) pEmail.textContent = profileSnapshot.email;
        if (pRole) pRole.textContent = profileSnapshot.rol;
        if (pInitial) {
          if (user.photoURL) {
            pInitial.textContent = '';
            const img = document.createElement('img');
            img.src = user.photoURL;
            img.alt = name;
            img.referrerPolicy = 'no-referrer';
            img.className = 'h-full w-full rounded-full object-cover';
            pInitial.appendChild(img);
          } else {
            pInitial.textContent = name.charAt(0).toUpperCase();
          }
        }
      } catch (error) {
        console.error('Error al cargar perfil:', error);
      }
    };

    const loadAccess = async () => {
      accessSnapshot = await getUserAccess(user);
      if (!scanStatusText || !btnOpenScanner) return;
      if (accessSnapshot.can('tickets.scan')) {
        scanStatusText.textContent = 'Tienes permiso de escaneo.';
        btnOpenScanner.disabled = false;
        btnOpenScanner.className = 'mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-black';
      } else {
        scanStatusText.textContent = 'Este usuario solo puede ver su QR y resumen.';
        btnOpenScanner.disabled = true;
        btnOpenScanner.className = 'mt-3 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-400 cursor-not-allowed';
      }
    };

    const renderTickets = (tickets) => {
      if (!ticketsContainer) return;
      if (!tickets.length) {
        ticketsContainer.innerHTML = `
          <div class="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <h3 class="font-bold text-gray-700 mb-1">No tienes tickets</h3>
            <p class="text-gray-500 text-sm mb-6">Aún no has comprado accesos.</p>
            <a href="/checkout" data-link class="text-blue-600 font-bold hover:underline">Comprar ahora</a>
          </div>`;
        return;
      }
      const canScan = accessSnapshot?.can('tickets.scan');
      let html = '';
      ticketById.clear();
      tickets.forEach((ticket) => {
        ticketById.set(ticket.id, ticket);
        const isValido = ticket.estadoTicket === 'valido';
        const statusText = isValido ? 'Vigente' : ticket.estadoTicket === 'escaneado' ? 'Usado' : 'No válido';
        const statusBg = isValido ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700';
        const basicResume = `
          <p><span class="font-medium">Estado:</span> ${statusText}</p>
          <p><span class="font-medium">Total:</span> $${ticket.precioTotal.toFixed(2)} MXN</p>
          <p><span class="font-medium">Fecha:</span> ${new Date(ticket.fechaCreacion).toLocaleString()}</p>
        `;
        const staffExtra = canScan
          ? `
            <p><span class="font-medium">Pago:</span> ${ticket.estadoPago}</p>
            <p><span class="font-medium">Método:</span> ${ticket.metodoPago || 'online'}</p>
            <p><span class="font-medium">Escaneado:</span> ${ticket.fechaEscaneo ? new Date(ticket.fechaEscaneo).toLocaleString() : 'No'}</p>
          `
          : '';
        html += `
          <div class="bg-white rounded-xl shadow-sm border-l-4 ${isValido ? 'border-blue-500' : 'border-gray-300'} p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-3 mb-1 flex-wrap">
                <h3 class="text-lg font-bold text-gray-800">Ticket #${ticket.id.substring(0, 8)}</h3>
                <span class="${statusBg} text-xs font-bold px-2 py-0.5 rounded">${statusText}</span>
              </div>
              <div class="space-y-1 text-sm text-gray-600">${basicResume}${staffExtra}</div>
            </div>
            <div class="flex flex-col gap-2 min-w-[140px]">
              <button type="button" class="btn-download-pdf w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700" data-id="${ticket.id}">Descargar PDF</button>
              ${isValido ? `<button type="button" class="btn-show-qr w-full bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-black" data-id="${ticket.id}">Ver QR</button>` : ''}
              ${canScan ? `<button type="button" class="btn-go-scan w-full bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-600" data-id="${ticket.id}">Escanear ingreso</button>` : ''}
            </div>
          </div>`;
      });
      ticketsContainer.innerHTML = html;
    };

    const loadTickets = async () => {
      if (!ticketsContainer || !user) return;
      try {
        const res = await listUserTickets({ userId: user.uid });
        renderTickets(res.data?.tickets || []);
        document.querySelectorAll('.btn-show-qr').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            qrTicketId.textContent = id;
            QRCode.toCanvas(qrCanvas, id, { width: 200, margin: 1 });
            modalQr.classList.remove('hidden');
          });
        });
        document.querySelectorAll('.btn-download-pdf').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const t = ticketById.get(id);
            if (!t) return;
            btn.disabled = true;
            try {
              await downloadTicketPdf({
                ticketId: t.id,
                clienteNombre: t.clienteNombre,
                clienteEmail: t.clienteEmail || user.email || '',
                fechaCreacion: t.fechaCreacion,
                precioTotal: t.precioTotal,
                metodoPago: t.metodoPago || 'online',
                estadoPago: t.estadoPago
              });
            } catch {
              await showAlert('No se pudo generar el PDF. Intenta de nuevo.', { title: 'Error', variant: 'danger' });
            } finally {
              btn.disabled = false;
            }
          });
        });
        document.querySelectorAll('.btn-go-scan').forEach((btn) => {
          btn.addEventListener('click', () => navigateTo('/escaner'));
        });
      } catch (error) {
        console.error('Error al cargar tickets:', error);
        ticketsContainer.innerHTML = '<p class="text-red-500 p-4">Hubo un error al cargar tus reservas.</p>';
      }
    };

    const closeEditModal = () => modalEdit?.classList.add('hidden');
    btnEditProfile?.addEventListener('click', () => {
      editName.value = profileSnapshot.nombre || '';
      editEmail.value = profileSnapshot.email || user?.email || '';
      modalEdit.classList.remove('hidden');
    });
    btnCancelEdit?.addEventListener('click', closeEditModal);
    modalEdit?.addEventListener('click', (e) => {
      if (e.target === modalEdit) closeEditModal();
    });
    btnSaveEdit?.addEventListener('click', async () => {
      const nombre = (editName.value || '').trim();
      if (!nombre) return showAlert('El nombre es obligatorio.', { title: 'Editar perfil', variant: 'warning' });
      btnSaveEdit.disabled = true;
      btnSaveEdit.textContent = 'Guardando...';
      try {
        await upsertUser({
          id: user.uid,
          email: profileSnapshot.email || user.email || '',
          nombre,
          rol: profileSnapshot.rol || 'cliente'
        });
        await updateProfile(user, { displayName: nombre });
        profileSnapshot.nombre = nombre;
        if (pName) pName.textContent = nombre;
        closeEditModal();
        await showAlert('Perfil actualizado correctamente.', { title: 'Listo', variant: 'success' });
      } catch (error) {
        console.error(error);
        await showAlert('No se pudo actualizar el perfil.', { title: 'Error', variant: 'danger' });
      } finally {
        btnSaveEdit.disabled = false;
        btnSaveEdit.textContent = 'Guardar';
      }
    });

    btnCloseQr?.addEventListener('click', () => modalQr.classList.add('hidden'));
    btnOpenScanner?.addEventListener('click', () => accessSnapshot?.can('tickets.scan') && navigateTo('/escaner'));
    btnLogout?.addEventListener('click', runLogout);
    btnLogoutMobile?.addEventListener('click', runLogout);

    if (user) {
      Promise.all([loadProfile(), loadAccess()]).then(loadTickets);
    } else {
      const unsubscribe = auth.onAuthStateChanged((u) => {
        if (u) {
          user = u;
          Promise.all([loadProfile(), loadAccess()]).then(loadTickets);
        }
        unsubscribe();
      });
    }
  }
};

export default ClienteDashboard;
