// Detalle de ticket — vista del usuario (solo lectura de estado + observaciones + cancelar)

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

const ESTADO_HINTS = {
  abierto:     'Tu solicitud ha sido recibida y está en cola.',
  en_proceso:  'Un desarrollador está trabajando en tu ticket.',
  en_revision: 'El código está siendo revisado por un experto.',
  resuelto:    '¡Tu ticket ha sido resuelto! Revisa la resolución.',
  cerrado:     'Este ticket ha sido cerrado.',
};

const ESTADO_BG = {
  abierto:     '#eaf5ef',
  en_proceso:  '#eaf0f8',
  en_revision: '#faf5ea',
  resuelto:    '#eef8f2',
  cerrado:     '#f5eeee',
};

// Estado del módulo
let _supaClient = null;
let _userId     = null;
let _ticketId   = null;
let _ticket     = null;
let _perfilMap  = {};

// ── Inicialización ───────────────────────────────────────────────────────────
async function initDetalleUsuario() {
  _ticketId = new URLSearchParams(window.location.search).get('id');

  if (!_ticketId) {
    _renderError('No se especificó un ticket.');
    return;
  }

  _supaClient = await getSupabaseClient();
  _userId     = (await getUser())?.id;

  if (!_userId) return;

  const [ticketRes, perfilesRes, obsRes] = await Promise.all([
    _supaClient
      .from('tickets')
      .select('id, titulo, descripcion, estado, prioridad, categoria, resolucion, fragmentos_codigo, permitir_codigo_chat, usuario_id, desarrollador_id, revisor_id, created_at, updated_at')
      .eq('id', _ticketId)
      .eq('usuario_id', _userId)   // RLS + validación: solo sus propios tickets
      .maybeSingle(),
    _supaClient.from('perfiles').select('id, nombre, email'),
    _supaClient
      .from('observaciones')
      .select('id, contenido, autor_id, fragmento_codigo, created_at')
      .eq('ticket_id', _ticketId)
      .eq('privado', false)
      .order('created_at', { ascending: true }),
  ]);

  if (!ticketRes.data) {
    _renderError('Ticket no encontrado o sin acceso.');
    return;
  }

  _perfilMap = Object.fromEntries((perfilesRes.data ?? []).map(p => [p.id, p.nombre ?? p.email]));
  _ticket    = ticketRes.data;

  _renderDetalle(obsRes.data ?? []);
}

