// ===== SYNC SERVICE =====
// Sincronizza i dati tra localStorage e Supabase
// NOTA: Non passiamo mai l'id locale a Supabase (non è UUID)
// Supabase genera automaticamente il proprio UUID per ogni record

import { supabaseService, deleteLavoriByProgetto, deleteSpesaByProgetto, deleteScadenzeByProgetto } from './supabaseService.js';
import { storageService } from './storageService.js';

// ===== CARICA DA SUPABASE AL LOGIN =====
export async function loadFromSupabase() {
  try {
    const user = await supabaseService.getCurrentUser();
    if (!user) return false;

    console.log('Caricamento dati da Supabase per:', user.email);

    const progettiRes = await supabaseService.getProjetti();
    const progetti = progettiRes.success ? progettiRes.data.map(p => ({
      id: p.id, nome: p.nome,
      indirizzo: p.indirizzo || '', budget: p.budget || 0,
      dataInizio: p.data_inizio || '', dataFine: p.data_fine || '',
      note: p.note || '', createdAt: new Date(p.created_at).getTime()
    })) : [];

    if (progetti.length === 0) {
      console.log('Nessun progetto su Supabase, uso localStorage');
      return false;
    }

    const progettoAttivoId = storageService.state.progettoAttivoId || progetti[0]?.id || null;
    let lavori = [], spese = [], scadenze = [];

    for (const p of progetti) {
      const [lavoriRes, speseRes, scadenzeRes] = await Promise.all([
        supabaseService.getLavori(p.id),
        supabaseService.getSpese(p.id),
        supabaseService.getScadenze(p.id)
      ]);
      if (lavoriRes.success) lavori = lavori.concat(lavoriRes.data.map(l => ({
        id: l.id, progettoId: l.progetto_id, nome: l.nome,
        categoria: l.categoria || 'Altro', stato: l.stato || 'da_fare',
        preventivo: l.preventivo || 0, avanzamento: l.avanzamento || 0,
        priorita: l.priorita || 'normale', note: l.note || '',
        dataInizio: l.data_inizio || '', dataFine: l.data_fine || '',
        fornitoreId: l.fornitore_id || ''
      })));
      if (speseRes.success) spese = spese.concat(speseRes.data.map(s => ({
        id: s.id, progettoId: s.progetto_id, descrizione: s.descrizione,
        importo: s.importo || 0, categoria: s.categoria || 'Altro',
        data: s.data || '', lavoroId: s.lavoro_id || '',
        fornitoreId: s.fornitore_id || '', pagamento: s.pagamento || 'Altro',
        ricevuta: s.ricevuta || false, note: s.note || ''
      })));
      if (scadenzeRes.success) scadenze = scadenze.concat(scadenzeRes.data.map(s => ({
        id: s.id, progettoId: s.progetto_id, titolo: s.titolo,
        data: s.data || '', tipo: s.tipo || 'altro',
        lavoroId: s.lavoro_id || '', note: s.note || ''
      })));
    }

    const fornitoriRes = await supabaseService.getFornitori();
    const fornitori = fornitoriRes.success ? fornitoriRes.data.map(f => ({
      id: f.id, nome: f.nome, tipo: f.tipo || 'Altro',
      tel: f.tel || '', email: f.email || '',
      piva: f.piva || '', rating: f.rating || 0, note: f.note || ''
    })) : [];

    storageService.state.progetti = progetti;
    storageService.state.progettoAttivoId = progettoAttivoId;
    storageService.state.lavori = lavori;
    storageService.state.spese = spese;
    storageService.state.fornitori = fornitori;
    storageService.state.scadenze = scadenze;
    storageService.saveData();

    console.log('Sync completato:', { progetti: progetti.length, lavori: lavori.length });
    return true;
  } catch (err) {
    console.error('loadFromSupabase error:', err);
    return false;
  }
}

