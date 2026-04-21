// ═══════════════════════════════════════════════════════
// MAG//SYS — app.js
// ═══════════════════════════════════════════════════════

const KATEGORIE = [
  "Czytnik kart A900","Czytnik kart A1000","Czytnik kart M1000",
  "Czytnik kodów QR","Drukarka","Drukarka Stelio","Datapack",
  "Ekran monochromatyczny","Kasa pośrednia",
  "Modem","Płyta główna","Płytka zasilająca czytnik",
  "Płytka zasilająca","Płytka do kabli czytnik",
  "Panel górny","Panel dolny A1000","Panel dolny A900",
  "Płytka pośrednia","Rak","Selektor","Zamek",
  "Inne"
];

const BADGE_CLASS = {
  'POBIERZ': 'b-pobierz', 'ZWROT': 'b-zwrot', 'ZEPSUTA': 'b-zepsuta',
  'WYMIANA': 'b-wymiana', 'PRZYJĘCIE': 'b-przyjecie', 'PRZEGLĄD': 'b-przeglad'
};

// ─── STATE ────────────────────────────────────────────
let state = {
  action: '',
  log: [],
  settings: { webhook: '', technicy: [], urzadzenia: [], kategorie: [] }
};

// ─── INIT ─────────────────────────────────────────────
function init() {
  loadFromStorage();
  buildKatDropdown();
  buildAutocomplete();
  bindNavigation();
  bindActionButtons();
  bindForm();
  bindCustomSelect();
  renderRecent();

  // Seed demo data if empty
  if (state.log.length === 0) seedDemo();
}

function loadFromStorage() {
  const raw = localStorage.getItem('magsys_log');
  if (raw) state.log = JSON.parse(raw);

  const cfg = localStorage.getItem('magsys_settings');
  if (cfg) state.settings = { ...state.settings, ...JSON.parse(cfg) };

  // Restore last technician
  const lastWho = localStorage.getItem('magsys_lastWho');
  if (lastWho) document.getElementById('fWho').value = lastWho;
}

function saveLog() {
  localStorage.setItem('magsys_log', JSON.stringify(state.log));
}

function saveSettingsToStorage() {
  localStorage.setItem('magsys_settings', JSON.stringify(state.settings));
}

// ─── NAVIGATION ───────────────────────────────────────
function bindNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('page-' + page).classList.add('active');

      if (page === 'historia') renderHistory();
      if (page === 'magazyn') renderStock();
      if (page === 'ustawienia') loadSettingsUI();
    });
  });
}

// ─── ACTION BUTTONS ───────────────────────────────────
function bindActionButtons() {
  document.querySelectorAll('.act-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const color = btn.dataset.color;
      state.action = action;

      // Clear previous selection
      document.querySelectorAll('.act-btn').forEach(b => {
        b.className = 'act-btn';
      });
      btn.classList.add('sel-' + color);

      // Update form header
      const fsa = document.getElementById('formSelectedAction');
      const colorMap = {
        cyan: '#3dd6f5', green: '#3dffa0', red: '#ff4d4d',
        orange: '#ff8c42', yellow: '#f5e642', purple: '#b06eff'
      };
      fsa.innerHTML = `<span class="fsa-action" style="color:${colorMap[color]}">${action}</span>`;
      fsa.style.borderBottom = `2px solid ${colorMap[color]}20`;

      checkSubmitEnabled();
    });
  });
}

// ─── CUSTOM SELECT (Kategoria) ─────────────────────────
let selectedKat = '';

function activeKategorie() {
  return state.settings.kategorie.length ? state.settings.kategorie : KATEGORIE;
}

function buildKatDropdown() {
  const dd = document.getElementById('katDropdown');
  dd.innerHTML = activeKategorie().map(k =>
    `<div class="cs-opt" data-val="${k}">${k}</div>`
  ).join('');

  dd.querySelectorAll('.cs-opt').forEach(opt => {
    opt.addEventListener('click', e => {
      e.stopPropagation();
      selectedKat = opt.dataset.val;
      document.getElementById('katVal').textContent = selectedKat;
      document.getElementById('kaTrigger').classList.add('chosen');
      opt.closest('.custom-select').classList.remove('open');
      dd.querySelectorAll('.cs-opt').forEach(o => o.classList.remove('chosen'));
      opt.classList.add('chosen');
      checkSubmitEnabled();
    });
  });
}

function bindCustomSelect() {
  const sel = document.getElementById('katSelect');
  const trigger = document.getElementById('kaTrigger');

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    sel.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    sel.classList.remove('open');
  });
}

