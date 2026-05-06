import { getCurrentUser, onAuthChange } from '../lib/authProvider.js';
import {
    createAnonymousTicket,
    createUserTicket,
    getUserProfile,
    listProductosAdmin,
    updateProductoStock,
    createMovimientoInventario,
    getDescuentoByCodigo,
    listTicketTypesPublic,
    consumeDescuento
} from '../lib/dataLayer.js';
import { navigateTo } from '../router.js';
import { showAlert } from '../lib/appDialog.js';
import { downloadTicketPdf } from '../lib/ticketPdf.js';
import { sendTicketEmailCopy } from '../lib/sendTicketEmail.js';
import { listCartItems, setCartQty, removeFromCart, cartSubtotal, addToCart, clearCart } from '../lib/cart.js';
import { publishAppUpdate } from '../lib/realtimeSync.js';
import { getUserAccess } from '../lib/accessControl.js';
import { applyDiscountToCart } from '../lib/discountRules.js';

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
                <h2 class="text-xl font-bold mb-4 border-b pb-2">Carrito</h2>
                <div id="checkout-cart-items" class="space-y-3 mb-4"></div>
                <h3 class="text-sm font-black text-slate-800 mt-4 mb-2">Tickets disponibles</h3>
                <div id="checkout-ticket-types" class="grid grid-cols-1 gap-2 sm:grid-cols-2"></div>
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
                            <div class="text-blue-600 text-sm">Paga con tarjeta de credito/debito de forma segura.</div>
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
                <div class="w-full">
                    <p class="text-gray-600">Subtotal: <span class="font-bold text-gray-800" id="subtotal-text">$0.00 MXN</span></p>
                    <p class="text-gray-600">Descuento: <span class="font-bold text-emerald-700" id="discount-text">$0.00 MXN</span></p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-gray-500">Total a pagar:</p>
                    <p class="text-3xl font-extrabold text-blue-600" id="total-text">$0.00 MXN</p>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 class="text-xl font-bold mb-4 border-b pb-2">Código de descuento</h2>
                <div class="flex flex-col gap-2 sm:flex-row">
                    <input id="discount-code-input" type="text" class="flex-1 rounded-md border-gray-300 shadow-sm p-2 border uppercase" placeholder="Ej. VERANO10">
                    <button id="discount-apply-btn" type="button" class="rounded bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">Aplicar</button>
                    <button id="discount-remove-btn" type="button" class="hidden rounded border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Quitar descuento</button>
                </div>
                <p id="discount-status" class="mt-2 text-sm text-slate-600"></p>
            </div>
            <div id="checkout-role-breakdown" class="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                Cargando desglose de rol...
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

            <div id="purchase-confirm" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/70 p-4">
                <div class="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
                    <h3 class="text-2xl font-black text-emerald-700">Compra confirmada</h3>
                    <p id="purchase-confirm-msg" class="mt-2 text-sm font-semibold text-slate-600">Redirigiendo a inicio en 3s...</p>
                    <p class="mt-3 text-xs text-slate-500">Si no llega el correo, podrás descargar el PDF desde Mis tickets.</p>
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
        const cartWrap = document.getElementById('checkout-cart-items');
        const subtotalText = document.getElementById('subtotal-text');
        const discountText = document.getElementById('discount-text');
        const totalText = document.getElementById('total-text');
        const ticketTypesWrap = document.getElementById('checkout-ticket-types');
        const discountCodeInput = document.getElementById('discount-code-input');
        const discountApplyBtn = document.getElementById('discount-apply-btn');
        const discountRemoveBtn = document.getElementById('discount-remove-btn');
        const discountStatus = document.getElementById('discount-status');

        const modalInvite = document.getElementById('modal-invite');
        const purchaseConfirm = document.getElementById('purchase-confirm');
        const purchaseConfirmMsg = document.getElementById('purchase-confirm-msg');
        const roleBreakdown = document.getElementById('checkout-role-breakdown');

        let selectedPayment = 'online';
        let cartItems = listCartItems();
        let appliedDiscount = null;
        let discountAmount = 0;
        let effectiveTotal = cartSubtotal();

        const fmt = (n) => `$${Number(n || 0).toFixed(2)} MXN`;
        const setDiscountStatus = (msg, tone = 'neutral') => {
            if (!discountStatus) return;
            discountStatus.textContent = msg || '';
            discountStatus.className = 'mt-2 text-sm';
            if (tone === 'ok') discountStatus.classList.add('text-emerald-700', 'font-semibold');
            else if (tone === 'err') discountStatus.classList.add('text-rose-700', 'font-semibold');
            else discountStatus.classList.add('text-slate-600');
        };
        const syncTotals = () => {
            const subtotal = cartSubtotal();
            const totalQty = listCartItems().reduce((acc, item) => acc + Number(item.qty || 0), 0);
            if (appliedDiscount) {
                const evaluation = applyDiscountToCart({
                    discount: appliedDiscount,
                    cart: { subtotal, totalQty },
                    paymentMethod: selectedPayment,
                    user: getCurrentUser()
                });
                if (evaluation.ok) {
                    discountAmount = Number(evaluation.discountAmount || 0);
                    effectiveTotal = Number(evaluation.total || subtotal);
                    setDiscountStatus(`Codigo ${appliedDiscount.codigo} aplicado.`, 'ok');
                } else {
                    discountAmount = 0;
                    effectiveTotal = subtotal;
                    setDiscountStatus(evaluation.message || 'El cupon ya no aplica con el carrito actual.', 'err');
                }
            } else {
                discountAmount = 0;
                effectiveTotal = subtotal;
            }
            subtotalText.textContent = fmt(subtotal);
            discountText.textContent = `-${fmt(discountAmount)}`;
            totalText.textContent = fmt(effectiveTotal);
        };
        const renderCart = () => {
            cartItems = listCartItems();
            if (!cartItems.length) {
                cartWrap.innerHTML = '<p class="text-sm text-rose-600">Tu carrito está vacío. Agrega tickets, paquetes o productos.</p>';
                syncTotals();
                return;
            }
            cartWrap.innerHTML = cartItems.map((item) => `
              <div class="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
                <div>
                  <p class="font-semibold text-slate-900">${item.name}</p>
                  <p class="text-xs text-slate-500">${item.type} · ${fmt(item.price)}</p>
                </div>
                <div class="flex items-center gap-2">
                  <button class="cart-minus rounded border px-2" data-key="${item.key}">-</button>
                  <span class="w-6 text-center font-bold">${item.qty}</span>
                  <button class="cart-plus rounded border px-2" data-key="${item.key}">+</button>
                  <button class="cart-remove rounded border border-rose-200 px-2 text-rose-700" data-key="${item.key}">x</button>
                </div>
              </div>`).join('');
            cartWrap.querySelectorAll('.cart-minus').forEach((b) => b.addEventListener('click', () => { setCartQty(b.dataset.key, (cartItems.find(i => i.key === b.dataset.key)?.qty || 1) - 1); renderCart(); }));
            cartWrap.querySelectorAll('.cart-plus').forEach((b) => b.addEventListener('click', () => { setCartQty(b.dataset.key, (cartItems.find(i => i.key === b.dataset.key)?.qty || 1) + 1); renderCart(); }));
            cartWrap.querySelectorAll('.cart-remove').forEach((b) => b.addEventListener('click', () => { removeFromCart(b.dataset.key); renderCart(); }));
            syncTotals();
        };

        const renderTicketTypes = async () => {
            if (!ticketTypesWrap) return;
            try {
                const res = await listTicketTypesPublic();
                const rows = res.data?.ticketTypes || [];
                if (!rows.length) {
                    ticketTypesWrap.innerHTML = '<p class="text-xs text-slate-500">No hay tickets publicados por el momento.</p>';
                    return;
                }
                ticketTypesWrap.innerHTML = rows.map((t) => `
                  <article class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <p class="text-sm font-black text-slate-900">${t.nombre}</p>
                        <p class="text-xs text-slate-500">${t.descripcion || 'Ticket configurable desde panel'}</p>
                        ${t.incluye ? `<p class="mt-1 text-xs text-slate-600"><strong>Incluye:</strong> ${t.incluye}</p>` : ''}
                      </div>
                      ${t.especial ? '<span class="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700">Especial</span>' : ''}
                    </div>
                    <div class="mt-3 flex items-center justify-between">
                      <strong class="text-sm text-emerald-700">${fmt(t.precio)}</strong>
                      <button class="checkout-add-ticket rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold hover:bg-slate-100" data-ticket-id="${t.id}" data-ticket-name="${t.nombre}" data-ticket-price="${t.precio}">
                        Agregar
                      </button>
                    </div>
                  </article>
                `).join('');
                ticketTypesWrap.querySelectorAll('.checkout-add-ticket').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        addToCart({
                            key: `ticket:${btn.dataset.ticketId}`,
                            type: 'ticket',
                            id: btn.dataset.ticketId,
                            name: btn.dataset.ticketName,
                            price: Number(btn.dataset.ticketPrice || 0),
                            qty: 1
                        });
                        renderCart();
                    });
                });
            } catch (e) {
                ticketTypesWrap.innerHTML = '<p class="text-xs text-rose-600">No se pudieron cargar los tickets configurables.</p>';
            }
        };

        const applyDiscountCode = async () => {
            const code = String(discountCodeInput?.value || '').trim().toUpperCase();
            if (!code) {
                appliedDiscount = null;
                discountAmount = 0;
                setDiscountStatus('Ingresa un codigo para aplicar descuento.');
                syncTotals();
                return;
            }
            try {
                discountApplyBtn.disabled = true;
                setDiscountStatus('Aplicando cupón...');
                const res = await getDescuentoByCodigo({ codigo: code });
                const discount = res.data?.descuento;
                if (!discount) {
                    appliedDiscount = null;
                    discountAmount = 0;
                    if (discountRemoveBtn) discountRemoveBtn.classList.add('hidden');
                    setDiscountStatus('Codigo invalido o no existe.', 'err');
                    syncTotals();
                    return;
                }
                const subtotal = cartSubtotal();
                const totalQty = listCartItems().reduce((acc, item) => acc + Number(item.qty || 0), 0);
                const evaluation = applyDiscountToCart({
                    discount,
                    cart: { subtotal, totalQty },
                    paymentMethod: selectedPayment,
                    user: getCurrentUser()
                });
                if (!evaluation.ok) {
                    appliedDiscount = null;
                    discountAmount = 0;
                    if (discountRemoveBtn) discountRemoveBtn.classList.add('hidden');
                    setDiscountStatus(evaluation.message || 'El cupon no cumple condiciones.', 'err');
                    syncTotals();
                    return;
                }
                appliedDiscount = discount;
                discountAmount = Number(evaluation.discountAmount || 0);
                setDiscountStatus(`Codigo ${discount.codigo} aplicado correctamente.`, 'ok');
                if (discountRemoveBtn) discountRemoveBtn.classList.remove('hidden');
                syncTotals();
            } catch (e) {
                setDiscountStatus(e?.message || 'Error de red al aplicar descuento.', 'err');
            } finally {
                discountApplyBtn.disabled = false;
            }
        };

        discountApplyBtn?.addEventListener('click', () => void applyDiscountCode());
        discountCodeInput?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') void applyDiscountCode();
        });
        discountRemoveBtn?.addEventListener('click', () => {
            appliedDiscount = null;
            discountAmount = 0;
            if (discountCodeInput) discountCodeInput.value = '';
            discountRemoveBtn.classList.add('hidden');
            setDiscountStatus('Descuento removido.');
            syncTotals();
        });

        renderCart();
        renderTicketTypes();

        const fillUserData = async (user) => {
            if (user) {
                try {
                    const profileRes = await getUserProfile({ id: user.uid ?? user.id });
                    const profile = profileRes.data?.user;
                    inputName.value = profile?.nombre || user.displayName || '';
                    inputEmail.value = profile?.email || user.email || '';
                } catch (e) {
                    inputEmail.value = user.email || '';
                }
                try {
                    const access = await getUserAccess(user);
                    if (roleBreakdown) {
                        if (access.can('tickets.scan')) {
                            roleBreakdown.innerHTML = '<strong>Vista trabajador:</strong> este checkout permite compra y después registrar entrada desde escáner/admin en tiempo real.';
                        } else {
                            roleBreakdown.innerHTML = '<strong>Vista usuario:</strong> tus tickets se generan al pagar y su estado se sincroniza en vivo cuando el trabajador registra entrada.';
                        }
                    }
                } catch {}
            } else {
                authNotice.classList.remove('hidden');
                document.getElementById('btn-goto-login').addEventListener('click', () => navigateTo('/login'));
                if (roleBreakdown) {
                    roleBreakdown.innerHTML = '<strong>Vista invitado:</strong> puedes comprar ticket, y su estado de entrada se actualiza en tiempo real en el sistema.';
                }
            }
        };

        const cur = getCurrentUser();
        if (cur) {
            fillUserData(cur);
        } else {
            const unsubscribe = onAuthChange((u) => {
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
                syncTotals();
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
                cartItems = listCartItems();
                if (!cartItems.length) {
                    await showAlert('Agrega al menos un item al carrito antes de pagar.', { title: 'Carrito vacío', variant: 'warning' });
                    return;
                }
                const subtotalCarrito = cartItems.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || 0), 0);
                const totalCarrito = Math.max(0, Number(effectiveTotal || subtotalCarrito));
                const variables = {
                    clienteNombre: name,
                    clienteEmail: email,
                    metodoPago: selectedPayment,
                    estadoPago: selectedPayment === 'online' ? 'pagado' : 'pendiente',
                    precioTotal: totalCarrito
                };

                const isAuthed = getCurrentUser() != null;

                let ticketId;
                if (isAuthed) {
                    const res = await createUserTicket(variables);
                    ticketId = res.data.ticket_insert.id;
                } else {
                    const res = await createAnonymousTicket(variables);
                    ticketId = res.data.ticket_insert.id;
                }
                if (appliedDiscount?.id) {
                    try {
                        const next = Math.max(0, Number(appliedDiscount.usosRestantes || 0) - 1);
                        await consumeDescuento({ id: appliedDiscount.id, usosRestantesNext: next });
                    } catch (discErr) {
                        console.warn('No se pudo consumir descuento post-compra:', discErr);
                    }
                }
                try {
                    await publishAppUpdate('tickets', `created:${ticketId}`);
                    await publishAppUpdate('sales', `checkout:${ticketId}`);
                } catch (rtErr) {
                    // En compras anónimas no siempre hay permiso de escritura en appRealtime.
                    // La compra/ticket no debe fallar por este canal auxiliar de sincronización.
                    console.warn('Realtime publish no disponible para este usuario:', rtErr);
                }

                const estadoPago = variables.estadoPago;

                const emailResult = await sendTicketEmailCopy({
                    toEmail: email,
                    ticketId,
                    clienteNombre: name
                });

                let downloadedPdf = false;
                if (!emailResult.sent) {
                    await downloadTicketPdf({
                        ticketId,
                        clienteNombre: name,
                        clienteEmail: email,
                        fechaCreacion: new Date(),
                        precioTotal: totalCarrito,
                        metodoPago: selectedPayment,
                        estadoPago
                    });
                    downloadedPdf = true;
                }

                if (isAuthed) {
                    try {
                        const productsInCart = cartItems.filter((x) => x.type === 'producto' && x.id);
                        if (productsInCart.length) {
                            const invRes = await listProductosAdmin();
                            const map = new Map((invRes.data?.productos || []).map((p) => [p.id, p]));
                            for (const item of productsInCart) {
                                const p = map.get(item.id);
                                if (!p) continue;
                                const qty = Number(item.qty || 0);
                                if (qty <= 0) continue;
                                await updateProductoStock({
                                    id: p.id,
                                    stockActual: p.stockActual,
                                    reservadoAprox: Math.max(0, (p.reservadoAprox || 0) + qty)
                                });
                                await createMovimientoInventario({
                                    productoId: p.id,
                                    tipo: 'reserva_aprox',
                                    cantidad: qty,
                                    nota: `Reservado desde checkout ticket ${ticketId}`
                                });
                            }
                            await publishAppUpdate('inventory', 'Reservas aproximadas actualizadas desde checkout');
                        }
                    } catch (invErr) {
                        console.warn('No se pudo registrar reservado aprox de productos:', invErr);
                    }
                }

                const msg = emailResult.sent
                    ? 'Ticket enviado al correo. También disponible en Mis tickets.'
                    : downloadedPdf
                        ? 'No se pudo enviar correo; descargamos el PDF como respaldo. Disponible también en Mis tickets.'
                        : 'Ticket generado. Revisar Mis tickets.';
                if (isAuthed) {
                    clearCart();
                    if (purchaseConfirmMsg) purchaseConfirmMsg.textContent = `${msg} Redirigiendo a inicio en 3s...`;
                    purchaseConfirm?.classList.remove('hidden');
                    setTimeout(() => navigateTo('/home'), 3000);
                } else {
                    clearCart();
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
