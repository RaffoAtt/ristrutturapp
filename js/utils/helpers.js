// ===== HELPERS GENERICI =====

export function escHtml(s) {
  return String(s || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function fmtEur(n) {
  return '€\u00A0' + Number(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtData(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function daysDiff(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}