// ─── AUTOCOMPLETE ─────────────────────────────────────
function buildAutocomplete() {
  const techList = document.getElementById('technicyList');
  const devList = document.getElementById('urzadzeniaList');

  const technicy = state.settings.technicy.length
    ? state.settings.technicy
    : ['Jan Kowalski','Anna Nowak','Piotr Wiśniewski','Tomasz Zając','Marek Kowalczyk'];

  const urzadzenia = state.settings.urzadzenia.length
    ? state.settings.urzadzenia
    : ['LINIA-1','LINIA-2','LINIA-3','MAGAZYN','SERWIS','ZEWNĘTRZNY'];

  techList.innerHTML = technicy.map(t => `<option value="${t}">`).join('');
  devList.innerHTML = urzadzenia.map(u => `<option value="${u}">`).join('');
}

// ─── FORM ─────────────────────────────────────────────
function bindForm() {
  const form = document.getElementById('mainForm');
  const inputs = ['fSN', 'fWho'];
  inputs.forEach(id => {
    document.getElementById(id).addEventListener('input', checkSubmitEnabled);
  });
  form.addEventListener('submit', e => { e.preventDefault(); submitForm(); });
}

function checkSubmitEnabled() {
  const ok = state.action && document.getElementById('fSN').value.trim() && document.getElementById('fWho').value.trim();
  document.getElementById('btnSubmit').disabled = !ok;
}

function submitForm() {
  const sn   = document.getElementById('fSN').value.trim();
  const kat  = selectedKat;
  const kto  = document.getElementById('fWho').value.trim();
  const dev  = document.getElementById('fDev').value.trim();
  const note = document.getElementById('fNote').value.trim();

  if (!state.action || !sn || !kto) { toast('Wypełnij wymagane pola', 'err'); return; }

  const entry = {
    id: Date.now().toString(36).toUpperCase(),
    ts: nowStr(),
    akcja: state.action,
    sn, kat, kto, dev, note
  };

  state.log.unshift(entry);
  saveLog();
  localStorage.setItem('magsys_lastWho', kto);

  toast(`✓ ${state.action} — ${sn}`, 'ok');
  renderRecent();

  // Send to webhook if configured
  if (state.settings.webhook) sendToWebhook(entry);

  // Soft clear (keep technik + urządzenie)
  document.getElementById('fSN').value = '';
  document.getElementById('fNote').value = '';
  document.getElementById('btnSubmit').disabled = true;
}

