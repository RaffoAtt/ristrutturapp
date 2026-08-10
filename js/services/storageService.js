// ===== DATA PERSISTENCE SERVICE =====

const STORAGE_KEY = 'ristrutturaApp_v2';

const initialState = {
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
        this.state = { ...this.state, ...saved };
      }
    } catch (e) {
      console.error('Errore caricamento dati:', e);
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

  getProgetto() {
    return this.state.progetti.find(p => p.id === this.state.progettoAttivoId) || null;
  },

  getLavori() {
    return this.state.lavori.filter(l => l.progettoId === this.state.progettoAttivoId);
  },

  getSpese() {
    return this.state.spese.filter(s => s.progettoId === this.state.progettoAttivoId);
  },

  getFornitori() {
    return this.state.fornitori;
  },

  getScadenze() {
    return this.state.scadenze.filter(s => s.progettoId === this.state.progettoAttivoId);
  },

  reset() {
    this.state = { ...initialState };
    localStorage.removeItem(STORAGE_KEY);
  }
};
