// Crear ticket — rol usuario

const LANGS = [
  { value: 'javascript',  label: 'JavaScript'  },
  { value: 'typescript',  label: 'TypeScript'  },
  { value: 'python',      label: 'Python'      },
  { value: 'java',        label: 'Java'        },
  { value: 'cpp',         label: 'C++'         },
  { value: 'csharp',      label: 'C#'          },
  { value: 'php',         label: 'PHP'         },
  { value: 'html',        label: 'HTML'        },
  { value: 'css',         label: 'CSS'         },
  { value: 'sql',         label: 'SQL'         },
  { value: 'bash',        label: 'Bash'        },
  { value: 'otro',        label: 'Otro'        },
];

const MAX_SNIPPETS = 5;

let _supaClient = null;
let _userId     = null;

// ── Inicialización ───────────────────────────────────────────────────────────
async function initCrearTicket() {
  _supaClient = await getSupabaseClient();
  _userId     = (await getUser())?.id;

  if (!_userId) return;

  wireCharCounter();
  wireCategoriaConCodigo();
  wireForm();
}

// ── Contador de caracteres ────────────────────────────────────────────────────
function wireCharCounter() {
  const textarea = document.getElementById('descripcion');
  const counter  = document.getElementById('desc-counter');
  const MAX      = 2000;

  function update() {
    const len = textarea.value.length;
    counter.textContent = `${len} / ${MAX}`;
    counter.classList.toggle('char-counter--warn', len >= MAX * 0.8 && len < MAX);
    counter.classList.toggle('char-counter--over', len >= MAX);
  }

  textarea.addEventListener('input', update);
}

// ── Cuaderno de código ────────────────────────────────────────────────────────
function wireCategoriaConCodigo() {
  const radios = document.querySelectorAll('input[name="categoria"]');
  radios.forEach(r => r.addEventListener('change', _onCategoriaChange));
}

function _onCategoriaChange() {
  const wrap     = document.getElementById('codigo-wrap');
  const notebook = document.getElementById('codigo-notebook');
  const selected = document.querySelector('input[name="categoria"]:checked')?.value;

  if (selected === 'revision_codigo') {
    wrap.classList.remove('codigo-wrap--hidden');
    if (notebook.children.length === 0) _addSnippet();
  } else {
    wrap.classList.add('codigo-wrap--hidden');
    notebook.innerHTML = '';
    _updateAddBtn();
  }
}

function _addSnippet() {
  const notebook = document.getElementById('codigo-notebook');
  if (notebook.children.length >= MAX_SNIPPETS) return;

  const idx  = notebook.children.length;
  const card = document.createElement('div');
  card.className = 'codigo-snippet';

  const langOptions = LANGS.map(l =>
    `<option value="${l.value}">${l.label}</option>`
  ).join('');

  card.innerHTML = `
    <div class="codigo-snippet__header">
      <select class="codigo-snippet__lang">
        ${langOptions}
      </select>
      <button type="button" class="codigo-snippet__remove" title="Eliminar fragmento">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
        </svg>
      </button>
    </div>
    <textarea
      class="code-area"
      placeholder="// Escribe o pega tu código aquí…"
      spellcheck="false"
      autocomplete="off"
    ></textarea>`;

  card.querySelector('.codigo-snippet__remove').addEventListener('click', () => {
    card.remove();
    _updateRemoveBtns();
    _updateAddBtn();
  });

  card.querySelector('.code-area').addEventListener('keydown', _handleTab);

  notebook.appendChild(card);
  _updateRemoveBtns();
  _updateAddBtn();
  card.querySelector('.code-area').focus();
}

function _handleTab(e) {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const ta    = e.target;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + '  ' + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + 2;
}

function _updateRemoveBtns() {
  const cards = document.querySelectorAll('.codigo-snippet');
  cards.forEach(c => {
    c.querySelector('.codigo-snippet__remove').style.display =
      cards.length === 1 ? 'none' : 'flex';
  });
}

function _updateAddBtn() {
  const btn   = document.getElementById('codigo-add-btn');
  const count = document.querySelectorAll('.codigo-snippet').length;
  btn.disabled = count >= MAX_SNIPPETS;
  btn.title = count >= MAX_SNIPPETS ? `Máximo ${MAX_SNIPPETS} fragmentos` : '';
}

function _getFragmentos() {
  return Array.from(document.querySelectorAll('.codigo-snippet')).map(card => ({
    lenguaje: card.querySelector('.codigo-snippet__lang').value,
    codigo:   card.querySelector('.code-area').value.trim(),
  }));
}

