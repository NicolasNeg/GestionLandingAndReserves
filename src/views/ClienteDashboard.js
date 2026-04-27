export default () => `
  <div class="max-w-5xl mx-auto p-8 h-full">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">Mi Panel (Cliente)</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="col-span-2 space-y-6">
        <h2 class="text-xl font-bold text-gray-700">Mis Reservas Activas</h2>
        
        <!-- Tarjeta de Reserva -->
        <div class="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
          <div class="flex justify-between items-start mb-4">
            <div>
              <p class="text-sm text-gray-500">ID Reserva: #RES-10492</p>
              <h3 class="text-lg font-bold">Mesa VIP - M04</h3>
            </div>
            <span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 object-contain rounded">Activa</span>
          </div>
          <p class="text-gray-600 mb-2"><span class="font-bold">Fecha:</span> Sábado, 15 Octubre 2024</p>
          <p class="text-gray-600"><span class="font-bold">Estado del Pago:</span> Anticipo Pagado (30%)</p>
          <p class="text-red-500 text-sm font-bold mt-2">Saldo pendiente en sucursal: $700.00 MXN</p>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center text-center">
        <h2 class="text-gray-700 font-bold mb-4">Tu Ticket de Acceso</h2>
        <div class="w-32 h-32 bg-gray-200 mb-4 flex items-center justify-center border-2 border-dashed border-gray-400">
          <span class="text-gray-500 text-xs">[QR Simulado]</span>
        </div>
        <p class="text-sm text-gray-500">Muestra este código al llegar a sucursal.</p>
      </div>
    </div>
  </div>
`;
