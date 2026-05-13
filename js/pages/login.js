const form = document.getElementById('login-form');
const btn  = document.getElementById('login-btn');

// Si ya hay sesión válida, redirigir sin crear bucle
(async () => {
  try {
    const session = await getSession();
    if (!session) return;

    const rol   = await getRol();
    const route = ROLE_ROUTES[rol];

    if (route) {
      window.location.href = route;
    } else {
      // Sesión existe pero sin rol válido → limpiar y quedar en login
      sessionStorage.removeItem('qfx_rol');
      const client = await getSupabaseClient();
      await client.auth.signOut();
    }
  } catch {
    // Error de red → quedarse en login sin hacer nada
  }
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const ok = validateForm({
    email: [
      { check: isNotEmpty,   message: 'El correo es obligatorio.' },
      { check: isValidEmail, message: 'Ingresa un correo válido.' },
    ],
    password: [
      { check: isNotEmpty,             message: 'La contraseña es obligatoria.' },
      { check: v => isMinLength(v, 6), message: 'Mínimo 6 caracteres.' },
    ],
  });

  if (!ok) return;

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled    = true;
  btn.textContent = 'Entrando...';

  try {
    await signIn(email, password);

    const rol   = await getRol();
    const route = ROLE_ROUTES[rol];

    if (route) {
      window.location.href = route;
    } else {
      showToast('Tu cuenta no tiene un rol asignado. Contacta al administrador.', 'error');
      btn.disabled    = false;
      btn.textContent = 'Iniciar sesión';
    }
  } catch {
    showToast('Correo o contraseña incorrectos.', 'error');
    btn.disabled    = false;
    btn.textContent = 'Iniciar sesión';
  }
});