// ── Formulario ────────────────────────────────────────────────────────────────
function wireForm() {
  document.getElementById('codigo-add-btn')
    .addEventListener('click', _addSnippet);

  document.getElementById('crear-form').addEventListener('submit', async e => {
    e.preventDefault();

    if (!_validate()) return;

    const btn = document.getElementById('crear-btn');
    btn.disabled  = true;
    btn.innerHTML = `
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="animation:spin 0.8s linear infinite">
        <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd"/>
      </svg>
      Enviando…`;

    const categoria = document.querySelector('input[name="categoria"]:checked').value;

    const payload = {
      titulo:             document.getElementById('titulo').value.trim(),
      descripcion:        document.getElementById('descripcion').value.trim(),
      categoria,
      prioridad:          document.querySelector('input[name="prioridad"]:checked')?.value ?? 'media',
      usuario_id:         _userId,
      estado:             'abierto',
      fragmentos_codigo:  categoria === 'revision_codigo' ? _getFragmentos() : [],
    };

    const { error } = await _supaClient.from('tickets').insert(payload);

    if (error) {
      showToast('No se pudo crear el ticket. Inténtalo de nuevo.', 'error');
      btn.disabled  = false;
      btn.innerHTML = `
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z"/>
        </svg>
        Enviar ticket`;
    } else {
      sessionStorage.setItem('qfx_toast', JSON.stringify({
        text: '¡Ticket creado! Te notificaremos cuando haya novedades.',
        type: 'success',
      }));
      window.location.href = '/pages/usuario/mis-tickets.html';
    }
  });
}

// ── Validación ────────────────────────────────────────────────────────────────
function _validate() {
  let ok = true;

  const titulo      = document.getElementById('titulo').value.trim();
  const tituloErr   = document.getElementById('titulo-error');
  const tituloInput = document.getElementById('titulo');
  if (!titulo) {
    tituloErr.textContent = 'El título es obligatorio.';
    tituloInput.classList.add('form-input--error');
    ok = false;
  } else if (titulo.length < 5) {
    tituloErr.textContent = 'El título debe tener al menos 5 caracteres.';
    tituloInput.classList.add('form-input--error');
    ok = false;
  } else {
    tituloErr.textContent = '';
    tituloInput.classList.remove('form-input--error');
  }

  const desc      = document.getElementById('descripcion').value.trim();
  const descErr   = document.getElementById('descripcion-error');
  const descInput = document.getElementById('descripcion');
  if (!desc) {
    descErr.textContent = 'La descripción es obligatoria.';
    descInput.classList.add('form-textarea--error');
    ok = false;
  } else if (desc.length < 10) {
    descErr.textContent = 'La descripción debe tener al menos 10 caracteres.';
    descInput.classList.add('form-textarea--error');
    ok = false;
  } else {
    descErr.textContent = '';
    descInput.classList.remove('form-textarea--error');
  }

  const categoria = document.querySelector('input[name="categoria"]:checked');
  const catErr    = document.getElementById('categoria-error');
  const catGrid   = document.getElementById('categoria-grid');
  if (!categoria) {
    catErr.textContent = 'Selecciona una categoría.';
    catGrid.classList.add('categoria-grid--error');
    ok = false;
  } else {
    catErr.textContent = '';
    catGrid.classList.remove('categoria-grid--error');
  }

  if (categoria?.value === 'revision_codigo') {
    const fragmentos  = _getFragmentos();
    const codigoErr   = document.getElementById('codigo-error');
    const tieneKodigo = fragmentos.some(f => f.codigo.length > 0);
    if (!tieneKodigo) {
      codigoErr.textContent = 'Debes incluir al menos un fragmento de código.';
      ok = false;
    } else {
      codigoErr.textContent = '';
    }
  }

  document.getElementById('titulo').addEventListener('input', () => {
    document.getElementById('titulo-error').textContent = '';
    document.getElementById('titulo').classList.remove('form-input--error');
  }, { once: true });
  document.getElementById('descripcion').addEventListener('input', () => {
    document.getElementById('descripcion-error').textContent = '';
    document.getElementById('descripcion').classList.remove('form-textarea--error');
  }, { once: true });

  return ok;
}

// Inyectar animación spin si no existe
if (!document.getElementById('spin-style')) {
  const s = document.createElement('style');
  s.id = 'spin-style';
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}

initCrearTicket();
