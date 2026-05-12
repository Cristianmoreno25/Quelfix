// Utilidades generales reutilizables en todas las páginas

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoString));
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Mapea un estado de ticket a su etiqueta CSS
function estadoBadgeClass(estado) {
  const map = {
    abierto:    'badge--info',
    en_proceso: 'badge--warning',
    resuelto:   'badge--success',
    cerrado:    'badge--neutral',
  };
  return map[estado] ?? 'badge--neutral';
}

// Espera N milisegundos (útil para debouncear eventos)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Obtiene un parámetro de la URL actual
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
