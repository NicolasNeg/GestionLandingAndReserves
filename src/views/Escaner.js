import { Html5Qrcode } from 'html5-qrcode';
import { getTicketById, updateTicketStatus, listRecentTickets } from '../dataconnect-generated';
import { auth } from '../firebase-config.js';
import { getUserAccess } from '../lib/accessControl.js';
import { icon } from '../lib/icons.js';
import { showAlert } from '../lib/appDialog.js';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

function extractTicketId(value) {
    const text = String(value || '').trim();
    if (!text) return null;

    const directMatch = text.match(UUID_PATTERN);
    if (directMatch) return directMatch[0].toLowerCase();

    try {
        const parsed = JSON.parse(text);
        const candidate = parsed?.ticketId || parsed?.ticket_id || parsed?.ticket || parsed?.id;
        if (candidate) return extractTicketId(candidate);
    } catch {
        // El QR normal del sistema es texto plano; JSON solo es tolerancia futura.
    }

    try {
        const url = new URL(text);
        const candidate =
            url.searchParams.get('ticketId') ||
            url.searchParams.get('ticket_id') ||
            url.searchParams.get('ticket') ||
            url.searchParams.get('id') ||
            url.pathname;
        return extractTicketId(candidate);
    } catch {
        return null;
    }
}

function formatMoney(value) {
    return `$${Number(value || 0).toFixed(2)}`;
}


function playTone(ok = true) {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = ok ? 920 : 280;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (ok ? 0.16 : 0.26));
        osc.start(now);
        osc.stop(now + (ok ? 0.18 : 0.28));
    } catch {
        // noop
    }
}

