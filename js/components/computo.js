// ===== COMPUTO METRICO =====
// Gestisce l'importazione di file CSV, Excel e PDF con AI (Google Gemini)

import { storageService } from '../services/storageService.js';
import { showToast, showToastPersistent, hideToast } from './ui.js';
import { escHtml, uid, fmtEur } from '../utils/helpers.js';
import { AI_CONFIG } from '../config/aiConfig.js';
import { saveLavoroToSupabase } from '../services/syncService.js';

let computoVoci = [];

export function importComputo(event) {
  const file = event.target.files[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  showToast('⏳ Caricamento file in corso...');
  if (ext === 'csv') readCSV(file);
  else if (ext === 'xlsx' || ext === 'xls') readExcel(file);
  else if (ext === 'pdf') readPDF(file);
  else showToast('❌ Formato non supportato. Usa CSV, Excel o PDF');
}

function readCSV(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(/[,;]/).map(h => h.trim().replace(/^"|"$/g, ''));
      const voci = lines.slice(1).map((line, i) => {
        const cols = line.split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
        const descrizione = obj['Descrizione'] || obj['Nome'] || obj['Voce'] || cols[0] || 'Voce ' + (i + 1);
        const prezzo = parseFloat((obj['Prezzo'] || obj['Importo'] || obj['Totale'] || cols[cols.length - 1] || '0').replace(',', '.')) || 0;
        const quantita = parseFloat((obj['Quantità'] || obj['Qty'] || '1').replace(',', '.')) || 1;
        const unita = obj['Unità'] || obj['UM'] || 'pz';
        return { id: uid(), descrizione, prezzo, quantita, unita, selected: true };
      }).filter(v => v.descrizione);
      displayComputo(file.name, voci);
    } catch (err) {
      showToast('❌ Errore lettura CSV: ' + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function readExcel(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      if (typeof XLSX === 'undefined') { showToast('❌ Libreria Excel non caricata, riprova'); return; }
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) { showToast('❌ File Excel vuoto o non valido'); return; }
      const headers = rows[0].map(h => String(h || '').trim());
      const voci = rows.slice(1).map((row, i) => {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : ''; });
        const descrizione = String(obj['Descrizione'] || obj['Nome'] || obj['Voce'] || row[0] || 'Voce ' + (i + 1));
        const prezzo = parseFloat(String(obj['Prezzo'] || obj['Importo'] || obj['Totale'] || row[row.length - 1] || '0').replace(',', '.')) || 0;
        const quantita = parseFloat(String(obj['Quantità'] || obj['Qty'] || '1').replace(',', '.')) || 1;
        const unita = String(obj['Unità'] || obj['UM'] || 'pz');
        return { id: uid(), descrizione, prezzo, quantita, unita, selected: true };
      }).filter(v => v.descrizione && v.descrizione !== 'undefined');
      displayComputo(file.name, voci);
    } catch (err) {
      showToast('❌ Errore lettura Excel: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

async function extractTextFromPDF(file) {
  if (typeof pdfjsLib === 'undefined') throw new Error('Libreria PDF non caricata. Riprova tra qualche secondo.');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += `--- Pagina ${i} ---\n` + content.items.map(item => item.str).join(' ') + '\n';
  }
  return fullText;
}

async function parseWithGemini(text) {
  const prompt = `Sei un assistente specializzato nell'analisi di computi metrici italiani per lavori edili.

Analizza il testo estratto da un PDF di computo metrico e identifica SOLO le voci di spesa effettive.

NON includere: numeri di pagina, titoli di capitolo, totali generali, subtotali, IVA, spese generali, intestazioni di colonna, note senza prezzo.

Per ogni voce di spesa restituisci un oggetto con:
- "descrizione": stringa (max 120 caratteri)
- "categoria": SCEGLI TRA: "Muratura", "Impianti Elettrici", "Impianti Idraulici", "Pavimenti e Rivestimenti", "Serramenti", "Pittura e Intonaci", "Strutture", "Coperture", "Altro"
- "quantita": numero (usa il punto come decimale, es. 2.5)
- "unita": stringa ("mq", "m3", "ml", "kg", "pz", "cad", "h", "corpo", "forfait")
- "prezzoUnitario": numero (prezzo per unità, usa il punto come decimale)
- "totale": numero (quantita * prezzoUnitario)

Classifica "categoria" in base alla descrizione: Muratura=demolizioni/muratura/massetti; Impianti Elettrici=elettrico/cablaggio/prese; Impianti Idraulici=idraulico/tubazioni/sanitari/riscaldamento; Pavimenti e Rivestimenti=pavimenti/piastrelle/parquet; Serramenti=porte/finestre/infissi; Pittura e Intonaci=pittura/tinteggiatura/intonaci; Strutture=travi/solai/fondazioni; Coperture=tetto/impermeabilizzazioni; Altro=tutto il resto.

Rispondi SOLO con un JSON array valido, senza markdown, senza testo aggiuntivo.
Esempio: [{"descrizione":"Demolizione muratura","categoria":"Muratura","quantita":10,"unita":"mq","prezzoUnitario":25.50,"totale":255.00}]

Testo computo:
${text.substring(0, 14000)}`;

  const isProxy = AI_CONFIG.GEMINI_ENDPOINT.startsWith('/');
  const directHeaders = { 'Content-Type': 'application/json', 'x-goog-api-key': AI_CONFIG.GEMINI_API_KEY };
  const proxyHeaders = { 'Content-Type': 'application/json' };

  let response = await fetch(AI_CONFIG.GEMINI_ENDPOINT, {
    method: 'POST',
    headers: isProxy ? proxyHeaders : directHeaders,
    body: JSON.stringify({ model: AI_CONFIG.GEMINI_MODEL, input: prompt })
  });

  // Fallback: se il proxy Vercel non è configurato, usa Gemini direttamente
  if (!response.ok && isProxy && [401, 404, 500].includes(response.status)) {
    console.warn('Proxy non disponibile (status ' + response.status + '), fallback a Gemini diretto');
    response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: directHeaders,
      body: JSON.stringify({ model: AI_CONFIG.GEMINI_MODEL, input: prompt })
    });
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error('Gemini ' + response.status + ': ' + (err.error?.message || 'API non disponibile'));
  }

  const data = await response.json();
  console.log('Gemini raw response:', JSON.stringify(data).substring(0, 500));

  const lastStep = Array.isArray(data.steps) ? data.steps[data.steps.length - 1] : null;
  console.log('lastStep keys:', lastStep ? Object.keys(lastStep) : 'null');
  console.log('lastStep sample:', JSON.stringify(lastStep).substring(0, 500));

  // Struttura risposta: steps[last].content = [{text: "...JSON..."}]
  let rawText = data.output_text || data.text || '';
  if (!rawText && lastStep) {
    if (Array.isArray(lastStep.content)) {
      rawText = lastStep.content.map(c => c.text || c.content || '').join('');
    } else if (Array.isArray(lastStep.parts)) {
      rawText = lastStep.parts.map(p => p.text || '').join('');
    } else {
      rawText = lastStep.output || lastStep.text || '';
    }
  }
  if (!rawText) rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  console.log('Gemini rawText:', rawText.substring(0, 300));

  if (!rawText) throw new Error('Risposta vuota. Campi: ' + Object.keys(data).join(', '));

  const cleaned = rawText.replace(/```json?/gi, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('Risposta completa Gemini:', rawText);
    throw new Error('JSON non trovato. Risposta: ' + rawText.substring(0, 200));
  }
  return JSON.parse(jsonMatch[0]);
}

async function readPDF(file) {
  try {
    showToastPersistent('📄 Estrazione testo PDF in corso...');
    const pdfText = await extractTextFromPDF(file);

    if (pdfText.replace(/--- Pagina \d+ ---/g, '').trim().length < 50) {
      hideToast();
      showToast('⚠️ PDF scansionato o vuoto. Il testo non è estraibile.');
      return;
    }

    showToastPersistent('🤖 Gemini AI sta analizzando il computo... Attendi');

    let vociAI;
    try {
      vociAI = await parseWithGemini(pdfText);
    } catch (aiErr) {
      console.warn('Gemini errore:', aiErr.message);
      hideToast();
      showToast('⚠️ ' + aiErr.message + ' — uso parsing manuale...', 5000);
      setTimeout(() => readPDFManual(pdfText, file.name), 500);
      return;
    }

    hideToast();

    if (!Array.isArray(vociAI) || vociAI.length === 0) {
      showToast('⚠️ AI non ha trovato voci. Uso parsing manuale...');
      readPDFManual(pdfText, file.name);
      return;
    }

    const voci = vociAI
      .map(v => ({
        id: uid(),
        descrizione: String(v.descrizione || '').trim(),
        categoria: String(v.categoria || 'Altro'),
        prezzo: Number(v.prezzoUnitario) || (Number(v.totale) / Math.max(Number(v.quantita) || 1, 1)),
        quantita: Number(v.quantita) || 1,
        unita: String(v.unita || 'corpo').toLowerCase(),
        selected: true
      }))
      .filter(v => v.descrizione.length > 3);

    displayComputo(file.name + ' 🤖', voci);
  } catch (err) {
    hideToast();
    showToast('❌ Errore: ' + err.message);
    console.error('PDF error:', err);
  }
}

function readPDFManual(pdfText, fileName) {
  const lines = pdfText.split('\n').filter(l => l.trim().length > 3 && !l.startsWith('--- Pagina'));
  const unitaMisura = /\b(m[²2]?|m[³3]?|ml|mc|mq|kg|ton|t|pz|cad|nr|l|lt|h|ora|gg|forfait|corpo)\b/i;
  const rigaDaIgnorare = /^(pagina|page|pag\.|totale|sommario|indice|data:|rev\.|progetto:|committente:|iva|oneri|spese\s+generali)/i;
  const voci = [];

  lines.forEach(line => {
    if (rigaDaIgnorare.test(line.trim())) return;
    if (/^\d{1,3}$/.test(line.trim())) return;
    const importiMatch = line.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || [];
    const importi = importiMatch.map(m => parseFloat(m.replace(/\./g, '').replace(',', '.'))).filter(v => v > 0.5);
    const umMatch = line.match(unitaMisura);
    const unita = umMatch ? umMatch[0].toLowerCase() : 'corpo';
    const descrizione = line
      .replace(/\d{1,3}(?:\.\d{3})*,\d{2}/g, '')
      .replace(unitaMisura, '')
      .replace(/\s+/g, ' ').trim();
    if (descrizione.length < 5) return;
    if (/^(totale|subtotale|importo|iva|sconto)/i.test(descrizione)) return;
    if (importi.length >= 1) {
      const prezzo = importi.length >= 2 ? importi[importi.length - 2] : importi[0];
      voci.push({ id: uid(), descrizione, prezzo, quantita: 1, unita, selected: true });
    }
  });

  const vociUniche = voci.filter((v, idx, arr) =>
    arr.findIndex(u => u.descrizione.substring(0, 30) === v.descrizione.substring(0, 30)) === idx
  );

  if (vociUniche.length === 0) {
    showToast('⚠️ Nessuna voce trovata. Il PDF ha una struttura non riconoscibile.');
    return;
  }

  displayComputo(fileName + ' (manuale)', vociUniche);
}

function displayComputo(fileName, voci) {
  computoVoci = voci;

  const preview = document.getElementById('computo-preview');
  const dropZone = document.getElementById('computo-drop-zone');
  if (preview) preview.classList.remove('hidden');
  if (dropZone) dropZone.style.display = 'none';

  const fileNameEl = document.getElementById('computo-file-name');
  if (fileNameEl) fileNameEl.textContent = fileName;

  const totale = voci.reduce((s, v) => s + (v.prezzo * v.quantita), 0);
  const statsEl = document.getElementById('computo-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="computo-stat"><strong>${voci.length}</strong> Voci trovate</div>
      <div class="computo-stat"><strong>${fmtEur(totale)}</strong> Totale stimato</div>
    `;
  }

  const tableWrap = document.getElementById('computo-table-wrap');
  if (tableWrap) {
    tableWrap.innerHTML = `
      <table class="computo-table">
        <thead>
          <tr><th>Descrizione</th><th>Q.tà</th><th>UM</th><th>Prezzo</th><th>Totale</th></tr>
        </thead>
        <tbody>
          ${voci.slice(0, 20).map(v => `
            <tr>
              <td>${escHtml(v.descrizione.substring(0, 60))}${v.descrizione.length > 60 ? '...' : ''}</td>
              <td>${v.quantita}</td>
              <td>${escHtml(v.unita)}</td>
              <td>${fmtEur(v.prezzo)}</td>
              <td>${fmtEur(v.prezzo * v.quantita)}</td>
            </tr>`).join('')}
          ${voci.length > 20 ? `<tr><td colspan="5" style="text-align:center;color:var(--text3)">... e altre ${voci.length - 20} voci</td></tr>` : ''}
        </tbody>
      </table>`;
  }

  const voceSelEl = document.getElementById('computo-voci-sel');
  if (voceSelEl) {
    voceSelEl.innerHTML = voci.map(v => `
      <div class="voce-check-item">
        <input type="checkbox" id="voce-${v.id}" ${v.selected ? 'checked' : ''} onchange="toggleVoce('${v.id}')" />
        <div class="voce-check-info">
          <div class="voce-check-name">${escHtml(v.descrizione.substring(0, 80))}</div>
          <div class="voce-check-meta">${v.quantita} ${escHtml(v.unita)}</div>
        </div>
        <div class="voce-check-price">${fmtEur(v.prezzo)}</div>
      </div>`).join('');
  }

  showToast('✅ ' + voci.length + ' voci caricate da ' + fileName);
}

