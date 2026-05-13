// Dashboard admin — estadísticas globales, tickets recientes, distribución de usuarios

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

const ROL_LABELS = {
  admin:          'Administrador',
  desarrollador:  'Desarrollador',
  revisor_codigo: 'Revisor de código',
  usuario:        'Usuario',
};

const ROL_COLORS = {
  admin:          '#285a48',
  desarrollador:  '#2c5282',
  revisor_codigo: '#7a5a36',
  usuario:        '#408a71',
};

const ESTADO_COLORS = {
  abierto:            '#408a71',
  en_progreso:        '#2c5282',
  pendiente_revision: '#c4822a',
  resuelto:           '#285a48',
  cerrado:            '#9a8678',
};

// ── Iconos SVG inline ────────────────────────────────────────────────────────
const ICONS = {
  total:      `<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0-6a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clip-rule="evenodd"/></svg>`,
  abiertos:   `<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>`,
  progreso:   `<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd"/></svg>`,
  resueltos:  `<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>`,
};

// ── Entry point ──────────────────────────────────────────────────────────────
async function initDashboard() {
  // Fecha actual en el header
  document.getElementById('dash-fecha').textContent = new Intl.DateTimeFormat('es', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date());

  const client = await getSupabaseClient();

  // Carga paralela de todas las fuentes de datos
  const [ticketsRes, perfilesRes] = await Promise.all([
    client.from('tickets').select('id, titulo, estado, prioridad, created_at, usuario_id, desarrollador_id'),
    client.from('perfiles').select('id, nombre, rol'),
  ]);

  if (ticketsRes.error)  { showToast('Error cargando tickets.',  'error'); }
  if (perfilesRes.error) { showToast('Error cargando usuarios.', 'error'); }

  const tickets  = ticketsRes.data  ?? [];
  const perfiles = perfilesRes.data ?? [];

  // Mapa rápido id → nombre para resolución de asignados
  const perfilMap = Object.fromEntries(perfiles.map(p => [p.id, p.nombre]));

  renderStats(tickets);
  renderRecentTickets(tickets.slice().sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  ).slice(0, 8), perfilMap);
  renderUsersByRole(perfiles);
  renderStatusBreakdown(tickets);
}

// ── Stat cards con GSAP count-up ─────────────────────────────────────────────
function renderStats(tickets) {
  const counts = {
    total:      tickets.length,
    abiertos:   tickets.filter(t => t.estado === 'abierto').length,
    progreso:   tickets.filter(t => t.estado === 'en_progreso' || t.estado === 'pendiente_revision').length,
    resueltos:  tickets.filter(t => t.estado === 'resuelto' || t.estado === 'cerrado').length,
  };

  const config = [
    {
      key: 'total', label: 'Total tickets', icon: ICONS.total,
      accent: '#408a71', bg: 'rgba(64,138,113,0.1)',
    },
    {
      key: 'abiertos', label: 'Abiertos', icon: ICONS.abiertos,
      accent: '#e05252', bg: 'rgba(224,82,82,0.1)',
    },
    {
      key: 'progreso', label: 'En progreso', icon: ICONS.progreso,
      accent: '#2c5282', bg: 'rgba(44,82,130,0.1)',
    },
    {
      key: 'resueltos', label: 'Resueltos', icon: ICONS.resueltos,
      accent: '#285a48', bg: 'rgba(40,90,72,0.1)',
    },
  ];

  document.getElementById('stat-grid').innerHTML = config.map(c => `
    <div class="stat-card" style="--card-accent:${c.accent}; --card-accent-bg:${c.bg}">
      <div class="stat-card__icon">${c.icon}</div>
      <div class="stat-card__value" data-target="${counts[c.key]}">0</div>
      <div class="stat-card__label">${c.label}</div>
    </div>
  `).join('');

  // Count-up con GSAP
  document.querySelectorAll('.stat-card__value[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    gsap.to({ val: 0 }, {
      val: target,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate() { el.textContent = Math.round(this.targets()[0].val); },
      onComplete() { el.textContent = target; },
    });
  });

  gsap.from('.stat-card', {
    opacity: 0, y: 20, duration: 0.45, stagger: 0.08, ease: 'power2.out',
  });
}

