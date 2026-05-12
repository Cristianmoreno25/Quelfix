const form     = document.getElementById('login-form');
const btn      = document.getElementById('login-btn');
const errorMsg = document.getElementById('login-error');

// Si ya hay sesión activa, redirigir directamente
getSession().then(session => {
  if (session) redirectByRole();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const ok = validateForm({
    email: [
      { check: isNotEmpty,    message: 'El correo es obligatorio.' },
      { check: isValidEmail,  message: 'Ingresa un correo válido.' },
    ],
    password: [
      { check: isNotEmpty,                      message: 'La contraseña es obligatoria.' },
      { check: v => isMinLength(v, 6),           message: 'Mínimo 6 caracteres.' },
    ],
  });

  if (!ok) return;

  btn.disabled    = true;
  btn.textContent = 'Entrando...';

  try {
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    await signIn(email, password);
    await redirectByRole();
  } catch (err) {
    errorMsg.textContent = 'Correo o contraseña incorrectos.';
    btn.disabled    = false;
    btn.textContent = 'Iniciar sesión';
  }
});
