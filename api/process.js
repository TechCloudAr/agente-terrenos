module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;
  const SHEETS_URL = process.env.SHEETS_URL;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  try {
    // Step 1: Extract data with Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Extraé los datos de este mensaje sobre un terreno en Buenos Aires.

Mensaje: "${message}"

Reglas:
- fecha: si no está especificada usá hoy (${today})
- direccion: dirección completa
- barrio: detectar del barrio o dirección
- frente: metros de frente (solo número)
- fondo: metros de fondo (solo número)
- m2_vendibles: solo m2 vendibles (solo número, sin texto)
- precio: precio total en USD (solo número, normalizar ej USD 1.8M = 1800000)
- incidencia: USD por m2 (solo número)

Respondé SOLO con JSON válido, sin explicaciones ni backticks:
{"fecha":"","direccion":"","barrio":"","frente":"","fondo":"","precio":"","m2_vendibles":"","incidencia":""}`
        }]
      })
    });

    const claudeData = await claudeRes.json();
    const raw = claudeData.content.map(i => i.text || '').join('').trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);

    // Step 2: Send to Google Sheets
    await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    res.status(200).json({ success: true, data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
