// Gestión de sesión y roles usando Supabase Auth.
// Roles válidos: 'admin' | 'agente' | 'usuario'

const ROLE_ROUTES = {
  admin:   '/pages/admin/dashboard.html',
  agente:  '/pages/agente/bandeja.html',
  usuario: '/pages/usuario/mis-tickets.html',
};

async function signIn(email, password) {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const client = await getSupabaseClient();
  await client.auth.signOut();
  window.location.href = '/login.html';
}

async function getSession() {
  const client = await getSupabaseClient();
  const { data: { session } } = await client.auth.getSession();
  return session;
}

async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

// Devuelve el rol del usuario desde los metadatos
async function getRole() {
  const user = await getUser();
  return user?.user_metadata?.role ?? null;
}

// Redirige a login si no hay sesión; devuelve la sesión activa si la hay
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login.html';
    return null;
  }
  return session;
}

// Redirige a la página correcta según el rol del usuario
async function redirectByRole() {
  const role  = await getRole();
  const route = ROLE_ROUTES[role];
  if (route) {
    window.location.href = route;
  } else {
    await signOut();
  }
}
