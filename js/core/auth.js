// Gestión de sesión y roles — fuente de verdad: tabla perfiles (no JWT)
// Roles válidos: 'admin' | 'desarrollador' | 'revisor_codigo' | 'usuario'

const ROLE_ROUTES = {
  admin:          '/pages/admin/dashboard.html',
  desarrollador:  '/pages/agente/bandeja.html',
  revisor_codigo: '/pages/agente/bandeja.html',
  usuario:        '/pages/usuario/mis-tickets.html',
};

async function signIn(email, password) {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  sessionStorage.removeItem(_ROL_KEY);
  const client = await getSupabaseClient();
  await client.auth.signOut();
  window.location.href = '/login.html';
}

// Alias semántico
const logout = signOut;

async function getSession() {
  const client = await getSupabaseClient();
  const { data: { session } } = await client.auth.getSession();
  return session;
}

async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

const _ROL_KEY = 'qfx_rol';

// Lee el rol: primero sessionStorage (instantáneo), luego perfiles (red)
async function getRol() {
  const cached = sessionStorage.getItem(_ROL_KEY);
  if (cached) return cached;

  const user = await getUser();
  if (!user) return null;

  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;

  sessionStorage.setItem(_ROL_KEY, data.rol);
  return data.rol;
}

// Alias de compatibilidad
const getRole = getRol;

// Redirige a la ruta correcta según el rol leído de perfiles
async function redirectByRol() {
  const rol   = await getRol();
  const route = ROLE_ROUTES[rol];
  if (route) {
    window.location.href = route;
  } else {
    await signOut();
  }
}

// Alias de compatibilidad
const redirectByRole = redirectByRol;

// Protege una página: redirige a login si no hay sesión.
// Si se pasan rolesPermitidos, también verifica el rol.
async function requireAuth(rolesPermitidos = []) {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login.html';
    return null;
  }

  if (rolesPermitidos.length > 0) {
    const rol = await getRol();
    if (!rolesPermitidos.includes(rol)) {
      await redirectByRol();
      return null;
    }
  }

  return session;
}
