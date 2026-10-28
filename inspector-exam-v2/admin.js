/* BRILL TEAM PROJECT / Electra Afikim. Dedicated manager, HR and owner workspace. */
(()=>{
'use strict';
const root=document.getElementById('root');
const state={admin:null,policy:null,view:'list',page:1,size:20,search:'',filter:'all',request:0,review:null,busy:false};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const letters=['א','ב','ג','ד'];
const workerUrl='https://test.brillteamp.com/';
const dateFmt=value=>value?new Date(value).toLocaleDateString('he-IL',{year:'numeric',month:'short',day:'numeric'}):'—';
const adminRole=role=>({owner:'בעל המערכת',manager:'מנהל',hr:'משאבי אנוש'}[role]||role);
const statuses={assigned:'הוזמן למבחן',in_progress:'במהלך הבחינה',submitted:'הוגש לבדיקה'};
const decisions={accepted:'אושר',rejected:'לא אושר',follow_up:'נדרשת בדיקה נוספת'};
const resultLabel=c=>c.decision?decisions[c.decision]||c.decision:(c.status==='submitted'?'ממתין להחלטה':statuses[c.status]||'ממתין');
const canReview=()=>state.admin&&['owner','manager'].includes(state.admin.role);
const input=(label,id,opts={})=>`<label class="manager-field" for="${id}"><span>${esc(label)}</span><input id="${id}" name="${id}" type="${opts.type||'text'}" ${opts.numeric?'inputmode="numeric" dir="ltr"':''} ${opts.attrs||''} ${opts.placeholder?'placeholder="'+esc(opts.placeholder)+'"':''} autocomplete="${opts.autocomplete||'off'}" required><small>${esc(opts.hint||'')}</small></label>`;
const select=(label,id,options)=>`<label class="manager-field" for="${id}"><span>${label}</span><select id="${id}">${options.map(x=>`<option value="${x[0]}">${esc(x[1])}</option>`).join('')}</select></label>`;
function buttons(text,type='submit'){return `<button type="${type}" class="manager-primary"><span>${esc(text)}</span><span aria-hidden="true">←</span></button>`;}
async function api(path,method='GET',body){
 const res=await fetch('/api/'+path,{method,credentials:'same-origin',cache:'no-store',
 headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
 body:body?JSON.stringify(body):undefined});
 const data=await res.json().catch(()=>({}));
 if(!res.ok){let err=new Error(data.error||'הפעולה נכשלה. נסו שוב.');err.status=res.status;throw err;}
 return data;
}
function toast(message,tone='success'){
 const target=root.querySelector('[data-status]');
 if(!target)return;
 target.className='manager-status '+(tone==='error'?'is-error':'is-success');
 target.textContent=message;target.hidden=false;target.setAttribute('role',tone==='error'?'alert':'status');
}
function clearStatus(){const target=root.querySelector('[data-status]');if(target)target.hidden=true;}
function changeBusy(button,busy){if(!button)return;button.disabled=busy;button.setAttribute('aria-busy',String(busy));}
function showLogin(message=''){
 state.admin=null;root.className='manager-root';
 root.innerHTML=`<div class="manager-auth">
  <section class="manager-auth-intro" aria-labelledby="manager-auth-heading">
    <div class="manager-overline">אלקטרה אפיקים / ניהול בחינות</div>
    <h1 id="manager-auth-heading">מערכת ניהול הבחינות</h1>
    <p>מרכז הבקרה למנהלים ולמשאבי אנוש. שיוך מבחנים, בחינת תוצאות והחלטות מקצועיות — בסביבת עבודה מאובטחת.</p>
    <div class="manager-auth-bottom">ניהול הרשאות ומבחנים לעובדי התחבורה הציבורית</div>
  </section>
  <section class="manager-auth-form" aria-labelledby="login-title">
   <span class="manager-overline">גישה למורשים בלבד</span><h2 id="login-title">כניסה לפורטל</h2><p>הכניסו מספר אישי וסיסמה.</p>
   <form id="manager-login-form" novalidate>
    ${input('מספר אישי','manager-username',{numeric:true,attrs:'maxlength="10" autocomplete="username"'})}
    ${input('סיסמה','manager-password',{type:'password',attrs:'autocomplete="current-password"'})}
    <div class="manager-status is-error" data-status role="alert" hidden></div>
    ${buttons('כניסה למערכת הניהול')}
   </form>
   <small class="manager-auth-helper">הגישה מיועדת לעובדים מורשים בלבד. פעולות נשמרות ביומן המערכת.</small>
  </section>
 </div>`;
 if(message)toast(message,'error');
 const form=root.querySelector('#manager-login-form');
 form.addEventListener('submit',async e=>{
  e.preventDefault();const btn=form.querySelector('button[type=submit]');if(btn.disabled)return;
  const username=form.querySelector('#manager-username').value.trim(),password=form.querySelector('#manager-password').value;
  if(!username||!password){toast('יש להזין מספר אישי וסיסמה.','error');return;}
  changeBusy(btn,true);clearStatus();
  try{await api('admin-login','POST',{username,password});await init();}
  catch(err){toast(err.message,'error');changeBusy(btn,false);}
 });
}
function workspace(){
 root.className='manager-root is-authenticated';
 root.innerHTML=`<div class="manager-layout">
  <aside class="manager-sidebar" aria-label="תפריט ניהול">
   <div class="manager-sidebar-heading"><span class="manager-sidebar-kicker">מערכת בחינות</span><strong>ניהול והסמכה</strong><small>אלקטרה אפיקים</small></div>
   <nav class="manager-side-nav" aria-label="ניווט אזור ניהול">
    <button type="button" data-panel="list"><span class="manager-nav-glyph">▦</span>רשימת נבחנים</button>
    <button type="button" data-panel="assign"><span class="manager-nav-glyph">＋</span>יצירת מבחן אישי</button>
    ${state.admin.role==='owner'?'<button type="button" data-panel="staff"><span class="manager-nav-glyph">♙</span>משתמשים והרשאות</button>':''}
   </nav>
   <div class="manager-account"><span class="manager-account-avatar">${esc(state.admin.display_name?.charAt(0)||'מ')}</span><div class="manager-account-text"><strong>${esc(state.admin.display_name)}</strong><small>${adminRole(state.admin.role)}</small></div></div>
   <div class="manager-sidebar-actions"><button type="button" data-panel="password">שינוי סיסמה</button><button type="button" data-logout>יציאה</button></div>
  </aside>
  <section class="manager-content" aria-label="תוכן ניהול">
   <div class="manager-mobile-head"><div><strong>פורטל ניהול</strong><small>${esc(state.admin.display_name)} · ${adminRole(state.admin.role)}</small></div><button type="button" data-logout>יציאה</button></div>
   <nav class="manager-mobile-nav" aria-label="ניווט נייד">
    <button type="button" data-panel="list">נבחנים</button>
    <button type="button" data-panel="assign">מבחן חדש</button>
    ${state.admin.role==='owner'?'<button type="button" data-panel="staff">משתמשים</button>':''}
    <button type="button" data-panel="password">סיסמה</button>
   </nav>
   <div class="manager-status" data-status role="status" hidden></div>
   <div id="manager-panel"></div>
  </section>
 </div>`;
 root.querySelectorAll('[data-panel]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.panel)));
 root.querySelectorAll('[data-logout]').forEach(el=>el.addEventListener('click',async()=>{try{await api('admin-logout','POST');showLogin()}catch(err){toast(err.message,'error')}}));
}
function navigation(){root.querySelectorAll('[data-panel]').forEach(el=>{const selected=el.dataset.panel===state.view;el.classList.toggle('is-active',selected);if(selected)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});}
function panel(html){clearStatus();const content=root.querySelector('#manager-panel');if(!content)return;content.innerHTML=html;navigation();}
async function navigate(view){
 if(!['list','assign','staff','password'].includes(view))return;
 if(view==='staff'&&state.admin.role!=='owner')return;
 state.view=view;navigation();
 if(view==='list')await showList();
 else if(view==='assign')showAssign();
 else if(view==='staff')await showStaff();
 else if(view==='password')await showPassword(false);
}
function intro(title,description,action=''){return `<header class="manager-panel-head"><div><div class="manager-eyebrow">אלקטרה אפיקים / ניהול בחינות</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${action}</header>`;}
function pill(c){
 let status=c.decision?'decision-'+c.decision:c.status;
 return `<span class="manager-status-pill ${status}">${esc(resultLabel(c))}</span>`;
}
async function showList(){
 state.view='list';
 panel(intro('ניהול בחינות עובדים','מעקב אחר מבחנים, בדיקת תוצאות וקבלת החלטות על ידי מנהל מוסמך.',`<button type="button" class="manager-primary manager-header-action" id="create-from-list">יצירת מבחן אישי <span aria-hidden="true">＋</span></button>`)+`
  <div class="manager-summary" id="manager-summary" aria-label="נתוני בחינות"></div>
  <section class="manager-list-card">
   <div class="manager-table-head"><div><h2>רשימת נבחנים</h2><p id="manager-result-count">טוענים נתונים…</p></div>
    <div class="manager-filters">
     <label class="manager-search" for="manager-search"><span class="sr-only">חיפוש לפי שם</span><input id="manager-search" type="search" placeholder="חיפוש לפי שם" value="${esc(state.search)}" autocomplete="off"><button type="button" id="manager-clear-search" aria-label="ניקוי חיפוש" ${state.search?'':'hidden'}>×</button></label>
     <label class="manager-filter"><span class="sr-only">סינון סטטוס</span><select id="manager-status-filter"><option value="all">כל הסטטוסים</option><option value="assigned">הוזמנו</option><option value="in_progress">בבחינה</option><option value="pending">ממתינים להחלטה</option><option value="accepted">אושרו</option><option value="rejected">לא אושרו</option><option value="follow_up">בדיקה נוספת</option></select></label>
    </div>
   </div>
   <div class="manager-table-wrap"><table class="manager-data-table"><thead><tr><th>שם הנבחן</th><th>תעודה</th><th>מצב הבחינה</th><th>ציון</th><th>תאריך</th><th>פעולה</th></tr></thead><tbody id="manager-table-body"><tr><td colspan="6">טוענים…</td></tr></tbody></table></div>
   <div class="manager-table-footer"><span id="manager-page-info"></span><div><button type="button" id="manager-page-prev" class="manager-subtle">הקודם</button><button type="button" id="manager-page-next" class="manager-subtle">הבא</button></div></div>
  </section>`);
 root.querySelector('#create-from-list').onclick=()=>navigate('assign');
 const search=root.querySelector('#manager-search'),status=root.querySelector('#manager-status-filter');
 status.value=state.filter;
 let debounce;const refresh=()=>{state.page=1;loadListRows()};
 search.oninput=()=>{state.search=search.value;root.querySelector('#manager-clear-search').hidden=!search.value;clearTimeout(debounce);debounce=setTimeout(refresh,300);};
 root.querySelector('#manager-clear-search').onclick=()=>{clearTimeout(debounce);search.value='';state.search='';root.querySelector('#manager-clear-search').hidden=true;refresh();search.focus();};
 status.onchange=()=>{state.filter=status.value;refresh();};
 root.querySelector('#manager-page-prev').onclick=()=>{if(state.page>1){state.page--;loadListRows();}};
 root.querySelector('#manager-page-next').onclick=()=>{state.page++;loadListRows();};
 await loadListRows();
}
async function loadListRows(){
 const req=++state.request;const tb=root.querySelector('#manager-table-body');if(!tb)return;
 tb.setAttribute('aria-busy','true');root.querySelector('#manager-result-count').textContent='טוענים…';
 try{
  const qs=new URLSearchParams({page:String(state.page),size:String(state.size),search:state.search,state:state.filter});
  const data=await api('admin-list?'+qs.toString());
  if(req!==state.request||state.view!=='list')return;
  state.page=data.pagination.page;
  const st=data.stats||{total:0,active:0,pending:0,accepted:0};
  root.querySelector('#manager-summary').innerHTML=[
   ['סה״כ בחינות',st.total],['הוזמנו / בבחינה',st.active],['ממתינים להחלטה',st.pending],['אושרו',st.accepted]
  ].map(([label,n])=>`<div class="manager-metric"><span>${label}</span><strong>${Number(n||0).toLocaleString('he-IL')}</strong></div>`).join('');
  tb.innerHTML=data.items.map(c=>{
   const score=c.status==='submitted'?(`<strong class="manager-score">${Number(c.score||0)}%</strong><small class="manager-cell-small">${Number(c.correctCount||0)} / 30</small>`):'—';
   return `<tr><td><strong>${esc(c.name)}</strong><span class="manager-mobile-sub">${dateFmt(c.createdAt)}</span></td><td class="manager-id">••••${esc(c.identityLast4)}</td><td>${pill(c)}</td><td>${score}</td><td class="manager-desktop-date">${dateFmt(c.createdAt)}</td><td><button type="button" class="manager-link" data-open="${c.id}">${c.status==='submitted'?'בדיקת תוצאות':'פרטי הבחינה'}</button></td></tr>`;
  }).join('')||'<tr><td colspan="6" class="manager-empty">לא נמצאו נבחנים לפי החיפוש והסינון הנוכחיים.</td></tr>';
  tb.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>showReview(b.dataset.open));
  root.querySelector('#manager-result-count').textContent=data.pagination.total+' נבחנים בתוצאה הנוכחית';
  const first=data.pagination.total?((state.page-1)*state.size+1):0;
  const last=Math.min(state.page*state.size,data.pagination.total);
  root.querySelector('#manager-page-info').textContent=first+'–'+last+' מתוך '+data.pagination.total;
  root.querySelector('#manager-page-prev').disabled=state.page<=1;
  root.querySelector('#manager-page-next').disabled=state.page>=data.pagination.pages;
 }catch(err){
  if(req!==state.request)return;
  toast(err.message,'error');tb.innerHTML='<tr><td colspan="6" class="manager-empty">לא ניתן לטעון את הנבחנים. נא לנסות שוב.</td></tr>';
 }finally{if(req===state.request)tb.removeAttribute('aria-busy')}
}
function showAssign(){
 state.view='assign';
 panel(intro('יצירת מבחן אישי','לכל נבחן נוצרת הזמנה אישית חדשה המקושרת למספר תעודת הזהות שלו.')+`
 <section class="manager-form-card"><div class="manager-section-title"><h2>פרטי הנבחן</h2><p>הקוד יופיע פעם אחת לאחר הרישום ויש להעבירו בערוץ מאובטח.</p></div>
 <form id="manager-assign" novalidate>
  ${input('שם מלא של הנבחן','invite-name',{attrs:'maxlength="120"',placeholder:'שם פרטי ושם משפחה'})}
  ${input('תעודת זהות (9 ספרות)','invite-id',{numeric:true,attrs:'maxlength="9" pattern="[0-9]{9}"',placeholder:'000000000',hint:'המספר משמש לאימות הכניסה. אין לשתף אותו עם קוד ההזמנה.'})}
  <div class="manager-form-actions">${buttons('יצירת קוד אישי')}<button type="button" class="manager-secondary" data-back>חזרה לרשימה</button></div>
 </form>
 <div id="manager-invitation" aria-live="polite"></div>
 </section>`);
 root.querySelector('[data-back]').onclick=()=>navigate('list');
 const form=root.querySelector('#manager-assign');
 form.onsubmit=async e=>{
  e.preventDefault();const name=form.querySelector('#invite-name').value.trim(),id=form.querySelector('#invite-id').value.trim();
  if(name.length<2){toast('יש להזין שם מלא של הנבחן.','error');form.querySelector('#invite-name').focus();return}
  if(!/^[0-9]{9}$/.test(id)){toast('מספר תעודת זהות חייב להכיל 9 ספרות.','error');form.querySelector('#invite-id').focus();return}
  const button=form.querySelector('button[type=submit]');changeBusy(button,true);clearStatus();
  try{
   const data=await api('admin-assign','POST',{name,document:id});
   form.querySelector('#invite-id').value='';
   const invitation='אלקטרה אפיקים - זימון למבחן\\nשם: '+name+'\\nקוד אישי: '+data.code+'\\nכניסה: '+workerUrl+'\\nיש להזין את תעודת הזהות הרשומה במערכת.';
   root.querySelector('#manager-invitation').innerHTML=`<section class="manager-invitation"><div class="manager-invitation-check" aria-hidden="true">✓</div><div><h3>נוצרה הזמנה אישית</h3><p>יש להעביר את הקוד לנבחן בלבד. לאחר ההגשה לא ניתן להשתמש בו שנית.</p><div class="manager-code" dir="ltr">${esc(data.code)}</div><button type="button" class="manager-secondary" id="manager-copy-invite">העתקת ההזמנה</button></div></section>`;
   root.querySelector('#manager-copy-invite').onclick=async()=>{try{await navigator.clipboard.writeText(invitation);toast('ההזמנה הועתקה.','success')}catch{toast('לא ניתן להעתיק אוטומטית. העתיקו את הקוד המוצג.','error')}};
   toast('הנבחן נרשם והקוד האישי נוצר בהצלחה.');
  }catch(err){toast(err.message,'error')}finally{changeBusy(button,false)}
 };
}
async function showStaff(){
 if(state.admin?.role!=='owner')return navigate('list');
 state.view='staff';const policy=state.policy||await api('password-policy');
 const rule=policy.type==='digits'?'6 עד 24 ספרות':'14 תווים לפחות';
 const pinAttrs=policy.type==='digits'?'inputmode="numeric" pattern="[0-9]{6,24}" minlength="6" maxlength="24"':'minlength="14" maxlength="128"';
 panel(intro('משתמשים והרשאות','ניהול גישה למנהלים ולמשאבי אנוש. בעל המערכת שומר על גישה מלאה.')+`
 <section class="manager-form-card manager-staff-create"><div class="manager-section-title"><h2>יצירת חשבון מורשה</h2><p>המשתמש יידרש להחליף את הסיסמה הזמנית בכניסה הראשונה.</p></div>
 <form id="manager-staff-create" novalidate>
  ${input('מספר אישי','staff-number',{numeric:true,attrs:'maxlength="10"',hint:'4 עד 10 ספרות'})}
  ${input('שם מלא','staff-name',{attrs:'maxlength="90"'})}
  ${input('סיסמה זמנית','staff-password',{type:'password',attrs:pinAttrs,autocomplete:'new-password',hint:rule})}
  ${select('תפקיד','staff-role',[['manager','מנהל'],['hr','משאבי אנוש']])}
  <div class="manager-form-actions">${buttons('יצירת חשבון')}</div>
 </form></section>
 <section class="manager-list-card manager-staff-list"><div class="manager-table-head"><div><h2>אנשי צוות מורשים</h2><p>בעל המערכת יכול להשבית או להפעיל גישה, ללא מחיקת ההיסטוריה.</p></div></div>
 <div class="manager-table-wrap"><table class="manager-data-table"><thead><tr><th>מספר אישי</th><th>שם מלא</th><th>תפקיד</th><th>גישה</th><th>פעולה</th></tr></thead><tbody id="manager-staff-rows"><tr><td colspan="5">טוענים…</td></tr></tbody></table></div></section>`);
 const form=root.querySelector('#manager-staff-create');
 form.onsubmit=async event=>{
  event.preventDefault();
  const username=form.querySelector('#staff-number').value.trim(),name=form.querySelector('#staff-name').value.trim(),password=form.querySelector('#staff-password').value,role=form.querySelector('#staff-role').value;
  const validPin=policy.type==='digits'?/^[0-9]{6,24}$/.test(password):(password.length>=14&&password.length<=128);
  if(!/^[0-9]{4,10}$/.test(username)){toast('המספר האישי חייב להכיל 4 עד 10 ספרות.','error');return}
  if(name.length<2||!validPin){toast('יש להזין שם מלא וסיסמה זמנית תקינה ('+rule+').','error');return}
  const btn=form.querySelector('button[type=submit]');changeBusy(btn,true);
  try{
   await api('admin-staff-create','POST',{staffNumber:username,display_name:name,password,role});
   form.reset();toast('החשבון נוצר. יש להעביר את הסיסמה הזמנית למשתמש בערוץ מאובטח.');
   await loadStaffRows();
  }catch(err){toast(err.message,'error')}finally{changeBusy(btn,false)}
 };
 await loadStaffRows();
}
async function loadStaffRows(){
 const target=root.querySelector('#manager-staff-rows');if(!target)return;
 try{
  const data=await api('admin-staff-list');
  target.innerHTML=data.items.map(item=>`<tr><td dir="ltr">${esc(item.staffNumber)}</td><td><strong>${esc(item.display_name)}</strong></td><td>${esc(adminRole(item.role))}</td><td><span class="manager-status-pill ${item.is_active?'accepted':'rejected'}">${item.is_active?'פעיל':'מושבת'}</span></td><td>${item.role==='owner'?'—':`<button type="button" class="manager-link" data-staff="${item.id}" data-action="${item.is_active?'disable':'enable'}">${item.is_active?'השבתת גישה':'הפעלת גישה'}</button>`}</td></tr>`).join('');
  target.querySelectorAll('[data-staff]').forEach(b=>b.onclick=()=>confirmToggle(b.dataset.staff,b.dataset.action==='enable'));
 }catch(err){toast(err.message,'error');target.innerHTML='<tr><td colspan="5">לא ניתן לטעון את המשתמשים.</td></tr>'}
}
function confirmDialog({title,description,action,onConfirm}){
 const dialog=document.createElement('dialog');dialog.className='manager-confirm';
 dialog.innerHTML=`<form method="dialog"><h2>${esc(title)}</h2><p>${esc(description)}</p><div class="manager-dialog-actions"><button type="submit" value="cancel" class="manager-secondary" autofocus>ביטול</button><button type="button" class="manager-primary" id="confirm-action">${esc(action)}</button></div></form>`;
 document.body.append(dialog);
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 dialog.querySelector('#confirm-action').onclick=async()=>{
  const button=dialog.querySelector('#confirm-action');changeBusy(button,true);
  try{await onConfirm();dialog.close()}catch(err){toast(err.message,'error');changeBusy(button,false)}
 };
 dialog.showModal();
}
function confirmToggle(id,active){confirmDialog({title:active?'הפעלת גישת משתמש':'השבתת גישת משתמש',description:active?'למשתמש תינתן מחדש גישה לפורטל.':'כניסת המשתמש תיחסם והפעלות פעילות שלו יסתיימו.',action:active?'הפעלת גישה':'השבתת גישה',onConfirm:async()=>{await api('admin-staff-toggle','POST',{id,active});toast('הרשאת המשתמש עודכנה בהצלחה.');await loadStaffRows();}});}
async function showPassword(required){
 const policy=state.policy||await api('password-policy');state.view='password';
 const hint=policy.type==='digits'?'6 עד 24 ספרות':'14 תווים לפחות';
 const attr=policy.type==='digits'?'inputmode="numeric" pattern="[0-9]{6,24}" minlength="6" maxlength="24"':'minlength="14" maxlength="128"';
 const body=`<section class="manager-form-card manager-password-panel"><div class="manager-section-title"><h2>שינוי סיסמה</h2><p>${required?'יש להחליף את הסיסמה הזמנית לפני המשך השימוש.':'הסיסמה החדשה תיכנס לתוקף מיד לאחר שמירתה בשרת.'}</p></div><form id="manager-change-password" novalidate>
 ${input('סיסמה נוכחית','password-current',{type:'password',autocomplete:'current-password'})}
 ${input('סיסמה חדשה','password-next',{type:'password',attrs:attr,autocomplete:'new-password',hint})}
 <div class="manager-form-actions">${buttons('שמירת סיסמה חדשה')}${required?'':'<button class="manager-secondary" type="button" id="manager-password-back">חזרה</button>'}</div></form></section>`;
 if(required){root.className='manager-root';root.innerHTML=`<div class="manager-required-password"><div class="manager-overline">אלקטרה אפיקים / אבטחת חשבון</div><h1>עדכון סיסמה</h1><div class="manager-status" data-status role="alert" hidden></div>${body}</div>`;}
 else panel(intro('פרטי החשבון','עדכון סיסמת הכניסה של החשבון המורשה.')+body);
 if(!required)root.querySelector('#manager-password-back').onclick=()=>navigate('list');
 const form=root.querySelector('#manager-change-password');
 form.onsubmit=async e=>{
  e.preventDefault();const current=form.querySelector('#password-current').value,next=form.querySelector('#password-next').value;
  const valid=policy.type==='digits'?/^[0-9]{6,24}$/.test(next):(next.length>=14&&next.length<=128);
  if(!valid){toast('יש להזין סיסמה חדשה ('+hint+').','error');form.querySelector('#password-next').focus();return}
  if(next===current){toast('הסיסמה החדשה חייבת להיות שונה מהקודמת.','error');return}
  const button=form.querySelector('button[type=submit]');changeBusy(button,true);
  try{await api('admin-password','POST',{current,next});await init();toast('הסיסמה החדשה נשמרה ואומתה בהצלחה.');}
  catch(err){toast(err.message,'error');changeBusy(button,false)}
 };
}
async function showReview(id){
 state.view='review';state.review=id;
 panel(intro('בדיקת מבחן','סקירת תשובות הנבחן והשוואתן לתשובות הנכונות.')+`<div class="manager-loading">טוענים את תוצאות המבחן…</div>`);
 let data;try{data=await api('admin-detail?id='+encodeURIComponent(id))}catch(err){toast(err.message,'error');return;}
 if(state.review!==id)return;
 const c=data.candidate,questions=data.questions||[],submitted=c.status==='submitted';
 const correct=questions.filter(q=>Number.isInteger(q.selectedOption)&&q.selectedOption===q.correctOption).length;
 const unanswered=questions.filter(q=>!Number.isInteger(q.selectedOption)).length;
 const wrong=questions.length-correct-unanswered;
 const percent=Number(c.score??Math.round(correct/Math.max(questions.length,1)*100));
 const badge=c.decision?decisions[c.decision]||c.decision:submitted?'ממתין להחלטת מנהל':statuses[c.status]||'בתהליך';
 panel(intro('בדיקת מבחן — '+c.name,'תאריך הגשה: '+dateFmt(c.submittedAt)+' · תעודת זהות: ••••'+c.identityLast4,`<button type="button" class="manager-secondary manager-header-action" id="manager-back-list">חזרה לרשימה</button>`)+`
 <div class="manager-review-summary">
  <div class="manager-review-score"><span>ציון הבחינה</span><strong>${submitted?percent+'%':'—'}</strong><small>${submitted?correct+' מתוך '+questions.length+' תשובות נכונות':'הבחינה טרם הוגשה'}</small></div>
  <div class="manager-review-breakdown"><div><span>נכונות</span><strong>${submitted?correct:'—'}</strong></div><div><span>שגויות</span><strong>${submitted?wrong:'—'}</strong></div><div><span>ללא מענה</span><strong>${submitted?unanswered:'—'}</strong></div></div>
  <div class="manager-review-decision"><span>החלטת מנהל</span><strong>${esc(badge)}</strong><small>${c.decision?'הוחלט על ידי גורם מוסמך':'הציון אינו החלטה אוטומטית'}</small></div>
 </div>
 ${submitted?`<section class="manager-review-list"><div class="manager-review-list-head"><div><h2>פירוט התשובות</h2><p>כל 30 השאלות מוצגות עם תשובת הנבחן והתשובה הנכונה.</p></div><div class="manager-answer-filters"><button type="button" data-answer-filter="all" class="is-active">כל השאלות</button><button type="button" data-answer-filter="wrong">שגויות</button><button type="button" data-answer-filter="correct">נכונות</button><button type="button" data-answer-filter="unanswered">ללא מענה</button></div></div><div id="manager-question-items"></div></section>`:''}
 ${submitted&&!c.decision&&canReview()?`<section class="manager-form-card manager-decision-card"><div class="manager-section-title"><h2>החלטה מקצועית</h2><p>האישור או הפסילה אינם אוטומטיים. יש לעבור על התשובות ולתעד החלטה מנומקת.</p></div><form id="manager-decision-form" novalidate>${select('החלטה','manager-decision',[['accepted','אישור'],['rejected','לא מאושר'],['follow_up','נדרשת בדיקה נוספת']])}<label class="manager-field" for="manager-notes"><span>נימוק ההחלטה</span><textarea id="manager-notes" rows="4" minlength="3" maxlength="1000" required placeholder="נימוק מקצועי קצר ומדויק"></textarea></label><div class="manager-form-actions">${buttons('שמירת החלטת מנהל')}</div></form></section>`:''}
 ${c.decision?`<section class="manager-decision-record"><strong>החלטה שנרשמה: ${esc(decisions[c.decision]||c.decision)}</strong><p>${esc(c.decisionNotes||'')}</p><small>נרשמה: ${dateFmt(c.reviewedAt)}</small></section>`:''}
 ${!submitted?'<section class="manager-form-card"><p>המבחן עדיין לא הוגש. ניתן לצפות בתשובות רק לאחר הגשה.</p></section>':''}`);
 root.querySelector('#manager-back-list').onclick=()=>navigate('list');
 if(submitted){
  const list=root.querySelector('#manager-question-items');
  function filterQuestions(filter){
   const filtered=questions.filter(q=>{
    if(filter==='correct')return Number.isInteger(q.selectedOption)&&q.selectedOption===q.correctOption;
    if(filter==='wrong')return Number.isInteger(q.selectedOption)&&q.selectedOption!==q.correctOption;
    if(filter==='unanswered')return !Number.isInteger(q.selectedOption);
    return true;
   });
   list.innerHTML=filtered.map((q,i)=>{
    const selected=Number.isInteger(q.selectedOption)?q.selectedOption:null;
    const matched=selected!==null&&selected===q.correctOption;
    const stateClass=selected===null?'unanswered':matched?'correct':'wrong';
    const status=selected===null?'לא נענה':matched?'נכון':'שגוי';
    const chosen=selected===null?'לא נבחרה תשובה':q.options[selected]||'—';
    const expected=q.options[q.correctOption]||'—';
    return `<article class="manager-answer-card is-${stateClass}"><div class="manager-answer-card-head"><span>שאלה ${q.id} / ${questions.length}</span><span class="manager-answer-state">${status}</span></div><h3>${esc(q.question)}</h3><p class="manager-answer-section">${esc(q.section||'')}</p><div class="manager-answer-compare"><div class="manager-actual"><span>תשובת הנבחן</span><strong>${esc(chosen)}</strong></div><div class="manager-expected"><span>התשובה הנכונה</span><strong>${esc(expected)}</strong></div></div>${q.explanation?`<p class="manager-answer-explanation">${esc(q.explanation)}</p>`:''}</article>`;
   }).join('')||'<div class="manager-empty">אין שאלות בסטטוס שנבחר.</div>';
  }
  filterQuestions('all');
  root.querySelectorAll('[data-answer-filter]').forEach(b=>b.onclick=()=>{root.querySelectorAll('[data-answer-filter]').forEach(x=>x.classList.toggle('is-active',x===b));filterQuestions(b.dataset.answerFilter)});
 }
 const form=root.querySelector('#manager-decision-form');
 if(form)form.onsubmit=async e=>{
  e.preventDefault();const decision=form.querySelector('#manager-decision').value,notes=form.querySelector('#manager-notes').value.trim();
  if(notes.length<3){toast('יש לכתוב נימוק של לפחות 3 תווים.','error');form.querySelector('#manager-notes').focus();return;}
  const button=form.querySelector('button[type=submit]');changeBusy(button,true);
  try{await api('admin-review','POST',{id,decision,notes});await showReview(id);toast('החלטת המנהל נשמרה ביומן המערכת.');}
  catch(err){toast(err.message,'error');changeBusy(button,false)}
 };
}
async function init(){
 try{
  const [me,policy]=await Promise.all([api('admin-me'),api('password-policy')]);
  state.admin=me.admin;state.policy=policy;
  if(state.admin.must_change_password){await showPassword(true);return}
  workspace();await navigate('list');
 }catch(err){if(err.status===401||err.status===403)showLogin();else showLogin('לא ניתן לטעון את המערכת. נסו להיכנס שוב.')}
}
init();
})();