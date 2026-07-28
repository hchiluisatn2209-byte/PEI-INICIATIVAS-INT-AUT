// ── State ──────────────────────────────────────────────
let role = 'user';
let selectedId = null;
let scriptUrl = localStorage.getItem('ia_script_url') || '';
let currentUser = localStorage.getItem('ia_user') || '';
let initiatives = JSON.parse(localStorage.getItem('ia_initiatives') || 'null');

if (!initiatives) {
  initiatives = getSampleData();
  persist();
}

// ── Lookup maps ─────────────────────────────────────────
const STATUS_LABEL = {
  draft: 'Borrador', sent: 'Enviado', analysis: 'En análisis',
  dev: 'En desarrollo', done: 'Completado', rejected: 'Rechazado'
};
const STATUS_BADGE = {
  draft: 'badge-draft', sent: 'badge-sent', analysis: 'badge-analysis',
  dev: 'badge-dev', done: 'badge-done', rejected: 'badge-rejected'
};
const IMPACT_LABEL = { high: 'Alto', med: 'Medio', low: 'Bajo' };
const IMPACT_CLASS = { high: 'p-high', med: 'p-med', low: 'p-low' };
const IMPACT_ORDER = { high: 0, med: 1, low: 2 };

// ── Persistence ─────────────────────────────────────────
function persist() {
  localStorage.setItem('ia_initiatives', JSON.stringify(initiatives));
}

// ── Navigation ──────────────────────────────────────────
function showTab(id) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  const navEl = document.querySelector(`[data-tab="${id}"]`);
  if (navEl) navEl.classList.add('active');
  document.getElementById(`sec-${id}`).classList.add('active');
  selectedId = null;
  if (id === 'my') renderMyList();
  if (id === 'queue') { populateAreaFilter(); renderQueue(); }
  if (id === 'dashboard') renderDashboard();
}

function switchRole() {
  role = document.getElementById('roleSelect').value;
  const adminEls = document.querySelectorAll('.admin-only');
  const adminDivider = document.getElementById('adminDivider');
  adminEls.forEach(el => el.style.display = role === 'admin' ? 'flex' : 'none');
  adminDivider.style.display = role === 'admin' ? 'block' : 'none';
  if (role === 'admin') showTab('queue');
  else showTab('my');
}

// ── Toast ────────────────────────────────────────────────
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.style.display = 'none', 2800);
}

// ── Config modal ─────────────────────────────────────────
function openConfig() {
  document.getElementById('scriptUrl').value = scriptUrl;
  document.getElementById('currentUser').value = currentUser;
  document.getElementById('configModal').style.display = 'flex';
}
function closeConfig() {
  document.getElementById('configModal').style.display = 'none';
}
function saveConfig() {
  scriptUrl = document.getElementById('scriptUrl').value.trim();
  currentUser = document.getElementById('currentUser').value.trim();
  localStorage.setItem('ia_script_url', scriptUrl);
  localStorage.setItem('ia_user', currentUser);
  if (scriptUrl) document.getElementById('configBanner').style.display = 'none';
  closeConfig();
  toast('Configuración guardada');
}

// ── Form helpers ─────────────────────────────────────────
function collectForm() {
  return {
    name:     document.getElementById('f-name').value.trim(),
    area:     document.getElementById('f-area').value,
    title:    document.getElementById('f-title').value.trim(),
    desc:     document.getElementById('f-desc').value.trim(),
    expected: document.getElementById('f-expected').value.trim(),
    impact:   document.getElementById('f-impact').value,
    freq:     document.getElementById('f-freq').value,
    hours:    document.getElementById('f-hours').value,
    people:   document.getElementById('f-people').value,
    systems:  document.getElementById('f-systems').value.trim(),
    notes:    document.getElementById('f-notes').value.trim(),
  };
}

function clearForm() {
  ['f-name','f-title','f-desc','f-expected','f-hours','f-people','f-systems','f-notes']
    .forEach(id => document.getElementById(id).value = '');
  ['f-area','f-impact','f-freq']
    .forEach(id => document.getElementById(id).selectedIndex = 0);
}

