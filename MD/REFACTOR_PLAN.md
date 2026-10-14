# RistrutturaApp - Piano di Refactor Modulare

**Data:** 10/08/2026  
**Stato:** In Progress - Struttura base creata

## 📋 Analisi Corrente

### Stato del Codice
- `app.js` (originale): 1279 righe, monolitico, tutte le funzioni in un file
- `index.html`: 712 righe, UI completa
- `app.css`: 373 righe, stili responsive

### Problema
Il codice è difficile da:
- Mantenere (cambio in una funzione può influire su altre)
- Testare (nessuna separazione di concerns)
- Scalare (aggiungere nuove features richiede modifiche ovunque)
- Collaborare (difficile per più sviluppatori)

---

## ✅ Moduli Creati

### 1. `js/utils/helpers.js` ✓
**Funzioni di formattazione e utilità generiche**

Esportati:
- `escHtml(s)` - Escape HTML entities
- `uid()` - Genera ID univoci
- `fmtEur(n)` - Formatta numeri in EUR
- `fmtData(d)` - Formatta date in italiano
- `daysDiff(dateStr)` - Calcola giorni di differenza

```javascript
import { fmtEur, fmtData } from './utils/helpers.js';

const prezzo = fmtEur(1234.56); // "€ 1.234,56"
const data = fmtData('2026-08-10'); // "10/08/2026"
```

---

### 2. `js/utils/constants.js` ✓
**Costanti, icone, colori, mapping**

Esportati:
- `catIcons` - Icone per categorie lavori
- `catColors` - Colori per categorie
- `spesaIcons` - Icone per categorie spese
- `spesaColors` - Colori per spese
- `statoLabel` - Labels per stati
- `sectionTitles` - Titoli sezioni
- `tipoScadenzaIcons` - Icone per tipi scadenze

```javascript
import { catIcons, catColors } from './utils/constants.js';

const icon = catIcons['Muratura']; // "🧱"
const color = catColors['Muratura']; // "#FF9500"
```

---

### 3. `js/services/storageService.js` ✓
**Gestione persistenza dati (localStorage)**

Exports: `storageService` (singleton object)

Metodi:
- `loadData()` - Carica da localStorage
- `saveData()` - Salva su localStorage
- `getState()` - Restituisce stato completo
- `setState(newState)` - Modifica stato e salva
- `getProgetto()` - Ottiene progetto attivo
- `getLavori()` - Ottiene lavori progetto attivo
- `getSpese()` - Ottiene spese progetto attivo
- `getFornitori()` - Ottiene tutti fornitori
- `getScadenze()` - Ottiene scadenze progetto attivo
- `reset()` - Cancella tutto

```javascript
import { storageService } from './services/storageService.js';

storageService.loadData();
const prog = storageService.getProgetto();
storageService.setState({ progettoAttivoId: 'new-id' });
```

---

### 4. `js/components/ui.js` ✓
**Componenti UI generiche (modali, toast, sidebar)**

Esportati:
- `showModal(id)` - Mostra modale
- `hideModal(id)` - Nascondi modale
- `showToast(msg, duration)` - Notifica toast
- `showConfirm(title, msg, icon, cb)` - Dialog conferma
- `hideConfirm(confirmed)` - Chiudi dialog
- `toggleSidebar()` - Attiva/disattiva sidebar
- `closeSidebar()` - Chiudi sidebar
- `showSection(name)` - Mostra sezione (dashboard, lavori, etc)

```javascript
import { showModal, showToast, showConfirm } from './components/ui.js';

showToast('✅ Salvato!');
showModal('modal-lavoro');
showConfirm('Sei sicuro?', 'Eliminare questo elemento?', '🗑️', () => {
  // Callback quando confermato
});
```

---

### 5. `js/app.js` (nuovo) ⏳
**Entry point principale che importa e espone tutto su window**

Importa:
- Tutti i moduli creati
- Funzioni da `components/all.js` (in progress)

Espone su `window`:
- Tutte le funzioni per compatibilità con onclick inline
- Lo stato globale
- I servizi

