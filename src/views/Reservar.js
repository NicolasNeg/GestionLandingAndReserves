export default () => `
  <div class="p-8 max-w-7xl mx-auto h-full flex flex-col">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Mapa de Mesas</h1>
      <div class="flex gap-4 items-center text-sm">
        <div class="flex items-center gap-2"><div class="w-4 h-4 bg-green-500 rounded-full"></div> Disponible</div>
        <div class="flex items-center gap-2"><div class="w-4 h-4 bg-yellow-500 rounded-full"></div> Bloqueo Temporal (Soft-lock)</div>
        <div class="flex items-center gap-2"><div class="w-4 h-4 bg-red-500 rounded-full"></div> Reservada</div>
      </div>
    </div>
    
    <!-- Contenedor del Mapa Interactivo -->
    <div id="mapa-mesas" class="bg-white border-2 border-gray-200 rounded-xl flex-grow relative overflow-hidden shadow-sm">
      <div class="absolute inset-0 flex items-center justify-center text-gray-400">
        <p>Cargando mapa interactivo en tiempo real...</p>
      </div>
      <!-- Aquí se renderizarán dinámicamente las mesas desde Firestore usando {x,y} -->
    </div>
  </div>
`;
