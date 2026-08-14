// ===== AI CONFIGURATION =====
// In produzione (Vercel): usa il proxy /api/gemini - la chiave è sicura sul server
// In sviluppo locale: usa Gemini direttamente con la chiave hardcoded

const isProduction = window.location.hostname !== 'localhost' &&
                     window.location.hostname !== '127.0.0.1';

export const AI_CONFIG = {
  // In produzione usa il proxy Vercel, in sviluppo locale usa Gemini direttamente
  GEMINI_ENDPOINT: isProduction
    ? '/api/gemini'
    : 'https://generativelanguage.googleapis.com/v1beta/interactions',

  // Chiave usata SOLO in sviluppo locale
  // In produzione la chiave è nelle Environment Variables di Vercel
  GEMINI_API_KEY: 'AQ.Ab8RN6JM3tLwtatyAy0JU8voXAF-kXo8Euj9o_agt90c1A-vaw',

  GEMINI_MODEL: 'gemini-3.6-flash'
};
