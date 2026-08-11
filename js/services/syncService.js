// ===== SYNC SERVICE =====
// Sincronizza i dati tra localStorage e Supabase

import { supabaseService } from './supabaseService.js';
import { storageService } from './storageService.js';

// ===== CARICA DA SUPABASE AL LOGIN =====
export async function loadFromSupabase() {
  try {
    const user = await supabaseService.getCurrentUser();
    if (!user) return false;

    console.log('Caricamento dati da Supabase per:', user.email);

    // Carica progetti
    const progettiRes = await supabaseService.getProjetti();
    const progetti = progettiRes.success ? progettiRes.data.map(p => ({
      id: p.id,
      nome: p.nome,
      indirizzo: p.indirizzo || '',
      budget: p.budget || 0,
      dataInizio: p.data_inizio || '',
      dataFine: p.data_fine || '',
      note: p.note || '',
      createdAt: new Date(p.created_at).getTime()
    })) : [];

    if (progetti.length === 0) {
      console.log('Nessun progetto su Supabase, uso localStorage');
      return false;
    }

    const progettoAttivoId = storageService.state.progettoAttivoId || progetti[0]?.id || null;

    // Carica lavori, spese, scadenze per ogni progetto
    let lavori = [], spese = [], scadenze = [];

    for (const p of progetti) {
      const [lavoriRes, speseRes, scadenzeRes] = await Promise.all([
        supabaseService.getLavori(p.id),
        supabaseService.getSpese(p.id),
        supabaseService.getScadenze(p.id)
      ]);

      if (lavoriRes.success) {
        lavori = lavori.concat(lavoriRes.data.map(l => ({
          id: l.id, progettoId: l.progetto_id, nome: l.nome,
          categoria: l.categoria || 'Altro', stato: l.stato || 'da_fare',
          preventivo: l.preventivo || 0, avanzamento: l.avanzamento || 0,
          priorita: l.priorita || 'normale', note: l.note || '',
          dataInizio: l.data_inizio || '', dataFine: l.data_fine || '',
          fornitoreId: l.fornitore_id || ''
        })));
      }

      if (speseRes.success) {
        spese = spese.concat(speseRes.data.map(s => ({
          id: s.id, progettoId: s.progetto_id, descrizione: s.descrizione,
          importo: s.importo || 0, categoria: s.categoria || 'Altro',
          data: s.data || '', lavoroId: s.lavoro_id || '',
          fornitoreId: s.fornitore_id || '', pagamento: s.pagamento || 'Altro',
          ricevuta: s.ricevuta || false, note: s.note || ''
        })));
      }

      if (scadenzeRes.success) {
        scadenze = scadenze.concat(scadenzeRes.data.map(s => ({
          id: s.id, progettoId: s.progetto_id, titolo: s.titolo,
          data: s.data || '', tipo: s.tipo || 'altro',
          lavoroId: s.lavoro_id || '', note: s.note || ''
        })));
      }
    }

    // Carica fornitori
    const fornitoriRes = await supabaseService.getFornitori();
    const fornitori = fornitoriRes.success ? fornitoriRes.data.map(f => ({
      id: f.id, nome: f.nome, tipo: f.tipo || 'Altro',
      tel: f.tel || '', email: f.email || '',
      piva: f.piva || '', rating: f.rating || 0, note: f.note || ''
    })) : [];

    // Aggiorna lo stato locale con i dati di Supabase
    storageService.state.progetti = progetti;
    storageService.state.progettoAttivoId = progettoAttivoId;
    storageService.state.lavori = lavori;
    storageService.state.spese = spese;
    storageService.state.fornitori = fornitori;
    storageService.state.scadenze = scadenze;
    storageService.saveData();

    console.log('Sync completato:', { progetti: progetti.length, lavori: lavori.length, spese: spese.length });
    return true;
  } catch (err) {
    console.error('loadFromSupabase error:', err);
    return false;
  }
}

// ===== SALVA PROGETTO SU SUPABASE =====
export async function saveProgettoToSupabase(progetto) {
  try {
    const user = await supabaseService.getCurrentUser();
    if (!user) return false;
    const res = await supabaseService.createProgetto({
      id: progetto.id, nome: progetto.nome,
      indirizzo: progetto.indirizzo || null, budget: progetto.budget || 0,
      data_inizio: progetto.dataInizio || null, data_fine: progetto.dataFine || null,
      note: progetto.note || null
    });
    return res.success;
  } catch (err) {
    console.error('saveProgettoToSupabase error:', err);
    return false;
  }
}

// ===== SALVA LAVORO SU SUPABASE =====
export async function saveLavoroToSupabase(lavoro) {
  try {
    const user = await supabaseService.getCurrentUser();
    if (!user) return false;
    const res = await supabaseService.createLavoro({
      id: lavoro.id, progetto_id: lavoro.progettoId, nome: lavoro.nome,
      categoria: lavoro.categoria, stato: lavoro.stato,
      preventivo: lavoro.preventivo, avanzamento: lavoro.avanzamento,
      priorita: lavoro.priorita, note: lavoro.note,
      data_inizio: lavoro.dataInizio || null, data_fine: lavoro.dataFine || null,
      fornitore_id: lavoro.fornitoreId || null
    });
    return res.success;
  } catch (err) {
    console.error('saveLavoroToSupabase error:', err);
    return false;
  }
}

// ===== SALVA SPESA SU SUPABASE =====
export async function saveSpesaToSupabase(spesa) {
  try {
    const user = await supabaseService.getCurrentUser();
    if (!user) return false;
    const res = await supabaseService.createSpesa({
      id: spesa.id, progetto_id: spesa.progettoId, descrizione: spesa.descrizione,
      importo: spesa.importo, categoria: spesa.categoria, data: spesa.data || null,
      lavoro_id: spesa.lavoroId || null, fornitore_id: spesa.fornitoreId || null,
      pagamento: spesa.pagamento, ricevuta: spesa.ricevuta || false, note: spesa.note || null
    });
    return res.success;
  } catch (err) {
    console.error('saveSpesaToSupabase error:', err);
    return false;
  }
}

// ===== SALVA FORNITORE SU SUPABASE =====
export async function saveFornitoreToSupabase(fornitore) {
  try {
    const user = await supabaseService.getCurrentUser();
    if (!user) return false;
    const res = await supabaseService.createFornitore({
      id: fornitore.id, nome: fornitore.nome, tipo: fornitore.tipo,
      tel: fornitore.tel || null, email: fornitore.email || null,
      piva: fornitore.piva || null, rating: fornitore.rating || 0,
      note: fornitore.note || null
    });
    return res.success;
  } catch (err) {
    console.error('saveFornitoreToSupabase error:', err);
    return false;
  }
}

// ===== SALVA SCADENZA SU SUPABASE =====
export async function saveScadenzaToSupabase(scadenza) {
  try {
    const user = await supabaseService.getCurrentUser();
    if (!user) return false;
    const res = await supabaseService.createScadenza({
      id: scadenza.id, progetto_id: scadenza.progettoId, titolo: scadenza.titolo,
      data: scadenza.data || null, tipo: scadenza.tipo,
      lavoro_id: scadenza.lavoroId || null, note: scadenza.note || null
    });
    return res.success;
  } catch (err) {
    console.error('saveScadenzaToSupabase error:', err);
    return false;
  }
}
