// Detalle de ticket — vista exclusiva del revisor de código

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

const LANG_LABELS = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
  java: 'Java', cpp: 'C++', csharp: 'C#', php: 'PHP',
  html: 'HTML', css: 'CSS', sql: 'SQL', bash: 'Bash', otro: 'Otro',
};

const SCORE_COLORS = {
  1: { color: '#e05252', bg: '#fdf0f0', label: 'Grave'    },
  2: { color: '#c8783a', bg: '#fdf5ee', label: 'Moderado' },
  3: { color: '#b8a030', bg: '#fdfbee', label: 'Regular'  },
  4: { color: '#5a9a6a', bg: '#eff7f2', label: 'Bueno'    },
  5: { color: '#285a48', bg: '#e8f4ef', label: 'Óptimo'   },
};

const CRITERIOS_LIST = [
  { key: 'error_logico',             label: 'Error lógico'                },
  { key: 'error_sintaxis',           label: 'Error de sintaxis'           },
  { key: 'uso_inadecuado_vars',      label: 'Uso inadecuado de variables' },
  { key: 'validaciones_incompletas', label: 'Validaciones incompletas'    },
  { key: 'organizacion_deficiente',  label: 'Organización deficiente'     },
  { key: 'malas_practicas',          label: 'Malas prácticas'             },
];

// Estado del módulo
let _supaClient = null;
let _userId     = null;
let _ticket     = null;
let _revision   = null;
let _perfilMap  = {};
let _ticketId   = null;

// ── Inicialización ───────────────────────────────────────────────────────────
async function initDetalleRevisor() {
  _ticketId = new URLSearchParams(window.location.search).get('id');

  if (!_ticketId) {
    renderError('No se especificó un ticket.');
    return;
  }

  _supaClient = await getSupabaseClient();
  _userId     = (await getUser())?.id;
  const rol   = await getRol();

  if (rol !== 'revisor_codigo') {
    window.location.replace(`/pages/agente/detalle-ticket.html?id=${_ticketId}`);
    return;
  }

  const [ticketRes, perfilesRes, obsRes, revRes] = await Promise.all([
    _supaClient
      .from('tickets')
      .select('id, titulo, descripcion, estado, prioridad, categoria, fragmentos_codigo, correccion_codigo, usuario_id, desarrollador_id, revisor_id, created_at, updated_at')
      .eq('id', _ticketId)
      .single(),
    _supaClient.from('perfiles').select('id, nombre, email'),
    _supaClient
      .from('observaciones')
      .select('id, contenido, autor_id, fragmento_codigo, created_at')
      .eq('ticket_id', _ticketId)
      .eq('privado', true)
      .order('created_at', { ascending: true }),
    _supaClient
      .from('revision_codigo')
      .select('*')
      .eq('ticket_id', _ticketId)
      .maybeSingle(),
  ]);

  if (ticketRes.error || !ticketRes.data) {
    renderError('Ticket no encontrado o sin acceso.');
    return;
  }

  _perfilMap = Object.fromEntries((perfilesRes.data ?? []).map(p => [p.id, p.nombre ?? p.email]));
  _ticket    = ticketRes.data;
  _revision  = revRes.data ?? null;

  renderDetalleRevisor(obsRes.data ?? []);
}

// ── Barra de progreso ────────────────────────────────────────────────────────
function _renderProgress(estado) {
  const steps  = ['abierto', 'en_proceso', 'en_revision', 'resuelto'];
  const labels = ['Abierto', 'En proceso', 'En revisión', 'Resuelto'];
  const idx    = steps.indexOf(estado);
  const fillPct = idx >= 0 ? (idx / (steps.length - 1)) * 100 : 0;

  const dots = steps.map((_, i) => {
    const cls = i < idx ? '--done' : i === idx ? '--active' : '';
    return `<div class="detalle-progress__dot${cls ? ` detalle-progress__dot${cls}` : ''}"></div>`;
  }).join('');

  const lbls = steps.map((_, i) => {
    const cls = i < idx ? '--done' : i === idx ? '--active' : '';
    return `<span class="detalle-progress__step-label${cls ? ` detalle-progress__step-label${cls}` : ''}">${labels[i]}</span>`;
  }).join('');

  return `
    <div class="detalle-progress">
      <div class="detalle-progress__bar">
        <div class="detalle-progress__line">
          <div class="detalle-progress__line-fill" style="width:${fillPct}%"></div>
        </div>
        ${dots}
      </div>
      <div class="detalle-progress__labels">${lbls}</div>
    </div>`;
}