function validate(init, full = true) {
  if (!init.name || !init.title) { toast('Completa nombre e iniciativa'); return false; }
  if (full && (!init.area || !init.desc || !init.expected || !init.impact)) {
    toast('Completa todos los campos obligatorios (*)'); return false;
  }
  return true;
}

// ── Submit / Draft ───────────────────────────────────────
function saveDraft() {
  const init = collectForm();
  if (!validate(init, false)) return;
  init.status = 'draft';
  init.id = Date.now().toString();
  init.created = today();
  init.updates = [];
  initiatives.push(init);
  persist();
  clearForm();
  toast('Borrador guardado');
}

function submitInitiative() {
  const init = collectForm();
  if (!validate(init)) return;
  init.status = 'sent';
  init.id = Date.now().toString();
  init.created = today();
  init.updates = [{
    date: today(),
    author: 'Sistema',
    msg: 'Iniciativa enviada a Automatizaciones para revisión y análisis.'
  }];
  initiatives.push(init);
  persist();
  if (scriptUrl) syncToSheets(init);
  clearForm();
  toast('Iniciativa enviada exitosamente');
}

async function syncToSheets(init) {
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(init)
    });
  } catch (e) {
    console.warn('Sheets sync failed:', e);
  }
}

// ── Filtering ────────────────────────────────────────────
function getFiltered(statusId, impactId, areaId) {
  return initiatives.filter(i => {
    if (statusId && i.status !== statusId) return false;
    if (impactId && i.impact !== impactId) return false;
    if (areaId && i.area !== areaId) return false;
    return true;
  });
}

// ── My initiatives ───────────────────────────────────────
function renderMyList() {
  const fs = document.getElementById('filter-status').value;
  const fi = document.getElementById('filter-impact').value;
  const list = getFiltered(fs, fi);
  const el = document.getElementById('my-list');
  document.getElementById('my-detail').innerHTML = emptyDetail();

  if (!list.length) {
    el.innerHTML = emptyState('ti-robot', 'No tienes iniciativas registradas.');
    return;
  }
  el.innerHTML = list.map(i => cardHTML(i, 'my')).join('');
}

function showMyDetail(id) {
  selectedId = id;
  const i = initiatives.find(x => x.id === id);
  if (!i) return;
  document.getElementById('my-detail').innerHTML = detailHTML(i, false);
  renderMyList();
}

// ── Queue (admin) ────────────────────────────────────────
function populateAreaFilter() {
  const sel = document.getElementById('q-filter-area');
  const currentVal = sel.value;
  const areas = [...new Set(initiatives.filter(i => i.area).map(i => i.area))].sort();
  sel.innerHTML = '<option value="">Todas las áreas</option>' +
    areas.map(a => `<option value="${a}"${a === currentVal ? ' selected' : ''}>${a}</option>`).join('');
}

function renderQueue() {
  const fs = document.getElementById('q-filter-status').value;
  const fi = document.getElementById('q-filter-impact').value;
  const fa = document.getElementById('q-filter-area').value;
  const list = getFiltered(fs, fi, fa)
    .filter(i => i.status !== 'draft')
    .sort((a, b) => (IMPACT_ORDER[a.impact] ?? 1) - (IMPACT_ORDER[b.impact] ?? 1));

  const el = document.getElementById('queue-list');
  document.getElementById('queue-detail').innerHTML = emptyDetail();

  if (!list.length) {
    el.innerHTML = emptyState('ti-inbox', 'No hay iniciativas en la cola.');
    return;
  }
  el.innerHTML = list.map(i => cardHTML(i, 'queue')).join('');
}

function showQueueDetail(id) {
  selectedId = id;
  const i = initiatives.find(x => x.id === id);
  if (!i) return;
  document.getElementById('queue-detail').innerHTML = detailHTML(i, true);
  renderQueue();
}

