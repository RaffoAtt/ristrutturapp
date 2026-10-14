// ===== VERCEL SERVERLESS FUNCTION =====
// Proxy per Gemini API - la chiave è nelle Environment Variables di Vercel

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY non configurata su Vercel > Settings > Environment Variables' });
  }

  try {
    const { model, prompt } = req.body || {};
    if (!model || !prompt) {
      return res.status(400).json({ error: 'Parametri mancanti: model e prompt richiesti' });
    }

    // Endpoint corretto Gemini generateContent — chiave passata come query param
    // (più compatibile rispetto all'header x-goog-api-key in alcuni ambienti)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
