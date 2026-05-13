const form = document.getElementById('forgot-form');
const btn  = document.getElementById('forgot-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const ok = validateForm({
    email: [
      { check: isNotEmpty,   message: 'El correo es obligatorio.' },
      { check: isValidEmail, message: 'Ingresa un correo válido.' },
    ],
  });

  if (!ok) return;

  const email = document.getElementById('email').value.trim();

  btn.disabled    = true;
  btn.textContent = 'Enviando...';

  try {
    const client = await getSupabaseClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`,
    });

    if (error) throw error;

    showToast('Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.', 'success', 7000);
    btn.textContent = 'Enlace enviado';
  } catch {
    showToast('No se pudo enviar el correo de recuperación. Intenta de nuevo.', 'error');
    btn.disabled    = false;
    btn.textContent = 'Enviar enlace de recuperación';
  }
});
