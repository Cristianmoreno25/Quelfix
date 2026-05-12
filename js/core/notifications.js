// Suscripción a notificaciones en tiempo real vía Supabase Realtime.
// Requiere una tabla `notificaciones` con columna `user_id`.

let _channel = null;

async function subscribeToNotifications(userId, onNew) {
  const client = await getSupabaseClient();

  _channel = client
    .channel(`notificaciones:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${userId}` },
      payload => onNew(payload.new)
    )
    .subscribe();
}

async function unsubscribeNotifications() {
  if (!_channel) return;
  const client = await getSupabaseClient();
  await client.removeChannel(_channel);
  _channel = null;
}

// Muestra un toast en pantalla
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
