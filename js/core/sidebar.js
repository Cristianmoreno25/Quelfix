// Sidebar lateral izquierda — data-driven, basada en rol de sessionStorage
// Incluye guarda de ruta: redirige si el rol no tiene acceso a la página actual

// Mapa de ruta → roles permitidos. Toda ruta protegida debe estar aquí.
const _ROUTE_ACCESS = {
  '/pages/usuario/mis-tickets.html':    ['usuario'],
  '/pages/usuario/crear-ticket.html':   ['usuario'],
  '/pages/usuario/detalle-ticket.html': ['usuario'],
  '/pages/agente/bandeja.html':         ['desarrollador', 'revisor_codigo'],
  '/pages/agente/detalle-ticket.html':  ['desarrollador', 'revisor_codigo'],
  '/pages/agente/revision-codigo.html': ['revisor_codigo'],
  '/pages/admin/dashboard.html':        ['admin'],
  '/pages/admin/tickets.html':          ['admin'],
  '/pages/admin/usuarios.html':         ['admin'],
  '/pages/admin/reasignar.html':        ['admin'],
  '/pages/notificaciones.html':         ['admin', 'desarrollador', 'revisor_codigo', 'usuario'],
  '/pages/perfil.html':                ['admin', 'desarrollador', 'revisor_codigo', 'usuario'],
};

const _SIDEBAR_ICONS = {
  dashboard:     `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6.39-2.908a.75.75 0 01.766.027l3.5 2.25a.75.75 0 010 1.262l-3.5 2.25A.75.75 0 018 12.25v-4.5a.75.75 0 01.39-.658z"/></svg>`,
  tickets:       `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0-6a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clip-rule="evenodd"/></svg>`,
  crear:         `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clip-rule="evenodd"/></svg>`,
  notificaciones:`<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M4 8a6 6 0 1112 0c0 1.887.454 3.665 1.257 5.234a.75.75 0 01-.515 1.076 32.91 32.91 0 01-3.256.508 3.5 3.5 0 01-6.972 0 32.903 32.903 0 01-3.256-.508.75.75 0 01-.515-1.076A11.448 11.448 0 004 8zm6 7c-.655 0-1.305-.02-1.95-.057A2 2 0 0010 17a2 2 0 001.95-2.057A48.661 48.661 0 0110 15z" clip-rule="evenodd"/></svg>`,
  bandeja:       `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M1 11.27c0-.289.025-.57.071-.845l1.122-6.116A5.25 5.25 0 017.28 0h5.44a5.25 5.25 0 015.087 4.309l1.123 6.116c.045.274.07.556.07.844V17a2 2 0 01-2 2H3a2 2 0 01-2-2v-5.73zm10.75 1.47a.75.75 0 00-1.5 0v1.5H8.75a.75.75 0 000 1.5h1.5v1.5a.75.75 0 001.5 0V15.75h1.5a.75.75 0 000-1.5h-1.5v-1.5z" clip-rule="evenodd"/></svg>`,
  codigo:        `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06L6.56 10l1.72-1.72zm4.5-1.06a.75.75 0 10-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clip-rule="evenodd"/></svg>`,
  usuarios:      `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 17a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z"/></svg>`,
  reasignar:     `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd"/></svg>`,
  perfil:        `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z" clip-rule="evenodd"/></svg>`,
  logout:        `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25zm12.47 4.22a.75.75 0 011.06 0l2.25 2.25a.75.75 0 010 1.06l-2.25 2.25a.75.75 0 11-1.06-1.06l.97-.97H8.75a.75.75 0 010-1.5h7.69l-.97-.97a.75.75 0 010-1.06z" clip-rule="evenodd"/></svg>`,
};

const _SIDEBAR_MENU = {
  usuario: [
    { label: 'Mis tickets',    href: '/pages/usuario/mis-tickets.html',  icon: 'tickets'        },
    { label: 'Crear ticket',   href: '/pages/usuario/crear-ticket.html', icon: 'crear'          },
    { label: 'Notificaciones', href: '/pages/notificaciones.html',       icon: 'notificaciones' },
    { label: 'Mi perfil',      href: '/pages/perfil.html',               icon: 'perfil'         },
  ],
  desarrollador: [
    { label: 'Bandeja',        href: '/pages/agente/bandeja.html',  icon: 'bandeja'        },
    { label: 'Notificaciones', href: '/pages/notificaciones.html',  icon: 'notificaciones' },
    { label: 'Mi perfil',      href: '/pages/perfil.html',          icon: 'perfil'         },
  ],
  revisor_codigo: [
    { label: 'Bandeja',         href: '/pages/agente/bandeja.html',         icon: 'bandeja'        },
    { label: 'Revisión código', href: '/pages/agente/revision-codigo.html', icon: 'codigo'         },
    { label: 'Notificaciones',  href: '/pages/notificaciones.html',         icon: 'notificaciones' },
    { label: 'Mi perfil',       href: '/pages/perfil.html',                 icon: 'perfil'         },
  ],
  admin: [
    { label: 'Dashboard',      href: '/pages/admin/dashboard.html',  icon: 'dashboard'      },
    { label: 'Tickets',        href: '/pages/admin/tickets.html',    icon: 'tickets'        },
    { label: 'Usuarios',       href: '/pages/admin/usuarios.html',   icon: 'usuarios'       },
    { label: 'Reasignar',      href: '/pages/admin/reasignar.html',  icon: 'reasignar'      },
    { label: 'Notificaciones', href: '/pages/notificaciones.html',   icon: 'notificaciones' },
    { label: 'Mi perfil',      href: '/pages/perfil.html',           icon: 'perfil'         },
  ],
};

