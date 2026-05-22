// Mis tickets — rol usuario

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
  soporte_tecnico_general: 'Soporte general',
  revision_codigo:         'Revisión de código',
  error_sistema:           'Error de sistema',
  consulta_tecnica:        'Consulta técnica',
  otro:                    'Otro',
};

let _supaClient      = null;
let _userId          = null;
let _allTickets      = [];
let _filteredTickets = [];

// ── Inicialización ───────────────────────────────────────────────────────────
async function initMisTickets() {
  _supaClient = await getSupabaseClient();
  _userId     = (await getUser())?.id;

  if (!_userId) return;

  // Toast que viene del redirect tras crear ticket
  const pending = sessionStorage.getItem('qfx_toast');
  if (pending) {
    try {
      const { text, type } = JSON.parse(pending);
      sessionStorage.removeItem('qfx_toast');
      setTimeout(() => showToast(text, type), 400);
    } catch {}
  }

  const { data, error } = await _supaClient
    .from('tickets')
    .select('id, titulo, estado, prioridad, categoria, created_at')
    .eq('usuario_id', _userId)
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Error al cargar los tickets.', 'error');
    document.getElementById('ut-list').innerHTML = _renderEmpty(true);
    document.getElementById('ut-stats').innerHTML = '';
    return;
  }

  _allTickets      = data ?? [];
  _filteredTickets = [..._allTickets];

  renderStats();
  renderList();
  wireFilters();
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function renderStats() {
  const total    = _allTickets.length;
  const activos  = _allTickets.filter(t => ['abierto','en_proceso','en_revision'].includes(t.estado)).length;
  const resueltos = _allTickets.filter(t => t.estado === 'resuelto').length;

  document.getElementById('ut-stats').innerHTML = `
    <div class="ut-stat" style="--stat-color:#285a48;--stat-icon-bg:rgba(40,90,72,0.1)">
      <div class="ut-stat__icon">
        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
          <path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0-6a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="ut-stat__content">
        <div class="ut-stat__value">${total}</div>
        <div class="ut-stat__label">Tickets totales</div>
      </div>
    </div>
    <div class="ut-stat" style="--stat-color:#2c5282;--stat-icon-bg:rgba(44,82,130,0.1)">
      <div class="ut-stat__icon">
        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="ut-stat__content">
        <div class="ut-stat__value">${activos}</div>
        <div class="ut-stat__label">En curso</div>
      </div>
    </div>
    <div class="ut-stat" style="--stat-color:#408a71;--stat-icon-bg:rgba(64,138,113,0.1)">
      <div class="ut-stat__icon">
        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="ut-stat__content">
        <div class="ut-stat__value">${resueltos}</div>
        <div class="ut-stat__label">Resueltos</div>
      </div>
    </div>`;
}

// ── Lista de tickets ──────────────────────────────────────────────────────────
function renderList() {
  const wrap = document.getElementById('ut-list');

  if (!_filteredTickets.length) {
    wrap.innerHTML = _renderEmpty(false);
    return;
  }

  wrap.innerHTML = _filteredTickets.map(t => {
    const titulo    = t.titulo.length > 70 ? t.titulo.slice(0, 70) + '…' : t.titulo;
    const categoria = CATEGORIA_LABELS[t.categoria] ?? t.categoria;

    return `
      <a class="ut-card ut-card--${t.prioridad}" href="/pages/usuario/detalle-ticket.html?id=${t.id}">
        <div class="ut-card__main">
          <div class="ut-card__id">#${t.id.slice(0, 8)}</div>
          <div class="ut-card__title-row">
            <span class="priority-dot priority-dot--${t.prioridad}"></span>
            <span class="ut-card__title" title="${t.titulo}">${titulo}</span>
          </div>
          <div class="ut-card__meta">
            <span class="ut-card__meta-item">
              <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd"/>
              </svg>
              ${formatDate(t.created_at)}
            </span>
            <span>${categoria}</span>
          </div>
        </div>
        <div class="ut-card__badges">
          <span class="badge badge--${t.estado}">${ESTADO_LABELS[t.estado] ?? t.estado}</span>
          <span class="badge badge--${t.prioridad}">${PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad}</span>
        </div>
        <svg class="ut-card__arrow" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd"/>
        </svg>
      </a>`;
  }).join('');
}

function _renderEmpty(esError) {
  if (esError) {
    return `
      <div class="ut-empty">
        <svg viewBox="0 0 20 20" fill="currentColor" width="40" height="40" style="color:var(--color-border)">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        <p>No se pudieron cargar los tickets.</p>
      </div>`;
  }

  const hayFiltros = document.getElementById('filter-search')?.value
    || document.getElementById('filter-estado')?.value;

  if (hayFiltros) {
    return `
      <div class="ut-empty">
        <svg viewBox="0 0 20 20" fill="currentColor" width="36" height="36" style="color:var(--color-border)">
          <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/>
        </svg>
        <div>
          <p class="ut-empty__title">Sin resultados</p>
          <p>Ningún ticket coincide con los filtros actuales.</p>
        </div>
      </div>`;
  }

  return `
    <div class="ut-empty">
      <svg viewBox="0 0 20 20" fill="currentColor" width="44" height="44" style="color:var(--color-border)">
        <path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0-6a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clip-rule="evenodd"/>
      </svg>
      <div>
        <p class="ut-empty__title">Todavía no tienes tickets</p>
        <p>Crea tu primera solicitud y te ayudaremos cuanto antes.</p>
      </div>
      <a href="/pages/usuario/crear-ticket.html" class="btn-crear" style="margin-top:0.5rem">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/>
        </svg>
        Crear mi primer ticket
      </a>
    </div>`;
}

// ── Filtros ───────────────────────────────────────────────────────────────────
function wireFilters() {
  const searchEl  = document.getElementById('filter-search');
  const estadoEl  = document.getElementById('filter-estado');
  const clearBtn  = document.getElementById('filter-clear');

  function onChange() { applyFilters(); updateClearBtn(); }

  searchEl.addEventListener('input', onChange);
  estadoEl.addEventListener('change', onChange);

  clearBtn.addEventListener('click', () => {
    searchEl.value = '';
    estadoEl.value = '';
    applyFilters();
    updateClearBtn();
  });
}

function applyFilters() {
  const search = document.getElementById('filter-search').value.toLowerCase().trim();
  const estado = document.getElementById('filter-estado').value;

  _filteredTickets = _allTickets.filter(t => {
    if (estado && t.estado !== estado) return false;
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
    || document.getElementById('filter-estado').value;
  document.getElementById('filter-clear').style.display = active ? 'flex' : 'none';
}

initMisTickets();
