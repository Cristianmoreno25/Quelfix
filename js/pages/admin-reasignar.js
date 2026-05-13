// Admin — reasignación de tickets entre desarrolladores

const ESTADO_LABELS = {
  abierto:            'Abierto',
  en_progreso:        'En progreso',
  pendiente_revision: 'Pend. revisión',
  resuelto:           'Resuelto',
  cerrado:            'Cerrado',
};

const PRIORIDAD_LABELS = {
  baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica',
};

const ROL_LABELS = {
  desarrollador:  'Desarrollador',
  revisor_codigo: 'Revisor de código',
};

// Estado del módulo
let _allTickets     = [];
let _filteredTickets = [];
let _allDevs        = [];
let _filteredDevs   = [];
let _perfilMap      = {};
let _selectedTicket = null;
let _selectedDev    = null;
let _supaClient     = null;

// ── Inicialización ───────────────────────────────────────────────────────────
async function initReasignar() {
  _supaClient = await getSupabaseClient();

  const [ticketsRes, perfilesRes] = await Promise.all([
    _supaClient
      .from('tickets')
      .select('id, titulo, estado, prioridad, desarrollador_id')
      .neq('estado', 'cerrado')
      .order('created_at', { ascending: false }),
    _supaClient
      .from('perfiles')
      .select('id, nombre, email, rol'),
  ]);

  if (ticketsRes.error || perfilesRes.error) {
    showToast('Error al cargar los datos.', 'error');
    return;
  }

  const perfiles  = perfilesRes.data ?? [];
  _perfilMap      = Object.fromEntries(perfiles.map(p => [p.id, p.nombre]));
  _allTickets     = ticketsRes.data ?? [];
  _filteredTickets = [..._allTickets];
  _allDevs        = perfiles.filter(p => ['desarrollador', 'revisor_codigo'].includes(p.rol));
  _filteredDevs   = [..._allDevs];

  renderTickets();
  renderDevs();
  wireFilters();
  updateBadges();
}

