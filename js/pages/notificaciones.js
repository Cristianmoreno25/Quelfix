// Página de notificaciones — unificada para todos los roles

const TIPO_ICONS = {
  ticket_asignado: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z" clip-rule="evenodd"/></svg>`,
  estado_cambiado: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd"/></svg>`,
  observacion_añadida: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M3.43 2.524A41.29 41.29 0 0110 2c2.236 0 4.43.18 6.57.524 1.437.231 2.43 1.49 2.43 2.902v5.148c0 1.413-.993 2.67-2.43 2.902a41.202 41.202 0 01-5.183.501 2.25 2.25 0 00-1.52.572l-3.417 3.135A.75.75 0 015 17.062V15.5H4.5A2.5 2.5 0 012 13V5.426c0-1.413.993-2.67 2.43-2.902z" clip-rule="evenodd"/></svg>`,
  ticket_resuelto: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>`,
  ticket_cerrado: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>`,
  reasignacion: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z"/></svg>`,
  ticket_sin_atender: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>`,
};

// Estado del módulo
let _allNotifs      = [];
let _filteredNotifs = [];
let _currentFilter  = 'todas';
let _supaClient     = null;
let _currentUserId  = null;
let _isAdmin        = false;
let _perfilMap      = {};

// ── Inicialización ───────────────────────────────────────────────────────────
async function initNotificaciones() {
  _supaClient = await getSupabaseClient();
  const user = await getUser();
  if (!user) return;
  _currentUserId = user.id;

  const rol = await getRol();
  _isAdmin = rol === 'admin';

  if (_isAdmin) {
    const { data: perfiles } = await _supaClient
      .from('perfiles')
      .select('id, nombre, email');
    _perfilMap = Object.fromEntries(
      (perfiles ?? []).map(p => [p.id, p.nombre ?? p.email ?? 'Usuario'])
    );
  }

  await loadNotificaciones();
  wireFilters();
  wireMarkAll();
  subscribeRealtime();
}

// ── Carga de datos ───────────────────────────────────────────────────────────
async function loadNotificaciones() {
  const { data, error } = await _supaClient
    .from('notificaciones')
    .select('id, usuario_id, mensaje, ticket_id, leida, created_at, tipo')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Error al cargar las notificaciones.', 'error');
    document.getElementById('notif-list').innerHTML =
      `<p class="notif-empty">No se pudieron cargar las notificaciones.</p>`;
    return;
  }

  _allNotifs = data ?? [];
  applyFilter();
}

// ── Filtrado ─────────────────────────────────────────────────────────────────
function applyFilter() {
  _filteredNotifs = _currentFilter === 'no_leidas'
    ? _allNotifs.filter(n => !n.leida)
    : [..._allNotifs];

  renderList();
  updateUnreadBadge();
  updateMarkAllBtn();
}

// ── Render ───────────────────────────────────────────────────────────────────
function renderList() {
  const list = document.getElementById('notif-list');

  if (!_filteredNotifs.length) {
    const msg = _currentFilter === 'no_leidas'
      ? 'No tienes notificaciones sin leer.'
      : 'Aún no hay notificaciones.';
    list.innerHTML = `
      <div class="notif-empty-state">
        <svg viewBox="0 0 20 20" fill="currentColor" width="40" height="40" style="color:var(--color-border)">
          <path fill-rule="evenodd" d="M4 8a6 6 0 1112 0c0 1.887.454 3.665 1.257 5.234a.75.75 0 01-.515 1.076 32.91 32.91 0 01-3.256.508 3.5 3.5 0 01-6.972 0 32.903 32.903 0 01-3.256-.508.75.75 0 01-.515-1.076A11.448 11.448 0 004 8zm6 7c-.655 0-1.305-.02-1.95-.057A2 2 0 0010 17a2 2 0 001.95-2.057A48.661 48.661 0 0110 15z" clip-rule="evenodd"/>
        </svg>
        <p>${msg}</p>
      </div>`;
    return;
  }

  list.innerHTML = _filteredNotifs.map(n => {
    const icon   = TIPO_ICONS[n.tipo] ?? TIPO_ICONS.estado_cambiado;
    const tiempo = _relativeTime(n.created_at);

    const paraEl = _isAdmin
      ? `<span class="notif-item__para">Para: <strong>${_perfilMap[n.usuario_id] ?? 'Usuario'}</strong></span>`
      : '';

    return `
      <div
        class="notif-item${n.leida ? '' : ' notif-item--unread'}"
        data-id="${n.id}"
        onclick="markAsRead('${n.id}')"
        role="button"
        tabindex="0"
      >
        <div class="notif-item__icon notif-icon--${n.tipo ?? 'default'}">${icon}</div>
        <div class="notif-item__body">
          <p class="notif-item__msg">${n.mensaje}</p>
          <div class="notif-item__meta">
            ${paraEl}
            <span class="notif-item__time">${tiempo}</span>
          </div>
        </div>
        ${!n.leida ? `<span class="notif-item__dot" aria-hidden="true"></span>` : ''}
      </div>`;
  }).join('');
}

// ── Marcar como leída ────────────────────────────────────────────────────────
async function markAsRead(id) {
  const notif = _allNotifs.find(n => n.id === id);
  if (!notif || notif.leida) return;

  notif.leida = true;
  applyFilter();

  const { error } = await _supaClient
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', id);

  if (error) {
    notif.leida = false;
    applyFilter();
    showToast('No se pudo marcar la notificación.', 'error');
  }
}

// ── Marcar todas como leídas ─────────────────────────────────────────────────
function wireMarkAll() {
  document.getElementById('mark-all-btn').addEventListener('click', async () => {
    const noLeidas = _allNotifs.filter(n => !n.leida);
    if (!noLeidas.length) return;

    const btn = document.getElementById('mark-all-btn');
    btn.disabled = true;

    noLeidas.forEach(n => { n.leida = true; });
    applyFilter();

    const ids = noLeidas.map(n => n.id);
    const { error } = await _supaClient
      .from('notificaciones')
      .update({ leida: true })
      .in('id', ids);

    if (error) {
      noLeidas.forEach(n => { n.leida = false; });
      applyFilter();
      showToast('No se pudieron marcar las notificaciones.', 'error');
    } else {
      showToast('Todas las notificaciones marcadas como leídas.', 'success');
    }
  });
}

// ── Tabs de filtro ───────────────────────────────────────────────────────────
function wireFilters() {
  document.getElementById('notif-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;

    _currentFilter = btn.dataset.filter;
    document.querySelectorAll('.notif-tab').forEach(t => {
      t.classList.toggle('notif-tab--active', t === btn);
      t.setAttribute('aria-selected', t === btn ? 'true' : 'false');
    });

    applyFilter();
  });
}

function updateUnreadBadge() {
  const count = _allNotifs.filter(n => !n.leida).length;
  const badge = document.getElementById('unread-count');
  badge.textContent   = count > 99 ? '99+' : count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

function updateMarkAllBtn() {
  document.getElementById('mark-all-btn').disabled = !_allNotifs.some(n => !n.leida);
}

// ── Realtime ─────────────────────────────────────────────────────────────────
function subscribeRealtime() {
  const channelConfig = {
    event:  'INSERT',
    schema: 'public',
    table:  'notificaciones',
  };

  if (!_isAdmin) {
    channelConfig.filter = `usuario_id=eq.${_currentUserId}`;
  }

  _supaClient
    .channel('notificaciones-page-live')
    .on('postgres_changes', channelConfig, payload => {
      _allNotifs.unshift(payload.new);
      applyFilter();
      showToast('Nueva notificación recibida.', 'info', 3000);
    })
    .subscribe();
}

// ── Helper: tiempo relativo ───────────────────────────────────────────────────
function _relativeTime(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `Hace ${days} día${days !== 1 ? 's' : ''}`;
  return formatDate(isoStr);
}

initNotificaciones();
