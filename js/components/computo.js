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

async function callGeminiWithRetry(fetchFn, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchFn();
      if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
        const waitMs = 1500 * Math.pow(2, attempt);
        console.warn(`Gemini ${response.status}, retry ${attempt + 1}/${maxRetries} dopo ${waitMs}ms...`);
        showToastPersistent(`🤖 Gemini sovraccarico, nuovo tentativo ${attempt + 1}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempt)));
        continue;
      }
    }
  }
  if (lastError) throw lastError;
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
  const proxyHeaders = { 'Content-Type': 'application/json' };
  const directHeaders = { 'Content-Type': 'application/json' };

  let response = await callGeminiWithRetry(() => fetch(AI_CONFIG.GEMINI_ENDPOINT, {
    method: 'POST',
    headers: isProxy ? proxyHeaders : directHeaders,
    body: isProxy
      ? JSON.stringify({ model: AI_CONFIG.GEMINI_MODEL, prompt })
      : JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  }));

  if (!response.ok && isProxy && [401, 404, 500].includes(response.status)) {
    console.warn('Proxy non disponibile (status ' + response.status + '), fallback a Gemini diretto');
    const model = AI_CONFIG.GEMINI_MODEL;
    response = await callGeminiWithRetry(() => fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${AI_CONFIG.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: directHeaders,
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    ));
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error('Gemini ' + response.status + ': ' + (err.error?.message || 'API non dis