```javascript
// In index.html onclick="showModal('modal-lavoro')"
// Funziona perché window.showModal è esposto
```

---

### 6. `js/components/all.js` ⏳
**Componenti per tutte le sezioni (IN PROGRESS)**

Sarà suddiviso logicamente in:

#### Dashboard
- `renderDashboard()`
- `renderCatProgress(lavori)`
- `renderChartSpese(spese)`
- `renderChartAndamento(spese)`
- `renderDashScadenze(scadenze)`
- `renderDashSpese(spese)`

#### Lavori
- `openModalLavoro(id)`
- `salvaLavoro()`
- `renderLavori()`
- `setLavoriFilter(f, btn)`
- `showDettaglioLavoro(id)`
- `eliminaLavoro(id)`

#### Spese
- `openModalSpesa(id)`
- `salvaSpesa()`
- `renderSpese()`
- `setSpeseFilter(f, btn)`
- `eliminaSpesa(id)`

#### Fornitori
- `openModalFornitore(id)`
- `setRating(n)`
- `updateStars(n)`
- `salvaFornitore()`
- `renderFornitori()`
- `setFornitoriFilter(f, btn)`
- `eliminaFornitore(id)`

#### Scadenze
- `openModalScadenza(id)`
- `salvaScadenza()`
- `renderScadenze()`
- `setScadenzeFilter(f, btn)`
- `eliminaScadenza(id)`

#### Progetti
- `salvaProgetto()`
- `loadImpostazioni()`
- `salvaImpostazioni()`
- `eliminaProgettoCorrente()`
- `resetApp()`
- `renderSidebar()`
- `selectProgetto(id)`

#### Computo Metrico
- `setupDragDrop()`
- `importComputo(event)`
- `processComputoFile(file)`
- `parseCSV(text, filename)`
- `parseExcel(buffer, filename)`
- `parsePDF(file)` - Parsing avanzato
- `showComputoPreview(headers, rows, filename)`
- `clearComputo()`
- `toggleSelectAll()`
- `categorizzaAutomatica(desc)`
- `importVociSelezionate()`

#### Backup/Export
- `exportAllData()`
- `triggerImportBackup()`
- `importBackup(event)`

---

## 🎯 Roadmap di Completamento

### Fase 1: Fondamentale ✓ (COMPLETATA)
```
✓ js/utils/helpers.js
✓ js/utils/constants.js
✓ js/services/storageService.js
✓ js/components/ui.js
✓ js/app.js (main entry point)
```

### Fase 2: Componenti Principali (IN PROGRESS)
```
⏳ js/components/dashboard.js - Dashboard rendering
⏳ js/components/lavori.js - Sezione Lavori
⏳ js/components/spese.js - Sezione Spese
⏳ js/components/fornitori.js - Sezione Fornitori
⏳ js/components/scadenze.js - Sezione Scadenze
⏳ js/components/progetti.js - Gestione progetti
⏳ js/components/computo.js - Import computo metrico
⏳ js/components/backup.js - Export/import backup
```

### Fase 3: Integrazione (PENDING)
```
- Aggiornare index.html per usare js/app.js modulare
- Testare compatibilità onclick inline
- Verificare tutte le funzionalità
```

### Fase 4: Ottimizzazioni (FUTURE)
```
- Aggiungere validazioni robuste
- Error handling con try/catch
- Logging per debug
- Unit tests (Jest)
- Performance optimization
```

---

## 📐 Architettura Finale

```
ristruttura-app/
├── index.html                    (UI template minimalista)
├── app.css                       (Stili globali)
├── manifest.json                 (PWA config)
├── sw.js                         (Service Worker)
│
├── js/
│   ├── app.js                    (Entry point, binding su window)
│   │
│   ├── utils/
│   │   ├── helpers.js           (Funzioni utilità)
│   │   └── constants.js         (Costanti, icone, colori)
│   │
│   ├── services/
│   │   └── storageService.js    (Gestione localStorage)
│   │
│   └── components/
│       ├── ui.js                (Modali, toast, sidebar)
│       ├── dashboard.js         (Dashboard rendering)
│       ├── lavori.js            (Gestione lavori)
│       ├── spese.js             (Gestione spese)
│       ├── fornitori.js         (Gestione fornitori)
│       ├── scadenze.js          (Gestione scadenze)
│       ├── progetti.js          (Gestione progetti)
│       ├── computo.js           (Import computo metrico)
│       └── backup.js            (Export/import backup)
│
└── REFACTOR_PLAN.md             (Questo file)
```

