// ===== AI CONFIGURATION =====
// GEMINI_API_KEY non serve qui: in produzione la chiave è in
// Vercel > Settings > Environment Variables > GEMINI_API_KEY
// Il proxy /api/gemini la legge server-side.

export const AI_CONFIG = {
  GEMINI_API_KEY: '',
  GEMINI_MODEL: 'gemini-3.8-flash',
  GEMINI_ENDPOINT: '/api/gemini'
};
