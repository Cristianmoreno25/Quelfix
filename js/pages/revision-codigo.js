// Revisión de código — solo revisor_codigo

const CRITERIOS = [
  { key: 'error_logico',              label: 'Error lógico'                },
  { key: 'error_sintaxis',            label: 'Error de sintaxis'           },
  { key: 'uso_inadecuado_vars',       label: 'Uso inadecuado de variables' },
  { key: 'validaciones_incompletas',  label: 'Validaciones incompletas'    },
  { key: 'organizacion_deficiente',   label: 'Organización deficiente'     },
  { key: 'malas_practicas',           label: 'Malas prácticas'             },
];

const LANG_LABELS = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
  java: 'Java', cpp: 'C++', csharp: 'C#', php: 'PHP',
  html: 'HTML', css: 'CSS', sql: 'SQL', bash: 'Bash', otro: 'Otro',
};

const ESTADO_LABELS = {
  abierto: 'Abierto', en_proceso: 'En proceso',
  en_revision: 'En revisión', resuelto: 'Resuelto', cerrado: 'Cerrado',
};

// Estado del módulo
let _supaClient       = null;
let _userId           = null;
let _tickets          = [];
let _selectedTicket   = null;
let _existingRevision = null;
let _codigoSeleccionado = 'original'; // 'original' | 'correccion'

// ── Inicialización ───────────────────────────────────────────────────────────
async function initRevision() {
  _supaClient = await getSupabaseClient();
  _userId     = (await getUser())?.id;

  if (!_userId) return;

  const { data, error } = await _supaClient
    .from('tickets')
    .select('id, titulo, estado, prioridad')
    .eq('revisor_id', _userId)
    .neq('estado', 'cerrado')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Error al cargar los tickets.', 'error');
    return;
  }

  _tickets = data ?? [];
  renderTicketList();

  // Si viene con ?id= en la URL, seleccionar directamente
  const idParam = new URLSearchParams(window.location.search).get('id');
  if (idParam) {
    const t = _tickets.find(t => t.id === idParam);
    if (t) selectTicket(t);
  }
}

// ── Lista de tickets ──────────────────────────────────────────────────────────
function renderTicketList() {
  const wrap = document.getElementById('revision-ticket-list');

  if (!_tickets.length) {
    wrap.innerHTML = `<div class="revision-list-empty">No tienes tickets asignados para revisión.</div>`;
    return;
  }

  wrap.innerHTML = _tickets.map(t => `
    <div
      class="revision-list-item${_selectedTicket?.id === t.id ? ' revision-list-item--active' : ''}"
      data-id="${t.id}"
    >
      <div class="revision-list-item__title" title="${t.titulo}">
        ${t.titulo.length > 40 ? t.titulo.slice(0, 40) + '…' : t.titulo}
      </div>
      <div class="revision-list-item__meta">
        <span class="badge badge--${t.estado}" style="font-size:0.68rem">${ESTADO_LABELS[t.estado] ?? t.estado}</span>
        <span class="badge badge--${t.prioridad}" style="font-size:0.68rem">${t.prioridad}</span>
      </div>
    </div>`
  ).join('');

  wrap.addEventListener('click', e => {
    const item = e.target.closest('[data-id]');
    if (!item) return;
    const t = _tickets.find(t => t.id === item.dataset.id);
    if (t) selectTicket(t);
  });
}

// ── Seleccionar ticket ────────────────────────────────────────────────────────
async function selectTicket(ticket) {
  _selectedTicket   = ticket;
  _existingRevision = null;

  // Marcar activo en la lista
  document.querySelectorAll('.revision-list-item').forEach(el => {
    el.classList.toggle('revision-list-item--active', el.dataset.id === ticket.id);
  });

  // Cargar revisión existente y fragmentos del ticket en paralelo
  const [revRes, ticketRes] = await Promise.all([
    _supaClient.from('revision_codigo').select('*').eq('ticket_id', ticket.id).maybeSingle(),
    _supaClient.from('tickets').select('fragmentos_codigo, correccion_codigo').eq('id', ticket.id).single(),
  ]);

  _existingRevision = revRes.data ?? null;
  _selectedTicket   = {
    ..._selectedTicket,
    fragmentos_codigo: ticketRes.data?.fragmentos_codigo ?? [],
    correccion_codigo: ticketRes.data?.correccion_codigo ?? null,
  };

  renderForm();
}