---

## 🔄 Come Usare i Moduli

### Prima (Monolitico)
```javascript
// In app.js - tutto globale
function fmtEur(n) { /* ... */ }
function renderDashboard() { /* ... */ }
let state = { /* ... */ };
// Nessuna separazione, difficile da testare
```

### Dopo (Modulare)
```javascript
// In components/ui.js
export function showModal(id) { /* ... */ }

// In app.js
import { showModal } from './components/ui.js';
window.showModal = showModal; // Esponi su window per onclick inline

// In index.html
<button onclick="showModal('modal-lavoro')">Nuovo</button> // Funziona!
```

---

## 💡 Vantaggi del Refactor

| Aspetto | Prima | Dopo |
|---------|-------|------|
| **Manutenibilità** | 1 file 1279 righe | 9 file modulari, max 200 righe cad |
| **Testabilità** | Difficile (funzioni globali) | Facile (export ES6 modules) |
| **Scalabilità** | Aggiungere feature = modificare tutto | Aggiungere feature = nuovo file |
| **Collaboration** | Merge conflicts frequenti | Raramente stessi file modificati |
| **Debugging** | Cercare in 1279 righe | Cercare nel modulo specifico |
| **Riusabilità** | Difficile | Facile - import dove serve |

---

## 🚀 Prossimi Passi

1. **Completare `js/components/all.js`**
   - Spostare tutte le funzioni da `app-old.js`
   - Dividere in sottomoduli se necessario

2. **Aggiornare `js/app.js`**
   - Importare da `components/all.js`
   - Esporre tutte le funzioni su `window`

3. **Modificare `index.html`**
   - Rimuovere `<script src="app.js">`
   - Aggiungere `<script type="module" src="js/app.js"></script>`

4. **Testare completamente**
   - Splash screen funziona?
   - Navigation tra sezioni funziona?
   - Modali si aprono/chiudono?
   - CRUD operazioni (Create, Read, Update, Delete)?
   - Backup/Restore?
   - Computo metrico import?

5. **Cleanup**
   - Cancellare `app-old.js` se tutto funziona
   - Cancellare `js/components/all.js` placeholder

---

## 📝 Note Importanti

### Compatibilità onclick inline
Gli `onclick="showModal(...)"` in HTML funzionano perché esponiamo le funzioni su `window`:

```javascript
// In app.js (entry point)
import { showModal } from './components/ui.js';
window.showModal = showModal; // Rendi accessibile globalmente
```

### Es6 Modules vs Webpack
Usiamo **native ES6 modules** senza build tool:
- ✓ Funziona su browser moderni
- ✓ Nessuna dipendenza build
- ✓ Facile da debuggare
- ⚠ Piccolo overhead network (più richieste HTTP)
- ⚠ Non funziona su IE11 (non lo supportiamo comunque)

---

## 📚 Risorse per il Refactor

### Riferimenti Codice
- **app-old.js**: Versione originale monolitica (backup)
- **app.js**: Nuovo entry point modulare (IN PROGRESS)

### Funzioni Chiave da Migrare
Vedi la lista completa in sezione "Fase 2: Componenti Principali" sopra.

### Testing
```javascript
// Console browser per testare
import { showToast } from './components/ui.js';
showToast('Test OK'); // Dovrebbe mostrare notifica
```

---

## ✨ Conclusion

Questo refactor rende RistrutturaApp:
- ✅ Più facile da mantenere
- ✅ Più facile da testare
- ✅ Più facile da scalare
- ✅ Pronto per aggiungere features avanzate (PDF report, backend, etc)

Il codice originale **NON è stato perso** - è in `app-old.js` come reference.

**Status**: 🟡 In Progress - Struttura modulare creata, componenti da completare
