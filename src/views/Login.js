export default () => `
  <div class="h-full flex items-center justify-center bg-gray-50 p-8">
    <div class="max-w-md w-full bg-white rounded-xl shadow-md p-8">
      <h2 class="text-2xl font-bold text-center text-gray-800 mb-8">Iniciar Sesión</h2>
      <form id="login-form">
        <div class="mb-4">
          <label class="block text-gray-700 mb-2">Correo Electrónico</label>
          <input type="email" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="correo@ejemplo.com">
        </div>
        <div class="mb-6">
          <label class="block text-gray-700 mb-2">Contraseña</label>
          <input type="password" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="********">
        </div>
        <button type="submit" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Entrar</button>
      </form>
      <div class="mt-6 flex items-center justify-center">
        <span class="text-gray-500">¿No tienes cuenta?</span>
        <a href="#" class="text-blue-600 ml-2 hover:underline">Regístrate</a>
      </div>
    </div>
  </div>
`;