// ── Admin actions ────────────────────────────────────────
function changeStatus(id, newStatus) {
  const i = initiatives.find(x => x.id === id);
  if (!i) return;
  const prev = i.status;
  i.status = newStatus;
  i.updates = i.updates || [];
  i.updates.push({
    date: today(),
    author: 'Automatizaciones',
    msg: `Estado actualizado: ${STATUS_LABEL[prev]} → ${STATUS_LABEL[newStatus]}`
  });
  persist();
  toast('Estado actualizado');
  showQueueDetail(id);
}

function addComment(id) {
  const input = document.getElementById(`comment-${id}`);
  if (!input || !input.value.trim()) { toast('Escribe una nota'); return; }
  const i = initiatives.find(x => x.id === id);
  if (!i) return;
  i.updates = i.updates || [];
  i.updates.push({ date: today(), author: 'Automatizaciones', msg: input.value.trim() });
  persist();
  toast('Nota agregada');
  input.value = '';
  showQueueDetail(id);
}

// ── Dashboard ─────────────────────────────────────────────
function renderDashboard() {
  const all = initiatives.filter(i => i.status !== 'draft');
  const byStatus = {};
  const byArea = {};
  let totalHours = 0;
  all.forEach(i => {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    if (i.area) byArea[i.area] = (byArea[i.area] || 0) + 1;
    totalHours += parseFloat(i.hours) || 0;
  });

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-num">${all.length}</div><div class="stat-lbl">Total enviadas</div></div>
    <div class="stat-card"><div class="stat-num stat-success">${byStatus.done || 0}</div><div class="stat-lbl">Completadas</div></div>
    <div class="stat-card"><div class="stat-num stat-accent">${(byStatus.analysis || 0) + (byStatus.dev || 0)}</div><div class="stat-lbl">En progreso</div></div>
    <div class="stat-card"><div class="stat-num stat-warning">${Math.round(totalHours)}</div><div class="stat-lbl">Horas a automatizar</div></div>`;

  // By area
  const areaEntries = Object.entries(byArea).sort((a, b) => b[1] - a[1]);
  const maxA = Math.max(...areaEntries.map(e => e[1]), 1);
  document.getElementById('area-chart').innerHTML = `<h3>Iniciativas por área</h3>` +
    (areaEntries.length ? areaEntries.map(([area, count]) => `
      <div class="bar-row">
        <div class="bar-label" title="${area}">${area}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(count/maxA*100)}%"></div></div>
        <div class="bar-count">${count}</div>
      </div>`).join('') : '<p style="font-size:13px;color:var(--text-muted)">Sin datos aún.</p>');

  // By status
  const statusOrder = ['sent','analysis','dev','done','rejected'];
  const maxS = Math.max(...statusOrder.map(s => byStatus[s] || 0), 1);
  const statusColors = { sent:'#b45309', analysis:'#4f46e5', dev:'#7c3aed', done:'#16a34a', rejected:'#dc2626' };
  document.getElementById('status-chart').innerHTML = `<h3>Distribución por estado</h3>` +
    statusOrder.filter(s => byStatus[s]).map(s => `
      <div class="bar-row">
        <div class="bar-label">${STATUS_LABEL[s]}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((byStatus[s]||0)/maxS*100)}%;background:${statusColors[s]}"></div></div>
        <div class="bar-count">${byStatus[s] || 0}</div>
      </div>`).join('') || '<p style="font-size:13px;color:var(--text-muted)">Sin datos aún.</p>';
}

// ── HTML builders ─────────────────────────────────────────
function cardHTML(i, view) {
  const fn = view === 'my' ? `showMyDetail('${i.id}')` : `showQueueDetail('${i.id}')`;
  return `
    <div class="initiative-card${selectedId === i.id ? ' selected' : ''}" onclick="${fn}">
      <div class="ic-top">
        <div class="ic-title">${esc(i.title)}</div>
        <span class="badge ${STATUS_BADGE[i.status]}">${STATUS_LABEL[i.status]}</span>
      </div>
      <div class="ic-meta">
        ${i.impact ? `<span class="impact-pill ${IMPACT_CLASS[i.impact]}">${IMPACT_LABEL[i.impact]}</span>` : ''}
        ${i.area ? `<span><i class="ti ti-building"></i>${esc(i.area)}</span>` : ''}
        ${view === 'queue' && i.name ? `<span><i class="ti ti-user"></i>${esc(i.name)}</span>` : ''}
        <span><i class="ti ti-calendar"></i>${i.created}</span>
        ${i.hours ? `<span><i class="ti ti-clock"></i>${i.hours}h</span>` : ''}
      </div>
    </div>`;
}

function detailHTML(i, isAdmin) {
  const statusActions = ['analysis','dev','done','rejected']
    .map(s => `<button class="btn btn-sm${i.status===s?' btn-primary':''}" onclick="changeStatus('${i.id}','${s}')">${STATUS_LABEL[s]}</button>`)
    .join('');

  const timeline = (i.updates && i.updates.length)
    ? i.updates.map(u => `
        <div class="tl-item">
          <div class="tl-dot"></div>
          <div><div class="tl-text">${esc(u.msg)}</div><div class="tl-meta">${esc(u.author)} · ${u.date}</div></div>
        </div>`).join('')
    : '<p style="font-size:13px;color:var(--text-muted)">Sin actualizaciones aún.</p>';

  return `
    <div class="detail-header">
      <h2>${esc(i.title)}</h2>
      <span class="badge ${STATUS_BADGE[i.status]}">${STATUS_LABEL[i.status]}</span>
    </div>
    <div class="detail-body">
      <div class="detail-row"><span class="detail-label">Solicitante</span><span class="detail-value">${esc(i.name)}</span></div>
      <div class="detail-row"><span class="detail-label">Área</span><span class="detail-value">${esc(i.area || '—')}</span></div>
      <div class="detail-row"><span class="detail-label">Impacto estimado</span><span class="detail-value"><span class="impact-pill ${IMPACT_CLASS[i.impact] || ''}">${IMPACT_LABEL[i.impact] || '—'}</span></span></div>
      <div class="detail-row"><span class="detail-label">Frecuencia</span><span class="detail-value">${esc(i.freq || '—')}</span></div>
      <div class="detail-row"><span class="detail-label">Horas / ejecución</span><span class="detail-value">${i.hours ? i.hours + 'h' : '—'}</span></div>
      <div class="detail-row"><span class="detail-label">Personas involucradas</span><span class="detail-value">${i.people || '—'}</span></div>
      <div class="detail-row"><span class="detail-label">Sistemas</span><span class="detail-value">${esc(i.systems || '—')}</span></div>
      <div class="detail-block"><span class="detail-label">Proceso actual</span><div class="detail-value">${esc(i.desc || '—')}</div></div>
      <div class="detail-block"><span class="detail-label">Resultado esperado</span><div class="detail-value">${esc(i.expected || '—')}</div></div>
      ${i.notes ? `<div class="detail-block"><span class="detail-label">Notas adicionales</span><div class="detail-value">${esc(i.notes)}</div></div>` : ''}
    </div>
    ${isAdmin ? `
    <div class="admin-controls">
      <div class="admin-controls-title">Gestión · Automatizaciones</div>
      <div class="status-buttons">${statusActions}</div>
      <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Agregar nota de avance</div>
      <div class="comment-form">
        <input type="text" id="comment-${i.id}" placeholder="Describe el avance, decisión o pendiente...">
        <button class="btn btn-sm btn-primary" onclick="addComment('${i.id}')">Agregar</button>
      </div>
    </div>` : ''}
    <div class="timeline">
      <div class="timeline-title">Bitácora de avances</div>
      ${timeline}
    </div>`;
}

function emptyDetail() {
  return `<div class="detail-empty"><i class="ti ti-cursor-text"></i><span>Selecciona una iniciativa para ver el detalle</span></div>`;
}

function emptyState(icon, msg) {
  return `<div class="empty-state"><i class="ti ${icon}"></i><p>${msg}</p></div>`;
}

// ── Utils ─────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function today() {
  return new Date().toLocaleDateString('es-EC', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// ── Initial banner ────────────────────────────────────────
if (scriptUrl) document.getElementById('configBanner').style.display = 'none';

// ── Demo data ─────────────────────────────────────────────
function getSampleData() {
  return [
    {
      id: '1001', name: 'María López', area: 'Operaciones',
      title: 'Conciliación bancaria automática',
      desc: 'Proceso manual de 4 horas mensuales cruzando extractos bancarios con registros SAP en Excel. Participan 2 personas y es propenso a errores.',
      expected: 'Reducir a 15 minutos con conciliación automática y reporte de diferencias.',
      impact: 'high', freq: 'Mensual', hours: '4', people: '2',
      systems: 'SAP, Excel, correo Outlook',
      notes: 'El banco envía el extracto en PDF los primeros 5 días del mes.',
      status: 'dev', created: '15/06/2025',
      updates: [
        { date: '15/06/2025', author: 'Sistema', msg: 'Iniciativa enviada a Automatizaciones.' },
        { date: '02/07/2025', author: 'Automatizaciones', msg: 'Análisis completado. Factible con RPA + extracción de PDF. Iniciando desarrollo.' },
        { date: '20/07/2025', author: 'Automatizaciones', msg: 'Primer prototipo listo. En pruebas con datos reales del mes de junio.' }
      ]
    },
    {
      id: '1002', name: 'Carlos Ruiz', area: 'Recursos Humanos',
      title: 'Clasificación de CVs con IA',
      desc: 'Revisión manual de 150–200 CVs por cada proceso de selección. Una persona dedica 1 día completo a leer y clasificar antes de pasar a entrevistas.',
      expected: 'Pre-filtrado y ranking automático por competencias clave, reduciendo revisión manual a 1 hora.',
      impact: 'med', freq: 'Bajo demanda', hours: '8', people: '1',
      systems: 'Correo Outlook, Word, carpetas compartidas',
      notes: '', status: 'analysis', created: '10/07/2025',
      updates: [
        { date: '10/07/2025', author: 'Sistema', msg: 'Iniciativa enviada a Automatizaciones.' },
        { date: '18/07/2025', author: 'Automatizaciones', msg: 'En análisis de viabilidad. Evaluando integración con ATS existente.' }
      ]
    },
    {
      id: '1003', name: 'Ana Torres', area: 'Finanzas',
      title: 'Generación automática de reporte de indicadores',
      desc: 'Cada lunes se construye manualmente un reporte de indicadores financieros en Excel consolidando 5 fuentes distintas. Tarda 2 horas.',
      expected: 'Reporte generado automáticamente cada lunes al inicio del día con alertas de variaciones.',
      impact: 'high', freq: 'Semanal', hours: '2', people: '1',
      systems: 'Excel, Power BI, SAP, SQL Server',
      notes: 'Ya existe conexión SQL, falta solo automatizar la consolidación.',
      status: 'sent', created: '25/07/2025',
      updates: [
        { date: '25/07/2025', author: 'Sistema', msg: 'Iniciativa enviada a Automatizaciones para revisión.' }
      ]
    },
    {
      id: '1004', name: 'Luis Medina', area: 'Atención al Cliente',
      title: 'Respuesta automática a consultas frecuentes',
      desc: 'El equipo de soporte responde manualmente ~80 correos diarios. El 60% son consultas repetitivas sobre estado de pedidos, facturación y horarios.',
      expected: 'Bot que responda automáticamente el 60% de consultas, liberando al equipo para casos complejos.',
      impact: 'high', freq: 'Diaria', hours: '3', people: '4',
      systems: 'Correo Outlook, CRM Salesforce, portal web',
      notes: '', status: 'done', created: '01/05/2025',
      updates: [
        { date: '01/05/2025', author: 'Sistema', msg: 'Iniciativa enviada.' },
        { date: '15/05/2025', author: 'Automatizaciones', msg: 'Aprobada. Iniciando desarrollo con GPT-4 + integración Salesforce.' },
        { date: '10/06/2025', author: 'Automatizaciones', msg: 'Bot desplegado en ambiente de pruebas. Precisión del 87% en clasificación.' },
        { date: '01/07/2025', author: 'Automatizaciones', msg: 'Producción activa. Resolviendo el 64% de consultas automáticamente.' }
      ]
    }
  ];
}
