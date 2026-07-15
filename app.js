/* ============================================================
   POSTMAN LITE — app.js
   Frontend → Express backend (/api/proxy) → Target API
   ============================================================ */

/* ── STATE ──────────────────────────────────────────────── */
const S = {
  tabs:         [],
  activeTab:    null,
  collections:  [],
  history:      [],
  environments: [],
  activeEnv:    null,
  method:       'GET',
  response:     null,
  view:         'pretty',
  editingEnvId: null,
};

/* ── INIT ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  if (!S.tabs.length) addNewTab();
  else { renderTabs(); activateTab(S.activeTab || S.tabs[0].id); }
  renderCollections();
  renderHistory();
  renderEnvList();
  updateEnvTopSelect();
  addParamRow();
  addHeaderRow();
  initSampleData();
  setupOutsideClick();
  addShortcutBar();
});

/* ── STORAGE ────────────────────────────────────────────── */
function saveStorage() {
  try {
    localStorage.setItem('pl_tabs',  JSON.stringify(S.tabs));
    localStorage.setItem('pl_cols',  JSON.stringify(S.collections));
    localStorage.setItem('pl_hist',  JSON.stringify(S.history.slice(0,50)));
    localStorage.setItem('pl_envs',  JSON.stringify(S.environments));
    localStorage.setItem('pl_aenv',  S.activeEnv || '');
  } catch(e) {}
}
function loadStorage() {
  try {
    S.tabs         = JSON.parse(localStorage.getItem('pl_tabs')  || '[]');
    S.collections  = JSON.parse(localStorage.getItem('pl_cols')  || '[]');
    S.history      = JSON.parse(localStorage.getItem('pl_hist')  || '[]');
    S.environments = JSON.parse(localStorage.getItem('pl_envs')  || '[]');
    S.activeEnv    = localStorage.getItem('pl_aenv') || null;
  } catch(e) { S.tabs=[]; S.collections=[]; S.history=[]; S.environments=[]; }
}

/* ── TABS ───────────────────────────────────────────────── */
function addNewTab(data) {
  const id  = 'tab_' + Date.now();
  const tab = data ? { ...data, id } : { id, name: 'New Request', method: 'GET', url: '' };
  S.tabs.push(tab);
  S.activeTab = id;
  renderTabs();
  activateTab(id);
  saveStorage();
}

function renderTabs() {
  const list = document.getElementById('tabsList');
  list.innerHTML = '';
  S.tabs.forEach(t => {
    const el = document.createElement('div');
    el.className = 'tab-item' + (t.id === S.activeTab ? ' active' : '');
    el.innerHTML = `
      <span class="tab-m ${t.method.toLowerCase()}">${t.method}</span>
      <span class="tab-name">${esc(t.name)}</span>
      <button class="tab-x" onclick="closeTab('${t.id}',event)"><i class="fa-solid fa-xmark"></i></button>`;
    el.addEventListener('click', e => { if (!e.target.closest('.tab-x')) activateTab(t.id); });
    list.appendChild(el);
  });
}

function activateTab(id) {
  S.activeTab = id;
  const t = S.tabs.find(x => x.id === id);
  if (!t) return;
  S.method = t.method || 'GET';
  document.getElementById('methodLabel').textContent  = t.method;
  document.getElementById('methodLabel').className    = 'method-badge ' + t.method.toLowerCase();
  document.getElementById('urlInput').value           = t.url || '';
  renderTabs();
  clearRes();
  saveStorage();
}

function closeTab(id, e) {
  e.stopPropagation();
  S.tabs = S.tabs.filter(t => t.id !== id);
  if (S.activeTab === id) {
    S.activeTab = S.tabs.length ? S.tabs[S.tabs.length-1].id : null;
    if (S.activeTab) activateTab(S.activeTab); else addNewTab();
  }
  renderTabs(); saveStorage();
}

function getTab() { return S.tabs.find(t => t.id === S.activeTab); }

