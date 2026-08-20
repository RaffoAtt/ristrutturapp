// ===== SUPABASE SERVICE =====
// Gestisce connessione, autenticazione e CRUD con Supabase

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabaseConfig.js';

let supabaseClient = null;

async function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase JS library not loaded');
    return null;
  }
  
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// ===== AUTENTICAZIONE =====

export async function signUp(email, password) {
  try {
    const client = await initSupabase();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        // Reindirizza alla stessa origine dopo la conferma email
        // In produzione sarà https://tua-app.vercel.app
        emailRedirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return { success: true, user: data.user };
  } catch (error) {
    console.error('signUp error:', error);
    return { success: false, error: error.message };
  }
}

export async function signIn(email, password) {
  try {
    const client = await initSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return { success: true, user: data.user };
  } catch (error) {
    console.error('signIn error:', error);
    return { success: false, error: error.message };
  }
}

export async function signOut() {
  try {
    const client = await initSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('signOut error:', error);
    return { success: false, error: error.message };
  }
}

export async function getCurrentUser() {
  try {
    const client = await initSupabase();
    if (!client) return null;
    const { data: { user }, error } = await client.auth.getUser();
    if (error) {
      // AuthSessionMissingError è normale quando non si è autenticati, non loggare
      if (error.name === 'AuthSessionMissingError' || error.message?.includes('session')) {
        return null;
      }
      throw error;
    }
    return user;
  } catch (error) {
    // Non loggare errori di sessione mancante (normale per utenti ospite)
    if (!error.message?.includes('session') && !error.message?.includes('Session')) {
      console.error('getCurrentUser error:', error);
    }
    return null;
  }
}

// ===== PROGETTI =====

export async function createProgetto(progetto) {
  try {
    const client = await initSupabase();
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await client
      .from('progetti')
      .insert([{ ...progetto, user_id: user.id }])
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('createProgetto error:', error);
    return { success: false, error: error.message };
  }
}

export async function getProjetti() {
  try {
    const client = await initSupabase();
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await client
      .from('progetti')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getProjetti error:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function updateProgetto(id, updates) {
  try {
    const client = await initSupabase();
    const { data, error } = await client
      .from('progetti')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('updateProgetto error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteProgetto(id) {
  try {
    const client = await initSupabase();
    const { error } = await client
      .from('progetti')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('deleteProgetto error:', error);
    return { success: false, error: error.message };
  }
}

// ===== LAVORI =====

export async function createLavoro(lavoro) {
  try {
    const client = await initSupabase();
    const { data, error } = await client
      .from('lavori')
      .insert([lavoro])
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('createLavoro error:', error);
    return { success: false, error: error.message };
  }
}

export async function getLavori(progettoId) {
  try {
    const client = await initSupabase();
    const { data, error } = await client
      .from('lavori')
      .select('*')
      .eq('progetto_id', progettoId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getLavori error:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function updateLavoro(id, updates) {
  try {
    const client = await initSupabase();
    const { data, error } = await client
      .from('lavori')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('updateLavoro error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteLavoro(id) {
  try {
    const client = await initSupabase();
    const { error } = await client
      .from('lavori')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('deleteLavoro error:', error);
    return { success: false, error: error.message };
  }
}

// ===== SPESE =====

export async function createSpesa(spesa) {
  try {
    const client = await initSupabase();
    const { data, error } = await client
      .from('spese')
      .insert([spesa])
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('createSpesa error:', error);
    return { success: false, error: error.message };
  }
}

export async function getSpese(progettoId) {
  try {
    const client = await initSupabase();
    const { data, error } = await client
      .from('spese')
      .select('*')
      .eq('progetto_id', progettoId)
      .order('data', { ascending: false });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getSpese error:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function updateSpesa(id, updates) {
  try {
    const client = await initSupabase();
    const { data, error } = await client
      .from('spese')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('updateSpesa error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteSpesa(id) {
  try {
    const client = await initSupabase();
    const { error } = await client
      .from('spese')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('deleteSpesa error:', error);
    return { success: false, error: error.message };
  }
}

// ===== FORNITORI =====

export async function createFornitore(fornitore) {
  try {
    const client = await initSupabase();
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await client
      .from('fornitori')
      .insert([{ ...fornitore, user_id: user.id }])
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('createFornitore error:', error);
    return { success: false, error: error.message };
  }
}

export async function getFornitori() {
  try {
    const client = await initSupabase();
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await client
      .from('fornitori')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getFornitori error:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function updateFornitore(id, updates) {
  try {
    const client = await initSupabase();
    const { data, error } = await client
      .from('fornitori')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('updateFornitore error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteFornitore(id) {
  try {
    const client = await initSupabase();
    const { error } = await client
      .from('fornitori')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('deleteFornitore error:', error);
    return { success: false, error: error.message };
  }
}

// ===== SCADENZE =====

export async function createScadenza(scadenza) {
  try {
    const client = await initSupabase();
    const { data, error } = await client
      .from('scadenze')
      .insert([scadenza])
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('createScadenza error:', error);
    return { success: false, error: error.message };
  }
}

export async function getScadenze(progettoId) {
  try {
    const client = await initSupabase();
    const { data, error } = await client
      .from('scadenze')
      .select('*')
      .eq('progetto_id', progettoId)
      .order('data', { ascending: true });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getScadenze error:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function updateScadenza(id, updates) {
  try {
    const client = await initSupabase();
    const { data, error } = await client
      .from('scadenze')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('updateScadenza error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteScadenza(id) {
  try {
    const client = await initSupabase();
    const { error } = await client
      .from('scadenze')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('deleteScadenza error:', error);
    return { success: false, error: error.message };
  }
}

// ===== EXPORT =====

export const supabaseService = {
  // Auth
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  // Progetti
  createProgetto,
  getProjetti,
  updateProgetto,
  deleteProgetto,
  // Lavori
  createLavoro,
  getLavori,
  updateLavoro,
  deleteLavoro,
  // Spese
  createSpesa,
  getSpese,
  updateSpesa,
  deleteSpesa,
  // Fornitori
  createFornitore,
  getFornitori,
  updateFornitore,
  deleteFornitore,
  // Scadenze
  createScadenza,
  getScadenze,
  updateScadenza,
  deleteScadenza
};