const _ROL_LABELS = {
  usuario:        'Usuario',
  desarrollador:  'Desarrollador',
  revisor_codigo: 'Revisor de código',
  admin:          'Administrador',
};

function _buildSidebar(rol) {
  const items  = _SIDEBAR_MENU[rol] ?? [];
  const path   = window.location.pathname;

  const navItems = items.map(item => {
    const isActive = path.endsWith(item.href) || path === item.href;
    return `
      <li>
        <a href="${item.href}" class="sidebar__link${isActive ? ' sidebar__link--active' : ''}">
          <span class="sidebar__icon">${_SIDEBAR_ICONS[item.icon] ?? ''}</span>
          <span class="sidebar__label">${item.label}</span>
        </a>
      </li>`;
  }).join('');

  return `
    <aside id="app-sidebar" class="sidebar" aria-label="Navegación principal">
      <div class="sidebar__top">
        <a href="/" class="sidebar__brand">Quelfix</a>
        <button class="sidebar__close" id="sidebar-close-btn" aria-label="Cerrar menú">
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
        </button>
      </div>

      <nav class="sidebar__nav">
        <ul class="sidebar__list">${navItems}</ul>
      </nav>

      <div class="sidebar__footer">
        <div class="sidebar__user">
          <span class="sidebar__user-role">${_ROL_LABELS[rol] ?? rol}</span>
        </div>
        <button class="sidebar__logout" id="sidebar-logout-btn">
          ${_SIDEBAR_ICONS.logout}
          <span class="sidebar__label">Cerrar sesión</span>
        </button>
      </div>
    </aside>

    <button class="sidebar-toggle" id="sidebar-toggle-btn" aria-label="Abrir menú">
      <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clip-rule="evenodd"/></svg>
    </button>

    <div class="sidebar-overlay" id="sidebar-overlay"></div>
  `;
}

function _wireSidebar() {
  const sidebar    = document.getElementById('app-sidebar');
  const toggleBtn  = document.getElementById('sidebar-toggle-btn');
  const closeBtn   = document.getElementById('sidebar-close-btn');
  const overlay    = document.getElementById('sidebar-overlay');
  const logoutBtn  = document.getElementById('sidebar-logout-btn');

  function openSidebar() {
    sidebar.classList.add('sidebar--open');
    overlay.classList.add('sidebar-overlay--visible');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('sidebar--open');
    overlay.classList.remove('sidebar-overlay--visible');
    document.body.style.overflow = '';
  }

  toggleBtn?.addEventListener('click', openSidebar);
  closeBtn?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click', closeSidebar);

  logoutBtn?.addEventListener('click', async () => {
    logoutBtn.style.opacity = '0.6';
    logoutBtn.style.pointerEvents = 'none';
    await logout();
  });
}

async function initSidebar() {
  // 1. Verificar sesión — primero cache, luego Supabase
  let rol = sessionStorage.getItem('qfx_rol');

  if (!rol) {
    const session = await getSession();
    if (!session) {
      window.location.replace('/login.html');
      return;
    }
    rol = await getRol();
    if (!rol) {
      await logout();
      return;
    }
  }

  // 2. Verificar que el rol tenga acceso a esta ruta
  const path         = window.location.pathname;
  const rolesPermitidos = _ROUTE_ACCESS[path];

  if (rolesPermitidos && !rolesPermitidos.includes(rol)) {
    // El usuario no tiene acceso: redirigir a su ruta de inicio sin añadir al historial
    window.location.replace(ROLE_ROUTES[rol] ?? '/login.html');
    return;
  }

  // 3. Auth OK — mostrar la página y renderizar el sidebar
  document.body.classList.add('auth-ready');
  document.body.insertAdjacentHTML('afterbegin', _buildSidebar(rol));
  document.body.classList.add('has-sidebar');
  _wireSidebar();
}

initSidebar();
