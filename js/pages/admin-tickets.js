// Admin — vista maestra de tickets con filtros y paginación client-side

const PAGE_SIZE = 25;

const ESTADO_LABELS = {
  abierto:            'Abierto',
  en_progreso:        'En progreso',
  pendiente_revision: 'Pend. revisión',
  resuelto:           'Resuelto',
  cerrado:            'Cerrado',
};

const PRIORIDAD_LABELS = {
  baja:    'Baja',
  media:   'Media',
  alta:    'Alta',
  critica: 'Crítica',
};

// Estado del módulo
let _allTickets  = [];
let _perfilMap   = {};
let _filtered    = [];
let _currentPage = 1;

// ── Inicialización ───────────────────────────────────────────────────────────
async function initTickets() {
  renderTableSkeleton();

  const client = await getSupabaseClient();

  const [ticketsRes, perfilesRes] = await Promise.all([
    client.from('tickets')
      .select('id, titulo, estado, prioridad, created_at, usuario_id, desarrollador_id')
      .order('created_at', { ascending: false }),
    client.from('perfiles').select('id, nombre'),
  ]);

  if (ticketsRes.error || perfilesRes.error) {
    showToast('Error al cargar los tickets.', 'error');
    document.getElementById('tickets-table-wrap').innerHTML =
      `<p class="data-table__empty">No se pudieron cargar los datos.</p>`;
    return;
  }

  _perfilMap  = Object.fromEntries((perfilesRes.data ?? []).map(p => [p.id, p.nombre]));
  _allTickets = ticketsRes.data ?? [];
  _filtered   = [..._allTickets];

  wireFilters();
  applyFilters();
}

// ── Filtros ──────────────────────────────────────────────────────────────────
function wireFilters() {
  const searchEl    = document.getElementById('filter-search');
  const estadoEl    = document.getElementById('filter-estado');
  const prioridadEl = document.getElementById('filter-prioridad');
  const clearBtn    = document.getElementById('filter-clear');

  function onChange() {
    _currentPage = 1;
    applyFilters();
    updateClearBtn();
  }

  searchEl.addEventListener('input', onChange);
  estadoEl.addEventListener('change', onChange);
  prioridadEl.addEventListener('change', onChange);

  clearBtn.addEventListener('click', () => {
    searchEl.value    = '';
    estadoEl.value    = '';
    prioridadEl.value = '';
    _currentPage = 1;
    applyFilters();
    updateClearBtn();
  });
}

function updateClearBtn() {
  const searchEl    = document.getElementById('filter-search');
  const estadoEl    = document.getElementById('filter-estado');
  const prioridadEl = document.getElementById('filter-prioridad');
  const clearBtn    = document.getElementById('filter-clear');
  const active      = searchEl.value || estadoEl.value || prioridadEl.value;
  clearBtn.style.display = active ? 'flex' : 'none';
}

function applyFilters() {
  const search    = document.getElementById('filter-search').value.toLowerCase().trim();
  const estado    = document.getElementById('filter-estado').value;
  const prioridad = document.getElementById('filter-prioridad').value;

  _filtered = _allTickets.filter(t => {
    if (estado    && t.estado    !== estado)    return false;
    if (prioridad && t.prioridad !== prioridad) return false;
    if (search) {
      const hayTitulo = t.titulo.toLowerCase().includes(search);
      const hayId     = t.id.toLowerCase().includes(search);
      if (!hayTitulo && !hayId) return false;
    }
    return true;
  });

  renderTable();
  renderPagination();
  updateCount();
}

// ── Render tabla ─────────────────────────────────────────────────────────────
function renderTableSkeleton() {
  const rows = Array.from({ length: 6 }, () => `
    <tr>
      ${Array.from({ length: 7 }, () =>
        `<td><div style="height:14px; background:#eceeed; border-radius:4px; animation:skeleton-pulse 1.4s ease-in-out infinite;"></div></td>`
      ).join('')}
    </tr>`).join('');

  document.getElementById('tickets-table-wrap').innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>ID</th><th>Título</th><th>Estado</th>
          <th>Prioridad</th><th>Creado por</th><th>Asignado a</th><th>Fecha</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderTable() {
  const wrap  = document.getElementById('tickets-table-wrap');
  const start = (_currentPage - 1) * PAGE_SIZE;
  const page  = _filtered.slice(start, start + PAGE_SIZE);

  if (!page.length) {
    wrap.innerHTML = `<p class="data-table__empty">
      ${_allTickets.length ? 'Ningún ticket coincide con los filtros.' : 'No hay tickets en el sistema.'}
    </p>`;
    return;
  }

  const rows = page.map(t => {
    const creadoPor = t.usuario_id      ? (_perfilMap[t.usuario_id]      ?? 'Desconocido') : '—';
    const asignado  = t.desarrollador_id ? (_perfilMap[t.desarrollador_id] ?? 'Desconocido') : 'Sin asignar';
    const titulo    = t.titulo.length > 45 ? t.titulo.slice(0, 45) + '…' : t.titulo;
    const idShort   = t.id.slice(0, 8);

    return `
      <tr title="${t.titulo}">
        <td class="data-table__id"   data-label="ID">#${idShort}</td>
        <td class="data-table__titulo" data-label="Título">${titulo}</td>
        <td data-label="Estado">
          <span class="badge badge--${t.estado}">${ESTADO_LABELS[t.estado] ?? t.estado}</span>
        </td>
        <td data-label="Prioridad">
          <span class="badge badge--${t.prioridad}">${PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad}</span>
        </td>
        <td data-label="Creado por">${creadoPor}</td>
        <td data-label="Asignado a" style="color:${t.desarrollador_id ? 'inherit' : 'var(--color-text-muted)'}">
          ${asignado}
        </td>
        <td data-label="Fecha" class="tickets-date">${formatDate(t.created_at)}</td>
      </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Título</th>
          <th>Estado</th>
          <th>Prioridad</th>
          <th>Creado por</th>
          <th>Asignado a</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Paginación ───────────────────────────────────────────────────────────────
function renderPagination() {
  const total    = _filtered.length;
  const pages    = Math.ceil(total / PAGE_SIZE);
  const paginEl  = document.getElementById('pagination');
  const prevBtn  = document.getElementById('page-prev');
  const nextBtn  = document.getElementById('page-next');
  const infoEl   = document.getElementById('page-info');

  if (pages <= 1) {
    paginEl.style.display = 'none';
    return;
  }

  paginEl.style.display = 'flex';
  infoEl.textContent    = `Página ${_currentPage} de ${pages}`;
  prevBtn.disabled      = _currentPage === 1;
  nextBtn.disabled      = _currentPage === pages;

  prevBtn.onclick = () => { if (_currentPage > 1)     { _currentPage--; renderTable(); renderPagination(); scrollToTop(); } };
  nextBtn.onclick = () => { if (_currentPage < pages) { _currentPage++; renderTable(); renderPagination(); scrollToTop(); } };
}

function scrollToTop() {
  document.querySelector('.page-content').scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Contador de resultados ───────────────────────────────────────────────────
function updateCount() {
  const total    = _allTickets.length;
  const showing  = _filtered.length;
  const countEl  = document.getElementById('tickets-count');

  if (showing === total) {
    countEl.textContent = `${total} ticket${total !== 1 ? 's' : ''} en el sistema`;
  } else {
    countEl.textContent = `${showing} de ${total} ticket${total !== 1 ? 's' : ''} (filtrado)`;
  }
}

initTickets();
