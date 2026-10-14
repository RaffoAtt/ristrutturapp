# 🏗️ Roadmap Sistema 1:N — Admin (Impresa) → Clienti

> Questo documento descrive le feature implementate e quelle suggerite per evolvere
> l'app verso un sistema collaborativo completo tra impresa e cliente finale.

---

## ✅ Già implementato (questa sessione)

| Feature | File | Descrizione |
|---------|------|-------------|
| **Sistema ruoli** | `js/services/roleService.js` | Rilevamento `admin`/`client` da tabella `profiles` |
| **Modalità sola lettura** | `app.css` + `roleService.js` | Classe CSS `body.client-mode` nasconde tutti i controlli di scrittura |
| **Auto-selezione progetto** | `roleService.js` | Al login il client vede automaticamente il suo progetto |
| **Badge "Vista Cliente"** | `roleService.js` | Indicatore visivo nella sidebar che avvisa il cliente della modalità |
| **RLS Supabase** | `SUPABASE_SCHEMA_RUOLI.sql` | Politiche di sicurezza a livello DB: i clienti leggono solo i loro dati |
| **Trigger auto-profilo** | `SUPABASE_SCHEMA_RUOLI.sql` | Ogni nuovo utente riceve profilo `admin` automaticamente |
| **White-label config** | `js/config/appConfig.js` | Personalizzazione branding per ogni cliente in 2 file |
| **Guida rivendita** | `GUIDA_RIVENDITA.md` | Procedura completa per consegnare istanze personalizzate |

---

## 🚀 Feature suggerite — Roadmap prioritizzata

### PRIORITÀ ALTA — Implementabili in 1-2 giorni ciascuna

---

#### 1. 📤 Computo Metrico condiviso (Admin → Cliente)
**Scenario**: L'admin carica il computo metrico → il cliente lo vede in sola lettura con i prezzi nascosti o visibili a scelta.

**Come implementare**:
```sql
-- Aggiungi colonna 'show_prices_to_client' alla tabella progetti
ALTER TABLE progetti ADD COLUMN show_prices_to_client BOOLEAN DEFAULT false;
```

In `js/components/computo.js` — nel rendering delle voci:
```js
// Se è un client, nasconde i prezzi unitari (mostra solo descrizioni)
const isClient = window.roleService?.isClient();
const prezzoHtml = isClient && !progetto.show_prices_to_client
  ? '<span style="color:var(--text3)">—</span>'
  : fmtEur(voce.prezzo_totale);
```

**Valore per il cliente**: vede l'elenco dei lavori previsti senza necessariamente vedere i prezzi → trasparenza controllata.

---

#### 2. ✅ Approvazione lavori da parte del cliente
**Scenario**: L'admin aggiunge un lavoro con stato "In attesa approvazione" → il cliente riceve notifica e può approvare o richiedere modifiche.

**Come implementare**:
```sql
-- Aggiungi stati extra alla colonna stato dei lavori
-- (già TEXT, basta usare nuovi valori)
-- Nuovi stati: 'attesa_approvazione', 'approvato_cliente', 'modifica_richiesta'
```

In `js/utils/constants.js`:
```js
export const statoLabel = {
  ...
  'attesa_approvazione': '⏳ In appesa approvazione',
  'approvato_cliente':   '✅ Approvato dal cliente',
  'modifica_richiesta':  '🔄 Modifica richiesta',
};
```

In `app.css` — aggiungi stili per i nuovi stati:
```css
.stato-badge.attesa_approvazione { background: rgba(175,82,222,.15); color: var(--purple); }
.stato-badge.approvato_cliente   { background: rgba(52,199,89,.15);  color: var(--green); }
.stato-badge.modifica_richiesta  { background: rgba(255,59,48,.15);  color: var(--red); }
```

In `roleService.js` — per i client, aggiungi pulsanti "Approva" / "Richiedi modifica":
```js
// Aggiunge pulsanti di approvazione sulla card lavoro (solo per client)
export function renderApprovalButtons(lavoroId, currentStato) {
  if (!isClient()) return '';
  if (currentStato !== 'attesa_approvazione') return '';
  return `
    <div style="display:flex;gap:8px;margin-top:8px">
      <button onclick="approvaLavoro('${lavoroId}')"
        style="flex:1;padding:8px;background:var(--green);color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer">
        ✅ Approvo
      </button>
      <button onclick="richiediModificaLavoro('${lavoroId}')"
        style="flex:1;padding:8px;background:var(--red);color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer">
        🔄 Modifiche
      </button>
    </div>`;
}
```

---

#### 3. 💬 Note del cliente sui lavori
**Scenario**: Il cliente può lasciare commenti/domande su un lavoro specifico → l'admin li vede nel dettaglio del lavoro.

