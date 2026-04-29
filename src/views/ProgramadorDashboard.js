import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase-config.js';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, getUserAccess, labelRole, normalizeRole } from '../lib/accessControl.js';
import { icon } from '../lib/icons.js';
import { DEFAULT_THEME, applyTheme, readThemeConfig } from '../lib/theme.js';
import { refreshAppTheme } from '../lib/layout.js';
import { publishAppUpdate } from '../lib/realtimeSync.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function permissionChecks(name, selected = []) {
  const selectedSet = new Set(selected);
  return PERMISSIONS.map((permission) => `
    <label class="programador-permission">
      <input type="checkbox" name="${name}" value="${permission.key}" ${selectedSet.has(permission.key) ? 'checked' : ''} />
      <span>${escapeHtml(permission.label)}</span>
      <code>${escapeHtml(permission.key)}</code>
    </label>
  `).join('');
}

function readChecked(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function setChecked(name, permissions) {
  const selected = new Set(permissions || []);
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function initials(name, email) {
  const source = String(name || email || 'U').trim();
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U';
}

const ProgramadorDashboard = {
  render: async () => {
    const access = await getUserAccess(auth.currentUser);
    const avatar = access.photoURL
      ? `<img src="${escapeHtml(access.photoURL)}" alt="${escapeHtml(access.name)}" class="h-10 w-10 rounded-full object-cover" referrerpolicy="no-referrer" />`
      : `<span class="app-avatar-initials h-10 w-10">${escapeHtml(access.name.slice(0, 1).toUpperCase())}</span>`;
    return `
      <div class="programador-shell">
        <aside id="programador-sidebar" class="programador-sidebar">
          <div class="programador-sidebar-head">
            <div>
              <p class="programador-kicker">Programador</p>
              <h1 class="programador-title">Dashboard</h1>
            </div>
            <button type="button" id="programador-collapse" class="sidebar-icon-button" title="Contraer menu" aria-label="Contraer menu">
              ${icon('collapse', 'h-5 w-5')}
            </button>
          </div>
          <nav class="programador-nav" aria-label="Secciones programador">
            <button type="button" class="programador-nav-item is-active" data-programador-section="theme" title="Paleta">
              ${icon('palette', 'h-5 w-5')}
              <span>Paleta</span>
            </button>
            <button type="button" class="programador-nav-item" data-programador-section="roles" title="Roles">
              ${icon('shield', 'h-5 w-5')}
              <span>Roles</span>
            </button>
            <button type="button" class="programador-nav-item" data-programador-section="users" title="Usuarios">
              ${icon('users', 'h-5 w-5')}
              <span>Usuarios</span>
            </button>
          </nav>
          <div class="programador-sidebar-footer">
            ${avatar}
            <div class="min-w-0">
              <p class="truncate text-sm font-bold">${escapeHtml(access.name)}</p>
              <p class="truncate text-xs text-slate-500">${escapeHtml(access.roleLabel)}</p>
            </div>
          </div>
        </aside>

        <main class="programador-main">
          <section id="programador-theme" class="programador-panel">
            <div class="programador-panel-heading">
              <div>
                <p class="programador-kicker">Sistema visual</p>
                <h2>Paleta global</h2>
              </div>
              <span class="programador-chip">${icon('palette', 'h-4 w-4')} Tema</span>
            </div>
            <div class="programador-grid">
              ${[
                ['primary', 'Primario'],
                ['primaryDark', 'Primario oscuro'],
                ['accent', 'Acento'],
                ['surface', 'Superficie'],
                ['text', 'Texto']
              ].map(([key, label]) => `
                <label class="programador-color-field">
                  <span>${label}</span>
                  <input type="color" id="theme-${key}" value="${DEFAULT_THEME[key]}" />
                  <code id="theme-${key}-value">${DEFAULT_THEME[key]}</code>
                </label>
              `).join('')}
            </div>
            <label class="programador-field mt-6">
              <span>Promociones del header</span>
              <textarea id="theme-promo" rows="3"></textarea>
            </label>
            <div class="programador-actions">
              <button type="button" id="theme-save" class="programador-primary-btn">
                ${icon('palette', 'h-4 w-4')}
                Guardar paleta
              </button>
              <p id="theme-msg" class="programador-msg"></p>
            </div>
          </section>

          <section id="programador-roles" class="programador-panel hidden">
            <div class="programador-panel-heading">
              <div>
                <p class="programador-kicker">Autorizacion</p>
                <h2>Roles y permisos</h2>
              </div>
              <span class="programador-chip">${icon('shield', 'h-4 w-4')} Roles</span>
            </div>
            <div class="programador-two-cols">
              <div class="programador-form-card">
                <label class="programador-field">
                  <span>ID del rol</span>
                  <input id="role-id" type="text" placeholder="supervisor" />
                </label>
                <label class="programador-field">
                  <span>Nombre visible</span>
                  <input id="role-name" type="text" placeholder="Supervisor" />
                </label>
                <div class="programador-permission-grid" id="role-permissions">
                  ${permissionChecks('role-permission')}
                </div>
                <button type="button" id="role-save" class="programador-primary-btn">
                  ${icon('shield', 'h-4 w-4')}
                  Guardar rol
                </button>
                <p id="role-msg" class="programador-msg"></p>
              </div>
              <div class="programador-list-card">
                <div class="programador-list-head">
                  <h3>Roles registrados</h3>
                  <button type="button" id="roles-refresh" class="programador-secondary-btn">${icon('scan', 'h-4 w-4')} Actualizar</button>
                </div>
                <div id="roles-list" class="programador-list">
                  <p class="text-sm text-slate-500">Cargando...</p>
                </div>
              </div>
            </div>
          </section>

          <section id="programador-users" class="programador-panel hidden">
            <div class="programador-panel-heading">
              <div>
                <p class="programador-kicker">Usuarios</p>
                <h2>Panel de usuarios</h2>
              </div>
              <span class="programador-chip">${icon('users', 'h-4 w-4')} Programador</span>
            </div>
            <div class="programador-two-cols programador-users-layout">
              <div class="programador-list-card">
                <div class="programador-list-head">
                  <h3>Usuarios registrados</h3>
                  <button type="button" id="users-refresh" class="programador-secondary-btn">${icon('scan', 'h-4 w-4')} Actualizar</button>
                </div>
                <label class="programador-field mt-4">
                  <span>Buscar</span>
                  <input id="users-search" type="search" placeholder="Nombre, correo o UID" />
                </label>
                <div id="users-list" class="programador-list">
                  <p class="text-sm text-slate-500">Cargando...</p>
                </div>
              </div>
              <div class="programador-form-card">
                <div class="programador-selected-user">
                  <span id="selected-user-avatar" class="app-avatar-initials h-12 w-12">--</span>
                  <div class="min-w-0">
                    <p id="selected-user-name" class="truncate font-black text-slate-900">Selecciona un usuario</p>
                    <p id="selected-user-email" class="truncate text-sm text-slate-500">---</p>
                  </div>
                </div>
                <label class="programador-field mt-4">
                  <span>UID</span>
                  <input id="permission-user-id" type="text" placeholder="Firebase UID" />
                </label>
                <label class="programador-field mt-4">
                  <span>Rol</span>
                  <input id="permission-user-role" type="text" list="programador-role-options" placeholder="cliente, trabajador, jefe, programador o rol nuevo" />
                  <datalist id="programador-role-options"></datalist>
                </label>
                <div class="programador-permission-grid mt-4">
                  ${permissionChecks('user-permission')}
                </div>
                <div class="programador-actions">
                  <button type="button" id="permission-load" class="programador-secondary-btn">
                    ${icon('scan', 'h-4 w-4')}
                    Cargar por UID
                  </button>
                  <button type="button" id="permission-save" class="programador-primary-btn">
                    ${icon('key', 'h-4 w-4')}
                    Guardar usuario
                  </button>
                  <p id="permission-msg" class="programador-msg"></p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;
  },

  mount: async () => {
    const access = await getUserAccess(auth.currentUser);
    if (!access.isProgramador) {
      document.getElementById('app').innerHTML = `
        <div class="mx-auto max-w-xl p-8 text-center">
          <h1 class="text-2xl font-black text-slate-900">Acceso denegado</h1>
          <p class="mt-2 text-slate-600">Esta ruta es exclusiva del rol programador.</p>
        </div>
      `;
      return;
    }

    const sidebar = document.getElementById('programador-sidebar');
    const collapse = document.getElementById('programador-collapse');
    const setCollapsed = (collapsed) => {
      sidebar?.classList.toggle('is-collapsed', collapsed);
      if (collapse) {
        collapse.innerHTML = icon(collapsed ? 'expand' : 'collapse', 'h-5 w-5');
        collapse.title = collapsed ? 'Expandir menu' : 'Contraer menu';
      }
      localStorage.setItem('programador-sidebar-collapsed', collapsed ? '1' : '0');
    };
    setCollapsed(localStorage.getItem('programador-sidebar-collapsed') === '1');
    collapse?.addEventListener('click', () => setCollapsed(!sidebar?.classList.contains('is-collapsed')));

    const showSection = (section) => {
      ['theme', 'roles', 'users'].forEach((name) => {
        document.getElementById(`programador-${name}`)?.classList.toggle('hidden', name !== section);
      });
      document.querySelectorAll('[data-programador-section]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.getAttribute('data-programador-section') === section);
      });
      window.history.replaceState(null, '', `/programador/${section}`);
    };

    document.querySelectorAll('[data-programador-section]').forEach((btn) => {
      btn.addEventListener('click', () => showSection(btn.getAttribute('data-programador-section') || 'theme'));
    });
    const initialSection = window.location.pathname.split('/')[2] || 'theme';
    showSection(['theme', 'roles', 'users'].includes(initialSection) ? initialSection : 'theme');

    const theme = await readThemeConfig();
    Object.entries(theme).forEach(([key, value]) => {
      const input = document.getElementById(`theme-${key}`);
      const code = document.getElementById(`theme-${key}-value`);
      if (input && input.type === 'color') input.value = value;
      if (code) code.textContent = value;
    });
    const promo = document.getElementById('theme-promo');
    if (promo) promo.value = theme.promoText;

    document.querySelectorAll('input[type="color"][id^="theme-"]').forEach((input) => {
      input.addEventListener('input', () => {
        const code = document.getElementById(`${input.id}-value`);
        if (code) code.textContent = input.value;
      });
    });

    document.getElementById('theme-save')?.addEventListener('click', async () => {
      const msg = document.getElementById('theme-msg');
      const payload = {
        primary: document.getElementById('theme-primary')?.value || DEFAULT_THEME.primary,
        primaryDark: document.getElementById('theme-primaryDark')?.value || DEFAULT_THEME.primaryDark,
        accent: document.getElementById('theme-accent')?.value || DEFAULT_THEME.accent,
        surface: document.getElementById('theme-surface')?.value || DEFAULT_THEME.surface,
        text: document.getElementById('theme-text')?.value || DEFAULT_THEME.text,
        promoText: document.getElementById('theme-promo')?.value || DEFAULT_THEME.promoText,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || null
      };
      if (msg) msg.textContent = 'Guardando...';
      try {
        await setDoc(doc(db, 'appConfig', 'theme'), payload, { merge: true });
        const applied = applyTheme(payload);
        refreshAppTheme(applied);
        await publishAppUpdate('theme', 'Paleta actualizada');
        if (msg) msg.textContent = 'Paleta guardada.';
      } catch (error) {
        console.error(error);
        if (msg) msg.textContent = 'No se pudo guardar.';
      }
    });

    let rolesCache = Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([id, permissions]) => ({
      id,
      name: labelRole(id),
      permissions
    }));
    let usersCache = [];

    const renderRoleOptions = () => {
      const list = document.getElementById('programador-role-options');
      if (!list) return;
      list.innerHTML = rolesCache
        .map((role) => `<option value="${escapeHtml(role.id)}">${escapeHtml(role.name || labelRole(role.id))}</option>`)
        .join('');
    };

    const renderRoles = async () => {
      const list = document.getElementById('roles-list');
      if (!list) return;
      list.innerHTML = '<p class="text-sm text-slate-500">Cargando...</p>';
      try {
        const snaps = await getDocs(collection(db, 'roles'));
        const custom = snaps.docs.map((snap) => ({ id: snap.id, ...snap.data(), custom: true }));
        const defaults = Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([id, permissions]) => ({
          id,
          name: labelRole(id),
          permissions,
          custom: false
        }));
        const merged = [...defaults, ...custom.filter((role) => !DEFAULT_ROLE_PERMISSIONS[role.id])];
        rolesCache = merged;
        renderRoleOptions();
        list.innerHTML = merged.map((role) => {
          const permissions = Array.isArray(role.permissions) ? role.permissions : [];
          return `
            <article class="programador-role-row">
              <div class="min-w-0">
                <p class="truncate font-bold text-slate-900">${escapeHtml(role.name || labelRole(role.id))}</p>
                <p class="truncate text-xs text-slate-500">${escapeHtml(role.id)} - ${permissions.length} permisos</p>
              </div>
              <button type="button" class="programador-secondary-btn" data-role-edit="${escapeHtml(role.id)}" data-role-name="${escapeHtml(role.name || labelRole(role.id))}" data-role-permissions="${escapeHtml(JSON.stringify(permissions))}">
                Editar
              </button>
            </article>
          `;
        }).join('');
        list.querySelectorAll('[data-role-edit]').forEach((btn) => {
          btn.addEventListener('click', () => {
            document.getElementById('role-id').value = btn.getAttribute('data-role-edit') || '';
            document.getElementById('role-name').value = btn.getAttribute('data-role-name') || '';
            try {
              setChecked('role-permission', JSON.parse(btn.getAttribute('data-role-permissions') || '[]'));
            } catch {
              setChecked('role-permission', []);
            }
          });
        });
      } catch (error) {
        console.error(error);
        list.innerHTML = '<p class="text-sm text-rose-600">No se pudieron cargar los roles.</p>';
      }
    };

    document.getElementById('roles-refresh')?.addEventListener('click', renderRoles);
    document.getElementById('role-save')?.addEventListener('click', async () => {
      const msg = document.getElementById('role-msg');
      const roleId = normalizeRole(document.getElementById('role-id')?.value || '');
      const roleName = document.getElementById('role-name')?.value?.trim() || labelRole(roleId);
      if (!roleId) {
        if (msg) msg.textContent = 'Escribe un ID de rol.';
        return;
      }
      const payload = {
        name: roleName,
        permissions: readChecked('role-permission'),
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || null
      };
      if (msg) msg.textContent = 'Guardando...';
      try {
        await setDoc(doc(db, 'roles', roleId), payload, { merge: true });
        await publishAppUpdate('roles', `Rol ${roleId} actualizado`);
        if (msg) msg.textContent = 'Rol guardado.';
        await renderRoles();
      } catch (error) {
        console.error(error);
        if (msg) msg.textContent = 'No se pudo guardar el rol.';
      }
    });
    await renderRoles();
    renderRoleOptions();

    const setSelectedUserUi = (userId, data = {}, directPermissions = []) => {
      const name = data.nombre || data.name || 'Usuario';
      const email = data.email || '';
      const avatar = document.getElementById('selected-user-avatar');
      const nameEl = document.getElementById('selected-user-name');
      const emailEl = document.getElementById('selected-user-email');
      const uidInput = document.getElementById('permission-user-id');
      const roleInput = document.getElementById('permission-user-role');
      if (avatar) avatar.textContent = initials(name, email);
      if (nameEl) nameEl.textContent = name;
      if (emailEl) emailEl.textContent = email || userId;
      if (uidInput) uidInput.value = userId;
      if (roleInput) roleInput.value = normalizeRole(data.rol || 'cliente');
      setChecked('user-permission', directPermissions);
    };

    const loadUserForEdit = async (uid) => {
      const msg = document.getElementById('permission-msg');
      if (!uid) {
        if (msg) msg.textContent = 'Escribe o selecciona un UID.';
        return;
      }
      if (msg) msg.textContent = 'Cargando usuario...';
      try {
        const [userSnap, permissionSnap] = await Promise.all([
          getDoc(doc(db, 'users', uid)),
          getDoc(doc(db, 'userPermissions', uid))
        ]);
        const userData = userSnap.exists() ? userSnap.data() : {};
        const permissions =
          permissionSnap.exists() && Array.isArray(permissionSnap.data().permissions)
            ? permissionSnap.data().permissions
            : [];
        setSelectedUserUi(uid, userData, permissions);
        document.querySelectorAll('[data-user-edit]').forEach((btn) => {
          btn.classList.toggle('is-active', btn.getAttribute('data-user-edit') === uid);
        });
        if (msg) msg.textContent = userSnap.exists() ? 'Usuario cargado.' : 'UID sin perfil Firestore. Puedes asignar rol y permisos.';
      } catch (error) {
        console.error(error);
        if (msg) msg.textContent = 'No se pudo cargar el usuario.';
      }
    };

    const renderUsersList = (users) => {
      const list = document.getElementById('users-list');
      if (!list) return;
      if (!users.length) {
        list.innerHTML = '<p class="text-sm text-slate-500">No hay usuarios para mostrar.</p>';
        return;
      }
      list.innerHTML = users
        .map((user) => {
          const name = user.nombre || 'Usuario';
          const email = user.email || '';
          const role = normalizeRole(user.rol || 'cliente');
          return `
            <button type="button" class="programador-user-card" data-user-edit="${escapeHtml(user.id)}">
              <span class="app-avatar-initials h-10 w-10">${escapeHtml(initials(name, email))}</span>
              <span class="min-w-0">
                <strong class="truncate">${escapeHtml(name)}</strong>
                <small class="truncate">${escapeHtml(email || user.id)}</small>
              </span>
              <em>${escapeHtml(labelRole(role))}</em>
            </button>
          `;
        })
        .join('');
      list.querySelectorAll('[data-user-edit]').forEach((btn) => {
        btn.addEventListener('click', () => loadUserForEdit(btn.getAttribute('data-user-edit') || ''));
      });
    };

    const filterUsers = () => {
      const term = String(document.getElementById('users-search')?.value || '').trim().toLowerCase();
      if (!term) {
        renderUsersList(usersCache);
        return;
      }
      renderUsersList(
        usersCache.filter((user) =>
          [user.id, user.nombre, user.email, user.rol]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        )
      );
    };

    const loadUsers = async () => {
      const list = document.getElementById('users-list');
      if (list) list.innerHTML = '<p class="text-sm text-slate-500">Cargando usuarios...</p>';
      try {
        const snaps = await getDocs(collection(db, 'users'));
        usersCache = snaps.docs
          .map((snap) => ({ id: snap.id, ...snap.data() }))
          .sort((a, b) => String(a.nombre || a.email || a.id).localeCompare(String(b.nombre || b.email || b.id)));
        filterUsers();
      } catch (error) {
        console.error(error);
        if (list) list.innerHTML = '<p class="text-sm text-rose-600">No se pudieron cargar usuarios.</p>';
      }
    };

    document.getElementById('users-refresh')?.addEventListener('click', loadUsers);
    document.getElementById('users-search')?.addEventListener('input', filterUsers);
    await loadUsers();

    document.getElementById('permission-load')?.addEventListener('click', async () => {
      const msg = document.getElementById('permission-msg');
      const uid = document.getElementById('permission-user-id')?.value?.trim();
      await loadUserForEdit(uid);
    });

    document.getElementById('permission-save')?.addEventListener('click', async () => {
      const msg = document.getElementById('permission-msg');
      const uid = document.getElementById('permission-user-id')?.value?.trim();
      const role = normalizeRole(document.getElementById('permission-user-role')?.value || 'cliente');
      if (!uid) {
        if (msg) msg.textContent = 'Escribe un UID.';
        return;
      }
      if (msg) msg.textContent = 'Guardando...';
      try {
        await Promise.all([
          setDoc(doc(db, 'users', uid), {
            rol: role,
            updatedAt: serverTimestamp()
          }, { merge: true }),
          setDoc(doc(db, 'userPermissions', uid), {
            permissions: readChecked('user-permission'),
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser?.uid || null
          }, { merge: true })
        ]);
        await publishAppUpdate('users', `Permisos usuario ${uid}`);
        if (msg) msg.textContent = 'Usuario guardado.';
        await loadUsers();
      } catch (error) {
        console.error(error);
        if (msg) msg.textContent = 'No se pudo guardar.';
      }
    });
  }
};

export default ProgramadorDashboard;
