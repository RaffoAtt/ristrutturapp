// ===== DASHBOARD =====

import { escHtml, fmtEur, fmtData, daysDiff } from '../utils/helpers.js';
import { catIcons, catColors, spesaIcons, spesaColors } from '../utils/constants.js';
import { storageService } from '../services/storageService.js';
import { showToast } from './ui.js';

let chartSpese = null;
let chartAndamento = null;

export function renderDashboard() {
  const prog = storageService.getProgetto();
  const lavori = storageService.getLavori();
  const spese = storageService.getSpese();
  const scadenze = storageService.getScadenze();
  const totSpeso = spese.reduce((s, x) => s + Number(x.importo || 0), 0);
  const budget = prog ? Number(prog.budget || 0) : 0;
  const preventivo = lavori.reduce((s, l) => s + Number(l.preventivo || 0), 0);
  const residuo = budget - totSpeso;
  const pct = budget > 0 ? Math.min(100, (totSpeso / budget) * 100) : 0;

  document.getElementById('dash-budget-totale').textContent = fmtEur(budget);
  document.getElementById('dash-speso').textContent = fmtEur(totSpeso);
  document.getElementById('dash-residuo').textContent = fmtEur(residuo);
  document.getElementById('dash-preventivo').textContent = fmtEur(preventivo);
  document.getElementById('dash-bar-fill').style.width = pct.toFixed(1) + '%';
  document.getElementById('dash-bar-fill').style.background = pct > 90 ? '#FF3B30' : pct > 75 ? '#FFCC00' : '#fff';
  document.getElementById('dash-bar-label').textContent = pct.toFixed(0) + '% del budget utilizzato';

  document.getElementById('kpi-tot').textContent = lavori.length;
  document.getElementById('kpi-corso').textContent = lavori.filter(l => l.stato === 'in_corso').length;
  document.getElementById('kpi-ok').textContent = lavori.filter(l => l.stato === 'completato').length;
  document.getElementById('kpi-spese-n').textContent = spese.length;

  renderCatProgress(lavori);
  renderChartSpese(spese);
  renderChartAndamento(spese);
  renderDashScadenze(scadenze);
  renderDashSpese(spese);
}

export function renderCatProgress(lavori) {
  const el = document.getElementById('dash-cat-progress');
  const cats = {};
  lavori.forEach(l => {
    if (!cats[l.categoria]) cats[l.categoria] = { tot: 0, done: 0 };
    cats[l.categoria].tot++;
    cats[l.categoria].done += Number(l.avanzamento || 0);
  });
  const keys = Object.keys(cats);
  if (!keys.length) { el.innerHTML = '<div class="empty-state-small">Nessun lavoro presente</div>'; return; }
  el.innerHTML = keys.map(cat => {
    const avg = cats[cat].tot > 0 ? (cats[cat].done / cats[cat].tot).toFixed(0) : 0;
    const color = catColors[cat] || '#007AFF';
    return `<div class="cat-progress-item">
      <div class="cat-progress-top">
        <span class="cat-progress-name">${catIcons[cat] || '📦'} ${escHtml(cat)}</span>
        <span class="cat-progress-pct">${avg}%</span>
      </div>
      <div class="cat-bar-wrap"><div class="cat-bar-fill" style="width:${avg}%;background:${color}"></div></div>
    </div>`;
  }).join('');
}

export function renderChartSpese(spese) {
  try {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded yet');
      return;
    }
    const period = document.getElementById('chart-period')?.value || 'all';
    let filtered = spese;
    const now = new Date();
    if (period === 'month') filtered = spese.filter(s => {
      const d = new Date(s.data); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    if (period === 'week') {
      const weekAgo = new Date(now - 7 * 86400000);
      filtered = spese.filter(s => new Date(s.data) >= weekAgo);
    }
    const cats = {};
    filtered.forEach(s => { cats[s.categoria] = (cats[s.categoria] || 0) + Number(s.importo || 0); });
    const labels = Object.keys(cats);
    const vals = labels.map(k => cats[k]);
    const colors = labels.map(k => Object.keys(spesaColors).includes(k) ? spesaColors[k].replace('.15', '.8') : 'rgba(142,142,147,.8)');
    const canvas = document.getElementById('chart-spese-cat');
    if (!canvas) return;
    if (chartSpese) chartSpese.destroy();
    if (!labels.length) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }
    chartSpese = new Chart(canvas, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 0 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } } }
      }
    });
  } catch (e) {
    console.error('Errore renderChartSpese:', e);
  }
}

export function renderChartAndamento(spese) {
  try {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded yet');
      return;
    }
    const canvas = document.getElementById('chart-andamento');
    if (!canvas) return;
    const sorted = [...spese].sort((a, b) => new Date(a.data) - new Date(b.data));
    const monthly = {};
    sorted.forEach(s => {
      if (!s.data) return;
      const d = new Date(s.data);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      monthly[key] = (monthly[key] || 0) + Number(s.importo || 0);
    });
    const labels = Object.keys(monthly).sort();
    const vals = labels.map(k => monthly[k]);
    if (chartAndamento) chartAndamento.destroy();
    if (!labels.length) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }
    chartAndamento = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels.map(l => { const [y, m] = l.split('-'); return new Date(y, m - 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }); }),
        datasets: [{ data: vals, backgroundColor: 'rgba(0,122,255,.7)', borderRadius: 6, borderSkipped: false }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: v => '€' + v.toLocaleString('it-IT') }, grid: { color: 'rgba(0,0,0,.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  } catch (e) {
    console.error('Errore renderChartAndamento:', e);
  }
}

export function renderDashScadenze(scadenze) {
  const el = document.getElementById('dash-scadenze');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = scadenze
    .filter(s => s.data)
    .sort((a, b) => new Date(a.data) - new Date(b.data))
    .slice(0, 4);
  if (!upcoming.length) { el.innerHTML = '<div class="empty-state-small">Nessuna scadenza impostata</div>'; return; }
  el.innerHTML = upcoming.map(s => {
    const diff = daysDiff(s.data);
    let cls = 'green', badge = 'Futura';
    if (diff < 0) { cls = 'red'; badge = 'Scaduta'; }
    else if (diff === 0) { cls = 'orange'; badge = 'Oggi!'; }
    else if (diff <= 3) { cls = 'orange'; badge = diff + ' gg'; }
    else { badge = diff + ' gg'; }
    return `<div class="scadenza-mini">
      <div class="scad-dot ${cls}"></div>
      <div class="scad-info">
        <div class="scad-title">${escHtml(s.titolo)}</div>
        <div class="scad-date">${fmtData(s.data)}</div>
      </div>
      <span class="scad-badge ${cls}">${badge}</span>
    </div>`;
  }).join('');
}

export function renderDashSpese(spese) {
  const el = document.getElementById('dash-ultime-spese');
  const last = [...spese].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 4);
  if (!last.length) { el.innerHTML = '<div class="empty-state-small">Nessuna spesa registrata</div>'; return; }
  el.innerHTML = last.map(s => {
    const bg = spesaColors[s.categoria] || 'rgba(142,142,147,.15)';
    return `<div class="spesa-mini">
      <div class="spesa-cat-dot" style="background:${bg}">${spesaIcons[s.categoria] || '📦'}</div>
      <div class="spesa-info">
        <div class="spesa-desc">${escHtml(s.descrizione)}</div>
        <div class="spesa-meta">${escHtml(s.categoria)} · ${fmtData(s.data)}</div>
      </div>
      <div class="spesa-amount">${fmtEur(s.importo)}</div>
    </div>`;
  }).join('');
}