function clearForm() {
  state.action = '';
  selectedKat = '';
  document.querySelectorAll('.act-btn').forEach(b => b.className = 'act-btn');
  document.getElementById('formSelectedAction').innerHTML = '<span class="fsa-label">Wybierz akcję powyżej</span>';
  document.getElementById('formSelectedAction').style.borderBottom = '';
  ['fSN','fWho','fDev','fNote'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('katVal').textContent = '— wybierz —';
  document.getElementById('kaTrigger').classList.remove('chosen');
  document.getElementById('btnSubmit').disabled = true;
}

// ─── RECENT LIST ──────────────────────────────────────
function renderRecent() {
  const list = document.getElementById('recentList');
  const recent = state.log.slice(0, 5);
  if (!recent.length) { list.innerHTML = '<div style="font-size:12px;color:var(--muted)">Brak transakcji</div>'; return; }

  list.innerHTML = recent.map(r => `
    <div class="recent-item">
      <span class="ri-time">${r.ts.slice(11,16)}</span>
      <span class="badge ${BADGE_CLASS[r.akcja] || ''}">${r.akcja}</span>
      <span class="ri-sn">${r.sn}</span>
      <span class="ri-who">${r.kto}</span>
      <span class="ri-dev">${r.dev || '—'}</span>
    </div>
  `).join('');
}

// ─── HISTORY ──────────────────────────────────────────
function renderHistory() {
  // Update category filter
  const katSel = document.getElementById('filterKat');
  if (katSel.options.length <= 1) {
    activeKategorie().forEach(k => {
      const o = document.createElement('option');
      o.value = k; o.textContent = k;
      katSel.appendChild(o);
    });
  }

  const q  = document.getElementById('filterQ').value.toLowerCase();
  const fa = document.getElementById('filterAkcja').value;
  const fk = document.getElementById('filterKat').value;

  const filtered = state.log.filter(r => {
    const text = [r.sn, r.kto, r.dev, r.kat, r.note, r.akcja].join(' ').toLowerCase();
    return text.includes(q) && (!fa || r.akcja === fa) && (!fk || r.kat === fk);
  });

  document.getElementById('histCount').textContent =
    `${state.log.length} wpisów łącznie · pokazano: ${filtered.length}`;

  document.getElementById('histBody').innerHTML = filtered.map(r => `
    <tr>
      <td class="td-time">${r.ts}</td>
      <td><span class="badge ${BADGE_CLASS[r.akcja] || ''}">${r.akcja}</span></td>
      <td class="td-sn">${r.sn}</td>
      <td>${r.kat || '—'}</td>
      <td class="td-who">${r.kto}</td>
      <td class="td-dev">${r.dev || '—'}</td>
      <td class="td-note">${r.note || ''}</td>
    </tr>
  `).join('');
}

// ─── STOCK ────────────────────────────────────────────
function renderStock() {
  // Compute last state per SN
  const snState = {};
  const snKat   = {};
  [...state.log].reverse().forEach(r => {
    if (!snState[r.sn]) { snState[r.sn] = r.akcja; snKat[r.sn] = r.kat || 'Inne'; }
  });

  const cats = {};
  activeKategorie().forEach(k => { cats[k] = { stock: 0, inDev: 0, broken: 0 }; });
  cats['Inne'] = cats['Inne'] || { stock: 0, inDev: 0, broken: 0 };

  Object.entries(snState).forEach(([sn, st]) => {
    const k = snKat[sn] || 'Inne';
    if (!cats[k]) cats[k] = { stock: 0, inDev: 0, broken: 0 };
    if (['PRZYJĘCIE','ZWROT'].includes(st)) cats[k].stock++;
    else if (['POBIERZ','WYMIANA','PRZEGLĄD'].includes(st)) cats[k].inDev++;
    else if (st === 'ZEPSUTA') cats[k].broken++;
  });

  const tot = Object.values(cats).reduce((a, c) => ({
    stock: a.stock + c.stock, inDev: a.inDev + c.inDev, broken: a.broken + c.broken
  }), { stock: 0, inDev: 0, broken: 0 });

  document.getElementById('kpiRow').innerHTML = `
    <div class="kpi"><div class="kpi-val" style="color:var(--yellow)">${tot.stock}</div><div class="kpi-label">W stocku</div></div>
    <div class="kpi"><div class="kpi-val" style="color:var(--cyan)">${tot.inDev}</div><div class="kpi-label">W urządzeniach</div></div>
    <div class="kpi"><div class="kpi-val" style="color:var(--red)">${tot.broken}</div><div class="kpi-label">Zepsutych</div></div>
    <div class="kpi"><div class="kpi-val">${tot.stock + tot.inDev + tot.broken}</div><div class="kpi-label">Razem pozycji</div></div>
  `;

  document.getElementById('stockBody').innerHTML = Object.entries(cats)
    .filter(([, v]) => v.stock + v.inDev + v.broken > 0)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => {
      const total = v.stock + v.inDev + v.broken;
      const pct = total ? Math.round(v.stock / total * 100) : 0;
      const col = pct > 50 ? 'var(--green)' : pct > 20 ? 'var(--orange)' : 'var(--red)';
      return `
        <tr>
          <td><strong>${k}</strong></td>
          <td class="td-num ${v.stock > 0 ? 'td-ok' : 'td-bad'}">${v.stock}</td>
          <td class="td-num td-info">${v.inDev}</td>
          <td class="td-num ${v.broken > 0 ? 'td-bad' : ''}">${v.broken}</td>
          <td class="td-num">${total}</td>
          <td>
            <div class="prog-wrap">
              <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${col}"></div></div>
              <span class="prog-pct" style="color:${col}">${pct}%</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');
}

// ─── SETTINGS ─────────────────────────────────────────
function loadSettingsUI() {
  document.getElementById('sWebhook').value = state.settings.webhook || '';
  document.getElementById('sTechnicy').value = state.settings.technicy.join('\n');
  document.getElementById('sUrzadzenia').value = state.settings.urzadzenia.join('\n');
  document.getElementById('sKategorie').value = activeKategorie().join('\n');
}

function saveSettings() {
  state.settings.webhook = document.getElementById('sWebhook').value.trim();
  saveSettingsToStorage();
  toast('Webhook zapisany', 'ok');
  updateSyncStatus();
}

function saveTechnicy() {
  state.settings.technicy = document.getElementById('sTechnicy').value
    .split('\n').map(s => s.trim()).filter(Boolean);
  saveSettingsToStorage();
  buildAutocomplete();
  toast('Technicy zapisani', 'ok');
}

function saveUrzadzenia() {
  state.settings.urzadzenia = document.getElementById('sUrzadzenia').value
    .split('\n').map(s => s.trim()).filter(Boolean);
  saveSettingsToStorage();
  buildAutocomplete();
  toast('Urządzenia zapisane', 'ok');
}

function saveKategorie() {
  state.settings.kategorie = document.getElementById('sKategorie').value
    .split('\n').map(s => s.trim()).filter(Boolean);
  saveSettingsToStorage();
  buildKatDropdown();
  toast('Kategorie zapisane', 'ok');
}

function updateSyncStatus() {
  const dot = document.querySelector('.dot');
  const txt = document.querySelector('.sync-text');
  if (state.settings.webhook) {
    dot.classList.remove('offline');
    txt.textContent = 'SHEETS ONLINE';
  } else {
    dot.classList.add('offline');
    txt.textContent = 'LOKALNIE';
  }
}

// ─── WEBHOOK (Google Apps Script) ─────────────────────
async function sendToWebhook(entry) {
  const dot = document.querySelector('.dot');
  dot.classList.add('syncing');
  try {
    await fetch(state.settings.webhook, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    dot.classList.remove('syncing');
  } catch (e) {
    dot.classList.remove('syncing');
    toast('Błąd sync z Sheets', 'err');
  }
}

// ─── EXPORT CSV ───────────────────────────────────────
function exportCSV() {
  const header = ['TIMESTAMP','AKCJA','NR_SERYJNY','KATEGORIA','TECHNIK','URZADZENIE','UWAGI'];
  const rows = state.log.map(r =>
    [r.ts, r.akcja, r.sn, r.kat, r.kto, r.dev, r.note].map(v => `"${(v||'').replace(/"/g,'""')}"`).join(',')
  );
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `magazyn_${nowStr().replace(/[: ]/g,'-')}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast('Pobrano CSV', 'info');
}

// ─── TOAST ────────────────────────────────────────────
function toast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 220);
  }, 2600);
}

// ─── HELPERS ──────────────────────────────────────────
function nowStr() {
  const d = new Date();
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

// ─── DEMO SEED ────────────────────────────────────────
function seedDemo() {
  const entries = [
    { akcja:'PRZYJĘCIE', sn:'BEAR-0001', kat:'Łożysko',  kto:'Piotr Nowak',      dev:'MAGAZYN', note:'dostawa INV-441', ts:'2025-04-18 08:14' },
    { akcja:'PRZYJĘCIE', sn:'BEAR-0002', kat:'Łożysko',  kto:'Piotr Nowak',      dev:'MAGAZYN', note:'dostawa INV-441', ts:'2025-04-18 08:14' },
    { akcja:'PRZYJĘCIE', sn:'BEAR-0003', kat:'Łożysko',  kto:'Piotr Nowak',      dev:'MAGAZYN', note:'',               ts:'2025-04-18 08:15' },
    { akcja:'PRZYJĘCIE', sn:'PUMP-0011', kat:'Pompa',    kto:'Piotr Nowak',      dev:'MAGAZYN', note:'',               ts:'2025-04-18 08:20' },
    { akcja:'PRZYJĘCIE', sn:'SEAL-0033', kat:'Uszczelka',kto:'Anna Nowak',       dev:'MAGAZYN', note:'',               ts:'2025-04-18 09:00' },
    { akcja:'PRZYJĘCIE', sn:'FILT-0007', kat:'Filtr',    kto:'Anna Nowak',       dev:'MAGAZYN', note:'',               ts:'2025-04-18 09:05' },
    { akcja:'POBIERZ',   sn:'BEAR-0001', kat:'Łożysko',  kto:'Marek Wiśniewski', dev:'LINIA-1', note:'',               ts:'2025-04-18 10:30' },
    { akcja:'POBIERZ',   sn:'FILT-0007', kat:'Filtr',    kto:'Tomasz Zając',     dev:'LINIA-2', note:'wymiana planowa', ts:'2025-04-19 07:45' },
    { akcja:'ZEPSUTA',   sn:'BEAR-0001', kat:'Łożysko',  kto:'Marek Wiśniewski', dev:'LINIA-1', note:'pęknięcie pierścienia', ts:'2025-04-19 10:00' },
    { akcja:'WYMIANA',   sn:'BEAR-0002', kat:'Łożysko',  kto:'Marek Wiśniewski', dev:'LINIA-1', note:'w miejsce BEAR-0001', ts:'2025-04-19 10:15' },
    { akcja:'POBIERZ',   sn:'PUMP-0011', kat:'Pompa',    kto:'Tomasz Zając',     dev:'LINIA-3', note:'',               ts:'2025-04-21 08:00' },
    { akcja:'PRZEGLĄD',  sn:'SEAL-0033', kat:'Uszczelka',kto:'Anna Nowak',       dev:'LINIA-2', note:'stan dobry',     ts:'2025-04-21 11:30' },
  ];
  entries.forEach(e => state.log.push({ id: Date.now().toString(36), ...e }));
  saveLog();
}

// ─── START ────────────────────────────────────────────
init();
updateSyncStatus();
