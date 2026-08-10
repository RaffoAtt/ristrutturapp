# 🚀 Guida Implementazione - Risoluzione Punti Critici

**Status:** Fase A in Progress (30% completato)  
**Data:** 10/08/2026

---

## 📋 Cosa è Stato Fatto Automaticamente

### ✅ Moduli Creati
```
✓ js/utils/helpers.js              - Funzioni utility
✓ js/utils/constants.js            - Costanti & icone
✓ js/services/storageService.js    - Gestione localStorage
✓ js/components/ui.js              - UI generiche
✓ js/components/projects.js        - Gestione progetti
✓ js/app.js (base)                 - Entry point
```

---

## 🔄 FASE A: Completamento Refactor Modulare (IN PROGRESS)

### Step 1: Creazione File Componenti Rimanenti

Devo creare i seguenti file (farò io in autonomia):

```
⏳ js/components/dashboard.js       - Dashboard rendering
⏳ js/components/lavori.js          - Sezione Lavori
⏳ js/components/spese.js           - Sezione Spese
⏳ js/components/fornitori.js       - Sezione Fornitori
⏳ js/components/scadenze.js        - Sezione Scadenze
⏳ js/components/computo.js         - Import computo metrico
⏳ js/components/backup.js          - Export/import backup
```

### Step 2: Aggiornare js/app.js

Questo NON è automatico. Devi fare:

#### ✍️ AZIONE MANUALE: Aggiornare js/app.js

**Apri il file:** `ristruttura-app/js/app.js`

**Sostituisci l'intero contenuto con:**

```javascript
// ===== MAIN APP ENTRY POINT =====
// Importa tutti i moduli e li espone su window

import { escHtml, uid, fmtEur, fmtData, daysDiff } from './utils/helpers.js';
import { catIcons, catColors, spesaIcons, spesaColors, statoLabel, sectionTitles } from './utils/constants.js';
import { storageService } from './services/storageService.js';
import { 
  showModal, hideModal, showToast, showConfirm, hideConfirm, 
  toggleSidebar, closeSidebar, showSection 
} from './components/ui.js';
import {
  renderSidebar, selectProgetto, salvaProgetto, loadImpostazioni,
  salvaImpostazioni, eliminaProgettoCorrente, resetApp
} from './components/projects.js';

// State globali
let lavoriFilter = 'all';
let speseFilter = 'all';
let fornitoriFilter = 'all';
let scadenzeFilter = 'all';
let currentRating = 0;

function renderAll() {
  renderSidebar();
  // Altre render functions verranno importate quando creati i componenti
}

function handleAddBtn() {
  const active = document.querySelector('.section.active');
  if (!active) return;
  const id = active.id;
  if (!storageService.getProgetto() && id !== 'section-impostazioni') {
    showToast('⚠️ Crea prima un progetto');
    showModal('modal-progetto');
    return;
  }
  if (id === 'section-lavori') window.openModalLavoro?.();
  else if (id === 'section-spese') window.openModalSpesa?.();
  else if (id === 'section-fornitori') window.openModalFornitore?.();
  else if (id === 'section-scadenze') window.openModalScadenza?.();
  else if (id === 'section-dashboard') showModal('modal-progetto');
  else if (id === 'section-computo') document.getElementById('computo-file-input').click();
}

// Init
window.addEventListener('DOMContentLoaded', () => {
  storageService.loadData();
  setTimeout(() => {
    document.getElementById('splash-screen').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('splash-screen').style.display = 'none';
      document.getElementById('app').classList.remove('hidden');
      renderAll();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    }, 400);
  }, 1400);
  window.setupDragDrop?.();
});

// ===== ESPONE FUNZIONI SU WINDOW =====
// UI
window.showModal = showModal;
window.hideModal = hideModal;
window.showToast = showToast;
window.showConfirm = showConfirm;
window.hideConfirm = hideConfirm;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.showSection = showSection;

// Progetti
window.selectProgetto = selectProgetto;
window.salvaProgetto = salvaProgetto;
window.loadImpostazioni = loadImpostazioni;
window.salvaImpostazioni = salvaImpostazioni;
window.eliminaProgettoCorrente = eliminaProgettoCorrente;
window.resetApp = resetApp;

// Globali
window.renderAll = renderAll;
window.handleAddBtn = handleAddBtn;

// State filters
window.lavoriFilter = lavoriFilter;
window.speseFilter = speseFilter;
window.fornitoriFilter = fornitoriFilter;
window.scadenzeFilter = scadenzeFilter;
window.currentRating = currentRating;

// Helpers
window.escHtml = escHtml;
window.uid = uid;
window.fmtEur = fmtEur;
window.fmtData = fmtData;
window.daysDiff = daysDiff;

// Costanti
window.catIcons = catIcons;
window.catColors = catColors;
window.spesaIcons = spesaIcons;
window.spesaColors = spesaColors;
window.statoLabel = statoLabel;

// Storage
window.storageService = storageService;
```

**Salva il file.**

### Step 3: Aggiornare index.html

Questo NON è automatico. Devi fare:

#### ✍️ AZIONE MANUALE: Aggiornare index.html