// ===== ELIMINA PROGETTO DA SUPABASE (con tutti i dati collegati) =====
// IMPORTANTE: eliminare prima i figli (lavori/spese/scadenze per progetto_id),
// poi il progetto. Se si elimina prima il progetto, la RLS policy su lavori
// ("progetto_id IN (SELECT id FROM progetti WHERE user_id = auth.uid())")
// fallisce perché il progetto non esiste più → CASCADE viene bloccato → rollback.
export async function deleteProgettoFromSupabase(progettoId) {
  console.log('[DELETE] Avvio eliminazione progetto:', progettoId);

  try {
    const user = await supabaseService.getCurrentUser();
    console.log('[DELETE] Utente autenticato:', user ? user.email : 'NON AUTENTICATO');
    if (!user) {
      console.error('[DELETE] ERRORE: utente non autenticato');
      return false;
    }

    // Step 1: elimina PRIMA i figli per progetto_id (mentre il progetto esiste ancora)
    const rLavori = await deleteLavoriByProgetto(progettoId);
    console.log('[DELETE] Lavori eliminati →', rLavori.success ? 'OK' : 'ERRORE: ' + rLavori.error);

    const rSpese = await deleteSpesaByProgetto(progettoId);
    console.log('[DELETE] Spese eliminate →', rSpese.success ? 'OK' : 'ERRORE: ' + rSpese.error);

    const rScadenze = await deleteScadenzeByProgetto(progettoId);
    console.log('[DELETE] Scadenze eliminate →', rScadenze.success ? 'OK' : 'ERRORE: ' + rScadenze.error);

    // Step 2: elimina il progetto DOPO i figli
    const res = await supabaseService.deleteProgetto(progettoId);
    console.log('[DELETE] Progetto', progettoId, '→', res.success ? 'ELIMINATO DA SUPABASE ✅' : 'ERRORE: ' + res.error);
    return res.success;
  } catch (err) {
    console.error('[DELETE] Eccezione:', err);
    return false;
  }
}

// ===== SALVA PROGETTO SU SUPABASE =====
// Restituisce l'oggetto Supabase (con UUID reale) o null
export async function saveProgettoToSupabase(progetto) {
  try {
    const user = await supabaseService.getCurrentUser();
    if (!user) return null;
    // Niente campo 'id': Supabase genera UUID automaticamente
    const res = await supabaseService.createProgetto({
      nome: progetto.nome,
      indirizzo: progetto.indirizzo || null,
      budget: progetto.budget || 0,
      data_inizio: progetto.dataInizio || null,
      data_fine: progetto.dataFine || null,
      note: progetto.note || null
    });
    return res.success ? res.data : null;
  } catch (err) {
    console.error('saveProgettoToSupabase error:', err);
    return null;
  }
}

// ===== SALVA LAVORO SU SUPABASE =====
export async function saveLavoroToSupabase(lavoro) {
  try {
    const user = await supabaseService.getCurrentUser();
    if (!user) return false;
    const res = await supabaseService.createLavoro({
      progetto_id: lavoro.progettoId, nome: lavoro.nome,
      categoria: lavoro.categoria, stato: lavoro.stato,
      preventivo: lavoro.preventivo, avanzamento: lavoro.avanzamento,
      priorita: lavoro.priorita, note: lavoro.note,
      data_inizio: lavoro.dataInizio || null,
      data_fine: lavoro.dataFine || null,
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
      progetto_id: spesa.progettoId, descrizione: spesa.descrizione,
      importo: spesa.importo, categoria: spesa.categoria,
      data: spesa.data || null, lavoro_id: spesa.lavoroId || null,
      fornitore_id: spesa.fornitoreId || null, pagamento: spesa.pagamento,
      ricevuta: spesa.ricevuta || false, note: spesa.note || null
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
      nome: fornitore.nome, tipo: fornitore.tipo,
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
      progetto_id: scadenza.progettoId, titolo: scadenza.titolo,
      data: scadenza.data || null, tipo: scadenza.tipo,
      lavoro_id: scadenza.lavoroId || null, note: scadenza.note || null
    });
    return res.success;
  } catch (err) {
    console.error('saveScadenzaToSupabase error:', err);
    return false;
  }
}
