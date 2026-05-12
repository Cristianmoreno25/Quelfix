// Protección de rutas por rol.
// Uso: routerGuard(['admin']) en cada página protegida.

async function routerGuard(allowedRoles = []) {
  const session = await requireAuth();
  if (!session) return;

  const role = session.user?.user_metadata?.role;

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    await redirectByRole();
  }
}

// Oculta/muestra elementos del DOM según el rol activo
async function applyRoleVisibility() {
  const role = await getRole();
  if (!role) return;

  document.querySelectorAll('[data-role]').forEach(el => {
    const allowed = el.dataset.role.split(',').map(r => r.trim());
    el.style.display = allowed.includes(role) ? '' : 'none';
  });
}
