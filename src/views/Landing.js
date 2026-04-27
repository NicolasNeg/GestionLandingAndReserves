export default () => `
  <main class="w-full h-full flex flex-col items-center">
    <header class="w-full bg-blue-50 py-20 px-8 text-center flex-grow flex flex-col justify-center shadow-inner">
      <h1 class="text-5xl font-extrabold text-blue-900 mb-4 tracking-tight">Bienvenido a Balneario San Antonio Texas</h1>
      <p class="text-xl text-blue-700 max-w-2xl mx-auto mb-8">Reserva tu mesa en línea, descubre nuestros paquetes y disfruta del mejor ambiente para tu fin de semana.</p>
      <div>
        <a href="/reservar" data-link class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition transform hover:-translate-y-1">Reservar Ahora</a>
      </div>
    </header>
  </main>
`;
