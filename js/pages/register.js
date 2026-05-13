const form = document.getElementById('register-form');
const btn  = document.getElementById('register-btn');

// Redirigir si ya hay sesión activa
getSession().then(session => {
  if (session) redirectByRol();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const password        = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  const ok = validateForm({
    nombre: [
      { check: isNotEmpty, message: 'El nombre es obligatorio.' },
    ],
    email: [
      { check: isNotEmpty,   message: 'El correo es obligatorio.' },
      { check: isValidEmail, message: 'Ingresa un correo válido.' },
    ],
    password: [
      { check: isNotEmpty,             message: 'La contraseña es obligatoria.' },
      { check: v => isMinLength(v, 6), message: 'Mínimo 6 caracteres.' },
    ],
    'confirm-password': [
      { check: isNotEmpty,                    message: 'Confirma tu contraseña.' },
      { check: v => v === password,           message: 'Las contraseñas no coinciden.' },
    ],
  });

  if (!ok) return;

  const email  = document.getElementById('email').value.trim();
  const nombre = document.getElementById('nombre').value.trim();

  btn.disabled    = true;
  btn.textContent = 'Creando cuenta...';

  try {
    const client = await getSupabaseClient();
    const { error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { nombre },
      },
    });

    if (error) throw error;

    showToast('Cuenta creada. Revisa tu correo para confirmar el registro.', 'success', 6000);
    setTimeout(() => { window.location.href = '/login.html'; }, 2500);
  } catch (err) {
    const msg = err?.message?.includes('already registered')
      ? 'Ya existe una cuenta con ese correo.'
      : 'No se pudo completar el registro. Intenta de nuevo.';
    showToast(msg, 'error');
    btn.disabled    = false;
    btn.textContent = 'Crear cuenta';
  }
});