// ── Render principal ─────────────────────────────────────────────────────────
function renderDetalleRevisor(observaciones) {
  const t = _ticket;

  document.getElementById('revisor-wrap').innerHTML = `
    <!-- Cabecera -->
    <div class="detalle-header-card revisor-header-card">
      <div class="revisor-header-top">
        <div>
          <h1 class="detalle-title">${t.titulo}</h1>
          <div class="detalle-badges">
            <span class="badge badge--${t.estado}">${ESTADO_LABELS[t.estado] ?? t.estado}</span>
            <span class="badge badge--${t.prioridad}">${PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad}</span>
            <span class="badge" style="background:#f4f0ec;color:#7a6858">${CATEGORIA_LABELS[t.categoria] ?? t.categoria}</span>
          </div>
        </div>
        <a href="/pages/agente/revision-codigo.html?id=${t.id}" class="revisor-eval-btn">
          <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
            <path fill-rule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06L6.56 10l1.72-1.72zm4.5-1.06a.75.75 0 10-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clip-rule="evenodd"/>
          </svg>
          ${_revision ? 'Editar evaluación' : 'Iniciar evaluación'}
        </a>
      </div>
      <div class="detalle-meta">
        <span class="detalle-meta-item">
          <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z"/>
          </svg>
          Creado por: <strong>${_perfilMap[t.usuario_id] ?? 'Usuario'}</strong>
        </span>
        ${t.desarrollador_id ? `
        <span class="detalle-meta-item">
          <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z"/>
          </svg>
          Desarrollador: <strong>${_perfilMap[t.desarrollador_id] ?? '—'}</strong>
        </span>` : ''}
        <span class="detalle-meta-item">
          <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
            <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd"/>
          </svg>
          ${formatDate(t.created_at)}
        </span>
      </div>
      ${_renderProgress(t.estado)}
    </div>

    <div class="revisor-layout">

      <!-- Columna principal -->
      <div class="revisor-main">

        <!-- Descripción -->
        <div class="detalle-desc revisor-desc">
          <div class="detalle-section-title">Descripción del ticket</div>
          <p class="detalle-desc__text">${t.descripcion ?? 'Sin descripción.'}</p>
        </div>

        <!-- Código para evaluar (original y/o corrección del desarrollador) -->
        ${t.categoria === 'revision_codigo'
          ? _renderCodigoParaRevisar()
          : ''}

        <!-- Resumen de evaluación guardada -->
        ${_renderEvaluacionResumen()}

        <!-- Canal privado con el desarrollador -->
        <div class="detalle-obs detalle-obs--revisor">
          <div class="detalle-obs__head">
            <div class="detalle-obs__head-left">
              <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd"/>
              </svg>
              <span class="detalle-section-title" style="margin:0">Canal con el desarrollador</span>
            </div>
            <span id="obs-count" style="font-size:0.8rem;color:var(--color-text-muted)">${observaciones.length}</span>
          </div>
          <div class="detalle-obs__list" id="obs-list">
            ${_renderObservaciones(observaciones)}
          </div>
          <div class="detalle-obs__form">
            <div class="obs-form-inner">
              <textarea id="obs-input" class="obs-textarea" placeholder="Escribe al desarrollador…" rows="2"></textarea>
              <button type="button" id="obs-codigo-toggle-btn" class="obs-codigo-toggle-btn">
                <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                  <path fill-rule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06L6.56 10l1.72-1.72zm4.5-1.06a.75.75 0 10-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clip-rule="evenodd"/>
                </svg>
                <span id="obs-codigo-toggle-label">Adjuntar código</span>
              </button>
              <div id="obs-codigo-wrap" class="obs-codigo-wrap obs-codigo-wrap--hidden">
                <select id="obs-codigo-lang" class="obs-codigo-lang">
                  ${Object.entries(LANG_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
                </select>
                <textarea id="obs-codigo-input" class="obs-codigo-textarea" placeholder="Pega el código…" rows="5"></textarea>
              </div>
            </div>
            <button class="obs-submit-btn" id="obs-submit-btn">Enviar</button>
          </div>
        </div>

      </div>

      <!-- Panel lateral -->
      <div class="revisor-panel">

        <!-- Acciones -->
        <div class="detalle-panel-card">
          <div class="detalle-panel-card__head">Acciones</div>
          <div class="detalle-panel-card__body">
            <div id="acciones-wrap">
              ${_renderAcciones()}
            </div>
          </div>
        </div>

        <!-- Información -->
        <div class="detalle-panel-card">
          <div class="detalle-panel-card__head">Información</div>
          <div class="detalle-panel-card__body">
            <div class="detalle-panel-row">
              <span class="detalle-panel-row__label">Estado</span>
              <span class="detalle-panel-row__value">
                <span class="badge badge--${t.estado}">${ESTADO_LABELS[t.estado] ?? t.estado}</span>
              </span>
            </div>
            <div class="detalle-panel-row">
              <span class="detalle-panel-row__label">Prioridad</span>
              <span class="detalle-panel-row__value">
                <span class="badge badge--${t.prioridad}">${PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad}</span>
              </span>
            </div>
            <div class="detalle-panel-row">
              <span class="detalle-panel-row__label">Última actualización</span>
              <span class="detalle-panel-row__value">${formatDate(t.updated_at)}</span>
            </div>
            <div class="detalle-panel-row">
              <span class="detalle-panel-row__label">Evaluación</span>
              <span class="detalle-panel-row__value">
                ${_revision
                  ? `<span class="badge badge--${_revision.resultado ?? 'pendiente'}">${_revision.resultado === 'aprobado' ? 'Aprobado' : _revision.resultado === 'rechazado' ? 'Rechazado' : 'Pendiente'}</span>`
                  : `<span style="font-size:0.8rem;color:var(--color-text-muted)">Sin evaluar</span>`}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>`;

  wireObservaciones();
  wireAcciones();
  _wireCopyBtns();
  _wireCodigoToggle();
}

