/* Electra Afikim / BRILL TEAM PROJECT. Worker-only examination interface. */
(()=>{
'use strict';
const root=document.getElementById('root');
const state={phase:'loading',candidate:null,questions:[],answers:{},active:0,deadline:0,saving:false,submitting:false,tick:null,confirming:false};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const letters=['א','ב','ג','ד'];
const formatTime=seconds=>pad(Math.floor(seconds/60))+':'+pad(seconds%60);
const answered=()=>state.questions.filter(q=>Number.isInteger(state.answers[q.id])).length;
const errorText=(x)=>x?.message||'לא ניתן להשלים את הפעולה כרגע. נסו שוב.';
async function api(path,method='GET',body){
 const response=await fetch('/api/'+path,{method,credentials:'same-origin',cache:'no-store',
 headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
 body:body?JSON.stringify(body):undefined});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){const err=new Error(data.error||'שגיאת תקשורת. נסו שוב.');err.status=response.status;throw err;}
 return data;
}
function notice(text,type='error'){
 const node=root.querySelector('[data-notice]');
 if(!node)return;
 node.className='exam-notice'+(type==='success'?' is-success':' is-error');
 node.textContent=text;node.hidden=!text;
}
function stopClock(){if(state.tick){clearInterval(state.tick);state.tick=null;}}
function set(html){root.className='worker-main';root.innerHTML=html;}
function showLogin(message=''){
 stopClock();state.phase='login';
 set(`
 <div class="worker-login">
  <section class="worker-intro" aria-labelledby="worker-heading">
   <div class="worker-eyebrow"><span class="worker-accent"></span> אלקטרה אפיקים / פורטל בחינות</div>
   <h1 id="worker-heading">הבחינה שלך.<br>הכניסה האישית שלך.</h1>
   <p>נכנסים באמצעות קוד הבחינה שנמסר לך ומספר תעודת הזהות שנרשם במערכת. לכל עובד קוד אישי משלו.</p>
   <div class="worker-intro-footer"><span class="worker-intro-line"></span> בחינה מקצועית לעובדי התחבורה הציבורית</div>
  </section>
  <section class="worker-login-panel" aria-labelledby="worker-form-heading">
   <span class="worker-identity-label">כניסה לבחינה</span>
   <h2 id="worker-form-heading">פרטי זיהוי</h2>
   <p class="worker-login-description">יש להזין את שני הפרטים בדיוק כפי שנמסרו לך.</p>
   <form id="worker-entry" novalidate>
    <label class="worker-field" for="exam-code"><span>קוד בחינה אישי</span><input id="exam-code" name="code" inputmode="text" dir="ltr" autocomplete="off" spellcheck="false" autocapitalize="characters" maxlength="100" required placeholder="הקוד שקיבלת מהמנהל"><small>הקוד ייחודי לך ואינו ניתן להעברה לעובד אחר.</small></label>
    <label class="worker-field" for="exam-id"><span>תעודת זהות</span><input id="exam-id" name="document" type="text" inputmode="numeric" dir="ltr" autocomplete="off" pattern="[0-9]{9}" maxlength="9" required placeholder="9 ספרות"><small>יש להזין 9 ספרות, כולל אפסים בתחילת המספר.</small></label>
    <div class="exam-notice is-error" data-notice role="alert" hidden></div>
    <button class="worker-primary" type="submit" id="worker-enter"><span>כניסה למבחן</span><span aria-hidden="true">←</span></button>
   </form>
   <p class="worker-entry-note">לא קיבלת קוד? יש לפנות למנהל האחראי. לאחר הגשת המבחן לא ניתן להיכנס אליו שוב.</p>
  </section>
 </div>`);
 if(message)notice(message);
 const form=root.querySelector('#worker-entry'),code=form.querySelector('#exam-code'),doc=form.querySelector('#exam-id'),button=form.querySelector('#worker-enter');
 code.addEventListener('input',()=>{code.value=code.value.toUpperCase().replace(/\s/g,'');notice('')});
 doc.addEventListener('input',()=>{doc.value=doc.value.replace(/[^0-9]/g,'');notice('')});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled)return;
  const c=code.value.trim().toUpperCase(),d=doc.value.trim();
  if(c.length<12){notice('יש להזין את קוד הבחינה האישי שנמסר לך.');code.focus();return;}
  if(!/^[0-9]{9}$/.test(d)){notice('מספר תעודת הזהות צריך להכיל 9 ספרות בדיוק.');doc.focus();return;}
  button.disabled=true;button.setAttribute('aria-busy','true');
  try{await api('worker-login','POST',{code:c,document:d});await loadSession();}
  catch(err){notice(errorText(err));button.disabled=false;button.removeAttribute('aria-busy');}
 });
}
function showReceipt(){
 stopClock();state.phase='submitted';state.confirming=false;
 const c=state.candidate||{};
 set(`<section class="worker-receipt" aria-labelledby="receipt-title">
  <div class="worker-receipt-icon" aria-hidden="true">✓</div>
  <div class="worker-eyebrow">אלקטרה אפיקים / אישור הגשה</div>
  <h1 id="receipt-title">המבחן הוגש בהצלחה</h1>
  <p>התשובות נשמרו במערכת והועברו לבדיקת המנהל המוסמך.</p>
  <div class="worker-receipt-details"><div><span>שם הנבחן/ת</span><strong>${escape(c.name||'—')}</strong></div><div><span>מצב הבחינה</span><strong>הוגשה, ממתינה לבדיקה</strong></div></div>
  <p class="worker-receipt-note">הקוד האישי נסגר ואינו מאפשר כניסה נוספת למבחן. הציון וההחלטה מוצגים למנהל בלבד.</p>
  <button type="button" id="worker-exit" class="worker-secondary">סיום ויציאה</button>
  <div class="exam-notice is-error" data-notice role="alert" hidden></div>
 </section>`);
 root.querySelector('#worker-exit').addEventListener('click',async()=>{try{await api('worker-logout','POST');showLogin()}catch(err){notice(errorText(err))}});
}
function timeLeft(){return Math.max(0,Math.ceil((state.deadline-Date.now())/1000));}
function updateClock(){
 const target=root.querySelector('[data-clock]');if(!target)return;
 const time=timeLeft();target.textContent=formatTime(time);
 target.closest('.worker-timer')?.classList.toggle('is-low',time<=120);
 if(time===0&&!state.submitting&&state.phase==='exam')finalize(true);
}
function progress(){
 const current=state.active+1,total=state.questions.length,done=answered();
 return `<div class="worker-progress-info"><span>שאלה <strong>${current}</strong> מתוך ${total}</span><span>${done} תשובות נשמרו</span></div><div class="worker-progress-track" role="progressbar" aria-valuenow="${done}" aria-valuemax="${total}" aria-valuemin="0" aria-label="תשובות שמורות"><span style="width:${done/total*100}%"></span></div>`;
}
function navHtml(){
 return `<aside class="worker-navigator" aria-label="מעבר בין שאלות"><div class="worker-nav-head"><strong>השאלות שלך</strong><small>בחירה בשאלה למעבר</small></div>
 <div class="worker-nav-grid">${state.questions.map((q,i)=>`<button type="button" data-go="${i}" class="worker-nav-item ${i===state.active?'is-current':''} ${Number.isInteger(state.answers[q.id])?'is-answered':''}" aria-label="שאלה ${i+1}, ${Number.isInteger(state.answers[q.id])?'נענתה':'ללא תשובה'}" ${i===state.active?'aria-current="step"':''}>${i+1}</button>`).join('')}</div>
 <div class="worker-nav-legend"><span><i class="worker-legend-dot is-answered"></i> נשמר</span><span><i class="worker-legend-dot"></i> טרם נענה</span></div></aside>`;
}
function renderQuestion(){
 state.phase='exam';stopClock();
 const q=state.questions[state.active];if(!q)return showLogin('לא ניתן לטעון את הבחינה. אנא פנו למנהל.');
 const selected=state.answers[q.id];
 set(`<div class="worker-exam">
  <header class="worker-exam-header"><div class="worker-exam-heading"><div class="worker-eyebrow">אלקטרה אפיקים / בחינה מקצועית</div><h1>מבחן מבקרי תחבורה ציבורית</h1><p>נבחן/ת: <strong>${escape(state.candidate?.name||'')}</strong></p></div><div class="worker-timer" role="timer" aria-label="הזמן שנותר"><span class="worker-timer-caption">זמן שנותר</span><strong data-clock>--:--</strong></div></header>
  <div class="worker-progress">${progress()}</div>
  <div class="worker-exam-layout">
   <article class="worker-question-card" aria-labelledby="question-heading">
    <div class="worker-question-meta"><span>${escape(q.section||'בחינה מקצועית')}</span><span>שאלה ${state.active+1} / ${state.questions.length}</span></div>
    <h2 id="question-heading" tabindex="-1">${escape(q.question)}</h2>
    <div class="worker-choice-list" role="group" aria-label="בחירת תשובה לשאלה ${state.active+1}">${q.options.map((opt,i)=>`<button type="button" class="worker-choice ${selected===i?'is-selected':''}" data-answer="${i}" aria-pressed="${selected===i}" ${state.saving?'disabled':''}><span class="worker-choice-letter" aria-hidden="true">${letters[i]||i+1}</span><span class="worker-choice-text">${escape(opt)}</span><span class="worker-choice-mark" aria-hidden="true">${selected===i?'✓':''}</span></button>`).join('')}</div>
    <p class="worker-save-status" id="worker-save-status" role="status">${Number.isInteger(selected)?'התשובה נשמרה בשרת':'יש לבחור את התשובה המתאימה ביותר.'}</p>
    <div class="exam-notice is-error" data-notice role="alert" hidden></div>
    <div class="worker-question-actions">
     <button type="button" class="worker-secondary" id="worker-prev" ${state.active===0?'disabled':''}>השאלה הקודמת</button>
     <button type="button" class="worker-primary" id="worker-next">${state.active===state.questions.length-1?'לסיום הבחינה':'השאלה הבאה'} <span aria-hidden="true">←</span></button>
    </div>
   </article>
   ${navHtml()}
  </div>
 </div>`);
 root.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>go(Number(el.dataset.go))));
 root.querySelectorAll('[data-answer]').forEach(el=>el.addEventListener('click',()=>saveAnswer(Number(el.dataset.answer),el)));
 root.querySelector('#worker-prev').addEventListener('click',()=>go(state.active-1));
 root.querySelector('#worker-next').addEventListener('click',()=>state.active===state.questions.length-1?showConfirmation():go(state.active+1));
 updateClock();state.tick=setInterval(updateClock,1000);
}
function go(index){if(state.saving||state.submitting||state.confirming||state.phase!=='exam')return;if(index<0||index>=state.questions.length)return;state.active=index;renderQuestion();root.querySelector('#question-heading')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
async function saveAnswer(value,button){
 if(state.saving||state.submitting||state.phase!=='exam')return;
 state.saving=true;const q=state.questions[state.active],status=root.querySelector('#worker-save-status');
 if(status)status.textContent='שומרים את התשובה…';
 root.querySelectorAll('[data-answer],[data-go],#worker-prev,#worker-next').forEach(el=>el.disabled=true);
 try{
  await api('worker-answer','POST',{questionId:q.id,selectedOption:value});
  state.answers[q.id]=value;state.saving=false;
  const nextFocus=value;renderQuestion();
  root.querySelector('[data-answer="'+nextFocus+'"]')?.focus({preventScroll:true});
 }catch(err){
  state.saving=false;
  if(err.status===401||err.status===403||err.status===409){showLogin('הגישה למבחן הסתיימה. פנו למנהל אם נדרש סיוע.');return;}
  notice(errorText(err));root.querySelectorAll('[data-answer],[data-go],#worker-prev,#worker-next').forEach(el=>{el.disabled=false});
 }
}
function showConfirmation(){
 if(state.saving||state.submitting||state.confirming)return;
 state.confirming=true;const left=state.questions.length-answered();
 const layer=document.createElement('div');layer.className='worker-dialog-backdrop';layer.id='worker-confirmation';
 layer.innerHTML=`<section class="worker-dialog" role="dialog" aria-modal="true" aria-labelledby="worker-confirm-title" aria-describedby="worker-confirm-description">
 <div class="worker-dialog-overline">סיום הבחינה</div><h2 id="worker-confirm-title">להגיש את המבחן?</h2>
 <p id="worker-confirm-description">${left?'נותרו '+left+' שאלות ללא תשובה.':'כל 30 השאלות נענו.'} לאחר ההגשה לא ניתן לחזור למבחן או לשנות תשובות.</p>
 <div class="exam-notice is-error" data-notice role="alert" hidden></div>
 <div class="worker-dialog-actions"><button type="button" class="worker-secondary" id="worker-cancel-submit">חזרה לשאלות</button><button type="button" class="worker-primary" id="worker-confirm-submit">הגשת המבחן</button></div>
 </section>`;
 root.append(layer);
 const cancel=()=>{layer.remove();state.confirming=false;renderQuestion();root.querySelector('#worker-next')?.focus();};
 layer.querySelector('#worker-cancel-submit').addEventListener('click',cancel);
 layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancel();}});
 layer.querySelector('#worker-confirm-submit').addEventListener('click',()=>finalize(false));
 layer.querySelector('#worker-cancel-submit').focus();
}
async function finalize(expired){
 if(state.submitting||state.phase!=='exam')return;
 state.submitting=true;const btn=root.querySelector('#worker-confirm-submit');if(btn)btn.disabled=true;
 try{
  await api('worker-submit','POST');
  state.candidate={...state.candidate,status:'submitted'};
  showReceipt();
 }catch(err){
  state.submitting=false;
  if(err.status===401||err.status===403)return showLogin('הגישה למבחן פגה.');
  if(!expired)notice(errorText(err));else notice('הזמן הסתיים. לא ניתן לשמור את ההגשה כרגע. נסו שוב.');
  if(btn)btn.disabled=false;
 }
}
async function loadSession(){
 try{
  const response=await api('worker-me');
  state.candidate=response.candidate;
  if(response.candidate?.status==='submitted'){showReceipt();return;}
  const data=await api('worker-questions');
  state.questions=data.questions||[];state.answers=data.answers||{};
  state.deadline=Date.now()+Number(response.remainingSeconds||0)*1000;
  state.active=0;
  if(state.questions.length!==30){showLogin('שאלות הבחינה אינן זמינות כעת. פנו למנהל.');return;}
  renderQuestion();
 }catch(err){
  if(err.status===401)return showLogin();
  if(err.status===409)return showLogin('מועד הבחינה הסתיים או שהמבחן כבר הוגש.');
  showLogin('שגיאה בחיבור למערכת. נא לנסות שוב.');
 }
}
loadSession();
})();