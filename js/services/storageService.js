// ===== DATA PERSISTENCE SERVICE =====
// Gestisce lo stato locale e la persistenza su localStorage.
// Il sistema supporta N progetti per utente (1:N).

const STORAGE_KEY = 'ristrutturaApp_v2';

export const initialState = {
  progetti: [],
  progettoAttivoId: null,
  lavori: [],
  spese: [],
  fornitori: [],
  scadenze: [],
  computoData: null
};

export const storageService = {
  state: { ...initialState },

  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        this.state = { ...initialState, ...saved };
      }
    } catch (e) {
      console.error('Errore caricamento dati:', e);
      this.state = { ...initialState };
    }
    return this.state;
  },

  saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Errore salvataggio dati:', e);
    }
  },

  getState() {
    return this.state;
  },

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.saveData();
  },

  // Restituisce il progetto attivo
  getProgetto() {
    return this.state.progetti.find(p => p.id === this.state.progettoAttivoId) || null;
  },

  // Restituisce tutti i progetti
  getProgetti() {
    return this.state.progetti || [];
  },

  // Lavori del progetto attivo
  getLavori() {
    return this.state.lavori.filter(l => l.progettoId === this.state.progettoAttivoId);
  },

  // Spese del progetto attivo
  getSpese() {
    return this.state.spese.filter(s => s.progettoId === this.state.progettoAttivoId);
  },

  // Fornitori (globali per utente, non per progetto)
  getFornitori() {
    return this.state.fornitori || [];
  },

  // Scadenze del progetto attivo
  getScadenze() {
    return this.state.scadenze.filter(s => s.progettoId === this.state.progettoAttivoId);
  },

  reset() {
    this.state = { ...initialState };
    localStorage.removeItem(STORAGE_KEY);
  }
};