// ── Render principal ─────────────────────────────────────────────────────────
function _renderDetalle(observaciones) {
  const t       = _ticket;
  const cerrado = t.estado === 'cerrado';

  document.getElementById('ticket-detalle-wrap').innerHTML = `

    ${cerrado ? `
      <div class="du-cerrado-banner">
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        Este ticket está cerrado y ya no puede modificarse.
      </div>` : ''}

    <!-- Cabecera -->
    <div class="du-header-card">
      <h1 class="du-title">${t.titulo}</h1>
      <div class="du-badges">
        <span class="badge badge--${t.estado}">${ESTADO_LABELS[t.estado] ?? t.estado}</span>
        <span class="badge badge--${t.prioridad}">${PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad}</span>
        <span class="badge" style="background:#f4f0ec;color:#7a6858">${CATEGORIA_LABELS[t.categoria] ?? t.categoria}</span>
      </div>
      <div class="du-meta">
        <span class="du-meta-item">
          <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
            <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd"/>
          </svg>
          Abierto el ${formatDate(t.created_at)}
        </span>
        <span class="du-meta-item">
          <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clip-rule="evenodd"/>
          </svg>
          Actualizado ${_relativeTime(t.updated_at)}
        </span>
        ${t.desarrollador_id ? `<span class="du-meta-item">Asignado a: <strong>${_perfilMap[t.desarrollador_id] ?? 'Agente'}</strong></span>` : ''}
      </div>
      ${_renderProgress(t.estado)}
    </div>

    <div class="du-layout">
      <!-- Columna principal -->
      <div>
        <!-- Descripción -->
        <div class="du-desc">
          <div class="du-section-title">Descripción</div>
          <p class="du-desc__text">${t.descripcion ?? 'Sin descripción.'}</p>
        </div>

        <!-- Fragmentos de código -->
        ${t.categoria === 'revision_codigo' && t.fragmentos_codigo?.length
          ? _renderFragmentos(t.fragmentos_codigo)
          : ''}

        <!-- Observaciones -->
        <div class="du-obs-card">
          <div class="du-obs-card__head">
            <span class="du-section-title" style="margin:0">Conversación</span>
            <span id="obs-count" style="font-size:0.8rem;color:var(--color-text-muted)">${observaciones.length}</span>
          </div>
          <div class="ut-obs-list" id="obs-list">
            ${_renderObservaciones(observaciones)}
          </div>
          ${!cerrado ? `
            <div class="ut-obs-form">
              <div class="obs-form-inner">
                <textarea
                  id="obs-input"
                  class="ut-obs-textarea"
                  placeholder="Escribe un comentario o actualización…"
                  rows="2"
                ></textarea>
                ${t.permitir_codigo_chat ? `
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
                  <textarea id="obs-codigo-input" class="obs-codigo-textarea" placeholder="Pega el código aquí…" rows="5"></textarea>
                </div>` : ''}
              </div>
              <button class="ut-obs-submit" id="obs-submit">Enviar</button>
            </div>` : ''}
        </div>
      </div>

      <!-- Panel lateral -->
      <div class="du-panel">

        <!-- Estado destacado -->
        <div class="du-panel-card">
          <div class="du-panel-card__head">Estado</div>
          <div class="du-panel-card__body">
            <div class="du-estado-display" style="--estado-bg:${ESTADO_BG[t.estado] ?? '#f4f4f4'}">
              <span class="badge badge--${t.estado}" style="font-size:0.85rem;padding:0.35rem 0.875rem">${ESTADO_LABELS[t.estado] ?? t.estado}</span>
              <span class="du-estado-display__hint">${ESTADO_HINTS[t.estado] ?? ''}</span>
            </div>
          </div>
        </div>

        ${t.resolucion ? `
          <!-- Resolución -->
          <div class="du-panel-card">
            <div class="du-panel-card__head" style="color:var(--color-accent)">
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
              </svg>
              Resolución
            </div>
            <div class="du-panel-card__body">
              <div class="du-resolucion">${t.resolucion}</div>
            </div>
          </div>` : ''}

        <!-- Información -->
        <div class="du-panel-card">
          <div class="du-panel-card__head">Información</div>
          <div class="du-panel-card__body">
            <div class="du-panel-row">
              <span class="du-panel-row__label">Prioridad</span>
              <span class="du-panel-row__value">
                <span class="badge badge--${t.prioridad}">${PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad}</span>
              </span>
            </div>
            <div class="du-panel-row">
              <span class="du-panel-row__label">Categoría</span>
              <span class="du-panel-row__value">${CATEGORIA_LABELS[t.categoria] ?? t.categoria}</span>
            </div>
            ${t.desarrollador_id ? `
              <div class="du-panel-row">
                <span class="du-panel-row__label">Desarrollador</span>
                <span class="du-panel-row__value">${_perfilMap[t.desarrollador_id] ?? '—'}</span>
              </div>` : ''}
            ${t.revisor_id ? `
              <div class="du-panel-row">
                <span class="du-panel-row__label">Revisor</span>
                <span class="du-panel-row__value">${_perfilMap[t.revisor_id] ?? '—'}</span>
              </div>` : ''}
            <div class="du-panel-row">
              <span class="du-panel-row__label">Última actualización</span>
              <span class="du-panel-row__value">${formatDate(t.updated_at)}</span>
            </div>
          </div>
        </div>

        ${t.estado === 'abierto' ? `
          <!-- Cancelar -->
          <div class="du-panel-card">
            <div class="du-panel-card__body">
              <div id="cancel-zone">
                <button class="du-cancel-btn" id="cancel-btn">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
                  </svg>
                  Cancelar este ticket
                </button>
              </div>
            </div>
          </div>` : ''}

      </div>
    </div>`;

  if (!cerrado) _wireObservaciones();
  if (t.estado === 'abierto') _wireCancelBtn();
  _wireCopyBtns();
}

