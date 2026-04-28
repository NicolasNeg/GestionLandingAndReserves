import { auth } from '../firebase-config.js';
import { createAnonymousTicket, createUserTicket, getUserProfile } from '../dataconnect-generated';
import QRCode from 'qrcode';
import html2pdf from 'html2pdf.js';
import { navigateTo } from '../router.js';

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
            
            <!-- Contenedor oculto para el PDF -->
            <div id="pdf-container" class="hidden">
                <div id="pdf-content" style="padding: 20px; font-family: sans-serif; background: #fff; width: 600px; color: #333;">
                    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
                        <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Balneario San Antonio</h1>
                        <p style="margin: 5px 0; font-size: 16px; color: #666;">Ticket Oficial de Acceso</p>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div>
                            <h3 style="margin-bottom: 5px; color: #444;">Datos del Cliente:</h3>
                            <p style="margin: 0; font-weight: bold;" id="pdf-name">--</p>
                            <p style="margin: 0; color: #666;" id="pdf-email">--</p>
                        </div>
                        <div style="text-align: right;">
                            <h3 style="margin-bottom: 5px; color: #444;">Detalles:</h3>
                            <p style="margin: 0;">Fecha: <strong id="pdf-date">--</strong></p>
                            <p style="margin: 0;">Método: <strong id="pdf-method">--</strong></p>
                        </div>
                    </div>

                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin-top: 0; margin-bottom: 10px;">Resumen</h3>
                        <p style="margin: 5px 0; font-size: 16px;">Total a Pagar: <strong>$1,000.00 MXN</strong></p>
                        <p id="pdf-payment-status" style="font-weight: bold; margin: 10px 0 0 0; padding: 8px; border-radius: 5px; text-align: center;"></p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="margin-bottom: 10px;">Muestra este código QR en la entrada:</p>
                        <img id="pdf-qr" src="" alt="Código QR" style="width: 250px; height: 250px; margin: 0 auto; display: block;">
                        <p style="font-size: 12px; color: #666; margin-top: 10px;" id="pdf-id">ID: --</p>
                    </div>
                </div>
            </div>

            <!-- Modal Post Compra Anónima -->
            <div id="modal-invite" class="fixed inset-0 bg-black/70 hidden flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl">
                    <div class="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                        <i class="fas fa-check"></i>
                    </div>
                    <h2 class="text-2xl font-black text-gray-800 mb-2">¡Reserva Completada!</h2>
                    <p class="text-gray-600 mb-6">Tu PDF con el código QR ha sido descargado. Puedes mostrarlo en la entrada del balneario.</p>
                    
                    <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
                        <h3 class="font-bold text-blue-800 mb-1"><i class="fas fa-star text-yellow-500 mr-1"></i> Crea tu cuenta</h3>
                        <p class="text-sm text-blue-700">Regístrate ahora para guardar tus tickets y obtener descuentos exclusivos en tu próxima visita.</p>
                    </div>

                    <button id="btn-go-register" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 mb-3 transition shadow-lg">Registrarme Ahora</button>
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

        // Lógica de Autorellenado si está logueado
        const fillUserData = async (user) => {
            if (user) {
                try {
                    const profileRes = await getUserProfile({ id: user.uid });
                    const profile = profileRes.data?.user;
                    inputName.value = profile?.nombre || user.displayName || '';
                    inputEmail.value = profile?.email || user.email || '';
                    // Bloquear edición si lo deseamos, o dejarlos readonly
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

        // Lógica visual para seleccionar método de pago
        radios.forEach(r => {
            r.addEventListener('change', (e) => {
                selectedPayment = e.target.value;
                document.getElementById('opt-online').className = "flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition";
                document.getElementById('opt-taquilla').className = "flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition";
                
                if (selectedPayment === 'online') {
                    document.getElementById('opt-online').classList.add('border-blue-500', 'bg-blue-50');
                } else {
                    document.getElementById('opt-taquilla').classList.add('border-blue-500', 'bg-blue-50');
                }
            });
        });

        // Eventos Modal Invitación
        document.getElementById('btn-go-register').addEventListener('click', () => {
            modalInvite.classList.add('hidden');
            navigateTo('/login');
        });
        document.getElementById('btn-close-invite').addEventListener('click', () => {
            modalInvite.classList.add('hidden');
        });

        // Simulación de Checkout
        btnPay.addEventListener('click', async () => {
            const name = inputName.value;
            const email = inputEmail.value;

            if (!name || !email) {
                alert("Por favor ingresa tu nombre y correo para continuar.");
                return;
            }

            btnPay.disabled = true;
            btnPay.classList.add('opacity-50');
            document.getElementById('loading-msg').classList.remove('hidden');

            try {
                // 1. Guardar en Cloud SQL usando Data Connect
                let ticketId;
                const variables = {
                    clienteNombre: name,
                    clienteEmail: email,
                    metodoPago: selectedPayment,
                    estadoPago: selectedPayment === 'online' ? 'pagado' : 'pendiente',
                    precioTotal: 1000
                };

                const isAuthed = auth.currentUser != null;

                if (isAuthed) {
                    const res = await createUserTicket(variables);
                    ticketId = res.data.ticket_insert.id;
                } else {
                    const res = await createAnonymousTicket(variables);
                    ticketId = res.data.ticket_insert.id;
                }

                // 2. Generar QR Code en Base64
                const qrDataUrl = await QRCode.toDataURL(ticketId, { 
                    width: 300, 
                    margin: 2, 
                    color: { dark: '#000000FF', light: '#FFFFFFFF' } 
                });

                // 3. Preparar el HTML para el PDF
                document.getElementById('pdf-name').textContent = name;
                document.getElementById('pdf-email').textContent = email;
                document.getElementById('pdf-date').textContent = new Date().toLocaleDateString();
                document.getElementById('pdf-method').textContent = selectedPayment === 'online' ? 'En Línea' : 'En Taquilla';
                document.getElementById('pdf-qr').src = qrDataUrl;
                document.getElementById('pdf-id').textContent = 'ID: ' + ticketId;
                
                const statusEl = document.getElementById('pdf-payment-status');
                if (selectedPayment === 'online') {
                    statusEl.textContent = "ESTADO: PAGADO 100%";
                    statusEl.style.backgroundColor = "#dcfce7";
                    statusEl.style.color = "#16a34a";
                } else {
                    statusEl.textContent = "ESTADO: PAGO PENDIENTE EN TAQUILLA";
                    statusEl.style.backgroundColor = "#fef3c7";
                    statusEl.style.color = "#d97706";
                }

                document.getElementById('pdf-container').classList.remove('hidden');

                // 4. Generar PDF usando el motor de impresión nativo del navegador (Evita error OKLCH de Tailwind)
                const printContent = document.getElementById('pdf-content').innerHTML;
                const printWindow = window.open('', '', 'width=800,height=600');
                
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Ticket_Reserva_${ticketId.substring(0,8)}</title>
                        <style>
                            body { font-family: sans-serif; padding: 40px; color: #333; }
                            @media print {
                                body { padding: 0; }
                            }
                        </style>
                    </head>
                    <body>
                        ${printContent}
                    </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                
                // Esperar a que la imagen QR cargue en la nueva ventana antes de imprimir
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);

                document.getElementById('pdf-container').classList.add('hidden');

                if (isAuthed) {
                    alert("¡Compra exitosa! Tu ticket ha sido generado. Puedes verlo también en tu Panel.");
                    navigateTo('/cliente/dashboard');
                } else {
                    // Mostrar modal de invitación para anónimos
                    modalInvite.classList.remove('hidden');
                }

            } catch (error) {
                console.error("Error procesando pago: ", error);
                alert("Hubo un error al procesar tu reserva. Asegúrate de tener conexión y vuelve a intentarlo.");
            } finally {
                btnPay.disabled = false;
                btnPay.classList.remove('opacity-50');
                document.getElementById('loading-msg').classList.add('hidden');
            }
        });
    }
};

export default Checkout;
