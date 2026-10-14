# 🏗️ Guida Rivendita — Come consegnare una versione personalizzata ai clienti

> Tempo medio di consegna per cliente: **2–4 ore** dalla firma del contratto.

---

## 📋 Panoramica del sistema

Ogni cliente riceve una propria **istanza indipendente** dell'app con:
- Brand personalizzato (nome, colore, logo)
- Database privato su Supabase (i dati del cliente non si mescolano con quelli di altri)
- Dominio personalizzato (es. `cantieri.nomecliente.it`)
- Nessuna pubblicità
- Nessun pulsante "Upgrade Premium"

Il sito demo pubblico (`ristrutturapp.it`) rimane invariato e continua a funzionare per acquisire nuovi clienti.

---

## 🗂️ File da modificare per ogni cliente

Solo **2 file** vanno modificati per personalizzare una nuova istanza:

| File | Cosa contiene | Tempo |
|------|--------------|-------|
| `js/config/appConfig.js` | Nome app, colore, logo, email | 5 min |
| `js/config/supabaseConfig.js` | URL e chiave del database del cliente | 2 min |

---

## 🚀 Procedura passo-passo per ogni nuovo cliente

### PASSO 1 — Duplica il progetto (5 min)

**Opzione A — GitHub (raccomandato)**:
```bash
# Clona il repository base
git clone https://github.com/TUO-USERNAME/ristrutturapp.git gestionale-cliente-rossi
cd gestionale-cliente-rossi

# Crea un nuovo branch per questo cliente
git checkout -b cliente/rossi-costruzioni
```

**Opzione B — Copia manuale**:
1. Copia l'intera cartella del progetto
2. Rinominala con il nome del cliente (es. `gestionale-rossi`)
3. Aprila in VS Code

---

### PASSO 2 — Crea il database Supabase del cliente (10 min)