**Apri il file:** `ristruttura-app/index.html`

**Trova questa riga (circa alla fine, prima di `</body>`):**

```html
<script src="app.js"></script>
```

**Sostituiscila con:**

```html
<script type="module" src="js/app.js"></script>
```

**Salva il file.**

---

## 🔴 FASE B: Backend + Autenticazione (DOPO completamento Fase A)

### ⚠️ Prerequisiti Manuali

Prima di qualsiasi codice, devi:

1. **Creare account Supabase** (GRATUITO)
   - Vai a: https://app.supabase.com
   - Clicca "Sign Up"
   - Registrati con email/password
   - Verifica email

2. **Creare progetto Supabase**
   - Clicca "New Project"
   - Nome: "ristruttura-app"
   - Password sicura: genera con password manager
   - Region: "eu-west-1" (Europa)
   - Clicca "Create new project"
   - **Aspetta ~2 minuti per il provisioning**

3. **Ottenere credenziali**
   - Una volta creato il progetto, vai a "Settings" → "API"
   - Copia:
     - **Project URL**: es. `https://xxxxx.supabase.co`
     - **anon public key**: es. `eyJhbGc...`
   - Salvali in luogo sicuro (li userai dopo)

### Step 1: Aggiungere dipendenza Supabase

#### ✍️ AZIONE MANUALE: Aggiungere Supabase via CDN

**Apri file:** `ristruttura-app/index.html`

**Trova la sezione `<head>` (dopo altri `<script>`):**

```html
<script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
```

**Aggiungi DOPO questa riga:**

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.0/+esm"></script>
```

**Salva il file.**

### Step 2: Creare supabaseService.js

Creerò io questo file automaticamente dopo che confermi i passaggi sopra.

### Step 3: Creare database schema

Devi eseguire SQL su Supabase:

#### ✍️ AZIONE MANUALE: Creare tabelle database

**In Supabase:**
1. Vai a "SQL Editor"
2. Clicca "New Query"
3. Copia-incolla il seguente SQL:

```sql
-- Tabelle per RistrutturaApp

-- Tabella progetti
CREATE TABLE IF NOT EXISTS progetti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome VARCHAR(255) NOT NULL,
  indirizzo TEXT,
  budget DECIMAL(10, 2),
  data_inizio DATE,
  data_fine DATE,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabella lavori
CREATE TABLE IF NOT EXISTS lavori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progetto_id UUID NOT NULL REFERENCES progetti(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  stato VARCHAR(50) DEFAULT 'da_fare',
  preventivo DECIMAL(10, 2),
  avanzamento INT,
  data_inizio DATE,
  data_fine DATE,
  fornitore_id UUID,
  priorita VARCHAR(50) DEFAULT 'normale',
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabella spese
CREATE TABLE IF NOT EXISTS spese (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progetto_id UUID NOT NULL REFERENCES progetti(id) ON DELETE CASCADE,
  descrizione VARCHAR(255) NOT NULL,
  importo DECIMAL(10, 2) NOT NULL,
  categoria VARCHAR(100),
  data DATE NOT NULL,
  lavoro_id UUID REFERENCES lavori(id),
  fornitore_id UUID,
  pagamento VARCHAR(50),
  ricevuta BOOLEAN DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabella fornitori
CREATE TABLE IF NOT EXISTS fornitori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
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

-- Tabella scadenze
CREATE TABLE IF NOT EXISTS scadenze (
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

-- Enable Row Level Security
ALTER TABLE progetti ENABLE ROW LEVEL SECURITY;
ALTER TABLE lavori ENABLE ROW LEVEL SECURITY;
ALTER TABLE spese ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornitori ENABLE ROW LEVEL SECURITY;
ALTER TABLE scadenze ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
CREATE POLICY "Users can see their own progetti"
  ON progetti FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own progetti"
  ON progetti FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progetti"
  ON progetti FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own progetti"
  ON progetti FOR DELETE
  USING (user_id = auth.uid());
```

4. Clicca **"Run"**
5. Aspetta che completi (dovrebbe dire "Success")

---

## 🎨 FASE C: PDF Report Generator

Questo lo farò dopo completamento Fase A e B.

---

## ✅ Checklist Azioni Manuali

- [ ] Step A.2: Aggiornare js/app.js (importare e esporre window)
- [ ] Step A.3: Aggiornare index.html (type="module")
- [ ] Step B (Prerequisiti): Creare account Supabase
- [ ] Step B (Prerequisiti): Creare progetto Supabase
- [ ] Step B (Prerequisiti): Salvare credenziali in luogo sicuro
- [ ] Step B.1: Aggiungere Supabase script tag in HTML
- [ ] Step B.3: Eseguire SQL per creare tabelle

---

## 📞 Prossimo Passo

Una volta completati i passaggi sopra, conferma e procederò a:
1. Creare tutti i componenti rimanenti (dashboard, lavori, spese, etc)
2. Creare supabaseService.js con autenticazione
3. Creare syncService.js per sincronizzazione cloud
4. Creare reportService.js per PDF report
5. Testare tutto

**Conferma quando hai completato i passaggi manuali!**
