// Fictional interactive shift simulator; no GPS permissions or network write calls.
const $=id=>document.getElementById(id);
const BASE=Date.UTC(2026,10,4,8,0,0);
let minute=285; // sample clock: 12:45 local (relative to a fixed demo day)
const seed=[
 {id:1,name:'דניאל כהן / Даниэль Коэн',job:'Контролёр',zone:'center',site:'Тель-Авив · Савидор',lat:32.0831,lng:34.7980,status:'active',start:65,worked:0,breaks:15,breakStart:null,lastChange:240},
 {id:2,name:'יוסי לוי / Йоси Леви',job:'Инспектор',zone:'north',site:'Нетания · Центральная',lat:32.3282,lng:34.8560,status:'active',start:15,worked:0,breaks:30,breakStart:null,lastChange:220},
 {id:3,name:'מיה אברהם / Майя Авраам',job:'Контролёр',zone:'center',site:'Петах-Тиква · Центр',lat:32.0867,lng:34.8876,status:'break',start:90,worked:0,breaks:0,breakStart:270,lastChange:270},
 {id:4,name:'אורן מזרחי / Орен Мизрахи',job:'Контролёр',zone:'south',site:'Ашдод · Автовокзал',lat:31.7977,lng:34.6503,status:'active',start:35,worked:0,breaks:20,breakStart:null,lastChange:250},
 {id:5,name:'נועה ברק / Ноа Барак',job:'Старший контролёр',zone:'center',site:'Рамат-Ган · Алмазная биржа',lat:32.0841,lng:34.8037,status:'ended',start:0,end:210,worked:190,breaks:20,breakStart:null,lastChange:210},
 {id:6,name:'עמית שלום / Амит Шалом',job:'Контролёр',zone:'north',site:'Хайфа · Мерказит',lat:32.7935,lng:34.9986,status:'off',start:null,worked:0,breaks:0,breakStart:null,lastChange:0}
];
let staff=[],events=[],selected=1,map,layer;
function stamp(m){const d=new Date(BASE+m*60000);return d.toLocaleTimeString('ru-RU',{timeZone:'UTC',hour:'2-digit',minute:'2-digit'});}
function hours(m){m=Math.max(0,Math.floor(m));return Math.floor(m/60)+':'+String(m%60).padStart(2,'0');}
function clone(){return structuredClone(seed);}
function paid(w){if(w.start==null)return 0;const end=w.status==='ended'?w.end:minute;const completedBreak=w.breaks||0;const openBreak=w.status==='break'?Math.max(0,minute-w.breakStart):0;return Math.max(0,end-w.start-completedBreak-openBreak);}
function breakTime(w){return w.breaks+(w.status==='break'?Math.max(0,minute-w.breakStart):0);}
function event(worker,action){events.unshift({at:minute,name:worker.name.split('/')[1]?.trim()||worker.name,action});if(events.length>80)events.pop();}
function reset(){minute=285;staff=clone();events=[];selected=1;for(const x of staff){if(x.status!=='off')events.unshift({at:x.lastChange,name:x.name.split('/')[1]?.trim()||x.name,action:x.status==='break'?'Перерыв':x.status==='ended'?'Завершил смену':'На рабочем месте'});}render();}
function action(id,type){
 const w=staff.find(x=>x.id===id);if(!w)return;
 if(type==='start'&&w.status==='off'){w.status='active';w.start=minute;w.end=undefined;w.breaks=0;w.breakStart=null;event(w,'Начал работу');}
 else if(type==='pause'&&w.status==='active'){w.status='break';w.breakStart=minute;event(w,'Вышел на перерыв');}
 else if(type==='resume'&&w.status==='break'){w.breaks+=minute-w.breakStart;w.breakStart=null;w.status='active';event(w,'Вернулся с перерыва');}
 else if(type==='end'&&(w.status==='active'||w.status==='break')){if(w.status==='break'){w.breaks+=minute-w.breakStart;w.breakStart=null;}w.status='ended';w.end=minute;event(w,'Завершил смену');}
 render();
}
function status(w){return w.status==='active'?'Работает':w.status==='break'?'На перерыве':w.status==='ended'?'Смена завершена':'Не на смене';}
function createButton(label,disabled,handler,primary=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.className=primary?'primary':'';b.addEventListener('click',handler);return b;}
function renderStats(){
 $('working').textContent=staff.filter(x=>x.status==='active').length;
 $('breaks').textContent=staff.filter(x=>x.status==='break').length;
 $('hours').textContent=hours(staff.reduce((s,x)=>s+paid(x),0));
 $('ended').textContent=staff.filter(x=>x.status==='ended').length;
}
function renderPeople(){
 const zone=$('zone').value,filtered=staff.filter(w=>zone==='all'||w.zone===zone);
 $('teamcount').textContent=filtered.length+' человек';
 const list=$('workers');list.replaceChildren();
 filtered.forEach(w=>{
  const b=document.createElement('button');b.className='person'+(w.id===selected?' selected':'');
  const info=document.createElement('div'),label=document.createElement('strong');label.textContent=w.name.split('/')[1]?.trim()||w.name;
  const sub=document.createElement('small');sub.textContent=w.site+' · '+hours(paid(w))+' ч';
  info.append(label,sub);
  const s=document.createElement('span');s.className='pill '+(w.status==='active'?'active':w.status==='break'?'break':'ended');s.textContent=status(w);
  b.append(info,s);b.onclick=()=>{selected=w.id;render();if(map&&w.status==='active')map.setView([w.lat,w.lng],14);};
  list.append(b);
 });
 const w=staff.find(x=>x.id===selected);
 if(!w){$('detail').textContent='Выбери сотрудника';return;}
 const box=$('detail');box.replaceChildren();const title=document.createElement('h3');title.textContent=w.name.split('/')[1]?.trim()||w.name;
 const p=document.createElement('p');p.textContent=w.job+' · '+w.site+' · Смена: '+(w.start==null?'—':stamp(w.start))+' · Работа '+hours(paid(w))+' · Перерывы '+hours(breakTime(w));
 const controls=document.createElement('div');controls.className='controls';
 controls.append(createButton('Начать смену',w.status!=='off',()=>action(w.id,'start'),true),
 createButton('Перерыв',w.status!=='active',()=>action(w.id,'pause')),
 createButton('Вернуться',w.status!=='break',()=>action(w.id,'resume')),
 createButton('Завершить',!['active','break'].includes(w.status),()=>action(w.id,'end')));
 box.append(title,p,controls);
}
function initMap(){
 if(map||typeof L==='undefined')return;
 map=L.map('map',{scrollWheelZoom:false}).setView([32.18,34.85],9);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(map);
 layer=L.layerGroup().addTo(map);
}
function renderMap(){
 initMap();if(!layer)return;
 layer.clearLayers();const zone=$('zone').value;
 for(const w of staff){
  if(w.status!=='active'||(zone!=='all'&&w.zone!==zone))continue;
  const marker=L.circleMarker([w.lat,w.lng],{radius:w.id===selected?12:9,color:'#f4d394',fillColor:'#bc493f',fillOpacity:1,weight:3}).addTo(layer);
  const node=document.createElement('div');const strong=document.createElement('strong');strong.textContent=w.name.split('/')[1]?.trim()||w.name;
  const p=document.createElement('p');p.textContent=w.site+' · '+hours(paid(w))+' ч · ДЕМО GPS';
  node.append(strong,p);marker.bindPopup(node);marker.on('click',()=>{selected=w.id;renderPeople();});
 }
}
function renderTimesheet(){
 const body=$('timesheet');body.replaceChildren();
 for(const w of staff){
  const row=document.createElement('tr');
  const fields=[w.name.split('/')[1]?.trim()||w.name,w.site,w.start==null?'—':stamp(w.start),hours(breakTime(w)),hours(paid(w)),w.status==='ended'?stamp(w.end):'—'];
  fields.forEach(t=>{const c=document.createElement('td');c.textContent=t;row.append(c);});body.append(row);
 }
}
function renderEvents(){
 const box=$('events');box.replaceChildren();
 for(const e of [...events].sort((a,b)=>b.at-a.at).slice(0,8)){
  const item=document.createElement('div');item.className='event';const time=document.createElement('time');time.textContent=stamp(e.at);
  const text=document.createElement('span');text.textContent=e.name+' — '+e.action;item.append(time,text);box.append(item);
 }
}
function render(){renderStats();renderPeople();renderMap();renderTimesheet();renderEvents();}
function csv(){
 const rows=[['Сотрудник','Место работы','Вход','Перерыв (мин)','Работа (мин)','Выход'],
 ...staff.map(w=>[w.name.split('/')[1]?.trim()||w.name,w.site,w.start==null?'':stamp(w.start),breakTime(w),paid(w),w.status==='ended'?stamp(w.end):''])];
 const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='brill-staff-demo-timesheet.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('advance').onclick=()=>{minute+=15;render();};$('reset').onclick=reset;$('zone').onchange=()=>{renderPeople();renderMap();};$('export').onclick=csv;
reset();
