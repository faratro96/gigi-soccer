const LS_KEY = 'convoca_app_v6_data'; // mantenuto per non perdere i dati già inseriti
const STAFF_KEY = 'convoca_app_v6_staff';
const ROLES = ['Portiere','Centrale','Laterale','Pivot'];
const TEAMS = ['CSI','Serie D'];

const uid = () => Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const today = () => new Date().toISOString().slice(0,10);
const fmtDate = d => d ? d.split('-').reverse().join('/') : '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money = n => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(n||0));
const EVENT_COLORS = [
  {name:'Verde chiaro', value:'#bbf7d0'},
  {name:'Azzurro', value:'#bfdbfe'},
  {name:'Giallo', value:'#fde68a'},
  {name:'Rosa', value:'#fecdd3'},
  {name:'Viola', value:'#e9d5ff'},
  {name:'Arancione', value:'#fed7aa'},
  {name:'Grigio', value:'#e5e7eb'},
  {name:'Rosso chiaro', value:'#fecaca'}
];
const eventStyle = color => color ? ` style="background:${esc(color)}"` : '';
const isoDate = d => d.toISOString().slice(0,10);
const dayIndexMon = dateStr => { const d = new Date(dateStr+'T12:00:00'); return ((d.getDay()+6)%7)+1; };
const dateInRange = (date,start,end) => (!start || date>=start) && (!end || date<=end);
const eventColorOptions = selected => EVENT_COLORS.map(c=>`<option value="${c.value}" ${selected===c.value?'selected':''}>${c.name}</option>`).join('');

const cleanText = s => String(s ?? '').replace(/\s+/g,' ').trim();
function eventTip(e){
  const parts = [];
  if(e.time) parts.push(`Orario: ${e.time}${e.end ? ' - '+e.end : ''}`);
  if(e.title) parts.push(e.title);
  if(e.location) parts.push(`Luogo: ${e.location}`);
  if(e.notes) parts.push(`Note: ${e.notes}`);
  return esc(parts.join('\n'));
}
function eventAttrs(e,date){
  return `data-tip="${eventTip(e)}" title="${eventTip(e)}" onclick="event.stopPropagation(); openCalendarItem('${esc(e.source)}','${esc(e.id)}','${date}')"`;
}

let state = loadData();
let staffMode = localStorage.getItem(STAFF_KEY) === '1';
let currentView = 'dashboard';
let calCursor = new Date();

function seedData(){
  const p1={id:uid(),firstName:'Mario',lastName:'Rossi',teams:['CSI'],roles:['Portiere'],foot:'Destro',number:'1',phone:'',email:'',status:'Attivo',notes:''};
  const p2={id:uid(),firstName:'Andrea',lastName:'Verdi',teams:['CSI','Serie D'],roles:['Laterale','Pivot'],foot:'Mancino',number:'9',phone:'',email:'',status:'Attivo',notes:'Doppio tesserato'};
  const p3={id:uid(),firstName:'Luca',lastName:'Bianchi',teams:['Serie D'],roles:['Centrale'],foot:'Destro',number:'5',phone:'',email:'',status:'Attivo',notes:''};
  const tr={id:uid(),team:'CSI',date:today(),start:'20:30',end:'22:00',location:'Centro Sportivo',notes:'Allenamento tecnico-tattico'};
  const m={id:uid(),team:'Serie D',opponent:'ASD Roma Futsal',competition:'Campionato',date:today(),meetingTime:'14:00',matchTime:'15:00',meetingPlace:'Campo gara',fieldName:'Palazzetto',fieldAddress:'Via dello Sport 1',kitColor:'Blu',notes:'Portare documento'};
  const c={id:uid(),matchId:m.id,title:'Convocazione gara Serie D',playerIds:[p2.id,p3.id],notes:'Presentarsi puntuali'};
  return {players:[p1,p2,p3],trainings:[tr],attendance:[],matches:[m],callups:[c],matchStats:[],calendarEvents:[{id:uid(),title:'Allenamento CSI',type:'Allenamento',team:'CSI',date:'',start:'20:00',end:'22:00',location:'Centro Sportivo',address:'',notes:'Evento periodico demo',color:'#bbf7d0',repeat:'weekly',weekdays:[2,4],startDate:today().slice(0,8)+'01',endDate:''},{id:uid(),title:'Cena squadra',type:'Cena',team:'Tutte',date:today(),start:'21:00',end:'',location:'Sponsor Ristorante',address:'',notes:'Evento extra',color:'#e9d5ff',repeat:'none',weekdays:[],startDate:'',endDate:''}],sponsors:[{id:uid(),name:'Ristorante Da Sponsor',type:'Ristorante',amountPaid:500,paymentDate:today(),contact:'',phone:'',email:'',notes:'Sponsor stagione'}],sponsorExpenses:[{id:uid(),sponsorId:null,date:today(),description:'Cena squadra',amount:240,notes:''}]};
}
function loadData(){
  try{ const raw=localStorage.getItem(LS_KEY); return raw?JSON.parse(raw):seedData(); }catch(e){ return seedData(); }
}
function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function byId(id){return document.getElementById(id)}
function q(sel,root=document){return root.querySelector(sel)}
function qa(sel,root=document){return [...root.querySelectorAll(sel)]}

function init(){
  qa('#mainNav button').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));
  byId('loginBtn').onclick=()=>openStaffLogin();
  byId('logoutBtn').onclick=()=>{staffMode=false;localStorage.removeItem(STAFF_KEY);renderAll();};
  byId('closeModal').onclick=closeModal;
  byId('modal').addEventListener('click',e=>{if(e.target.id==='modal') closeModal();});
  renderAll();
}
function renderAll(){
  updateMode();
  renderDashboard(); renderCalendar(); renderCallups(); renderPlayers(); renderTrainings(); renderMatches(); renderStats(); renderSponsors(); renderBackup();
}
function updateMode(){
  byId('modeBadge').textContent = staffMode ? 'Modalità staff/editor' : 'Modalità giocatore';
  byId('modeBadge').style.background = staffMode ? '#dcfce7' : '#e7f0ff';
  byId('loginBtn').classList.toggle('hidden', staffMode);
  byId('logoutBtn').classList.toggle('hidden', !staffMode);
  qa('.staff-only').forEach(el=>el.classList.toggle('hidden', !staffMode));
}
function showView(id){
  if(q(`#mainNav button[data-view="${id}"]`)?.classList.contains('staff-only') && !staffMode) id='dashboard';
  currentView=id;
  qa('.view').forEach(v=>v.classList.remove('active'));
  byId(id).classList.add('active');
  qa('#mainNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  renderAll();
}
function openModal(html){ byId('modalContent').innerHTML=html; byId('modal').classList.remove('hidden'); }
function closeModal(){ byId('modal').classList.add('hidden'); byId('modalContent').innerHTML=''; }
function openStaffLogin(){
  openModal(`<h2>Accesso staff</h2><p class="muted">Per questa versione test la password locale è <b>staff</b>. Nella versione Supabase si usa email/password.</p><div class="field"><label>Password</label><input id="staffPass" type="password" placeholder="staff"></div><br><button class="btn primary" onclick="doStaffLogin()">Entra</button>`);
}
function doStaffLogin(){
  if(byId('staffPass').value.trim()==='staff'){ staffMode=true; localStorage.setItem(STAFF_KEY,'1'); closeModal(); renderAll(); showView('dashboard'); }
  else alert('Password errata. In questa demo usa: staff');
}

function renderDashboard(){
  const nextTrain=[...state.trainings].sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).find(x=>x.date>=today());
  const nextMatch=[...state.matches].sort((a,b)=>(a.date+a.matchTime).localeCompare(b.date+b.matchTime)).find(x=>x.date>=today());
  byId('dashboard').innerHTML=`
    <div class="grid">
      <div class="card span-12"><h2>Dashboard società futsal</h2><p class="notice">Questa v12 contiene tutte le sezioni: calendario, convocazioni, giocatori, allenamenti, partite, statistiche e sponsor. In modalità giocatore sono visibili solo le parti consultabili.</p></div>
      <div class="card span-3"><h3>Giocatori</h3><div class="kpi">${state.players.length}</div><p class="muted">Anagrafica totale</p></div>
      <div class="card span-3"><h3>Doppi tesserati</h3><div class="kpi">${state.players.filter(p=>(p.teams||[]).length>1).length}</div><p class="muted">CSI + Serie D</p></div>
      <div class="card span-3"><h3>Partite</h3><div class="kpi">${state.matches.length}</div><p class="muted">In archivio</p></div>
      <div class="card span-3"><h3>Sponsor</h3><div class="kpi">${state.sponsors.length}</div><p class="muted">Rendicontazione</p></div>
      <div class="card span-6"><h3>Prossimo allenamento</h3>${nextTrain?`<p><b>${fmtDate(nextTrain.date)} ${esc(nextTrain.start||'')}</b> - ${esc(nextTrain.team)}</p><p>${esc(nextTrain.location||'')}</p>`:'<p class="muted">Nessun allenamento futuro.</p>'}</div>
      <div class="card span-6"><h3>Prossima partita</h3>${nextMatch?`<p><b>${fmtDate(nextMatch.date)} ${esc(nextMatch.matchTime||'')}</b> - ${esc(nextMatch.team)} vs ${esc(nextMatch.opponent)}</p><p>Ritrovo: ${esc(nextMatch.meetingTime||'')} ${esc(nextMatch.meetingPlace||'')}</p>`:'<p class="muted">Nessuna partita futura.</p>'}</div>
      <div class="card span-12"><h3>Accesso rapido</h3><div class="row"><button class="btn primary" onclick="showView('calendar')">Apri calendario</button><button class="btn primary" onclick="showView('callups')">Vedi convocazioni</button>${staffMode?`<button class="btn ok" onclick="showView('players')">Gestisci giocatori</button><button class="btn ok" onclick="showView('sponsors')">Gestisci sponsor</button>`:''}</div></div>
    </div>`;
}

function renderCalendar(){
  const y=calCursor.getFullYear(), m=calCursor.getMonth();
  const first=new Date(y,m,1), last=new Date(y,m+1,0);
  const startOffset=(first.getDay()+6)%7;
  const monthName=calCursor.toLocaleDateString('it-IT',{month:'long',year:'numeric'});
  let days=''; ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].forEach(d=>days+=`<div class="dayname">${d}</div>`);
  for(let i=0;i<startOffset;i++) days+=`<div class="day muted"></div>`;
  for(let d=1;d<=last.getDate();d++){
    const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs=getEventsForDate(date);
    days+=`<div class="day ${staffMode?'day-clickable':''}" onclick="openDayEventForm('${date}')" title="${staffMode?'Clicca nello spazio libero per aggiungere un evento in questa data':''}"><div class="num">${d}${staffMode?'<span class=\"day-plus\">+</span>':''}</div>${evs.map(e=>`<div class="event ${e.cls}"${eventStyle(e.color)} ${eventAttrs(e,date)}>${esc(e.time||'')} ${esc(e.title)}</div>`).join('')}</div>`;
  }
  byId('calendar').innerHTML=`<div class="card"><div class="calendar-head"><button class="btn secondary" onclick="moveMonth(-1)">← Mese</button><h2>${monthName[0].toUpperCase()+monthName.slice(1)}</h2><button class="btn secondary" onclick="moveMonth(1)">Mese →</button></div>${staffMode?`<div class="row no-print"><button class="btn primary" onclick="openEventForm()">Aggiungi evento</button><button class="btn ok" onclick="openEventForm('',true)">Aggiungi evento periodico</button><button class="btn secondary" onclick="clearDemoCalendarItems()">Pulisci eventi demo</button></div><p class="muted no-print">Per esempio: Allenamento CSI, martedì e giovedì, ore 20:00-22:00, da settembre a novembre, colore verde chiaro.</p>`:''}<div class="calendar-grid">${days}</div></div>`;
}
function moveMonth(delta){calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()+delta,1);renderCalendar();}
function getEventsForDate(date){
  const arr=[];
  state.trainings.filter(x=>x.date===date).forEach(x=>arr.push({id:x.id,source:'training',title:`Allenamento ${x.team}`,time:x.start,end:x.end,cls:'training',color:'#e0f2fe',location:x.location,notes:x.notes}));
  state.matches.filter(x=>x.date===date).forEach(x=>arr.push({id:x.id,source:'match',title:`${x.team} vs ${x.opponent}`,time:x.matchTime,end:'',cls:'match',color:'#dcfce7',location:x.fieldName || x.meetingPlace,notes:x.notes}));
  state.callups.forEach(c=>{const mt=state.matches.find(m=>m.id===c.matchId); if(mt?.date===date) arr.push({id:c.id,source:'callup',title:`Convocazione ${mt.team}`,time:mt.meetingTime,end:'',cls:'callup',color:'#fef3c7',location:mt.meetingPlace || mt.fieldName,notes:c.notes || mt.notes});});
  (state.calendarEvents||[]).forEach(x=>{
    const repeat=x.repeat||'none';
    const matchSingle = repeat==='none' && x.date===date;
    const matchWeekly = repeat==='weekly' && dateInRange(date,x.startDate,x.endDate) && (x.weekdays||[]).map(Number).includes(dayIndexMon(date));
    if(matchSingle || matchWeekly) arr.push({id:x.id,source:'event',title:x.title,time:x.start,end:x.end,cls:x.type==='Sponsor'?'sponsor':'extra',color:x.color,location:x.location,notes:x.notes,raw:x});
  });
  return arr.sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
}
function clearDemoCalendarItems(){
  if(!staffMode) return;
  if(!confirm('Vuoi eliminare gli eventi demo di calendario, allenamento, partita e convocazione creati in automatico? I dati inseriti manualmente restano, salvo quelli con note demo.')) return;
  state.calendarEvents = (state.calendarEvents||[]).filter(e => !/demo/i.test(e.notes||'') && e.title !== 'Cena squadra');
  state.trainings = (state.trainings||[]).filter(t => !/tecnico-tattico/i.test(t.notes||''));
  const demoMatches = new Set((state.matches||[]).filter(m => m.opponent === 'ASD Roma Futsal' && /Portare documento/i.test(m.notes||'')).map(m=>m.id));
  state.matches = (state.matches||[]).filter(m => !demoMatches.has(m.id));
  state.callups = (state.callups||[]).filter(c => !demoMatches.has(c.matchId));
  save(); renderAll();
}
function openEventForm(id='', forceRecurring=false, presetDate=''){
  const baseDate = presetDate || today();
  const ev=(state.calendarEvents||[]).find(x=>x.id===id)||{title:'',type:'Allenamento',team:'CSI',date:baseDate,start:'20:00',end:'22:00',location:'',address:'',notes:'',color:'#bbf7d0',repeat:forceRecurring?'weekly':'none',weekdays:[],startDate:baseDate,endDate:''};
  const days=[['1','Lun'],['2','Mar'],['3','Mer'],['4','Gio'],['5','Ven'],['6','Sab'],['7','Dom']];
  const checked=d=>(ev.weekdays||[]).map(String).includes(String(d))?'checked':'';
  const recurring=(ev.repeat||'none')==='weekly';
  openModal(`<h2>${id?'Modifica':'Nuovo'} evento calendario</h2><input id="evId" type="hidden" value="${esc(id)}"><div class="row"><div class="field"><label>Titolo</label><input id="evTitle" value="${esc(ev.title)}" placeholder="Allenamento CSI"></div><div class="field"><label>Tipo</label><select id="evType"><option ${ev.type==='Allenamento'?'selected':''}>Allenamento</option><option ${ev.type==='Partita'?'selected':''}>Partita</option><option ${ev.type==='Cena'?'selected':''}>Cena</option><option ${ev.type==='Aperitivo'?'selected':''}>Aperitivo</option><option ${ev.type==='Riunione'?'selected':''}>Riunione</option><option ${ev.type==='Sponsor'?'selected':''}>Sponsor</option><option ${ev.type==='Altro'?'selected':''}>Altro</option></select></div><div class="field"><label>Squadra</label><select id="evTeam"><option ${ev.team==='Tutte'?'selected':''}>Tutte</option><option ${ev.team==='CSI'?'selected':''}>CSI</option><option ${ev.team==='Serie D'?'selected':''}>Serie D</option></select></div><div class="field"><label>Colore etichetta</label><select id="evColor">${eventColorOptions(ev.color)}</select></div></div><div class="row"><div class="field"><label>Ora inizio</label><input id="evStart" type="time" value="${esc(ev.start||'')}"></div><div class="field"><label>Ora fine</label><input id="evEnd" type="time" value="${esc(ev.end||'')}"></div><div class="field"><label>Luogo</label><input id="evLoc" value="${esc(ev.location||'')}"></div></div><h3>Ripetizione</h3><div class="row"><label><input type="radio" name="evRepeat" value="none" ${!recurring?'checked':''} onchange="toggleRepeatFields()"> Evento singolo</label><label><input type="radio" name="evRepeat" value="weekly" ${recurring?'checked':''} onchange="toggleRepeatFields()"> Evento periodico settimanale</label></div><div id="singleFields" class="row ${recurring?'hidden':''}"><div class="field"><label>Data evento</label><input id="evDate" type="date" value="${esc(ev.date||today())}"></div></div><div id="repeatFields" class="${recurring?'':'hidden'}"><div class="row"><div class="field"><label>Dal</label><input id="evStartDate" type="date" value="${esc(ev.startDate||today())}"></div><div class="field"><label>Al</label><input id="evEndDate" type="date" value="${esc(ev.endDate||'')}"></div></div><div class="row repeat-days">${days.map(([v,l])=>`<label><input type="checkbox" name="evWeekdays" value="${v}" ${checked(v)}> ${l}</label>`).join('')}</div></div><div class="field"><label>Note</label><textarea id="evNotes">${esc(ev.notes||'')}</textarea></div><br><button class="btn primary" onclick="saveEvent()">Salva evento</button>${id?` <button class="btn danger" onclick="deleteEvent('${id}')">Elimina</button>`:''}`);
}
function toggleRepeatFields(){const rep=q('input[name="evRepeat"]:checked')?.value||'none'; byId('singleFields').classList.toggle('hidden',rep==='weekly'); byId('repeatFields').classList.toggle('hidden',rep!=='weekly');}
function saveEvent(){
  const id=byId('evId')?.value||''; const repeat=q('input[name="evRepeat"]:checked')?.value||'none';
  const obj={id:id||uid(),title:byId('evTitle').value||'Evento',type:byId('evType').value,team:byId('evTeam').value,date:repeat==='none'?byId('evDate').value:'',start:byId('evStart').value,end:byId('evEnd').value,location:byId('evLoc').value,notes:byId('evNotes').value,color:byId('evColor').value,repeat,weekdays:repeat==='weekly'?qa('input[name="evWeekdays"]:checked').map(x=>Number(x.value)):[],startDate:repeat==='weekly'?byId('evStartDate').value:'',endDate:repeat==='weekly'?byId('evEndDate').value:''};
  if(repeat==='weekly' && !obj.weekdays.length){alert('Seleziona almeno un giorno della settimana.');return;}
  if(repeat==='weekly' && (!obj.startDate || !obj.endDate)){alert('Inserisci data inizio e data fine del periodo.');return;}
  const i=(state.calendarEvents||[]).findIndex(x=>x.id===id); if(i>=0) state.calendarEvents[i]=obj; else state.calendarEvents.push(obj); save();closeModal();renderAll();
}
function deleteEvent(id){if(confirm('Eliminare evento?')){state.calendarEvents=state.calendarEvents.filter(x=>x.id!==id);save();closeModal();renderAll();}}
function deleteCallup(id){if(confirm('Eliminare convocazione?')){state.callups=state.callups.filter(x=>x.id!==id);save();closeModal();renderAll();}}
function openCalendarItem(source,id,date){
  if(source==='event'){
    const e=(state.calendarEvents||[]).find(x=>x.id===id); if(!e)return;
    const rep=(e.repeat||'none')==='weekly'?`<p><b>Periodo:</b> ${fmtDate(e.startDate)} - ${fmtDate(e.endDate)}<br><b>Giorni:</b> ${(e.weekdays||[]).map(n=>['','Lun','Mar','Mer','Gio','Ven','Sab','Dom'][n]).join(', ')}</p>`:`<p><b>Data:</b> ${fmtDate(e.date||date)}</p>`;
    openModal(`<h2>${esc(e.title)}</h2><p><b>Tipo:</b> ${esc(e.type)} | <b>Squadra:</b> ${esc(e.team||'')}</p><p><b>Orario:</b> ${esc(e.start||'')} ${e.end?'- '+esc(e.end):''}</p>${rep}<p><b>Luogo:</b> ${esc(e.location||'')}</p>${e.address?`<p><b>Indirizzo:</b> ${esc(e.address)}</p>`:''}<p><b>Note:</b><br>${esc(e.notes||'')}</p>${staffMode?`<button class="btn primary" onclick="openEventForm('${id}')">Modifica</button> <button class="btn danger" onclick="deleteEvent('${id}')">Elimina</button>`:''}`);
    return;
  }
  if(source==='training'){
    const t=state.trainings.find(x=>x.id===id); if(!t)return;
    openModal(`<h2>Allenamento ${esc(t.team)}</h2><p><b>Data:</b> ${fmtDate(t.date)}</p><p><b>Orario:</b> ${esc(t.start||'')} ${t.end?'- '+esc(t.end):''}</p><p><b>Luogo:</b> ${esc(t.location||'')}</p><p><b>Note:</b><br>${esc(t.notes||'')}</p>${staffMode?`<button class="btn primary" onclick="openTrainingForm('${id}')">Modifica</button> <button class="btn secondary" onclick="openAttendance('${id}')">Presenze</button> <button class="btn danger" onclick="delTraining('${id}'); closeModal();">Elimina</button>`:''}`);
    return;
  }
  if(source==='match'){
    const m=state.matches.find(x=>x.id===id); if(!m)return;
    openModal(`<h2>${esc(m.team)} vs ${esc(m.opponent)}</h2><p><b>Competizione:</b> ${esc(m.competition||'')}</p><p><b>Data:</b> ${fmtDate(m.date)}</p><p><b>Ritrovo:</b> ${esc(m.meetingTime||'')} - ${esc(m.meetingPlace||'')}</p><p><b>Gara:</b> ${esc(m.matchTime||'')}</p><p><b>Campo:</b> ${esc(m.fieldName||'')}<br>${esc(m.fieldAddress||'')}</p><p><b>Divisa:</b> ${esc(m.kitColor||'')}</p><p><b>Note:</b><br>${esc(m.notes||'')}</p>${staffMode?`<button class="btn primary" onclick="openMatchForm('${id}')">Modifica</button> <button class="btn secondary" onclick="openCallupForm('${id}')">Convoca</button> <button class="btn danger" onclick="delMatch('${id}'); closeModal();">Elimina</button>`:''}`);
    return;
  }
  if(source==='callup'){
    const c=state.callups.find(x=>x.id===id); if(!c)return;
    const m=state.matches.find(x=>x.id===c.matchId);
    const names=(c.playerIds||[]).map(pid=>state.players.find(p=>p.id===pid)).filter(Boolean).map(p=>`<li>${esc(p.lastName.toUpperCase())} ${esc(p.firstName.toUpperCase())}</li>`).join('');
    openModal(`<h2>${esc(c.title||'Convocazione')}</h2>${m?`<p><b>Partita:</b> ${esc(m.team)} vs ${esc(m.opponent)}</p><p><b>Data:</b> ${fmtDate(m.date)} | <b>Ritrovo:</b> ${esc(m.meetingTime||'')}</p><p><b>Campo:</b> ${esc(m.fieldName||m.meetingPlace||'')}</p>`:''}<h3>Convocati</h3><ol>${names||'<li>Nessun convocato</li>'}</ol><p><b>Note:</b><br>${esc(c.notes||'')}</p>${staffMode?`<button class="btn primary" onclick="openCallupForm('${c.matchId}')">Modifica convocazione</button> <button class="btn danger" onclick="deleteCallup('${id}')">Elimina convocazione</button>`:''}`);
  }
}