export function clearComputo() {
  computoVoci = [];
  const preview = document.getElementById('computo-preview');
  const dropZone = document.getElementById('computo-drop-zone');
  if (preview) preview.classList.add('hidden');
  if (dropZone) dropZone.style.display = '';
  const input = document.getElementById('computo-file-input');
  if (input) input.value = '';
}

export function toggleVoce(id) {
  const v = computoVoci.find(v => v.id === id);
  if (v) v.selected = !v.selected;
}

export function toggleSelectAll() {
  const allSelected = computoVoci.every(v => v.selected);
  computoVoci.forEach(v => { v.selected = !allSelected; });
  computoVoci.forEach(v => {
    const cb = document.getElementById('voce-' + v.id);
    if (cb) cb.checked = v.selected;
  });
}

export function importVociSelezionate() {
  const prog = storageService.getProgetto();
  if (!prog) {
    showToast('⚠️ Seleziona prima un progetto attivo nella sidebar');
    return;
  }
  const selected = computoVoci.filter(v => v.selected && v.descrizione);
  if (selected.length === 0) {
    showToast('⚠️ Seleziona almeno una voce da importare');
    return;
  }
  const batchId = uid();
  const fileName = document.getElementById('computo-file-name')?.textContent || 'computo';

  const nuoviLavori = selected.map(v => ({
    id: uid(),
    progettoId: prog.id,
    nome: v.descrizione.substring(0, 100),
    categoria: v.categoria || 'Altro',
    stato: 'da_fare',
    preventivo: v.prezzo * v.quantita,
    avanzamento: 0,
    priorita: 'normale',
    note: 'Importato da: ' + fileName + ' | Q.ta: ' + v.quantita + ' ' + v.unita,
    dataInizio: '',
    dataFine: '',
    fornitoreId: '',
    computoId: batchId,
    computoNome: fileName
  }));
  const appState = storageService.getState();
  appState.lavori = [...(appState.lavori || []), ...nuoviLavori];
  storageService.setState(appState);
  // Salva ogni lavoro su Supabase in background
  nuoviLavori.forEach(l => saveLavoroToSupabase(l).catch(e => console.warn('Sync lavoro Supabase:', e)));
  showToast('✅ ' + selected.length + ' lavori importati nel progetto!');
  clearComputo();
  window.renderAll?.();
}
