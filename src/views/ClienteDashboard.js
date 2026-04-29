import { auth } from '../firebase-config.js';
import { signOut } from 'firebase/auth';
import { navigateTo } from '../router.js';
import { listUserTickets, getUserProfile } from '../dataconnect-generated';
import QRCode from 'qrcode';
import { downloadTicketPdf } from '../lib/ticketPdf.js';
import { showAlert } from '../lib/appDialog.js';

const ClienteDashboard = {
    render: () => `
        <div class="max-w-5xl mx-auto p-4 sm:p-8 h-full pt-10">
            <div class="flex flex-col sm:flex-row justify-between items-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800">Mi Panel</h1>
                <button id="btn-logout" class="mt-4 sm:mt-0 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-bold text-sm">
                    Cerrar Sesión
                </button>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <!-- Perfil Sidebar -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
                    <div class="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-4xl font-bold mb-4 shadow-inner" id="profile-initial">
                        --
                    </div>
                    <h2 class="text-xl font-bold text-gray-800" id="profile-name">Cargando...</h2>
                    <p class="text-gray-500 text-sm mb-6" id="profile-email">---</p>
                    <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6" id="profile-role">
                        Cliente
                    </span>
                    
                    <div class="w-full border-t pt-4">
                        <button class="w-full py-2 text-blue-600 font-medium hover:bg-blue-50 rounded transition text-sm">
                            Editar Perfil
                        </button>
                    </div>
                </div>

                <!-- Reservas / Tickets -->
                <div class="col-span-1 lg:col-span-2 space-y-6">
                    <h2 class="text-xl font-bold text-gray-700">Mis Tickets de Entrada</h2>
                    
                    <div id="tickets-container" class="space-y-4">
                        <div class="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <i class="fas fa-spinner fa-spin text-gray-400 text-3xl mb-3"></i>
                            <p class="text-gray-500">Cargando tickets...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal QR para Ticket -->
            <div id="modal-qr" class="fixed inset-0 bg-black/60 hidden flex items-center justify-center z-50 p-4 transition-opacity">
                <div class="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center shadow-2xl">
                    <h2 class="text-xl font-bold text-gray-800 mb-2">Tu Código de Acceso</h2>
                    <p class="text-sm text-gray-500 mb-6 text-center">Muestra este código en la taquilla o en el escáner de entrada.</p>
                    
                    <div class="bg-white p-2 rounded-xl shadow-inner border mb-6">
                        <canvas id="qr-canvas"></canvas>
                    </div>
                    
                    <p class="font-mono text-gray-400 text-xs mb-6" id="qr-ticket-id">---</p>
                    
                    <button id="btn-close-qr" class="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `,
    mount: () => {
        const btnLogout = document.getElementById('btn-logout');
        const ticketsContainer = document.getElementById('tickets-container');
        const modalQr = document.getElementById('modal-qr');
        const btnCloseQr = document.getElementById('btn-close-qr');
        const qrCanvas = document.getElementById('qr-canvas');
        const qrTicketId = document.getElementById('qr-ticket-id');

        // Referencias de perfil
        const pInitial = document.getElementById('profile-initial');
        const pName = document.getElementById('profile-name');
        const pEmail = document.getElementById('profile-email');
        const pRole = document.getElementById('profile-role');

        let user = auth.currentUser;
        /** @type {Map<string, object>} */
        const ticketById = new Map();

        const loadProfile = async () => {
            if (!user) return;

            try {
                const profileRes = await getUserProfile({ id: user.uid });
                const userData = profileRes.data?.user;

                const name = userData?.nombre || user.displayName || 'Sin Nombre';
                pName.textContent = name;
                pEmail.textContent = userData?.email || user.email;
                pRole.textContent = userData?.rol || 'cliente';
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

                loadTickets();
            } catch (error) {
                console.error("Error al cargar perfil:", error);
            }
        };

        const loadTickets = async () => {
            try {
                const res = await listUserTickets({ userId: user.uid });
                const tickets = res.data?.tickets || [];

                if (tickets.length === 0) {
                    ticketsContainer.innerHTML = `
                        <div class="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 text-2xl">
                                <i class="fas fa-ticket-alt"></i>
                            </div>
                            <h3 class="font-bold text-gray-700 mb-1">No tienes tickets</h3>
                            <p class="text-gray-500 text-sm mb-6">Aún no has comprado accesos al balneario.</p>
                            <a href="/checkout" data-link class="text-blue-600 font-bold hover:underline">Comprar ahora</a>
                        </div>
                    `;
                    return;
                }

                let html = '';
                ticketById.clear();
                tickets.forEach(ticket => {
                    ticketById.set(ticket.id, ticket);
                    const isValido = ticket.estadoTicket === 'valido';
                    const isEscaneado = ticket.estadoTicket === 'escaneado';
                    const isPagado = ticket.estadoPago === 'pagado';

                    const borderCls = isValido ? 'border-blue-500' : 'border-gray-300';
                    let statusText = 'No válido';
                    let statusBg = 'bg-gray-100 text-gray-600';
                    if (isValido) {
                        statusText = 'Vigente';
                        statusBg = 'bg-emerald-100 text-emerald-800';
                    } else if (isEscaneado) {
                        statusText = 'Usado';
                        statusBg = 'bg-slate-100 text-slate-700';
                    }

                    const paymentText = isPagado ? 'Pagado' : 'Pago pendiente en taquilla';
                    const fechaEmision = new Date(ticket.fechaCreacion).toLocaleString();
                    let usoHtml = '';
                    if (isEscaneado && ticket.fechaEscaneo) {
                        usoHtml = `<p><span class="font-medium">Utilizado el:</span> ${new Date(ticket.fechaEscaneo).toLocaleString()}</p>`;
                    } else if (isEscaneado) {
                        usoHtml = `<p><span class="font-medium">Entrada:</span> ya registrada</p>`;
                    } else {
                        usoHtml = `<p><span class="font-medium">Para el día / turno:</span> según tu compra (presenta el QR en taquilla).</p>`;
                    }

                    html += `
                        <div class="bg-white rounded-xl shadow-sm border-l-4 ${borderCls} p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:shadow-md">
                            <div>
                                <div class="flex items-center gap-3 mb-1 flex-wrap">
                                    <h3 class="text-lg font-bold text-gray-800">Ticket de entrada</h3>
                                    <span class="${statusBg} text-xs font-bold px-2 py-0.5 rounded">${statusText}</span>
                                </div>
                                <p class="text-gray-500 text-xs mb-3 font-mono">ID: #${ticket.id.substring(0, 8)}</p>

                                <div class="space-y-1 text-sm text-gray-600">
                                    <p><span class="font-medium">Emitido:</span> ${fechaEmision}</p>
                                    ${usoHtml}
                                    <p><span class="font-medium">Total:</span> $${ticket.precioTotal.toFixed(2)} MXN</p>
                                    <p><span class="font-medium text-amber-700">${paymentText}</span></p>
                                </div>
                            </div>

                            <div class="flex flex-col sm:items-stretch gap-2 min-w-[140px]">
                                <button type="button" class="btn-download-pdf w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition" data-id="${ticket.id}">
                                    <i class="fas fa-file-pdf mr-2"></i> Descargar PDF
                                </button>
                                ${isValido ? `
                                    <button type="button" class="btn-show-qr w-full bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-black transition" data-id="${ticket.id}">
                                        <i class="fas fa-qrcode mr-2"></i> Ver QR
                                    </button>
                                ` : `
                                    <p class="text-center text-xs text-gray-400 py-1">QR no disponible (ticket usado o anulado)</p>
                                `}
                            </div>
                        </div>
                    `;
                });

                ticketsContainer.innerHTML = html;

                document.querySelectorAll('.btn-show-qr').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = e.currentTarget.dataset.id;
                        showQR(id);
                    });
                });

                document.querySelectorAll('.btn-download-pdf').forEach(btn => {
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
                        } catch (err) {
                            console.error(err);
                            await showAlert('No se pudo generar el PDF. Intenta de nuevo.', {
                                title: 'Error',
                                variant: 'danger'
                            });
                        } finally {
                            btn.disabled = false;
                        }
                    });
                });

            } catch (error) {
                console.error("Error al cargar tickets:", error);
                ticketsContainer.innerHTML = `<p class="text-red-500 p-4">Hubo un error al cargar tus reservas. Intenta nuevamente.</p>`;
            }
        };

        const showQR = (id) => {
            qrTicketId.textContent = id;
            QRCode.toCanvas(qrCanvas, id, { width: 200, margin: 1 }, (error) => {
                if (error) console.error(error);
            });
            modalQr.classList.remove('hidden');
        };

        btnCloseQr.addEventListener('click', () => {
            modalQr.classList.add('hidden');
        });

        btnLogout.addEventListener('click', async () => {
            try {
                await signOut(auth);
                navigateTo('/login');
            } catch (error) {
                console.error("Error al cerrar sesión", error);
            }
        });

        // Iniciar
        if (user) {
            loadProfile();
        } else {
            // Si el componente monta antes del auth observer de router
            const unsubscribe = auth.onAuthStateChanged((u) => {
                if (u) {
                    user = u;
                    loadProfile();
                }
                unsubscribe();
            });
        }
    }
};

export default ClienteDashboard;