function renderPlayers(){
  const rows=state.players.map(p=>`<tr><td><b>${esc(p.lastName)} ${esc(p.firstName)}</b><br>${(p.teams||[]).map(t=>`<span class="pill ${p.teams.length>1?'warn':''}">${esc(t)}</span>`).join('')}</td><td>${(p.roles||[]).map(r=>`<span class="pill">${esc(r)}</span>`).join('')}</td><td>${esc(p.foot||'')}</td><td>${esc(p.number||'')}</td><td>${esc(p.status||'')}</td><td><button class="btn secondary" onclick="openPlayerForm('${p.id}')">Modifica</button> <button class="btn danger" onclick="deletePlayer('${p.id}')">Elimina</button></td></tr>`).join('');
  byId('players').innerHTML=`<div class="card"><h2>Giocatori</h2><div class="row"><button class="btn primary" onclick="openPlayerForm()">Nuovo giocatore</button><button class="btn secondary" onclick="downloadPlayersTemplate()">Scarica modello CSV</button><label class="btn secondary">Importa CSV/Excel<input type="file" accept=".csv,.txt,.xlsx" class="hidden" onchange="importPlayersFile(event)"></label></div><br><div class="table-wrap"><table class="table"><thead><tr><th>Giocatore</th><th>Ruoli</th><th>Piede</th><th>N°</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Nessun giocatore.</td></tr>'}</tbody></table></div></div>`;
}
function openPlayerForm(id=''){
  const p=state.players.find(x=>x.id===id)||{firstName:'',lastName:'',teams:['CSI'],roles:[],foot:'Destro',number:'',phone:'',email:'',status:'Attivo',notes:''};
  const checks=(arr,val)=>arr?.includes(val)?'checked':'';
  openModal(`<h2>${id?'Modifica':'Nuovo'} giocatore</h2><input id="plId" type="hidden" value="${id}"><div class="row"><div class="field"><label>Nome</label><input id="plFirst" value="${esc(p.firstName)}"></div><div class="field"><label>Cognome</label><input id="plLast" value="${esc(p.lastName)}"></div><div class="field"><label>Numero</label><input id="plNum" value="${esc(p.number)}"></div></div><h3>Squadre</h3><div class="row">${TEAMS.map(t=>`<label><input type="checkbox" name="plTeams" value="${t}" ${checks(p.teams,t)}> ${t}</label>`).join('')}</div><h3>Ruoli futsal</h3><div class="row">${ROLES.map(r=>`<label><input type="checkbox" name="plRoles" value="${r}" ${checks(p.roles,r)}> ${r}</label>`).join('')}</div><div class="row"><div class="field"><label>Piede</label><select id="plFoot"><option ${p.foot==='Destro'?'selected':''}>Destro</option><option ${p.foot==='Mancino'?'selected':''}>Mancino</option><option ${p.foot==='Ambidestro'?'selected':''}>Ambidestro</option></select></div><div class="field"><label>Stato</label><select id="plStatus"><option ${p.status==='Attivo'?'selected':''}>Attivo</option><option ${p.status==='Infortunato'?'selected':''}>Infortunato</option><option ${p.status==='Sospeso'?'selected':''}>Sospeso</option></select></div></div><div class="row"><div class="field"><label>Telefono</label><input id="plPhone" value="${esc(p.phone)}"></div><div class="field"><label>Email</label><input id="plEmail" value="${esc(p.email)}"></div></div><div class="field"><label>Note</label><textarea id="plNotes">${esc(p.notes)}</textarea></div><br><button class="btn primary" onclick="savePlayer()">Salva</button>`);
}
function savePlayer(){
  const id=byId('plId').value; const obj={id:id||uid(),firstName:byId('plFirst').value.trim(),lastName:byId('plLast').value.trim(),number:byId('plNum').value.trim(),teams:qa('input[name="plTeams"]:checked').map(x=>x.value),roles:qa('input[name="plRoles"]:checked').map(x=>x.value),foot:byId('plFoot').value,status:byId('plStatus').value,phone:byId('plPhone').value,email:byId('plEmail').value,notes:byId('plNotes').value};
  if(!obj.firstName||!obj.lastName) return alert('Inserisci nome e cognome.'); if(!obj.teams.length) obj.teams=['CSI'];
  const i=state.players.findIndex(x=>x.id===id); if(i>=0) state.players[i]=obj; else state.players.push(obj); save();closeModal();renderAll();
}
function deletePlayer(id){ if(confirm('Eliminare giocatore?')){state.players=state.players.filter(p=>p.id!==id);save();renderAll();}}
function downloadPlayersTemplate(){downloadText('modello_giocatori_convocaapp.csv','Nome;Cognome;Squadre;Ruoli;Piede;Numero;Telefono;Email;Stato;Note\nAndrea;Verdi;CSI, Serie D;Laterale, Pivot;Mancino;9;;;;Doppio tesserato\n');}
function importPlayersFile(e){ const file=e.target.files[0]; if(!file)return; const r=new FileReader(); r.onload=()=>{parsePlayersCSV(String(r.result));}; r.readAsText(file); }
function parsePlayersCSV(txt){
  const lines=txt.split(/\r?\n/).filter(Boolean); if(lines.length<2) return alert('File vuoto. Usa CSV separato da punto e virgola.');
  const sep=lines[0].includes(';')?';':','; const headers=lines[0].split(sep).map(h=>h.trim().toLowerCase()); let count=0;
  for(const line of lines.slice(1)){const c=line.split(sep).map(x=>x.trim()); const get=n=>c[headers.indexOf(n)]||''; const first=get('nome'), last=get('cognome'); if(!first||!last) continue; const teams=(get('squadre')||get('squadra')||'CSI').split(',').map(x=>x.trim()).filter(Boolean); const roles=(get('ruoli')||get('ruolo')||'').split(',').map(x=>x.trim()).filter(Boolean); const existing=state.players.find(p=>p.firstName.toLowerCase()===first.toLowerCase()&&p.lastName.toLowerCase()===last.toLowerCase()); const obj={id:existing?.id||uid(),firstName:first,lastName:last,teams,roles,foot:get('piede')||'Destro',number:get('numero'),phone:get('telefono'),email:get('email'),status:get('stato')||'Attivo',notes:get('note')}; if(existing) Object.assign(existing,obj); else state.players.push(obj); count++;}
  save();renderAll();alert(`Importati/aggiornati ${count} giocatori. Nota: per .xlsx vero conviene salvare da Excel in CSV.`);
}

function renderTrainings(){
  const rows=state.trainings.map(t=>`<tr><td>${fmtDate(t.date)} ${esc(t.start||'')}</td><td>${esc(t.team)}</td><td>${esc(t.location||'')}</td><td><button class="btn secondary" onclick="openAttendance('${t.id}')">Presenze</button> <button class="btn danger" onclick="delTraining('${t.id}')">Elimina</button></td></tr>`).join('');
  byId('trainings').innerHTML=`<div class="card"><h2>Allenamenti e presenze</h2><button class="btn primary" onclick="openTrainingForm()">Nuovo allenamento</button><br><br><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Squadra</th><th>Luogo</th><th>Azioni</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Nessun allenamento.</td></tr>'}</tbody></table></div></div>`;
}
function openTrainingForm(id=''){
  const t=state.trainings.find(x=>x.id===id)||{team:'CSI',date:today(),start:'',end:'',location:'',notes:''};
  openModal(`<h2>${id?'Modifica':'Nuovo'} allenamento</h2><input id="trId" type="hidden" value="${esc(id)}"><div class="row"><div class="field"><label>Squadra</label><select id="trTeam"><option ${t.team==='CSI'?'selected':''}>CSI</option><option ${t.team==='Serie D'?'selected':''}>Serie D</option></select></div><div class="field"><label>Data</label><input id="trDate" type="date" value="${esc(t.date||today())}"></div><div class="field"><label>Ora inizio</label><input id="trStart" type="time" value="${esc(t.start||'')}"></div><div class="field"><label>Ora fine</label><input id="trEnd" type="time" value="${esc(t.end||'')}"></div></div><div class="field"><label>Luogo</label><input id="trLoc" value="${esc(t.location||'')}"></div><div class="field"><label>Note</label><textarea id="trNotes">${esc(t.notes||'')}</textarea></div><br><button class="btn primary" onclick="saveTraining()">Salva</button>${id?` <button class="btn danger" onclick="delTraining('${id}'); closeModal();">Elimina</button>`:''}`)
}
function saveTraining(){const id=byId('trId')?.value||''; const obj={id:id||uid(),team:byId('trTeam').value,date:byId('trDate').value,start:byId('trStart').value,end:byId('trEnd').value,location:byId('trLoc').value,notes:byId('trNotes').value}; const i=state.trainings.findIndex(x=>x.id===id); if(i>=0) state.trainings[i]=obj; else state.trainings.push(obj); save();closeModal();renderAll();}
function delTraining(id){if(confirm('Eliminare allenamento?')){state.trainings=state.trainings.filter(x=>x.id!==id);save();renderAll();}}
function openAttendance(id){ const t=state.trainings.find(x=>x.id===id); const players=state.players.filter(p=>(p.teams||[]).includes(t.team)); const rows=players.map(p=>{const a=state.attendance.find(x=>x.trainingId===id&&x.playerId===p.id); return `<tr><td>${esc(p.lastName)} ${esc(p.firstName)}</td><td><select data-player="${p.id}"><option ${a?.status==='Presente'?'selected':''}>Presente</option><option ${a?.status==='Assente giustificato'?'selected':''}>Assente giustificato</option><option ${a?.status==='Assente non giustificato'?'selected':''}>Assente non giustificato</option><option ${a?.status==='Ritardo'?'selected':''}>Ritardo</option><option ${a?.status==='Infortunato'?'selected':''}>Infortunato</option></select></td></tr>`}).join(''); openModal(`<h2>Presenze - ${esc(t.team)} ${fmtDate(t.date)}</h2><table class="table"><tbody>${rows}</tbody></table><br><button class="btn primary" onclick="saveAttendance('${id}')">Salva presenze</button>`); }
function saveAttendance(trainingId){ qa('select[data-player]').forEach(s=>{const pid=s.dataset.player; const i=state.attendance.findIndex(x=>x.trainingId===trainingId&&x.playerId===pid); const obj={id:i>=0?state.attendance[i].id:uid(),trainingId,playerId:pid,status:s.value}; if(i>=0) state.attendance[i]=obj; else state.attendance.push(obj);}); save();closeModal();renderAll();}

