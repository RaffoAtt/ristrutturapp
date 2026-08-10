# 🚀 RistrutturaApp - Roadmap Integrata (Refactor + Migliorie)

**Data:** 10/08/2026  
**Status:** Fase 1 (Refactor Modulare) ✅ COMPLETATA

---

## 📊 Situazione Attuale

### ✅ Completato (Fase 1 - Refactor Modulare)
```
✓ js/utils/helpers.js          - Funzioni utility (format, uid, etc)
✓ js/utils/constants.js        - Costanti (icone, colori, labels)
✓ js/services/storageService.js - Gestione localStorage
✓ js/components/ui.js          - UI generiche (modali, toast, sidebar)
✓ js/app.js                    - Entry point modulare
✓ REFACTOR_PLAN.md            - Documentazione completa
✓ app-old.js                  - Backup del codice originale
```

### 🎯 Obiettivo Finale
Trasformare RistrutturaApp da **app amatoriale** a **prodotto commerciale vendibile** in ~8-12 settimane.

---

## 🔴 PROBLEMI CRITICI (da ANALISI_MIGLIORAMENTI.md)

### 1️⃣ **NESSUN BACKEND / AUTENTICAZIONE** 🚨 CRITICO
**Impatto:** App non vendibile senza questo
- ❌ Dati solo localStorage → perdita totale se cache cancellata
- ❌ No multi-device sync
- ❌ No login utente
- ❌ Impossibile offrire SLA affidabili

**Soluzione:** Supabase (PostgreSQL + Auth + Realtime)  
**Tempo:** 2-3 settimane  
**Priority:** 🔴🔴🔴 MASSIMA

---

### 2️⃣ **NESSUN PDF REPORT** 🚨 HIGH VALUE
**Impatto:** Non puoi mandare consuntivo a cliente/banca
- ❌ Solo dashboard visiva
- ❌ Nessun documento formale
- ❌ Non vendibile a professionisti

**Soluzione:** jsPDF + template professionale  
**Tempo:** 3-5 giorni  
**Priority:** 🔴🔴 ALTA

---

### 3️⃣ **ARCHITETTURA FRAGILE** 🚨 TECH DEBT
**Impatto:** Difficile da mantenere e scalare
- ❌ Monolitico (1279 righe in app.js)
- ❌ Nessuna separazione componenti
- ❌ Difficile testare