// ── Helpers de puntuación ─────────────────────────────────────────────────────
function _avgLabel(val) {
  if (!val) return '';
  return `Seleccionado: ${val}/5`;
}

// ── Formulario ────────────────────────────────────────────────────────────────
function renderForm() {
  const t   = _selectedTicket;
  const rev = _existingRevision;

  const criteriosHTML = CRITERIOS.map(c => {
    const puntuacion = rev?.[`puntuacion_${c.key}`] ?? 0;
    const nota       = rev?.[`nota_${c.key}`] ?? '';

    const scoresBtns = [1, 2, 3, 4, 5].map(n => `
      <button
        type="button"
        class="score-btn${puntuacion === n ? ' score-btn--active' : ''}"
        data-criterio="${c.key}"
        data-valor="${n}"
      >${n}</button>`
    ).join('');

    return `
      <div class="criterio-item">
        <div class="criterio-item__header">
          <div class="criterio-item__label-wrap">
            <span class="criterio-item__label">${c.label}</span>
            <span class="criterio-item__avg" id="avg-${c.key}">${_avgLabel(puntuacion)}</span>
          </div>
          <div class="criterio-score" data-grupo="${c.key}">${scoresBtns}</div>
        </div>
        <textarea
          class="criterio-item__nota"
          data-nota="${c.key}"
          placeholder="Nota opcional…"
          rows="2"
        >${nota}</textarea>
      </div>`;
  }).join('');

  const resultadoActual = rev?.resultado ?? 'pendiente';

  const RESULTADO_ICONS = { pendiente: '⏳', aprobado: '✓', rechazado: '✕' };
  const RESULTADO_LABELS = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado' };

  document.getElementById('revision-form-panel').innerHTML = `
    <div class="revision-form-panel__head">
      <div class="revision-form-panel__title">${t.titulo}</div>
      <div class="revision-form-panel__sub">
        <span class="badge badge--${t.estado}">${ESTADO_LABELS[t.estado] ?? t.estado}</span>
        ${rev ? `<span style="font-size:0.78rem;color:var(--color-text-muted)">· Revisión guardada anteriormente</span>` : ''}
      </div>
    </div>

    <div class="revision-form-body">

      <!-- Código de referencia + fragmento a evaluar -->
      ${_renderSeccionCodigo(t, rev)}

      <!-- Criterios -->
      <div>
        <div class="revision-section-sep">
          <div class="revision-section-sep__pill">2</div>
          <span class="revision-section-sep__title">Criterios de evaluación</span>
          <div class="revision-section-sep__line"></div>
        </div>
        <p style="font-size:0.78rem;color:var(--color-text-muted);margin-bottom:0.75rem">1 = grave &nbsp;·&nbsp; 5 = óptimo</p>
        <div class="revision-criterios" id="criterios-wrap">
          ${criteriosHTML}
        </div>
      </div>

      <!-- Observación general -->
      <div>
        <div class="revision-section-sep">
          <div class="revision-section-sep__pill">3</div>
          <span class="revision-section-sep__title">Observación general</span>
          <div class="revision-section-sep__line"></div>
        </div>
        <textarea
          id="obs-general-input"
          class="revision-obs-textarea"
          placeholder="Resumen general de la revisión…"
          rows="3"
        >${rev?.observacion_general ?? ''}</textarea>
      </div>

      <!-- Resultado -->
      <div>
        <div class="revision-section-sep">
          <div class="revision-section-sep__pill">4</div>
          <span class="revision-section-sep__title">Resultado de la revisión</span>
          <div class="revision-section-sep__line"></div>
        </div>
        <div class="revision-resultado">
          ${['pendiente', 'aprobado', 'rechazado'].map(r => `
            <label class="resultado-option resultado-option--${r}">
              <input type="radio" name="resultado" value="${r}" ${resultadoActual === r ? 'checked' : ''} />
              <span class="resultado-option__label">
                <span class="resultado-option__icon">${RESULTADO_ICONS[r]}</span>
                ${RESULTADO_LABELS[r]}
              </span>
            </label>`
          ).join('')}
        </div>
      </div>

      <!-- Footer -->
      <div class="revision-form__footer">
        <button class="revision-save-btn" id="revision-save-btn">
          <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
            <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/>
          </svg>
          ${rev ? 'Actualizar revisión' : 'Guardar revisión'}
        </button>
      </div>

    </div>`;

  wireScoreBtns();
  wireSaveBtn();
  _wireCopyBtnsRevision();
  wireSeleccionCodigo();
  wireAIBtn();
}

