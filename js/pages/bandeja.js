// Bandeja de tickets del agente (desarrollador + revisor_codigo)

const ESTADO_LABELS = {
  abierto:     'Abierto',
  en_proceso:  'En proceso',
  en_revision: 'En revisión',
  resuelto:    'Resuelto',
  cerrado:     'Cerrado',
};

const PRIORIDAD_LABELS = {
  baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica',
};

const CATEGORIA_LABELS = {
  soporte_tecnico_general:  'Soporte general',
  revision_codigo:          'Revisión de código',
  error_sistema:            'Error de sistema',
  consulta_tecnica:         'Consulta técnica',
  otro:                     'Otro',
};

// Estado del módulo
let _allTickets      = [];
let _filteredTickets = [];
let _perfilMap       = {};
let _supaClient      = null;
let _userId          = null;
let _rol             = null;

// ── Inicialización ───────────────────────────────────────────────────────────
async function initBandeja() {
  _supaClient = await getSupabaseClient();
  _userId     = (await getUser())?.id;
  _rol        = await getRol();

  if (!_userId) return;

  document.getElementById('bandeja-subtitle').textContent =
    _rol === 'revisor_codigo' ? 'Tickets asignados a ti para revisión' : 'Tickets asignados a ti';

  const campoAsignacion = _rol === 'revisor_codigo' ? 'revisor_id' : 'desarrollador_id';

  const [ticketsRes, perfilesRes] = await Promise.all([
    _supaClient
      .from('tickets')
      .select('id, titulo, estado, prioridad, categoria, usuario_id, created_at')
      .eq(campoAsignacion, _userId)
      .neq('estado', 'cerrado')
      .order('created_at', { ascending: false }),
    _supaClient
      .from('perfiles')
      .select('id, nombre, email'),
  ]);

  if (ticketsRes.error) {
    showToast('Error al cargar los tickets.', 'error');
    document.getElementById('bandeja-list').innerHTML =
      `<div class="bandeja-empty"><p>No se pudieron cargar los tickets.</p></div>`;
    return;
  }

  _perfilMap       = Object.fromEntries((perfilesRes.data ?? []).map(p => [p.id, p.nombre ?? p.email]));
  _allTickets      = ticketsRes.data ?? [];
  _filteredTickets = [..._allTickets];

  renderStats();
  renderList();
  wireFilters();
}

// ── Stats ────────────────────────────────────────────────────────────────────
function renderStats() {
  const total     = _allTickets.length;
  const activos   = _allTickets.filter(t => ['abierto', 'en_proceso', 'en_revision'].includes(t.estado)).length;
  const resueltos = _allTickets.filter(t => t.estado === 'resuelto').length;

  document.getElementById('bandeja-stats').innerHTML = `
    <div class="bandeja-stat" style="--stat-color:#285a48;--stat-icon-bg:rgba(40,90,72,0.1)">
      <div class="bandeja-stat__icon">
        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
          <path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0-6a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="bandeja-stat__content">
        <div class="bandeja-stat__value">${total}</div>
        <div class="bandeja-stat__label">Asignados en total</div>
      </div>
    </div>
    <div class="bandeja-stat" style="--stat-color:#2c5282;--stat-icon-bg:rgba(44,82,130,0.1)">
      <div class="bandeja-stat__icon">
        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="bandeja-stat__content">
        <div class="bandeja-stat__value">${activos}</div>
        <div class="bandeja-stat__label">Activos</div>
      </div>
    </div>
    <div class="bandeja-stat" style="--stat-color:#408a71;--stat-icon-bg:rgba(64,138,113,0.1)">
      <div class="bandeja-stat__icon">
        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="bandeja-stat__content">
        <div class="bandeja-stat__value">${resueltos}</div>
        <div class="bandeja-stat__label">Resueltos</div>
      </div>
    </div>`;
}

