import { auth } from '../firebase-config.js';
import { createAnonymousTicket, createUserTicket, getUserProfile } from '../dataconnect-generated';
import { navigateTo } from '../router.js';
import { showAlert } from '../lib/appDialog.js';
import { downloadTicketPdf } from '../lib/ticketPdf.js';
import { sendTicketEmailCopy } from '../lib/sendTicketEmail.js';

const Checkout = {
    render: () => `
        <div class="max-w-3xl mx-auto p-8 h-full pb-20 pt-10">
            <h1 class="text-3xl font-bold text-gray-800 mb-6">Finalizar Reserva</h1>
            
            <div id="auth-notice" class="hidden mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl flex items-center justify-between">
                <div>
                    <i class="fas fa-info-circle mr-2"></i>
                    <strong>Comprando como invitado.</strong> Inicia sesión o regístrate para que tus reservas se guarden en tu cuenta.
                </div>
                <button id="btn-goto-login" class="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700">Iniciar Sesión</button>
            </div>

            <div class="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 class="text-xl font-bold mb-4 border-b pb-2">Datos del Cliente</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Nombre Completo</label>
                        <input type="text" id="chk-name" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500" placeholder="Ej. Juan Pérez">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                        <input type="email" id="chk-email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500" placeholder="Ej. juan@correo.com">
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 class="text-xl font-bold mb-4 border-b pb-2">Método de Pago</h2>
                <div class="space-y-4">
                    <label class="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition border-blue-500 bg-blue-50" id="opt-online">
                        <input type="radio" name="pago_opcion" value="online" class="mt-1 mr-4" checked>
                        <div>
                            <div class="font-bold text-lg text-blue-800">Pago en Línea</div>
                            <div class="text-blue-600 text-sm">Paga con tarjeta de crédito/débito o Apple Pay de forma segura.</div>
                        </div>
                    </label>
                    <label class="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition" id="opt-taquilla">
                        <input type="radio" name="pago_opcion" value="taquilla" class="mt-1 mr-4">
                        <div>
                            <div class="font-bold text-lg">Pago en Taquilla</div>
                            <div class="text-gray-500 text-sm">Reserva ahora y paga al llegar al balneario.</div>
                        </div>
                    </label>
                </div>
            </div>

            <div class="bg-gray-100 rounded-xl p-6 flex justify-between items-center mb-6 shadow-inner border border-gray-200">
                <div>
                    <p class="text-gray-600">Subtotal: <span class="font-bold text-gray-800">$1,000.00 MXN</span></p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-gray-500">Total a pagar:</p>
                    <p class="text-3xl font-extrabold text-blue-600" id="total-text">$1,000.00 MXN</p>
                </div>
            </div>

            <button id="btn-pay" class="w-full bg-blue-600 text-white font-bold py-4 rounded-xl text-xl hover:bg-blue-700 shadow-lg transition">Confirmar Reserva</button>
            <div id="loading-msg" class="hidden text-center text-blue-600 mt-4 font-bold flex justify-center items-center gap-2">
                <i class="fas fa-spinner fa-spin"></i> Procesando reserva y generando ticket...
            </div>

            <!-- Modal Post Compra Anónima -->
            <div id="modal-invite" class="fixed inset-0 bg-black/70 hidden flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl">
                    <div class="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                        <i class="fas fa-check"></i>
                    </div>
                    <h2 class="text-2xl font-black text-gray-800 mb-2">¡Reserva completada!</h2>
                    <p class="text-gray-600 mb-2">Tu PDF con el código QR se descargó automáticamente. Si está configurado el envío, también recibirás una copia por correo.</p>
                    <p class="text-gray-500 text-sm mb-6">Si no ves el correo, entra a <strong>Mis tickets</strong> (tras registrarte) para ver el QR o volver a descargar el PDF.</p>
                    
                    <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
                        <h3 class="font-bold text-blue-800 mb-1"><i class="fas fa-star text-yellow-500 mr-1"></i> Crea tu cuenta</h3>
                        <p class="text-sm text-blue-700">Regístrate para guardar tus tickets y obtener descuentos en tu próxima visita.</p>
                    </div>

                    <button id="btn-go-register" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 mb-3 transition shadow-lg">Registrarme ahora</button>
                    <button id="btn-close-invite" class="w-full text-gray-500 font-bold py-3 hover:bg-gray-100 rounded-xl transition">Cerrar</button>
                </div>
            </div>

        </div>
    `,
    mount: () => {
        const btnPay = document.getElementById('btn-pay');
        const radios = document.querySelectorAll('input[name="pago_opcion"]');
        const inputName = document.getElementById('chk-name');
        const inputEmail = document.getElementById('chk-email');
        const authNotice = document.getElementById('auth-notice');

        const modalInvite = document.getElementById('modal-invite');

        let selectedPayment = 'online';

        const fillUserData = async (user) => {
            if (user) {
                try {
                    const profileRes = await getUserProfile({ id: user.uid });
                    const profile = profileRes.data?.user;
                    inputName.value = profile?.nombre || user.displayName || '';
                    inputEmail.value = profile?.email || user.email || '';
                } catch (e) {
                    inputEmail.value = user.email || '';
                }
            } else {
                authNotice.classList.remove('hidden');
                document.getElementById('btn-goto-login').addEventListener('click', () => navigateTo('/login'));
            }
        };

        if (auth.currentUser) {
            fillUserData(auth.currentUser);
        } else {
            const unsubscribe = auth.onAuthStateChanged((u) => {
                fillUserData(u);
                unsubscribe();
            });
        }

        radios.forEach(r => {
            r.addEventListener('change', (e) => {
                selectedPayment = e.target.value;
                document.getElementById('opt-online').className = 'flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition';
                document.getElementById('opt-taquilla').className = 'flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition';

                if (selectedPayment === 'online') {
                    document.getElementById('opt-online').classList.add('border-blue-500', 'bg-blue-50');
                } else {
                    document.getElementById('opt-taquilla').classList.add('border-blue-500', 'bg-blue-50');
                }
            });
        });

        document.getElementById('btn-go-register').addEventListener('click', () => {
            modalInvite.classList.add('hidden');
            navigateTo('/login');
        });
        document.getElementById('btn-close-invite').addEventListener('click', () => {
            modalInvite.classList.add('hidden');
        });

        btnPay.addEventListener('click', async () => {
            const name = inputName.value;
            const email = inputEmail.value;

            if (!name || !email) {
                await showAlert('Por favor ingresa tu nombre y correo para continuar.', {
                    title: 'Datos incompletos',
                    variant: 'warning'
                });
                return;
            }

            btnPay.disabled = true;
            btnPay.classList.add('opacity-50');
            document.getElementById('loading-msg').classList.remove('hidden');

            try {
                const variables = {
                    clienteNombre: name,
                    clienteEmail: email,
                    metodoPago: selectedPayment,
                    estadoPago: selectedPayment === 'online' ? 'pagado' : 'pendiente',
                    precioTotal: 1000
                };

                const isAuthed = auth.currentUser != null;

                let ticketId;
                if (isAuthed) {
                    const res = await createUserTicket(variables);
                    ticketId = res.data.ticket_insert.id;
                } else {
                    const res = await createAnonymousTicket(variables);
                    ticketId = res.data.ticket_insert.id;
                }

                const estadoPago = variables.estadoPago;

                await downloadTicketPdf({
                    ticketId,
                    clienteNombre: name,
                    clienteEmail: email,
                    fechaCreacion: new Date(),
                    precioTotal: 1000,
                    metodoPago: selectedPayment,
                    estadoPago
                });

                const emailResult = await sendTicketEmailCopy({
                    toEmail: email,
                    ticketId,
                    clienteNombre: name
                });

                if (isAuthed) {
                    let msg =
                        'Tu ticket se generó y el PDF se descargó. También está disponible en Mis tickets.';
                    if (emailResult.sent) {
                        msg += ' Te enviamos una copia por correo.';
                    } else if (emailResult.reason === 'request_failed') {
                        msg +=
                            ' No pudimos enviar el correo ahora; puedes volver a descargar el PDF desde Mis tickets.';
                    }
                    await showAlert(msg, { title: 'Compra exitosa', variant: 'success' });
                    navigateTo('/cliente/dashboard');
                } else {
                    modalInvite.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error procesando pago: ', error);
                await showAlert(
                    'Hubo un error al procesar tu reserva. Asegúrate de tener conexión y vuelve a intentarlo.',
                    { title: 'Error', variant: 'danger' }
                );
            } finally {
                btnPay.disabled = false;
                btnPay.classList.remove('opacity-50');
                document.getElementById('loading-msg').classList.add('hidden');
            }
        });
    }
};

export default Checkout;