/* ── SIDEBAR PANELS ─────────────────────────────────── */
function showPanel(name, btn) {
  document.querySelectorAll('.rail-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
}

/* ── METHOD ─────────────────────────────────────────── */
function toggleMethodDrop() { document.getElementById('methodDrop').classList.toggle('open'); }
function pickMethod(m) {
  S.method = m;
  document.getElementById('methodLabel').textContent = m;
  document.getElementById('methodLabel').className   = 'method-badge ' + m.toLowerCase();
  document.getElementById('methodDrop').classList.remove('open');
  const t = getTab(); if (t) { t.method = m; renderTabs(); saveStorage(); }
}

/* ── REQUEST TABS ───────────────────────────────────── */
function switchReqTab(name, btn) {
  document.querySelectorAll('.req-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.req-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('rp-' + name).classList.add('active');
}

/* ── PARAMS ─────────────────────────────────────────── */
function addParamRow(k='', v='', d='', on=true) {
  const c = document.getElementById('paramsRows');
  const r = document.createElement('div'); r.className = 'kv-row';
  r.innerHTML = `
    <input type="checkbox" ${on?'checked':''} onchange="updPBadge()"/>
    <input type="text" placeholder="Key"         value="${ea(k)}" oninput="updPBadge();syncUrl()"/>
    <input type="text" placeholder="Value"       value="${ea(v)}" oninput="syncUrl()"/>
    <input type="text" placeholder="Description" value="${ea(d)}"/>
    <button class="kv-del" onclick="this.closest('.kv-row').remove();updPBadge()"><i class="fa-solid fa-xmark"></i></button>`;
  c.appendChild(r); updPBadge();
}

function addHeaderRow(k='', v='', d='', on=true) {
  const c = document.getElementById('headersRows');
  const r = document.createElement('div'); r.className = 'kv-row';
  r.innerHTML = `
    <input type="checkbox" ${on?'checked':''} onchange="updHBadge()"/>
    <input type="text" placeholder="Key"         value="${ea(k)}" oninput="updHBadge()"/>
    <input type="text" placeholder="Value"       value="${ea(v)}"/>
    <input type="text" placeholder="Description" value="${ea(d)}"/>
    <button class="kv-del" onclick="this.closest('.kv-row').remove();updHBadge()"><i class="fa-solid fa-xmark"></i></button>`;
  c.appendChild(r); updHBadge();
}

function updPBadge() {
  let n=0;
  document.querySelectorAll('#paramsRows .kv-row').forEach(r=>{
    if(r.querySelectorAll('input')[1].value && r.querySelector('input[type=checkbox]').checked) n++;
  });
  const b=document.getElementById('paramsBadge');
  b.textContent=n; b.classList.toggle('on', n>0);
}
function updHBadge() {
  let n=0;
  document.querySelectorAll('#headersRows .kv-row').forEach(r=>{
    if(r.querySelectorAll('input')[1].value && r.querySelector('input[type=checkbox]').checked) n++;
  });
  const b=document.getElementById('headersBadge');
  b.textContent=n; b.classList.toggle('on', n>0);
}

function syncUrl() {
  const url = document.getElementById('urlInput');
  const base = url.value.split('?')[0];
  const params = [];
  document.querySelectorAll('#paramsRows .kv-row').forEach(r=>{
    const ins = r.querySelectorAll('input');
    const k=ins[1].value, v=ins[2].value;
    if(k && ins[0].checked) params.push(encodeURIComponent(k)+'='+encodeURIComponent(v));
  });
  url.value = params.length ? base+'?'+params.join('&') : base;
}

function getParams() {
  const o={};
  document.querySelectorAll('#paramsRows .kv-row').forEach(r=>{
    const ins=r.querySelectorAll('input'); const k=ins[1].value;
    if(k && ins[0].checked) o[k]=ins[2].value;
  });
  return o;
}
function getHeaders() {
  const o={};
  document.querySelectorAll('#headersRows .kv-row').forEach(r=>{
    const ins=r.querySelectorAll('input'); const k=ins[1].value;
    if(k && ins[0].checked) o[k]=ins[2].value;
  });
  return o;
}

/* ── AUTH ───────────────────────────────────────────── */
function switchAuth(type) {
  const c = document.getElementById('authFields'); c.innerHTML='';
  if (type==='bearer') {
    c.innerHTML=`<div class="auth-field"><label>Token</label><input type="text" id="aToken" placeholder="Bearer token..."/></div>`;
  } else if (type==='basic') {
    c.innerHTML=`<div class="auth-field"><label>Username</label><input type="text" id="aUser" placeholder="Username"/></div>
                 <div class="auth-field"><label>Password</label><input type="password" id="aPass" placeholder="Password"/></div>`;
  } else if (type==='apikey') {
    c.innerHTML=`<div class="auth-field"><label>Key</label><input type="text" id="aKey" placeholder="Header name"/></div>
                 <div class="auth-field"><label>Value</label><input type="text" id="aVal" placeholder="Token value"/></div>
                 <div class="auth-field"><label>Add to</label>
                   <select class="field-select" id="aWhere"><option value="header">Header</option><option value="query">Query Params</option></select>
                 </div>`;
  }
}
function getAuthHeaders() {
  const type = document.getElementById('authType').value; const h={};
  if(type==='bearer'){const t=document.getElementById('aToken')?.value;if(t)h['Authorization']='Bearer '+t;}
  else if(type==='basic'){const u=document.getElementById('aUser')?.value,p=document.getElementById('aPass')?.value;if(u)h['Authorization']='Basic '+btoa(u+':'+(p||''));}
  else if(type==='apikey'){const k=document.getElementById('aKey')?.value,v=document.getElementById('aVal')?.value;if(k&&v&&document.getElementById('aWhere')?.value==='header')h[k]=v;}
  return h;
}

/* ── BODY ───────────────────────────────────────────── */
function switchBody(type) {
  const bc=document.getElementById('bodyContent');
  const fmt=document.getElementById('rawFormat');
  const badge=document.getElementById('bodyBadge');
  fmt.style.display = type==='raw' ? 'block' : 'none';
  badge.classList.toggle('on', type!=='none');
  badge.textContent = type!=='none' ? '●' : '';
  if(type==='none'){
    bc.innerHTML=`<div class="no-body">This request does not have a body</div>`;
  } else if(type==='raw'){
    bc.innerHTML=`<textarea class="raw-editor" id="rawBody" placeholder="Enter request body..."></textarea>`;
  } else {
    bc.innerHTML=`<div class="form-table-wrap">
      <div class="kv-head" style="grid-template-columns:22px 1fr 1fr 26px"><span></span><span>Key</span><span>Value</span><span></span></div>
      <div id="bodyFormRows"></div>
      <button class="add-row-btn" onclick="addBodyRow()"><i class="fa-solid fa-plus"></i> Add Row</button>
    </div>`;
    addBodyRow();
  }
}
function addBodyRow() {
  const c=document.getElementById('bodyFormRows'); if(!c) return;
  const r=document.createElement('div'); r.className='kv-row'; r.style.gridTemplateColumns='22px 1fr 1fr 26px';
  r.innerHTML=`<input type="checkbox" checked/><input type="text" placeholder="Key"/><input type="text" placeholder="Value"/>
               <button class="kv-del" onclick="this.closest('.kv-row').remove()"><i class="fa-solid fa-xmark"></i></button>`;
  c.appendChild(r);
}
function getBody() {
  const sel=document.querySelector('input[name=btype]:checked')?.value;
  if(!sel||sel==='none') return null;
  if(sel==='raw'){
    const raw=document.getElementById('rawBody')?.value||'';
    const fmt=document.getElementById('rawFormat')?.value||'JSON';
    const ctMap={JSON:'application/json',HTML:'text/html',XML:'application/xml',Text:'text/plain'};
    return {type:'raw',content:raw,contentType:ctMap[fmt]||'text/plain'};
  }
  if(sel==='urlencoded'){
    const p=new URLSearchParams();
    document.querySelectorAll('#bodyFormRows .kv-row').forEach(r=>{
      const ins=r.querySelectorAll('input'); if(ins[1]?.value&&ins[0]?.checked) p.append(ins[1].value,ins[2]?.value||'');
    });
    return {type:'urlencoded',content:p.toString(),contentType:'application/x-www-form-urlencoded'};
  }
  if(sel==='form-data'){
    const fd=new FormData();
    document.querySelectorAll('#bodyFormRows .kv-row').forEach(r=>{
      const ins=r.querySelectorAll('input'); if(ins[1]?.value&&ins[0]?.checked) fd.append(ins[1].value,ins[2]?.value||'');
    });
    return {type:'form-data',content:fd,contentType:null};
  }
  return null;
}

/* ── SCRIPTS ────────────────────────────────────────── */
function switchScript(name, btn) {
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  document.getElementById('sc-pre').style.display  = name==='pre'  ? 'block' : 'none';
  document.getElementById('sc-post').style.display = name==='post' ? 'block' : 'none';
}

/* ── SEND REQUEST ───────────────────────────────────── */
async function sendRequest() {
  const rawUrl = document.getElementById('urlInput').value.trim();
  if (!rawUrl) { toast('Please enter a URL', 'error'); return; }
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    toast('URL must start with http:// or https://', 'error'); return;
  }

  const url     = resolveEnv(rawUrl);
  const method  = S.method;
  const headers = { ...getAuthHeaders(), ...getHeaders() };
  const body    = getBody();
  if (body?.contentType) headers['Content-Type'] = body.contentType;

  const btn   = document.querySelector('.btn-send');
  const label = document.getElementById('sendLabel');
  btn.style.opacity = '.7';
  label.innerHTML   = '<span class="spin"></span>';
  clearRes();

  try {
    const payload = { url, method, headers, body: body?.content||null, bodyType: body?.type||null };
    const res  = await fetch('/api/proxy', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const data = await res.json();

    if (!res.ok && data.error) throw new Error(data.error);

    /* status */
    const sc = Math.floor(data.status/100);
    const chip = document.getElementById('resStatus');
    chip.textContent = data.status + ' ' + data.statusText;
    chip.className   = 'status-chip s' + sc + 'xx';
    document.getElementById('resTime').textContent = data.time  + ' ms';
    document.getElementById('resSize').textContent = fmtBytes(data.size);

    const ct   = data.headers['content-type'] || '';
    const body2= typeof data.body === 'string' ? data.body : JSON.stringify(data.body, null, 2);
    S.response = { text: body2, ct, status: data.status, headers: data.headers, time: data.time, size: data.size };

    renderResBody(body2, ct);
    renderResHeaders(data.headers);
    renderTimeline(url, method, data);
    addHistory(method, rawUrl, data.status);
    toast(data.status + ' ' + data.statusText, sc < 4 ? 'success' : 'error');

  } catch(err) {
    document.getElementById('resStatus').textContent = 'Error';
    document.getElementById('resStatus').className   = 'status-chip s5xx';
    document.getElementById('resPlaceholder').style.display = 'none';
    const bt = document.getElementById('resBodyText');
    bt.style.display = 'block';
    bt.textContent   = err.message + '\n\nMake sure the backend server is running:\n  cd server\n  node index.js';
    toast('Error: ' + err.message, 'error');
  } finally {
    btn.style.opacity = '1';
    label.textContent = 'Send';
  }
}

/* ── RESPONSE RENDERING ─────────────────────────────── */
function renderResBody(text, ct) {
  document.getElementById('resPlaceholder').style.display = 'none';
  const bt = document.getElementById('resBodyText');
  const pv = document.getElementById('resPreview');

  if (S.view === 'raw') {
    bt.style.display = 'block'; pv.style.display = 'none';
    bt.textContent = text; return;
  }
  if (S.view === 'preview') {
    bt.style.display = 'none'; pv.style.display = 'flex';
    document.getElementById('previewFrame').srcdoc = text; return;
  }
  /* pretty */
  bt.style.display = 'block'; pv.style.display = 'none';
  if (ct.includes('json') || looksJson(text)) {
    try {
      bt.innerHTML = highlight(JSON.stringify(JSON.parse(text), null, 2));
      document.getElementById('langSel').value = 'JSON'; return;
    } catch {}
  }
  bt.textContent = text;
  if (ct.includes('html')) document.getElementById('langSel').value = 'HTML';
  else if (ct.includes('xml')) document.getElementById('langSel').value = 'XML';
}

function renderResHeaders(h) {
  const list = document.getElementById('resHeadersList'); list.innerHTML='';
  const entries = Object.entries(h||{});
  if (!entries.length) { list.innerHTML=`<div class="empty-state"><i class="fa-solid fa-list"></i><p>No headers</p></div>`; return; }
  entries.forEach(([k,v])=>{
    list.insertAdjacentHTML('beforeend',`<div class="res-hrow"><div class="res-hkey">${esc(k)}</div><div class="res-hval">${esc(String(v))}</div></div>`);
  });
}

function renderTimeline(url, method, data) {
  document.getElementById('timelineList').innerHTML=`
    <div class="tl-row"><div class="tl-label">URL</div><div class="tl-val" style="word-break:break-all">${esc(url)}</div></div>
    <div class="tl-row"><div class="tl-label">Method</div><div class="tl-val" style="color:var(--${method.toLowerCase()})">${method}</div></div>
    <div class="tl-row"><div class="tl-label">Status</div><div class="tl-val">${data.status} ${data.statusText}</div></div>
    <div class="tl-row"><div class="tl-label">Duration</div><div class="tl-val">${data.time} ms</div></div>
    <div class="tl-row"><div class="tl-label">Size</div><div class="tl-val">${fmtBytes(data.size)}</div></div>
    <div class="tl-row"><div class="tl-label">Content-Type</div><div class="tl-val">${esc(data.headers['content-type']||'—')}</div></div>
    <div class="tl-row"><div class="tl-label">Server</div><div class="tl-val">${esc(data.headers['server']||'—')}</div></div>`;
}

function switchResTab(name, btn) {
  document.querySelectorAll('.res-tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  document.querySelectorAll('.res-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('resp-'+name).classList.add('active');
  document.getElementById('resViewOpts').style.display = name==='body' ? 'flex' : 'none';
}

function switchView(v, btn) {
  S.view = v;
  document.querySelectorAll('.vbtn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  if (S.response) renderResBody(S.response.text, S.response.ct);
}

function clearRes() {
  document.getElementById('resPlaceholder').style.display='flex';
  document.getElementById('resBodyText').style.display='none';
  document.getElementById('resBodyText').textContent='';
  document.getElementById('resBodyText').innerHTML='';
  document.getElementById('resPreview').style.display='none';
  document.getElementById('resStatus').textContent='';
  document.getElementById('resStatus').className='status-chip';
  document.getElementById('resTime').textContent='';
  document.getElementById('resSize').textContent='';
  document.getElementById('resHeadersList').innerHTML='';
  document.getElementById('timelineList').innerHTML='';
  S.response=null;
}

function copyRes()     { if(!S.response){toast('No response','info');return;} navigator.clipboard.writeText(S.response.text).then(()=>toast('Copied!','success')); }
function downloadRes() {
  if(!S.response){toast('No response','info');return;}
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([S.response.text],{type:'text/plain'})); a.download='response.txt'; a.click(); URL.revokeObjectURL(a.href); toast('Downloaded!','success');
}

function looksJson(t) { const s=t.trim(); return (s.startsWith('{')&&s.endsWith('}'))||(s.startsWith('[')&&s.endsWith(']')); }
function highlight(json) {
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, m=>{
    let c='jn';
    if(/^"/.test(m)) c=/:$/.test(m)?'jk':'js';
    else if(/true|false/.test(m)) c='jb';
    else if(/null/.test(m)) c='jx';
    return `<span class="${c}">${m}</span>`;
  });
}
function fmtBytes(n) { if(n<1024)return n+' B'; if(n<1048576)return(n/1024).toFixed(1)+' KB'; return(n/1048576).toFixed(1)+' MB'; }

/* ── COLLECTIONS ────────────────────────────────────── */
function openNewCollection() {
  document.getElementById('col-name-inp').value='';
  document.getElementById('col-desc-inp').value='';
  document.getElementById('modal-collection').classList.add('open');
  setTimeout(()=>document.getElementById('col-name-inp').focus(),80);
}
function confirmNewCollection() {
  const name=document.getElementById('col-name-inp').value.trim();
  if(!name){toast('Enter a name','error');return;}
  S.collections.push({id:'c_'+Date.now(),name,desc:document.getElementById('col-desc-inp').value.trim(),requests:[]});
  renderCollections(); updSaveColSel(); saveStorage();
  closeModal('modal-collection'); toast('Collection created!','success');
}
function renderCollections(filter='') {
  const list=document.getElementById('collectionsList');
  // save open state + scroll
  const scroll=list.scrollTop;
  const openSet=new Set([...document.querySelectorAll('#collectionsList .col-header.open')]
    .map(el=>el.closest('.col-item')?.querySelector('.col-requests')?.id?.replace('cr-',''))
    .filter(Boolean));

  const filtered=S.collections.filter(c=>c.name.toLowerCase().includes(filter.toLowerCase()));
  list.innerHTML='';

  if(!filtered.length){
    list.innerHTML=`<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>No collections yet.<br>Click <b>+</b> to create one.</p></div>`;
    return;
  }

  filtered.forEach(col=>{
    const open=openSet.has(col.id);
    const div=document.createElement('div'); div.className='col-item';
    div.innerHTML=`
      <div class="col-header${open?' open':''}" onclick="toggleCol('${col.id}',this)">
        <i class="fa-solid fa-chevron-right chevron"></i>
        <i class="fa-solid fa-folder" style="color:var(--orange);font-size:12px"></i>
        <span class="col-name">${esc(col.name)}</span>
        <div class="col-actions">
          <button class="icon-sm" onclick="quickAdd('${col.id}',event)" title="Add request"><i class="fa-solid fa-plus"></i></button>
          <button class="icon-sm dots-btn" onclick="colMenu(event,'${col.id}')" title="More"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        </div>
      </div>
      <div class="col-requests${open?' open':''}" id="cr-${col.id}">
        ${!col.requests.length
          ? '<div style="padding:5px 8px;font-size:11px;color:var(--muted)">No requests yet</div>'
          : col.requests.map(r=>`
            <div class="req-item" onclick="loadReq('${col.id}','${r.id}')">
              <span class="req-badge" style="color:var(--${r.method.toLowerCase()})">${r.method}</span>
              <span class="req-label">${esc(r.name)}</span>
              <button class="icon-sm dots-btn" onclick="reqMenu(event,'${col.id}','${r.id}')"><i class="fa-solid fa-ellipsis-vertical"></i></button>
            </div>`).join('')}
      </div>`;
    list.appendChild(div);
  });
  list.scrollTop=scroll;
}

function toggleCol(id, hdr) {
  hdr.classList.toggle('open');
  document.getElementById('cr-'+id)?.classList.toggle('open');
}
function filterCollections(v) { renderCollections(v); }

function quickAdd(colId, e) {
  e.stopPropagation();
  const col=S.collections.find(c=>c.id===colId); if(!col) return;
  customRename('New Request', name=>{
    col.requests.push({id:'r_'+Date.now(),name,method:S.method,url:document.getElementById('urlInput').value});
    renderCollections(); saveStorage(); toast('Request added!','success');
  });
}
function loadReq(colId, reqId) {
  const col=S.collections.find(c=>c.id===colId);
  const req=col?.requests.find(r=>r.id===reqId); if(!req) return;
  addNewTab({name:req.name,method:req.method,url:req.url});
}

function colMenu(e, colId) {
  e.stopPropagation();
  showCtx(e,[
    {icon:'fa-plus',   label:'Add Request', fn:()=>quickAdd(colId,e)},
    {icon:'fa-pen',    label:'Rename',      fn:()=>{const c=S.collections.find(x=>x.id===colId);if(!c)return;customRename(c.name,n=>{c.name=n;renderCollections();saveStorage();toast('Renamed!','success');});}},
    {icon:'fa-copy',   label:'Duplicate',   fn:()=>{const c=S.collections.find(x=>x.id===colId);if(!c)return;S.collections.push({id:'c_'+Date.now(),name:c.name+' Copy',desc:c.desc,requests:c.requests.map(r=>({...r,id:'r_'+Date.now()+Math.random()}))});renderCollections();saveStorage();toast('Duplicated!','success');}},
    {sep:true},
    {icon:'fa-trash',  label:'Delete',      fn:()=>{customConfirm('Delete Collection','Delete "'+S.collections.find(x=>x.id===colId)?.name+'" and all its requests?','Delete',()=>{S.collections=S.collections.filter(x=>x.id!==colId);renderCollections();updSaveColSel();saveStorage();toast('Deleted','info');});}, danger:true}
  ]);
}
function reqMenu(e, colId, reqId) {
  e.stopPropagation();
  showCtx(e,[
    {icon:'fa-arrow-up-right-from-square', label:'Open in Tab', fn:()=>loadReq(colId,reqId)},
    {icon:'fa-pen',   label:'Rename',    fn:()=>{const col=S.collections.find(c=>c.id===colId);const r=col?.requests.find(r=>r.id===reqId);if(!r)return;customRename(r.name,n=>{r.name=n;renderCollections();saveStorage();toast('Renamed!','success');});}},
    {icon:'fa-copy',  label:'Duplicate', fn:()=>{const col=S.collections.find(c=>c.id===colId);if(!col)return;const r=col.requests.find(r=>r.id===reqId);if(!r)return;const idx=col.requests.indexOf(r);col.requests.splice(idx+1,0,{...r,id:'r_'+Date.now(),name:r.name+' Copy'});renderCollections();saveStorage();toast('Duplicated!','success');}},
    {sep:true},
    {icon:'fa-trash', label:'Delete', fn:()=>{const col=S.collections.find(c=>c.id===colId);const r=col?.requests.find(r=>r.id===reqId);customConfirm('Delete Request','Delete "'+r?.name+'"?','Delete',()=>{col.requests=col.requests.filter(r=>r.id!==reqId);renderCollections();saveStorage();toast('Deleted','info');});}, danger:true}
  ]);
}

/* ── SAVE REQUEST ───────────────────────────────────── */
function openSaveRequest() {
  if(!S.collections.length){toast('Create a collection first','info');openNewCollection();return;}
  updSaveColSel();
  const t=getTab(); document.getElementById('save-name-inp').value=t?.name||'New Request';
  document.getElementById('modal-save').classList.add('open');
}
function updSaveColSel() {
  document.getElementById('save-col-sel').innerHTML=S.collections.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
}
function confirmSave() {
  const name=document.getElementById('save-name-inp').value.trim();
  const colId=document.getElementById('save-col-sel').value;
  if(!name){toast('Enter a name','error');return;}
  const col=S.collections.find(c=>c.id===colId); if(!col){toast('Select a collection','error');return;}
  col.requests.push({id:'r_'+Date.now(),name,method:S.method,url:document.getElementById('urlInput').value});
  const t=getTab(); if(t){t.name=name;renderTabs();}
  renderCollections(); saveStorage(); closeModal('modal-save'); toast('Saved!','success');
}

/* ── HISTORY ────────────────────────────────────────── */
function addHistory(method, url, status) {
  S.history.unshift({id:'h_'+Date.now(),method,url,status,time:new Date().toLocaleTimeString()});
  if(S.history.length>50) S.history.pop();
  renderHistory(); saveStorage();
}
function renderHistory() {
  const list=document.getElementById('historyList'); list.innerHTML='';
  if(!S.history.length){list.innerHTML=`<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><p>No history yet</p></div>`;return;}
  S.history.forEach(h=>{
    const d=document.createElement('div'); d.className='hist-item'; d.title=h.url;
    d.onclick=()=>addNewTab({name:h.url.split('/').pop()||'Request',method:h.method,url:h.url});
    d.innerHTML=`<span class="req-badge" style="color:var(--${h.method.toLowerCase()})">${h.method}</span><span class="hist-url">${esc(h.url)}</span><span class="hist-time">${h.time}</span>`;
    list.appendChild(d);
  });
}
function clearHistory() {
  customConfirm('Clear History', 'Remove all request history?', 'Clear All', ()=>{
    S.history=[]; renderHistory(); saveStorage(); toast('History cleared','info');
  });
}

/* ── ENVIRONMENTS ───────────────────────────────────── */
function openCreateEnv(id) {
  S.editingEnvId = id||null;
  const env = id ? S.environments.find(e=>e.id===id) : null;
  document.getElementById('envModalTitle').textContent = env ? 'Edit Environment' : 'New Environment';
  document.getElementById('env-name-inp').value = env?.name||'';
  const rows=document.getElementById('envVarRows'); rows.innerHTML='';
  (env?.variables||[{key:'',value:'',enabled:true}]).forEach(v=>addEnvVarRow(v.key,v.value,v.enabled));
  document.getElementById('modal-env').classList.add('open');
}
function addEnvVarRow(k='',v='',on=true) {
  const c=document.getElementById('envVarRows');
  const r=document.createElement('div'); r.className='kv-row'; r.style.gridTemplateColumns='22px 1fr 1fr 26px';
  r.innerHTML=`<input type="checkbox" ${on?'checked':''}/><input type="text" placeholder="Variable" value="${ea(k)}"/><input type="text" placeholder="Value" value="${ea(v)}"/><button class="kv-del" onclick="this.closest('.kv-row').remove()"><i class="fa-solid fa-xmark"></i></button>`;
  c.appendChild(r);
}
function confirmEnv() {
  const name=document.getElementById('env-name-inp').value.trim();
  if(!name){toast('Enter a name','error');return;}
  const vars=[];
  document.querySelectorAll('#envVarRows .kv-row').forEach(r=>{
    const ins=r.querySelectorAll('input'); if(ins[1]?.value) vars.push({key:ins[1].value,value:ins[2]?.value||'',enabled:ins[0]?.checked});
  });
  if(S.editingEnvId){
    const env=S.environments.find(e=>e.id===S.editingEnvId);
    if(env){env.name=name;env.variables=vars;}
  } else {
    S.environments.push({id:'e_'+Date.now(),name,variables:vars});
  }
  renderEnvList(); updateEnvTopSelect(); saveStorage(); closeModal('modal-env'); toast('Environment saved!','success');
}
function renderEnvList() {
  const list=document.getElementById('envList'); list.innerHTML='';
  if(!S.environments.length){list.innerHTML=`<div class="empty-state"><i class="fa-solid fa-sliders"></i><p>No environments.<br>Click <b>+</b> to create one.</p></div>`;return;}
  S.environments.forEach(env=>{
    const d=document.createElement('div'); d.className='env-item'+(S.activeEnv===env.id?' active-env':'');
    d.onclick=()=>setActiveEnv(env.id);
    d.innerHTML=`<div class="env-dot" style="background:${S.activeEnv===env.id?'var(--ok)':'var(--muted)'}"></div>
      <span class="env-name">${esc(env.name)}</span>
      <button class="icon-sm" onclick="openCreateEnv('${env.id}');event.stopPropagation()" title="Edit"><i class="fa-solid fa-pen"></i></button>
      <button class="icon-sm" onclick="delEnv('${env.id}');event.stopPropagation()" title="Delete"><i class="fa-solid fa-trash"></i></button>`;
    list.appendChild(d);
  });
}
function setActiveEnv(id) {
  S.activeEnv = S.activeEnv===id ? null : id;
  renderEnvList(); updateEnvTopSelect(); saveStorage();
  const env=S.environments.find(e=>e.id===id);
  toast(S.activeEnv?`Active: ${env.name}`:'No environment active','info');
}
function updateEnvTopSelect() {
  const sel=document.getElementById('envSelector');
  sel.innerHTML='<option value="">No Environment</option>';
  S.environments.forEach(env=>{
    const o=document.createElement('option'); o.value=env.id; o.textContent=env.name;
    if(env.id===S.activeEnv) o.selected=true; sel.appendChild(o);
  });
  sel.onchange=()=>{S.activeEnv=sel.value||null;renderEnvList();saveStorage();};
}
function delEnv(id) {
  const env = S.environments.find(e=>e.id===id);
  customConfirm('Delete Environment', 'Delete "'+env?.name+'"?', 'Delete', ()=>{
    S.environments=S.environments.filter(e=>e.id!==id);
    if(S.activeEnv===id) S.activeEnv=null;
    renderEnvList(); updateEnvTopSelect(); saveStorage(); toast('Deleted','info');
  });
}
function resolveEnv(str) {
  if(!S.activeEnv) return str;
  const env=S.environments.find(e=>e.id===S.activeEnv); if(!env) return str;
  return str.replace(/\{\{(\w+)\}\}/g,(_,k)=>{const v=env.variables.find(v=>v.key===k&&v.enabled);return v?v.value:`{{${k}}}`;});
}

/* ── CUSTOM CONFIRM & RENAME ────────────────────────── */
function customConfirm(title, msg, okLabel, onOk) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent   = msg;
  const btn = document.getElementById('confirm-ok-btn');
  btn.textContent = okLabel || 'Delete';
  btn.onclick = () => { closeModal('modal-confirm'); onOk(); };
  document.getElementById('modal-confirm').classList.add('open');
}

function customRename(currentName, onOk) {
  const inp = document.getElementById('rename-inp');
  inp.value = currentName || '';
  const btn = document.getElementById('rename-ok-btn');
  btn.onclick = () => {
    const val = inp.value.trim();
    if (!val) { toast('Enter a name', 'error'); return; }
    closeModal('modal-rename'); onOk(val);
  };
  document.getElementById('modal-rename').classList.add('open');
  setTimeout(() => { inp.focus(); inp.select(); }, 80);
}

/* ── CONTEXT MENU ───────────────────────────────────── */
let _ctx=null;
function showCtx(e, items) {
  e.preventDefault();
  if(_ctx){_ctx.remove();_ctx=null;}
  _ctx=document.createElement('div'); _ctx.className='ctx-menu open';
  _ctx.style.left=Math.min(e.pageX,window.innerWidth-190)+'px';
  _ctx.style.top=Math.min(e.pageY,window.innerHeight-220)+'px';
  items.forEach(item=>{
    if(item.sep){_ctx.insertAdjacentHTML('beforeend','<div class="ctx-sep"></div>');return;}
    const d=document.createElement('div'); d.className='ctx-item'+(item.danger?' danger':'');
    d.innerHTML=`<i class="fa-solid ${item.icon}"></i> ${item.label}`;
    d.onclick=()=>{item.fn();_ctx?.remove();_ctx=null;};
    _ctx.appendChild(d);
  });
  document.body.appendChild(_ctx);
}

/* ── TOAST ──────────────────────────────────────────── */
let _tt=null;
function toast(msg,type='info') {
  const t=document.getElementById('toast'); t.textContent=msg; t.className='toast show '+type;
  if(_tt) clearTimeout(_tt); _tt=setTimeout(()=>t.classList.remove('show'),2800);
}

/* ── UTILS ──────────────────────────────────────────── */
function esc(s)  { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function ea(s)   { return String(s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

/* ── KEYBOARD SHORTCUTS ─────────────────────────────── */
document.addEventListener('keydown', e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();sendRequest();}
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();const u=document.getElementById('urlInput');u.focus();u.select();}
  if((e.ctrlKey||e.metaKey)&&e.key==='t'){e.preventDefault();addNewTab();}
  if((e.ctrlKey||e.metaKey)&&e.key==='w'){e.preventDefault();if(S.activeTab)closeTab(S.activeTab,{stopPropagation:()=>{}});}
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();openSaveRequest();}
  if(e.key==='Escape'){document.querySelectorAll('.modal-bg.open').forEach(m=>m.classList.remove('open'));document.getElementById('methodDrop').classList.remove('open');if(_ctx){_ctx.remove();_ctx=null;}}
});

/* ── URL INPUT: parse params ────────────────────────── */
document.getElementById('urlInput').addEventListener('input', function(){
  const t=getTab(); if(t){t.url=this.value;saveStorage();}
  try {
    const full=this.value.includes('://')?this.value:'https://'+this.value;
    const u=new URL(full);
    if(u.search){
      document.getElementById('paramsRows').innerHTML='';
      u.searchParams.forEach((v,k)=>addParamRow(k,v));
      updPBadge();
    }
  } catch{}
});

/* ── OUTSIDE CLICK ──────────────────────────────────── */
function setupOutsideClick() {
  document.addEventListener('click', e=>{
    if(!e.target.closest('.method-wrap')) document.getElementById('methodDrop').classList.remove('open');
    if(!e.target.closest('.ctx-menu')&&_ctx){_ctx.remove();_ctx=null;}
  });
}

/* ── SHORTCUT BAR ───────────────────────────────────── */
function addShortcutBar() {
  const bar=document.createElement('div'); bar.className='shortcut-bar';
  bar.innerHTML=[['Ctrl+Enter','Send'],['Ctrl+T','New Tab'],['Ctrl+K','Focus URL'],['Ctrl+S','Save'],['Esc','Close']].map(([k,l])=>`<span><kbd>${k}</kbd> ${l}</span>`).join('');
  document.body.appendChild(bar);
}

/* ── SAMPLE DATA ────────────────────────────────────── */
function initSampleData() {
  if(S.collections.length) return;
  S.collections=[{
    id:'c_sample',name:'🚀 Demo Collection',desc:'Sample requests to get started',requests:[
      {id:'r1',name:'GET All Users',  method:'GET',  url:'https://jsonplaceholder.typicode.com/users'},
      {id:'r2',name:'POST Create',    method:'POST', url:'https://jsonplaceholder.typicode.com/posts'},
      {id:'r3',name:'DELETE Post',    method:'DELETE',url:'https://jsonplaceholder.typicode.com/posts/1'},
    ]
  }];
  S.environments=[{id:'e_dev',name:'Development',variables:[
    {key:'baseUrl',value:'https://jsonplaceholder.typicode.com',enabled:true},
    {key:'token',  value:'dev-token-123',enabled:true}
  ]}];
  renderCollections(); renderEnvList(); updateEnvTopSelect(); saveStorage();
}

/* ── MODAL ──────────────────────────────────────────── */
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* End of app.js */