**Schema Supabase**:
```sql
CREATE TABLE note_cliente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lavoro_id UUID REFERENCES lavori(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  testo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE note_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Utenti vedono le note dei propri lavori" ON note_cliente
  FOR ALL USING (
    lavoro_id IN (
      SELECT id FROM lavori WHERE progetto_id IN (
        SELECT id FROM progetti WHERE user_id = auth.uid()
        UNION
        SELECT linked_project_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );
```

---

#### 4. 📄 Documenti condivisi (PDF preventivi, contratti, fatture)
**Scenario**: L'admin carica documenti (preventivo firmato, contratto, SAL) → il cliente li scarica dalla sua dashboard.

**Schema Supabase** (usa Supabase Storage):
```sql
CREATE TABLE documenti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  progetto_id UUID REFERENCES progetti(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'altro', -- 'preventivo', 'contratto', 'sal', 'fattura', 'altro'
  storage_path TEXT NOT NULL, -- path in Supabase Storage
  visibile_cliente BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

In `appConfig.js`:
```js
showDocumenti: true, // abilita sezione documenti condivisi
```

**UI**: nuova sezione "📁 Documenti" nella navigazione sidebar.

---

#### 5. 📊 Dashboard personalizzata per il cliente
**Scenario**: Quando il cliente accede, vede una dashboard semplificata con solo le info che lo riguardano: avanzamento lavori, prossime date, budget globale.

**Come implementare** — in `js/components/dashboard.js`:
```js
export function renderDashboard() {
  if (window.roleService?.isClient()) {
    return renderClientDashboard(); // versione semplificata
  }
  // ... dashboard admin esistente
}

function renderClientDashboard() {
  // Mostra solo: % completamento globale, prossima scadenza, stato lavori
  // Nasconde: grafici spese dettagliati, liste fornitori, budget breakdown
}
```

---

### PRIORITÀ MEDIA — Implementabili in 3-5 giorni ciascuna

---

#### 6. 🔗 Link invito cliente (Magic Link)
**Scenario**: L'admin genera un link di invito → il cliente clicca, si registra, e viene automaticamente collegato al progetto corretto.

**Flusso**:
1. Admin crea `invitation_token` univoco nel DB con `project_id` e scadenza
2. Admin invia link: `https://tua-app.vercel.app?invite=TOKEN`
3. Il cliente si registra → il trigger legge il token → assegna ruolo `client` + collega progetto
4. Il token viene invalidato dopo l'uso

---

#### 7. 📧 Notifiche email automatiche
**Scenario**: Quando l'admin aggiorna lo stato di un lavoro (es. "Muratura completata"), il cliente riceve un'email di notifica.

**Come implementare**: Supabase Edge Functions + trigger DB.

```js
// supabase/functions/notify-client/index.ts
// Triggered quando lavori.stato cambia
// Invia email via Resend.com (gratuito fino a 3.000 email/mese)
```

---

#### 8. 📸 Foto avanzamento cantiere
**Scenario**: L'admin carica foto del cantiere direttamente dall'app → il cliente le vede in una galleria.

**Come implementare**: Supabase Storage + tabella `foto_cantiere` con `progetto_id` + `visibile_cliente`.

---

### PRIORITÀ BASSA — Feature avanzate

---

#### 9. 💰 SAL (Stato Avanzamento Lavori) digitale
**Scenario**: L'admin crea un SAL con elenco lavori completati e importi → il cliente firma digitalmente (o approva via click).

#### 10. 📱 Push notifications (PWA)
**Scenario**: Notifiche push quando l'admin carica nuovi documenti o aggiorna lavori.

#### 11. 🗺️ Timeline visiva del cantiere
**Scenario**: Vista Gantt semplificata con lavori posizionati su una linea temporale, visibile da entrambi.

---

## 🏗️ Architettura consigliata per evoluzione

```
Admin (Impresa)                Cliente Finale
      │                              │
      │  crea progetti               │
      │  carica computo             │
      │  aggiorna stati             │  vede dashboard read-only
      │  carica documenti           │  approva lavori
      │  fotografa cantiere         │  lascia note
      │                              │
      └──────── Supabase DB ─────────┘
                     │
              RLS policies
              (chi può leggere/scrivere cosa)
```

---

## 📋 Checklist implementazione sistema 1:N

```
[x] roleService.js — rilevamento ruoli
[x] auth.js — applica ruolo dopo login
[x] app.css — modalità client (sola lettura)
[x] SUPABASE_SCHEMA_RUOLI.sql — tabella profiles + RLS aggiornate
[ ] Computo metrico condiviso con opzione nascondi prezzi
[ ] Pulsanti approvazione lavori per client
[ ] Note del cliente sui lavori
[ ] Sezione documenti condivisi (PDF)
[ ] Dashboard semplificata per client
[ ] Link invito magic link
[ ] Notifiche email via Edge Functions
[ ] Galleria foto cantiere
