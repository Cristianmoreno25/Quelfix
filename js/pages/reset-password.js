const loadingEl = document.getElementById('reset-loading');
const formEl    = document.getElementById('reset-form');
const invalidEl = document.getElementById('reset-invalid');
const btn       = document.getElementById('reset-btn');

// Supabase envía el token en el hash de la URL (#access_token=...&type=recovery)
// onAuthStateChange detecta PASSWORD_RECOVERY y confirma que el token es válido

async function initResetPage() {
  const client = await getSupabaseClient();

  client.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      loadingEl.style.display = 'none';
      formEl.style.display    = '';
    } else if (event === 'SIGNED_IN' && !session) {
      showInvalid();
    }
  });

  // Si no hay hash con token, mostrar error directamente
  const hash = window.location.hash;
  if (!hash.includes('access_token') && !hash.includes('type=recovery')) {
    // Dar tiempo a onAuthStateChange para dispararse antes de concluir
    setTimeout(() => {
      if (formEl.style.display === 'none') showInvalid();
    }, 1500);
  }
}

function showInvalid() {
  loadingEl.style.display  = 'none';
  formEl.style.display     = 'none';
  invalidEl.style.display  = '';
}

initResetPage();

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();

  const password = document.getElementById('password').value;

  const ok = validateForm({
    password: [
      { check: isNotEmpty,             message: 'La contraseña es obligatoria.' },
      { check: v => isMinLength(v, 6), message: 'Mínimo 6 caracteres.' },
    ],
    'confirm-password': [
      { check: isNotEmpty,          message: 'Confirma tu contraseña.' },
      { check: v => v === password, message: 'Las contraseñas no coinciden.' },
    ],
  });

  if (!ok) return;

  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  try {
    const client = await getSupabaseClient();
    const { error } = await client.auth.updateUser({ password });

    if (error) throw error;

    showToast('Contraseña actualizada correctamente.', 'success', 5000);
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 2000);
  } catch {
    showToast('No se pudo actualizar la contraseña. Intenta de nuevo.', 'error');
    btn.disabled    = false;
    btn.textContent = 'Guardar nueva contraseña';
  }
});
