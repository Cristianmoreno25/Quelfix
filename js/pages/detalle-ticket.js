// Detalle de ticket — vista del agente (desarrollador + revisor_codigo)

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

const CRITERIOS_LABELS = {
  error_logico:             'Error lógico',
  error_sintaxis:           'Error de sintaxis',
  uso_inadecuado_vars:      'Uso inadecuado de variables',
  validaciones_incompletas: 'Validaciones incompletas',
  organizacion_deficiente:  'Organización deficiente',
  malas_practicas:          'Malas prácticas',
};

// Estado del módulo
let _supaClient  = null;
let _userId      = null;
let _rol         = null;
let _ticket      = null;
let _revision    = null;
let _perfilMap   = {};
let _ticketId    = null;

// ── Inicialización ───────────────────────────────────────────────────────────
async function initDetalle() {
  _ticketId = new URLSearchParams(window.location.search).get('id');

  if (!_ticketId) {
    renderError('No se especificó un ticket.');
    return;
  }

  _supaClient = await getSupabaseClient();
  _userId     = (await getUser())?.id;
  _rol        = await getRol();

  // El revisor tiene su propia vista dedicada
  if (_rol === 'revisor_codigo') {
    window.location.replace(`/pages/agente/detalle-ticket-revisor.html?id=${_ticketId}`);
    return;
  }

  const [ticketRes, perfilesRes, obsRes, revRes] = await Promise.all([
    _supaClient
      .from('tickets')
      .select('id, titulo, descripcion, estado, prioridad, categoria, resolucion, fragmentos_codigo, correccion_codigo, permitir_codigo_chat, usuario_id, desarrollador_id, revisor_id, created_at, updated_at')
      .eq('id', _ticketId)
      .single(),
    _supaClient.from('perfiles').select('id, nombre, email'),
    _supaClient
      .from('observaciones')
      .select('id, contenido, autor_id, privado, fragmento_codigo, created_at')
      .eq('ticket_id', _ticketId)
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

  renderDetalle(obsRes.data ?? []);
}

// ── Barra de progreso de estado ───────────────────────────────────────────────
function _renderProgress(estado) {
  const steps  = ['abierto', 'en_proceso', 'en_revision', 'resuelto'];
  const labels = ['Abierto', 'En proceso', 'En revisión', 'Resuelto'];
  const idx     = steps.indexOf(estado);
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
function renderDetalle(observaciones) {
  const t           = _ticket;
  const obsPublicas = observaciones.filter(o => !o.privado);
  const obsPrivadas = observaciones.filter(o => o.privado);
  const enRevision  = t.estado === 'en_revision';

  document.getElementById('detalle-wrap').innerHTML = `
    <!-- Cabecera -->
    <div class="detalle-header-card">
      <h1 class="detalle-title">${t.titulo}</h1>
      <div class="detalle-badges">
        <span class="badge badge--${t.estado}">${ESTADO_LABELS[t.estado] ?? t.estado}</span>
        <span class="badge badge--${t.prioridad}">${PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad}</span>
        <span class="badge" style="background:#f4f0ec;color:#7a6858">${CATEGORIA_LABELS[t.categoria] ?? t.categoria}</span>
      </div>
      <div class="detalle-meta">
        <span class="detalle-meta-item">
          <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z"/>
          </svg>
          Creado por: <strong>${_perfilMap[t.usuario_id] ?? 'Usuario'}</strong>
        </span>
        <span class="detalle-meta-item">
          <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
            <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd"/>
          </svg>
          ${formatDate(t.created_at)}
        </span>
        ${t.desarrollador_id ? `<span class="detalle-meta-item">Desarrollador: <strong>${_perfilMap[t.desarrollador_id] ?? '—'}</strong></span>` : ''}
        ${t.revisor_id ? `<span class="detalle-meta-item">Revisor: <strong>${_perfilMap[t.revisor_id] ?? '—'}</strong></span>` : ''}
      </div>
      ${_renderProgress(t.estado)}
    </div>

    <div class="detalle-layout">
      <!-- Columna principal -->
      <div>
        <!-- Descripción -->
        <div class="detalle-desc">
          <div class="detalle-section-title">Descripción</div>
          <p class="detalle-desc__text">${t.descripcion ?? 'Sin descripción.'}</p>
        </div>

        <!-- Código enviado por el usuario -->
        ${t.categoria === 'revision_codigo' && t.fragmentos_codigo?.length
          ? _renderFragmentosUsuario(t.fragmentos_codigo)
          : ''}

        <!-- Corrección del desarrollador (solo revision_codigo) -->
        ${_ticket.categoria === 'revision_codigo' && _rol === 'desarrollador'
          ? _renderSeccionCorreccion()
          : ''}

        <!-- Informe de revisión (solo desarrollador) -->
        ${_rol === 'desarrollador' && _revision
          ? _renderInformeRevision(_revision)
          : ''}

        <!-- Canal público: conversación con el usuario -->
        <div class="detalle-obs">
          <div class="detalle-obs__head">
            <span class="detalle-section-title" style="margin:0">Conversación con el usuario</span>
            <span id="obs-pub-count" style="font-size:0.8rem;color:var(--color-text-muted)">${obsPublicas.length}</span>
          </div>
          <div class="detalle-obs__list" id="obs-pub-list">
            ${_renderObservaciones(obsPublicas, 'Sin mensajes aún. Sé el primero en comentar.')}
          </div>
          <div class="detalle-obs__form">
            <div class="obs-form-inner">
              <textarea id="obs-pub-input" class="obs-textarea" placeholder="Escribe un mensaje al usuario…" rows="2"></textarea>
              <button type="button" id="obs-pub-codigo-toggle-btn" class="obs-codigo-toggle-btn">
                <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                  <path fill-rule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06L6.56 10l1.72-1.72zm4.5-1.06a.75.75 0 10-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clip-rule="evenodd"/>
                </svg>
                <span id="obs-pub-codigo-toggle-label">Adjuntar código</span>
              </button>
              <div id="obs-pub-codigo-wrap" class="obs-codigo-wrap obs-codigo-wrap--hidden">
                <select id="obs-pub-codigo-lang" class="obs-codigo-lang">
                  ${Object.entries(LANG_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
                </select>
                <textarea id="obs-pub-codigo-input" class="obs-codigo-textarea" placeholder="Pega el código aquí…" rows="5"></textarea>
              </div>
            </div>
            <button class="obs-submit-btn" id="obs-pub-submit">Enviar</button>
          </div>
        </div>

        <!-- Canal privado: solo visible en revisión -->
        ${enRevision ? `
        <div class="detalle-obs detalle-obs--revisor">
          <div class="detalle-obs__head">
            <div class="detalle-obs__head-left">
              <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd"/>
              </svg>
              <span class="detalle-section-title" style="margin:0">Canal con el revisor</span>
            </div>
            <span id="obs-priv-count" style="font-size:0.8rem;color:var(--color-text-muted)">${obsPrivadas.length}</span>
          </div>
          <div class="detalle-obs__list" id="obs-priv-list">
            ${_renderObservaciones(obsPrivadas, 'Sin notas internas aún.')}
          </div>
          <div class="detalle-obs__form">
            <div class="obs-form-inner">
              <textarea id="obs-priv-input" class="obs-textarea" placeholder="Escribe al revisor…" rows="2"></textarea>
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
                <textarea id="obs-codigo-input" class="obs-codigo-textarea" placeholder="Pega el código corregido…" rows="5"></textarea>
              </div>
            </div>
            <button class="obs-submit-btn" id="obs-priv-submit">Enviar</button>
          </div>
        </div>` : ''}
      </div>

      <!-- Panel lateral -->
      <div class="detalle-panel">

        <!-- Acciones -->
        <div class="detalle-panel-card">
          <div class="detalle-panel-card__head">Acciones</div>
          <div class="detalle-panel-card__body">
            <div class="detalle-actions" id="acciones-wrap">
              ${_renderAcciones()}
            </div>
          </div>
        </div>

        <!-- Resolución -->
        <div class="detalle-panel-card">
          <div class="detalle-panel-card__head">Resolución</div>
          <div class="detalle-panel-card__body">
            <textarea
              id="resolucion-input"
              class="resolucion-textarea"
              placeholder="Describe cómo se resolvió el ticket…"
            >${t.resolucion ?? ''}</textarea>
            <button class="detalle-action-btn detalle-action-btn--secondary" id="resolucion-save-btn">
              Guardar resolución
            </button>
          </div>
        </div>

        <!-- Opciones del chat (solo desarrollador) -->
        ${_rol === 'desarrollador' ? `
        <div class="detalle-panel-card">
          <div class="detalle-panel-card__head">Opciones del chat</div>
          <div class="detalle-panel-card__body">
            <label class="chat-codigo-toggle">
              <span class="chat-codigo-toggle__label">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path fill-rule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06L6.56 10l1.72-1.72zm4.5-1.06a.75.75 0 10-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clip-rule="evenodd"/>
                </svg>
                Permitir al usuario adjuntar código
              </span>
              <input type="checkbox" id="toggle-permitir-codigo" ${t.permitir_codigo_chat ? 'checked' : ''} />
              <span class="chat-codigo-toggle__switch"></span>
            </label>
            <p class="chat-codigo-toggle__hint">Cuando está activo, el usuario también puede adjuntar código en el chat.</p>
          </div>
        </div>` : ''}

        <!-- Info -->
        <div class="detalle-panel-card">
          <div class="detalle-panel-card__head">Información</div>
          <div class="detalle-panel-card__body">
            <div class="detalle-panel-row">
              <span class="detalle-panel-row__label">Estado actual</span>
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
          </div>
        </div>

      </div>
    </div>`;

  wireObsPublica();
  wireObsCodigoTogglePublico();
  if (enRevision) {
    wireObsPrivada();
    wireObsCodigoToggle();
  }
  if (_ticket.categoria === 'revision_codigo' && _rol === 'desarrollador') {
    wireCorreccion();
  }
  if (_rol === 'desarrollador') wirePermitirCodigo();
  wireAcciones();
  wireResolucion();
  _wireCopyBtnsAgente();
}

// ── Fragmentos del usuario (solo lectura) ────────────────────────────────────
function _renderFragmentosUsuario(fragmentos) {
  const items = fragmentos.map((f, i) => {
    const lang    = LANG_LABELS[f.lenguaje] ?? f.lenguaje ?? 'Código';
    const escaped = (f.codigo ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const btnId   = `agente-copy-${i}`;
    return `
      <div class="du-fragmento">
        <div class="du-fragmento__header">
          <span class="du-fragmento__lang">${lang}</span>
          <button type="button" class="du-fragmento__copy" id="${btnId}" data-codigo="${encodeURIComponent(f.codigo ?? '')}">
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
    <div class="detalle-desc" style="padding-bottom:0">
      <div class="detalle-section-title">Código enviado por el usuario</div>
      ${items}
    </div>`;
}

// ── Informe de revisión (solo desarrollador) ─────────────────────────────────
function _renderInformeRevision(rev) {
  const CRITERIOS_LIST = [
    { key: 'error_logico',             label: 'Error lógico'                },
    { key: 'error_sintaxis',           label: 'Error de sintaxis'           },
    { key: 'uso_inadecuado_vars',      label: 'Uso inadecuado de variables' },
    { key: 'validaciones_incompletas', label: 'Validaciones incompletas'    },
    { key: 'organizacion_deficiente',  label: 'Organización deficiente'     },
    { key: 'malas_practicas',          label: 'Malas prácticas'             },
  ];

  const SCORE_COLORS = {
    1: { color: '#e05252', bg: '#fdf0f0', label: 'Grave'    },
    2: { color: '#c8783a', bg: '#fdf5ee', label: 'Moderado' },
    3: { color: '#b8a030', bg: '#fdfbee', label: 'Regular'  },
    4: { color: '#5a9a6a', bg: '#eff7f2', label: 'Bueno'    },
    5: { color: '#285a48', bg: '#e8f4ef', label: 'Óptimo'   },
  };

  const RESULTADO_CONFIG = {
    pendiente: { color: '#9a8678', bg: '#f8f4f0', label: 'Pendiente', icon: '⏳' },
    aprobado:  { color: '#285a48', bg: '#e8f4ef', label: 'Aprobado',  icon: '✓'  },
    rechazado: { color: '#e05252', bg: '#fdf0f0', label: 'Rechazado', icon: '✕'  },
  };

  const resultado = rev.resultado ?? 'pendiente';
  const rConfig   = RESULTADO_CONFIG[resultado] ?? RESULTADO_CONFIG.pendiente;
  const fecha     = formatDate(rev.updated_at ?? rev.created_at);

  const criteriosHTML = CRITERIOS_LIST.map(c => {
    const puntuacion = rev[`puntuacion_${c.key}`];
    const nota       = rev[`nota_${c.key}`] ?? '';
    const sConfig    = puntuacion ? SCORE_COLORS[puntuacion] : null;

    const scoreEl = puntuacion
      ? `<span class="informe-score-chip" style="background:${sConfig.bg};color:${sConfig.color};border-color:${sConfig.color}">${puntuacion}/5 · ${sConfig.label}</span>`
      : `<span class="informe-score-chip informe-score-chip--empty">Sin evaluar</span>`;

    return `
      <div class="revision-informe__criterio">
        <div class="revision-informe__criterio-header">
          <span class="revision-informe__criterio-label">${c.label}</span>
          ${scoreEl}
        </div>
        ${nota ? `<p class="revision-informe__criterio-nota">${nota}</p>` : ''}
      </div>`;
  }).join('');

  const obsGeneral = rev.observacion_general
    ? `<div class="revision-informe__obs">
         <div class="revision-informe__obs-label">Observación general</div>
         <p class="revision-informe__obs-text">${rev.observacion_general}</p>
       </div>`
    : '';

  return `
    <div class="revision-informe">
      <div class="revision-informe__head">
        <span class="detalle-section-title" style="margin:0">Informe de revisión</span>
        <span class="revision-informe__fecha">${fecha}</span>
      </div>
      <div class="revision-informe__resultado" style="background:${rConfig.bg};border-color:${rConfig.color};color:${rConfig.color}">
        <span class="revision-informe__resultado-icon">${rConfig.icon}</span>
        <span>${rConfig.label}</span>
      </div>
      <div class="revision-informe__criterios">
        ${criteriosHTML}
      </div>
      ${obsGeneral}
    </div>`;
}

function _wireCopyBtnsAgente() {
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

// ── Toggle de adjuntar código en obs ─────────────────────────────────────────
function wireObsCodigoToggle() {
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

// ── Observaciones ─────────────────────────────────────────────────────────────
function _renderObservaciones(obs, emptyMsg = 'Sin observaciones aún.') {
  if (!obs.length) return `<div class="obs-empty">${emptyMsg}</div>`;
  return obs.map(o => {
    const esPropia  = o.autor_id === _userId;
    const nombre    = esPropia ? 'Tú' : (_perfilMap[o.autor_id] ?? 'Usuario');
    const iniciales = (_perfilMap[o.autor_id] ?? 'U').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
    const tiempo    = _relativeTime(o.created_at);
    const color     = _avatarColor(o.autor_id);
    const privadoBadge = o.privado
      ? `<span class="obs-privado-badge">
           <svg viewBox="0 0 20 20" fill="currentColor" width="10" height="10">
             <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd"/>
           </svg>
           Interna
         </span>`
      : '';
    return `
      <div class="obs-item${esPropia ? ' obs-item--own' : ''}${o.privado ? ' obs-item--privado' : ''}">
        <div class="obs-item__avatar" style="background:${color}">${iniciales}</div>
        <div class="obs-item__body">
          <div class="obs-item__header">
            <span class="obs-item__author">${nombre}</span>
            ${privadoBadge}
            <span class="obs-item__time">${tiempo}</span>
          </div>
          <p class="obs-item__text">${o.contenido}</p>
          ${o.fragmento_codigo ? _renderObsCodigo(o.fragmento_codigo) : ''}
        </div>
      </div>`;
  }).join('');
}

// ── Canal público: mensajes al usuario ───────────────────────────────────────
function wireObsPublica() {
  document.getElementById('obs-pub-submit').addEventListener('click', async () => {
    const input    = document.getElementById('obs-pub-input');
    const contenido = input.value.trim();
    if (!contenido) return;

    const btn = document.getElementById('obs-pub-submit');
    btn.disabled    = true;
    btn.textContent = 'Enviando…';

    const codigoWrap = document.getElementById('obs-pub-codigo-wrap');
    const hayCodigoPublico = codigoWrap && !codigoWrap.classList.contains('obs-codigo-wrap--hidden');
    const codigoVal  = document.getElementById('obs-pub-codigo-input')?.value?.trim();
    const fragmentoCodigo = hayCodigoPublico && codigoVal
      ? { lenguaje: document.getElementById('obs-pub-codigo-lang').value, codigo: codigoVal }
      : null;

    const { data, error } = await _supaClient
      .from('observaciones')
      .insert({ ticket_id: _ticketId, autor_id: _userId, contenido, privado: false, fragmento_codigo: fragmentoCodigo })
      .select('id, contenido, autor_id, fragmento_codigo, created_at')
      .single();

    if (error) {
      showToast('No se pudo enviar el mensaje.', 'error');
    } else {
      input.value = '';
      if (codigoWrap) {
        codigoWrap.classList.add('obs-codigo-wrap--hidden');
        const labelEl = document.getElementById('obs-pub-codigo-toggle-label');
        if (labelEl) labelEl.textContent = 'Adjuntar código';
        const codigoInput = document.getElementById('obs-pub-codigo-input');
        if (codigoInput) codigoInput.value = '';
      }
      const list      = document.getElementById('obs-pub-list');
      const iniciales = (_perfilMap[_userId] ?? 'U').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
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
      const countEl = document.getElementById('obs-pub-count');
      if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
    }

    btn.disabled    = false;
    btn.textContent = 'Enviar';
  });
}

// ── Canal privado: notas internas con el revisor ──────────────────────────────
function wireObsPrivada() {
  document.getElementById('obs-priv-submit').addEventListener('click', async () => {
    const input    = document.getElementById('obs-priv-input');
    const contenido = input.value.trim();
    if (!contenido) return;

    // Código adjunto
    const codigoWrap  = document.getElementById('obs-codigo-wrap');
    const codigoInput = document.getElementById('obs-codigo-input');
    const codigoLang  = document.getElementById('obs-codigo-lang');
    let fragmentoCodigo = null;
    if (codigoWrap && !codigoWrap.classList.contains('obs-codigo-wrap--hidden') && codigoInput?.value.trim()) {
      fragmentoCodigo = { lenguaje: codigoLang?.value ?? 'otro', codigo: codigoInput.value.trim() };
    }

    const btn = document.getElementById('obs-priv-submit');
    btn.disabled    = true;
    btn.textContent = 'Enviando…';

    const { data, error } = await _supaClient
      .from('observaciones')
      .insert({ ticket_id: _ticketId, autor_id: _userId, contenido, privado: true, fragmento_codigo: fragmentoCodigo })
      .select('id, contenido, autor_id, privado, fragmento_codigo, created_at')
      .single();

    if (error) {
      showToast('No se pudo enviar la nota.', 'error');
    } else {
      input.value = '';
      if (codigoInput) codigoInput.value = '';
      if (codigoWrap) codigoWrap.classList.add('obs-codigo-wrap--hidden');
      const toggleLabel = document.getElementById('obs-codigo-toggle-label');
      if (toggleLabel) toggleLabel.textContent = 'Adjuntar código';

      const list      = document.getElementById('obs-priv-list');
      const iniciales = (_perfilMap[_userId] ?? 'U').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
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
      const countEl = document.getElementById('obs-priv-count');
      if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
    }

    btn.disabled    = false;
    btn.textContent = 'Enviar';
  });
}

// ── Acciones por rol ──────────────────────────────────────────────────────────
const _ACCION_ICONS = {
  play: `<svg class="detalle-action-btn__icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M2 10a8 8 0 1116 0A8 8 0 012 10zm6.39-2.908a.75.75 0 01.766.027l3.5 2.25a.75.75 0 010 1.262l-3.5 2.25A.75.75 0 018 12.25v-4.5a.75.75 0 01.39-.658z" clip-rule="evenodd"/></svg>`,
  send: `<svg class="detalle-action-btn__icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z"/></svg>`,
  check: `<svg class="detalle-action-btn__icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>`,
  back: `<svg class="detalle-action-btn__icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clip-rule="evenodd"/></svg>`,
  code: `<svg class="detalle-action-btn__icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06L6.56 10l1.72-1.72zm4.5-1.06a.75.75 0 10-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clip-rule="evenodd"/></svg>`,
};

function _renderAcciones() {
  const t   = _ticket;
  const est = t.estado;
  const btns = [];

  if (_rol === 'desarrollador') {
    if (est === 'abierto') {
      btns.push({ label: 'Iniciar trabajo', desc: 'Cambia el estado a En proceso', nuevoEstado: 'en_proceso', clase: 'primary', icon: 'play' });
    }
    if (est === 'en_proceso') {
      btns.push({ label: 'Enviar a revisión', desc: 'El revisor evaluará el código', nuevoEstado: 'en_revision', clase: 'primary', icon: 'send' });
      if (t.categoria !== 'revision_codigo') {
        btns.push({ label: 'Marcar como resuelto', desc: 'Resolver sin pasar por revisión de código', nuevoEstado: 'resuelto', clase: 'secondary', icon: 'check' });
      }
    }
    if (_revision?.resultado === 'aprobado' && !['resuelto', 'cerrado'].includes(est)) {
      btns.push({ label: 'Marcar como resuelto', desc: 'El revisor aprobó el código ✓', nuevoEstado: 'resuelto', clase: 'primary', icon: 'check' });
    }
  }

  if (_rol === 'revisor_codigo') {
    if (est === 'en_revision') {
      btns.push({ label: 'Aprobar y resolver', desc: 'El ticket quedará cerrado', nuevoEstado: 'resuelto',   clase: 'primary', icon: 'check' });
      btns.push({ label: 'Rechazar — devolver', desc: 'El ticket vuelve a En proceso', nuevoEstado: 'en_proceso', clase: 'danger', icon: 'back' });
    }
    if (t.revisor_id === _userId) {
      btns.push({
        label: 'Ir a revisión de código',
        desc:  'Abrir el formulario de evaluación',
        href:  `/pages/agente/revision-codigo.html?id=${t.id}`,
        clase: 'link',
        icon:  'code',
      });
    }
  }

  if (!btns.length) {
    return `<p style="font-size:0.82rem;color:var(--color-text-muted)">No hay acciones disponibles para el estado actual.</p>`;
  }

  return btns.map(b => {
    const iconHtml = _ACCION_ICONS[b.icon] ?? '';
    const inner = `
      ${iconHtml}
      <div class="detalle-action-btn__content">
        <span class="detalle-action-btn__text">${b.label}</span>
        <span class="detalle-action-btn__desc">${b.desc}</span>
      </div>`;
    if (b.href) {
      return `<a href="${b.href}" class="detalle-action-btn detalle-action-btn--${b.clase}">${inner}</a>`;
    }
    return `<button class="detalle-action-btn detalle-action-btn--${b.clase}" data-estado="${b.nuevoEstado}" data-label="${b.label}">${inner}</button>`;
  }).join('');
}

function wireAcciones() {
  document.getElementById('acciones-wrap').addEventListener('click', async e => {
    const btn = e.target.closest('[data-estado]');
    if (!btn) return;

    const nuevoEstado = btn.dataset.estado;
    btn.disabled      = true;
    btn.textContent   = 'Actualizando…';

    const { error } = await _supaClient
      .from('tickets')
      .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
      .eq('id', _ticketId);

    if (error) {
      showToast('No se pudo actualizar el estado.', 'error');
    } else {
      _ticket.estado = nuevoEstado;
      showToast(`Estado actualizado a "${ESTADO_LABELS[nuevoEstado]}".`, 'success');
      // Actualizar barra de progreso y badges de estado
      const progressEl = document.querySelector('.detalle-progress');
      if (progressEl) progressEl.outerHTML = _renderProgress(nuevoEstado);
      document.querySelectorAll('.detalle-badges .badge, .detalle-panel-row .badge').forEach(el => {
        const estadoClases = Object.keys(ESTADO_LABELS).map(k => `badge--${k}`);
        if (estadoClases.some(c => el.classList.contains(c))) {
          el.className = `badge badge--${nuevoEstado}`;
          el.textContent = ESTADO_LABELS[nuevoEstado];
        }
      });
    }
    // Siempre re-renderizar acciones para restaurar estado de botones
    document.getElementById('acciones-wrap').innerHTML = _renderAcciones();
    wireAcciones();
  });
}

// ── Resolución ────────────────────────────────────────────────────────────────
function wireResolucion() {
  document.getElementById('resolucion-save-btn').addEventListener('click', async () => {
    const resolucion = document.getElementById('resolucion-input').value.trim();
    const btn        = document.getElementById('resolucion-save-btn');

    btn.disabled    = true;
    btn.textContent = 'Guardando…';

    const { error } = await _supaClient
      .from('tickets')
      .update({ resolucion, updated_at: new Date().toISOString() })
      .eq('id', _ticketId);

    if (error) {
      showToast('No se pudo guardar la resolución.', 'error');
    } else {
      _ticket.resolucion = resolucion;
      showToast('Resolución guardada.', 'success');
    }

    btn.disabled    = false;
    btn.textContent = 'Guardar resolución';
  });
}

// ── Error ──────────────────────────────────────────────────────────────────────
function renderError(msg) {
  document.getElementById('detalle-wrap').innerHTML = `
    <div class="bandeja-empty">
      <svg viewBox="0 0 20 20" fill="currentColor" width="36" height="36" style="color:var(--color-border)">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
      </svg>
      <p>${msg}</p>
    </div>`;
}

// ── Toggle "Permitir al usuario adjuntar código" ──────────────────────────────
function wirePermitirCodigo() {
  const chk = document.getElementById('toggle-permitir-codigo');
  if (!chk) return;

  chk.addEventListener('change', async () => {
    const { error } = await _supaClient
      .from('tickets')
      .update({ permitir_codigo_chat: chk.checked })
      .eq('id', _ticketId);

    if (error) {
      showToast('No se pudo actualizar la opción.', 'error');
      chk.checked = !chk.checked;
    } else {
      _ticket.permitir_codigo_chat = chk.checked;
      showToast(chk.checked
        ? 'El usuario ahora puede adjuntar código en el chat.'
        : 'El usuario ya no puede adjuntar código.', 'info');
    }
  });
}

// ── Toggle código en canal público ────────────────────────────────────────────
function wireObsCodigoTogglePublico() {
  const btn  = document.getElementById('obs-pub-codigo-toggle-btn');
  const wrap = document.getElementById('obs-pub-codigo-wrap');
  if (!btn || !wrap) return;

  btn.addEventListener('click', () => {
    const opening = wrap.classList.contains('obs-codigo-wrap--hidden');
    wrap.classList.toggle('obs-codigo-wrap--hidden');
    const labelEl = document.getElementById('obs-pub-codigo-toggle-label');
    if (labelEl) labelEl.textContent = opening ? 'Quitar código' : 'Adjuntar código';
    if (opening) document.getElementById('obs-pub-codigo-input')?.focus();
  });
}

// ── Sección corrección del desarrollador ─────────────────────────────────────
function _renderSeccionCorreccion() {
  const corr = _ticket.correccion_codigo;
  const lenguajeActual = corr?.lenguaje ?? (_ticket.fragmentos_codigo?.[0]?.lenguaje ?? 'javascript');
  const codigoActual   = corr?.codigo ?? '';
  const inclOrig       = corr?.incluir_original ?? true;

  const langOpts = Object.entries(LANG_LABELS).map(([val, lbl]) =>
    `<option value="${val}" ${lenguajeActual === val ? 'selected' : ''}>${lbl}</option>`
  ).join('');

  return `
    <div class="detalle-section" id="seccion-correccion">
      <div class="detalle-section__head">
        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
          <path fill-rule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06L6.56 10l1.72-1.72zm4.5-1.06a.75.75 0 10-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clip-rule="evenodd"/>
        </svg>
        Tu corrección del código
        ${corr
          ? '<span class="correccion-badge">Guardada</span>'
          : '<span class="correccion-badge correccion-badge--empty">Sin guardar</span>'}
      </div>
      <p class="correccion-hint">Esta es la versión que el revisor evaluará. Puedes enviar el original, tu corrección, o ambos.</p>

      <div class="correccion-opciones">
        <label class="correccion-check">
          <input type="checkbox" id="corr-incluir-original" ${inclOrig ? 'checked' : ''} />
          Incluir el código original del usuario como referencia
        </label>
      </div>

      <div class="correccion-editor">
        <div class="correccion-editor__top">
          <select class="correccion-lang" id="corr-lang">${langOpts}</select>
          <button type="button" class="rc-ai-btn" id="corr-ai-btn">
            <svg class="rc-ai-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.05a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06L5.05 4.11a.75.75 0 010-1.06zM13.89 3.05a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 01-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM1 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 011 10zM16.75 9.25a.75.75 0 010 1.5h-1.5a.75.75 0 010-1.5h1.5zM5.05 16.95a.75.75 0 010-1.06l1.06-1.06a.75.75 0 011.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0zM12.83 15.83a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM10 16.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM10 7a3 3 0 100 6 3 3 0 000-6z"/>
            </svg>
            <span class="rc-ai-btn__text">Corregir con IA</span>
          </button>
        </div>
        <textarea
          id="corr-codigo"
          class="correccion-textarea"
          placeholder="Escribe aquí tu versión corregida del código…"
          rows="8"
          spellcheck="false"
        >${codigoActual.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
        <div id="corr-resumen-ia" class="correccion-resumen-ia" style="display:none"></div>
      </div>

      <button type="button" class="correccion-save-btn" id="corr-save-btn">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
          <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/>
        </svg>
        ${corr ? 'Actualizar corrección' : 'Guardar corrección'}
      </button>
    </div>`;
}

function wireCorreccion() {
  const saveBtn = document.getElementById('corr-save-btn');
  const aiBtn   = document.getElementById('corr-ai-btn');
  if (saveBtn) saveBtn.addEventListener('click', _guardarCorreccion);
  if (aiBtn)   aiBtn.addEventListener('click', _corregirConIA);
}

async function _guardarCorreccion() {
  const btn      = document.getElementById('corr-save-btn');
  const codigo   = document.getElementById('corr-codigo')?.value?.trim();
  const lenguaje = document.getElementById('corr-lang')?.value;
  const inclOrig = document.getElementById('corr-incluir-original')?.checked ?? true;

  if (!codigo) { showToast('Escribe el código corregido antes de guardar.', 'warning'); return; }

  btn.disabled    = true;
  btn.textContent = 'Guardando…';

  const payload = { correccion_codigo: { lenguaje, codigo, incluir_original: inclOrig } };

  const { error } = await _supaClient
    .from('tickets')
    .update(payload)
    .eq('id', _ticketId);

  if (error) {
    showToast('No se pudo guardar la corrección.', 'error');
  } else {
    _ticket.correccion_codigo = payload.correccion_codigo;
    showToast('Corrección guardada. El revisor la verá al evaluar.', 'success');
    const badge = document.querySelector('#seccion-correccion .correccion-badge');
    if (badge) { badge.textContent = 'Guardada'; badge.classList.remove('correccion-badge--empty'); }
    btn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg> Actualizar corrección`;
  }

  btn.disabled = false;
}

async function _corregirConIA() {
  const aiBtn  = document.getElementById('corr-ai-btn');
  const codigo = _ticket.fragmentos_codigo?.[0]?.codigo;

  if (!codigo) { showToast('El ticket no tiene código original para corregir.', 'warning'); return; }

  aiBtn.disabled = true;
  aiBtn.querySelector('.rc-ai-btn__text').textContent = 'Corrigiendo…';
  aiBtn.classList.add('rc-ai-btn--loading');

  const lenguaje = document.getElementById('corr-lang')?.value ?? 'otro';

  try {
    const { data: { session } } = await _supaClient.auth.getSession();
    const res = await fetch('/api/ai/corregir-codigo', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
      },
      body:    JSON.stringify({ codigo, lenguaje }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `Error ${res.status}`);
    }

    const { codigo_corregido, resumen_cambios } = await res.json();

    const textArea = document.getElementById('corr-codigo');
    if (textArea && codigo_corregido) textArea.value = codigo_corregido;

    const resumenEl = document.getElementById('corr-resumen-ia');
    if (resumenEl && resumen_cambios) {
      resumenEl.style.display = 'block';
      const resumenTexto = Array.isArray(resumen_cambios)
        ? resumen_cambios.join('\n')
        : String(resumen_cambios ?? '');
      resumenEl.innerHTML = `<strong>Cambios realizados por la IA:</strong><br>${resumenTexto.replace(/\n/g, '<br>')}`;
    }

    showToast('IA generó la corrección. Revisa y guarda cuando estés listo.', 'info', 5000);
  } catch (err) {
    console.error('[IA corregir]', err);
    showToast(`No se pudo corregir: ${err.message}`, 'error');
  } finally {
    aiBtn.disabled = false;
    aiBtn.querySelector('.rc-ai-btn__text').textContent = 'Corregir con IA';
    aiBtn.classList.remove('rc-ai-btn--loading');
  }
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

initDetalle();
