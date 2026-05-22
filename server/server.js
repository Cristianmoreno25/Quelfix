require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { createClient } = require('@supabase/supabase-js');

const app  = express();
const PORT = process.env.PORT || 3000;

// Cliente admin (usa service_role, solo en el servidor)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ── API ───────────────────────────────────────────────────────────

// Expone la config pública al frontend (nunca el service_role key)
app.get('/api/config', (_req, res) => {
  res.json({
    supabaseUrl:     process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Quelfix' });
});

// ── Middleware: verificar JWT de Supabase ─────────────────────────
async function verificarJWT(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado.' });
  }
  const token = auth.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
  req.user = user;
  next();
}

// ── IA: analizar código con Groq ──────────────────────────────────
app.post('/api/ai/analizar-codigo', verificarJWT, async (req, res) => {
  const { codigo, lenguaje } = req.body ?? {};

  if (!codigo || typeof codigo !== 'string' || !codigo.trim()) {
    return res.status(400).json({ error: 'El campo "codigo" es requerido.' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(503).json({ error: 'Servicio de IA no configurado.' });

  const langHint = lenguaje && lenguaje !== 'otro' ? lenguaje : 'código';

  const userPrompt = `Analiza el siguiente fragmento de ${langHint} y evalúa 6 criterios de calidad de código.

CRITERIOS (escala: 1 = problema severo, 5 = excelente):
1. error_logico: ¿Hay errores en la lógica del algoritmo?
2. error_sintaxis: ¿Hay errores de sintaxis o que impidan la ejecución?
3. uso_inadecuado_vars: ¿Se usan variables de forma inadecuada?
4. validaciones_incompletas: ¿Faltan validaciones de entradas o casos borde?
5. organizacion_deficiente: ¿La estructura del código es deficiente?
6. malas_practicas: ¿Hay malas prácticas (código duplicado, magic numbers, etc.)?

Para "resultado": si promedio >= 3.5 → "aprobado", si no → "rechazado".

Devuelve SOLO este JSON sin markdown ni texto extra:
{
  "puntuacion_error_logico": <1-5>,
  "nota_error_logico": "<1 línea o null>",
  "puntuacion_error_sintaxis": <1-5>,
  "nota_error_sintaxis": "<1 línea o null>",
  "puntuacion_uso_inadecuado_vars": <1-5>,
  "nota_uso_inadecuado_vars": "<1 línea o null>",
  "puntuacion_validaciones_incompletas": <1-5>,
  "nota_validaciones_incompletas": "<1 línea o null>",
  "puntuacion_organizacion_deficiente": <1-5>,
  "nota_organizacion_deficiente": "<1 línea o null>",
  "puntuacion_malas_practicas": <1-5>,
  "nota_malas_practicas": "<1 línea o null>",
  "observacion_general": "<2-3 oraciones>",
  "resultado": "aprobado" | "rechazado"
}

CÓDIGO:
\`\`\`
${codigo.slice(0, 8000)}
\`\`\``;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model:           'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Eres un revisor de código experto. Responde SOLO con JSON válido, sin texto adicional.' },
          { role: 'user',   content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature:     0.2,
        max_tokens:      1024,
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error('[Groq] HTTP', groqRes.status, errBody);
      return res.status(502).json({ error: 'Error al contactar el servicio de IA.' });
    }

    const groqData = await groqRes.json();
    const content  = groqData.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: 'Respuesta vacía del servicio de IA.' });

    res.json(JSON.parse(content));
  } catch (err) {
    console.error('[Groq] excepción:', err.message);
    res.status(500).json({ error: 'Error interno al procesar la solicitud de IA.' });
  }
});

// ── IA: corregir código con Groq ──────────────────────────────────
app.post('/api/ai/corregir-codigo', verificarJWT, async (req, res) => {
  const { codigo, lenguaje } = req.body ?? {};

  if (!codigo || typeof codigo !== 'string' || !codigo.trim()) {
    return res.status(400).json({ error: 'El campo "codigo" es requerido.' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(503).json({ error: 'Servicio de IA no configurado.' });

  const langHint = lenguaje && lenguaje !== 'otro' ? lenguaje : 'código';

  const userPrompt = `Eres un desarrollador experto. Corrige el siguiente fragmento de ${langHint}.

Devuelve SOLO este JSON sin markdown ni texto extra:
{
  "codigo_corregido": "<código corregido completo>",
  "resumen_cambios": "<lista de 2-4 cambios concretos realizados, en español>"
}

CÓDIGO ORIGINAL:
\`\`\`
${codigo.slice(0, 8000)}
\`\`\``;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model:           'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Eres un desarrollador experto. Responde SOLO con JSON válido.' },
          { role: 'user',   content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature:     0.2,
        max_tokens:      2048,
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error('[Groq corregir] HTTP', groqRes.status, errBody);
      return res.status(502).json({ error: 'Error al contactar el servicio de IA.' });
    }

    const groqData = await groqRes.json();
    const content  = groqData.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: 'Respuesta vacía del servicio de IA.' });

    res.json(JSON.parse(content));
  } catch (err) {
    console.error('[Groq corregir] excepción:', err.message);
    res.status(500).json({ error: 'Error interno al procesar la solicitud de IA.' });
  }
});

// ── Fallback: cualquier ruta no-API devuelve index.html ───────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Quelfix corriendo en http://localhost:${PORT}`);
});

module.exports = { supabaseAdmin };
