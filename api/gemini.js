// ===== VERCEL SERVERLESS FUNCTION =====
// Proxy per Gemini API - la chiave è nascosta nelle variabili d'ambiente di Vercel
// La chiave NON viene mai esposta al browser

export default async function handler(req, res) {
  // Gestisce preflight CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Legge la chiave dalle variabili d'ambiente di Vercel (mai visibile al browser)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chiave API non configurata. Aggiungila su Vercel > Settings > Environment Variables' });
  }

  try {
    const { model, input } = req.body;

    if (!model || !input) {
      return res.status(400).json({ error: 'Parametri mancanti: model e input sono obbligatori' });
    }

    // Chiama Gemini API dal server (la chiave è sicura qui)
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({ model, input })
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errData.error?.message || 'Errore Gemini API',
        status: response.status
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Gemini proxy error:', err);
    return res.status(500).json({ error: 'Errore server: ' + err.message });
  }
}
