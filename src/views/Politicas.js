const Politicas = {
    render: () => `
        <div class="max-w-4xl mx-auto p-8 pt-12 pb-20">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h1 class="text-3xl font-black text-gray-800 mb-6">Política de Privacidad y Términos de Servicio</h1>
                <p class="text-gray-500 mb-8">Última actualización: 28 de Abril de 2026</p>

                <div class="space-y-6 text-gray-700 leading-relaxed">
                    <section>
                        <h2 class="text-xl font-bold text-gray-800 mb-3">1. Recopilación de Información</h2>
                        <p>En <strong>Balneario San Antonio</strong> recopilamos información personal básica como tu nombre, dirección de correo electrónico y foto de perfil cuando decides registrarte o iniciar sesión utilizando servicios de terceros como Facebook o Google. Esta información se utiliza exclusivamente para crear y gestionar tu cuenta de reservas en nuestra plataforma.</p>
                    </section>

                    <section>
                        <h2 class="text-xl font-bold text-gray-800 mb-3">2. Uso de la Información</h2>
                        <p>La información recopilada se utiliza para:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-1">
                            <li>Vincular tus compras y reservas a tu perfil personal.</li>
                            <li>Enviarte tus tickets de acceso (códigos QR) por correo.</li>
                            <li>Proporcionarte soporte al cliente.</li>
                            <li>Personalizar tu experiencia dentro del balneario.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 class="text-xl font-bold text-gray-800 mb-3">3. Eliminación de Datos de Usuario</h2>
                        <p>Si has iniciado sesión utilizando Facebook u otra red social y deseas eliminar tus datos de nuestra base de datos, puedes solicitar la eliminación permanente enviando un correo electrónico a <strong>diosnegrura@gmail.com</strong> con el asunto "Solicitud de Eliminación de Datos". Procesaremos tu solicitud en un plazo de 48 horas, eliminando tu cuenta y todos los tickets asociados.</p>
                    </section>

                    <section>
                        <h2 class="text-xl font-bold text-gray-800 mb-3">4. Protección de Datos</h2>
                        <p>No vendemos, alquilamos ni compartimos tu información personal con terceros. Tus datos están protegidos y almacenados de forma segura mediante los servicios de infraestructura en la nube de Google Firebase.</p>
                    </section>

                    <section>
                        <h2 class="text-xl font-bold text-gray-800 mb-3">5. Condiciones del Servicio</h2>
                        <p>Al utilizar este sitio web para realizar reservas, aceptas que todos los pagos realizados para tickets de entrada o apartados de mesas/cabañas están sujetos a la disponibilidad y a las políticas de reembolso del balneario, las cuales pueden ser consultadas físicamente en taquilla.</p>
                    </section>
                </div>

                <div class="mt-10 border-t pt-6 text-center">
                    <a href="/home" data-link class="text-blue-600 font-bold hover:underline">Volver al Inicio</a>
                </div>
            </div>
        </div>
    `
};

export default Politicas;
