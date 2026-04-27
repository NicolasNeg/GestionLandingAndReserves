export default () => `
  <div class="flex h-full bg-gray-100">
    <!-- Sidebar Admin -->
    <div class="w-64 bg-slate-800 text-white min-h-[calc(100vh-64px)] p-6">
      <h2 class="font-bold text-xl mb-8">Admin Panel</h2>
      <ul class="space-y-4">
        <li><a href="#" class="text-gray-300 hover:text-white font-semibold">Monitor de Mesas</a></li>
        <li><a href="#" class="text-gray-300 hover:text-white font-semibold">Gestión de Reservas</a></li>
        <li><a href="#" class="text-gray-300 hover:text-white font-semibold">Configuración de Precios</a></li>
      </ul>
    </div>
    
    <!-- Contenido Admin -->
    <div class="flex-grow p-8 overflow-y-auto">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Monitor en Tiempo Real</h1>
      
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-6 mb-8">
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p class="text-gray-500 text-sm font-bold uppercase">Mesas Ocupadas</p>
          <p class="text-3xl font-black text-slate-800">12 / 40</p>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p class="text-gray-500 text-sm font-bold uppercase">Ingresos de Hoy</p>
          <p class="text-3xl font-black text-green-600">$4,500.00</p>
        </div>
      </div>
      
      <!-- Tabla de Reservas -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <h2 class="font-bold text-lg">Reservas Recientes</h2>
        </div>
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 text-gray-500 text-sm">
              <th class="p-4 border-b">ID Reserva</th>
              <th class="p-4 border-b">Cliente</th>
              <th class="p-4 border-b">Mesa</th>
              <th class="p-4 border-b">Estado Pago</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="p-4 border-b">#R-001</td>
              <td class="p-4 border-b">Juan Pérez</td>
              <td class="p-4 border-b">M-01</td>
              <td class="p-4 border-b"><span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Total (100%)</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
`;
