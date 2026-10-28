const root=document.querySelector('#root');const portal=document.body.dataset.portal==='admin'?'admin':'worker';let admin=null,candidate=null,questions=[],answers={},active=0,deadline=0,timer=null,latestCode='';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=async(path,method='GET',payload)=>{const r=await fetch('/api/'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'פעולה נכשלה');return j};
const notice=(msg,type='ok')=>{let p=document.querySelector('#notice');if(!p){p=document.createElement('div');p.id='notice';p.className='feedback';root.prepend(p)}p.textContent=msg;p.className='feedback '+type};
const frame=(title,sub,inner)=>`<section class="secure-heading"><span class="secure-label">${portal==='admin'?'אלקטרה אפיקים | ניהול בחינות':'אלקטרה אפיקים | מבחן מבקרים'}</span><h1>${title}</h1><p>${sub}</p></section>${inner}`;
const btn=(label,type='submit')=>`<button type="${type}" class="primary-btn">${label}</button>`;
const field=(label,id,type='text',extra='')=>`<label class="secure-field"><span>${label}</span><input id="${id}" type="${type}" required ${extra}></label>`;
const staffPasswordHint=rule=>rule.type==='digits'?'6 עד 24 ספרות':'14 תווים לפחות';
const staffPasswordAttributes=rule=>rule.type==='digits'
 ? 'inputmode="numeric" pattern="[0-9]{6,24}" minlength="6" maxlength="24" autocomplete="new-password"'
 : 'minlength="14" maxlength="128" autocomplete="new-password"';
