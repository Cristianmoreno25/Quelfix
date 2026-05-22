// Página de perfil — unificada para todos los roles

const ROL_LABELS = {
  admin:          'Administrador',
  desarrollador:  'Desarrollador',
  revisor_codigo: 'Revisor de código',
  usuario:        'Usuario',
};

// Estado del módulo
let _supaClient   = null;
let _user         = null;
let _perfil       = null;
let _rol          = null;
let _pendingFile  = null;

// ── Inicialización ───────────────────────────────────────────────────────────
async function initPerfil() {
  _supaClient = await getSupabaseClient();
  _user       = await getUser();
  if (!_user) return;

  _rol = await getRol();

  const { data, error } = await _supaClient
    .from('perfiles')
    .select('id, nombre, email, rol, avatar_url')
    .eq('id', _user.id)
    .single();

  if (error || !data) {
    showToast('Error al cargar el perfil.', 'error');
    return;
  }

  _perfil = data;

  renderHero();
  renderStats();
  fillInfoForm();
  wireAvatarUpload();
  wireInfoForm();
  wirePasswordForm();
  wireEyeBtns();
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function renderHero() {
  document.getElementById('perfil-name').textContent  = _perfil.nombre ?? '—';
  document.getElementById('perfil-email').textContent = _perfil.email  ?? '—';

  const badge = document.getElementById('perfil-role-badge');
  badge.textContent = ROL_LABELS[_perfil.rol] ?? _perfil.rol;
  badge.className   = `perfil-hero__role perfil-role--${_perfil.rol}`;

  _renderAvatar(_perfil.avatar_url);
}

function _renderAvatar(url) {
  const img       = document.getElementById('avatar-img');
  const initials  = document.getElementById('avatar-initials');

  if (url) {
    img.src           = url;
    img.hidden        = false;
    initials.hidden   = true;
  } else {
    img.hidden        = true;
    initials.hidden   = false;
    initials.textContent = _getInitials(_perfil.nombre ?? _perfil.email ?? '?');
    document.getElementById('avatar-display').style.setProperty(
      'background', _avatarColor(_perfil.id)
    );
  }
}

// ── Estadísticas por rol ─────────────────────────────────────────────────────
async function renderStats() {
  const wrap = document.getElementById('perfil-stats');
  let stats  = [];

  if (_rol === 'admin') {
    const [usersRes, ticketsRes, sinAsignarRes] = await Promise.all([
      _supaClient.from('perfiles').select('id', { count: 'exact', head: true }),
      _supaClient.from('tickets').select('id', { count: 'exact', head: true }),
      _supaClient.from('tickets').select('id', { count: 'exact', head: true })
        .is('desarrollador_id', null),
    ]);
    stats = [
      { label: 'Usuarios registrados', value: usersRes.count  ?? 0, color: '#285a48' },
      { label: 'Tickets en el sistema', value: ticketsRes.count ?? 0, color: '#2c5282' },
      { label: 'Sin asignar',          value: sinAsignarRes.count ?? 0, color: '#9a5252' },
    ];

  } else if (_rol === 'desarrollador') {
    const [asignadosRes, procesoRes, resueltosRes] = await Promise.all([
      _supaClient.from('tickets').select('id', { count: 'exact', head: true })
        .eq('desarrollador_id', _user.id),
      _supaClient.from('tickets').select('id', { count: 'exact', head: true })
        .eq('desarrollador_id', _user.id).eq('estado', 'en_proceso'),
      _supaClient.from('tickets').select('id', { count: 'exact', head: true })
        .eq('desarrollador_id', _user.id).eq('estado', 'resuelto'),
    ]);
    stats = [
      { label: 'Tickets asignados', value: asignadosRes.count ?? 0, color: '#285a48' },
      { label: 'En proceso',        value: procesoRes.count   ?? 0, color: '#2c5282' },
      { label: 'Resueltos',         value: resueltosRes.count ?? 0, color: '#408a71' },
    ];

  } else if (_rol === 'revisor_codigo') {
    const [asignadosRes, pendientesRes, aprobadosRes] = await Promise.all([
      _supaClient.from('tickets').select('id', { count: 'exact', head: true })
        .eq('revisor_id', _user.id),
      _supaClient.from('revision_codigo').select('id', { count: 'exact', head: true })
        .eq('revisor_id', _user.id).eq('resultado', 'pendiente'),
      _supaClient.from('revision_codigo').select('id', { count: 'exact', head: true })
        .eq('revisor_id', _user.id).eq('resultado', 'aprobado'),
    ]);
    stats = [
      { label: 'Asignado como revisor', value: asignadosRes.count  ?? 0, color: '#285a48' },
      { label: 'Revisiones pendientes', value: pendientesRes.count ?? 0, color: '#7a5a36' },
      { label: 'Aprobadas',             value: aprobadosRes.count  ?? 0, color: '#408a71' },
    ];

  } else {
    const [creadosRes, resueltosRes, abiertosRes] = await Promise.all([
      _supaClient.from('tickets').select('id', { count: 'exact', head: true })
        .eq('usuario_id', _user.id),
      _supaClient.from('tickets').select('id', { count: 'exact', head: true })
        .eq('usuario_id', _user.id).eq('estado', 'resuelto'),
      _supaClient.from('tickets').select('id', { count: 'exact', head: true })
        .eq('usuario_id', _user.id).eq('estado', 'abierto'),
    ]);
    stats = [
      { label: 'Tickets creados',  value: creadosRes.count   ?? 0, color: '#285a48' },
      { label: 'Resueltos',        value: resueltosRes.count ?? 0, color: '#408a71' },
      { label: 'Abiertos',         value: abiertosRes.count  ?? 0, color: '#2c5282' },
    ];
  }

  wrap.innerHTML = stats.map(s => `
    <div class="perfil-stat-card" style="--stat-color:${s.color}">
      <div class="perfil-stat-card__value">${s.value}</div>
      <div class="perfil-stat-card__label">${s.label}</div>
    </div>`
  ).join('');
}

// ── Formulario de información ─────────────────────────────────────────────────
function fillInfoForm() {
  document.getElementById('input-nombre').value     = _perfil.nombre ?? '';
  document.getElementById('display-email').textContent = _perfil.email ?? '—';
}

function wireInfoForm() {
  document.getElementById('info-form').addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = document.getElementById('input-nombre').value.trim();

    if (!nombre) {
      showToast('El nombre no puede estar vacío.', 'error');
      return;
    }

    const btn = document.getElementById('info-save-btn');
    btn.disabled    = true;
    btn.textContent = 'Guardando...';

    const { error } = await _supaClient
      .from('perfiles')
      .update({ nombre })
      .eq('id', _user.id);

    if (error) {
      showToast('No se pudo actualizar el nombre.', 'error');
    } else {
      _perfil.nombre = nombre;
      document.getElementById('perfil-name').textContent = nombre;
      showToast('Nombre actualizado correctamente.', 'success');
    }

    btn.disabled    = false;
    btn.textContent = 'Guardar cambios';
  });
}

