// ===== WHITE-LABEL APP CONFIGURATION =====
// Modifica questo file per personalizzare l'app per ogni cliente.
// Per la versione DEMO (ristrutturapp pubblica) lascia i valori di default.

export const APP_CONFIG = {

  // ── BRANDING ──────────────────────────────────────────────
  appName:     'RistrutturaApp',
  appSubtitle: 'Gestione Ristrutturazioni',
  appIcon:     '🏗️',

  // ── COLORE PRIMARIO ───────────────────────────────────────
  primaryColor: '#007AFF',

  // ── FUNZIONALITÀ ─────────────────────────────────────────
  showDocumenti: true,   // Mostra sezione Documenti condivisi

  // ── CONTATTI E LEGALE ─────────────────────────────────────
  contactEmail: 'info@ristrutturapp.it',
  privacyEmail: 'privacy@ristrutturapp.it',

  // ── NOTA FOOTER LOGIN ─────────────────────────────────────
  loginFooterNote: 'I tuoi dati sono protetti da Supabase',

  // ── NOME CLIENTE (solo white-label) ───────────────────────
  // Lascia vuoto per la versione demo pubblica.
  // Per un cliente: 'Studio Tecnico Rossi'
  clientName: '',

};
