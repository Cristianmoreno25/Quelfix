// Inicializa el cliente Supabase obteniendo la config desde el servidor.
// Usar getSupabaseClient() en lugar de acceder al módulo directamente.

let _client = null;

async function getSupabaseClient() {
  if (_client) return _client;

  const res    = await fetch('/api/config');
  const config = await res.json();

  const { createClient } = window.supabase;
  _client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  return _client;
}
