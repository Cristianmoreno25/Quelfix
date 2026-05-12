// Validaciones de formularios reutilizables

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isNotEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isMinLength(value, min) {
  return typeof value === 'string' && value.trim().length >= min;
}

// Valida un formulario y muestra los errores en el DOM.
// `rules` es un objeto { fieldId: [{ check: fn, message: string }] }
// Devuelve true si todos los campos son válidos.
function validateForm(rules) {
  let valid = true;

  for (const [fieldId, fieldRules] of Object.entries(rules)) {
    const input = document.getElementById(fieldId);
    const errorEl = document.getElementById(`${fieldId}-error`);
    if (!input) continue;

    const value = input.value;
    let fieldError = '';

    for (const rule of fieldRules) {
      if (!rule.check(value)) {
        fieldError = rule.message;
        break;
      }
    }

    if (errorEl) errorEl.textContent = fieldError;
    input.classList.toggle('input--error', !!fieldError);
    if (fieldError) valid = false;
  }

  return valid;
}