// ── Sección unificada: código de referencia + fragmento a evaluar ─────────────
function _renderSeccionCodigo(t, rev) {
  const corr    = t.correccion_codigo;
  const hayCorr = corr?.codigo;

  const _pillEvaluar = (codigoPreLlenado, hintTexto) => `
    <div>
      <div class="revision-section-sep">
        <div class="revision-section-sep__pill">1</div>
        <span class="revision-section-sep__title">Código a evaluar</span>
        <div class="revision-section-sep__line"></div>
      </div>
      <p class="rc-evaluar-hint" id="rc-evaluar-hint">${hintTexto}</p>
      <textarea
        id="fragmento-input"
        class="revision-code-textarea"
        placeholder="Pega aquí el fragmento de código que estás revisando…"
        rows="6"
      >${codigoPreLlenado}</textarea>
      <div class="rc-ai-bar">
        <button type="button" class="rc-ai-btn" id="rc-ai-btn">
          <svg class="rc-ai-icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
            <path d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.05a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06L5.05 4.11a.75.75 0 010-1.06zM13.89 3.05a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 01-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM1 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 011 10zM16.75 9.25a.75.75 0 010 1.5h-1.5a.75.75 0 010-1.5h1.5zM5.05 16.95a.75.75 0 010-1.06l1.06-1.06a.75.75 0 011.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0zM12.83 15.83a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM10 16.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM10 7a3 3 0 100 6 3 3 0 000-6z"/>
          </svg>
          <span class="rc-ai-btn__text">Analizar con IA</span>
        </button>
        <span class="rc-ai-hint">Sugerencias automáticas — revisa antes de guardar</span>
      </div>
    </div>`;

  // ── Caso A: solo código original (sin corrección) ──────────────────────────
  if (!hayCorr) {
    _codigoSeleccionado = 'original';
    const codigoPre = rev?.fragmento_codigo ?? (t.fragmentos_codigo?.[0]?.codigo ?? '');
    return `
      ${_renderFragmentosRef(t.fragmentos_codigo ?? [])}
      ${_pillEvaluar(codigoPre, '')}`;
  }

  // ── Caso B: ambos códigos existen ─────────────────────────────────────────
  _codigoSeleccionado = rev?.fragmento_codigo ? 'original' : 'correccion';
  const codigoPre = rev?.fragmento_codigo ?? corr.codigo;
  const hintTexto = rev?.fragmento_codigo
    ? 'Evaluando: fragmento guardado en revisión anterior'
    : 'Evaluando: corrección del desarrollador';

  const fragmentosHTML = (t.fragmentos_codigo ?? []).map(f => {
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

  const corrEscaped = corr.codigo.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const corrLang    = LANG_LABELS[corr.lenguaje] ?? corr.lenguaje ?? 'Código';

  const esOriginal  = _codigoSeleccionado === 'original';

  return `
    <!-- Cards de código de referencia -->
    <div>
      <div class="revision-section-sep">
        <div class="revision-section-sep__pill">0</div>
        <span class="revision-section-sep__title">Código de referencia</span>
        <div class="revision-section-sep__line"></div>
      </div>
      <div class="rc-codigo-cards">

        <!-- Card A: Código original del usuario -->
        <div class="rc-codigo-card">
          <div class="rc-codigo-card__header">
            <div class="rc-codigo-card__labels">
              <span class="revisor-codigo-label">Original del usuario</span>
            </div>
            <button
              type="button"
              class="rc-codigo-usar-btn${esOriginal ? ' rc-codigo-usar-btn--active' : ''}"
              data-usar-codigo="original"
            >${esOriginal ? '✓ Evaluando' : '▶ Usar para evaluación'}</button>
          </div>
          ${fragmentosHTML}
        </div>

        <!-- Card B: Corrección del desarrollador -->
        <div class="rc-codigo-card">
          <div class="rc-codigo-card__header">
            <div class="rc-codigo-card__labels">
              <span class="revisor-codigo-label revisor-codigo-label--corr">Corrección del desarrollador</span>
            </div>
            <button
              type="button"
              class="rc-codigo-usar-btn${!esOriginal ? ' rc-codigo-usar-btn--active' : ''}"
              data-usar-codigo="correccion"
            >${!esOriginal ? '✓ Evaluando' : '▶ Usar para evaluación'}</button>
          </div>
          <div class="du-fragmento">
            <div class="du-fragmento__header">
              <span class="du-fragmento__lang">${corrLang}</span>
              <button type="button" class="du-fragmento__copy" data-codigo="${encodeURIComponent(corr.codigo)}">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"/>
                  <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"/>
                </svg>
                Copiar
              </button>
            </div>
            <pre class="du-fragmento__pre"><code>${corrEscaped}</code></pre>
          </div>
        </div>

      </div>
    </div>

    ${_pillEvaluar(codigoPre, hintTexto)}`;
}

function wireSeleccionCodigo() {
  document.querySelectorAll('[data-usar-codigo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cual = btn.dataset.usarCodigo;
      const t    = _selectedTicket;

      const codigo = cual === 'correccion'
        ? (t.correccion_codigo?.codigo ?? '')
        : (t.fragmentos_codigo?.[0]?.codigo ?? '');

      document.getElementById('fragmento-input').value = codigo;
      _codigoSeleccionado = cual;

      document.querySelectorAll('[data-usar-codigo]').forEach(b => {
        const activo = b === btn;
        b.classList.toggle('rc-codigo-usar-btn--active', activo);
        b.textContent = activo ? '✓ Evaluando' : '▶ Usar para evaluación';
      });

      const hint = document.getElementById('rc-evaluar-hint');
      if (hint) hint.textContent = cual === 'correccion'
        ? 'Evaluando: corrección del desarrollador'
        : 'Evaluando: código original del usuario';
    });
  });
}

