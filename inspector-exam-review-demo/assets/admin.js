
const root=document.querySelector('#root');let admin=null,candidate=null,questions=[],answers={},active=0,deadline=0,timer=null,latestCode='';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=window.AfikimDemoAPI;
const notice=(msg,type='ok')=>{let p=document.querySelector('#notice');if(!p){p=document.createElement('div');p.id='notice';p.className='feedback';root.prepend(p)}p.textContent=msg;p.className='feedback '+type;p.setAttribute('role','status');p.setAttribute('aria-live','polite')};
const frame=(title,sub,inner)=>`<section class="secure-heading"><span class="secure-label">אלקטרה אפיקים | ניהול הכשרות</span><h1>${title}</h1><p>${sub}</p></section>${inner}`;
const btn=(label,type='submit')=>`<button type="${type}" class="primary-btn">${label}</button>`;
const field=(label,id,type='text',extra='')=>`<label class="secure-field"><span>${label}</span><input id="${id}" type="${type}" required ${extra}></label>`;

function startPage(){
  root.innerHTML=`<section class="admin-auth-grid">
    <div class="admin-auth-intro"><span class="admin-kicker">אלקטרה אפיקים · סביבת הדגמה</span>
      <h1>ניהול בחינות<br>והערכת עובדים</h1>
      <p>מרחב העבודה למנהלים ולמשאבי אנוש. שיוך בחינות לעובדים, מעקב אחר התקדמות, בדיקת התשובות וקבלת החלטה על ידי גורם מוסמך.</p>
      <div class="admin-auth-points"><span>רישום עובדים והנפקת הזמנות</span><span>בקרה על תוצאות ומעקב</span><span>רישום אחראים ותפקידי גישה</span></div>
    </div>
    <section class="secure-card admin-login-card">
      <div class="card-eyebrow">כניסה למערכת ניהול</div>
      <h2>כניסת הנהלה</h2><p>גישה לחשבונות מנהלים ומשאבי אנוש בעלי מספר אישי בלבד.</p>
      <form id="entry" novalidate>
        ${field('מספר אישי','login-user','text','autocomplete="username" inputmode="numeric" maxlength="10"')}
        ${field('סיסמה','login-pass','password','autocomplete="current-password"')}
        ${btn('כניסה לניהול')}
      </form>
      <p class="secure-help">סביבת הדגמה בלבד. אין להשתמש בנתוני עובדים אמיתיים.</p>
      <div class="demo-quick"><strong>חשבון הדגמה</strong><span>מספר אישי: 000001 · סיסמה: demo2026</span>
        <button type="button" id="demo-fill" class="secondary-btn">מילוי פרטי הדגמה</button></div>
    </section>
  </section>`;
  document.querySelector('#demo-fill').onclick=()=>{document.querySelector('#login-user').value='000001';document.querySelector('#login-pass').value='demo2026'};
  document.querySelector('#entry').onsubmit=async e=>{e.preventDefault();try{
    const x=await api('admin-login','POST',{username:document.querySelector('#login-user').value,password:document.querySelector('#login-pass').value});admin=x;await loadAdmin()
  }catch(e){notice(e.message,'error')}};
}
async function loadAdmin(){
  if(timer){clearInterval(timer);timer=null;}
  const me=await api('admin-me');admin=me.admin;
  if(admin.must_change_password){
    root.innerHTML=frame('עדכון סיסמה','יש להחליף סיסמה זמנית כדי להמשיך',`<div class="secure-card"><form id="change-pass">${field('סיסמה נוכחית','current','password')}${field('סיסמה חדשה, לפחות 14 תווים','next','password')}${btn('שמירת סיסמה')}</form></div>`);
    document.querySelector('#change-pass').onsubmit=async e=>{e.preventDefault();try{await api('admin-password','POST',{current:document.querySelector('#current').value,next:document.querySelector('#next').value});await loadAdmin()}catch(err){notice(err.message,'error')}};
    return;
  }
  const r=await api('admin-list');let rows=r.items;
  const counters={total:rows.length,ongoing:rows.filter(x=>['assigned','in_progress'].includes(x.status)).length,waiting:rows.filter(x=>x.status==='submitted'&&!x.decision).length,reviewed:rows.filter(x=>!!x.decision).length};
  const translate={assigned:'הוזמן',in_progress:'בבחינה',submitted:'הוגש',accepted:'מתאים',rejected:'לא מתאים',follow_up:'בדיקה נוספת'};
  const kpi=(count,label,kind)=>`<div class="staff-kpi kpi-${kind}"><strong>${count}</strong><span>${label}</span></div>`;
  root.innerHTML=frame('ניהול בחינות עובדים','ממשק מנהל · יצירת מבחנים, מעקב ובדיקת תוצאות',`
    <div class="staff-identity"><span>${escape(admin.display_name)}</span><small>${escape(admin.jobTitle||admin.role)} · מספר אישי <b dir="ltr">${escape(admin.staffNumber||'—')}</b></small></div><div class="secure-toolbar operations-toolbar"><div class="secure-stats">${kpi(counters.total,'סה״כ בחינות','total')}${kpi(counters.ongoing,'הוזמנו / בבחינה','running')}${kpi(counters.waiting,'ממתינים להחלטה','waiting')}${kpi(counters.reviewed,'החלטות שהתקבלו','reviewed')}</div><button id="logout-admin" type="button" class="secondary-btn">התנתקות</button></div>
    <div class="secure-grid">
      <section class="secure-card staff-create-card"><div class="card-eyebrow">פתיחת מבחן</div><h2>הזמנת עובד לבחינה</h2><p>הזינו שם ותעודת זהות פיקטיבית בלבד. קוד ההזמנה יוצג לאחר היצירה.</p>
        <form id="assign" novalidate>${field('שם מלא של העובד','worker-name','text','autocomplete="off" maxlength="120"')}${field('תעודת זהות (נתוני הדגמה בלבד)','worker-doc','text','autocomplete="off" inputmode="numeric" pattern="[0-9]{9}" maxlength="9"')}${btn('יצירת הזמנה')}</form><div id="invitation"></div>
      </section>
      <section class="secure-card staff-list-card"><div class="secure-section-head"><div><div class="card-eyebrow">מעקב ובקרה</div><h2>נבחנים ותוצאות <span id="visible-count" class="list-count"></span></h2></div></div>
        <div class="candidate-filters"><label><span>חיפוש עובד</span><input id="search" type="search" placeholder="חיפוש לפי שם" autocomplete="off"></label><label><span>מצב בחינה</span><select id="status-filter"><option value="all">כל המצבים</option><option value="active">בהמתנה / בבחינה</option><option value="submitted">ממתינים להחלטה</option><option value="reviewed">עם החלטה</option></select></label></div>
        <div class="table-wrap"><table class="staff-record-table"><thead><tr><th>עובד</th><th>תעודת זהות</th><th>שלב</th><th>תוצאה</th><th>החלטה</th><th>תאריך</th><th>פעולה</th></tr></thead><tbody id="candidate-rows"></tbody></table></div>
        <div class="list-pagination"><span id="list-range" aria-live="polite"></span><div class="pagination-controls"><button type="button" class="secondary-btn" id="page-prev">הקודם</button><button type="button" class="secondary-btn" id="page-next">הבא</button></div></div>
      </section>
    </div>
    ${admin.role==='owner'?`<section class="secure-card staff-management" id="staff-management"><div class="card-eyebrow">בעלים / ניהול אחראים והרשאות</div><h2>ניהול אחראים והרשאות</h2><p>נתוני הדגמה בלבד. שירות למנהלים מורשים בלבד</p>
      <div class="staff-access-grid"><form id="staff-create" novalidate><h3>רישום אחראי חדש</h3><label class="secure-field"><span>שם מלא</span><input id="staff-name" required minlength="2" maxlength="90" autocomplete="off" placeholder="TEST" /></label><label class="secure-field"><span>מספר אישי (4-10)</span><input id="staff-number" required inputmode="numeric" pattern="[0-9]{4,10}" maxlength="10" autocomplete="off" placeholder="000245" /></label><label class="secure-field"><span>תפקיד</span><select id="staff-role" required><option value="manager">מנהל</option><option value="hr">משאבי אנוש</option></select></label><label class="secure-field"><span>סיסמה זמנית</span><input id="staff-password" type="password" minlength="8" maxlength="128" required autocomplete="new-password" placeholder="8+" /></label><button class="primary-btn" type="submit">רישום אחראי חדש</button></form><div class="staff-account-list"><h3>אחראים רשומים</h3><div id="staff-rows" aria-live="polite"></div></div></div>
    </section>`:''}
    <section class="audit-panel"><div><div class="card-eyebrow">תיעוד פעולות</div><h2>פעילות אחרונה</h2></div><div id="activity-list" class="activity-list"></div></section>
  `);
  let page=0;const pageSize=8;
  const renderRows=()=>{
    const query=document.querySelector('#search').value.trim().toLocaleLowerCase('he-IL');
    const status=document.querySelector('#status-filter').value;
    const matching=rows.filter(x=>x.name.toLocaleLowerCase('he-IL').includes(query) && (status==='all'||(status==='active'&&['assigned','in_progress'].includes(x.status))||(status==='submitted'&&x.status==='submitted'&&!x.decision)||(status==='reviewed'&&!!x.decision)));
    const pages=Math.max(1,Math.ceil(matching.length/pageSize));page=Math.min(page,pages-1);
    const pageRows=matching.slice(page*pageSize,(page+1)*pageSize);
    const tbody=document.querySelector('#candidate-rows');
    tbody.innerHTML=pageRows.map(x=>`<tr><td class="person-cell"><strong>${escape(x.name)}</strong><small class="responsible-line">אחראי: ${escape(x.responsible||'—')}</small></td><td class="masked" dir="ltr">••••${escape(x.identityLast4)}</td><td><span class="status-pill status-${x.status}">${translate[x.status]||escape(x.status)}</span></td><td class="score-cell">${x.score==null?'—':`${x.correctCount}/30 · ${x.score}%`}</td><td>${x.decision?`<span class="decision-pill decision-${x.decision}">${translate[x.decision]}</span>`:'ממתין'}</td><td>${new Date(x.createdAt).toLocaleDateString('he-IL')}</td><td><button type="button" class="small-action" data-open="${x.id}">${x.decision?'פרטי החלטה':x.status==='submitted'?'בדיקה והחלטה':'פרטי בחינה'}</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty-state">אין נבחנים התואמים לסינון. ניתן לשנות את החיפוש או לבחור מצב אחר.</td></tr>';
    const head=[...document.querySelectorAll('.staff-record-table thead th')];
    tbody.querySelectorAll('tr').forEach(tr=>tr.querySelectorAll('td').forEach((td,i)=>{if(!td.hasAttribute('colspan'))td.dataset.label=head[i]?.textContent||''}));
    tbody.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openRecord(rows.find(x=>x.id===b.dataset.open)));
    document.querySelector('#visible-count').textContent=matching.length;
    document.querySelector('#list-range').textContent=matching.length?`מציג ${page*pageSize+1}–${Math.min((page+1)*pageSize,matching.length)} מתוך ${matching.length}`:'אין תוצאות';
    document.querySelector('#page-prev').disabled=page===0;document.querySelector('#page-next').disabled=page>=pages-1;
  };
  renderRows();
  document.querySelector('#search').oninput=()=>{page=0;renderRows()};
  document.querySelector('#status-filter').onchange=()=>{page=0;renderRows()};
  document.querySelector('#page-prev').onclick=()=>{if(page>0){page--;renderRows()}};
  document.querySelector('#page-next').onclick=()=>{page++;renderRows()};
  document.querySelector('#logout-admin').onclick=async()=>{try{await api('admin-logout','POST');admin=null;startPage()}catch(err){notice(err.message,'error')}};
  document.querySelector('#assign').onsubmit=async e=>{
    e.preventDefault();const name=document.querySelector('#worker-name').value.trim(),doc=document.querySelector('#worker-doc').value.trim();
    if(name.length<2){notice('יש להזין שם מלא של נבחן לדוגמה','error');document.querySelector('#worker-name').focus();return}
    if(!/^000000[0-9]{3}$/.test(doc)){notice('בהדגמה נדרשת תעודת זהות פיקטיבית בת 9 ספרות המתחילה ב-000000','error');document.querySelector('#worker-doc').focus();return}
    try{
      const x=await api('admin-assign','POST',{name,document:doc});latestCode=x.code;
      rows=[x.candidate,...rows];page=0;document.querySelector('#search').value='';document.querySelector('#status-filter').value='all';renderRows();
      document.querySelector('#worker-doc').value='';document.querySelector('#worker-name').value='';
      const message=`אלקטרה אפיקים – הזמנת מבחן להדגמה\nעובד: ${name}\nקוד אישי: ${x.code}\nכניסה: ${new URL('./',location.href).href}\nיש להזין את תעודת הזהות הפיקטיבית שנרשמה בעת יצירת הבחינה.`;
      document.querySelector('#invitation').innerHTML=`<div class="invitation invitation-v4"><strong>ההזמנה נוצרה</strong><p>קוד הכניסה:</p><code>${escape(x.code)}</code><button id="copy-invite" type="button" class="secondary-btn">העתקת פרטי הזמנה</button><small>הנתונים זמינים רק בדפדפן זה — העברת קוד למכשיר אחר אינה נתמכת בדמו.</small></div>`;
      document.querySelector('#copy-invite').onclick=async()=>{try{await navigator.clipboard.writeText(message);notice('פרטי ההזמנה הועתקו')}catch{notice('העתקה לא זמינה כאן; ניתן לסמן ולהעתיק את הקוד המוצג','error')}};
      notice('נוצרה הזמנה חדשה להדגמה. ניתן לפתוח את התיק מהרשימה.');
    }catch(err){notice(err.message,'error')}
  };
  try{
    const hist=await api('admin-history');
    const types={assigned:'יצירת מבחן',submitted:'הגשת מבחן',reviewed:'החלטת מנהל'};
    const holder=document.querySelector('#activity-list');
    if(holder)holder.innerHTML=hist.items.length?hist.items.map(e=>`<div class="activity-row"><span class="activity-indicator"></span><div><strong>${types[e.action]||'עדכון במערכת'}</strong><span>${escape(e.candidateName||'עובד לדוגמה')}</span></div><time>${new Date(e.time).toLocaleString('he-IL')}</time></div>`).join(''):'<p class="activity-empty">פעולות חדשות יוצגו כאן לאחר יצירת בחינה או שמירת החלטה.</p>';
  }catch{const holder=document.querySelector('#activity-list');if(holder)holder.textContent='רישום הפעילות אינו זמין כעת.'}
  if(admin.role==='owner')await renderStaffManagement();
}

async function renderStaffManagement(){
  const holder=document.querySelector('#staff-rows');if(!holder)return;
  try{
    const x=await api('admin-staff-list');
    holder.innerHTML=x.items.map(a=>`<div class="staff-account-row"><div class="staff-account-name"><strong>${escape(a.display_name)}</strong><small>${escape(a.jobTitle)} · <b dir="ltr">${escape(a.staffNumber)}</b></small></div><div class="staff-account-actions"><span class="status-pill ${a.is_active?'status-submitted':'status-assigned'}">${a.is_active?'פעיל':'מושבת'}</span>${a.role==='owner'?'':`<button type="button" class="secondary-btn staff-toggle" data-staff-id="${a.id}" data-action="${a.is_active?'off':'on'}">${a.is_active?'השבתה':'הפעלה'}</button>`}</div></div>`).join('')||'<p>אין אחראים רשומים</p>';
    holder.querySelectorAll('[data-staff-id]').forEach(button=>button.onclick=()=>{
      const selected=x.items.find(s=>s.id===button.dataset.staffId);const active=button.dataset.action==='on';
      const box=document.createElement('div');box.className='exam-confirm';box.setAttribute('role','alertdialog');box.setAttribute('aria-modal','true');
      box.innerHTML=`<div class="exam-confirm-panel"><h3>${active?'הפעלה':'השבתה'} · ${escape(selected.display_name)}</h3><p>${active?'פעיל':'מושבת'} · ${escape(selected.jobTitle)} · ${escape(selected.staffNumber)}</p><div><button id="cancel-staff-toggle" class="secondary-btn" type="button">\u05d1\u05d9\u05d8\u05d5\u05dc</button><button id="confirm-staff-toggle" class="primary-btn" type="button">${active?'הפעלה':'השבתה'}</button></div></div>`;
      document.querySelector('#root').append(box);
      const close=()=>{box.remove();button.focus()};
      box.querySelector('#cancel-staff-toggle').onclick=close;
      box.querySelector('#confirm-staff-toggle').onclick=async()=>{try{await api('admin-staff-toggle','POST',{id:selected.id,active});box.remove();await renderStaffManagement();notice('ההרשאה הונפקה ונשמרה בדפדפן ההדגמה')}catch(err){close();notice(err.message,'error')}};
      box.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const btns=[...box.querySelectorAll('button')];const i=btns.indexOf(document.activeElement);if((e.shiftKey&&i===0)||(!e.shiftKey&&i===btns.length-1)){e.preventDefault();btns[e.shiftKey?btns.length-1:0].focus()}}});
      box.querySelector('#cancel-staff-toggle').focus();
    });
  }catch(err){holder.textContent=err.message;}
  const f=document.querySelector('#staff-create');if(!f)return;
  f.onsubmit=async e=>{
    e.preventDefault();const display_name=document.querySelector('#staff-name').value.trim(),staffNumber=document.querySelector('#staff-number').value.trim(),password=document.querySelector('#staff-password').value,role=document.querySelector('#staff-role').value;
    if(display_name.length<2){notice('שם האחראי קצר מדי','error');return}
    if(!/^\d{4,10}$/.test(staffNumber)){notice('מספר אישי חייב להכיל 4 עד 10 ספרות','error');return}
    if(password.length<8){notice('סיסמה חייבת להכיל לפחות 8 תווים','error');return}
    try{await api('admin-staff-create','POST',{display_name,staffNumber,role,password});f.reset();await renderStaffManagement();notice('האחראי נרשם בהצלחה')}catch(err){notice(err.message,'error')}
  };
}

async function openRecord(x){
  if(!x)return loadAdmin();
  let detail;
  try{detail=await api('admin-detail','GET',{id:x.id})}catch(err){return notice(err.message,'error')}
  const c=detail.candidate||x;
  const translate={assigned:'הוזמן',in_progress:'בתהליך',submitted:'הוגש',accepted:'מתאים',rejected:'לא מתאים',follow_up:'נדרשת בדיקה נוספת'};
  const when=v=>v?new Date(v).toLocaleString('he-IL'):'—';
  const reviewAllowed=c.status==='submitted'&&!c.decision;
  const answers=detail.questions||[];
  root.innerHTML=frame('תיק הבחינה',`נבחן/ת: ${escape(c.name)} · בדיקה מקצועית לפני החלטה`,`
    <div class="record-toolbar"><button id="back" type="button" class="secondary-btn">חזרה לרשימת נבחנים</button><span class="status-pill status-${c.status}">${translate[c.status]||escape(c.status)}</span></div>
    <section class="secure-card record-summary"><div><div class="card-eyebrow">פרטי בחינה</div><h2>${escape(c.name)}</h2><p>תעודת זהות (מוסתרת): <span dir="ltr">••••${escape(c.identityLast4)}</span></p><p class="responsible-line">אחראי: ${escape(c.responsible||'—')}</p></div><div class="record-facts"><div><small>ציון</small><strong>${c.correctCount==null?'טרם הוגש':`${c.correctCount} / 30 · ${c.score}%`}</strong></div><div><small>נוצר</small><strong>${when(c.createdAt)}</strong></div><div><small>הוגש</small><strong>${when(c.submittedAt)}</strong></div><div><small>החלטה</small><strong>${translate[c.decision]||'ממתין להחלטה'}</strong></div></div></section>
    ${c.decision?`<section class="secure-card decision-readonly"><div class="card-eyebrow">החלטה מתועדת</div><h2>${translate[c.decision]}</h2><p>${escape(c.decisionNotes||'לא צורף נימוק')}</p><small>תאריך החלטה: ${when(c.reviewedAt)}</small></section>`:''}
    ${c.status==='submitted'?`<section class="secure-card review-questions"><div class="card-eyebrow">בדיקת המבחן</div><h2>פירוט תשובות · 30 שאלות</h2><p>פירוט זה מוצג למנהל בלבד. ציון הבחינה אינו קובע אוטומטית התאמה לעבודה.</p>${answers.length?`<div class="review-answers">${answers.map((q,i)=>`<details class="review-answer"><summary><span>שאלה ${i+1}</span><strong>${escape(q.question)}</strong><span class="response-tag ${q.selectedOption==null?'response-none':q.correct?'response-right':'response-wrong'}">${q.selectedOption==null?'אין נתון':q.correct?'נכון':'לא נכון'}</span></summary><div class="review-answer-body"><p>תשובת העובד: <strong>${q.selectedOption==null?'לא נענתה':escape(q.options[q.selectedOption])}</strong></p><p>התשובה הנכונה: <strong>${escape(q.options[q.correctOption])}</strong></p><p class="answer-explanation">${escape(q.explanation)}</p></div></details>`).join('')}</div>`:'<p class="activity-empty">נתוני שאלות מפורטים אינם זמינים לרשומת הדוגמה הזאת.</p>'}</section>`:''}
    ${reviewAllowed?`<section class="secure-card review-decision"><div class="card-eyebrow">אישור אנושי</div><h2>החלטת המנהל</h2><p>יש לבחור החלטה ולצרף הסבר מקצועי. הציון הוא מידע מסייע, לא אישור אוטומטי.</p><form id="review-form" novalidate><label class="secure-field"><span>החלטה</span><select id="decision"><option value="" selected disabled>בחירת החלטה</option><option value="accepted">מתאים</option><option value="rejected">לא מתאים</option><option value="follow_up">נדרשת בדיקה נוספת</option></select></label><label class="secure-field"><span>נימוק מקצועי (חובה)</span><textarea id="notes" rows="4" minlength="3" maxlength="1000" placeholder="מהם הנימוקים המקצועיים להחלטה?"></textarea></label><button type="submit" class="primary-btn">שמירת החלטה</button></form></section>`:c.status!=='submitted'?'<section class="secure-card pending-note"><p>עדיין לא ניתן להחליט על התאמה: הנבחן טרם הגיש את הבחינה.</p></section>':''}
  `);
  document.querySelector('#back').onclick=loadAdmin;
  const f=document.querySelector('#review-form');if(!f)return;
  f.onsubmit=async e=>{
    e.preventDefault();const decision=document.querySelector('#decision').value,notes=document.querySelector('#notes').value.trim();
    if(!decision){notice('בחרו החלטה לפני שמירה','error');document.querySelector('#decision').focus();return}
    if(notes.length<3){notice('נדרש נימוק מקצועי בן שלושה תווים לפחות','error');document.querySelector('#notes').focus();return}
    try{await api('admin-review','POST',{id:c.id,decision,notes});await loadAdmin();notice('ההחלטה נרשמה ונשמרה בתיק הבחינה')}catch(err){notice(err.message,'error')}
  };
}

async function boot(){try{const m=await api('admin-me');admin=m.admin;await loadAdmin();return}catch{}startPage()};boot();