// ── Render tickets ───────────────────────────────────────────────────────────
function renderTickets() {
  const list = document.getElementById('tickets-list');

  if (!_filteredTickets.length) {
    list.innerHTML = `<p class="reasignar-empty">
      ${_allTickets.length ? 'Ningún ticket coincide.' : 'No hay tickets activos.'}
    </p>`;
    return;
  }

  list.innerHTML = _filteredTickets.map(t => {
    const asignado    = t.desarrollador_id ? (_perfilMap[t.desarrollador_id] ?? 'Desconocido') : null;
    const isSelected  = _selectedTicket?.id === t.id;
    const titulo      = t.titulo.length > 52 ? t.titulo.slice(0, 52) + '…' : t.titulo;

    return `
      <div
        class="reasignar-item ${isSelected ? 'reasignar-item--selected' : ''}"
        data-id="${t.id}"
        onclick="selectTicket('${t.id}')"
        title="${t.titulo}"
      >
        <div class="reasignar-item__body">
          <span class="reasignar-item__title">${titulo}</span>
          <span class="reasignar-item__meta">
            ${asignado
              ? `<svg viewBox="0 0 20 20" fill="currentColor" width="11" height="11"><path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z"/></svg> ${asignado}`
              : `<span style="color:var(--color-text-muted)">Sin asignar</span>`
            }
          </span>
        </div>
        <div class="reasignar-item__badges">
          <span class="badge badge--${t.estado}">${ESTADO_LABELS[t.estado] ?? t.estado}</span>
          <span class="badge badge--${t.prioridad}">${PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad}</span>
        </div>
      </div>`;
  }).join('');
}

// ── Render desarrolladores ───────────────────────────────────────────────────
function renderDevs() {
  const list = document.getElementById('devs-list');

  if (!_filteredDevs.length) {
    list.innerHTML = `<p class="reasignar-empty">No hay desarrolladores registrados.</p>`;
    return;
  }

  list.innerHTML = _filteredDevs.map(d => {
    const iniciales   = _initials(d.nombre ?? d.email ?? '?');
    const color       = _avatarColor(d.id);
    const activos     = _allTickets.filter(t => t.desarrollador_id === d.id).length;
    const isSelected  = _selectedDev?.id === d.id;

    return `
      <div
        class="reasignar-item reasignar-item--dev ${isSelected ? 'reasignar-item--selected' : ''}"
        data-id="${d.id}"
        onclick="selectDev('${d.id}')"
      >
        <div class="user-avatar user-avatar--sm" style="--avatar-bg:${color}">${iniciales}</div>
        <div class="reasignar-item__body">
          <span class="reasignar-item__title">${d.nombre ?? d.email}</span>
          <span class="reasignar-item__meta">
            ${ROL_LABELS[d.rol] ?? d.rol}
            <span class="reasignar-item__ticket-count">${activos} ticket${activos !== 1 ? 's' : ''}</span>
          </span>
        </div>
        ${isSelected
          ? `<svg class="reasignar-item__check" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>`
          : ''
        }
      </div>`;
  }).join('');
}

// ── Selección ────────────────────────────────────────────────────────────────
function selectTicket(id) {
  _selectedTicket = _selectedTicket?.id === id ? null : _allTickets.find(t => t.id === id);
  renderTickets();
  updateActionBar();
}

function selectDev(id) {
  _selectedDev = _selectedDev?.id === id ? null : _allDevs.find(d => d.id === id);
  renderDevs();
  updateActionBar();
}

// ── Barra de acción ──────────────────────────────────────────────────────────
function updateActionBar() {
  const btn     = document.getElementById('reasignar-btn');
  const summary = document.getElementById('action-summary');
  const ready   = _selectedTicket && _selectedDev;

  btn.disabled = !ready;

  if (!ready) {
    const falta = !_selectedTicket && !_selectedDev
      ? 'Selecciona un ticket y un desarrollador'
      : !_selectedTicket
        ? 'Selecciona un ticket'
        : 'Selecciona un desarrollador';
    summary.innerHTML = `<span class="action-placeholder">${falta}</span>`;
    return;
  }

  const tituloCorto = _selectedTicket.titulo.length > 35
    ? _selectedTicket.titulo.slice(0, 35) + '…'
    : _selectedTicket.titulo;

  summary.innerHTML = `
    <div class="action-selection">
      <span class="action-selection__chip action-selection__chip--ticket">
        <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5z" clip-rule="evenodd"/></svg>
        ${tituloCorto}
      </span>
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="color:var(--color-text-muted); flex-shrink:0"><path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd"/></svg>
      <span class="action-selection__chip action-selection__chip--dev">
        <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z"/></svg>
        ${_selectedDev.nombre ?? _selectedDev.email}
      </span>
    </div>`;
}

// ── Ejecutar reasignación ────────────────────────────────────────────────────
function wireReasignarBtn() {
  document.getElementById('reasignar-btn').addEventListener('click', async () => {
    if (!_selectedTicket || !_selectedDev) return;

    const btn = document.getElementById('reasignar-btn');
    btn.disabled    = true;
    btn.textContent = 'Reasignando…';

    const { error } = await _supaClient
      .from('tickets')
      .update({ desarrollador_id: _selectedDev.id })
      .eq('id', _selectedTicket.id);

    if (error) {
      showToast('No se pudo reasignar el ticket.', 'error');
    } else {
      // Actualizar estado local
      const ticket = _allTickets.find(t => t.id === _selectedTicket.id);
      if (ticket) ticket.desarrollador_id = _selectedDev.id;

      showToast(
        `Ticket reasignado a ${_selectedDev.nombre ?? _selectedDev.email} correctamente.`,
        'success'
      );

      _selectedTicket = null;
      _selectedDev    = null;
      renderTickets();
      renderDevs();
      updateActionBar();
    }

    btn.disabled    = false;
    btn.innerHTML = `
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
        <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd"/>
      </svg>
      Reasignar`;
  });
}

// ── Filtros ──────────────────────────────────────────────────────────────────
function wireFilters() {
  document.getElementById('ticket-search').addEventListener('input', filterTickets);
  document.getElementById('ticket-filter-estado').addEventListener('change', filterTickets);
  document.getElementById('dev-search').addEventListener('input', filterDevs);
  wireReasignarBtn();
}

function filterTickets() {
  const search = document.getElementById('ticket-search').value.toLowerCase().trim();
  const estado = document.getElementById('ticket-filter-estado').value;

  _filteredTickets = _allTickets.filter(t => {
    if (estado && t.estado !== estado) return false;
    if (search && !t.titulo.toLowerCase().includes(search) && !t.id.includes(search)) return false;
    return true;
  });

  renderTickets();
  updateBadges();
}

function filterDevs() {
  const search = document.getElementById('dev-search').value.toLowerCase().trim();

  _filteredDevs = _allDevs.filter(d => {
    if (!search) return true;
    return (d.nombre ?? '').toLowerCase().includes(search) ||
           (d.email  ?? '').toLowerCase().includes(search);
  });

  renderDevs();
  updateBadges();
}

function updateBadges() {
  document.getElementById('tickets-count-badge').textContent = _filteredTickets.length;
  document.getElementById('devs-count-badge').textContent    = _filteredDevs.length;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function _initials(str) {
  return str.trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '').join('');
}

function _avatarColor(id) {
  const palette = ['#285a48', '#408a71', '#2c5282', '#7a5a36', '#9a5252', '#5a6828'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

initReasignar();
