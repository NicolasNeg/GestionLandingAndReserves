import { listRecentTickets, createPaquete } from '../dataconnect-generated';

const AdminDashboard = {
    render: () => `
        <div class="flex h-full bg-gray-100">
            <!-- Sidebar Admin -->
            <div class="w-64 bg-slate-800 text-white min-h-[calc(100vh-64px)] p-6">
                <h2 class="font-bold text-xl mb-8">Admin Panel</h2>
                <ul class="space-y-4">
                    <li><a href="#" class="text-white font-semibold">Monitor de Tickets</a></li>
                    <li><a href="#" class="text-gray-300 hover:text-white font-semibold">Crear Paquete Especial</a></li>
                    <li><a href="#" class="text-gray-300 hover:text-white font-semibold">Gestión de Descuentos</a></li>
                    <li><a href="#" class="text-gray-300 hover:text-white font-semibold">Configurar Precios Default</a></li>
                </ul>
            </div>
            
            <!-- Contenido Admin -->
            <div class="flex-grow p-8 overflow-y-auto">
                <h1 class="text-3xl font-bold text-gray-800 mb-6">Dashboard Administrativo</h1>
                
                <!-- Stats -->
                <div class="grid grid-cols-3 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p class="text-gray-500 text-sm font-bold uppercase">Tickets Activos/Escaneados</p>
                        <p class="text-3xl font-black text-slate-800" id="stat-scanned">--</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p class="text-gray-500 text-sm font-bold uppercase">Ingresos de Hoy</p>
                        <p class="text-3xl font-black text-green-600" id="stat-income">--</p>
                    </div>
                </div>

                <!-- Formulario Crear Paquete Rápido -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 p-6">
                    <h2 class="font-bold text-lg mb-4">Crear Paquete Especial (Ej. Sintrad)</h2>
                    <div class="grid grid-cols-2 gap-4">
                        <input type="text" id="pkg-name" placeholder="Nombre (Ej. PAQUETE SINTRAD)" class="border p-2 rounded">
                        <input type="number" id="pkg-price" placeholder="Precio Base (Ej. 1200)" class="border p-2 rounded">
                        <input type="number" id="pkg-capacity" placeholder="Personas Incluidas (Ej. 4)" class="border p-2 rounded">
                        <input type="text" id="pkg-desc" placeholder="Descripción / Items incluidos" class="border p-2 rounded">
                    </div>
                    <button id="btn-create-pkg" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">Guardar Paquete</button>
                </div>
                
                <!-- Tabla de Reservas -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                        <h2 class="font-bold text-lg">Últimos Tickets Generados</h2>
                        <button id="btn-refresh" class="text-blue-500 hover:underline"><i class="fas fa-sync"></i> Actualizar</button>
                    </div>
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-50 text-gray-500 text-sm">
                                <th class="p-4 border-b">ID Ticket</th>
                                <th class="p-4 border-b">Cliente</th>
                                <th class="p-4 border-b">Total</th>
                                <th class="p-4 border-b">Estado Pago</th>
                                <th class="p-4 border-b">Estado Ticket</th>
                            </tr>
                        </thead>
                        <tbody id="tickets-table-body">
                            <tr>
                                <td colspan="5" class="p-4 text-center text-gray-500">Cargando tickets...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,
    mount: () => {
        const btnCreatePkg = document.getElementById('btn-create-pkg');
        const btnRefresh = document.getElementById('btn-refresh');
        const tableBody = document.getElementById('tickets-table-body');

        // Función para cargar últimos tickets
        const loadTickets = async () => {
            tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Cargando tickets...</td></tr>';
            try {
                // Obtener usando SDK de Data Connect
                const res = await listRecentTickets();
                const tickets = res.data.tickets || [];
                
                if (tickets.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay tickets recientes</td></tr>';
                    return;
                }

                let html = '';
                tickets.forEach((data) => {
                    let pagoClase = data.estadoPago === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                    let ticketClase = data.estadoTicket === 'valido' ? 'bg-blue-100 text-blue-700' : (data.estadoTicket === 'escaneado' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700');

                    html += `
                        <tr class="hover:bg-gray-50">
                            <td class="p-4 border-b font-mono text-xs">#${data.id.substring(0, 8)}</td>
                            <td class="p-4 border-b">${data.clienteNombre || 'N/A'}</td>
                            <td class="p-4 border-b">$${(data.precioTotal || 0).toFixed(2)}</td>
                            <td class="p-4 border-b"><span class="${pagoClase} px-2 py-1 rounded text-xs font-bold uppercase">${data.estadoPago}</span></td>
                            <td class="p-4 border-b"><span class="${ticketClase} px-2 py-1 rounded text-xs font-bold uppercase">${data.estadoTicket}</span></td>
                        </tr>
                    `;
                });
                tableBody.innerHTML = html;
            } catch (error) {
                console.error("Error cargando tickets:", error);
                tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Error cargando datos. (Permisos o conexión fallida)</td></tr>';
            }
        };

        // Crear paquete
        btnCreatePkg.addEventListener('click', async () => {
            const name = document.getElementById('pkg-name').value;
            const price = document.getElementById('pkg-price').value;
            const cap = document.getElementById('pkg-capacity').value;
            const desc = document.getElementById('pkg-desc').value;

            if(!name || !price || !cap) return alert("Llena nombre, precio y capacidad.");

            btnCreatePkg.disabled = true;
            btnCreatePkg.textContent = "Guardando...";

            try {
                await createPaquete({
                    nombre: name,
                    descripcion: desc,
                    precioBase: parseFloat(price),
                    incluyePersonas: parseInt(cap)
                });
                alert("Paquete creado exitosamente en Cloud SQL.");
                // limpiar
                document.getElementById('pkg-name').value = '';
                document.getElementById('pkg-price').value = '';
                document.getElementById('pkg-capacity').value = '';
                document.getElementById('pkg-desc').value = '';
            } catch (error) {
                console.error("Error guardando paquete:", error);
                alert("Error al guardar paquete. Revisa conexión y permisos.");
            } finally {
                btnCreatePkg.disabled = false;
                btnCreatePkg.textContent = "Guardar Paquete";
            }
        });

        btnRefresh.addEventListener('click', loadTickets);
        
        // Cargar inicial
        loadTickets();
    }
};

export default AdminDashboard;