// ── Código para evaluar: original y/o corrección del desarrollador ───────────
function _renderCodigoParaRevisar() {
  const corr = _ticket.correccion_codigo;
  const orig = _ticket.fragmentos_codigo ?? [];

  if (!corr && !orig.length) return '';

  let html = `<div class="detalle-section">
    <div class="detalle-section__head">
      <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
        <path fill-rule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06L6.56 10l1.72-1.72zm4.5-1.06a.75.75 0 10-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clip-rule="evenodd"/>
      </svg>
      Código para evaluar
    </div>`;

  if (!corr || corr.incluir_original) {
    if (orig.length) {
      html += `<div class="revisor-codigo-label">Código original del usuario</div>`;
      orig.forEach(f => { html += _renderFragmentoBloque(f); });
    }
  }

  if (corr?.codigo) {
    html += `<div class="revisor-codigo-label revisor-codigo-label--corr">Corrección del desarrollador</div>`;
    html += _renderFragmentoBloque({ lenguaje: corr.lenguaje, codigo: corr.codigo });
  }

  html += `</div>`;
  return html;
}

function _renderFragmentoBloque(f) {
  const lang    = LANG_LABELS[f.lenguaje] ?? f.lenguaje ?? 'Código';
  const escaped = (f.codigo ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `
    <div class="du-fragmento">
      <div class="du-fragmento__header">
        <span class="du-fragmento__lang">${lang}</span>
        <button type="button" class="du-fragmento__copy" data-codigo="${encodeURIComponent(f.codigo ?? '')}">
          <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
            <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"/>
            <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"/>
          </svg>
          Copiar
        </button>
      </div>
      <pre class="du-fragmento__pre"><code>${escaped}</code></pre>
    </div>`;
}

// ── Fragmentos del usuario (solo lectura) ────────────────────────────────────
function _renderFragmentosCodigo(fragmentos) {
  const items = fragmentos.map((f, i) => {
    const lang    = LANG_LABELS[f.lenguaje] ?? f.lenguaje ?? 'Código';
    const escaped = (f.codigo ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `
      <div class="du-fragmento">
        <div class="du-fragmento__header">
          <span class="du-fragmento__lang">${lang}</span>
          <button type="button" class="du-fragmento__copy" data-codigo="${encodeURIComponent(f.codigo ?? '')}">
            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
              <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"/>
              <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"/>
            </svg>
            Copiar
          </button>
        </div>
        <pre class="du-fragmento__pre"><code>${escaped}</code></pre>
      </div>`;
  }).join('');

  return `
    <div class="detalle-desc revisor-code-section">
      <div class="detalle-section-title">Código enviado por el usuario</div>
      ${items}
    </div>`;
}

// ── Resumen de evaluación guardada ───────────────────────────────────────────
function _renderEvaluacionResumen() {
  if (!_revision) {
    return `
      <div class="revisor-eval-empty">
        <svg viewBox="0 0 20 20" fill="currentColor" width="28" height="28">
          <path fill-rule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06L6.56 10l1.72-1.72zm4.5-1.06a.75.75 0 10-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clip-rule="evenodd"/>
        </svg>
        <p>Aún no has evaluado este ticket.</p>
        <a href="/pages/agente/revision-codigo.html?id=${_ticket.id}" class="revisor-eval-link-btn">Ir al formulario de evaluación</a>
      </div>`;
  }

  const RESULTADO_CONFIG = {
    pendiente: { color: '#9a8678', bg: '#f8f4f0', label: 'Pendiente', icon: '⏳' },
    aprobado:  { color: '#285a48', bg: '#e8f4ef', label: 'Aprobado',  icon: '✓'  },
    rechazado: { color: '#e05252', bg: '#fdf0f0', label: 'Rechazado', icon: '✕'  },
  };

  const resultado = _revision.resultado ?? 'pendiente';
  const rConfig   = RESULTADO_CONFIG[resultado];
  const fecha     = formatDate(_revision.updated_at ?? _revision.created_at);

  const puntuados = CRITERIOS_LIST.filter(c => _revision[`puntuacion_${c.key}`]);
  const promedio  = puntuados.length
    ? (puntuados.reduce((sum, c) => sum + _revision[`puntuacion_${c.key}`], 0) / puntuados.length).toFixed(1)
    : null;

  const criteriosHTML = CRITERIOS_LIST.map(c => {
    const p      = _revision[`puntuacion_${c.key}`];
    const sc     = p ? SCORE_COLORS[p] : null;
    const chip   = p
      ? `<span class="informe-score-chip" style="background:${sc.bg};color:${sc.color};border-color:${sc.color}">${p}/5</span>`
      : `<span class="informe-score-chip informe-score-chip--empty">—</span>`;
    return `
      <div class="revisor-eval-row">
        <span class="revisor-eval-row__label">${c.label}</span>
        ${chip}
      </div>`;
  }).join('');

  return `
    <div class="revisor-eval-card">
      <div class="revisor-eval-card__head">
        <span class="detalle-section-title" style="margin:0">Mi evaluación</span>
        <div style="display:flex;align-items:center;gap:0.75rem">
          ${promedio ? `<span class="revisor-eval-avg">Promedio: <strong>${promedio}/5</strong></span>` : ''}
          <a href="/pages/agente/revision-codigo.html?id=${_ticket.id}" class="revisor-eval-edit-link">Editar</a>
        </div>
      </div>
      <div class="revisor-eval-resultado" style="background:${rConfig.bg};border-color:${rConfig.color};color:${rConfig.color}">
        <span>${rConfig.icon}</span>
        <span>${rConfig.label}</span>
        <span class="revisor-eval-fecha">${fecha}</span>
      </div>
      <div class="revisor-eval-criterios">
        ${criteriosHTML}
      </div>
      ${_revision.observacion_general ? `
        <div class="revisor-eval-obs">
          <span class="revisor-eval-obs__label">Observación general</span>
          <p class="revisor-eval-obs__text">${_revision.observacion_general}</p>
        </div>` : ''}
    </div>`;
}

// ── Observaciones (canal privado) ────────────────────────────────────────────
function _renderObservaciones(obs) {
  if (!obs.length) return `<div class="obs-empty">Sin notas internas aún. Inicia la conversación con el desarrollador.</div>`;

  return obs.map(o => {
    const esPropia  = o.autor_id === _userId;
    const nombre    = esPropia ? 'Tú' : (_perfilMap[o.autor_id] ?? 'Agente');
    const iniciales = (_perfilMap[o.autor_id] ?? 'A').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
    const tiempo    = _relativeTime(o.created_at);
    const color     = _avatarColor(o.autor_id);

    return `
      <div class="obs-item${esPropia ? ' obs-item--own' : ''}">
        <div class="obs-item__avatar" style="background:${color}">${iniciales}</div>
        <div class="obs-item__body">
          <div class="obs-item__header">
            <span class="obs-item__author">${nombre}</span>
            <span class="obs-item__time">${tiempo}</span>
          </div>
          <p class="obs-item__text">${o.contenido}</p>
          ${o.fragmento_codigo ? _renderObsCodigo(o.fragmento_codigo) : ''}
        </div>
      </div>`;
  }).join('');
}

function wireObservaciones() {
  document.getElementById('obs-submit-btn').addEventListener('click', async () => {
    const input    = document.getElementById('obs-input');
    const contenido = input.value.trim();
    if (!contenido) return;

    const codigoWrap  = document.getElementById('obs-codigo-wrap');
    const codigoInput = document.getElementById('obs-codigo-input');
    const codigoLang  = document.getElementById('obs-codigo-lang');
    let fragmentoCodigo = null;
    if (codigoWrap && !codigoWrap.classList.contains('obs-codigo-wrap--hidden') && codigoInput?.value.trim()) {
      fragmentoCodigo = { lenguaje: codigoLang?.value ?? 'otro', codigo: codigoInput.value.trim() };
    }

    const btn = document.getElementById('obs-submit-btn');
    btn.disabled    = true;
    btn.textContent = 'Enviando…';

    const { data, error } = await _supaClient
      .from('observaciones')
      .insert({ ticket_id: _ticketId, autor_id: _userId, contenido, privado: true, fragmento_codigo: fragmentoCodigo })
      .select('id, contenido, autor_id, fragmento_codigo, created_at')
      .single();

    if (error) {
      showToast('No se pudo enviar la nota.', 'error');
    } else {
      input.value = '';
      if (codigoInput) codigoInput.value = '';
      if (codigoWrap) codigoWrap.classList.add('obs-codigo-wrap--hidden');
      const toggleLabel = document.getElementById('obs-codigo-toggle-label');
      if (toggleLabel) toggleLabel.textContent = 'Adjuntar código';

      const list      = document.getElementById('obs-list');
      const iniciales = (_perfilMap[_userId] ?? 'R').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
      const color     = _avatarColor(_userId);
      list.querySelector('.obs-empty')?.remove();
      list.insertAdjacentHTML('beforeend', `
        <div class="obs-item obs-item--own">
          <div class="obs-item__avatar" style="background:${color}">${iniciales}</div>
          <div class="obs-item__body">
            <div class="obs-item__header">
              <span class="obs-item__author">Tú</span>
              <span class="obs-item__time">Ahora mismo</span>
            </div>
            <p class="obs-item__text">${data.contenido}</p>
            ${data.fragmento_codigo ? _renderObsCodigo(data.fragmento_codigo) : ''}
          </div>
        </div>`);
      list.scrollTop = list.scrollHeight;
      const countEl = document.getElementById('obs-count');
      if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
    }

    btn.disabled    = false;
    btn.textContent = 'Enviar';
  });
}

// ── Acciones ─────────────────────────────────────────────────────────────────
function _renderAcciones() {
  const t   = _ticket;
  const est = t.estado;

  if (['resuelto', 'cerrado'].includes(est)) {
    return `
      <div class="detalle-readonly-msg">
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
        </svg>
        <span>Ticket ${est === 'resuelto' ? 'resuelto' : 'cerrado'} — solo lectura</span>
      </div>`;
  }

  const btns = [];

  if (est === 'en_revision') {
    btns.push({
      label:  'Aprobar',
      desc:   'Marcar la revisión como aprobada',
      accion: 'aprobar',
      clase:  'primary',
      icon: `<svg class="detalle-action-btn__icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>`,
    });
    btns.push({
      label:  'Rechazar — devolver',
      desc:   'Devolver al desarrollador (en proceso)',
      accion: 'rechazar',
      clase:  'danger',
      icon: `<svg class="detalle-action-btn__icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clip-rule="evenodd"/></svg>`,
    });
    btns.push({
      label:  'Marcar pendiente',
      desc:   'Dejar la revisión en espera',
      accion: 'pendiente',
      clase:  'secondary',
      icon: `<svg class="detalle-action-btn__icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0V8.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L6.2 9.74a.75.75 0 101.1 1.02l1.95-2.1v4.59z" clip-rule="evenodd"/></svg>`,
    });
  }

  btns.push({
    label: _revision ? 'Editar evaluación' : 'Iniciar evaluación',
    desc:  'Abrir el formulario de revisión de código',
    href:  `/pages/agente/revision-codigo.html?id=${t.id}`,
    clase: 'link',
    icon: `<svg class="detalle-action-btn__icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06L6.56 10l1.72-1.72zm4.5-1.06a.75.75 0 10-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clip-rule="evenodd"/></svg>`,
  });

  return btns.map(b => {
    const inner = `
      ${b.icon}
      <div class="detalle-action-btn__content">
        <span class="detalle-action-btn__text">${b.label}</span>
        <span class="detalle-action-btn__desc">${b.desc}</span>
      </div>`;
    if (b.href) {
      return `<a href="${b.href}" class="detalle-action-btn detalle-action-btn--${b.clase}">${inner}</a>`;
    }
    return `<button class="detalle-action-btn detalle-action-btn--${b.clase}" data-accion="${b.accion}">${inner}</button>`;
  }).join('');
}

function wireAcciones() {
  document.getElementById('acciones-wrap').addEventListener('click', async e => {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;

    const accion = btn.dataset.accion;
    btn.disabled    = true;
    btn.textContent = 'Actualizando…';

    const resultadoMap = { aprobar: 'aprobado', rechazar: 'rechazado', pendiente: 'pendiente' };
    const resultado    = resultadoMap[accion];

    // Upsert en revision_codigo (aprobar, rechazar y pendiente actualizan la revisión)
    const { error: revError } = await _supaClient.from('revision_codigo').upsert({
      ticket_id:  _ticketId,
      revisor_id: _userId,
      resultado,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'ticket_id' });

    if (revError) {
      showToast('No se pudo actualizar la revisión.', 'error');
      document.getElementById('acciones-wrap').innerHTML = _renderAcciones();
      wireAcciones();
      return;
    }

    // Solo "rechazar" cambia el estado del ticket
    if (accion === 'rechazar') {
      const { error: ticketError } = await _supaClient
        .from('tickets')
        .update({ estado: 'en_proceso', updated_at: new Date().toISOString() })
        .eq('id', _ticketId);

      if (ticketError) {
        showToast('No se pudo devolver el ticket.', 'error');
      } else {
        _ticket.estado = 'en_proceso';
        showToast('Ticket devuelto al desarrollador.', 'success');
        const progressEl = document.querySelector('.detalle-progress');
        if (progressEl) progressEl.outerHTML = _renderProgress('en_proceso');
        document.querySelectorAll('.detalle-badges .badge, .detalle-panel-row .badge').forEach(el => {
          if (Object.keys(ESTADO_LABELS).some(k => el.classList.contains(`badge--${k}`))) {
            el.className   = 'badge badge--en_proceso';
            el.textContent = ESTADO_LABELS['en_proceso'];
          }
        });
      }
    } else {
      showToast(accion === 'aprobar' ? 'Revisión aprobada.' : 'Revisión marcada como pendiente.', 'success');
    }

    if (!_revision) _revision = {};
    _revision.resultado = resultado;

    document.getElementById('acciones-wrap').innerHTML = _renderAcciones();
    wireAcciones();
  });
}

// ── Código adjunto en obs ─────────────────────────────────────────────────────
function _renderObsCodigo(fragmento) {
  const lang    = LANG_LABELS[fragmento?.lenguaje] ?? fragmento?.lenguaje ?? 'Código';
  const escaped = (fragmento?.codigo ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `
    <div class="obs-codigo-block">
      <div class="obs-codigo-block__header">
        <span class="obs-codigo-block__lang">${lang}</span>
      </div>
      <pre class="obs-codigo-block__pre"><code>${escaped}</code></pre>
    </div>`;
}

function _wireCodigoToggle() {
  const btn  = document.getElementById('obs-codigo-toggle-btn');
  const wrap = document.getElementById('obs-codigo-wrap');
  if (!btn || !wrap) return;

  btn.addEventListener('click', () => {
    const opening = wrap.classList.contains('obs-codigo-wrap--hidden');
    wrap.classList.toggle('obs-codigo-wrap--hidden');
    const labelEl = document.getElementById('obs-codigo-toggle-label');
    if (labelEl) labelEl.textContent = opening ? 'Quitar código' : 'Adjuntar código';
    if (opening) document.getElementById('obs-codigo-input')?.focus();
  });
}

function _wireCopyBtns() {
  document.querySelectorAll('.du-fragmento__copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const codigo = decodeURIComponent(btn.dataset.codigo);
      navigator.clipboard.writeText(codigo).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg> ¡Copiado!`;
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      });
    });
  });
}

// ── Error ─────────────────────────────────────────────────────────────────────
function renderError(msg) {
  document.getElementById('revisor-wrap').innerHTML = `
    <div class="bandeja-empty">
      <svg viewBox="0 0 20 20" fill="currentColor" width="36" height="36" style="color:var(--color-border)">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
      </svg>
      <p>${msg}</p>
    </div>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function _avatarColor(id) {
  const palette = ['#285a48', '#408a71', '#2c5282', '#7a5a36', '#9a5252', '#5a6828'];
  let hash = 0;
  for (let i = 0; i < (id ?? '').length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

initDetalleRevisor();
