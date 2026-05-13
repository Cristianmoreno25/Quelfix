// Admin — gestión de usuarios con edición de rol inline

const ROL_LABELS = {
  admin:          'Administrador',
  desarrollador:  'Desarrollador',
  revisor_codigo: 'Revisor de código',
  usuario:        'Usuario',
};

// Estado del módulo
let _allUsuarios = [];
let _filtered    = [];
let _supaClient  = null;

// ── Inicialización ───────────────────────────────────────────────────────────
async function initUsuarios() {
  renderTableSkeleton();

  _supaClient = await getSupabaseClient();

  const { data, error } = await _supaClient
    .from('perfiles')
    .select('id, nombre, email, rol, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Error al cargar los usuarios.', 'error');
    document.getElementById('usuarios-table-wrap').innerHTML =
      `<p class="data-table__empty">No se pudieron cargar los datos.</p>`;
    return;
  }

  _allUsuarios = data ?? [];
  _filtered    = [..._allUsuarios];

  wireFilters();
  renderTable();
  updateCount();
}

// ── Filtros ──────────────────────────────────────────────────────────────────
function wireFilters() {
  const searchEl = document.getElementById('filter-search');
  const rolEl    = document.getElementById('filter-rol');
  const clearBtn = document.getElementById('filter-clear');

  function onChange() {
    applyFilters();
    updateClearBtn();
  }

  searchEl.addEventListener('input', onChange);
  rolEl.addEventListener('change', onChange);

  clearBtn.addEventListener('click', () => {
    searchEl.value = '';
    rolEl.value    = '';
    applyFilters();
    updateClearBtn();
  });
}

function updateClearBtn() {
  const searchEl = document.getElementById('filter-search');
  const rolEl    = document.getElementById('filter-rol');
  const clearBtn = document.getElementById('filter-clear');
  clearBtn.style.display = (searchEl.value || rolEl.value) ? 'flex' : 'none';
}

function applyFilters() {
  const search = document.getElementById('filter-search').value.toLowerCase().trim();
  const rol    = document.getElementById('filter-rol').value;

  _filtered = _allUsuarios.filter(u => {
    if (rol && u.rol !== rol) return false;
    if (search) {
      const enNombre = (u.nombre ?? '').toLowerCase().includes(search);
      const enCorreo = (u.email ?? '').toLowerCase().includes(search);
      if (!enNombre && !enCorreo) return false;
    }
    return true;
  });

  renderTable();
  updateCount();
}

// ── Render ───────────────────────────────────────────────────────────────────
function renderTableSkeleton() {
  const rows = Array.from({ length: 5 }, () => `
    <tr>
      ${Array.from({ length: 5 }, () =>
        `<td><div style="height:14px;background:#eceeed;border-radius:4px;animation:skeleton-pulse 1.4s ease-in-out infinite;"></div></td>`
      ).join('')}
    </tr>`).join('');

  document.getElementById('usuarios-table-wrap').innerHTML = `
    <table class="data-table">
      <thead><tr><th></th><th>Nombre</th><th>Email</th><th>Rol</th><th>Registro</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderTable() {
  const wrap = document.getElementById('usuarios-table-wrap');

  if (!_filtered.length) {
    wrap.innerHTML = `<p class="data-table__empty">
      ${_allUsuarios.length ? 'Ningún usuario coincide con los filtros.' : 'No hay usuarios registrados.'}
    </p>`;
    return;
  }

  const rows = _filtered.map(u => {
    const iniciales = _initials(u.nombre ?? u.email ?? '?');
    const color     = _avatarColor(u.id);
    const nombre    = u.nombre ?? '—';
    const correo    = u.email ?? '—';
    const fecha     = formatDate(u.created_at);

    const rolOptions = Object.entries(ROL_LABELS).map(([val, label]) =>
      `<option value="${val}" ${u.rol === val ? 'selected' : ''}>${label}</option>`
    ).join('');

    return `
      <tr>
        <td data-label="Avatar">
          <div class="user-avatar" style="--avatar-bg:${color}">
            ${iniciales}
          </div>
        </td>
        <td data-label="Nombre" class="user-nombre">${nombre}</td>
        <td data-label="Email" class="user-correo">${correo}</td>
        <td data-label="Rol">
          <select
            class="role-select"
            data-id="${u.id}"
            data-rol="${u.rol}"
            data-nombre="${nombre}"
            onchange="handleRolChange(this)"
          >
            ${rolOptions}
          </select>
        </td>
        <td data-label="Registro" class="tickets-date">${fecha}</td>
      </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="data-table usuarios-table">
      <thead>
        <tr>
          <th style="width:48px"></th>
          <th>Nombre</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Registro</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Edición de rol inline ────────────────────────────────────────────────────
async function handleRolChange(selectEl) {
  const id        = selectEl.dataset.id;
  const rolAnterior = selectEl.dataset.rol;
  const rolNuevo    = selectEl.value;
  const nombre      = selectEl.dataset.nombre;

  if (rolNuevo === rolAnterior) return;

  // Estado de carga
  selectEl.disabled = true;
  selectEl.dataset.rol = rolNuevo;

  const { error } = await _supaClient
    .from('perfiles')
    .update({ rol: rolNuevo })
    .eq('id', id);

  if (error) {
    showToast(`No se pudo actualizar el rol de ${nombre}.`, 'error');
    selectEl.value       = rolAnterior;
    selectEl.dataset.rol = rolAnterior;
  } else {
    // Actualizar estado local
    const usuario = _allUsuarios.find(u => u.id === id);
    if (usuario) usuario.rol = rolNuevo;

    showToast(`Rol de ${nombre} cambiado a ${ROL_LABELS[rolNuevo]}.`, 'success');
  }

  selectEl.disabled = false;
}

// ── Contador ─────────────────────────────────────────────────────────────────
function updateCount() {
  const total   = _allUsuarios.length;
  const showing = _filtered.length;
  const el      = document.getElementById('usuarios-count');

  el.textContent = showing === total
    ? `${total} usuario${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}`
    : `${showing} de ${total} usuarios (filtrado)`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function _initials(str) {
  return str.trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function _avatarColor(id) {
  const palette = ['#285a48', '#408a71', '#2c5282', '#7a5a36', '#9a5252', '#5a6828'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

initUsuarios();