// ── Referencia de fragmentos del usuario ─────────────────────────────────────
function _renderFragmentosRef(fragmentos) {
  if (!fragmentos.length) return '';

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
    <div>
      <div class="revision-section-sep">
        <div class="revision-section-sep__pill">0</div>
        <span class="revision-section-sep__title">Código enviado por el usuario</span>
        <div class="revision-section-sep__line"></div>
      </div>
      ${items}
    </div>`;
}

function _wireCopyBtnsRevision() {
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

// ── Botones de puntuación ─────────────────────────────────────────────────────
function wireScoreBtns() {
  document.getElementById('criterios-wrap').addEventListener('click', e => {
    const btn = e.target.closest('.score-btn');
    if (!btn) return;

    const grupo = btn.dataset.criterio;
    document.querySelectorAll(`[data-criterio="${grupo}"]`).forEach(b => {
      b.classList.toggle('score-btn--active', b === btn);
    });

    // Actualizar label de puntuación seleccionada
    const avgEl = document.getElementById(`avg-${grupo}`);
    if (avgEl) avgEl.textContent = `Seleccionado: ${btn.dataset.valor}/5`;
  });
}

// ── Guardar revisión ──────────────────────────────────────────────────────────
function wireSaveBtn() {
  document.getElementById('revision-save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('revision-save-btn');
    btn.disabled    = true;
    btn.textContent = 'Guardando…';

    const payload = {
      ticket_id:        _selectedTicket.id,
      revisor_id:       _userId,
      fragmento_codigo: document.getElementById('fragmento-input').value.trim() || null,
      observacion_general: document.getElementById('obs-general-input').value.trim() || null,
      resultado:        document.querySelector('input[name="resultado"]:checked')?.value ?? 'pendiente',
      updated_at:       new Date().toISOString(),
    };

    // Recoger puntuaciones y notas de cada criterio
    CRITERIOS.forEach(c => {
      const activeBtn = document.querySelector(`.score-btn--active[data-criterio="${c.key}"]`);
      payload[`puntuacion_${c.key}`] = activeBtn ? parseInt(activeBtn.dataset.valor) : null;
      payload[`nota_${c.key}`]       = document.querySelector(`[data-nota="${c.key}"]`)?.value.trim() || null;
    });

    let error;

    if (_existingRevision) {
      ({ error } = await _supaClient
        .from('revision_codigo')
        .update(payload)
        .eq('id', _existingRevision.id));
    } else {
      payload.created_at = new Date().toISOString();
      const res = await _supaClient
        .from('revision_codigo')
        .insert(payload)
        .select()
        .single();
      error              = res.error;
      _existingRevision  = res.data ?? null;
    }

    if (error) {
      showToast('No se pudo guardar la revisión.', 'error');
    } else {
      showToast('Revisión guardada correctamente.', 'success');
      // Actualizar badge de "guardada anteriormente"
      const sub = document.querySelector('.revision-form-panel__sub');
      if (sub && !sub.querySelector('span:last-child')?.textContent.includes('anteriormente')) {
        sub.insertAdjacentHTML('beforeend', `<span style="margin-left:0.5rem;font-size:0.78rem;color:var(--color-text-muted)">Revisión guardada anteriormente</span>`);
      }
      document.getElementById('revision-save-btn').textContent = 'Actualizar revisión';
    }

    btn.disabled = false;
    btn.innerHTML = `
      <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
        <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/>
      </svg>
      ${_existingRevision ? 'Actualizar revisión' : 'Guardar revisión'}`;
  });
}

// ── IA: Analizar código con Groq ──────────────────────────────────────────────
function wireAIBtn() {
  const btn = document.getElementById('rc-ai-btn');
  if (btn) btn.addEventListener('click', analizarConIA);
}

async function analizarConIA() {
  const btn    = document.getElementById('rc-ai-btn');
  const codigo = document.getElementById('fragmento-input')?.value?.trim();

  if (!codigo) {
    showToast('Pega el código en la sección 1 antes de analizar.', 'warning');
    return;
  }

  btn.disabled = true;
  btn.querySelector('.rc-ai-btn__text').textContent = 'Analizando…';
  btn.classList.add('rc-ai-btn--loading');

  const lenguaje = _codigoSeleccionado === 'correccion' && _selectedTicket?.correccion_codigo?.lenguaje
    ? _selectedTicket.correccion_codigo.lenguaje
    : (_selectedTicket?.fragmentos_codigo?.[0]?.lenguaje ?? 'otro');

  try {
    const res = await fetch('/api/ai/analizar-codigo', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ codigo, lenguaje }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `Error del servidor (${res.status})`);
    }

    _aplicarSugerenciasIA(await res.json());
    showToast('IA analizó el código. Revisa las sugerencias antes de guardar.', 'info', 5000);
  } catch (err) {
    console.error('[IA]', err);
    showToast(`No se pudo analizar: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('.rc-ai-btn__text').textContent = 'Analizar con IA';
    btn.classList.remove('rc-ai-btn--loading');
  }
}

function _aplicarSugerenciasIA(s) {
  CRITERIOS.forEach(c => {
    const puntuacion = s[`puntuacion_${c.key}`];
    const nota       = s[`nota_${c.key}`];

    if (puntuacion >= 1 && puntuacion <= 5) {
      document.querySelectorAll(`.score-btn[data-criterio="${c.key}"]`).forEach(btn => {
        btn.classList.toggle('score-btn--active', parseInt(btn.dataset.valor) === puntuacion);
      });
      const avgEl = document.getElementById(`avg-${c.key}`);
      if (avgEl) avgEl.textContent = `Seleccionado: ${puntuacion}/5`;
    }

    const notaEl = document.querySelector(`[data-nota="${c.key}"]`);
    if (notaEl && nota) notaEl.value = nota;
  });

  const obsEl = document.getElementById('obs-general-input');
  if (obsEl && s.observacion_general) obsEl.value = s.observacion_general;

  if (s.resultado === 'aprobado' || s.resultado === 'rechazado') {
    const radio = document.querySelector(`input[name="resultado"][value="${s.resultado}"]`);
    if (radio) radio.checked = true;
  }
}

initRevision();