function renderMatches(){
  const rows=state.matches.map(m=>`<tr><td>${fmtDate(m.date)} ${esc(m.matchTime||'')}</td><td>${esc(m.team)}</td><td>${esc(m.opponent)}</td><td>${esc(m.competition||'')}</td><td><button class="btn secondary" onclick="openCallupForm('${m.id}')">Convoca</button> <button class="btn secondary" onclick="openMatchStats('${m.id}')">Stats</button> <button class="btn danger" onclick="delMatch('${m.id}')">Elimina</button></td></tr>`).join('');
  byId('matches').innerHTML=`<div class="card"><h2>Partite</h2><button class="btn primary" onclick="openMatchForm()">Nuova partita</button><br><br><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Squadra</th><th>Avversario</th><th>Competizione</th><th>Azioni</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Nessuna partita.</td></tr>'}</tbody></table></div></div>`;
}
function openMatchForm(id=''){
  const m=state.matches.find(x=>x.id===id)||{team:'CSI',opponent:'',competition:'Campionato',date:today(),meetingTime:'',matchTime:'',meetingPlace:'',fieldName:'',fieldAddress:'',kitColor:'',notes:''};
  openModal(`<h2>${id?'Modifica':'Nuova'} partita</h2><input id="maId" type="hidden" value="${esc(id)}"><div class="row"><div class="field"><label>Squadra</label><select id="maTeam"><option ${m.team==='CSI'?'selected':''}>CSI</option><option ${m.team==='Serie D'?'selected':''}>Serie D</option></select></div><div class="field"><label>Avversario</label><input id="maOpp" value="${esc(m.opponent||'')}"></div><div class="field"><label>Competizione</label><input id="maComp" value="${esc(m.competition||'Campionato')}"></div></div><div class="row"><div class="field"><label>Data</label><input id="maDate" type="date" value="${esc(m.date||today())}"></div><div class="field"><label>Ora ritrovo</label><input id="maMeeting" type="time" value="${esc(m.meetingTime||'')}"></div><div class="field"><label>Ora gara</label><input id="maTime" type="time" value="${esc(m.matchTime||'')}"></div></div><div class="row"><div class="field"><label>Luogo ritrovo</label><input id="maMeetPlace" value="${esc(m.meetingPlace||'')}"></div><div class="field"><label>Campo gara</label><input id="maField" value="${esc(m.fieldName||'')}"></div></div><div class="field"><label>Indirizzo campo</label><input id="maAddress" value="${esc(m.fieldAddress||'')}"></div><div class="field"><label>Divisa</label><input id="maKit" value="${esc(m.kitColor||'')}"></div><div class="field"><label>Note</label><textarea id="maNotes">${esc(m.notes||'')}</textarea></div><br><button class="btn primary" onclick="saveMatch()">Salva partita</button>${id?` <button class="btn danger" onclick="delMatch('${id}'); closeModal();">Elimina</button>`:''}`)
}
function saveMatch(){state.matches.push({id:uid(),team:byId('maTeam').value,opponent:byId('maOpp').value||'Avversario',competition:byId('maComp').value,date:byId('maDate').value,meetingTime:byId('maMeeting').value,matchTime:byId('maTime').value,meetingPlace:byId('maMeetPlace').value,fieldName:byId('maField').value,fieldAddress:byId('maAddress').value,kitColor:byId('maKit').value,notes:byId('maNotes').value});save();closeModal();renderAll();}
function delMatch(id){if(confirm('Eliminare partita?')){state.matches=state.matches.filter(x=>x.id!==id);state.callups=state.callups.filter(x=>x.matchId!==id);save();renderAll();}}
function openCallupForm(matchId){ const m=state.matches.find(x=>x.id===matchId); const players=state.players.filter(p=>(p.teams||[]).includes(m.team)); const old=state.callups.find(c=>c.matchId===matchId); const checks=players.map(p=>`<label class="pill"><input type="checkbox" name="callPlayers" value="${p.id}" ${old?.playerIds?.includes(p.id)?'checked':''}> ${esc(p.lastName)} ${esc(p.firstName)} (${(p.roles||[]).join('/')})</label>`).join(''); openModal(`<h2>Convocazione - ${esc(m.team)} vs ${esc(m.opponent)}</h2><div class="row">${checks}</div><div class="field"><label>Note convocazione</label><textarea id="callNotes">${esc(old?.notes||'')}</textarea></div><br><button class="btn primary" onclick="saveCallup('${matchId}')">Salva convocazione</button>`); }
function saveCallup(matchId){ const ids=qa('input[name="callPlayers"]:checked').map(x=>x.value); let c=state.callups.find(x=>x.matchId===matchId); if(!c){c={id:uid(),matchId,title:'Convocazione',playerIds:[],notes:''};state.callups.push(c);} c.playerIds=ids;c.notes=byId('callNotes').value; save();closeModal();showView('callups');}
function renderCallups(){
  ensureV10State();
  const existingRows=state.callups.map(c=>{const m=state.matches.find(x=>x.id===c.matchId); if(!m)return''; return `<tr><td>${fmtDate(m.date)} ${esc(m.meetingTime||'')}</td><td>${esc(m.team)}</td><td>${esc(m.opponent)}</td><td>${c.playerIds?.length||0}</td><td><button class="btn primary" onclick="printCallup('${c.id}')">PDF/Stampa</button>${staffMode?` <button class="btn secondary" onclick="openCallupForm('${m.id}')">Modifica</button>`:''}</td></tr>`}).join('');
  let pendingRows='';
  if(staffMode){
    const callupMatchIds=new Set(state.callups.map(c=>c.matchId));
    const structured=state.matches.filter(m=>m.date>=today() && !callupMatchIds.has(m.id)).sort((a,b)=>(a.date+a.matchTime).localeCompare(b.date+b.matchTime)).map(m=>`<tr><td>${fmtDate(m.date)} ${esc(m.meetingTime||m.matchTime||'')}</td><td>${esc(m.team)}</td><td>${esc(m.opponent)}</td><td><span class="pill warn">Da creare</span></td><td><button class="btn secondary" onclick="openCallupForm('${m.id}')">Crea convocazione</button></td></tr>`).join('');
    const eventMatches=getEventsForRange(today(), addDays(today(),60), e=>e.source==='event' && e.type==='Partita').filter(e=>!state.matches.some(m=>m.calendarEventKey===calendarMatchKey(e.id,e.occurrenceDate))).map(e=>`<tr><td>${fmtDate(e.occurrenceDate)} ${esc(e.time||'')}</td><td>${esc(e.team||'')}</td><td>${esc(parseOpponentFromTitle(e.title,e.team))}</td><td><span class="pill warn">Da calendario</span></td><td><button class="btn secondary" onclick="openCallupFromCalendarEvent('${e.id}','${e.occurrenceDate}')">Crea convocazione</button></td></tr>`).join('');
    pendingRows=structured+eventMatches;
  }
  const rows=existingRows+pendingRows;
  byId('callups').innerHTML=`<div class="card"><h2>Convocazioni</h2><p class="muted">Le partite inserite nel calendario compaiono qui come “Da calendario”: clicca “Crea convocazione” per selezionare i giocatori.</p><div class="table-wrap"><table class="table"><thead><tr><th>Data/Ritrovo</th><th>Squadra</th><th>Avversario</th><th>Convocati/Stato</th><th>Azioni</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Nessuna convocazione.</td></tr>'}</tbody></table></div></div>`;
}
function callupDocumentHtml(id){
  const c=state.callups.find(x=>x.id===id);
  if(!c) return '<p>Convocazione non trovata.</p>';
  const m=state.matches.find(x=>x.id===c.matchId);
  if(!m) return '<p>Partita non trovata.</p>';
  const players=(c.playerIds||[]).map(pid=>state.players.find(p=>p.id===pid)).filter(Boolean);
  const minRows=Math.max(16, players.length + 3);
  const playerRows=[];
  for(let i=0;i<minRows;i++){
    const p=players[i];
    playerRows.push(`<tr><td class="numcol">${p ? i+1 : ''}</td><td>${p ? esc((p.firstName+' '+p.lastName).toUpperCase()) : '&nbsp;'}</td></tr>`);
  }
  const d=new Date(m.date+'T12:00:00');
  const dateTxt=d.toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'}).replace('.', '');
  const title=esc((m.team||'SQUADRA').toUpperCase());
  const competition=esc(m.competition||'Campionato');
  const gara=esc(`${m.team||''} vs ${m.opponent||''}`);
  const campo=[m.fieldName,m.fieldAddress].filter(Boolean).join(' - ');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Convocazione ${title}</title>
  <style>
    @page{size:A4 portrait;margin:14mm 13mm;}
    *{box-sizing:border-box;}
    body{margin:0;background:#fff;color:#000;font-family:"Times New Roman", Times, serif;}
    .sheet{width:100%;max-width:760px;margin:0 auto;padding:8px 0;}
    .club{text-align:center;font-size:45px;line-height:1;font-weight:900;letter-spacing:.5px;margin:8px 0 26px;}
    .sub{text-align:center;font-size:30px;line-height:1.05;margin-bottom:34px;}
    .sub b{text-decoration:underline;font-weight:900;}
    .sub em{font-size:32px;}
    .info{font-size:30px;line-height:1.22;margin:0 0 20px;}
    .info p{margin:0 0 18px;}
    .info b{font-weight:900;}
    .info em{font-style:italic;}
    table{border-collapse:collapse;width:86%;margin:24px auto 0;table-layout:fixed;}
    th,td{border:2px solid #000;text-align:center;vertical-align:middle;}
    th{font-size:30px;font-weight:900;padding:6px 4px;line-height:1;}
    td{font-size:24px;height:36px;padding:3px 4px;line-height:1.05;}
    .numcol{width:70px;}
    .actions{position:fixed;right:14px;top:14px;display:flex;gap:8px;font-family:Arial,sans-serif;}
    .actions button{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;background:#164ac9;color:#fff;}
    .actions button.secondary{background:#e5e7eb;color:#111827;}
    @media print{.actions{display:none!important}.sheet{max-width:none}.club{margin-top:0}}
    @media(max-width:700px){.club{font-size:36px}.sub{font-size:24px}.sub em{font-size:26px}.info{font-size:24px}th{font-size:22px}td{font-size:19px}table{width:100%}}
  </style></head><body><div class="actions"><button onclick="window.print()">Stampa / Salva PDF</button><button class="secondary" onclick="window.close()">Chiudi</button></div><main class="sheet">
    <div class="club">${title}</div>
    <div class="sub"><b>CONVOCAZIONI:</b>&nbsp; <em>${competition}</em></div>
    <section class="info">
      <p><b>PARTITA:</b>&nbsp;&nbsp;&nbsp; <em>${gara}</em></p>
      <p><b>GIORNO:</b> ${esc(dateTxt)} &nbsp;&nbsp;<b>ORA:</b> ${esc(m.matchTime||'')}</p>
      <p><b>ORARIO DI CONVOCAZIONE:</b> <em>${esc(m.meetingTime||'')}</em></p>
      <p><b>CAMPO:</b> ${esc(campo||m.meetingPlace||'')}</p>
    </section>
    <table><thead><tr><th class="numcol">N°</th><th>NOME E COGNOME</th></tr></thead><tbody>${playerRows.join('')}</tbody></table>
  </main></body></html>`;
}
function printCallup(id){
  const html=callupDocumentHtml(id);
  const w=window.open('', '_blank');
  if(!w){
    openModal(`<div class="notice">Il browser ha bloccato l'apertura della finestra di stampa. Consenti i popup per questo sito oppure riprova.</div>`);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(()=>{ try{ w.focus(); w.print(); }catch(e){} }, 400);
}
function openMatchStats(matchId){ const m=state.matches.find(x=>x.id===matchId); const players=state.players.filter(p=>(p.teams||[]).includes(m.team)); const rows=players.map(p=>{const s=state.matchStats.find(x=>x.matchId===matchId&&x.playerId===p.id)||{}; return `<tr><td><label><input type="checkbox" data-played="${p.id}" ${s.played?'checked':''}> ${esc(p.lastName)} ${esc(p.firstName)}</label></td><td><input type="number" min="0" value="${s.goals||0}" data-goals="${p.id}" style="width:70px"></td><td><input type="number" min="0" value="${s.assists||0}" data-assists="${p.id}" style="width:70px"></td></tr>`}).join(''); openModal(`<h2>Statistiche partita - ${esc(m.team)} vs ${esc(m.opponent)}</h2><table class="table"><thead><tr><th>Giocatore</th><th>Gol</th><th>Assist</th></tr></thead><tbody>${rows}</tbody></table><br><button class="btn primary" onclick="saveMatchStats('${matchId}')">Salva statistiche</button>`); }
function saveMatchStats(matchId){ qa('[data-played]').forEach(ch=>{const pid=ch.dataset.played; const i=state.matchStats.findIndex(x=>x.matchId===matchId&&x.playerId===pid); const obj={id:i>=0?state.matchStats[i].id:uid(),matchId,playerId:pid,played:ch.checked,goals:Number(q(`[data-goals="${pid}"]`).value||0),assists:Number(q(`[data-assists="${pid}"]`).value||0)}; if(i>=0) state.matchStats[i]=obj; else state.matchStats.push(obj);}); save();closeModal();renderAll();}

function renderStats(){
  const rows=state.players.map(p=>{const ms=state.matchStats.filter(s=>s.playerId===p.id); const played=ms.filter(s=>s.played).length; const goals=ms.reduce((a,s)=>a+Number(s.goals||0),0); const assists=ms.reduce((a,s)=>a+Number(s.assists||0),0); const att=state.attendance.filter(a=>a.playerId===p.id); const pres=att.filter(a=>a.status==='Presente').length; const abs=att.filter(a=>a.status?.startsWith('Assente')).length; return `<tr><td><b>${esc(p.lastName)} ${esc(p.firstName)}</b><br>${(p.teams||[]).map(t=>`<span class="pill">${t}</span>`).join('')}</td><td>${played}</td><td>${goals}</td><td>${assists}</td><td>${pres}</td><td>${abs}</td></tr>`}).join('');
  byId('stats').innerHTML=`<div class="card"><h2>Statistiche individuali</h2><div class="table-wrap"><table class="table"><thead><tr><th>Giocatore</th><th>Partite</th><th>Gol</th><th>Assist</th><th>Presenze all.</th><th>Assenze</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function renderSponsors(){
  const rows=state.sponsors.map(s=>{const spent=state.sponsorExpenses.filter(e=>e.sponsorId===s.id).reduce((a,e)=>a+Number(e.amount||0),0); return `<tr><td><b>${esc(s.name)}</b><br>${esc(s.type||'')}</td><td>${money(s.amountPaid)}</td><td>${fmtDate(s.paymentDate)}</td><td>${money(spent)}</td><td><button class="btn secondary" onclick="openExpenseForm('${s.id}')">Aggiungi spesa</button> <button class="btn danger" onclick="delSponsor('${s.id}')">Elimina</button></td></tr>`}).join('');
  byId('sponsors').innerHTML=`<div class="card"><h2>Sponsor e rendicontazione</h2><button class="btn primary" onclick="openSponsorForm()">Nuovo sponsor</button><br><br><div class="table-wrap"><table class="table"><thead><tr><th>Sponsor</th><th>Versato</th><th>Data</th><th>Speso da noi</th><th>Azioni</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Nessuno sponsor.</td></tr>'}</tbody></table></div></div>`;
}
function openSponsorForm(){openModal(`<h2>Nuovo sponsor</h2><div class="row"><div class="field"><label>Nome</label><input id="spName"></div><div class="field"><label>Tipo</label><select id="spType"><option>Ristorante</option><option>Bar</option><option>Azienda</option><option>Altro</option></select></div><div class="field"><label>Importo versato</label><input id="spAmount" type="number" step="0.01"></div><div class="field"><label>Data versamento</label><input id="spDate" type="date" value="${today()}"></div></div><div class="field"><label>Note</label><textarea id="spNotes"></textarea></div><br><button class="btn primary" onclick="saveSponsor()">Salva sponsor</button>`)}
function saveSponsor(){state.sponsors.push({id:uid(),name:byId('spName').value||'Sponsor',type:byId('spType').value,amountPaid:Number(byId('spAmount').value||0),paymentDate:byId('spDate').value,notes:byId('spNotes').value});save();closeModal();renderAll();}
function delSponsor(id){if(confirm('Eliminare sponsor?')){state.sponsors=state.sponsors.filter(s=>s.id!==id);state.sponsorExpenses=state.sponsorExpenses.filter(e=>e.sponsorId!==id);save();renderAll();}}
function openExpenseForm(sponsorId){const s=state.sponsors.find(x=>x.id===sponsorId); openModal(`<h2>Spesa presso ${esc(s.name)}</h2><div class="row"><div class="field"><label>Data</label><input id="exDate" type="date" value="${today()}"></div><div class="field"><label>Descrizione</label><input id="exDesc" value="Cena / aperitivo"></div><div class="field"><label>Importo</label><input id="exAmount" type="number" step="0.01"></div></div><div class="field"><label>Note</label><textarea id="exNotes"></textarea></div><br><button class="btn primary" onclick="saveExpense('${sponsorId}')">Salva spesa</button>`)}
function saveExpense(sponsorId){state.sponsorExpenses.push({id:uid(),sponsorId,date:byId('exDate').value,description:byId('exDesc').value,amount:Number(byId('exAmount').value||0),notes:byId('exNotes').value});save();closeModal();renderAll();}

function renderBackup(){byId('backup').innerHTML=`<div class="card"><h2>Backup dati</h2><p class="muted">Questa versione salva nel browser per test immediato. Esporta spesso il JSON. Quando colleghiamo Supabase, i dati saranno condivisi online.</p><div class="row"><button class="btn primary" onclick="exportJson()">Esporta JSON</button><label class="btn secondary">Importa JSON<input type="file" accept=".json" class="hidden" onchange="importJson(event)"></label><button class="btn danger" onclick="resetDemo()">Reset demo</button></div></div>`;}
function exportJson(){downloadText('convocaapp-backup.json',JSON.stringify(state,null,2));}
function importJson(e){const file=e.target.files[0]; if(!file)return; const r=new FileReader(); r.onload=()=>{try{state=JSON.parse(r.result);save();renderAll();alert('Backup importato.')}catch(err){alert('JSON non valido')}}; r.readAsText(file);}
function resetDemo(){if(confirm('Cancellare dati locali e ripristinare demo?')){state=seedData();save();renderAll();}}
function downloadText(filename,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}


/* ==========================
   v12 overrides: calendario come fonte unica, settimana corrente, eccezioni eventi periodici, stats disciplinari
   ========================== */
function ensureV10State(){
  state.calendarEvents = state.calendarEvents || [];
  state.eventOverrides = state.eventOverrides || [];
  state.trainings = state.trainings || [];
  state.matches = state.matches || [];
  state.matchStats = state.matchStats || [];
  state.players = state.players || [];
}
function addDays(dateStr, n){ const d=new Date(dateStr+'T12:00:00'); d.setDate(d.getDate()+n); return isoDate(d); }
function startOfWeek(dateStr=today()){ const d=new Date(dateStr+'T12:00:00'); const off=(d.getDay()+6)%7; d.setDate(d.getDate()-off); return isoDate(d); }
function endOfWeek(dateStr=today()){ return addDays(startOfWeek(dateStr),6); }
function betweenDates(a,b){ const out=[]; for(let d=a; d<=b; d=addDays(d,1)) out.push(d); return out; }
function eventDateOf(e){ return e.date || e.occurrenceDate || ''; }
function getOverride(parentId,date){ return (state.eventOverrides||[]).find(o=>o.parentId===parentId && o.date===date); }
function eventDisplayTitle(e){ return e.type==='Allenamento' && !/^allenamento/i.test(e.title||'') ? `Allenamento ${e.team||''}`.trim() : (e.title||'Evento'); }

function getEventsForDate(date){
  ensureV10State();
  const arr=[];
  state.trainings.filter(x=>x.date===date).forEach(x=>arr.push({id:x.id,source:'training',type:'Allenamento',team:x.team,title:`Allenamento ${x.team}`,time:x.start,end:x.end,cls:'training',color:'#e0f2fe',location:x.location,notes:x.notes,occurrenceDate:date}));
  state.matches.filter(x=>x.date===date).forEach(x=>arr.push({id:x.id,source:'match',type:'Partita',team:x.team,title:`${x.team} vs ${x.opponent}`,time:x.matchTime,end:'',cls:'match',color:'#dcfce7',location:x.fieldName || x.meetingPlace,notes:x.notes,occurrenceDate:date}));
  state.callups.forEach(c=>{const mt=state.matches.find(m=>m.id===c.matchId); if(mt?.date===date) arr.push({id:c.id,source:'callup',type:'Convocazione',team:mt.team,title:`Convocazione ${mt.team}`,time:mt.meetingTime,end:'',cls:'callup',color:'#fef3c7',location:mt.meetingPlace || mt.fieldName,notes:c.notes || mt.notes,occurrenceDate:date});});
  (state.calendarEvents||[]).forEach(x=>{
    const repeat=x.repeat||'none';
    const single = repeat==='none' && x.date===date;
    const weekly = repeat==='weekly' && dateInRange(date,x.startDate,x.endDate) && (x.weekdays||[]).map(Number).includes(dayIndexMon(date));
    if(!single && !weekly) return;
    const ov = weekly ? getOverride(x.id,date) : null;
    if(ov?.action==='cancel') return;
    const merged = ov?.action==='modify' ? {...x, ...ov, id:x.id, parentId:x.id} : x;
    arr.push({id:x.id,source:'event',type:merged.type,title:eventDisplayTitle(merged),team:merged.team,time:merged.start,end:merged.end,cls:merged.type==='Sponsor'?'sponsor':(merged.type==='Allenamento'?'training':(merged.type==='Partita'?'match':'extra')),color:merged.color,location:merged.location,notes:merged.notes,raw:x,override:ov,occurrenceDate:date});
  });
  return arr.sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
}
function getEventsForRange(start,end,filterFn=()=>true){ return betweenDates(start,end).flatMap(d=>getEventsForDate(d).filter(filterFn).map(e=>({...e, occurrenceDate:d}))); }
function weekLabel(){ return `${fmtDate(startOfWeek())} - ${fmtDate(endOfWeek())}`; }
function eventRow(e, actions=''){
  return `<tr><td>${fmtDate(e.occurrenceDate)} ${esc(e.time||'')}</td><td>${esc(e.team||'')}</td><td><b>${esc(e.title)}</b><br><span class="muted">${esc(e.type||'')}</span></td><td>${esc(e.location||'')}</td><td>${actions || `<button class="btn secondary" onclick="openCalendarItem('${esc(e.source)}','${esc(e.id)}','${esc(e.occurrenceDate)}')">Dettagli</button>`}</td></tr>`;
}


function getEventOccurrence(eventId,date){
  const e=(state.calendarEvents||[]).find(x=>x.id===eventId); if(!e) return null;
  const ov=getOverride(eventId,date);
  if(ov?.action==='cancel') return null;
  return ov?.action==='modify'?{...e,...ov,id:e.id,parentId:e.id,occurrenceDate:date}: {...e, occurrenceDate:date};
}
function calendarMatchKey(eventId,date){ return `${eventId}__${date}`; }
function parseOpponentFromTitle(title,team){
  const t=cleanText(title||''); if(!t) return 'Avversario';
  const teamLower=String(team||'').toLowerCase();
  if(/\s+vs\s+/i.test(t)){ const parts=t.split(/\s+vs\s+/i).map(cleanText); return parts.find(x=>x.toLowerCase()!==teamLower) || parts[1] || parts[0] || 'Avversario'; }
  if(/\s+-\s+/.test(t)){ const parts=t.split(/\s+-\s+/).map(cleanText); return parts.find(x=>x.toLowerCase()!==teamLower) || parts[1] || parts[0] || 'Avversario'; }
  return t.replace(/^partita\s*/i,'') || 'Avversario';
}
function getOrCreateMatchFromCalendarEvent(eventId,date, openAfter=false){
  ensureV10State();
  const key=calendarMatchKey(eventId,date);
  let m=state.matches.find(x=>x.calendarEventKey===key);
  if(m) return m;
  const ev=getEventOccurrence(eventId,date);
  if(!ev){ alert('Evento calendario non trovato.'); return null; }
  if(ev.type!=='Partita'){ alert('La convocazione può essere creata solo per eventi di tipo Partita.'); return null; }
  const team=(ev.team && ev.team!=='Tutte') ? ev.team : 'CSI';
  m={id:uid(), team, opponent:parseOpponentFromTitle(ev.title,team), competition:'Campionato', date, meetingTime:ev.start||'', matchTime:ev.start||'', meetingPlace:ev.location||'', fieldName:ev.location||'', fieldAddress:ev.address||'', kitColor:'', notes:ev.notes||'', calendarEventId:eventId, calendarEventDate:date, calendarEventKey:key};
  state.matches.push(m); save(); if(openAfter) renderAll(); return m;
}
function openCallupFromCalendarEvent(eventId,date){ const m=getOrCreateMatchFromCalendarEvent(eventId,date,true); if(m) openCallupForm(m.id); }
function openStatsFromCalendarEvent(eventId,date){ const m=getOrCreateMatchFromCalendarEvent(eventId,date,true); if(m) openMatchStats(m.id); }


function openDayEventForm(date){
  if(!staffMode) return;
  openEventForm('', false, date);
}

function renderCalendar(){
  ensureV10State();
  const y=calCursor.getFullYear(), m=calCursor.getMonth();
  const first=new Date(y,m,1), last=new Date(y,m+1,0);
  const startOffset=(first.getDay()+6)%7;
  const monthName=calCursor.toLocaleDateString('it-IT',{month:'long',year:'numeric'});
  let days=''; ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].forEach(d=>days+=`<div class="dayname">${d}</div>`);
  for(let i=0;i<startOffset;i++) days+=`<div class="day muted"></div>`;
  for(let d=1;d<=last.getDate();d++){
    const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs=getEventsForDate(date);
    days+=`<div class="day ${staffMode?'day-clickable':''}" onclick="openDayEventForm('${date}')" title="${staffMode?'Clicca nello spazio libero per aggiungere un evento in questa data':''}"><div class="num">${d}${staffMode?'<span class=\"day-plus\">+</span>':''}</div>${evs.map(e=>`<div class="event ${e.cls}"${eventStyle(e.color)} ${eventAttrs(e,date)}>${esc(e.time||'')} ${esc(e.title)}</div>`).join('')}</div>`;
  }
  byId('calendar').innerHTML=`<div class="card"><div class="calendar-head"><button class="btn secondary" onclick="moveMonth(-1)">← Mese</button><h2>${monthName[0].toUpperCase()+monthName.slice(1)}</h2><button class="btn secondary" onclick="moveMonth(1)">Mese →</button></div>${staffMode?`<div class="row no-print"><button class="btn primary" onclick="openEventForm()">Aggiungi evento</button><button class="btn ok" onclick="openEventForm('',true)">Aggiungi evento periodico</button></div><p class="muted no-print">Gli eventi periodici possono avere eccezioni: clicca una singola data e scegli “modifica solo questa data”.</p>`:''}<div class="calendar-grid">${days}</div></div>`;
}

function renderDashboard(){
  ensureV10State();
  const weekStart=startOfWeek(), weekEnd=endOfWeek();
  const weekEvents=getEventsForRange(weekStart,weekEnd).filter(e=>!['callup'].includes(e.source));
  const nextTrain=getEventsForRange(today(), addDays(today(),120), e=>e.type==='Allenamento')[0];
  const nextMatch=getEventsForRange(today(), addDays(today(),365), e=>e.type==='Partita' || e.source==='match')[0];
  const weekRows=weekEvents.map(e=>`<tr><td>${fmtDate(e.occurrenceDate)} ${esc(e.time||'')}</td><td>${esc(e.type||'')}</td><td>${esc(e.title)}</td><td>${esc(e.location||'')}</td></tr>`).join('');
  byId('dashboard').innerHTML=`
    <div class="grid">
      <div class="card span-12"><h2>Dashboard società futsal</h2><p class="notice">Gli appuntamenti vengono letti dal calendario: se inserisci un allenamento periodico, compare automaticamente anche nelle viste Allenamenti e Home.</p></div>
      <div class="card span-3"><h3>Giocatori</h3><div class="kpi">${state.players.length}</div><p class="muted">Anagrafica totale</p></div>
      <div class="card span-3"><h3>Doppi tesserati</h3><div class="kpi">${state.players.filter(p=>(p.teams||[]).length>1).length}</div><p class="muted">CSI + Serie D</p></div>
      <div class="card span-3"><h3>Eventi settimana</h3><div class="kpi">${weekEvents.length}</div><p class="muted">${weekLabel()}</p></div>
      <div class="card span-3"><h3>Sponsor</h3><div class="kpi">${state.sponsors.length}</div><p class="muted">Rendicontazione</p></div>
      <div class="card span-6"><h3>Prossimo allenamento</h3>${nextTrain?`<p><b>${fmtDate(nextTrain.occurrenceDate)} ${esc(nextTrain.time||'')}</b> - ${esc(nextTrain.team||'')}</p><p>${esc(nextTrain.location||'')}</p>`:'<p class="muted">Nessun allenamento futuro.</p>'}</div>
      <div class="card span-6"><h3>Prossima partita</h3>${nextMatch?`<p><b>${fmtDate(nextMatch.occurrenceDate)} ${esc(nextMatch.time||'')}</b> - ${esc(nextMatch.title)}</p><p>${esc(nextMatch.location||'')}</p>`:'<p class="muted">Nessuna partita futura.</p>'}</div>
      <div class="card span-12"><h3>Eventi della settimana corrente</h3><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Tipo</th><th>Evento</th><th>Luogo</th></tr></thead><tbody>${weekRows||'<tr><td colspan="4">Nessun evento questa settimana.</td></tr>'}</tbody></table></div></div>
      <div class="card span-12"><h3>Accesso rapido</h3><div class="row"><button class="btn primary" onclick="showView('calendar')">Apri calendario</button><button class="btn primary" onclick="showView('callups')">Vedi convocazioni</button>${staffMode?`<button class="btn ok" onclick="showView('players')">Gestisci giocatori</button><button class="btn ok" onclick="showView('sponsors')">Gestisci sponsor</button>`:''}</div></div>
    </div>`;
}

function renderTrainings(){
  const evs=getEventsForRange(startOfWeek(),endOfWeek(),e=>e.type==='Allenamento' || e.source==='training');
  const rows=evs.map(e=>{
    const actions = e.source==='training' ? `<button class="btn secondary" onclick="openAttendance('${e.id}')">Presenze</button> <button class="btn secondary" onclick="openCalendarItem('${e.source}','${e.id}','${e.occurrenceDate}')">Dettagli</button>` : `<button class="btn secondary" onclick="openCalendarItem('${e.source}','${e.id}','${e.occurrenceDate}')">Dettagli</button>`;
    return eventRow(e,actions);
  }).join('');
  byId('trainings').innerHTML=`<div class="card"><h2>Allenamenti - settimana corrente</h2><p class="muted">${weekLabel()}. Gli allenamenti periodici inseriti nel calendario compaiono qui automaticamente.</p>${staffMode?`<button class="btn primary" onclick="showView('calendar'); openEventForm('',true)">Nuovo allenamento periodico da calendario</button> <button class="btn secondary" onclick="openTrainingForm()">Nuovo allenamento singolo con presenze</button>`:''}<br><br><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Squadra</th><th>Evento</th><th>Luogo</th><th>Azioni</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Nessun allenamento questa settimana.</td></tr>'}</tbody></table></div></div>`;
}
function renderMatches(){
  const evs=getEventsForRange(startOfWeek(),endOfWeek(),e=>e.type==='Partita' || e.source==='match');
  const rows=evs.map(e=>{
    let actions='';
    if(e.source==='match') actions = `<button class="btn secondary" onclick="openCallupForm('${e.id}')">Convoca</button> <button class="btn secondary" onclick="openMatchStats('${e.id}')">Stats</button> <button class="btn secondary" onclick="openCalendarItem('${e.source}','${e.id}','${e.occurrenceDate}')">Dettagli</button>`;
    else if(e.source==='event' && e.type==='Partita') actions = `<button class="btn secondary" onclick="openCallupFromCalendarEvent('${e.id}','${e.occurrenceDate}')">Convoca</button> <button class="btn secondary" onclick="openStatsFromCalendarEvent('${e.id}','${e.occurrenceDate}')">Stats</button> <button class="btn secondary" onclick="openCalendarItem('${e.source}','${e.id}','${e.occurrenceDate}')">Dettagli</button>`;
    else actions = `<button class="btn secondary" onclick="openCalendarItem('${e.source}','${e.id}','${e.occurrenceDate}')">Dettagli</button>`;
    return eventRow(e,actions);
  }).join('');
  byId('matches').innerHTML=`<div class="card"><h2>Partite - settimana corrente</h2><p class="muted">${weekLabel()}. Le partite inserite nel calendario compaiono qui automaticamente e puoi creare la convocazione direttamente da qui.</p>${staffMode?`<button class="btn primary" onclick="openMatchForm()">Nuova partita strutturata</button> <button class="btn secondary" onclick="showView('calendar'); openEventForm()">Nuova partita/evento calendario</button>`:''}<br><br><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Squadra</th><th>Evento</th><th>Luogo</th><th>Azioni</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Nessuna partita questa settimana.</td></tr>'}</tbody></table></div></div>`;
}

function openCalendarItem(source,id,date){
  if(source==='event'){
    const e=(state.calendarEvents||[]).find(x=>x.id===id); if(!e)return;
    const ov=getOverride(id,date);
    const current=ov?.action==='modify'?{...e,...ov,id:e.id}:e;
    const recurring=(e.repeat||'none')==='weekly';
    const rep=recurring?`<p><b>Evento periodico:</b> ${fmtDate(e.startDate)} - ${fmtDate(e.endDate)}<br><b>Giorni:</b> ${(e.weekdays||[]).map(n=>['','Lun','Mar','Mer','Gio','Ven','Sab','Dom'][n]).join(', ')}</p><p class="notice">Stai consultando la singola data <b>${fmtDate(date)}</b>. Le modifiche a questa data non cambiano il resto della serie.</p>`:`<p><b>Data:</b> ${fmtDate(e.date||date)}</p>`;
    const callBtns = current.type==='Partita' ? `<button class="btn secondary" onclick="openCallupFromCalendarEvent('${id}','${date}')">Crea/Modifica convocazione</button> <button class="btn secondary" onclick="openStatsFromCalendarEvent('${id}','${date}')">Stats partita</button>` : '';
    openModal(`<h2>${esc(current.title)}</h2><p><b>Tipo:</b> ${esc(current.type)} | <b>Squadra:</b> ${esc(current.team||'')}</p><p><b>Orario:</b> ${esc(current.start||'')} ${current.end?'- '+esc(current.end):''}</p>${rep}<p><b>Luogo:</b> ${esc(current.location||'')}</p>${current.address?`<p><b>Indirizzo:</b> ${esc(current.address)}</p>`:''}<p><b>Note:</b><br>${esc(current.notes||'')}</p>${staffMode?(recurring?`<div class="row">${callBtns}<button class="btn primary" onclick="openEventOccurrenceForm('${id}','${date}')">Modifica solo questa data</button><button class="btn danger" onclick="cancelEventOccurrence('${id}','${date}')">Elimina solo questa data</button><button class="btn secondary" onclick="openEventForm('${id}')">Modifica intera serie</button><button class="btn danger" onclick="deleteEvent('${id}')">Elimina intera serie</button></div>`:`<div class="row">${callBtns}<button class="btn primary" onclick="openEventForm('${id}')">Modifica</button> <button class="btn danger" onclick="deleteEvent('${id}')">Elimina</button></div>`):''}`); return;
  }
  if(source==='training'){
    const t=state.trainings.find(x=>x.id===id); if(!t)return;
    openModal(`<h2>Allenamento ${esc(t.team)}</h2><p><b>Data:</b> ${fmtDate(t.date)}</p><p><b>Orario:</b> ${esc(t.start||'')} ${t.end?'- '+esc(t.end):''}</p><p><b>Luogo:</b> ${esc(t.location||'')}</p><p><b>Note:</b><br>${esc(t.notes||'')}</p>${staffMode?`<button class="btn primary" onclick="openTrainingForm('${id}')">Modifica</button> <button class="btn danger" onclick="delTraining('${id}'); closeModal();">Elimina</button>`:''}`); return;
  }
  if(source==='match'){
    const m=state.matches.find(x=>x.id===id); if(!m)return;
    openModal(`<h2>${esc(m.team)} vs ${esc(m.opponent)}</h2><p><b>Competizione:</b> ${esc(m.competition||'')}</p><p><b>Data:</b> ${fmtDate(m.date)} | <b>Ritrovo:</b> ${esc(m.meetingTime||'')} | <b>Gara:</b> ${esc(m.matchTime||'')}</p><p><b>Campo:</b> ${esc(m.fieldName||m.meetingPlace||'')}<br>${esc(m.fieldAddress||'')}</p><p><b>Note:</b><br>${esc(m.notes||'')}</p>${staffMode?`<button class="btn primary" onclick="openMatchForm('${id}')">Modifica</button> <button class="btn secondary" onclick="openCallupForm('${id}')">Convoca</button> <button class="btn danger" onclick="delMatch('${id}'); closeModal();">Elimina</button>`:''}`); return;
  }
  if(source==='callup'){
    const c=state.callups.find(x=>x.id===id); const m=state.matches.find(x=>x.id===c?.matchId); if(!c||!m)return;
    openModal(`<h2>Convocazione ${esc(m.team)}</h2><p><b>Gara:</b> ${esc(m.team)} vs ${esc(m.opponent)}</p><p><b>Ritrovo:</b> ${fmtDate(m.date)} ${esc(m.meetingTime||'')}</p><p><b>Luogo:</b> ${esc(m.meetingPlace||m.fieldName||'')}</p><p><b>Note:</b><br>${esc(c.notes||m.notes||'')}</p><button class="btn primary" onclick="printCallup('${id}')">PDF/Stampa</button>${staffMode?` <button class="btn secondary" onclick="openCallupForm('${m.id}')">Modifica</button> <button class="btn danger" onclick="deleteCallup('${id}')">Elimina</button>`:''}`);
  }
}
function openEventOccurrenceForm(parentId,date){
  const e=(state.calendarEvents||[]).find(x=>x.id===parentId); if(!e)return;
  const ov=getOverride(parentId,date);
  const cur=ov?.action==='modify'?{...e,...ov}:e;
  openModal(`<h2>Modifica solo ${fmtDate(date)}</h2><p class="notice">Questa è un'eccezione: non modifica gli allenamenti/partite precedenti o futuri della serie.</p><input id="ovParent" type="hidden" value="${esc(parentId)}"><input id="ovDate" type="hidden" value="${esc(date)}"><div class="row"><div class="field"><label>Titolo</label><input id="ovTitle" value="${esc(cur.title||'')}"></div><div class="field"><label>Tipo</label><select id="ovType"><option ${cur.type==='Allenamento'?'selected':''}>Allenamento</option><option ${cur.type==='Partita'?'selected':''}>Partita</option><option ${cur.type==='Cena'?'selected':''}>Cena</option><option ${cur.type==='Aperitivo'?'selected':''}>Aperitivo</option><option ${cur.type==='Riunione'?'selected':''}>Riunione</option><option ${cur.type==='Sponsor'?'selected':''}>Sponsor</option><option ${cur.type==='Altro'?'selected':''}>Altro</option></select></div><div class="field"><label>Squadra</label><select id="ovTeam"><option ${cur.team==='Tutte'?'selected':''}>Tutte</option><option ${cur.team==='CSI'?'selected':''}>CSI</option><option ${cur.team==='Serie D'?'selected':''}>Serie D</option></select></div><div class="field"><label>Colore</label><select id="ovColor">${eventColorOptions(cur.color)}</select></div></div><div class="row"><div class="field"><label>Ora inizio</label><input id="ovStart" type="time" value="${esc(cur.start||'')}"></div><div class="field"><label>Ora fine</label><input id="ovEnd" type="time" value="${esc(cur.end||'')}"></div><div class="field"><label>Luogo</label><input id="ovLoc" value="${esc(cur.location||'')}"></div></div><div class="field"><label>Note</label><textarea id="ovNotes">${esc(cur.notes||'')}</textarea></div><br><button class="btn primary" onclick="saveEventOccurrence()">Salva solo questa data</button> <button class="btn danger" onclick="cancelEventOccurrence('${parentId}','${date}')">Elimina solo questa data</button>`);
}
function saveEventOccurrence(){
  ensureV10State();
  const parentId=byId('ovParent').value, date=byId('ovDate').value;
  const obj={id:uid(),parentId,date,action:'modify',title:byId('ovTitle').value||'Evento',type:byId('ovType').value,team:byId('ovTeam').value,start:byId('ovStart').value,end:byId('ovEnd').value,location:byId('ovLoc').value,notes:byId('ovNotes').value,color:byId('ovColor').value};
  state.eventOverrides=(state.eventOverrides||[]).filter(o=>!(o.parentId===parentId&&o.date===date));
  state.eventOverrides.push(obj); save(); closeModal(); renderAll();
}
function cancelEventOccurrence(parentId,date){
  if(!confirm('Eliminare solo questa occorrenza? La serie resterà invariata.')) return;
  ensureV10State();
  state.eventOverrides=(state.eventOverrides||[]).filter(o=>!(o.parentId===parentId&&o.date===date));
  state.eventOverrides.push({id:uid(),parentId,date,action:'cancel'}); save(); closeModal(); renderAll();
}
function deleteEvent(id){ if(confirm('Eliminare l’intera serie/evento? Le eccezioni collegate saranno rimosse.')){state.calendarEvents=state.calendarEvents.filter(x=>x.id!==id);state.eventOverrides=(state.eventOverrides||[]).filter(o=>o.parentId!==id);save();closeModal();renderAll();} }

function playerDiscipline(p){
  const ms=state.matchStats.filter(s=>s.playerId===p.id);
  const yellows=ms.reduce((a,s)=>a+Number(s.yellowCards ?? s.yellow_cards ?? 0),0);
  const reds=ms.reduce((a,s)=>a+Number(s.redCards ?? s.red_cards ?? 0),0);
  const rem=yellows%4;
  let badges='';
  if(p.suspendedNext) badges+=`<span class="pill danger">Squalificato prox gara: ${esc(p.suspensionReason||'da verificare')}</span>`;
  else if(yellows>0 && rem===3) badges+=`<span class="pill warn">Diffidato: 3 gialli</span>`;
  else if(yellows>0 && rem===0) badges+=`<span class="pill danger">4° giallo: squalifica da verificare</span>`;
  if(reds>0) badges+=`<span class="pill danger">Rossi totali: ${reds}</span>`;
  return {yellows, reds, badges};
}
function clearSuspension(pid){ const p=state.players.find(x=>x.id===pid); if(p && confirm('Rimuovere lo stato “squalificato prossima gara” per questo giocatore?')){p.suspendedNext=false;p.suspensionReason='';save();renderAll();} }
function openMatchStats(matchId){
  const m=state.matches.find(x=>x.id===matchId); const players=state.players.filter(p=>(p.teams||[]).includes(m.team));
  const rows=players.map(p=>{const s=state.matchStats.find(x=>x.matchId===matchId&&x.playerId===p.id)||{}; const isGk=(p.roles||[]).includes('Portiere'); return `<tr><td><label><input type="checkbox" data-played="${p.id}" ${s.played?'checked':''}> ${esc(p.lastName)} ${esc(p.firstName)}</label><br>${isGk?'<span class="pill">Portiere</span>':''}</td><td><input type="number" min="0" value="${s.goals||0}" data-goals="${p.id}" style="width:60px"></td><td><input type="number" min="0" value="${s.assists||0}" data-assists="${p.id}" style="width:60px"></td><td><input type="number" min="0" value="${s.goalsConceded||0}" data-conceded="${p.id}" style="width:60px" ${isGk?'':'disabled'}></td><td><input type="number" min="0" value="${s.penaltiesSaved||0}" data-penalties="${p.id}" style="width:60px" ${isGk?'':'disabled'}></td><td><input type="number" min="0" value="${s.yellowCards ?? s.yellow_cards ?? 0}" data-yellow="${p.id}" style="width:60px"></td><td><input type="number" min="0" value="${s.redCards ?? s.red_cards ?? 0}" data-red="${p.id}" style="width:60px"></td></tr>`}).join('');
  openModal(`<h2>Statistiche partita - ${esc(m.team)} vs ${esc(m.opponent)}</h2><div class="table-wrap"><table class="table"><thead><tr><th>Giocatore</th><th>Gol</th><th>Assist</th><th>Gol subiti</th><th>Rigori parati</th><th>Gialli</th><th>Rossi</th></tr></thead><tbody>${rows}</tbody></table></div><p class="muted">Il 4° giallo o un rosso generano avviso/squalifica per la gara successiva.</p><button class="btn primary" onclick="saveMatchStats('${matchId}')">Salva statistiche</button>`);
}
function saveMatchStats(matchId){
  qa('[data-played]').forEach(ch=>{
    const pid=ch.dataset.played; const i=state.matchStats.findIndex(x=>x.matchId===matchId&&x.playerId===pid);
    const oldTotal=state.matchStats.filter((x,idx)=>x.playerId===pid && idx!==i).reduce((a,s)=>a+Number(s.yellowCards ?? s.yellow_cards ?? 0),0);
    const yellow=Number(q(`[data-yellow="${pid}"]`).value||0), red=Number(q(`[data-red="${pid}"]`).value||0);
    const obj={id:i>=0?state.matchStats[i].id:uid(),matchId,playerId:pid,played:ch.checked,goals:Number(q(`[data-goals="${pid}"]`).value||0),assists:Number(q(`[data-assists="${pid}"]`).value||0),goalsConceded:Number(q(`[data-conceded="${pid}"]`)?.value||0),penaltiesSaved:Number(q(`[data-penalties="${pid}"]`)?.value||0),yellowCards:yellow,redCards:red};
    if(i>=0) state.matchStats[i]=obj; else state.matchStats.push(obj);
    const p=state.players.find(x=>x.id===pid); const newTotal=oldTotal+yellow;
    if(p && red>0){ p.suspendedNext=true; p.suspensionReason='cartellino rosso'; }
    else if(p && Math.floor(newTotal/4)>Math.floor(oldTotal/4)){ p.suspendedNext=true; p.suspensionReason='4° cartellino giallo'; }
  });
  save();closeModal();renderAll();
}
function renderStats(){
  const rows=state.players.map(p=>{const ms=state.matchStats.filter(s=>s.playerId===p.id); const played=ms.filter(s=>s.played).length; const goals=ms.reduce((a,s)=>a+Number(s.goals||0),0); const assists=ms.reduce((a,s)=>a+Number(s.assists||0),0); const conceded=ms.reduce((a,s)=>a+Number(s.goalsConceded||0),0); const penalties=ms.reduce((a,s)=>a+Number(s.penaltiesSaved||0),0); const att=state.attendance.filter(a=>a.playerId===p.id); const pres=att.filter(a=>a.status==='Presente').length; const abs=att.filter(a=>a.status?.startsWith('Assente')).length; const disc=playerDiscipline(p); const isGk=(p.roles||[]).includes('Portiere'); return `<tr><td><b>${esc(p.lastName)} ${esc(p.firstName)}</b><br>${(p.teams||[]).map(t=>`<span class="pill">${t}</span>`).join('')} ${disc.badges} ${p.suspendedNext&&staffMode?`<button class="btn secondary" onclick="clearSuspension('${p.id}')">Squalifica scontata</button>`:''}</td><td>${played}</td><td>${goals}</td><td>${assists}</td><td>${isGk?conceded:'-'}</td><td>${isGk?penalties:'-'}</td><td>${disc.yellows}</td><td>${disc.reds}</td><td>${pres}</td><td>${abs}</td></tr>`}).join('');
  byId('stats').innerHTML=`<div class="card"><h2>Statistiche individuali</h2><p class="muted">Per i portieri: gol subiti e rigori parati. Disciplina: alert al 3° giallo, squalifica al 4° giallo o rosso.</p><div class="table-wrap"><table class="table"><thead><tr><th>Giocatore</th><th>Partite</th><th>Gol</th><th>Assist</th><th>Gol subiti</th><th>Rigori parati</th><th>Gialli</th><th>Rossi</th><th>Pres. all.</th><th>Assenze</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function openCallupForm(matchId){
  const m=state.matches.find(x=>x.id===matchId); const players=state.players.filter(p=>(p.teams||[]).includes(m.team)); const old=state.callups.find(c=>c.matchId===matchId);
  const checks=players.map(p=>{const disc=playerDiscipline(p); const blocked=!!p.suspendedNext; return `<label class="pill ${blocked?'danger':''}"><input type="checkbox" name="callPlayers" value="${p.id}" ${old?.playerIds?.includes(p.id)?'checked':''} ${blocked?'disabled':''}> ${esc(p.lastName)} ${esc(p.firstName)} (${(p.roles||[]).join('/')}) ${blocked?' - SQUALIFICATO':''} ${disc.badges}</label>`}).join('');
  openModal(`<h2>Convocazione - ${esc(m.team)} vs ${esc(m.opponent)}</h2><div class="row">${checks}</div><div class="field"><label>Note convocazione</label><textarea id="callNotes">${esc(old?.notes||'')}</textarea></div><br><button class="btn primary" onclick="saveCallup('${matchId}')">Salva convocazione</button>`);
}



// ===== v13 overrides: orario convocazione eventi partita + storico sponsor =====
function eventTip(e){
  const parts = [];
  if(e.type==='Partita' && (e.meetingTime || e.convocationTime)) parts.push(`Convocazione: ${e.meetingTime || e.convocationTime}`);
  if(e.time) parts.push(`Inizio: ${e.time}${e.end ? ' - '+e.end : ''}`);
  if(e.title) parts.push(e.title);
  if(e.location) parts.push(`Luogo: ${e.location}`);
  if(e.address) parts.push(`Indirizzo: ${e.address}`);
  if(e.notes) parts.push(`Note: ${e.notes}`);
  return esc(parts.join('\n'));
}

function openEventForm(id='', forceRecurring=false, presetDate=''){
  const baseDate = presetDate || today();
  const ev=(state.calendarEvents||[]).find(x=>x.id===id)||{title:'',type:'Allenamento',team:'CSI',date:baseDate,start:'20:00',end:'22:00',meetingTime:'',location:'',address:'',notes:'',color:'#bbf7d0',repeat:forceRecurring?'weekly':'none',weekdays:[],startDate:baseDate,endDate:''};
  const days=[['1','Lun'],['2','Mar'],['3','Mer'],['4','Gio'],['5','Ven'],['6','Sab'],['7','Dom']];
  const checked=d=>(ev.weekdays||[]).map(String).includes(String(d))?'checked':'';
  const recurring=(ev.repeat||'none')==='weekly';
  openModal(`<h2>${id?'Modifica':'Nuovo'} evento calendario</h2>
    <input id="evId" type="hidden" value="${esc(id)}">
    <div class="row">
      <div class="field"><label>Titolo</label><input id="evTitle" value="${esc(ev.title)}" placeholder="Allenamento CSI / CSI vs Avversario"></div>
      <div class="field"><label>Tipo</label><select id="evType"><option ${ev.type==='Allenamento'?'selected':''}>Allenamento</option><option ${ev.type==='Partita'?'selected':''}>Partita</option><option ${ev.type==='Cena'?'selected':''}>Cena</option><option ${ev.type==='Aperitivo'?'selected':''}>Aperitivo</option><option ${ev.type==='Riunione'?'selected':''}>Riunione</option><option ${ev.type==='Sponsor'?'selected':''}>Sponsor</option><option ${ev.type==='Altro'?'selected':''}>Altro</option></select></div>
      <div class="field"><label>Squadra</label><select id="evTeam"><option ${ev.team==='Tutte'?'selected':''}>Tutte</option><option ${ev.team==='CSI'?'selected':''}>CSI</option><option ${ev.team==='Serie D'?'selected':''}>Serie D</option></select></div>
      <div class="field"><label>Colore etichetta</label><select id="evColor">${eventColorOptions(ev.color)}</select></div>
    </div>
    <div class="row">
      <div class="field"><label>Ora convocazione / ritrovo <span class="muted">solo partite</span></label><input id="evMeeting" type="time" value="${esc(ev.meetingTime || ev.convocationTime || '')}"></div>
      <div class="field"><label>Ora inizio</label><input id="evStart" type="time" value="${esc(ev.start||'')}"></div>
      <div class="field"><label>Ora fine</label><input id="evEnd" type="time" value="${esc(ev.end||'')}"></div>
    </div>
    <div class="row">
      <div class="field"><label>Luogo / campo</label><input id="evLoc" value="${esc(ev.location||'')}"></div>
      <div class="field"><label>Indirizzo</label><input id="evAddress" value="${esc(ev.address||'')}"></div>
    </div>
    <h3>Ripetizione</h3>
    <div class="row"><label><input type="radio" name="evRepeat" value="none" ${!recurring?'checked':''} onchange="toggleRepeatFields()"> Evento singolo</label><label><input type="radio" name="evRepeat" value="weekly" ${recurring?'checked':''} onchange="toggleRepeatFields()"> Evento periodico settimanale</label></div>
    <div id="singleFields" class="row ${recurring?'hidden':''}"><div class="field"><label>Data evento</label><input id="evDate" type="date" value="${esc(ev.date||today())}"></div></div>
    <div id="repeatFields" class="${recurring?'':'hidden'}"><div class="row"><div class="field"><label>Dal</label><input id="evStartDate" type="date" value="${esc(ev.startDate||today())}"></div><div class="field"><label>Al</label><input id="evEndDate" type="date" value="${esc(ev.endDate||'')}"></div></div><div class="row repeat-days">${days.map(([v,l])=>`<label><input type="checkbox" name="evWeekdays" value="${v}" ${checked(v)}> ${l}</label>`).join('')}</div></div>
    <div class="field"><label>Note</label><textarea id="evNotes">${esc(ev.notes||'')}</textarea></div><br>
    <button class="btn primary" onclick="saveEvent()">Salva evento</button>${id?` <button class="btn danger" onclick="deleteEvent('${id}')">Elimina</button>`:''}`);
}

function saveEvent(){
  const id=byId('evId')?.value||''; const repeat=q('input[name="evRepeat"]:checked')?.value||'none';
  const obj={id:id||uid(),title:byId('evTitle').value||'Evento',type:byId('evType').value,team:byId('evTeam').value,date:repeat==='none'?byId('evDate').value:'',meetingTime:byId('evMeeting').value,start:byId('evStart').value,end:byId('evEnd').value,location:byId('evLoc').value,address:byId('evAddress').value,notes:byId('evNotes').value,color:byId('evColor').value,repeat,weekdays:repeat==='weekly'?qa('input[name="evWeekdays"]:checked').map(x=>Number(x.value)):[],startDate:repeat==='weekly'?byId('evStartDate').value:'',endDate:repeat==='weekly'?byId('evEndDate').value:''};
  if(repeat==='weekly' && !obj.weekdays.length){alert('Seleziona almeno un giorno della settimana.');return;}
  if(repeat==='weekly' && (!obj.startDate || !obj.endDate)){alert('Inserisci data inizio e data fine del periodo.');return;}
  const i=(state.calendarEvents||[]).findIndex(x=>x.id===id); if(i>=0) state.calendarEvents[i]=obj; else state.calendarEvents.push(obj); save();closeModal();renderAll();
}

function getEventsForDate(date){
  ensureV10State();
  const arr=[];
  state.trainings.filter(x=>x.date===date).forEach(x=>arr.push({id:x.id,source:'training',type:'Allenamento',team:x.team,title:`Allenamento ${x.team}`,time:x.start,end:x.end,cls:'training',color:'#e0f2fe',location:x.location,notes:x.notes,occurrenceDate:date}));
  state.matches.filter(x=>x.date===date).forEach(x=>arr.push({id:x.id,source:'match',type:'Partita',team:x.team,title:`${x.team} vs ${x.opponent}`,meetingTime:x.meetingTime,time:x.matchTime,end:'',cls:'match',color:'#dcfce7',location:x.fieldName || x.meetingPlace,address:x.fieldAddress,notes:x.notes,occurrenceDate:date}));
  state.callups.forEach(c=>{const mt=state.matches.find(m=>m.id===c.matchId); if(mt?.date===date) arr.push({id:c.id,source:'callup',type:'Convocazione',team:mt.team,title:`Convocazione ${mt.team}`,meetingTime:mt.meetingTime,time:mt.meetingTime,end:'',cls:'callup',color:'#fef3c7',location:mt.meetingPlace || mt.fieldName,address:mt.fieldAddress,notes:c.notes || mt.notes,occurrenceDate:date});});
  (state.calendarEvents||[]).forEach(x=>{
    const repeat=x.repeat||'none';
    const single = repeat==='none' && x.date===date;
    const weekly = repeat==='weekly' && dateInRange(date,x.startDate,x.endDate) && (x.weekdays||[]).map(Number).includes(dayIndexMon(date));
    if(!single && !weekly) return;
    const ov = weekly ? getOverride(x.id,date) : null;
    if(ov?.action==='cancel') return;
    const merged = ov?.action==='modify' ? {...x, ...ov, id:x.id, parentId:x.id} : x;
    arr.push({id:x.id,source:'event',type:merged.type,title:eventDisplayTitle(merged),team:merged.team,meetingTime:merged.meetingTime || merged.convocationTime,time:merged.start,end:merged.end,cls:merged.type==='Sponsor'?'sponsor':(merged.type==='Allenamento'?'training':(merged.type==='Partita'?'match':'extra')),color:merged.color,location:merged.location,address:merged.address,notes:merged.notes,raw:x,override:ov,occurrenceDate:date});
  });
  return arr.sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
}

function openCalendarItem(source,id,date){
  if(source==='event'){
    const e=(state.calendarEvents||[]).find(x=>x.id===id); if(!e)return;
    const current=getEventOccurrence(id,date) || e;
    const isWeekly=(e.repeat||'none')==='weekly';
    const rep=isWeekly?`<p><b>Occorrenza:</b> ${fmtDate(date)}<br><b>Serie:</b> ${fmtDate(e.startDate)} - ${fmtDate(e.endDate)}<br><b>Giorni:</b> ${(e.weekdays||[]).map(n=>['','Lun','Mar','Mer','Gio','Ven','Sab','Dom'][n]).join(', ')}</p>`:`<p><b>Data:</b> ${fmtDate(current.date||date)}</p>`;
    const callBtns = current.type==='Partita' ? `<button class="btn secondary" onclick="openCallupFromCalendarEvent('${id}','${date}')">Crea/Modifica convocazione</button> <button class="btn secondary" onclick="openStatsFromCalendarEvent('${id}','${date}')">Stats partita</button>` : '';
    const occurrenceBtns = isWeekly ? `<button class="btn primary" onclick="openEventOccurrenceForm('${id}','${date}')">Modifica solo questa data</button> <button class="btn danger" onclick="cancelEventOccurrence('${id}','${date}')">Elimina solo questa data</button> <button class="btn secondary" onclick="openEventForm('${id}')">Modifica intera serie</button> <button class="btn danger" onclick="deleteEvent('${id}')">Elimina intera serie</button>` : `<button class="btn primary" onclick="openEventForm('${id}')">Modifica</button> <button class="btn danger" onclick="deleteEvent('${id}')">Elimina</button>`;
    openModal(`<h2>${esc(eventDisplayTitle(current))}</h2><p><b>Tipo:</b> ${esc(current.type)} | <b>Squadra:</b> ${esc(current.team||'')}</p>${current.type==='Partita'?`<p><b>Orario convocazione:</b> ${esc(current.meetingTime||current.convocationTime||'')}</p>`:''}<p><b>Orario inizio:</b> ${esc(current.start||'')} ${current.end?'- '+esc(current.end):''}</p>${rep}<p><b>Luogo:</b> ${esc(current.location||'')}</p>${current.address?`<p><b>Indirizzo:</b> ${esc(current.address)}</p>`:''}<p><b>Note:</b><br>${esc(current.notes||'')}</p>${staffMode?`${callBtns} ${occurrenceBtns}`:callBtns}`);
    return;
  }
  if(source==='training'){
    const t=state.trainings.find(x=>x.id===id); if(!t)return;
    openModal(`<h2>Allenamento ${esc(t.team)}</h2><p><b>Data:</b> ${fmtDate(t.date)} | <b>Orario:</b> ${esc(t.start||'')} - ${esc(t.end||'')}</p><p><b>Luogo:</b> ${esc(t.location||'')}</p><p><b>Note:</b><br>${esc(t.notes||'')}</p>${staffMode?`<button class="btn primary" onclick="openTrainingForm('${id}')">Modifica</button> <button class="btn danger" onclick="delTraining('${id}'); closeModal();">Elimina</button>`:''}`); return;
  }
  if(source==='match'){
    const m=state.matches.find(x=>x.id===id); if(!m)return;
    openModal(`<h2>${esc(m.team)} vs ${esc(m.opponent)}</h2><p><b>Competizione:</b> ${esc(m.competition||'')}</p><p><b>Data:</b> ${fmtDate(m.date)}</p><p><b>Convocazione:</b> ${esc(m.meetingTime||'')} ${m.meetingPlace?'- '+esc(m.meetingPlace):''}</p><p><b>Gara:</b> ${esc(m.matchTime||'')}</p><p><b>Campo:</b> ${esc(m.fieldName||'')}<br>${esc(m.fieldAddress||'')}</p><p><b>Note:</b><br>${esc(m.notes||'')}</p>${staffMode?`<button class="btn primary" onclick="openMatchForm('${id}')">Modifica</button> <button class="btn secondary" onclick="openCallupForm('${id}')">Convoca</button> <button class="btn danger" onclick="delMatch('${id}'); closeModal();">Elimina</button>`:''}`); return;
  }
  if(source==='callup'){
    const c=state.callups.find(x=>x.id===id); const m=state.matches.find(x=>x.id===c?.matchId); if(!c||!m)return;
    openModal(`<h2>Convocazione ${esc(m.team)}</h2><p><b>Gara:</b> ${esc(m.team)} vs ${esc(m.opponent)}</p><p><b>Data:</b> ${fmtDate(m.date)}</p><p><b>Convocazione:</b> ${esc(m.meetingTime||'')} ${m.meetingPlace?'- '+esc(m.meetingPlace):''}</p><p><b>Inizio gara:</b> ${esc(m.matchTime||'')}</p><p><b>Luogo:</b> ${esc(m.meetingPlace||m.fieldName||'')}</p><p><b>Note:</b><br>${esc(c.notes||m.notes||'')}</p><button class="btn primary" onclick="printCallup('${id}')">PDF/Stampa</button>${staffMode?` <button class="btn secondary" onclick="openCallupForm('${m.id}')">Modifica</button> <button class="btn danger" onclick="deleteCallup('${id}')">Elimina</button>`:''}`);
  }
}

function openEventOccurrenceForm(parentId,date){
  const e=(state.calendarEvents||[]).find(x=>x.id===parentId); if(!e)return;
  const ov=getOverride(parentId,date);
  const cur=ov?.action==='modify'?{...e,...ov}:e;
  openModal(`<h2>Modifica solo ${fmtDate(date)}</h2><p class="notice">Questa è un'eccezione: non modifica gli eventi precedenti o futuri della serie.</p><input id="ovParent" type="hidden" value="${esc(parentId)}"><input id="ovDate" type="hidden" value="${esc(date)}"><div class="row"><div class="field"><label>Titolo</label><input id="ovTitle" value="${esc(cur.title||'')}"></div><div class="field"><label>Tipo</label><select id="ovType"><option ${cur.type==='Allenamento'?'selected':''}>Allenamento</option><option ${cur.type==='Partita'?'selected':''}>Partita</option><option ${cur.type==='Cena'?'selected':''}>Cena</option><option ${cur.type==='Aperitivo'?'selected':''}>Aperitivo</option><option ${cur.type==='Riunione'?'selected':''}>Riunione</option><option ${cur.type==='Sponsor'?'selected':''}>Sponsor</option><option ${cur.type==='Altro'?'selected':''}>Altro</option></select></div><div class="field"><label>Squadra</label><select id="ovTeam"><option ${cur.team==='Tutte'?'selected':''}>Tutte</option><option ${cur.team==='CSI'?'selected':''}>CSI</option><option ${cur.team==='Serie D'?'selected':''}>Serie D</option></select></div><div class="field"><label>Colore</label><select id="ovColor">${eventColorOptions(cur.color)}</select></div></div><div class="row"><div class="field"><label>Ora convocazione / ritrovo</label><input id="ovMeeting" type="time" value="${esc(cur.meetingTime||cur.convocationTime||'')}"></div><div class="field"><label>Ora inizio</label><input id="ovStart" type="time" value="${esc(cur.start||'')}"></div><div class="field"><label>Ora fine</label><input id="ovEnd" type="time" value="${esc(cur.end||'')}"></div></div><div class="row"><div class="field"><label>Luogo</label><input id="ovLoc" value="${esc(cur.location||'')}"></div><div class="field"><label>Indirizzo</label><input id="ovAddress" value="${esc(cur.address||'')}"></div></div><div class="field"><label>Note</label><textarea id="ovNotes">${esc(cur.notes||'')}</textarea></div><br><button class="btn primary" onclick="saveEventOccurrence()">Salva solo questa data</button> <button class="btn danger" onclick="cancelEventOccurrence('${parentId}','${date}')">Elimina solo questa data</button>`);
}
function saveEventOccurrence(){
  ensureV10State();
  const parentId=byId('ovParent').value, date=byId('ovDate').value;
  const obj={id:uid(),parentId,date,action:'modify',title:byId('ovTitle').value||'Evento',type:byId('ovType').value,team:byId('ovTeam').value,meetingTime:byId('ovMeeting').value,start:byId('ovStart').value,end:byId('ovEnd').value,location:byId('ovLoc').value,address:byId('ovAddress').value,notes:byId('ovNotes').value,color:byId('ovColor').value};
  state.eventOverrides=(state.eventOverrides||[]).filter(o=>!(o.parentId===parentId&&o.date===date));
  state.eventOverrides.push(obj); save(); closeModal(); renderAll();
}

function getOrCreateMatchFromCalendarEvent(eventId,date, openAfter=false){
  ensureV10State();
  const key=calendarMatchKey(eventId,date);
  let m=state.matches.find(x=>x.calendarEventKey===key);
  if(m) return m;
  const ev=getEventOccurrence(eventId,date);
  if(!ev){ alert('Evento calendario non trovato.'); return null; }
  if(ev.type!=='Partita'){ alert('La convocazione può essere creata solo per eventi di tipo Partita.'); return null; }
  const team=(ev.team && ev.team!=='Tutte') ? ev.team : 'CSI';
  m={id:uid(), team, opponent:parseOpponentFromTitle(ev.title,team), competition:'Campionato', date, meetingTime:ev.meetingTime||ev.convocationTime||'', matchTime:ev.start||'', meetingPlace:ev.location||'', fieldName:ev.location||'', fieldAddress:ev.address||'', kitColor:'', notes:ev.notes||'', calendarEventId:eventId, calendarEventDate:date, calendarEventKey:key};
  state.matches.push(m); save(); if(openAfter) renderAll(); return m;
}

function renderSponsors(){
  const rows=state.sponsors.map(s=>{const expenses=state.sponsorExpenses.filter(e=>e.sponsorId===s.id); const spent=expenses.reduce((a,e)=>a+Number(e.amount||0),0); return `<tr><td><button class="linkbtn" onclick="openSponsorHistory('${s.id}')"><b>${esc(s.name)}</b></button><br>${esc(s.type||'')}</td><td>${money(s.amountPaid)}</td><td>${fmtDate(s.paymentDate)}</td><td>${money(spent)}</td><td><button class="btn secondary" onclick="openSponsorHistory('${s.id}')">Storico</button> <button class="btn secondary" onclick="openExpenseForm('${s.id}')">Aggiungi spesa</button> <button class="btn danger" onclick="delSponsor('${s.id}')">Elimina</button></td></tr>`}).join('');
  byId('sponsors').innerHTML=`<div class="card"><h2>Sponsor e rendicontazione</h2><p class="muted">La colonna “Speso da noi” resta cumulativa; clicca su uno sponsor per vedere lo storico dettagliato con date, importi e note.</p><button class="btn primary" onclick="openSponsorForm()">Nuovo sponsor</button><br><br><div class="table-wrap"><table class="table"><thead><tr><th>Sponsor</th><th>Versato</th><th>Data</th><th>Speso da noi</th><th>Azioni</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Nessuno sponsor.</td></tr>'}</tbody></table></div></div>`;
}
function openSponsorHistory(sponsorId){
  const s=state.sponsors.find(x=>x.id===sponsorId); if(!s) return;
  const expenses=state.sponsorExpenses.filter(e=>e.sponsorId===sponsorId).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const total=expenses.reduce((a,e)=>a+Number(e.amount||0),0);
  const rows=expenses.map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${esc(e.description||'')}</td><td>${money(e.amount)}</td><td>${esc(e.notes||'')}</td><td><button class="btn secondary" onclick="openExpenseForm('${sponsorId}','${e.id}')">Modifica</button> <button class="btn danger" onclick="deleteExpense('${e.id}')">Elimina</button></td></tr>`).join('');
  openModal(`<h2>${esc(s.name)}</h2><p><b>Tipo:</b> ${esc(s.type||'')}<br><b>Importo sponsorizzazione versato:</b> ${money(s.amountPaid)} ${s.paymentDate?`in data ${fmtDate(s.paymentDate)}`:''}</p><p><b>Totale speso da noi:</b> ${money(total)}</p><button class="btn primary" onclick="openExpenseForm('${sponsorId}')">Aggiungi spesa/consumo</button><br><br><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Descrizione</th><th>Importo</th><th>Note</th><th>Azioni</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Nessuna spesa registrata.</td></tr>'}</tbody></table></div><p class="muted">Questo storico serve per il rinnovo: puoi mostrare allo sponsor quanto avete speso presso la sua attività durante l’anno.</p>`);
}
function openExpenseForm(sponsorId, expenseId=''){
  const s=state.sponsors.find(x=>x.id===sponsorId); const ex=state.sponsorExpenses.find(x=>x.id===expenseId)||{date:today(),description:'Cena / aperitivo',amount:'',notes:''};
  openModal(`<h2>${expenseId?'Modifica':'Nuova'} spesa presso ${esc(s?.name||'sponsor')}</h2><div class="row"><div class="field"><label>Data</label><input id="exDate" type="date" value="${esc(ex.date||today())}"></div><div class="field"><label>Descrizione</label><input id="exDesc" value="${esc(ex.description||'Cena / aperitivo')}"></div><div class="field"><label>Importo</label><input id="exAmount" type="number" step="0.01" value="${esc(ex.amount||'')}"></div></div><div class="field"><label>Note</label><textarea id="exNotes">${esc(ex.notes||'')}</textarea></div><br><button class="btn primary" onclick="saveExpense('${sponsorId}','${expenseId}')">Salva spesa</button> ${expenseId?`<button class="btn danger" onclick="deleteExpense('${expenseId}')">Elimina</button>`:''}`)
}
function saveExpense(sponsorId, expenseId=''){
  const obj={id:expenseId||uid(),sponsorId,date:byId('exDate').value,description:byId('exDesc').value,amount:Number(byId('exAmount').value||0),notes:byId('exNotes').value};
  const i=state.sponsorExpenses.findIndex(e=>e.id===expenseId);
  if(i>=0) state.sponsorExpenses[i]=obj; else state.sponsorExpenses.push(obj);
  save(); closeModal(); renderAll(); openSponsorHistory(sponsorId);
}
function deleteExpense(expenseId){
  const ex=state.sponsorExpenses.find(e=>e.id===expenseId); if(!ex) return;
  if(confirm('Eliminare questa spesa dallo storico sponsor?')){ const sid=ex.sponsorId; state.sponsorExpenses=state.sponsorExpenses.filter(e=>e.id!==expenseId); save(); renderAll(); openSponsorHistory(sid); }
}

init();

// ===== v14 overrides: calendario pulito quando si crea una convocazione da partita calendario =====
function getEventDisplayTime(e){
  if((e.type||'') === 'Partita') return e.meetingTime || e.convocationTime || e.start || e.time || '';
  return e.start || e.time || '';
}
function getEventDisplayEnd(e){
  if((e.type||'') === 'Partita') return e.end || e.matchEnd || '';
  return e.end || '';
}
function eventTip(e){
  const parts = [];
  if(e.type === 'Partita'){
    if(e.meetingTime) parts.push(`Convocazione: ${e.meetingTime}`);
    if(e.matchTime || e.start) parts.push(`Inizio gara: ${e.matchTime || e.start}`);
    if(e.end || e.matchEnd) parts.push(`Fine prevista: ${e.end || e.matchEnd}`);
  } else if(e.time) {
    parts.push(`Orario: ${e.time}${e.end ? ' - '+e.end : ''}`);
  }
  if(e.title) parts.push(e.title);
  if(e.location) parts.push(`Luogo: ${e.location}`);
  if(e.notes) parts.push(`Note: ${e.notes}`);
  return esc(parts.join('\n'));
}
function getEventsForDate(date){
  ensureV10State();
  const arr=[];
  state.trainings.filter(x=>x.date===date).forEach(x=>arr.push({id:x.id,source:'training',type:'Allenamento',team:x.team,title:`Allenamento ${x.team}`,time:x.start,end:x.end,cls:'training',color:'#e0f2fe',location:x.location,notes:x.notes,occurrenceDate:date}));

  // Se una partita strutturata nasce da un evento calendario, NON la mostriamo come secondo evento nel calendario.
  // Resta disponibile per convocazioni, statistiche e stampa, ma il calendario conserva un solo riquadro: la partita originale.
  state.matches
    .filter(x=>x.date===date && !x.calendarEventKey)
    .forEach(x=>arr.push({id:x.id,source:'match',type:'Partita',team:x.team,title:`${x.team} vs ${x.opponent}`,meetingTime:x.meetingTime,time:x.meetingTime||x.matchTime,end:x.matchEnd||'',matchTime:x.matchTime,cls:'match',color:'#dcfce7',location:x.fieldName || x.meetingPlace,address:x.fieldAddress,notes:x.notes,occurrenceDate:date}));

  // Le convocazioni non vengono più disegnate come eventi separati nel calendario: sono gestite nel banner Convocazioni.
  (state.calendarEvents||[]).forEach(x=>{
    const repeat=x.repeat||'none';
    const single = repeat==='none' && x.date===date;
    const weekly = repeat==='weekly' && dateInRange(date,x.startDate,x.endDate) && (x.weekdays||[]).map(Number).includes(dayIndexMon(date));
    if(!single && !weekly) return;
    const ov = weekly ? getOverride(x.id,date) : null;
    if(ov?.action==='cancel') return;
    const merged = ov?.action==='modify' ? {...x, ...ov, id:x.id, parentId:x.id} : x;
    arr.push({
      id:x.id,
      source:'event',
      type:merged.type,
      title:eventDisplayTitle(merged),
      team:merged.team,
      meetingTime:merged.meetingTime || merged.convocationTime || '',
      time:getEventDisplayTime(merged),
      start:merged.start,
      end:getEventDisplayEnd(merged),
      matchTime:merged.start || '',
      cls:merged.type==='Sponsor'?'sponsor':(merged.type==='Allenamento'?'training':(merged.type==='Partita'?'match':'extra')),
      color:merged.color,
      location:merged.location,
      address:merged.address,
      notes:merged.notes,
      raw:x,
      override:ov,
      occurrenceDate:date
    });
  });
  return arr.sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
}
function getOrCreateMatchFromCalendarEvent(eventId,date, openAfter=false){
  ensureV10State();
  const key=calendarMatchKey(eventId,date);
  let m=state.matches.find(x=>x.calendarEventKey===key);
  if(m) return m;
  const ev=getEventOccurrence(eventId,date);
  if(!ev){ alert('Evento calendario non trovato.'); return null; }
  if(ev.type!=='Partita'){ alert('La convocazione può essere creata solo per eventi di tipo Partita.'); return null; }
  const team=(ev.team && ev.team!=='Tutte') ? ev.team : 'CSI';
  m={
    id:uid(),
    team,
    opponent:parseOpponentFromTitle(ev.title,team),
    competition:'Campionato',
    date,
    meetingTime:ev.meetingTime||ev.convocationTime||'',
    matchTime:ev.start||'',
    matchEnd:ev.end||'',
    meetingPlace:ev.location||'',
    fieldName:ev.location||'',
    fieldAddress:ev.address||'',
    kitColor:'',
    notes:ev.notes||'',
    calendarEventId:eventId,
    calendarEventDate:date,
    calendarEventKey:key
  };
  state.matches.push(m); save(); if(openAfter) renderAll(); return m;
}

const openCalendarItemV14 = typeof openCalendarItem === "function" ? openCalendarItem : null;
// ===== v15 overrides: editor completo dei campi PDF convocazione =====
function getCallupPdfData(c, m){
  const d = c || {};
  const match = m || {};
  const campoFallback = [match.fieldName, match.fieldAddress].filter(Boolean).join(' - ') || match.meetingPlace || '';
  return {
    teamTitle: d.pdfTeamTitle || (match.team || 'SQUADRA'),
    competition: d.pdfCompetition || match.competition || 'Campionato',
    game: d.pdfGame || `${match.team||''} vs ${match.opponent||''}`.trim(),
    date: d.pdfDate || match.date || today(),
    meetingTime: d.pdfMeetingTime || match.meetingTime || '',
    matchTime: d.pdfMatchTime || match.matchTime || '',
    matchEnd: d.pdfMatchEnd || match.matchEnd || '',
    field: d.pdfField || campoFallback,
    address: d.pdfAddress || '',
    kit: d.pdfKit || match.kitColor || '',
    staff: d.pdfStaff || '',
    notes: d.pdfNotes || d.notes || match.notes || ''
  };
}
function openCallupForm(matchId){
  const m=state.matches.find(x=>x.id===matchId); if(!m){alert('Partita non trovata.');return;}
  const players=state.players.filter(p=>(p.teams||[]).includes(m.team));
  const old=state.callups.find(c=>c.matchId===matchId);
  const data=getCallupPdfData(old,m);
  const checks=players.map(p=>{
    const disc=playerDiscipline(p); const blocked=!!p.suspendedNext;
    return `<label class="pill ${blocked?'danger':''}"><input type="checkbox" name="callPlayers" value="${p.id}" ${old?.playerIds?.includes(p.id)?'checked':''} ${blocked?'disabled':''}> ${esc(p.lastName)} ${esc(p.firstName)} (${(p.roles||[]).join('/')}) ${blocked?' - SQUALIFICATO':''} ${disc.badges}</label>`;
  }).join('');
  openModal(`<h2>${old?'Modifica convocazione':'Crea convocazione'} - ${esc(m.team)} vs ${esc(m.opponent)}</h2>
    <h3>Giocatori convocati</h3>
    <div class="row">${checks||'<p>Nessun giocatore disponibile per questa squadra.</p>'}</div>
    <hr>
    <h3>Campi editabili del PDF</h3>
    <p class="muted">Questi campi modificano solo la convocazione/PDF, senza cambiare per forza la partita o l'evento calendario originale.</p>
    <div class="row">
      <div class="field"><label>Titolo squadra in alto</label><input id="pdfTeamTitle" value="${esc(data.teamTitle)}"></div>
      <div class="field"><label>Tipo convocazione / competizione</label><input id="pdfCompetition" value="${esc(data.competition)}"></div>
    </div>
    <div class="field"><label>Gara / partita</label><input id="pdfGame" value="${esc(data.game)}"></div>
    <div class="row">
      <div class="field"><label>Data</label><input id="pdfDate" type="date" value="${esc(data.date)}"></div>
      <div class="field"><label>Ora convocazione / ritrovo</label><input id="pdfMeetingTime" type="time" value="${esc(data.meetingTime)}"></div>
      <div class="field"><label>Ora inizio gara</label><input id="pdfMatchTime" type="time" value="${esc(data.matchTime)}"></div>
      <div class="field"><label>Ora fine prevista</label><input id="pdfMatchEnd" type="time" value="${esc(data.matchEnd)}"></div>
    </div>
    <div class="row">
      <div class="field"><label>Campo / luogo</label><input id="pdfField" value="${esc(data.field)}"></div>
      <div class="field"><label>Indirizzo campo</label><input id="pdfAddress" value="${esc(data.address)}"></div>
    </div>
    <div class="row">
      <div class="field"><label>Divisa</label><input id="pdfKit" value="${esc(data.kit)}"></div>
      <div class="field"><label>Staff / dirigente / allenatore</label><input id="pdfStaff" value="${esc(data.staff)}"></div>
    </div>
    <div class="field"><label>Note da stampare nel PDF</label><textarea id="pdfNotes">${esc(data.notes)}</textarea></div>
    <br>
    <button class="btn primary" onclick="saveCallup('${matchId}', false)">Salva convocazione</button>
    <button class="btn secondary" onclick="saveCallup('${matchId}', true)">Salva e stampa PDF</button>`);
}
function saveCallup(matchId, printAfter=false){
  const ids=qa('input[name="callPlayers"]:checked').map(x=>x.value);
  let c=state.callups.find(x=>x.matchId===matchId);
  if(!c){c={id:uid(),matchId,title:'Convocazione',playerIds:[],notes:''};state.callups.push(c);}
  c.playerIds=ids;
  c.notes=byId('pdfNotes')?.value || '';
  c.pdfTeamTitle=byId('pdfTeamTitle')?.value || '';
  c.pdfCompetition=byId('pdfCompetition')?.value || '';
  c.pdfGame=byId('pdfGame')?.value || '';
  c.pdfDate=byId('pdfDate')?.value || '';
  c.pdfMeetingTime=byId('pdfMeetingTime')?.value || '';
  c.pdfMatchTime=byId('pdfMatchTime')?.value || '';
  c.pdfMatchEnd=byId('pdfMatchEnd')?.value || '';
  c.pdfField=byId('pdfField')?.value || '';
  c.pdfAddress=byId('pdfAddress')?.value || '';
  c.pdfKit=byId('pdfKit')?.value || '';
  c.pdfStaff=byId('pdfStaff')?.value || '';
  c.pdfNotes=byId('pdfNotes')?.value || '';
  save(); closeModal(); renderAll(); showView('callups');
  if(printAfter) setTimeout(()=>printCallup(c.id),150);
}
function renderCallups(){
  ensureV10State();
  const existingRows=state.callups.map(c=>{
    const m=state.matches.find(x=>x.id===c.matchId); if(!m)return'';
    const d=getCallupPdfData(c,m);
    return `<tr><td>${fmtDate(d.date)} ${esc(d.meetingTime||d.matchTime||'')}</td><td>${esc(d.teamTitle||m.team)}</td><td>${esc(d.game||m.opponent)}</td><td>${c.playerIds?.length||0}</td><td><button class="btn primary" onclick="printCallup('${c.id}')">PDF/Stampa</button>${staffMode?` <button class="btn secondary" onclick="openCallupForm('${m.id}')">Modifica PDF/convocati</button> <button class="btn danger" onclick="deleteCallup('${c.id}')">Elimina</button>`:''}</td></tr>`;
  }).join('');
  let pendingRows='';
  if(staffMode){
    const callupMatchIds=new Set(state.callups.map(c=>c.matchId));
    const structured=state.matches.filter(m=>m.date>=today() && !callupMatchIds.has(m.id)).sort((a,b)=>(a.date+(a.meetingTime||a.matchTime||'')).localeCompare(b.date+(b.meetingTime||b.matchTime||''))).map(m=>`<tr><td>${fmtDate(m.date)} ${esc(m.meetingTime||m.matchTime||'')}</td><td>${esc(m.team)}</td><td>${esc(m.opponent)}</td><td><span class="pill warn">Da creare</span></td><td><button class="btn secondary" onclick="openCallupForm('${m.id}')">Crea convocazione</button></td></tr>`).join('');
    const eventMatches=getEventsForRange(today(), addDays(today(),60), e=>e.source==='event' && e.type==='Partita').filter(e=>!state.matches.some(m=>m.calendarEventKey===calendarMatchKey(e.id,e.occurrenceDate))).map(e=>`<tr><td>${fmtDate(e.occurrenceDate)} ${esc(e.meetingTime||e.time||'')}</td><td>${esc(e.team||'')}</td><td>${esc(parseOpponentFromTitle(e.title,e.team))}</td><td><span class="pill warn">Da calendario</span></td><td><button class="btn secondary" onclick="openCallupFromCalendarEvent('${e.id}','${e.occurrenceDate}')">Crea convocazione</button></td></tr>`).join('');
    pendingRows=structured+eventMatches;
  }
  const rows=existingRows+pendingRows;
  byId('callups').innerHTML=`<div class="card"><h2>Convocazioni</h2><p class="muted">Crea la convocazione dalla partita e poi usa “Modifica PDF/convocati” per cambiare ogni campo stampabile senza alterare l'evento calendario originale.</p><div class="table-wrap"><table class="table"><thead><tr><th>Data/Ritrovo</th><th>Squadra</th><th>Gara</th><th>Convocati/Stato</th><th>Azioni</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Nessuna convocazione.</td></tr>'}</tbody></table></div></div>`;
}
function callupDocumentHtml(id){
  const c=state.callups.find(x=>x.id===id);
  if(!c) return '<p>Convocazione non trovata.</p>';
  const m=state.matches.find(x=>x.id===c.matchId);
  if(!m) return '<p>Partita non trovata.</p>';
  const data=getCallupPdfData(c,m);
  const players=(c.playerIds||[]).map(pid=>state.players.find(p=>p.id===pid)).filter(Boolean);
  const minRows=Math.max(16, players.length + 3);
  const playerRows=[];
  for(let i=0;i<minRows;i++){
    const p=players[i];
    playerRows.push(`<tr><td class="numcol">${p ? i+1 : ''}</td><td>${p ? esc((p.firstName+' '+p.lastName).toUpperCase()) : '&nbsp;'}</td></tr>`);
  }
  const d=new Date((data.date||today())+'T12:00:00');
  const dateTxt=d.toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'}).replace('.', '');
  const title=esc((data.teamTitle||'SQUADRA').toUpperCase());
  const campo=[data.field,data.address].filter(Boolean).join(' - ');
  const timeLine = `${esc(data.matchTime||'')}${data.matchEnd ? ' - '+esc(data.matchEnd) : ''}`;
  const extraRows = `${data.kit?`<p><b>DIVISA:</b> ${esc(data.kit)}</p>`:''}${data.staff?`<p><b>STAFF:</b> ${esc(data.staff)}</p>`:''}${data.notes?`<p><b>NOTE:</b> ${esc(data.notes)}</p>`:''}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Convocazione ${title}</title>
  <style>
    @page{size:A4 portrait;margin:14mm 13mm;}
    *{box-sizing:border-box;}
    body{margin:0;background:#fff;color:#000;font-family:"Times New Roman", Times, serif;}
    .sheet{width:100%;max-width:760px;margin:0 auto;padding:8px 0;}
    .club{text-align:center;font-size:45px;line-height:1;font-weight:900;letter-spacing:.5px;margin:8px 0 26px;}
    .sub{text-align:center;font-size:30px;line-height:1.05;margin-bottom:34px;}
    .sub b{text-decoration:underline;font-weight:900;}
    .sub em{font-size:32px;}
    .info{font-size:28px;line-height:1.18;margin:0 0 16px;}
    .info p{margin:0 0 12px;}
    .info b{font-weight:900;}
    .info em{font-style:italic;}
    table{border-collapse:collapse;width:86%;margin:20px auto 0;table-layout:fixed;}
    th,td{border:2px solid #000;text-align:center;vertical-align:middle;}
    th{font-size:30px;font-weight:900;padding:6px 4px;line-height:1;}
    td{font-size:24px;height:36px;padding:3px 4px;line-height:1.05;}
    .numcol{width:70px;}
    .actions{position:fixed;right:14px;top:14px;display:flex;gap:8px;font-family:Arial,sans-serif;}
    .actions button{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;background:#164ac9;color:#fff;}
    .actions button.secondary{background:#e5e7eb;color:#111827;}
    @media print{.actions{display:none!important}.sheet{max-width:none}.club{margin-top:0}}
    @media(max-width:700px){.club{font-size:36px}.sub{font-size:24px}.sub em{font-size:26px}.info{font-size:23px}th{font-size:22px}td{font-size:19px}table{width:100%}}
  </style></head><body><div class="actions"><button onclick="window.print()">Stampa / Salva PDF</button><button class="secondary" onclick="window.close()">Chiudi</button></div><main class="sheet">
    <div class="club">${title}</div>
    <div class="sub"><b>CONVOCAZIONI:</b>&nbsp; <em>${esc(data.competition)}</em></div>
    <section class="info">
      <p><b>PARTITA:</b>&nbsp;&nbsp;&nbsp; <em>${esc(data.game)}</em></p>
      <p><b>GIORNO:</b> ${esc(dateTxt)} &nbsp;&nbsp;<b>ORA:</b> ${timeLine}</p>
      <p><b>ORARIO DI CONVOCAZIONE:</b> <em>${esc(data.meetingTime||'')}</em></p>
      <p><b>CAMPO:</b> ${esc(campo)}</p>
      ${extraRows}
    </section>
    <table><thead><tr><th class="numcol">N°</th><th>NOME E COGNOME</th></tr></thead><tbody>${playerRows.join('')}</tbody></table>
  </main></body></html>`;
}
function openCalendarItem(source,id,date){
  // piccolo override solo per aggiungere il nuovo pulsante di modifica PDF nelle convocazioni viste dal calendario
  if(source==='callup'){
    const c=state.callups.find(x=>x.id===id); const m=state.matches.find(x=>x.id===c?.matchId); if(!c||!m)return;
    const d=getCallupPdfData(c,m);
    openModal(`<h2>Convocazione ${esc(d.teamTitle)}</h2><p><b>Gara:</b> ${esc(d.game)}</p><p><b>Data:</b> ${fmtDate(d.date)}</p><p><b>Convocazione:</b> ${esc(d.meetingTime||'')}</p><p><b>Inizio gara:</b> ${esc(d.matchTime||'')}</p><p><b>Luogo:</b> ${esc(d.field||'')}</p><p><b>Note:</b><br>${esc(d.notes||'')}</p><button class="btn primary" onclick="printCallup('${id}')">PDF/Stampa</button>${staffMode?` <button class="btn secondary" onclick="openCallupForm('${m.id}')">Modifica PDF/convocati</button> <button class="btn danger" onclick="deleteCallup('${id}')">Elimina</button>`:''}`); return;
  }
  return openCalendarItemV14 ? openCalendarItemV14(source,id,date) : null;
}

// ===== v16 fixes: dettagli/eliminazione robusti per calendario, partite e occorrenze =====
function removeMatchDeep(matchId){
  state.callups = (state.callups || []).filter(c => c.matchId !== matchId);
  state.matchStats = (state.matchStats || []).filter(s => s.matchId !== matchId);
  state.matches = (state.matches || []).filter(m => m.id !== matchId);
}
function removeCalendarEventDeep(eventId){
  const linked = (state.matches || []).filter(m => m.calendarEventId === eventId || String(m.calendarEventKey || '').startsWith(eventId + '__'));
  linked.forEach(m => removeMatchDeep(m.id));
  state.calendarEvents = (state.calendarEvents || []).filter(e => e.id !== eventId);
  state.eventOverrides = (state.eventOverrides || []).filter(o => o.parentId !== eventId);
}
function removeCalendarOccurrenceDeep(eventId, date){
  const key = calendarMatchKey(eventId, date);
  (state.matches || []).filter(m => m.calendarEventKey === key).forEach(m => removeMatchDeep(m.id));
}
function deleteMatchDeep(id){
  if(!confirm('Eliminare questa partita? Verranno eliminate anche convocazione e statistiche collegate.')) return;
  removeMatchDeep(id);
  save(); closeModal(); renderAll();
}
function deleteEvent(id){
  if(!confirm('Eliminare questo evento? Verranno eliminate anche eventuali convocazioni/statistiche collegate a questo evento.')) return;
  removeCalendarEventDeep(id);
  save(); closeModal(); renderAll();
}
function cancelEventOccurrence(parentId,date){
  if(!confirm('Eliminare solo questa occorrenza? La serie resterà invariata. Verranno eliminate anche eventuali convocazioni/statistiche collegate a questa data.')) return;
  ensureV10State();
  removeCalendarOccurrenceDeep(parentId, date);
  state.eventOverrides=(state.eventOverrides||[]).filter(o=>!(o.parentId===parentId&&o.date===date));
  state.eventOverrides.push({id:uid(),parentId,date,action:'cancel'});
  save(); closeModal(); renderAll();
}
function delMatch(id){ deleteMatchDeep(id); }

function openCalendarItem(source,id,date){
  if(source==='event'){
    const e=(state.calendarEvents||[]).find(x=>x.id===id); if(!e){ alert('Evento non trovato.'); return; }
    const current=getEventOccurrence(id,date) || e;
    const isWeekly=(e.repeat||'none')==='weekly';
    const rep=isWeekly
      ? `<p><b>Occorrenza:</b> ${fmtDate(date)}<br><b>Serie:</b> ${fmtDate(e.startDate)} - ${fmtDate(e.endDate)}<br><b>Giorni:</b> ${(e.weekdays||[]).map(n=>['','Lun','Mar','Mer','Gio','Ven','Sab','Dom'][n]).join(', ')}</p>`
      : `<p><b>Data:</b> ${fmtDate(current.date||date)}</p>`;
    const callBtns = current.type==='Partita'
      ? `<button class="btn secondary" onclick="openCallupFromCalendarEvent('${id}','${date}')">Crea/Modifica convocazione</button> <button class="btn secondary" onclick="openStatsFromCalendarEvent('${id}','${date}')">Stats partita</button>`
      : '';
    const occurrenceBtns = isWeekly
      ? `<button class="btn primary" onclick="openEventOccurrenceForm('${id}','${date}')">Modifica solo questa data</button> <button class="btn danger" onclick="cancelEventOccurrence('${id}','${date}')">Elimina solo questa data</button> <button class="btn secondary" onclick="openEventForm('${id}')">Modifica intera serie</button> <button class="btn danger" onclick="deleteEvent('${id}')">Elimina intera serie</button>`
      : `<button class="btn primary" onclick="openEventForm('${id}')">Modifica</button> <button class="btn danger" onclick="deleteEvent('${id}')">Elimina</button>`;
    openModal(`<h2>${esc(eventDisplayTitle(current))}</h2>
      <p><b>Tipo:</b> ${esc(current.type)} | <b>Squadra:</b> ${esc(current.team||'')}</p>
      ${current.type==='Partita'?`<p><b>Orario convocazione:</b> ${esc(current.meetingTime||current.convocationTime||'')}</p>`:''}
      <p><b>Orario inizio:</b> ${esc(current.start||'')} ${current.end?'- '+esc(current.end):''}</p>
      ${rep}
      <p><b>Luogo:</b> ${esc(current.location||'')}</p>
      ${current.address?`<p><b>Indirizzo:</b> ${esc(current.address)}</p>`:''}
      <p><b>Note:</b><br>${esc(current.notes||'')}</p>
      ${staffMode?`<div class="row">${callBtns} ${occurrenceBtns}</div>`:callBtns}`);
    return;
  }
  if(source==='training'){
    const t=state.trainings.find(x=>x.id===id); if(!t){ alert('Allenamento non trovato.'); return; }
    openModal(`<h2>Allenamento ${esc(t.team)}</h2><p><b>Data:</b> ${fmtDate(t.date)} | <b>Orario:</b> ${esc(t.start||'')} - ${esc(t.end||'')}</p><p><b>Luogo:</b> ${esc(t.location||'')}</p><p><b>Note:</b><br>${esc(t.notes||'')}</p>${staffMode?`<button class="btn primary" onclick="openTrainingForm('${id}')">Modifica</button> <button class="btn danger" onclick="delTraining('${id}'); closeModal();">Elimina</button>`:''}`);
    return;
  }
  if(source==='match'){
    const m=state.matches.find(x=>x.id===id); if(!m){ alert('Partita non trovata.'); return; }
    openModal(`<h2>${esc(m.team)} vs ${esc(m.opponent)}</h2>
      <p><b>Competizione:</b> ${esc(m.competition||'')}</p>
      <p><b>Data:</b> ${fmtDate(m.date)}</p>
      <p><b>Convocazione:</b> ${esc(m.meetingTime||'')} ${m.meetingPlace?'- '+esc(m.meetingPlace):''}</p>
      <p><b>Gara:</b> ${esc(m.matchTime||'')} ${m.matchEnd?'- '+esc(m.matchEnd):''}</p>
      <p><b>Campo:</b> ${esc(m.fieldName||m.meetingPlace||'')}<br>${esc(m.fieldAddress||'')}</p>
      <p><b>Note:</b><br>${esc(m.notes||'')}</p>
      ${staffMode?`<div class="row"><button class="btn primary" onclick="openMatchForm('${id}')">Modifica</button> <button class="btn secondary" onclick="openCallupForm('${id}')">Convoca</button> <button class="btn secondary" onclick="openMatchStats('${id}')">Stats</button> <button class="btn danger" onclick="deleteMatchDeep('${id}')">Elimina</button></div>`:''}`);
    return;
  }
  if(source==='callup'){
    const c=state.callups.find(x=>x.id===id); const m=state.matches.find(x=>x.id===c?.matchId); if(!c||!m){ alert('Convocazione non trovata.'); return; }
    const d=getCallupPdfData(c,m);
    openModal(`<h2>Convocazione ${esc(d.teamTitle)}</h2><p><b>Gara:</b> ${esc(d.game)}</p><p><b>Data:</b> ${fmtDate(d.date)}</p><p><b>Convocazione:</b> ${esc(d.meetingTime||'')}</p><p><b>Inizio gara:</b> ${esc(d.matchTime||'')}</p><p><b>Luogo:</b> ${esc(d.field||'')}</p><p><b>Note:</b><br>${esc(d.notes||'')}</p><button class="btn primary" onclick="printCallup('${id}')">PDF/Stampa</button>${staffMode?` <button class="btn secondary" onclick="openCallupForm('${m.id}')">Modifica PDF/convocati</button> <button class="btn danger" onclick="deleteCallup('${id}')">Elimina</button>`:''}`);
    return;
  }
  alert('Elemento calendario non riconosciuto.');
}

function eventRow(e, actions=''){
  return `<tr><td>${fmtDate(e.occurrenceDate)} ${esc(e.time||'')}</td><td>${esc(e.team||'')}</td><td><b>${esc(e.title)}</b><br><span class="muted">${esc(e.type||'')}</span></td><td>${esc(e.location||'')}</td><td>${actions || `<button class="btn secondary" onclick="openCalendarItem('${esc(e.source)}','${esc(e.id)}','${esc(e.occurrenceDate)}')">Dettagli</button>`}</td></tr>`;
}

// ===== v18: statistiche modificabili da sezione Statistiche + ricerca convocati =====
function statMatchLabel(s){
  const m=(state.matches||[]).find(x=>x.id===s.matchId);
  if(m) return `${fmtDate(m.date)} - ${m.team} vs ${m.opponent}`;
  return s.manualLabel || s.notes || 'Correzione manuale';
}
function openPlayerStatsEditor(playerId){
  const p=(state.players||[]).find(x=>x.id===playerId); if(!p){alert('Giocatore non trovato.');return;}
  const rows=(state.matchStats||[]).filter(s=>s.playerId===playerId).map(s=>statEditRow(s)).join('');
  openModal(`<h2>Modifica statistiche - ${esc(p.lastName)} ${esc(p.firstName)}</h2>
    <p class="muted">Qui puoi correggere eventuali errori senza rientrare per forza nella singola partita. Le modifiche aggiornano subito le statistiche individuali.</p>
    <div class="table-wrap"><table class="table" id="playerStatsEditTable">
      <thead><tr><th>Evento / partita</th><th>Giocata</th><th>Gol</th><th>Assist</th><th>Gol subiti</th><th>Rigori parati</th><th>Gialli</th><th>Rossi</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="9">Nessuna statistica registrata.</td></tr>'}</tbody>
    </table></div>
    <br>
    <button class="btn secondary" onclick="addManualStatsRow('${playerId}')">+ Aggiungi correzione manuale</button>
    <button class="btn primary" onclick="savePlayerStatsEditor('${playerId}')">Salva modifiche</button>`);
}
function statEditRow(s){
  const id=s.id||uid();
  const label=statMatchLabel(s);
  const isManual=String(s.matchId||'').startsWith('manual-');
  const p=(state.players||[]).find(x=>x.id===s.playerId);
  const isGk=(p?.roles||[]).includes('Portiere');
  return `<tr data-statrow="${esc(id)}" data-matchid="${esc(s.matchId||'')}" data-playerid="${esc(s.playerId||'')}">
    <td>${isManual?`<input data-stat-label="${esc(id)}" value="${esc(label)}" placeholder="Es. recupero partita / correzione">`:esc(label)}</td>
    <td><input type="checkbox" data-stat-played="${esc(id)}" ${s.played?'checked':''}></td>
    <td><input type="number" min="0" data-stat-goals="${esc(id)}" value="${Number(s.goals||0)}" style="width:64px"></td>
    <td><input type="number" min="0" data-stat-assists="${esc(id)}" value="${Number(s.assists||0)}" style="width:64px"></td>
    <td><input type="number" min="0" data-stat-conceded="${esc(id)}" value="${Number(s.goalsConceded||0)}" style="width:64px" ${isGk?'':'disabled'}></td>
    <td><input type="number" min="0" data-stat-penalties="${esc(id)}" value="${Number(s.penaltiesSaved||0)}" style="width:64px" ${isGk?'':'disabled'}></td>
    <td><input type="number" min="0" data-stat-yellow="${esc(id)}" value="${Number(s.yellowCards ?? s.yellow_cards ?? 0)}" style="width:64px"></td>
    <td><input type="number" min="0" data-stat-red="${esc(id)}" value="${Number(s.redCards ?? s.red_cards ?? 0)}" style="width:64px"></td>
    <td><button class="btn danger" onclick="removeStatsEditorRow('${esc(id)}')">Rimuovi</button></td>
  </tr>`;
}
function addManualStatsRow(playerId){
  const s={id:uid(),matchId:'manual-'+uid(),playerId,played:false,goals:0,assists:0,goalsConceded:0,penaltiesSaved:0,yellowCards:0,redCards:0,manualLabel:'Correzione manuale'};
  const tbody=q('#playerStatsEditTable tbody');
  if(tbody){
    if(tbody.innerHTML.includes('Nessuna statistica registrata')) tbody.innerHTML='';
    tbody.insertAdjacentHTML('beforeend', statEditRow(s));
  }
}
function removeStatsEditorRow(id){
  const tr=q(`[data-statrow="${CSS.escape(id)}"]`);
  if(tr) tr.dataset.delete='1', tr.style.display='none';
}
function savePlayerStatsEditor(playerId){
  const rows=qa('[data-statrow]');
  rows.forEach(tr=>{
    const id=tr.dataset.statrow;
    if(tr.dataset.delete==='1'){
      state.matchStats=(state.matchStats||[]).filter(s=>s.id!==id);
      return;
    }
    const existing=(state.matchStats||[]).find(s=>s.id===id);
    const obj={
      id,
      matchId: tr.dataset.matchid || ('manual-'+uid()),
      playerId,
      played: q(`[data-stat-played="${CSS.escape(id)}"]`)?.checked || false,
      goals: Number(q(`[data-stat-goals="${CSS.escape(id)}"]`)?.value || 0),
      assists: Number(q(`[data-stat-assists="${CSS.escape(id)}"]`)?.value || 0),
      goalsConceded: Number(q(`[data-stat-conceded="${CSS.escape(id)}"]`)?.value || 0),
      penaltiesSaved: Number(q(`[data-stat-penalties="${CSS.escape(id)}"]`)?.value || 0),
      yellowCards: Number(q(`[data-stat-yellow="${CSS.escape(id)}"]`)?.value || 0),
      redCards: Number(q(`[data-stat-red="${CSS.escape(id)}"]`)?.value || 0),
      manualLabel: q(`[data-stat-label="${CSS.escape(id)}"]`)?.value || existing?.manualLabel || '',
      notes: existing?.notes || ''
    };
    const idx=(state.matchStats||[]).findIndex(s=>s.id===id);
    if(idx>=0) state.matchStats[idx]=obj; else state.matchStats.push(obj);
  });
  recomputeSuspensionForPlayer(playerId);
  save(); closeModal(); renderAll(); showView('stats');
}
function recomputeSuspensionForPlayer(playerId){
  const p=(state.players||[]).find(x=>x.id===playerId); if(!p) return;
  const ms=(state.matchStats||[]).filter(s=>s.playerId===playerId);
  const yellows=ms.reduce((a,s)=>a+Number(s.yellowCards ?? s.yellow_cards ?? 0),0);
  const reds=ms.reduce((a,s)=>a+Number(s.redCards ?? s.red_cards ?? 0),0);
  if(reds>0){ p.suspendedNext=true; p.suspensionReason='cartellino rosso'; }
  else if(yellows>0 && yellows%4===0){ p.suspendedNext=true; p.suspensionReason='4° cartellino giallo'; }
  else if(p.suspensionReason==='cartellino rosso' || p.suspensionReason==='4° cartellino giallo'){
    p.suspendedNext=false; p.suspensionReason='';
  }
}
function renderStats(){
  const rows=(state.players||[]).map(p=>{
    const ms=(state.matchStats||[]).filter(s=>s.playerId===p.id);
    const played=ms.filter(s=>s.played).length;
    const goals=ms.reduce((a,s)=>a+Number(s.goals||0),0);
    const assists=ms.reduce((a,s)=>a+Number(s.assists||0),0);
    const conceded=ms.reduce((a,s)=>a+Number(s.goalsConceded||0),0);
    const penalties=ms.reduce((a,s)=>a+Number(s.penaltiesSaved||0),0);
    const att=(state.attendance||[]).filter(a=>a.playerId===p.id);
    const pres=att.filter(a=>a.status==='Presente').length;
    const abs=att.filter(a=>a.status?.startsWith('Assente')).length;
    const disc=playerDiscipline(p);
    const isGk=(p.roles||[]).includes('Portiere');
    return `<tr><td><b>${esc(p.lastName)} ${esc(p.firstName)}</b><br>${(p.teams||[]).map(t=>`<span class="pill">${esc(t)}</span>`).join('')} ${disc.badges} ${p.suspendedNext&&staffMode?`<button class="btn secondary" onclick="clearSuspension('${p.id}')">Squalifica scontata</button>`:''}</td><td>${played}</td><td>${goals}</td><td>${assists}</td><td>${isGk?conceded:'-'}</td><td>${isGk?penalties:'-'}</td><td>${disc.yellows}</td><td>${disc.reds}</td><td>${pres}</td><td>${abs}</td><td>${staffMode?`<button class="btn secondary" onclick="openPlayerStatsEditor('${p.id}')">Modifica</button>`:''}</td></tr>`;
  }).join('');
  byId('stats').innerHTML=`<div class="card"><h2>Statistiche individuali</h2><p class="muted">In modalità staff puoi correggere le statistiche del singolo giocatore dal pulsante “Modifica”.</p><div class="table-wrap"><table class="table"><thead><tr><th>Giocatore</th><th>Partite</th><th>Gol</th><th>Assist</th><th>Gol subiti</th><th>Rigori parati</th><th>Gialli</th><th>Rossi</th><th>Pres. all.</th><th>Assenze</th><th>Azioni</th></tr></thead><tbody>${rows||'<tr><td colspan="11">Nessun giocatore.</td></tr>'}</tbody></table></div></div>`;
}
function filterCallupPlayers(){
  const val=(byId('callupPlayerSearch')?.value||'').toLowerCase().trim();
  qa('.callup-player-option').forEach(el=>{
    const ok=(el.dataset.search||'').includes(val);
    el.style.display=ok?'inline-flex':'none';
  });
}
function openCallupForm(matchId){
  const m=(state.matches||[]).find(x=>x.id===matchId); if(!m){alert('Partita non trovata.');return;}
  const players=(state.players||[]).filter(p=>(p.teams||[]).includes(m.team)).sort((a,b)=>(a.lastName+a.firstName).localeCompare(b.lastName+b.firstName));
  const old=(state.callups||[]).find(c=>c.matchId===matchId);
  const data=getCallupPdfData(old,m);
  const checks=players.map(p=>{
    const disc=playerDiscipline(p); const blocked=!!p.suspendedNext;
    const search=`${p.lastName} ${p.firstName} ${(p.roles||[]).join(' ')} ${(p.teams||[]).join(' ')} ${p.dominantFoot||''}`.toLowerCase();
    return `<label class="pill callup-player-option ${blocked?'danger':''}" data-search="${esc(search)}"><input type="checkbox" name="callPlayers" value="${p.id}" ${old?.playerIds?.includes(p.id)?'checked':''} ${blocked?'disabled':''}> ${esc(p.lastName)} ${esc(p.firstName)} <span class="muted">${esc((p.roles||[]).join('/'))}</span> ${blocked?' - SQUALIFICATO':''} ${disc.badges}</label>`;
  }).join('');
  openModal(`<h2>${old?'Modifica convocazione':'Crea convocazione'} - ${esc(m.team)} vs ${esc(m.opponent)}</h2>
    <h3>Giocatori convocati</h3>
    <div class="field"><label>Cerca giocatore</label><input id="callupPlayerSearch" placeholder="Scrivi nome, cognome o ruolo..." oninput="filterCallupPlayers()"></div>
    <div class="row callup-list">${checks||'<p>Nessun giocatore disponibile per questa squadra.</p>'}</div>
    <hr>
    <h3>Campi editabili del PDF</h3>
    <p class="muted">Questi campi modificano solo la convocazione/PDF, senza cambiare l'evento calendario originale.</p>
    <div class="row">
      <div class="field"><label>Titolo squadra in alto</label><input id="pdfTeamTitle" value="${esc(data.teamTitle)}"></div>
      <div class="field"><label>Tipo convocazione / competizione</label><input id="pdfCompetition" value="${esc(data.competition)}"></div>
    </div>
    <div class="field"><label>Gara / partita</label><input id="pdfGame" value="${esc(data.game)}"></div>
    <div class="row">
      <div class="field"><label>Data</label><input id="pdfDate" type="date" value="${esc(data.date)}"></div>
      <div class="field"><label>Ora convocazione / ritrovo</label><input id="pdfMeetingTime" type="time" value="${esc(data.meetingTime)}"></div>
      <div class="field"><label>Ora inizio gara</label><input id="pdfMatchTime" type="time" value="${esc(data.matchTime)}"></div>
      <div class="field"><label>Ora fine prevista</label><input id="pdfMatchEnd" type="time" value="${esc(data.matchEnd)}"></div>
    </div>
    <div class="row">
      <div class="field"><label>Campo / luogo</label><input id="pdfField" value="${esc(data.field)}"></div>
      <div class="field"><label>Indirizzo campo</label><input id="pdfAddress" value="${esc(data.address)}"></div>
    </div>
    <div class="row">
      <div class="field"><label>Divisa</label><input id="pdfKit" value="${esc(data.kit)}"></div>
      <div class="field"><label>Staff / dirigente / allenatore</label><input id="pdfStaff" value="${esc(data.staff)}"></div>
    </div>
    <div class="field"><label>Note da stampare nel PDF</label><textarea id="pdfNotes">${esc(data.notes)}</textarea></div>
    <br>
    <button class="btn primary" onclick="saveCallup('${matchId}', false)">Salva convocazione</button>
    <button class="btn secondary" onclick="saveCallup('${matchId}', true)">Salva e stampa PDF</button>`);
}



/* =========================================================
   v20 - Manutenzione dati / Ricostruzione statistiche
   ========================================================= */

function convocaGetState(){
  try {
    if (typeof state !== "undefined") return state;
    if (typeof appState !== "undefined") return appState;
    if (typeof store !== "undefined") return store;
  } catch(e){}
  return null;
}

function convocaArray(obj, key){
  if (!obj) return [];
  if (!Array.isArray(obj[key])) obj[key] = [];
  return obj[key];
}

function convocaExistingIds(arr){
  return new Set((arr || []).map(x => String(x.id)));
}

function convocaCleanOrphanRecords(){
  const s = convocaGetState();
  if (!s) {
    alert("Non riesco a leggere i dati dell'app. Ricarica la pagina e riprova.");
    return;
  }

  const trainings = convocaArray(s, "trainings");
  const matches = convocaArray(s, "matches");
  const players = convocaArray(s, "players");
  const calendarEvents = convocaArray(s, "calendarEvents");
  const attendance = convocaArray(s, "attendance");
  const trainingAttendance = convocaArray(s, "trainingAttendance");
  const matchStats = convocaArray(s, "matchStats");
  const playerStats = convocaArray(s, "playerStats");
  const callups = convocaArray(s, "callups");

  const trainingIds = convocaExistingIds(trainings);
  const matchIds = convocaExistingIds(matches);
  const playerIds = convocaExistingIds(players);
  const eventIds = convocaExistingIds(calendarEvents);
  const callupIds = convocaExistingIds(callups);

  const before = {
    attendance: attendance.length,
    trainingAttendance: trainingAttendance.length,
    matchStats: matchStats.length,
    playerStats: playerStats.length,
    callups: callups.length
  };

  // Presenze allenamento: elimina record senza allenamento o senza giocatore.
  s.attendance = attendance.filter(a => {
    const tid = String(a.trainingId || a.training_id || a.eventId || a.event_id || "");
    const pid = String(a.playerId || a.player_id || "");
    return (!tid || trainingIds.has(tid) || eventIds.has(tid)) && (!pid || playerIds.has(pid));
  });

  s.trainingAttendance = trainingAttendance.filter(a => {
    const tid = String(a.trainingId || a.training_id || a.eventId || a.event_id || "");
    const pid = String(a.playerId || a.player_id || "");
    return (!tid || trainingIds.has(tid) || eventIds.has(tid)) && (!pid || playerIds.has(pid));
  });

  // Statistiche partita: elimina record senza partita/evento partita o senza giocatore.
  s.matchStats = matchStats.filter(ms => {
    const mid = String(ms.matchId || ms.match_id || ms.eventId || ms.event_id || "");
    const pid = String(ms.playerId || ms.player_id || "");
    return (!mid || matchIds.has(mid) || eventIds.has(mid)) && (!pid || playerIds.has(pid));
  });

  // Convocazioni: elimina quelle collegate a partite/eventi inesistenti.
  s.callups = callups.filter(c => {
    const mid = String(c.matchId || c.match_id || c.eventId || c.event_id || "");
    return !mid || matchIds.has(mid) || eventIds.has(mid);
  });

  const after = {
    attendance: s.attendance.length,
    trainingAttendance: s.trainingAttendance.length,
    matchStats: s.matchStats.length,
    playerStats: playerStats.length,
    callups: s.callups.length
  };

  convocaRebuildStatsFromExistingData(false);

  if (typeof save === "function") save();
  if (typeof render === "function") render();
  if (typeof renderStats === "function") renderStats();

  alert(
    "Pulizia completata.\n\n" +
    "Record presenze rimossi: " + ((before.attendance + before.trainingAttendance) - (after.attendance + after.trainingAttendance)) + "\n" +
    "Record statistiche partita rimossi: " + (before.matchStats - after.matchStats) + "\n" +
    "Convocazioni orfane rimosse: " + (before.callups - after.callups) + "\n\n" +
    "Le statistiche sono state ricostruite dagli eventi ancora presenti."
  );
}

function convocaRebuildStatsFromExistingData(showAlert=true){
  const s = convocaGetState();
  if (!s) {
    alert("Non riesco a leggere i dati dell'app. Ricarica la pagina e riprova.");
    return;
  }

  const players = convocaArray(s, "players");
  const trainings = convocaArray(s, "trainings");
  const matches = convocaArray(s, "matches");
  const calendarEvents = convocaArray(s, "calendarEvents");
  const attendance = [
    ...convocaArray(s, "attendance"),
    ...convocaArray(s, "trainingAttendance")
  ];
  const matchStats = convocaArray(s, "matchStats");

  const trainingIds = convocaExistingIds(trainings);
  const matchIds = convocaExistingIds(matches);
  const eventIds = convocaExistingIds(calendarEvents);

  const statsByPlayer = {};
  players.forEach(p => {
    const id = String(p.id);
    statsByPlayer[id] = {
      playerId: p.id,
      presenzeAllenamento: 0,
      assenzeAllenamento: 0,
      ritardi: 0,
      partiteGiocate: 0,
      gol: 0,
      assist: 0,
      golSubiti: 0,
      rigoriParati: 0,
      cartelliniGialli: 0,
      cartelliniRossi: 0,
      manualNote: ""
    };
  });

  const countedTrainingPresence = new Set();
  attendance.forEach(a => {
    const pid = String(a.playerId || a.player_id || "");
    if (!statsByPlayer[pid]) return;

    const tid = String(a.trainingId || a.training_id || a.eventId || a.event_id || "");
    if (tid && !(trainingIds.has(tid) || eventIds.has(tid))) return;

    const key = pid + "|" + tid;
    if (countedTrainingPresence.has(key)) return;
    countedTrainingPresence.add(key);

    const status = String(a.status || a.presence || "").toLowerCase();
    if (status.includes("present") || status === "p" || status.includes("presente")) {
      statsByPlayer[pid].presenzeAllenamento += 1;
    } else if (status.includes("ritard")) {
      statsByPlayer[pid].presenzeAllenamento += 1;
      statsByPlayer[pid].ritardi += 1;
    } else if (status.includes("assen") || status.includes("infortun") || status.includes("no")) {
      statsByPlayer[pid].assenzeAllenamento += 1;
    }
  });

  const countedMatch = new Set();
  matchStats.forEach(ms => {
    const pid = String(ms.playerId || ms.player_id || "");
    if (!statsByPlayer[pid]) return;

    const mid = String(ms.matchId || ms.match_id || ms.eventId || ms.event_id || "");
    if (mid && !(matchIds.has(mid) || eventIds.has(mid))) return;

    const played = ms.played === true || ms.played === "true" || ms.played === 1 || ms.played === "1";
    const key = pid + "|" + mid;
    if (played && !countedMatch.has(key)) {
      statsByPlayer[pid].partiteGiocate += 1;
      countedMatch.add(key);
    }

    statsByPlayer[pid].gol += Number(ms.goals ?? ms.gol ?? 0) || 0;
    statsByPlayer[pid].assist += Number(ms.assists ?? ms.assist ?? 0) || 0;
    statsByPlayer[pid].golSubiti += Number(ms.goalsAgainst ?? ms.golSubiti ?? ms.goals_against ?? 0) || 0;
    statsByPlayer[pid].rigoriParati += Number(ms.penaltiesSaved ?? ms.rigoriParati ?? ms.penalties_saved ?? 0) || 0;
    statsByPlayer[pid].cartelliniGialli += Number(ms.yellowCards ?? ms.yellow_cards ?? ms.cartelliniGialli ?? 0) || 0;
    statsByPlayer[pid].cartelliniRossi += Number(ms.redCards ?? ms.red_cards ?? ms.cartelliniRossi ?? 0) || 0;
  });

  // Mantieni eventuali correzioni manuali se già previste dall'app.
  const oldManual = {};
  convocaArray(s, "playerStats").forEach(ps => {
    const pid = String(ps.playerId || ps.player_id || ps.id || "");
    oldManual[pid] = ps;
  });

  s.playerStats = Object.values(statsByPlayer).map(base => {
    const old = oldManual[String(base.playerId)] || {};
    const manualKeys = [
      "manualPresenzeAllenamento","manualAssenzeAllenamento","manualRitardi",
      "manualPartiteGiocate","manualGol","manualAssist","manualGolSubiti",
      "manualRigoriParati","manualCartelliniGialli","manualCartelliniRossi",
      "manualNote"
    ];
    manualKeys.forEach(k => {
      if (old[k] !== undefined) base[k] = old[k];
    });
    return base;
  });

  if (typeof save === "function") save();
  if (typeof render === "function") render();
  if (typeof renderStats === "function") renderStats();

  if (showAlert) alert("Statistiche ricostruite dagli allenamenti, partite ed eventi ancora presenti.");
}

function convocaResetTrainingStatsOnly(){
  const s = convocaGetState();
  if (!s) return alert("Non riesco a leggere i dati dell'app.");
  if (!confirm("Azzerare solo presenze/assenze/ritardi allenamento e ricostruirli dagli allenamenti ancora presenti?")) return;
  convocaArray(s, "playerStats").forEach(ps => {
    ps.presenzeAllenamento = 0;
    ps.assenzeAllenamento = 0;
    ps.ritardi = 0;
    ps.manualPresenzeAllenamento = 0;
    ps.manualAssenzeAllenamento = 0;
    ps.manualRitardi = 0;
  });
  convocaRebuildStatsFromExistingData(false);
  alert("Presenze allenamento ricostruite.");
}

// Pulsanti rapidi nella sezione statistiche, senza dipendere troppo dal markup esistente.
function convocaInjectMaintenanceButtons(){
  const possible = document.querySelector("#statsView, #view-stats, [data-view='stats'], .view.active");
  const target = document.querySelector("#statsView") || document.querySelector("#view-stats") || document.querySelector("[data-view='stats']") || null;
  const container = target || document.body;
  if (document.getElementById("maintenanceStatsBox")) return;
  const box = document.createElement("div");
  box.id = "maintenanceStatsBox";
  box.className = "card span-12";
  box.style.margin = "14px 0";
  box.innerHTML = `
    <h3>Manutenzione statistiche</h3>
    <p class="muted">Serve quando restano presenze o statistiche collegate a eventi/allenamenti/partite che sono stati cancellati. Ricostruisce i conteggi partendo solo dai dati ancora esistenti.</p>
    <div class="row">
      <button class="btn primary" onclick="convocaCleanOrphanRecords()">Pulisci dati orfani + ricalcola statistiche</button>
      <button class="btn secondary" onclick="convocaRebuildStatsFromExistingData()">Ricalcola statistiche</button>
      <button class="btn danger" onclick="convocaResetTrainingStatsOnly()">Ricostruisci presenze allenamento</button>
    </div>
  `;
  const statsHeading = Array.from(document.querySelectorAll("h2,h3")).find(h => /stat/i.test(h.textContent || ""));
  if (statsHeading && statsHeading.parentElement) {
    statsHeading.parentElement.insertBefore(box, statsHeading.nextSibling);
  } else if (container.firstChild) {
    container.insertBefore(box, container.firstChild);
  } else {
    container.appendChild(box);
  }
}

// Prova a inserirli dopo ogni render/cambio schermata.
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(convocaInjectMaintenanceButtons, 800);
});
document.addEventListener("click", () => {
  setTimeout(convocaInjectMaintenanceButtons, 100);
});


/* v22 - Nota mobile calendario */
function convocaInjectMobileCalendarNote(){
  const calendar = document.querySelector(".calendar-grid");
  if (!calendar || document.getElementById("mobileCalendarNote")) return;
  const note = document.createElement("div");
  note.id = "mobileCalendarNote";
  note.className = "mobile-calendar-note";
  note.textContent = "Suggerimento: sul telefono tocca un evento per aprire il dettaglio completo con orari, luogo e note. Il calendario è compatto per evitare lo scorrimento laterale.";
  calendar.insertAdjacentElement("afterend", note);
}
document.addEventListener("DOMContentLoaded", () => setTimeout(convocaInjectMobileCalendarNote, 800));
document.addEventListener("click", () => setTimeout(convocaInjectMobileCalendarNote, 150));


/* v23 - Agenda mobile sotto al calendario */
function convocaBuildMobileAgenda(){
  const calendar = document.querySelector(".calendar-grid");
  if (!calendar) return;
  let box = document.getElementById("mobileAgenda");
  if (!box) {
    box = document.createElement("div");
    box.id = "mobileAgenda";
    box.className = "mobile-agenda";
    calendar.insertAdjacentElement("afterend", box);
  }

  const items = Array.from(calendar.querySelectorAll(".event")).slice(0, 30).map(ev => {
    const day = ev.closest(".day");
    const num = day ? (day.querySelector(".num")?.textContent || "").trim() : "";
    const text = (ev.textContent || "").trim();
    const tip = ev.getAttribute("data-tip") || "";
    return { num, text, tip };
  }).filter(x => x.text);

  if (!items.length) {
    box.innerHTML = "<h3>Agenda mese</h3><p class='muted'>Nessun evento visibile nel mese.</p>";
    return;
  }

  box.innerHTML = "<h3>Agenda mese</h3>" + items.map(x => {
    const cleanTip = x.tip.replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const cleanText = x.text.replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return `<div class="mobile-agenda-item">
      <div class="mobile-agenda-date">${x.num}</div>
      <div>
        <div class="mobile-agenda-title">${cleanText}</div>
        <div class="mobile-agenda-meta">${cleanTip || "Tocca l’evento nel calendario per aprire il dettaglio."}</div>
      </div>
    </div>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => setTimeout(convocaBuildMobileAgenda, 900));
document.addEventListener("click", () => setTimeout(convocaBuildMobileAgenda, 180));


/* v25 - strumenti cache/dati locali */
function convocaHardRefreshAssets(){
  if (!confirm("Vuoi forzare il ricaricamento dei file dell'app? I dati non verranno cancellati.")) return;
  try {
    if ("caches" in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => Promise.all(regs.map(r => r.unregister()))).finally(() => {
            location.href = location.pathname + "?v=25&fresh=" + Date.now();
          });
        } else {
          location.href = location.pathname + "?v=25&fresh=" + Date.now();
        }
      });
    } else {
      location.href = location.pathname + "?v=25&fresh=" + Date.now();
    }
  } catch(e) {
    location.href = location.pathname + "?v=25&fresh=" + Date.now();
  }
}

function convocaResetLocalDataOnly(){
  if (!confirm("ATTENZIONE: vuoi cancellare i dati locali salvati su questo telefono/browser? Fallo solo se stai vedendo dati vecchi/demo. I dati online Supabase, se configurati, non vengono cancellati.")) return;
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.toLowerCase().includes("convoca") || k.toLowerCase().includes("futsal") || k.toLowerCase().includes("team")) {
        localStorage.removeItem(k);
      }
    });
    alert("Dati locali cancellati. La pagina verrà ricaricata.");
    location.href = location.pathname + "?v=25&resetlocal=" + Date.now();
  } catch(e) {
    alert("Non sono riuscito a pulire i dati locali automaticamente.");
  }
}

function convocaInjectV25Tools(){
  if (document.getElementById("v25Tools")) return;
  const box = document.createElement("div");
  box.id = "v25Tools";
  box.className = "no-print";
  box.style.cssText = "position:fixed;left:8px;bottom:38px;z-index:9999;display:flex;gap:6px;flex-wrap:wrap;max-width:calc(100vw - 16px);";
  box.innerHTML = `
    <button class="btn secondary" style="font-size:10px;padding:6px 8px;border-radius:999px" onclick="convocaHardRefreshAssets()">Ricarica app</button>
    <button class="btn danger" style="font-size:10px;padding:6px 8px;border-radius:999px" onclick="convocaResetLocalDataOnly()">Reset dati locali</button>
  `;
  document.body.appendChild(box);
}
document.addEventListener("DOMContentLoaded", () => setTimeout(convocaInjectV25Tools, 800));
