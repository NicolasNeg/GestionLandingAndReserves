export default () => `
  <div class="max-w-3xl mx-auto p-8 h-full">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">Finalizar Reserva</h1>
    
    <div class="bg-white rounded-xl shadow-md p-6 mb-6">
      <h2 class="text-xl font-bold mb-4 border-b pb-2">Opciones de Pago</h2>
      
      <div class="space-y-4">
        <label class="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
          <input type="radio" name="pago_opcion" value="100" class="mt-1 mr-4" checked>
          <div>
            <div class="font-bold text-lg">Pagar 100% ahora (Aplica 10% de Descuento)</div>
            <div class="text-gray-500 text-sm">Paga el total por adelantado y obtén un descuento exclusivo. Recomendado.</div>
          </div>
        </label>
        
        <label class="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
          <input type="radio" name="pago_opcion" value="30" class="mt-1 mr-4">
          <div>
            <div class="font-bold text-lg">Pago del 30% como Anticipo</div>
            <div class="text-gray-500 text-sm">Asegura tu mesa pagando el 30% ahora. Pagarás el 70% restante al llegar a sucursal.</div>
          </div>
        </label>
      </div>
    </div>

    <div class="bg-gray-100 rounded-xl p-6 flex justify-between items-center mb-6 shadow-inner">
      <div>
        <p class="text-gray-600">Subtotal: <span class="font-bold text-gray-800">$1,000.00 MXN</span></p>
        <p class="text-green-600 text-sm font-bold mt-1" id="descuento-texto">-10% Aplicado ($100.00)</p>
      </div>
      <div class="text-right">
        <p class="text-sm text-gray-500">Total a pagar ahora:</p>
        <p class="text-3xl font-extrabold text-blue-600" id="total-text">$900.00 MXN</p>
      </div>
    </div>

    <button class="w-full bg-blue-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-blue-700 shadow-md">Proceder al Pago Seguro</button>
  </div>
`;