// ── Cambiar contraseña ────────────────────────────────────────────────────────
function wirePasswordForm() {
  document.getElementById('password-form').addEventListener('submit', async e => {
    e.preventDefault();

    const pwdEl   = document.getElementById('input-password');
    const confEl  = document.getElementById('input-confirm');
    const pwdErr  = document.getElementById('password-error');
    const confErr = document.getElementById('confirm-error');

    pwdErr.textContent  = '';
    confErr.textContent = '';

    const pwd  = pwdEl.value;
    const conf = confEl.value;
    let valid  = true;

    if (pwd.length < 8) {
      pwdErr.textContent = 'La contraseña debe tener al menos 8 caracteres.';
      valid = false;
    }
    if (pwd !== conf) {
      confErr.textContent = 'Las contraseñas no coinciden.';
      valid = false;
    }
    if (!valid) return;

    const btn = document.getElementById('password-save-btn');
    btn.disabled    = true;
    btn.textContent = 'Actualizando...';

    const { error } = await _supaClient.auth.updateUser({ password: pwd });

    if (error) {
      showToast('No se pudo cambiar la contraseña.', 'error');
    } else {
      pwdEl.value  = '';
      confEl.value = '';
      showToast('Contraseña actualizada correctamente.', 'success');
    }

    btn.disabled    = false;
    btn.textContent = 'Actualizar contraseña';
  });
}

// ── Subida de avatar ─────────────────────────────────────────────────────────
function wireAvatarUpload() {
  const editBtn    = document.getElementById('avatar-edit-btn');
  const fileInput  = document.getElementById('avatar-input');
  const previewBar = document.getElementById('preview-bar');
  const previewImg = document.getElementById('preview-thumb');
  const fileLabel  = document.getElementById('preview-filename');
  const saveBtn    = document.getElementById('preview-save');
  const cancelBtn  = document.getElementById('preview-cancel');

  editBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('La imagen no debe superar los 2 MB.', 'error');
      fileInput.value = '';
      return;
    }

    _pendingFile = file;
    const reader = new FileReader();
    reader.onload = ev => {
      previewImg.src     = ev.target.result;
      fileLabel.textContent = file.name.length > 40
        ? file.name.slice(0, 37) + '...'
        : file.name;
      previewBar.hidden  = false;
    };
    reader.readAsDataURL(file);
  });

  cancelBtn.addEventListener('click', () => {
    _pendingFile      = null;
    fileInput.value   = '';
    previewBar.hidden = true;
  });

  saveBtn.addEventListener('click', async () => {
    if (!_pendingFile) return;

    saveBtn.disabled    = true;
    saveBtn.textContent = 'Subiendo...';

    const ext      = _pendingFile.type.split('/')[1];
    const path     = `${_user.id}/avatar.${ext}`;

    const { error: uploadError } = await _supaClient.storage
      .from('avatars')
      .upload(path, _pendingFile, { upsert: true, contentType: _pendingFile.type });

    if (uploadError) {
      showToast('Error al subir la imagen. Intenta de nuevo.', 'error');
      saveBtn.disabled  = false;
      saveBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg> Guardar foto`;
      return;
    }

    const { data: urlData } = _supaClient.storage
      .from('avatars')
      .getPublicUrl(path);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await _supaClient
      .from('perfiles')
      .update({ avatar_url: publicUrl })
      .eq('id', _user.id);

    if (updateError) {
      showToast('Imagen subida pero no se pudo guardar en el perfil.', 'error');
    } else {
      _perfil.avatar_url = publicUrl;
      _renderAvatar(publicUrl);
      previewBar.hidden  = true;
      _pendingFile       = null;
      fileInput.value    = '';
      showToast('Foto de perfil actualizada.', 'success');
    }

    saveBtn.disabled  = false;
    saveBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg> Guardar foto`;
  });
}

// ── Botones ojo (mostrar/ocultar contraseña) ─────────────────────────────────
function wireEyeBtns() {
  [['eye-btn-1', 'input-password'], ['eye-btn-2', 'input-confirm']].forEach(([btnId, inputId]) => {
    document.getElementById(btnId).addEventListener('click', () => {
      const input = document.getElementById(inputId);
      input.type  = input.type === 'password' ? 'text' : 'password';
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _getInitials(str) {
  return str.trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '').join('');
}

function _avatarColor(id) {
  const palette = ['#285a48', '#408a71', '#2c5282', '#7a5a36', '#9a5252', '#5a6828'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

initPerfil();
