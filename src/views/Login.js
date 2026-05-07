import { navigateTo } from '../router.js';
import {
  signInWithGoogle,
  signInWithFacebook,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
  logout,
  normalizeAuthUser,
  resendEmailVerification
} from '../lib/authProvider.js';
import { mergeUserProfileFromAuth } from '../lib/supabaseData.js';
import { supabase } from '../supabase/client.js';
import { getUserAccess } from '../lib/accessControl.js';
import { resolvePostLoginPath } from '../lib/postLoginRoute.js';

function profilePayloadFromSupabaseUser(su) {
  if (!su) return null;
  const meta = su.user_metadata || {};
  return {
    uid: su.id,
    id: su.id,
    email: su.email ?? '',
    displayName: meta.full_name || meta.name || '',
    photoURL: meta.avatar_url || '',
    emailVerified: !!su.email_confirmed_at
  };
}

const Login = {
  render: () => `
        <div class="balneario-page-bg flex min-h-full items-center justify-center p-4 pt-12 pb-12">
            <div class="login-card max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div class="p-8">
                    <h2 class="text-3xl font-black text-center text-gray-800 mb-2">Bienvenido</h2>
                    <p class="text-center text-gray-500 mb-8" id="form-subtitle">Inicia sesión en tu cuenta</p>
                    
                    <div id="error-message" class="hidden mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center"></div>
                    <div id="success-message" class="hidden mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm text-center"></div>

                    <div id="login-main-flow">
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
                            <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                                <label class="block text-gray-700 text-sm font-bold">Contraseña</label>
                                <button type="button" id="btn-forgot-password" class="hidden text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded">¿Olvidaste tu contraseña?</button>
                            </div>
                            <div class="relative">
                                <input type="password" id="password" required autocomplete="current-password" class="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition" placeholder="********">
                                <button type="button" id="btn-toggle-password" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" aria-label="Mostrar contraseña" title="Mostrar contraseña">
                                    <span id="icon-password-masked" class="block" aria-hidden="true">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </span>
                                    <span id="icon-password-visible" class="hidden" aria-hidden="true">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                    </span>
                                </button>
                            </div>
                        </div>
                        <button type="submit" id="btn-submit" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg mt-2">Entrar</button>
                    </form>

                    <div id="resend-verification-wrap" class="hidden mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <p class="font-semibold mb-2">¿No llegó el correo o está en spam?</p>
                        <p class="mb-3 text-amber-800">Deja el mismo correo arriba y pulsa reenviar; Supabase envía un <strong>enlace</strong> de confirmación.</p>
                        <button type="button" id="btn-resend-verification" class="w-full rounded-lg bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700">Reenviar correo de verificación</button>
                    </div>

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

                        <div class="mt-6 grid grid-cols-2 gap-3">
                            <button id="btn-google" class="flex justify-center items-center py-2 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" class="h-6 w-6">
                            </button>
                            <button id="btn-facebook" class="flex justify-center items-center py-2 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="Facebook" class="h-6 w-6">
                            </button>
                        </div>
                    </div>
                    </div>

                    <div id="reset-password-panel" class="hidden space-y-4">
                        <h3 class="text-lg font-bold text-gray-800">Nueva contraseña</h3>
                        <p class="text-sm text-gray-600">Escribe tu nueva contraseña dos veces para confirmarla.</p>
                        <div>
                            <label class="mb-1 block text-sm font-bold text-gray-700">Nueva contraseña</label>
                            <div class="relative">
                                <input type="password" id="reset-pass" autocomplete="new-password" class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 transition focus:border-blue-500 focus:bg-white focus:outline-none" placeholder="Mínimo 6 caracteres">
                                <button type="button" id="btn-toggle-reset-pass" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" aria-label="Mostrar contraseña">
                                    <span id="icon-reset-a-masked" class="block" aria-hidden="true">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </span>
                                    <span id="icon-reset-a-visible" class="hidden" aria-hidden="true">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                    </span>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-bold text-gray-700">Confirmar contraseña</label>
                            <div class="relative">
                                <input type="password" id="reset-pass-confirm" autocomplete="new-password" class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 transition focus:border-blue-500 focus:bg-white focus:outline-none" placeholder="Repite la contraseña">
                                <button type="button" id="btn-toggle-reset-confirm" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" aria-label="Mostrar contraseña">
                                    <span id="icon-reset-b-masked" class="block" aria-hidden="true">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </span>
                                    <span id="icon-reset-b-visible" class="hidden" aria-hidden="true">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                    </span>
                                </button>
                            </div>
                        </div>
                        <button type="button" id="btn-submit-reset" class="w-full rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg transition hover:bg-blue-700">Guardar contraseña</button>
                        <button type="button" id="btn-cancel-reset" class="w-full text-sm font-semibold text-blue-600 hover:underline">Volver al inicio de sesión</button>
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
    const resendWrap = document.getElementById('resend-verification-wrap');
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    const btnTogglePassword = document.getElementById('btn-toggle-password');
    const iconPwdMasked = document.getElementById('icon-password-masked');
    const iconPwdVisible = document.getElementById('icon-password-visible');
    const loginMainFlow = document.getElementById('login-main-flow');
    const resetPanel = document.getElementById('reset-password-panel');
    const resetPassInput = document.getElementById('reset-pass');
    const resetConfirmInput = document.getElementById('reset-pass-confirm');

    const bindPasswordToggle = (inputEl, btnEl, iconMaskedEl, iconVisibleEl) => {
      if (!inputEl || !btnEl) return;
      let shown = false;
      btnEl.addEventListener('click', () => {
        shown = !shown;
        inputEl.type = shown ? 'text' : 'password';
        iconMaskedEl?.classList.toggle('hidden', shown);
        iconVisibleEl?.classList.toggle('hidden', !shown);
        const lab = shown ? 'Ocultar contraseña' : 'Mostrar contraseña';
        btnEl.setAttribute('aria-label', lab);
        btnEl.setAttribute('title', lab);
      });
    };

    let passwordShown = false;
    const syncPasswordToggleUi = () => {
      passwordInput.type = passwordShown ? 'text' : 'password';
      iconPwdMasked?.classList.toggle('hidden', passwordShown);
      iconPwdVisible?.classList.toggle('hidden', !passwordShown);
      const label = passwordShown ? 'Ocultar contraseña' : 'Mostrar contraseña';
      btnTogglePassword?.setAttribute('aria-label', label);
      btnTogglePassword?.setAttribute('title', label);
    };

    btnTogglePassword?.addEventListener('click', () => {
      passwordShown = !passwordShown;
      syncPasswordToggleUi();
    });

    bindPasswordToggle(
      resetPassInput,
      document.getElementById('btn-toggle-reset-pass'),
      document.getElementById('icon-reset-a-masked'),
      document.getElementById('icon-reset-a-visible')
    );
    bindPasswordToggle(
      resetConfirmInput,
      document.getElementById('btn-toggle-reset-confirm'),
      document.getElementById('icon-reset-b-masked'),
      document.getElementById('icon-reset-b-visible')
    );

    const showError = (msg) => {
      errorMsg.textContent = msg;
      errorMsg.classList.remove('hidden');
      successMsg.classList.add('hidden');
      if (resendWrap && !msg.includes('verifica') && !msg.includes('Verifica')) resendWrap.classList.add('hidden');
    };

    const showSuccess = (msg) => {
      successMsg.textContent = msg;
      successMsg.classList.remove('hidden');
      errorMsg.classList.add('hidden');
      if (resendWrap) resendWrap.classList.add('hidden');
    };

    const friendlyAuthMessage = (err) => {
      const code = String(err?.code || '').toLowerCase();
      const raw = String(err?.message || err || '');
      const low = raw.toLowerCase();
      if (code === 'email_not_confirmed') {
        return 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja y spam.';
      }
      if (code === 'invalid_credentials') {
        return 'Correo o contraseña incorrectos (o el usuario no existe).';
      }
      if (code === 'oauth_only') {
        return 'Esa cuenta se creó con proveedor social. Inicia con Google/Facebook.';
      }
      if (code === 'email_provider_disabled') {
        return 'Email/contraseña está deshabilitado en Supabase (Auth > Providers > Email).';
      }
      if (low.includes('network') || low.includes('fetch')) {
        return 'Error de red. Comprueba tu conexión e inténtalo de nuevo.';
      }
      if (low.includes('invalid login') || low.includes('invalid_credentials') || low.includes('wrong password')) {
        return 'Correo o contraseña incorrectos (o el usuario no existe).';
      }
      if (low.includes('email not confirmed')) {
        return 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja y spam.';
      }
      if (low.includes('email provider is disabled') || low.includes('provider disabled')) {
        return 'Email/contraseña está deshabilitado en Supabase (Auth > Providers > Email).';
      }
      return raw.replace(/^Supabase:\s*/i, '').replace(/^AuthApiError:\s*/i, '') || 'No se pudo completar la acción.';
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
        btnForgotPassword?.classList.add('hidden');
      } else {
        nameField.classList.add('hidden');
        nameInput.required = false;
        btnSubmit.textContent = 'Entrar';
        formSubtitle.textContent = 'Inicia sesión en tu cuenta';
        toggleText.textContent = '¿No tienes cuenta?';
        btnToggleMode.textContent = 'Regístrate';
        btnForgotPassword?.classList.remove('hidden');
      }
      errorMsg.classList.add('hidden');
      successMsg.classList.add('hidden');
      if (resendWrap) resendWrap.classList.add('hidden');
    };

    btnForgotPassword?.classList.remove('hidden');

    btnToggleMode.addEventListener('click', toggleMode);

    const showLoginFlow = () => {
      loginMainFlow?.classList.remove('hidden');
      resetPanel?.classList.add('hidden');
      if (resetPassInput) resetPassInput.value = '';
      if (resetConfirmInput) resetConfirmInput.value = '';
      formSubtitle.textContent = isRegistering
        ? 'Crea una cuenta para obtener beneficios'
        : 'Inicia sesión en tu cuenta';
    };

    document.getElementById('btn-cancel-reset')?.addEventListener('click', () => {
      showLoginFlow();
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
    });

    document.getElementById('btn-submit-reset')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-submit-reset');
      const p1 = resetPassInput?.value || '';
      const p2 = resetConfirmInput?.value || '';
      if (p1.length < 6) {
        showError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (p1 !== p2) {
        showError('Las contraseñas no coinciden.');
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Guardando...';
      errorMsg.classList.add('hidden');
      successMsg.classList.add('hidden');
      try {
        const { error } = await supabase.auth.updateUser({ password: p1 });
        if (error) throw error;
        showSuccess('Contraseña actualizada. Ya puedes iniciar sesión.');
        showLoginFlow();
      } catch (err) {
        console.error(err);
        showError(friendlyAuthMessage(err) || 'No se pudo actualizar la contraseña. Usa el enlace del correo de recuperación.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar contraseña';
      }
    });

    const afterLoginProfileSync = async (userLike) => {
      if (!userLike) return;
      try {
        await mergeUserProfileFromAuth(userLike);
      } catch (e) {
        console.warn('[perfil]', e?.message || e);
      }
    };

    (async () => {
      const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
      const authType = hashParams.get('type');
      if (hashParams.get('type') === 'recovery') {
        loginMainFlow?.classList.add('hidden');
        resetPanel?.classList.remove('hidden');
        formSubtitle.textContent = 'Establece una nueva contraseña';
        return;
      }
      const params = new URLSearchParams(window.location.search);
      if (authType === 'signup' || params.get('verified') === '1') {
        showSuccess('Correo confirmado correctamente. Ya puedes iniciar sesión.');
        window.history.replaceState({}, '', window.location.pathname);
      }
    })();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Procesando...';
      errorMsg.classList.add('hidden');
      successMsg.classList.add('hidden');

      try {
        if (isRegistering) {
          const data = await signUpWithEmail(emailInput.value, passwordInput.value, {
            nombre: nameInput.value
          });
          const su = data?.user;
          if (data?.session && su) {
            const payload = profilePayloadFromSupabaseUser(su);
            await afterLoginProfileSync(payload);
            const access = await getUserAccess(payload);
            navigateTo(resolvePostLoginPath(access));
          } else {
            showSuccess(
              'Te enviamos un correo de confirmación. Revisa tu bandeja antes de iniciar sesión.'
            );
            toggleMode();
          }
        } else {
          const result = await signInWithEmail(emailInput.value, passwordInput.value);
          const su = result?.user;
          if (!su) {
            throw new Error('No se pudo iniciar sesión. Intenta de nuevo.');
          }
          const payload = profilePayloadFromSupabaseUser(su);
          const norm = normalizeAuthUser(payload);
          if (norm && !norm.emailVerified) {
            await logout();
            if (resendWrap) resendWrap.classList.remove('hidden');
            throw new Error(
              'Por favor, confirma tu correo electrónico antes de continuar (revisa spam).'
            );
          }
          await afterLoginProfileSync(payload);
          const access = await getUserAccess(payload);
          navigateTo(resolvePostLoginPath(access));
        }
      } catch (error) {
        showError(friendlyAuthMessage(error));
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = isRegistering ? 'Crear Cuenta' : 'Entrar';
      }
    });

    const handleSSO = async (which) => {
      try {
        if (which === 'google') await signInWithGoogle();
        else await signInWithFacebook();
      } catch (error) {
        showError(friendlyAuthMessage(error));
      }
    };

    document.getElementById('btn-google').addEventListener('click', () => handleSSO('google'));
    document.getElementById('btn-facebook').addEventListener('click', () => handleSSO('facebook'));

    btnForgotPassword?.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) {
        showError('Escribe tu correo electrónico arriba y vuelve a pulsar «¿Olvidaste tu contraseña?».');
        emailInput.focus();
        return;
      }
      btnForgotPassword.disabled = true;
      errorMsg.classList.add('hidden');
      successMsg.classList.add('hidden');
      try {
        await sendPasswordReset(email);
        showSuccess('Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña (revisa spam).');
      } catch (err) {
        showError(friendlyAuthMessage(err));
      } finally {
        btnForgotPassword.disabled = false;
      }
    });

    document.getElementById('btn-resend-verification')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-resend-verification');
      const email = emailInput.value.trim();
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      errorMsg.classList.add('hidden');
      successMsg.classList.add('hidden');
      try {
        await resendEmailVerification({ email });
        showSuccess('Si el correo es válido, se ha enviado un nuevo enlace de verificación.');
        if (resendWrap) resendWrap.classList.add('hidden');
      } catch (err) {
        showError(friendlyAuthMessage(err));
      } finally {
        btn.disabled = false;
        btn.textContent = 'Reenviar correo de verificación';
      }
    });
  }
};

export default Login;
