
const root=document.querySelector('#root');let admin=null,candidate=null,questions=[],answers={},active=0,deadline=0,timer=null,latestCode='';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=window.AfikimDemoAPI;
const notice=(msg,type='ok')=>{let p=document.querySelector('#notice');if(!p){p=document.createElement('div');p.id='notice';p.className='feedback';root.prepend(p)}p.textContent=msg;p.className='feedback '+type;p.setAttribute('role','status');p.setAttribute('aria-live','polite')};
const frame=(title,sub,inner)=>`<section class="secure-heading"><span class="secure-label">אלקטרה אפיקים | ניהול הכשרות</span><h1>${title}</h1><p>${sub}</p></section>${inner}`;
const btn=(label,type='submit')=>`<button type="${type}" class="primary-btn">${label}</button>`;
const field=(label,id,type='text',extra='')=>`<label class="secure-field"><span>${label}</span><input id="${id}" type="${type}" required ${extra}></label>`;

function startPage(){
  root.innerHTML=frame('בחינה אישית לעובד','כניסה לבחינה שנפתחה עבורך על ידי גורם מוסמך',`
    <section class="secure-card worker-login-card">
      <div class="card-eyebrow">כניסה למבחן</div>
      <h2>פרטי הבחינה שלך</h2>
      <p>יש להזין את קוד ההזמנה ואת מספר תעודת הזהות שנרשם בעת יצירת הבחינה.</p>
      <form id="entry" novalidate>
        ${field('קוד הזמנה','login-code','text','autocomplete="off" autocapitalize="characters" maxlength="32"')}
        ${field('תעודת זהות','login-doc','text','autocomplete="off" inputmode="numeric" pattern="[0-9]{9}" maxlength="9"')}
        ${btn('כניסה למבחן')}
      </form>
      <p class="secure-help">גרסת הדגמה: אין להזין פרטים אישיים אמיתיים.</p>
      <div class="demo-quick"><strong>מבחן ניסיון</strong><span>קוד: DEMO2026WORKER · תעודת זהות לדוגמה: 000000123</span>
        <button type="button" id="demo-fill" class="secondary-btn">מילוי פרטי דוגמה</button></div>
    </section>`);
  document.querySelector('#demo-fill').onclick=()=>{document.querySelector('#login-code').value='DEMO2026WORKER';document.querySelector('#login-doc').value='000000123'};
  document.querySelector('#entry').onsubmit=async e=>{e.preventDefault();try{
    const x=await api('worker-login','POST',{code:document.querySelector('#login-code').value,document:document.querySelector('#login-doc').value});candidate=x;await loadExam()
  }catch(e){notice(e.message,'error')}};
}
async function loadExam(){
  const m=await api('worker-me');candidate=m.candidate;
  if(candidate.status==='submitted'){
    if(timer)clearInterval(timer);
    root.innerHTML=frame('המבחן הוגש בהצלחה','הטופס הושלם ונשמר בדפדפן ההדגמה',`<section class="secure-card exam-done"><div class="done-mark">✓</div><h2>הבחינה של ${escape(candidate.name)} הושלמה</h2><div class="worker-receipt" role="status"><strong>המבחן הושלם ונשלח לבדיקה</strong><span>תוצאות הבחינה מוצגות לגורם האחראי בלבד</span></div><p>ההחלטה לגבי התאמה לתפקיד מתקבלת בנפרד על ידי מנהל מוסמך. אין כאן אישור העסקה אוטומטי.</p><button type="button" class="secondary-btn" id="exit-worker">התנתקות</button></section>`);
    document.querySelector('#exit-worker').onclick=async()=>{try{await api('worker-logout','POST');candidate=null;startPage()}catch(err){notice(err.message,'error')}};return;
  }
  const r=await api('worker-questions');questions=r.questions;answers=r.answers||{};deadline=Date.now()+m.remainingSeconds*1000;
  try{active=Math.max(0,Math.min(questions.length-1,Number(localStorage.getItem('afikim-demo-last-question-'+candidate.id))||0))}catch{active=0}
  renderExam();
}
function renderExam(){
  if(timer)clearInterval(timer);
  const q=questions[active],answered=questions.filter(x=>Number.isInteger(answers[x.id])).length;
  try{localStorage.setItem('afikim-demo-last-question-'+candidate.id,String(active))}catch{}
  root.innerHTML=frame('מבחן מקצועי למבקרי תחבורה ציבורית',`נבחן/ת: ${escape(candidate.name)} · השאלות והתשובות נשמרות בדפדפן הדגמה זה`,`
    <div class="exam-workspace">
      <section class="secure-card exam-secure v4-exam"><div class="exam-top"><span class="exam-section">${escape(q.section)}</span><span id="clock" class="exam-clock" aria-label="זמן שנותר" role="timer">—</span></div>
        <div class="exam-step"><span>שאלה <b>${active+1}</b> מתוך ${questions.length}</span><span class="answered-count">נענו ${answered} / ${questions.length}</span></div>
        <div class="secure-progress" aria-label="התקדמות לפי שאלות שנענו"><span style="width:${answered/questions.length*100}%"></span></div>
        <h2>${escape(q.question)}</h2>
        <div class="answer-grid" role="group" aria-label="בחירת תשובה לשאלה ${active+1}">${q.options.map((opt,i)=>`<button type="button" data-choice="${i}" aria-pressed="${answers[q.id]===i?'true':'false'}" class="choice ${answers[q.id]===i?'selected':''}"><span>${'אבגד'[i]}</span>${escape(opt)}</button>`).join('')}</div>
        <div class="form-actions exam-actions"><button id="prev" type="button" class="secondary-btn" ${active===0?'disabled':''}>שאלה קודמת</button><button id="next" type="button" class="primary-btn">${active===questions.length-1?'סיום ובדיקה':'השאלה הבאה'}</button></div>
        <p class="secure-help exam-hint">ניתן לדלג ולחזור. בסיום תוצג בקשת אישור לפני הגשה.</p>
      </section>
      <aside class="exam-navigator"><div class="exam-nav-head"><strong>מעבר בין שאלות</strong><span>${answered} נענו</span></div><div class="exam-number-grid">${questions.map((item,i)=>`<button type="button" data-go="${i}" aria-label="שאלה ${i+1}${Number.isInteger(answers[item.id])?', נענתה':''}" aria-current="${i===active?'step':'false'}" class="${i===active?'current':''} ${Number.isInteger(answers[item.id])?'answered':''}">${i+1}</button>`).join('')}</div><div class="exam-nav-foot"><span><i class="legend-answered"></i> נענתה</span><span><i class="legend-current"></i> נוכחית</span></div><button type="button" id="exit-in-progress" class="secondary-btn exam-save-exit">יציאה ושמירת התקדמות</button></aside>
    </div>
  `);
  const update=()=>{
    const left=Math.max(0,Math.floor((deadline-Date.now())/1000));
    const el=document.querySelector('#clock');if(el)el.textContent=`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;
    if(left===0){clearInterval(timer);timer=null;submit()}
  };
  update();timer=setInterval(update,1000);
  document.querySelectorAll('[data-choice]').forEach(button=>button.onclick=async()=>{
    const choice=Number(button.dataset.choice);document.querySelectorAll('[data-choice]').forEach(b=>b.disabled=true);
    try{await api('worker-answer','POST',{questionId:q.id,selectedOption:choice});answers[q.id]=choice;renderExam()}catch(err){notice(err.message,'error');document.querySelectorAll('[data-choice]').forEach(b=>b.disabled=false)}
  });
  document.querySelectorAll('[data-go]').forEach(button=>button.onclick=()=>{active=Number(button.dataset.go);renderExam()});
  document.querySelector('#prev').onclick=()=>{if(active>0){active--;renderExam()}};
  document.querySelector('#next').onclick=()=>{
    if(active<questions.length-1){active++;renderExam();return}
    const missing=questions.filter(x=>!Number.isInteger(answers[x.id])).length;
    if(document.querySelector('.exam-confirm'))return;
    const box=document.createElement('div');box.className='exam-confirm';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','confirm-title');
    box.innerHTML=`<div class="exam-confirm-panel"><h3 id="confirm-title">הגשת הבחינה</h3><p>${missing?`עדיין קיימות ${missing} שאלות ללא תשובה.`:'כל השאלות נענו.'} לאחר הגשה לא ניתן לשנות תשובות.</p><div><button id="cancel-submit" class="secondary-btn" type="button">חזרה למבחן</button><button id="confirm-submit" class="primary-btn" type="button">אישור והגשה</button></div></div>`;
    root.append(box);document.querySelector('#cancel-submit').onclick=()=>{box.remove();document.querySelector('#next')?.focus()};document.querySelector('#confirm-submit').onclick=submit;document.querySelector('#cancel-submit').focus();
    box.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();box.remove();document.querySelector('#next')?.focus()} if(e.key==='Tab'){const buttons=[...box.querySelectorAll('button')];const index=buttons.indexOf(document.activeElement);if(e.shiftKey&&index===0){e.preventDefault();buttons.at(-1).focus()}else if(!e.shiftKey&&index===buttons.length-1){e.preventDefault();buttons[0].focus()}}});
  };
  document.querySelector('#exit-in-progress').onclick=async()=>{
    if(timer)clearInterval(timer);timer=null;
    try{await api('worker-logout','POST');candidate=null;startPage();notice('התקדמות הבחינה נשמרה בדפדפן הזה')}catch(err){notice(err.message,'error')}
  };
}
async function submit(){clearInterval(timer);try{await api('worker-submit','POST');await loadExam()}catch(err){notice(err.message,'error')}}

async function boot(){try{const m=await api('worker-me');candidate=m.candidate;await loadExam();return}catch{}startPage()};boot();