// ── Barra de progreso ─────────────────────────────────────────────────────────
function _renderProgress(estado) {
  const steps  = ['abierto', 'en_proceso', 'en_revision', 'resuelto'];
  const labels = ['Abierto', 'En proceso', 'En revisión', 'Resuelto'];
  const idx     = steps.indexOf(estado);
  const fillPct = idx >= 0 ? (idx / (steps.length - 1)) * 100 : 0;

  const dots = steps.map((_, i) => {
    const cls = i < idx ? '--done' : i === idx ? '--active' : '';
    return `<div class="ut-progress__dot${cls ? ` ut-progress__dot${cls}` : ''}"></div>`;
  }).join('');

  const lbls = steps.map((_, i) => {
    const cls = i < idx ? '--done' : i === idx ? '--active' : '';
    return `<span class="ut-progress__step-label${cls ? ` ut-progress__step-label${cls}` : ''}">${labels[i]}</span>`;
  }).join('');

  return `
    <div class="ut-progress">
      <div class="ut-progress__bar">
        <div class="ut-progress__line">
          <div class="ut-progress__line-fill" style="width:${fillPct}%"></div>
        </div>
        ${dots}
      </div>
      <div class="ut-progress__labels">${lbls}</div>
    </div>`;
}

// ── Fragmentos de código (solo lectura) ──────────────────────────────────────
function _renderFragmentos(fragmentos) {
  const items = fragmentos.map((f, i) => {
    const lang    = LANG_LABELS[f.lenguaje] ?? f.lenguaje ?? 'Código';
    const escaped = (f.codigo ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const btnId   = `copy-btn-${i}`;
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
    <div class="du-fragmentos">
      <div class="du-section-title">Código adjunto</div>
      ${items}
    </div>`;
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

// ── Observaciones ─────────────────────────────────────────────────────────────
function wireCodigoToggleUsuario() {
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

function _renderObservaciones(obs) {
  if (!obs.length) {
    return `<div class="ut-obs-empty">Sin comentarios aún. Puedes escribir una actualización abajo.</div>`;
  }
  return obs.map(o => {
    const esPropia  = o.autor_id === _userId;
    const nombre    = esPropia ? 'Tú' : (_perfilMap[o.autor_id] ?? 'Soporte');
    const iniciales = (_perfilMap[o.autor_id] ?? 'S').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
    const tiempo    = _relativeTime(o.created_at);
    const color     = _avatarColor(o.autor_id);
    return `
      <div class="ut-obs-item${esPropia ? ' ut-obs-item--own' : ''}">
        <div class="ut-obs-item__avatar" style="background:${color}">${iniciales}</div>
        <div class="ut-obs-item__body">
          <div class="ut-obs-item__header">
            <span class="ut-obs-item__author">${nombre}</span>
            <span class="ut-obs-item__time">${tiempo}</span>
          </div>
          <p class="ut-obs-item__text">${o.contenido}</p>
          ${o.fragmento_codigo?.codigo
            ? `<div class="obs-codigo-block">
                 <div class="obs-codigo-block__header">
                   <span class="obs-codigo-block__lang">${LANG_LABELS[o.fragmento_codigo.lenguaje] ?? o.fragmento_codigo.lenguaje}</span>
                 </div>
                 <pre class="obs-codigo-block__pre"><code>${o.fragmento_codigo.codigo.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>
               </div>`
            : ''}
        </div>
      </div>`;
  }).join('');
}

function _wireObservaciones() {
  wireCodigoToggleUsuario();

  const submitBtn = document.getElementById('obs-submit');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', async () => {
    const input    = document.getElementById('obs-input');
    const contenido = input.value.trim();
    if (!contenido) return;

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Enviando…';

    const codigoWrap = document.getElementById('obs-codigo-wrap');
    const hayCodigoPublico = codigoWrap && !codigoWrap.classList.contains('obs-codigo-wrap--hidden');
    const codigoVal  = document.getElementById('obs-codigo-input')?.value?.trim();
    const fragmentoCodigo = hayCodigoPublico && codigoVal
      ? { lenguaje: document.getElementById('obs-codigo-lang').value, codigo: codigoVal }
      : null;

    const { data, error } = await _supaClient
      .from('observaciones')
      .insert({ ticket_id: _ticketId, autor_id: _userId, contenido, privado: false, fragmento_codigo: fragmentoCodigo })
      .select('id, contenido, autor_id, fragmento_codigo, created_at')
      .single();

    if (error) {
      showToast('No se pudo enviar el comentario.', 'error');
    } else {
      input.value = '';

      if (codigoWrap) {
        codigoWrap.classList.add('obs-codigo-wrap--hidden');
        const labelEl = document.getElementById('obs-codigo-toggle-label');
        if (labelEl) labelEl.textContent = 'Adjuntar código';
        const ci = document.getElementById('obs-codigo-input');
        if (ci) ci.value = '';
      }

      const list      = document.getElementById('obs-list');
      const iniciales = (_perfilMap[_userId] ?? 'U').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
      const color     = _avatarColor(_userId);

      const empty = list.querySelector('.ut-obs-empty');
      if (empty) empty.remove();

      const codigoHtml = data.fragmento_codigo?.codigo
        ? `<div class="obs-codigo-block">
             <div class="obs-codigo-block__header">
               <span class="obs-codigo-block__lang">${LANG_LABELS[data.fragmento_codigo.lenguaje] ?? data.fragmento_codigo.lenguaje}</span>
             </div>
             <pre class="obs-codigo-block__pre"><code>${data.fragmento_codigo.codigo.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>
           </div>`
        : '';

      list.insertAdjacentHTML('beforeend', `
        <div class="ut-obs-item ut-obs-item--own">
          <div class="ut-obs-item__avatar" style="background:${color}">${iniciales}</div>
          <div class="ut-obs-item__body">
            <div class="ut-obs-item__header">
              <span class="ut-obs-item__author">Tú</span>
              <span class="ut-obs-item__time">Ahora mismo</span>
            </div>
            <p class="ut-obs-item__text">${data.contenido}</p>
            ${codigoHtml}
          </div>
        </div>`);

      list.scrollTop = list.scrollHeight;

      const countEl = document.getElementById('obs-count');
      if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
    }

    submitBtn.disabled    = false;
    submitBtn.textContent = 'Enviar';
  });
}

// ── Cancelar ticket ───────────────────────────────────────────────────────────
function _wireCancelBtn() {
  const cancelBtn = document.getElementById('cancel-btn');
  if (!cancelBtn) return;

  cancelBtn.addEventListener('click', () => {
    // Mostrar confirmación inline
    document.getElementById('cancel-zone').innerHTML = `
      <div class="du-cancel-confirm">
        <p>¿Seguro que deseas cancelar este ticket? Esta acción no se puede deshacer.</p>
        <div class="du-cancel-confirm__btns">
          <button class="du-cancel-confirm__yes" id="confirm-yes">Sí, cancelar</button>
          <button class="du-cancel-confirm__no"  id="confirm-no">No, volver</button>
        </div>
      </div>`;

    document.getElementById('confirm-no').addEventListener('click', () => {
      document.getElementById('cancel-zone').innerHTML = `
        <button class="du-cancel-btn" id="cancel-btn">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
          Cancelar este ticket
        </button>`;
      _wireCancelBtn();
    });

    document.getElementById('confirm-yes').addEventListener('click', async () => {
      const yesBtn = document.getElementById('confirm-yes');
      yesBtn.disabled    = true;
      yesBtn.textContent = 'Cancelando…';

      const { error } = await _supaClient
        .from('tickets')
        .update({ estado: 'cerrado', updated_at: new Date().toISOString() })
        .eq('id', _ticketId)
        .eq('usuario_id', _userId);

      if (error) {
        showToast('No se pudo cancelar el ticket.', 'error');
        yesBtn.disabled    = false;
        yesBtn.textContent = 'Sí, cancelar';
      } else {
        showToast('Ticket cancelado.', 'success');
        sessionStorage.setItem('qfx_toast', JSON.stringify({
          text: 'El ticket ha sido cancelado.',
          type: 'success',
        }));
        setTimeout(() => { window.location.href = '/pages/usuario/mis-tickets.html'; }, 1200);
      }
    });
  });
}

// ── Error ─────────────────────────────────────────────────────────────────────
function _renderError(msg) {
  document.getElementById('ticket-detalle-wrap').innerHTML = `
    <div class="ut-empty">
      <svg viewBox="0 0 20 20" fill="currentColor" width="40" height="40" style="color:var(--color-border)">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
      </svg>
      <div>
        <p class="ut-empty__title">Error</p>
        <p>${msg}</p>
      </div>
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

initDetalleUsuario();