// ── Tabla de tickets recientes ───────────────────────────────────────────────
function renderRecentTickets(tickets, perfilMap) {
  const container = document.getElementById('recent-tickets');

  if (!tickets.length) {
    container.innerHTML = `<p class="data-table__empty">No hay tickets aún.</p>`;
    return;
  }

  const rows = tickets.map(t => {
    const asignado = t.desarrollador_id ? (perfilMap[t.desarrollador_id] ?? 'Usuario eliminado') : 'Sin asignar';
    const fecha    = formatDate(t.created_at);
    const idShort  = t.id.slice(0, 8);
    const titulo   = t.titulo.length > 40 ? t.titulo.slice(0, 40) + '…' : t.titulo;

    return `
      <tr onclick="window.location='/pages/admin/tickets.html?id=${t.id}'" title="${t.titulo}">
        <td class="data-table__id" data-label="ID">#${idShort}</td>
        <td class="data-table__titulo" data-label="Título">${titulo}</td>
        <td data-label="Estado"><span class="badge badge--${t.estado}">${ESTADO_LABELS[t.estado] ?? t.estado}</span></td>
        <td data-label="Prioridad"><span class="badge badge--${t.prioridad}">${PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad}</span></td>
        <td data-label="Asignado">${asignado}</td>
        <td data-label="Fecha" style="white-space:nowrap; color: var(--color-text-muted); font-size:0.8rem;">${fecha}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Título</th>
          <th>Estado</th>
          <th>Prioridad</th>
          <th>Asignado a</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  gsap.from('#recent-tickets .data-table tbody tr', {
    opacity: 0, x: -12, duration: 0.35, stagger: 0.04, ease: 'power2.out', delay: 0.2,
  });
}

// ── Usuarios por rol ─────────────────────────────────────────────────────────
function renderUsersByRole(perfiles) {
  const counts = {};
  perfiles.forEach(p => { counts[p.rol] = (counts[p.rol] ?? 0) + 1; });

  const total  = perfiles.length || 1;
  const orden  = ['admin', 'desarrollador', 'revisor_codigo', 'usuario'];

  const items = orden
    .filter(rol => counts[rol])
    .map(rol => {
      const n    = counts[rol] ?? 0;
      const pct  = Math.round((n / total) * 100);
      const color = ROL_COLORS[rol] ?? '#9a8678';
      return `
        <div class="role-item">
          <div class="role-item__dot" style="background:${color}"></div>
          <div class="role-item__info">
            <span class="role-item__name">${ROL_LABELS[rol] ?? rol}</span>
            <div class="role-item__bar-wrap">
              <div class="role-item__bar" style="width:0%; background:${color}" data-w="${pct}"></div>
            </div>
          </div>
          <span class="role-item__count">${n}</span>
        </div>`;
    }).join('') || `<p class="data-table__empty">Sin usuarios.</p>`;

  document.getElementById('users-by-role').innerHTML = `<div class="role-list">${items}</div>`;

  // Animar barras
  document.querySelectorAll('.role-item__bar[data-w]').forEach(bar => {
    setTimeout(() => { bar.style.width = bar.dataset.w + '%'; }, 100);
  });
}

// ── Estado breakdown ─────────────────────────────────────────────────────────
function renderStatusBreakdown(tickets) {
  const total  = tickets.length || 1;
  const orden  = ['abierto', 'en_progreso', 'pendiente_revision', 'resuelto', 'cerrado'];
  const counts = {};
  tickets.forEach(t => { counts[t.estado] = (counts[t.estado] ?? 0) + 1; });

  const items = orden.map(estado => {
    const n    = counts[estado] ?? 0;
    const pct  = Math.round((n / total) * 100);
    const color = ESTADO_COLORS[estado] ?? '#9a8678';
    return `
      <div class="status-item">
        <span class="status-item__label">${ESTADO_LABELS[estado]}</span>
        <div class="status-item__bar-wrap">
          <div class="status-item__bar" style="width:0%; background:${color}" data-w="${pct}"></div>
        </div>
        <span class="status-item__count">${n}</span>
      </div>`;
  }).join('');

  document.getElementById('status-breakdown').innerHTML = `<div class="status-list">${items}</div>`;

  document.querySelectorAll('.status-item__bar[data-w]').forEach(bar => {
    setTimeout(() => { bar.style.width = bar.dataset.w + '%'; }, 150);
  });
}

initDashboard();