**Soluzione:** Completare refactor modulare (gia' iniziato)  
**Tempo:** 2-3 settimane  
**Priority:** 🟠 MEDIA (in progress)

---

### 4️⃣ **NESSUNA GESTIONE ERRORI** 🚨 IMPORTANTE
**Impatto:** Crash silenzioso, non sai cosa è rotto
- ❌ Nessun error tracking
- ❌ Nessun logging
- ❌ Esperienza pessima

**Soluzione:** Sentry + try/catch + user messages  
**Tempo:** 1 settimana  
**Priority:** 🟠 MEDIA

---

### 5️⃣ **NESSUNA DOCUMENTAZIONE** 🚨 IMPORTANTE
**Impatto:** Non credibile, no SEO, no onboarding
- ❌ No README
- ❌ No privacy policy/TOS
- ❌ No video tutorial

**Soluzione:** Documentazione completa  
**Tempo:** 3-5 giorni  
**Priority:** 🟡 MEDIA

---

## 🎯 FASI DI IMPLEMENTAZIONE PRIORITARIE

### **FASE A: COMPLETAMENTO REFACTOR MODULARE** (2-3 settimane)
*Prerequisito per tutto il resto*

**Status:** 30% completato (base creata)

#### Cosa Manca
```
⏳ js/components/dashboard.js      - Dashboard rendering
⏳ js/components/lavori.js         - Gestione lavori  
⏳ js/components/spese.js          - Gestione spese
⏳ js/components/fornitori.js      - Gestione fornitori
⏳ js/components/scadenze.js       - Gestione scadenze
⏳ js/components/progetti.js       - Gestione progetti
⏳ js/components/computo.js        - Import computo metrico
⏳ js/components/backup.js         - Export/import backup
⏳ js/app.js (complete)            - Importare tutti i componenti + binding window
⏳ index.html (update)             - Usare type="module"
```

#### Checklist
- [ ] Migrare tutte funzioni da app-old.js nei componenti
- [ ] Testare onclick inline compatibility
- [ ] Verificare storage access
- [ ] Testare su mobile/desktop
- [ ] Cancellare app-old.js se tutto funziona
- [ ] Aggiornare REFACTOR_PLAN.md status

**Output:** App funziona identico ma con codice modulare

---

### **FASE B: BACKEND + AUTENTICAZIONE** (2-3 settimane)
*CRITICO per vendibilità*

#### Step 1: Setup Supabase
```javascript
// js/services/supabaseService.js (nuovo)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Autenticazione
export const auth = {
  signup: async (email, password) => {
    return await supabase.auth.signUp({ email, password });
  },
  
  login: async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },
  
  logout: async () => {
    return await supabase.auth.signOut();
  },
  
  getUser: async () => {
    const { data } = await supabase.auth.getUser();
    return data?.user;
  }
};
```

#### Step 2: Database Schema (SQL)
```sql
-- Tabelle base
CREATE TABLE progetti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  nome VARCHAR(255) NOT NULL,
  indirizzo TEXT,
  budget DECIMAL(10, 2),
  data_inizio DATE,
  data_fine DATE,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE lavori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progetto_id UUID NOT NULL REFERENCES progetti(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  stato VARCHAR(50) DEFAULT 'da_fare',
  preventivo DECIMAL(10, 2),
  avanzamento INT,
  data_inizio DATE,
  data_fine DATE,
  fornitore_id UUID REFERENCES fornitori(id),
  priorita VARCHAR(50) DEFAULT 'normale',
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE spese (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progetto_id UUID NOT NULL REFERENCES progetti(id) ON DELETE CASCADE,
  descrizione VARCHAR(255) NOT NULL,
  importo DECIMAL(10, 2) NOT NULL,
  categoria VARCHAR(100),
  data DATE NOT NULL,
  lavoro_id UUID REFERENCES lavori(id),
  fornitore_id UUID REFERENCES fornitori(id),
  pagamento VARCHAR(50),
  ricevuta BOOLEAN DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fornitori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(100),
  tel VARCHAR(20),
  email VARCHAR(255),
  piva VARCHAR(20),
  rating INT,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE scadenze (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progetto_id UUID NOT NULL REFERENCES progetti(id) ON DELETE CASCADE,
  titolo VARCHAR(255) NOT NULL,
  data DATE NOT NULL,
  tipo VARCHAR(50),
  lavoro_id UUID REFERENCES lavori(id),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Aggiungere RLS (Row Level Security) per privacy
ALTER TABLE progetti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their projects"
  ON progetti FOR SELECT
  USING (auth.uid() = user_id);
```

#### Step 3: Sync Service (localStorage ↔ Supabase)
```javascript
// js/services/syncService.js
import { storageService } from './storageService.js';
import { supabase } from './supabaseService.js';

export const syncService = {
  async syncUp() {
    // Carica dati da localStorage, salva su Supabase
    const state = storageService.getState();
    try {
      // Sync progetti
      await supabase.from('progetti').upsert(state.progetti);
      // Sync lavori
      await supabase.from('lavori').upsert(state.lavori);
      // ... etc
      console.log('✅ Sync up completato');
    } catch (e) {
      console.error('❌ Sync error:', e);
    }
  },

  async syncDown() {
    // Carica dati da Supabase, salva in localStorage
    try {
      const userId = (await supabase.auth.getUser()).data.user.id;
      const progetti = await supabase
        .from('progetti')
        .select('*')
        .eq('user_id', userId);
      
      storageService.setState({ progetti: progetti.data || [] });
      console.log('✅ Sync down completato');
    } catch (e) {
      console.error('❌ Sync error:', e);
    }
  }
};
```

#### Step 4: Login Component
```javascript
// js/components/auth.js
export function renderLoginPage() {
  return `
    <div class="auth-container">
      <div class="auth-card">
        <h1>RistrutturaApp</h1>
        <form id="auth-form" onsubmit="handleAuthSubmit(event)">
          <input type="email" id="auth-email" placeholder="Email" required>
          <input type="password" id="auth-password" placeholder="Password" required>
          <button type="submit">Login</button>
          <p>Non hai account? <a href="#signup">Registrati</a></p>
        </form>
      </div>
    </div>
  `;
}

export async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password
    });
    
    if (error) throw error;
    
    // Sync dati dopo login
    await syncService.syncDown();
    showApp();
  } catch (e) {
    showToast(`❌ ${e.message}`);
  }
}
```

#### Checklist
- [ ] Supabase account creato
- [ ] Database schema implementato
- [ ] Auth flow working (login/signup)
- [ ] Sync service testing
- [ ] Offline queue working
- [ ] Error handling
- [ ] Mobile testing

**Output:** Dati sincronizzati cloud, login working, multi-device sync

---

### **FASE C: PDF REPORT GENERATOR** (3-5 giorni)
*HIGH VALUE - Aumenta perceived value x2*

#### Implementation
```javascript
// js/services/reportService.js
import jsPDF from 'jspdf';

export async function generateReport(progettoId) {
  const progetto = storageService.getProgetto();
  const lavori = storageService.getLavori();
  const spese = storageService.getSpese();
  
  const doc = new jsPDF();
  
  // Pagina 1: Header + Budget Summary
  doc.setFontSize(20);
  doc.text('REPORT RISTRUTTURAZIONE', 20, 20);
  doc.setFontSize(12);
  doc.text(`Progetto: ${progetto.nome}`, 20, 35);
  doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}`, 20, 45);
  doc.text(`Indirizzo: ${progetto.indirizzo || '—'}`, 20, 55);
  
  // Budget
  const totalBudget = progetto.budget;
  const totalSpeso = spese.reduce((s, x) => s + x.importo, 0);
  const residuo = totalBudget - totalSpeso;
  const pct = totalBudget > 0 ? (totalSpeso / totalBudget) * 100 : 0;
  
  doc.setFontSize(14);
  doc.text('RIEPILOGO BUDGET', 20, 75);
  doc.setFontSize(11);
  doc.text(`Budget Totale: € ${totalBudget.toLocaleString('it-IT')}`, 20, 90);
  doc.text(`Speso: € ${totalSpeso.toLocaleString('it-IT')}`, 20, 100);
  doc.text(`Residuo: € ${residuo.toLocaleString('it-IT')}`, 20, 110);
  doc.text(`Percentuale Utilizzato: ${pct.toFixed(1)}%`, 20, 120);
  
  // Pagina 2: Lavori
  doc.addPage();
  doc.setFontSize(14);
  doc.text('LAVORI', 20, 20);
  
  let y = 35;
  lavori.forEach((lav, i) => {
    doc.setFontSize(11);
    doc.text(`${i+1}. ${lav.nome}`, 20, y);
    doc.setFontSize(9);
    doc.text(`Stato: ${lav.stato} | Avanzamento: ${lav.avanzamento}%`, 25, y+6);
    doc.text(`Preventivo: € ${lav.preventivo.toLocaleString('it-IT')}`, 25, y+12);
    y += 20;
    if (y > 270) { doc.addPage(); y = 20; }
  });
  
  // Pagina 3+: Spese Dettagliate
  doc.addPage();
  doc.setFontSize(14);
  doc.text('SPESE DETTAGLIATE', 20, 20);
  
  y = 35;
  spese.forEach((spesa, i) => {
    doc.set
