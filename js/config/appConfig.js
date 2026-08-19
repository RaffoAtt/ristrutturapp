// ===== WHITE-LABEL APP CONFIGURATION =====
// Modifica questo file per personalizzare l'app per ogni cliente.
// Per la versione DEMO (ristrutturapp pubblica) lascia i valori di default.

export const APP_CONFIG = {

  // ── BRANDING ──────────────────────────────────────────────
  appName:     'RistrutturaApp',           // Nome dell'app (titolo browser, splash, sidebar)
  appSubtitle: 'Gestione Ristrutturazioni', // Sottotitolo (splash e login)
  appIcon:     '🏗️',                       // Emoji o URL immagine per l'icona

  // ── COLORE PRIMARIO ───────────────────────────────────────
  // Cambia questo per adattare il tema colore all'identità visiva del cliente
  primaryColor: '#007AFF',                 // Es: '#E84C3D' per rosso, '#2ECC71' per verde

  // ── FUNZIONALITÀ DEMO/COMMERCIALE ─────────────────────────
  showAds:        true,    // false = nasconde la colonna pubblicitaria (per clienti paganti)
  showPremiumBtn: true,    // false = nasconde il pulsante "Upgrade Premium" (per clienti paganti)

  // ── CONTATTI E LEGALE ─────────────────────────────────────
  contactEmail: 'info@ristrutturapp.it',
  privacyEmail: 'privacy@ristrutturapp.it',

  // ── NOTA FOOTER LOGIN ─────────────────────────────────────
  loginFooterNote: 'I tuoi dati sono protetti da Supabase',

  // ── NOME CLIENTE (solo white-label) ───────────────────────
  // Lascia vuoto per la versione demo pubblica.
  // Per un cliente: 'Studio Tecnico Rossi' → appare nella sidebar come "powered by"
  clientName: '',

};