// ── Render lista ─────────────────────────────────────────────────────────────
function renderList() {
  const wrap = document.getElementById('bandeja-list');

  if (!_filteredTickets.length) {
    const msg = _allTickets.length
      ? 'Ningún ticket coincide con los filtros.'
      : 'No tienes tickets asignados.';
    wrap.innerHTML = `
      <div class="bandeja-empty">
        <svg viewBox="0 0 20 20" fill="currentColor" width="36" height="36" style="color:var(--color-border)">
          <path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0-6a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clip-rule="evenodd"/>
        </svg>
        <p>${msg}</p>
      </div>`;
    return;
  }

  wrap.innerHTML = _filteredTickets.map(t => {
    const titulo    = t.titulo.length > 72 ? t.titulo.slice(0, 72) + '…' : t.titulo;
    const creadoPor = t.usuario_id ? (_perfilMap[t.usuario_id] ?? 'Usuario') : '—';
    const categoria = CATEGORIA_LABELS[t.categoria] ?? t.categoria;
    const cardMod   = t.estado === 'resuelto' ? ' bandeja-card--finalizado' : '';

    return `
      <a
        class="bandeja-card bandeja-card--${t.prioridad}${cardMod}"
        href="/pages/agente/${_rol === 'revisor_codigo' ? 'detalle-ticket-revisor' : 'detalle-ticket'}.html?id=${t.id}"
      >
        <div class="bandeja-card__body">
          <div class="bandeja-card__toprow">
            <div class="bandeja-card__id-cat">
              <span class="bandeja-card__id">#${t.id.slice(0, 8)}</span>
              <span class="bandeja-card__cat-chip">${categoria}</span>
            </div>
            <span class="badge badge--${t.estado}">${ESTADO_LABELS[t.estado] ?? t.estado}</span>
          </div>
          <div class="bandeja-card__title-row">
            <span class="priority-dot priority-dot--${t.prioridad}"></span>
            <span class="bandeja-card__title" title="${t.titulo}">${titulo}</span>
          </div>
          <div class="bandeja-card__bottomrow">
            <div class="bandeja-card__meta">
              <span class="bandeja-card__meta-item">
                <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                  <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z"/>
                </svg>
                ${creadoPor}
              </span>
              <span class="bandeja-card__meta-item">
                <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                  <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd"/>
                </svg>
                ${formatDate(t.created_at)}
              </span>
            </div>
            <span class="bandeja-card__prio-chip bandeja-card__prio-chip--${t.prioridad}">${PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad}</span>
          </div>
        </div>
        <svg class="bandeja-card__arrow" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd"/>
        </svg>
      </a>`;
  }).join('');
}

// ── Filtros ───────────────────────────────────────────────────────────────────
function wireFilters() {
  const searchEl    = document.getElementById('filter-search');
  const estadoEl    = document.getElementById('filter-estado');
  const prioridadEl = document.getElementById('filter-prioridad');
  const clearBtn    = document.getElementById('filter-clear');

  function onChange() { applyFilters(); updateClearBtn(); }

  searchEl.addEventListener('input', onChange);
  estadoEl.addEventListener('change', onChange);
  prioridadEl.addEventListener('change', onChange);

  clearBtn.addEventListener('click', () => {
    searchEl.value    = '';
    estadoEl.value    = '';
    prioridadEl.value = '';
    applyFilters();
    updateClearBtn();
  });
}

function applyFilters() {
  const search    = document.getElementById('filter-search').value.toLowerCase().trim();
  const estado    = document.getElementById('filter-estado').value;
  const prioridad = document.getElementById('filter-prioridad').value;

  _filteredTickets = _allTickets.filter(t => {
    if (estado    && t.estado    !== estado)    return false;
    if (prioridad && t.prioridad !== prioridad) return false;
    if (search) {
      const enTitulo = t.titulo.toLowerCase().includes(search);
      const enId     = t.id.toLowerCase().includes(search);
      if (!enTitulo && !enId) return false;
    }
    return true;
  });

  renderList();
}

function updateClearBtn() {
  const active = document.getElementById('filter-search').value
    || document.getElementById('filter-estado').value
    || document.getElementById('filter-prioridad').value;
  document.getElementById('filter-clear').style.display = active ? 'flex' : 'none';
}

initBandeja();