const Escaner = {
    render: () => `
        <div class="min-h-full bg-gradient-to-br from-cyan-50 via-white to-amber-50 p-4 pt-8">
            <div class="mx-auto max-w-6xl">
                <div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p class="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-cyan-700">
                            ${icon('waves', 'h-4 w-4')} Entrada del balneario
                        </p>
                        <h1 class="text-3xl font-black text-slate-900">Escáner de tickets</h1>
                    </div>
                    <div class="rounded-full border border-cyan-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                        QR oficial: ID de boleto del sistema
                    </div>
                </div>

                <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <section class="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-2xl">
                        <div class="relative aspect-[4/5] min-h-[420px] sm:aspect-video">
                            <div id="qr-reader-root" class="absolute inset-0 z-0 bg-slate-950"></div>
                            <div class="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(2,6,23,0.72)_72%)]"></div>
                            <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-8">
                                <div class="relative h-72 w-72 max-w-full rounded-[2rem] border-4 border-cyan-300/90 shadow-[0_0_38px_rgba(34,211,238,0.45)]">
                                    <div class="absolute left-4 right-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.95)] animate-[scan_2s_ease-in-out_infinite]"></div>
                                    <div class="absolute -left-1 -top-1 h-12 w-12 rounded-tl-[1.8rem] border-l-4 border-t-4 border-white"></div>
                                    <div class="absolute -right-1 -top-1 h-12 w-12 rounded-tr-[1.8rem] border-r-4 border-t-4 border-white"></div>
                                    <div class="absolute -bottom-1 -left-1 h-12 w-12 rounded-bl-[1.8rem] border-b-4 border-l-4 border-white"></div>
                                    <div class="absolute -bottom-1 -right-1 h-12 w-12 rounded-br-[1.8rem] border-b-4 border-r-4 border-white"></div>
                                </div>
                            </div>
                            <div class="pointer-events-none absolute left-4 right-4 top-4 z-20 flex items-center justify-between gap-3">
                                <div class="rounded-full bg-black/55 px-3 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100 backdrop-blur">
                                    ${icon('scan', 'mr-1 inline h-4 w-4')} Cámara QR
                                </div>
                                <div id="camera-chip" class="rounded-full bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-200 backdrop-blur">
                                    En espera
                                </div>
                            </div>
                        </div>

                        <div class="grid gap-3 border-t border-white/10 bg-slate-950 p-4 sm:grid-cols-2">
                            <button id="btn-start-camera" type="button" class="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950 transition hover:bg-cyan-300">
                                ${icon('scan', 'h-5 w-5')} Iniciar cámara
                            </button>
                            <button id="btn-stop-camera" type="button" class="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-bold text-white transition hover:bg-white/10" disabled>
                                ${icon('info', 'h-5 w-5')} Detener
                            </button>
                        </div>
                    </section>

                    <aside class="space-y-4">
                        <div id="scanner-status" class="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-950 shadow-sm transition">
                            <div class="flex items-start gap-3">
                                <div id="scanner-status-icon" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                                    ${icon('scan', 'h-6 w-6')}
                                </div>
                                <div>
                                    <h2 id="scanner-status-title" class="text-lg font-black">Listo para escanear</h2>
                                    <p id="scanner-status-message" class="mt-1 text-sm leading-5">Apunta la cámara al QR del boleto. Si el QR no pertenece al sistema, se rechazará aquí mismo.</p>
                                </div>
                            </div>
                        </div>

                        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h2 class="mb-3 flex items-center gap-2 text-lg font-black text-slate-900">
                                ${icon('ticket', 'h-5 w-5 text-cyan-700')} Validación manual
                            </h2>
                            <div class="flex flex-col gap-2">
                                <input type="text" id="sim-ticket-id" placeholder="Pega el ID o contenido del QR" class="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500">
                                <button id="btn-simulate" type="button" class="w-full rounded-xl bg-slate-900 py-3 font-black text-white transition hover:bg-black">Validar manualmente</button>
                            </div>
                        </div>

                        <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm">
                            <p class="font-black">Última lectura</p>
                            <p id="last-qr-value" class="mt-2 break-all rounded-xl bg-white/70 p-3 font-mono text-xs text-slate-700">--</p>
                        </div>
                    </aside>
                </div>
            </div>

            <div id="modal-ticket" class="fixed inset-0 bg-black/60 hidden flex items-end sm:items-center justify-center z-50 p-4 transition-opacity">
                <div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-6 transform transition-transform" id="modal-content">
                    <div id="t-icon" class="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto -mt-12 border-4 border-white mb-4 bg-green-500 text-white">
                        ${icon('check', 'h-8 w-8')}
                    </div>
                    
                    <h2 id="t-title" class="text-2xl font-bold text-center text-green-600 mb-1">Ticket Válido</h2>
                    <p id="t-id" class="text-center text-gray-500 text-sm mb-6 font-mono">#TRX-000</p>
                    
                    <div class="space-y-3 mb-6 text-sm">
                        <div class="flex justify-between border-b pb-2"><span class="text-gray-500">Cliente:</span><span id="t-client" class="font-bold">--</span></div>
                        <div class="flex justify-between border-b pb-2"><span class="text-gray-500">Total a Pagar/Pagado:</span><span id="t-price" class="font-bold">--</span></div>
                        <div id="t-payment-status" class="bg-green-100 text-green-800 p-3 rounded-lg text-center font-bold">--</div>
                    </div>
                    
                    <button id="btn-action" class="w-full bg-gray-900 text-white font-bold py-4 rounded-xl text-lg hover:bg-black transition shadow-lg">Registrar Ingreso</button>
                    <button id="btn-close" class="w-full text-gray-500 font-bold py-3 mt-2 text-sm hover:text-gray-700">Cerrar (No ingresar)</button>
                </div>
            </div>

            <style>
                @keyframes scan {
                    0%, 100% { top: 12%; }
                    50% { top: 88%; }
                }
                #qr-reader-root video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover;
                }
            </style>
        </div>
    `,
    mount: () => {
        if (window.__ticketScannerCleanup) {
            window.__ticketScannerCleanup();
        }

        const readerRoot = document.getElementById('qr-reader-root');
        const btnStartCamera = document.getElementById('btn-start-camera');
        const btnStopCamera = document.getElementById('btn-stop-camera');
        const cameraChip = document.getElementById('camera-chip');
        const statusBox = document.getElementById('scanner-status');
        const statusIcon = document.getElementById('scanner-status-icon');
        const statusTitle = document.getElementById('scanner-status-title');
        const statusMessage = document.getElementById('scanner-status-message');
        const lastQrValue = document.getElementById('last-qr-value');
        const btnSimulate = document.getElementById('btn-simulate');
        const inputId = document.getElementById('sim-ticket-id');
        const modal = document.getElementById('modal-ticket');
        const btnAction = document.getElementById('btn-action');
        const btnClose = document.getElementById('btn-close');
        
        // Elementos UI Modal
        const tIcon = document.getElementById('t-icon');
        const tTitle = document.getElementById('t-title');
        const tId = document.getElementById('t-id');
        const tClient = document.getElementById('t-client');
        const tPrice = document.getElementById('t-price');
        const tPaymentStatus = document.getElementById('t-payment-status');
        
        let currentTicketId = null;
        let currentTicketData = null;
        let currentActionLabel = 'Registrar Ingreso';
        let html5QrCode = null;
        let cameraActive = false;
        let isValidating = false;
        let lastScanRaw = '';
        let lastScanAt = 0;
        let scannerDisposed = false;

        const statusClasses = {
            idle: 'rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-950 shadow-sm transition',
            loading: 'rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-sm transition',
            success: 'rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm transition',
            warning: 'rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm transition',
            danger: 'rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-950 shadow-sm transition'
        };

        const statusIconClasses = {
            idle: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700',
            loading: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700',
            success: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700',
            warning: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700',
            danger: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700'
        };

        const statusIcons = {
            idle: icon('scan', 'h-6 w-6'),
            loading: icon('clock', 'h-6 w-6 animate-spin'),
            success: icon('check', 'h-6 w-6'),
            warning: icon('alertTriangle', 'h-6 w-6'),
            danger: icon('x', 'h-6 w-6')
        };

        const showScannerStatus = (variant, title, message) => {
            statusBox.className = statusClasses[variant] || statusClasses.idle;
            statusIcon.className = statusIconClasses[variant] || statusIconClasses.idle;
            statusIcon.innerHTML = statusIcons[variant] || statusIcons.idle;
            statusTitle.textContent = title;
            statusMessage.textContent = message;
        };

        const updateLastRead = (rawValue) => {
            const text = String(rawValue || '').trim();
            lastQrValue.textContent = text ? (text.length > 180 ? `${text.slice(0, 177)}...` : text) : '--';
        };

        const setBusy = (busy) => {
            btnSimulate.disabled = busy;
            btnSimulate.textContent = busy ? 'Validando boleto...' : 'Validar manualmente';
        };

        const setCameraUi = (active, label = active ? 'Cámara activa' : 'En espera') => {
            cameraActive = active;
            cameraChip.textContent = label;
            cameraChip.className = active
                ? 'rounded-full bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 backdrop-blur'
                : 'rounded-full bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-200 backdrop-blur';
            btnStartCamera.disabled = active;
            btnStopCamera.disabled = !active;
        };

        const showInvalidScan = (message = 'Este QR no pertenece al sistema del balneario. No permitir acceso.') => {
            currentTicketId = null;
            currentTicketData = null;
            showScannerStatus('danger', 'BOLETO INVALIDO', message);
            playTone(false);
            if (navigator.vibrate) navigator.vibrate([90, 40, 90]);
        };

        const stopCamera = async ({ silent = false } = {}) => {
            if (html5QrCode) {
                try {
                    if (html5QrCode.isScanning) {
                        await html5QrCode.stop();
                    }
                    html5QrCode.clear();
                } catch (err) {
                    console.warn('Al detener el escaner:', err);
                }
                html5QrCode = null;
            }
            setCameraUi(false);

            if (!silent) {
                showScannerStatus('idle', 'Cámara detenida', 'Puedes reiniciar la cámara o validar el ID manualmente.');
            }
        };

        const validateRawCode = async (rawValue) => {
            if (isValidating) return;

            const raw = String(rawValue || '').trim();
            updateLastRead(raw);

            if (!raw) {
                showScannerStatus('warning', 'Sin código', 'Acerca un QR válido o pega el ID del boleto.');
                return;
            }

            const ticketId = extractTicketId(raw);
            if (!ticketId) {
                showInvalidScan('Este QR no tiene un ID de boleto válido. Coméntale al cliente que este boleto es inválido.');
                return;
            }

            isValidating = true;
            setBusy(true);
            showScannerStatus('loading', 'Validando boleto', `Buscando ticket #${ticketId.substring(0, 8)} en el sistema...`);

            try {
                const res = await getTicketById({ id: ticketId });
                let ticket = res.data?.ticket;

                if (!ticket) {
                    if (ticketId.length === 8) {
                        try {
                            const recent = await listRecentTickets();
                            const alt = (recent.data?.tickets || []).find((t) => String(t.id || '').toLowerCase().startsWith(ticketId));
                            if (alt?.id) {
                                const byAlt = await getTicketById({ id: alt.id });
                                ticket = byAlt.data?.ticket || null;
                            }
                        } catch {}
                    }
                    if (!ticket) {
                        showInvalidScan('El ID leído no existe en la base de datos. Coméntale al cliente que este boleto es inválido.');
                        return;
                    }
                }

                currentTicketData = ticket;
                currentTicketId = ticket.id;
                showTicketModal(currentTicketId, currentTicketData);
            } catch (error) {
                console.error('Error obteniendo ticket: ', error);
                showScannerStatus(
                    'warning',
                    'No se pudo validar',
                    'Hubo un problema consultando el servidor. Revisa la conexión e intenta de nuevo antes de permitir el acceso.'
                );
            } finally {
                isValidating = false;
                setBusy(false);
            }
        };

        const handleDetectedCode = (rawValue) => {
            const raw = String(rawValue || '').trim();
            const now = Date.now();

            if (!raw || isValidating) return;
            if (raw === lastScanRaw && now - lastScanAt < 2400) return;

            lastScanRaw = raw;
            lastScanAt = now;
            validateRawCode(raw);
        };

        const startCamera = async () => {
            if (scannerDisposed) return;
            if (cameraActive) return;

            if (!window.isSecureContext) {
                showScannerStatus(
                    'warning',
                    'Contexto no seguro',
                    'La camara requiere HTTPS (o localhost). Usa la validacion manual del boleto.'
                );
                return;
            }

            if (!navigator.mediaDevices?.getUserMedia) {
                showScannerStatus('warning', 'Cámara no disponible', 'Este navegador no permite acceso a cámara. Usa la validación manual.');
                return;
            }

            if (!readerRoot) {
                showScannerStatus('warning', 'Interfaz incompleta', 'Recarga la página e intenta de nuevo.');
                return;
            }

            try {
                btnStartCamera.disabled = true;
                cameraChip.textContent = 'Abriendo...';

                await stopCamera({ silent: true });

                html5QrCode = new Html5Qrcode('qr-reader-root', { verbose: false });
                await html5QrCode.start(
                    { facingMode: 'environment' },
                    {
                        fps: 8,
                        qrbox: { width: 260, height: 260 },
                        aspectRatio: 1.777778
                    },
                    (decodedText) => {
                        handleDetectedCode(decodedText);
                    },
                    () => {}
                );

                setCameraUi(true);
                showScannerStatus('idle', 'Cámara lista', 'Apunta al QR del boleto. El sistema validará el ticket automáticamente.');
            } catch (error) {
                console.error('Error iniciando cámara:', error);
                await stopCamera({ silent: true });
                const name = error?.name || '';
                const hint =
                    name === 'NotAllowedError' || name === 'PermissionDeniedError'
                        ? 'Permite el acceso a la camara en la barra del navegador y vuelve a pulsar Iniciar.'
                        : 'Prueba otro navegador o usa la validacion manual del boleto.';
                showScannerStatus('warning', 'No se pudo abrir la cámara', hint);
            } finally {
                if (!cameraActive) btnStartCamera.disabled = false;
            }
        };

        const cleanupScanner = () => {
            scannerDisposed = true;
            void stopCamera({ silent: true });
            document.removeEventListener('click', stopOnNavigation, true);
            window.removeEventListener('beforeunload', cleanupScanner);
            window.removeEventListener('popstate', cleanupScanner);
            if (window.__ticketScannerCleanup === cleanupScanner) {
                window.__ticketScannerCleanup = null;
            }
        };

        const stopOnNavigation = (event) => {
            if (event.target.closest?.('[data-link]')) cleanupScanner();
        };

        window.__ticketScannerCleanup = cleanupScanner;
        document.addEventListener('click', stopOnNavigation, true);
        window.addEventListener('beforeunload', cleanupScanner);
        window.addEventListener('popstate', cleanupScanner);

        btnClose.addEventListener('click', () => {
            modal.classList.add('hidden');
            btnAction.disabled = false;
            btnAction.textContent = currentActionLabel;
        });

        btnStartCamera.addEventListener('click', () => void startCamera());
        btnStopCamera.addEventListener('click', () => void stopCamera());

        btnSimulate.addEventListener('click', () => {
            validateRawCode(inputId.value);
        });

        inputId.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') validateRawCode(inputId.value);
        });

        function showTicketModal(id, data) {
            tId.textContent = "#" + id.substring(0, 8);
            tClient.textContent = data.clienteNombre || '--';
            tPrice.textContent = formatMoney(data.precioTotal);
            
            // Reset clases
            tIcon.className = "w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto -mt-12 border-4 border-white mb-4";
            tTitle.className = "text-2xl font-bold text-center mb-1";
            tPaymentStatus.className = "p-3 rounded-lg text-center font-bold";
            
            btnAction.style.display = 'block';
            btnAction.disabled = false;
            currentActionLabel = 'Registrar Ingreso';

            if (data.estadoTicket === 'escaneado') {
                // Rechazado - Ya usado
                tIcon.classList.add('bg-red-500', 'text-white');
                tIcon.innerHTML = icon('x', 'h-8 w-8');
                tTitle.classList.add('text-red-600');
                tTitle.textContent = "Ticket Ya Utilizado";
                tPaymentStatus.classList.add('bg-red-100', 'text-red-800');
                
                const fechaUso = data.fechaEscaneo ? new Date(data.fechaEscaneo).toLocaleString() : 'Recientemente';
                tPaymentStatus.textContent = "Este ticket ya ingresó al balneario el: " + fechaUso;
                btnAction.style.display = 'none'; // No se puede registrar ingreso
                showScannerStatus('danger', 'BOLETO RECHAZADO', 'Este ticket ya fue usado. No permitir acceso nuevamente.');
                
            } else if (data.estadoTicket === 'valido') {
                if (data.estadoPago === 'pagado') {
                    // Válido y Pagado
                    tIcon.classList.add('bg-green-500', 'text-white');
                    tIcon.innerHTML = icon('check', 'h-8 w-8');
                    tTitle.classList.add('text-green-600');
                    tTitle.textContent = "Ticket Válido";
                    tPaymentStatus.classList.add('bg-green-100', 'text-green-800');
                    tPaymentStatus.textContent = "Pago Confirmado 100%";
                    currentActionLabel = "Aceptar Ingreso y Marcar Usado";
                    btnAction.textContent = currentActionLabel;
                    btnAction.className = "w-full bg-gray-900 text-white font-bold py-4 rounded-xl text-lg hover:bg-black transition shadow-lg";
                    showScannerStatus('success', 'BOLETO VALIDO', 'Pago confirmado. Puedes aceptar el ingreso y marcar el boleto como usado.');
                playTone(true);
                if (navigator.vibrate) navigator.vibrate([25, 20, 45]);
                } else {
                    // Válido pero Pago Pendiente (Taquilla)
                    tIcon.classList.add('bg-amber-500', 'text-white');
                    tIcon.innerHTML = icon('alertTriangle', 'h-8 w-8');
                    tTitle.classList.add('text-amber-600');
                    tTitle.textContent = "Pago Pendiente";
                    tPaymentStatus.classList.add('bg-amber-100', 'text-amber-800');
                    tPaymentStatus.textContent = "Cobrar en taquilla: " + formatMoney(data.precioTotal);
                    currentActionLabel = "Cobrar y Aceptar Ingreso";
                    btnAction.textContent = currentActionLabel;
                    btnAction.className = "w-full bg-amber-500 text-white font-bold py-4 rounded-xl text-lg hover:bg-amber-600 transition shadow-lg";
                    showScannerStatus('warning', 'PAGO PENDIENTE', 'El boleto existe, pero primero debe cobrarse en taquilla.');
                    playTone(false);
                    if (navigator.vibrate) navigator.vibrate([70]);
                }
            } else {
                // Cancelado u otro
                tIcon.classList.add('bg-gray-500', 'text-white');
                tIcon.innerHTML = icon('ban', 'h-8 w-8');
                tTitle.classList.add('text-gray-600');
                tTitle.textContent = "Ticket Inválido o Cancelado";
                tPaymentStatus.classList.add('hidden');
                btnAction.style.display = 'none';
                showScannerStatus('danger', 'BOLETO INVALIDO', 'Este ticket está cancelado o no tiene estado válido. No permitir acceso.');
            }

            modal.classList.remove('hidden');
        }

        btnAction.addEventListener('click', async () => {
            if (!currentTicketId) return;
            
            btnAction.textContent = "Validando ingreso...";
            btnAction.disabled = true;

            try {
                const access = await getUserAccess(auth.currentUser);
                if (!access.can('tickets.scan')) {
                    await showAlert('Tu usuario ya no tiene permiso para escanear tickets.', {
                        title: 'Sin permiso',
                        variant: 'danger'
                    });
                    return;
                }

                await updateTicketStatus({
                    id: currentTicketId,
                    estadoTicket: 'escaneado',
                    estadoPago: 'pagado'
                });

                showScannerStatus('success', 'INGRESO REGISTRADO', 'El boleto quedó marcado como usado en el sistema.');
                playTone(true);
                if (navigator.vibrate) navigator.vibrate([45, 20, 45]);
                await showAlert('Ingreso registrado exitosamente en el sistema.', {
                    title: 'Listo',
                    variant: 'success'
                });
                modal.classList.add('hidden');
                inputId.value = ''; // limpiar
                
            } catch (error) {
                console.error("Error registrando ingreso:", error);
                await showAlert(
                    'Error al actualizar la base de datos (permisos o conexión).',
                    { title: 'Error', variant: 'danger' }
                );
                btnAction.textContent = "Reintentar";
            } finally {
                btnAction.disabled = false;
            }
        });

        const ticketFromUrl = new URLSearchParams(window.location.search).get('ticket');
        if (ticketFromUrl) {
            inputId.value = ticketFromUrl;
            validateRawCode(ticketFromUrl);
        }
    }
};

export default Escaner;
