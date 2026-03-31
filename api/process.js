const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;
  const SHEETS_URL = process.env.SHEETS_URL;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  try {
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
          content: `Extraé los datos de este mensaje sobre un terreno en Buenos Aires.\n\nMensaje: "${message}"\n\nReglas:\n- fecha: si no está especificada usá hoy (${today})\n- direccion: dirección completa\n- barrio: detectar del barrio o dirección\n- frente: metros de frente (solo número)\n- fondo: metros de fondo (solo número)\n- m2_vendibles: solo m2 vendibles (solo número)\n- precio: precio total en USD (solo número, normalizar ej USD 1.8M = 1800000)\n- incidencia: USD por m2 (solo número)\n\nRespondé SOLO con JSON válido sin backticks:\n{"fecha":"","direccion":"","barrio":"","frente":"","fondo":"","precio":"","m2_vendibles":"","incidencia":""}`
        }]
      })
    });
const claudeData = await claudeRes.json();
console.log('Claude response:', JSON.stringify(claudeData));
if (!claudeData.content) {
  return res.status(500).json({ error: 'Claude API error: ' + JSON.stringify(claudeData) });
}
const raw = claudeData.content.map(i => i.text || '').join('').trim();

    const data = JSON.parse(raw.replace(/```json|```/g, '').trim());

    await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    res.status(200).json({ success: true, data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = handler;
