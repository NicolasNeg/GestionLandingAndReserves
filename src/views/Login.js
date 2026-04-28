import { auth, googleProvider, facebookProvider, appleProvider } from '../firebase-config.js';
import { 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendEmailVerification, 
    signOut 
} from 'firebase/auth';
import { navigateTo } from '../router.js';
import { getUserProfile, upsertUser } from '../dataconnect-generated';

const Login = {
    render: () => `
        <div class="h-full flex items-center justify-center bg-gray-50 p-4 pt-12 pb-12">
            <div class="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div class="p-8">
                    <h2 class="text-3xl font-black text-center text-gray-800 mb-2">Bienvenido</h2>
                    <p class="text-center text-gray-500 mb-8" id="form-subtitle">Inicia sesión en tu cuenta</p>
                    
                    <div id="error-message" class="hidden mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center"></div>
                    <div id="success-message" class="hidden mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm text-center"></div>

                    <form id="auth-form" class="space-y-4">
                        <div id="name-field" class="hidden">
                            <label class="block text-gray-700 text-sm font-bold mb-1">Nombre Completo</label>
                            <input type="text" id="name" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition" placeholder="Juan Pérez">
                        </div>
                        <div>
                            <label class="block text-gray-700 text-sm font-bold mb-1">Correo Electrónico</label>
                            <input type="email" id="email" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition" placeholder="correo@ejemplo.com">
                        </div>
                        <div>
                            <label class="block text-gray-700 text-sm font-bold mb-1">Contraseña</label>
                            <input type="password" id="password" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition" placeholder="********">
                        </div>
                        <button type="submit" id="btn-submit" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg mt-2">Entrar</button>
                    </form>

                    <div class="mt-6 flex items-center justify-center">
                        <span class="text-gray-500 text-sm" id="toggle-text">¿No tienes cuenta?</span>
                        <button id="btn-toggle-mode" class="text-blue-600 font-bold ml-2 hover:underline text-sm focus:outline-none">Regístrate</button>
                    </div>

                    <div class="mt-8">
                        <div class="relative">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-gray-200"></div>
                            </div>
                            <div class="relative flex justify-center text-sm">
                                <span class="px-2 bg-white text-gray-500">O continúa con</span>
                            </div>
                        </div>

                        <div class="mt-6 grid grid-cols-3 gap-3">
                            <button id="btn-google" class="flex justify-center items-center py-2 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" class="h-6 w-6">
                            </button>
                            <button id="btn-facebook" class="flex justify-center items-center py-2 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="Facebook" class="h-6 w-6">
                            </button>
                            <button id="btn-apple" class="flex justify-center items-center py-2 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                <i class="fab fa-apple text-xl text-black"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    mount: () => {
        let isRegistering = false;

        const form = document.getElementById('auth-form');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const nameInput = document.getElementById('name');
        
        const nameField = document.getElementById('name-field');
        const btnSubmit = document.getElementById('btn-submit');
        const toggleText = document.getElementById('toggle-text');
        const btnToggleMode = document.getElementById('btn-toggle-mode');
        const formSubtitle = document.getElementById('form-subtitle');
        const errorMsg = document.getElementById('error-message');
        const successMsg = document.getElementById('success-message');

        const showError = (msg) => {
            errorMsg.textContent = msg;
            errorMsg.classList.remove('hidden');
            successMsg.classList.add('hidden');
        };

        const showSuccess = (msg) => {
            successMsg.textContent = msg;
            successMsg.classList.remove('hidden');
            errorMsg.classList.add('hidden');
        };

        const toggleMode = () => {
            isRegistering = !isRegistering;
            if (isRegistering) {
                nameField.classList.remove('hidden');
                nameInput.required = true;
                btnSubmit.textContent = 'Crear Cuenta';
                formSubtitle.textContent = 'Crea una cuenta para obtener beneficios';
                toggleText.textContent = '¿Ya tienes cuenta?';
                btnToggleMode.textContent = 'Inicia sesión';
            } else {
                nameField.classList.add('hidden');
                nameInput.required = false;
                btnSubmit.textContent = 'Entrar';
                formSubtitle.textContent = 'Inicia sesión en tu cuenta';
                toggleText.textContent = '¿No tienes cuenta?';
                btnToggleMode.textContent = 'Regístrate';
            }
            errorMsg.classList.add('hidden');
            successMsg.classList.add('hidden');
        };

        btnToggleMode.addEventListener('click', toggleMode);

        const syncUserToDataConnect = async (user, displayName) => {
            try {
                // Verificar si el usuario ya existe para no sobrescribir su rol
                const profileRes = await getUserProfile({ id: user.uid });
                if (!profileRes.data || !profileRes.data.user) {
                    // Es un usuario nuevo, lo registramos como cliente
                    await upsertUser({
                        id: user.uid,
                        email: user.email,
                        nombre: displayName || user.displayName || 'Usuario',
                        rol: 'cliente'
                    });
                }
            } catch (err) {
                console.error("Error sincronizando Data Connect:", err);
            }
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Procesando...";
            errorMsg.classList.add('hidden');
            successMsg.classList.add('hidden');

            try {
                if (isRegistering) {
                    const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
                    await sendEmailVerification(userCredential.user);
                    
                    // Sincronizar pre-verificación (opcional) o dejarlo para el login
                    await syncUserToDataConnect(userCredential.user, nameInput.value);
                    
                    await signOut(auth); // Forzar que no entre hasta que verifique
                    
                    showSuccess("¡Cuenta creada! Hemos enviado un enlace de verificación a tu correo. Por favor, verifícalo antes de iniciar sesión.");
                    toggleMode(); // Cambiar a login
                } else {
                    const userCredential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
                    
                    if (!userCredential.user.emailVerified) {
                        await signOut(auth);
                        throw new Error("Por favor, verifica tu correo electrónico antes de continuar. Revisa tu bandeja de entrada o spam.");
                    }

                    await syncUserToDataConnect(userCredential.user, userCredential.user.displayName);
                    navigateTo('/cliente/dashboard');
                }
            } catch (error) {
                showError(error.message.replace('Firebase: ', ''));
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = isRegistering ? 'Crear Cuenta' : 'Entrar';
            }
        });

        const handleSSO = async (provider) => {
            try {
                const result = await signInWithPopup(auth, provider);
                await syncUserToDataConnect(result.user, result.user.displayName);
                navigateTo('/cliente/dashboard');
            } catch (error) {
                showError(error.message.replace('Firebase: ', ''));
            }
        };

        document.getElementById('btn-google').addEventListener('click', () => handleSSO(googleProvider));
        document.getElementById('btn-facebook').addEventListener('click', () => handleSSO(facebookProvider));
        document.getElementById('btn-apple').addEventListener('click', () => handleSSO(appleProvider));
    }
};

export default Login;