async function showPasswordChange(required=false){
 root.classList.remove('auth-view');
 let rule;
 try{rule=await api('password-policy')}catch(err){notice(err.message,'error');return}
 const label=staffPasswordHint(rule);
 root.innerHTML=frame(required?'עדכון סיסמה זמנית':'שינוי סיסמה',required?'כדי להמשיך יש להחליף את הסיסמה הזמנית.':'בחרו סיסמה חדשה לחשבון הניהול.',`
 <section class="secure-card password-change-card">
  <form id="change-pass" aria-label="שינוי סיסמה">
   ${field('סיסמה נוכחית','current','password','autocomplete="current-password"')}
   ${field('סיסמה חדשה ('+label+')','next','password',staffPasswordAttributes(rule))}
   <div class="form-actions">
    ${btn('שמירת הסיסמה החדשה')}
    ${required?'':'<button type="button" id="cancel-pass" class="secondary-btn">חזרה לניהול</button>'}
   </div>
  </form>
  <p class="secure-help">הסיסמה החדשה תישמר בשרת. אין למסור את הסיסמה לאדם אחר.</p>
 </section>`);
 const form=document.querySelector('#change-pass');
 if(!required)document.querySelector('#cancel-pass').onclick=()=>loadAdmin();
 form.onsubmit=async e=>{
  e.preventDefault();
  const current=form.querySelector('#current').value;
  const next=form.querySelector('#next').value;
  const valid=rule.type==='digits'?/^[0-9]{6,24}$/.test(next):next.length>=14&&next.length<=128;
  if(!valid){notice('יש לבחור סיסמה חדשה: '+label,'error');form.querySelector('#next').focus();return}
  if(current===next){notice('הסיסמה החדשה חייבת להיות שונה מהנוכחית','error');return}
  const button=form.querySelector('button[type=submit]');
  if(button.disabled)return;
  button.disabled=true;button.textContent='שומרים סיסמה…';form.setAttribute('aria-busy','true');
  try{
   await api('admin-password','POST',{current,next});
   form.querySelector('#current').value='';
   form.querySelector('#next').value='';
   await loadAdmin();
   notice('הסיסמה החדשה נשמרה בהצלחה');
  }catch(err){notice(err.message,'error')}
  finally{if(button.isConnected){button.disabled=false;button.textContent='שמירת הסיסמה החדשה';form.removeAttribute('aria-busy')}}
 };
 form.querySelector('#current').focus();
}
function startPage(){
  root.classList.add('auth-view');
  const isAdmin=portal==='admin';
  const title=isAdmin?'ניהול בחינות והסמכות':'בחינה אישית לעובד';
  const subtitle=isAdmin?'כניסה מאובטחת למנהלים ולמשאבי אנוש.':'הכניסה למבחן באמצעות הזמנה אישית.';
  const description=isAdmin?'כאן ניתן לשייך מבחנים, לצפות בתשובות ולקבל החלטה באופן ידני בלבד.':'יש להזין את הקוד האישי שקיבלתם ואת מספר תעודת הזהות שהמנהל רשם עבורכם.';
  const fields=isAdmin?
    field('מספר אישי','login-user','text','autocomplete="username" inputmode="numeric"')+field('סיסמה','login-pass','password','autocomplete="current-password"'):
    field('קוד אישי למבחן','login-code','text','autocomplete="off" autocapitalize="characters" spellcheck="false" dir="ltr"')+
    field('תעודת זהות (9 ספרות)','login-doc','text','inputmode="numeric" pattern="[0-9]{9}" maxlength="9" autocomplete="off" dir="ltr"');
  root.innerHTML=`<div class='auth-layout'>
    <section class='auth-overview' aria-labelledby='auth-title'>
      <div class='auth-overline'>אלקטרה אפיקים <span aria-hidden='true'>/</span> ${isAdmin?'פורטל ניהול':'מבחן עובדים'}</div>
      <h1 id='auth-title'>${title}</h1>
      <p>${description}</p>
      <div class='auth-overview-bottom'><span aria-hidden='true' class='auth-route-line'></span>הדרכה ובחינות לעובדי תחבורה ציבורית</div>
    </section>
    <section class='secure-card auth-card' aria-label='פרטי כניסה'>
      <div class='auth-card-title'><h2>${isAdmin?'כניסה לפורטל הניהול':'כניסה לבחינה'}</h2><p>${subtitle}</p></div>
      <form id='entry'>${fields}${btn(isAdmin?'כניסה למערכת הניהול':'כניסה למבחן')}</form>
      <p class='auth-data-note'>${isAdmin?'ההחלטה מתקבלת על ידי מנהל מוסמך בלבד, ללא אישור אוטומטי.':'לכל עובד קוד אישי. לאחר הגשת המבחן הקוד לא יאפשר כניסה חוזרת.'} סביבת בדיקות בלבד; אין להזין נתוני עובדים אמיתיים.</p>
    </section>
  </div>`;
  const form=document.querySelector('#entry');
  form.onsubmit=async e=>{
    e.preventDefault();
    const button=form.querySelector('button[type=submit]');
    if(button.disabled)return;
    const label=button.textContent;
    button.disabled=true;button.textContent=isAdmin?'מתחברים...':'בודקים פרטי כניסה...';
    try{
      if(isAdmin){const x=await api('admin-login','POST',{username:document.querySelector('#login-user').value,password:document.querySelector('#login-pass').value});admin=x;await loadAdmin()}
      else{const x=await api('worker-login','POST',{code:document.querySelector('#login-code').value,document:document.querySelector('#login-doc').value});candidate=x;await loadExam()}
    }catch(err){notice(err.message,'error')}
    finally{if(button.isConnected){button.disabled=false;button.textContent=label}}
  };
}
async function loadAdmin(){root.classList.remove('auth-view');const me=await api('admin-me');admin=me.admin;if(admin.must_change_password){await showPasswordChange(true);return}const r=await api('admin-list');let rows=r.items;const counters={total:rows.length,pending:rows.filter(x=>x.status==='assigned'||x.status==='in_progress').length,submitted:rows.filter(x=>x.status==='submitted'&&!x.decision).length,approved:rows.filter(x=>x.decision==='accepted').length};const translate={assigned:'הוזמן',in_progress:'בבחינה',submitted:'הוגש',accepted:'מתאים',rejected:'לא מתאים',follow_up:'בירור נוסף'};root.innerHTML=frame('לוח ניהול בחינות',`שלום ${escape(admin.display_name)} · תוצאות הבחינה לעיון מנהל בלבד`, `<div class="secure-toolbar"><div class="secure-stats"><div><b>${counters.total}</b><span>סה״כ בחינות</span></div><div><b>${counters.pending}</b><span>ממתינים / בבחינה</span></div><div><b>${counters.submitted}</b><span>ממתינים להחלטה</span></div><div><b>${counters.approved}</b><span>אושרו</span></div></div><div class="secure-toolbar-actions"><button id="change-password-admin" type="button" class="secondary-btn">שינוי סיסמה</button><button id="logout-admin" type="button" class="secondary-btn">התנתקות</button></div></div><div class="secure-grid"><section class="secure-card"><h2>יצירת מבחן אישי</h2><p>לכל עובד מופק קוד שונה המקושר לתעודת הזהות שנרשמה. הקוד מוצג פעם אחת בלבד, ונחסם לכניסה חוזרת לאחר הגשת המבחן.</p><form id="assign">${field('שם מלא של העובד','worker-name','text','autocomplete="off"')}${field('תעודת זהות (9 ספרות)','worker-doc','text','autocomplete="off"')}${btn('יצירת הזמנה')}</form><div id="invitation"></div></section><section class="secure-card wide"><div class="secure-section-head"><h2>רשימת נבחנים</h2><input id="search" type="search" placeholder="חיפוש לפי שם" aria-label="חיפוש לפי שם"></div><div class="table-wrap"><table><thead><tr><th>שם</th><th>תעודה</th><th>סטטוס</th><th>ציון</th><th>החלטה</th><th>תאריך</th><th>פעולות</th></tr></thead><tbody id="candidate-rows"></tbody></table></div></section></div>`);const renderRows=()=>{const query=document.querySelector('#search').value.trim();const filtered=rows.filter(x=>x.name.includes(query));document.querySelector('#candidate-rows').innerHTML=filtered.map(x=>`<tr><td>${escape(x.name)}</td><td>••••${escape(x.identityLast4)}</td><td>${translate[x.status]||escape(x.status)}</td><td>${x.score===null?'—':x.correctCount+'/30 · '+x.score+'%'}</td><td>${translate[x.decision]||'ממתין'}</td><td>${new Date(x.createdAt).toLocaleDateString('he-IL')}</td><td>${x.status==='submitted'?`<button type="button" class="small-action" data-review="${x.id}">${x.decision?'צפייה בתוצאות':'בדיקת תשובות'}</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">אין רשומות</td></tr>';document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>review(rows.find(x=>x.id===b.dataset.review)))};renderRows();if(admin.role==='owner')setupStaffControls();document.querySelector('#search').oninput=renderRows;document.querySelector('#change-password-admin').onclick=()=>showPasswordChange(false);document.querySelector('#logout-admin').onclick=async()=>{await api('admin-logout','POST');admin=null;startPage()};document.querySelector('#assign').onsubmit=async e=>{e.preventDefault();try{const x=await api('admin-assign','POST',{name:document.querySelector('#worker-name').value,document:document.querySelector('#worker-doc').value});latestCode=x.code;rows.unshift(x.candidate);renderRows();document.querySelector('#worker-doc').value='';const text=`מבחן אלקטרה אפיקים\nשם: ${x.candidate.name}\nקוד: ${x.code}\nקישור: ${location.origin}/\nיש להזין את מספר התעודה שנרשם אצל המנהל.`;document.querySelector('#invitation').innerHTML=`<div class="invitation"><strong>הזמנה נוצרה בהצלחה</strong><p>קוד אישי: <code>${x.code}</code></p><button id="copy-invite" type="button" class="secondary-btn">העתקת הזמנה</button><p>הקוד יוצג פעם אחת. אין לשלוח מספר תעודה יחד עם הקוד.</p></div>`;document.querySelector('#copy-invite').onclick=()=>navigator.clipboard.writeText(text).then(()=>notice('ההזמנה הועתקה'));notice('ההזמנה נוצרה; יש לשתף את הקוד בערוץ מאובטח');}catch(err){notice(err.message,'error')}}}
async function setupStaffControls(){
 const policy=await api('password-policy');
 const container=document.querySelector('.secure-grid');
 if(!container)return;
 const panel=document.createElement('section');panel.className='secure-card wide';
 panel.innerHTML=`<h2>מנהלים ומשאבי אנוש</h2><p>רק בעל המערכת יכול ליצור ולבטל חשבונות מורשים.</p><form id="staff-form" class="staff-create-form">${field('מספר אישי (4-10 ספרות)','staff-number','text','inputmode="numeric" autocomplete="off"')}${field('שם מלא','staff-name','text','autocomplete="off"')}${field('סיסמה זמנית ('+staffPasswordHint(policy)+')','staff-password','password',staffPasswordAttributes(policy))}<label class="secure-field"><span>תפקיד</span><select id="staff-role"><option value="manager">מנהל</option><option value="hr">משאבי אנוש</option></select></label>${btn('יצירת משתמש')}</form><p id="staff-message" class="secure-help" aria-live="polite"></p><div class="table-wrap"><table><thead><tr><th>מספר אישי</th><th>שם</th><th>תפקיד</th><th>מצב</th><th>פעולות</th></tr></thead><tbody id="staff-rows"></tbody></table></div>`;
 container.append(panel);
 const refresh=async()=>{
  try{
   const response=await api('admin-staff-list');const tb=panel.querySelector('#staff-rows');
   tb.innerHTML=response.items.map(x=>`<tr><td>${escape(x.staffNumber)}</td><td>${escape(x.display_name)}</td><td>${x.role==='owner'?'בעלים':x.role==='manager'?'מנהל':'משאבי אנוש'}</td><td>${x.is_active?'פעיל':'מושבת'}</td><td>${x.role==='owner'?'—':`<button type="button" class="small-action" data-staff="${x.id}" data-active="${x.is_active?'0':'1'}">${x.is_active?'השבתה':'הפעלה'}</button>`}</td></tr>`).join('');
   tb.querySelectorAll('[data-staff]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await api('admin-staff-toggle','POST',{id:button.dataset.staff,active:button.dataset.active==='1'});await refresh()}catch(err){panel.querySelector('#staff-message').textContent=err.message;button.disabled=false}});
  }catch(err){panel.querySelector('#staff-message').textContent=err.message}
 };
 panel.querySelector('#staff-form').onsubmit=async e=>{
  e.preventDefault();const f=panel.querySelector('#staff-form');const button=f.querySelector('button[type="submit"]');button.disabled=true;
  try{
   await api('admin-staff-create','POST',{staffNumber:panel.querySelector('#staff-number').value,display_name:panel.querySelector('#staff-name').value,password:panel.querySelector('#staff-password').value,role:panel.querySelector('#staff-role').value});
   panel.querySelector('#staff-password').value='';
   panel.querySelector('#staff-message').textContent='המשתמש נוצר. יש להעביר את הסיסמה הזמנית בערוץ מאובטח.';
   await refresh();
  }catch(err){panel.querySelector('#staff-message').textContent=err.message}
  finally{button.disabled=false}
 };
 await refresh();
}
async function review(x){
 root.classList.remove('auth-view');
 root.innerHTML=frame('בדיקת מבחן',`נבחן/ת: ${escape(x.name)} · תוצאות וניתוח תשובות`,`<section class="secure-card review-loading" role="status">טוענים את כל התשובות מהשרת…</section>`);
 let data;try{data=await api('admin-detail?id='+encodeURIComponent(x.id))}catch(err){notice(err.message,'error');return}
 const c=data.candidate,items=data.questions||[],answered=items.filter(q=>q.selectedOption!==null&&q.selectedOption!==undefined),correct=items.filter(q=>q.selectedOption===q.correctOption).length,wrong=items.length-correct;
 const pct=items.length?Math.round(correct/items.length*100):0;
 const summary=`<div class="review-summary" aria-label="סיכום תוצאות"><div class="review-score"><span>ציון הבחינה</span><strong>${pct}%</strong><small>${correct} מתוך ${items.length} תשובות נכונות</small></div><div class="review-metrics"><div><strong>${correct}</strong><span>תשובות נכונות</span></div><div><strong>${wrong}</strong><span>שגויות או ללא מענה</span></div><div><strong>${answered.length}</strong><span>שאלות שנענו</span></div></div></div>`;
 const rows=items.map((q,i)=>{
  const hasAnswer=q.selectedOption!==null&&q.selectedOption!==undefined;
  const ok=hasAnswer&&q.selectedOption===q.correctOption;
  const given=hasAnswer?q.options[q.selectedOption]:'לא נבחרה תשובה';
  const expected=q.options[q.correctOption];
  return `<article class="review-question ${ok?'is-correct':'is-wrong'}"><div class="review-question-head"><span class="review-number">שאלה ${i+1} · ${escape(q.section)}</span><span class="review-verdict">${ok?'תשובה נכונה':'תשובה שגויה'}</span></div><h3>${escape(q.question)}</h3><dl class="review-answers"><div class="review-answer ${ok?'right':'wrong'}"><dt>תשובת הנבחן</dt><dd>${escape(given)}</dd></div><div class="review-answer right"><dt>התשובה הנכונה</dt><dd>${escape(expected)}</dd></div></dl>${q.explanation?`<p class="review-explanation">${escape(q.explanation)}</p>`:''}</article>`;
 }).join('');
 const alreadyReviewed=!!c.decision;
 root.innerHTML=frame('בדיקת תוצאות הבחינה',`נבחן/ת: ${escape(c.name)} · ניתוח מלא של ${items.length} שאלות`,
 `<section class="secure-card review-page"><div class="secure-section-head"><h2>דוח תשובות</h2><button id="back" type="button" class="secondary-btn">חזרה לרשימה</button></div>${summary}<p class="review-help">הציון מחושב מהתשובות השמורות בשרת. החלטת התאמה ניתנת רק על ידי מנהל מוסמך.</p><div class="review-list">${rows}</div></section>
 ${alreadyReviewed?`<section class="secure-card review-decision"><h2>החלטה שנשמרה</h2><p>${c.decision==='accepted'?'מתאים':c.decision==='rejected'?'לא מתאים':'נדרשת בדיקה נוספת'}</p><p>${escape(c.decisionNotes||'')}</p></section>`:`<section class="secure-card review-decision"><h2>החלטת מנהל</h2><p>הציון הוא נתון מסייע בלבד. יש לבדוק את התשובות לפני החלטה ידנית.</p><form id="review-form"><label class="secure-field"><span>החלטה</span><select id="decision"><option value="accepted">מתאים</option><option value="rejected">לא מתאים</option><option value="follow_up">נדרשת בדיקה נוספת</option></select></label><label class="secure-field"><span>נימוק מקצועי</span><textarea id="notes" rows="4" required minlength="3"></textarea></label><div class="form-actions">${btn('שמירת החלטה')}<button type="button" id="back-bottom" class="secondary-btn">חזרה לרשימה</button></div></form></section>`}`);
 root.querySelector('#back').onclick=loadAdmin;
 if(!alreadyReviewed){
  root.querySelector('#back-bottom').onclick=loadAdmin;
  const form=root.querySelector('#review-form');
  form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;try{await api('admin-review','POST',{id:c.id,decision:form.querySelector('#decision').value,notes:form.querySelector('#notes').value});await loadAdmin();notice('ההחלטה נשמרה בהצלחה ביומן הפעילות')}catch(err){notice(err.message,'error');button.disabled=false}};
 }
}
async function loadExam(){root.classList.remove('auth-view');const m=await api('worker-me');candidate=m.candidate;if(candidate.status==='submitted'){root.innerHTML=frame('המבחן הוגש','תוצאת הבחינה הועברה לבדיקת מנהל',`<div class="secure-card"><h2>${escape(candidate.name)}</h2><p>הבחינה הוגשה ונשמרה במערכת. לא ניתן להיכנס שוב למבחן באמצעות הקוד האישי. הציון יוצג למנהל בלבד.</p><p>החלטת התאמה תתקבל בנפרד על ידי אחראי מוסמך.</p><button class="secondary-btn" id="exit-worker">התנתקות</button></div>`);document.querySelector('#exit-worker').onclick=async()=>{await api('worker-logout','POST');startPage()};return}const r=await api('worker-questions');questions=r.questions;answers=r.answers;deadline=Date.now()+m.remainingSeconds*1000;active=Math.max(0,questions.findIndex(q=>answers[q.id]===undefined));renderExam()}
function renderExam(){if(timer)clearInterval(timer);const q=questions[active];root.innerHTML=frame('מבחן מקצועי למבקרי תחבורה ציבורית',`נבחן/ת: ${escape(candidate.name)} · שאלה ${active+1} מתוך ${questions.length}`,`<div class="secure-card exam-secure"><div class="exam-top"><strong>${escape(q.section)}</strong><span class="exam-timer" id="clock" aria-label="זמן שנותר">—</span></div><div class="secure-progress" aria-label="התקדמות הבחינה"><span style="width:${questions.filter(item=>answers[item.id]!==undefined).length/questions.length*100}%"></span></div><p class="exam-answer-count">נענו ${questions.filter(item=>answers[item.id]!==undefined).length} מתוך ${questions.length} שאלות</p><h2>${escape(q.question)}</h2><div class="answer-grid">${q.options.map((option,i)=>`<button data-choice="${i}" type="button" class="choice ${answers[q.id]===i?'selected':''}"><span>${'אבגד'[i]}</span>${escape(option)}</button>`).join('')}</div><p class="exam-live-save" role="status" aria-live="polite">כל תשובה נשמרת אוטומטית ומאובטחת בשרת.</p><div class="form-actions"><button type="button" id="prev" class="secondary-btn" ${active===0?'disabled':''}>הקודמת</button><button type="button" id="next" class="primary-btn">${active===questions.length-1?'סיום והגשת מבחן':'השאלה הבאה'}</button></div><p class="secure-help">הבחירות נשמרות בשרת. השאלות ללא תשובה נחשבות שגויות.</p></div>`);const update=()=>{const left=Math.max(0,Math.floor((deadline-Date.now())/1000));const el=document.querySelector('#clock');if(el)el.textContent=`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;if(left===0){clearInterval(timer);submit()}};update();timer=setInterval(update,1000);document.querySelectorAll('[data-choice]').forEach(button=>button.onclick=async()=>{const choice=Number(button.dataset.choice);button.disabled=true;try{await api('worker-answer','POST',{questionId:q.id,selectedOption:choice});answers[q.id]=choice;renderExam()}catch(err){notice(err.message,'error');button.disabled=false}});document.querySelector('#prev').onclick=()=>{if(active>0){active--;renderExam()}};document.querySelector('#next').onclick=()=>{if(active<questions.length-1){active++;renderExam()}else{const n=questions.filter(x=>answers[x.id]===undefined).length;root.querySelector('.exam-secure').insertAdjacentHTML('beforeend',`<div class="secure-confirm"><p>לשלוח את הבחינה? ${n?`נותרו ${n} שאלות ללא מענה.`:'כל השאלות נענו.'}</p><button id="confirm-submit" class="primary-btn" type="button">אישור הגשה</button></div>`);document.querySelector('#confirm-submit').onclick=submit}}}
async function submit(){clearInterval(timer);try{await api('worker-submit','POST');await loadExam()}catch(err){notice(err.message,'error')}}
async function init(){
  if(portal==='admin'){
    try{await loadAdmin();return}catch{startPage();return}
  }
  try{await loadExam();return}catch{startPage()}
}
// Legacy links from the former combined portal now navigate to the correct standalone HTML page.
if(portal==='worker'&&location.hash==='#admin')location.replace('/admin.html');
else if(portal==='admin'&&location.hash==='#worker')location.replace('/');
else init();
