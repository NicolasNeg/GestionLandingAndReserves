import { getTicketById, updateTicketStatus } from '../dataconnect-generated';

const Escaner = {
    render: () => `
        <div class="max-w-md mx-auto p-4 h-full flex flex-col pt-10">
            <h1 class="text-2xl font-bold text-gray-800 mb-4 text-center">Escáner de Acceso (Personal)</h1>
            
            <div class="bg-gray-900 rounded-2xl flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden shadow-2xl">
                <div class="w-64 h-64 border-4 border-blue-500 rounded-xl relative">
                    <div class="absolute w-full h-1 bg-blue-400 shadow-[0_0_10px_#60a5fa] animate-[scan_2s_ease-in-out_infinite]"></div>
                </div>
                <p class="text-gray-300 mt-6 text-center text-sm">Escáner Óptico en Desarrollo...</p>
                
                <!-- Simulación temporal por ID -->
                <div class="mt-8 flex flex-col gap-2 w-full">
                    <input type="text" id="sim-ticket-id" placeholder="ID del Ticket (ej. UUID)" class="px-4 py-3 rounded text-black w-full border-2 focus:border-blue-500">
                    <button id="btn-simulate" class="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 w-full transition">Buscar Ticket por ID</button>
                </div>
            </div>

            <!-- Modal de Ticket -->
            <div id="modal-ticket" class="fixed inset-0 bg-black/60 hidden flex items-end sm:items-center justify-center z-50 p-4 transition-opacity">
                <div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-6 transform transition-transform" id="modal-content">
                    <div id="t-icon" class="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto -mt-12 border-4 border-white mb-4 bg-green-500 text-white">
                        <i class="fas fa-check"></i>
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
                    0%, 100% { top: 0; }
                    50% { top: 98%; }
                }
            </style>
        </div>
    `,
    mount: () => {
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

        btnClose.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        btnSimulate.addEventListener('click', async () => {
            const ticketId = inputId.value.trim();
            if (!ticketId) return alert("Ingresa un ID válido");
            
            btnSimulate.textContent = "Buscando en Base de Datos...";
            btnSimulate.disabled = true;

            try {
                // 1. Obtener ticket usando Data Connect
                const res = await getTicketById({ id: ticketId });

                if (res.data && res.data.ticket) {
                    currentTicketData = res.data.ticket;
                    currentTicketId = res.data.ticket.id;
                    showTicketModal(currentTicketId, currentTicketData);
                } else {
                    alert("¡Alerta! El código QR (Ticket) NO existe en la base de datos o es falso.");
                }
            } catch (error) {
                console.error("Error obteniendo ticket: ", error);
                alert("Error al intentar comunicarse con el servidor. Verifica el formato del ID (UUID esperado) y tu conexión.");
            } finally {
                btnSimulate.textContent = "Buscar Ticket por ID";
                btnSimulate.disabled = false;
            }
        });

        function showTicketModal(id, data) {
            tId.textContent = "#" + id.substring(0, 8);
            tClient.textContent = data.clienteNombre || '--';
            tPrice.textContent = "$" + (data.precioTotal || 0).toFixed(2);
            
            // Reset clases
            tIcon.className = "w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto -mt-12 border-4 border-white mb-4";
            tTitle.className = "text-2xl font-bold text-center mb-1";
            tPaymentStatus.className = "p-3 rounded-lg text-center font-bold mb-4";
            
            btnAction.style.display = 'block';

            if (data.estadoTicket === 'escaneado') {
                // Rechazado - Ya usado
                tIcon.classList.add('bg-red-500', 'text-white');
                tIcon.innerHTML = '<i class="fas fa-times"></i>';
                tTitle.classList.add('text-red-600');
                tTitle.textContent = "Ticket Ya Utilizado";
                tPaymentStatus.classList.add('bg-red-100', 'text-red-800');
                
                const fechaUso = data.fechaEscaneo ? new Date(data.fechaEscaneo).toLocaleString() : 'Recientemente';
                tPaymentStatus.textContent = "Este ticket ya ingresó al balneario el: " + fechaUso;
                btnAction.style.display = 'none'; // No se puede registrar ingreso
                
            } else if (data.estadoTicket === 'valido') {
                if (data.estadoPago === 'pagado') {
                    // Válido y Pagado
                    tIcon.classList.add('bg-green-500', 'text-white');
                    tIcon.innerHTML = '<i class="fas fa-check"></i>';
                    tTitle.classList.add('text-green-600');
                    tTitle.textContent = "Ticket Válido";
                    tPaymentStatus.classList.add('bg-green-100', 'text-green-800');
                    tPaymentStatus.textContent = "Pago Confirmado 100%";
                    btnAction.textContent = "Aceptar Ingreso y Marcar Usado";
                    btnAction.className = "w-full bg-gray-900 text-white font-bold py-4 rounded-xl text-lg hover:bg-black transition shadow-lg";
                } else {
                    // Válido pero Pago Pendiente (Taquilla)
                    tIcon.classList.add('bg-amber-500', 'text-white');
                    tIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                    tTitle.classList.add('text-amber-600');
                    tTitle.textContent = "Pago Pendiente";
                    tPaymentStatus.classList.add('bg-amber-100', 'text-amber-800');
                    tPaymentStatus.textContent = "Cobrar en taquilla: $" + (data.precioTotal).toFixed(2);
                    btnAction.textContent = "Cobrar y Aceptar Ingreso";
                    btnAction.className = "w-full bg-amber-500 text-white font-bold py-4 rounded-xl text-lg hover:bg-amber-600 transition shadow-lg";
                }
            } else {
                // Cancelado u otro
                tIcon.classList.add('bg-gray-500', 'text-white');
                tIcon.innerHTML = '<i class="fas fa-ban"></i>';
                tTitle.classList.add('text-gray-600');
                tTitle.textContent = "Ticket Inválido o Cancelado";
                tPaymentStatus.classList.add('hidden');
                btnAction.style.display = 'none';
            }

            modal.classList.remove('hidden');
        }

        btnAction.addEventListener('click', async () => {
            if (!currentTicketId) return;
            
            btnAction.textContent = "Validando ingreso...";
            btnAction.disabled = true;

            try {
                // 2. Actualizar en Cloud SQL usando Data Connect
                await updateTicketStatus({
                    id: currentTicketId,
                    estadoTicket: 'escaneado',
                    estadoPago: 'pagado'
                });

                alert("Ingreso registrado exitosamente en el sistema.");
                modal.classList.add('hidden');
                inputId.value = ''; // limpiar
                
            } catch (error) {
                console.error("Error registrando ingreso:", error);
                alert("Error al actualizar la base de datos (Faltan permisos o conexión lenta).");
                btnAction.textContent = "Reintentar";
                btnAction.disabled = false;
            }
        });
    }
};

export default Escaner;
