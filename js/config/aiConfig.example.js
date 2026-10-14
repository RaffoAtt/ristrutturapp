// ===== AI CONFIGURATION TEMPLATE =====
// ISTRUZIONI:
// 1. Copia questo file e rinominalo in: js/config/aiConfig.js
// 2. Sostituisci YOUR_GEMINI_API_KEY con la tua chiave da https://aistudio.google.com/app/apikey
// 3. Il file aiConfig.js è nel .gitignore e NON verrà pubblicato su git

export const AI_CONFIG = {
  // Usata solo per chiamate dirette (sviluppo locale senza proxy Vercel)
  // In produzione su Vercel la chiave è in Settings > Environment Variables > GEMINI_API_KEY
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',
  GEMINI_MODEL: 'gemini-3.8-flash',
  // In produzione usa il proxy Vercel ('/api/gemini')
  // In sviluppo locale puoi usare l'endpoint diretto con la tua API key
  GEMINI_ENDPOINT: '/api/gemini'
};