1. Vai su [supabase.com](https://supabase.com) e accedi
2. Clicca **"New Project"**
3. Nome progetto: `cliente-rossi` (o simile)
4. Scegli password sicura e regione **"West EU (Ireland)"**
5. Clicca **"Create new project"** e aspetta ~2 minuti

6. Una volta creato, vai su **Project Settings → API**
7. Copia:
   - **Project URL** → es. `https://abcdefgh.supabase.co`
   - **anon public key** → la stringa JWT lunga

8. Apri `js/config/supabaseConfig.js` e sostituisci:
```js
export const SUPABASE_URL = 'https://NUOVO-ID-CLIENTE.supabase.co';
export const SUPABASE_ANON_KEY = 'NUOVA-CHIAVE-ANON-DEL-CLIENTE';
```

---

### PASSO 3 — Crea le tabelle nel database (10 min)

Nel progetto Supabase del cliente, vai su **SQL Editor** e incolla ed esegui questo script:

```sql
-- PROGETTI
CREATE TABLE progetti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  indirizzo TEXT,
  budget NUMERIC DEFAULT 0,
  data_inizio DATE,
  data_fine DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE progetti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Utenti vedono solo i propri progetti" ON progetti
  FOR ALL USING (auth.uid() = user_id);

-- LAVORI
CREATE TABLE lavori (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  progetto_id UUID REFERENCES progetti(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'Altro',
  stato TEXT DEFAULT 'da_fare',
  preventivo NUMERIC DEFAULT 0,
  avanzamento INTEGER DEFAULT 0,
  data_inizio DATE,
  data_fine DATE,
  fornitore_id UUID,
  priorita TEXT DEFAULT 'normale',
  note TEXT,
  is_computo_group BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE lavori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Utenti vedono lavori dei propri progetti" ON lavori
  FOR ALL USING (
    progetto_id IN (SELECT id FROM progetti WHERE user_id = auth.uid())
  );

-- SPESE
CREATE TABLE spese (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  progetto_id UUID REFERENCES progetti(id) ON DELETE CASCADE,
  descrizione TEXT NOT NULL,
  importo NUMERIC NOT NULL DEFAULT 0,
  categoria TEXT DEFAULT 'Altro',
  data DATE DEFAULT CURRENT_DATE,
  lavoro_id UUID,
  fornitore_id UUID,
  pagamento TEXT DEFAULT 'Bonifico',
  ricevuta BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE spese ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Utenti vedono spese dei propri progetti" ON spese
  FOR ALL USING (
    progetto_id IN (SELECT id FROM progetti WHERE user_id = auth.uid())
  );

-- FORNITORI
CREATE TABLE fornitori (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'Altro',
  telefono TEXT,
  email TEXT,
  piva TEXT,
  rating INTEGER DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE fornitori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Utenti vedono solo i propri fornitori" ON fornitori
  FOR ALL USING (auth.uid() = user_id);

-- SCADENZE
CREATE TABLE scadenze (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  progetto_id UUID REFERENCES progetti(id) ON DELETE CASCADE,
  titolo TEXT NOT NULL,
  data DATE NOT NULL,
  tipo TEXT DEFAULT 'altro',
  lavoro_id UUID,
  completata BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE scadenze ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Utenti vedono scadenze dei propri progetti" ON scadenze
  FOR ALL USING (
    progetto_id IN (SELECT id FROM progetti WHERE user_id = auth.uid())
  );
```

---

### PASSO 4 — Personalizza il branding (5 min)

Apri `js/config/appConfig.js` e modifica per il cliente:

```js
export const APP_CONFIG = {

  // Esempio per "Rossi Costruzioni Srl"
  appName:     'Cantieri Rossi',
  appSubtitle: 'Gestione Progetti Edilizi',
  appIcon:     '🏗️',

  primaryColor: '#E84C3D',   // Colore brand del cliente (chiediglielo o usa il suo logo)

  showAds:        false,     // ← SEMPRE false per clienti paganti
  showPremiumBtn: false,     // ← SEMPRE false per clienti paganti

  contactEmail: 'info@rossicostruzioni.it',
  privacyEmail: 'privacy@rossicostruzioni.it',

  loginFooterNote: 'Software dedicato a Rossi Costruzioni Srl',

  clientName: 'Rossi Costruzioni Srl',  // Appare come "Powered by" nella sidebar

};
```

**Come scegliere il colore primario**:
- Vai sul sito del cliente
- Usa un color picker (es. estensione Chrome "ColorZilla") per prendere il loro colore brand
- Inseriscilo come valore HEX

---

### PASSO 5 — Deploy su Vercel (10 min)

1. Vai su [vercel.com](https://vercel.com) e accedi
2. Clicca **"Add New Project"**
3. Se hai usato GitHub: importa il branch del cliente
   Se hai usato copia manuale: clicca **"Deploy from folder"** e carica la cartella
4. Nome progetto: `cantieri-rossi` (verrà creato `cantieri-rossi.vercel.app`)
5. Clicca **"Deploy"** — in 2 minuti è online

**Per dominio personalizzato del cliente**:
1. Nel progetto Vercel → **Settings → Domains**
2. Aggiungi `cantieri.rossicostruzioni.it`
3. Il cliente aggiunge il CNAME nel suo DNS provider (istruzioni automatiche di Vercel)

---

### PASSO 6 — Test finale (5 min)

Prima di consegnare, verifica:
- [ ] L'app si apre con il nome corretto nella splash screen
- [ ] Il colore del brand è applicato correttamente
- [ ] La registrazione di un nuovo utente funziona
- [ ] Si può creare un progetto e aggiungere un lavoro
- [ ] Non ci sono pubblicità visibili
- [ ] Il pulsante "Upgrade Premium" non è visibile

---

### PASSO 7 — Consegna al cliente (10 min)

Invia al cliente questa email tipo:

> **Oggetto**: Il tuo gestionale cantieri è pronto ✅
>
> Buongiorno [Nome],
> 
> Il software è online e pronto all'uso:
> **🔗 Link**: https://cantieri-rossi.vercel.app (o dominio personalizzato)
>
> **Per iniziare**:
> 1. Vai sul link e clicca "Crea Account"
> 2. Registrati con la tua email aziendale
> 3. Clicca "+ Nuovo Progetto" per creare il tuo primo cantiere
>
> **Accesso da smartphone**: apri il link dal browser del telefono e clicca "Aggiungi alla schermata home" per usarlo come app.
>
> Per qualsiasi domanda sono disponibile. Buon lavoro!

---

## 💰 Struttura prezzi consigliata

### Opzione A — Vendita una tantum
| Pacchetto | Cosa include | Prezzo |
|-----------|-------------|--------|
| **Base** | App personalizzata + database + deploy | **1.500€** |
| **Standard** | Base + dominio personalizzato + 3 mesi supporto | **2.200€** |
| **Premium** | Standard + formazione (2h) + 1 anno supporto | **3.500€** |

### Opzione B — Canone mensile (SaaS)
| Piano | Cosa include | Prezzo/mese |
|-------|-------------|-------------|
| **Starter** | App personalizzata + hosting | **49€/mese** |
| **Business** | Starter + aggiornamenti + supporto | **89€/mese** |

**Raccomandazione**: inizia con la vendita una tantum (1.500€) per acquisire i primi clienti velocemente. Poi converti a canone mensile per revenue ricorrente.

---

## 🔄 Manutenzione e aggiornamenti

Quando migliori l'app base (ristrutturapp), puoi propagare le migliorie a tutti i clienti:

**Con GitHub**:
```bash
# Aggiorna il branch del cliente con le ultime migliorie
git checkout cliente/rossi-costruzioni
git merge main  # porta le migliorie dal branch principale
git push
# Vercel si rideploya automaticamente
```

**Senza GitHub (copia manuale)**:
- Copia i file modificati nella cartella del cliente
- Ricarica su Vercel

---

## 📁 Struttura file per cliente (cosa NON condividere)

Quando consegni il codice o fai deploy, assicurati che:

| File | Demo pubblica | Copia cliente |
|------|--------------|---------------|
| `js/config/supabaseConfig.js` | Tue credenziali | Credenziali del cliente |
| `js/config/appConfig.js` | Branding RistrutturaApp | Branding cliente |
| `ads.txt` | Presente | **Rimuovere** |
| `manifest.json` | `name: RistrutturaApp` | Aggiornare con nome cliente |

---

## ⚡ Checklist rapida per ogni nuovo cliente

```
[ ] 1. Duplica cartella progetto
[ ] 2. Crea progetto Supabase (nuovo per ogni cliente)
[ ] 3. Esegui SQL per creare tabelle
[ ] 4. Aggiorna supabaseConfig.js con le nuove credenziali
[ ] 5. Aggiorna appConfig.js (nome, colore, email, showAds:false, showPremiumBtn:false)
[ ] 6. Aggiorna manifest.json (name e short_name)
[ ] 7. Rimuovi ads.txt
[ ] 8. Deploy su Vercel
[ ] 9. Testa registrazione + creazione progetto
[ ] 10. Invia email di consegna al cliente
```

**Tempo totale stimato: 45–60 minuti per cliente.**

---

*Per domande tecniche o supporto: consulta il codice sorgente o apri una issue su GitHub.*
