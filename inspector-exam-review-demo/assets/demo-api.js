
/* Electra Afikim — isolated interactive DEMO, not an authentication service.
   Only fictitious TEST* document IDs accepted. All data is browser-local. */
(() => {
  'use strict';
  const STORE = 'afikim-exam-demo-data-v2';
  const SESSION = 'afikim-exam-demo-session-v2';
  const originNow = () => Date.now();
  const err = (message) => { throw Error(message); };
  const sampleManager = { id: 'demo-manager', username: 'demo', display_name: 'מנהל הדגמה', role: 'owner', must_change_password: false };
  const roleLabel = role => ({owner:'בעלים',manager:'מנהל',hr:'משאבי אנוש'}[role]||role);
  const safeStaff = x => ({id:x.id,staffNumber:x.staffNumber,display_name:x.display_name,role:x.role,jobTitle:roleLabel(x.role),is_active:x.is_active,createdAt:x.createdAt});
  const getSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION) || 'null'); } catch { return null; } };
  const setSession = (value) => { if (value) sessionStorage.setItem(SESSION, JSON.stringify(value)); else sessionStorage.removeItem(SESSION); };
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { return null; } };
  const save = (value) => localStorage.setItem(STORE, JSON.stringify(value));
  const checksum = async text => {
    const bytes = new TextEncoder().encode('afikim-demo-only:' + String(text).toUpperCase());
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  };
  const docValid = doc => /^000000[0-9]{3}$/.test(String(doc || '').trim());
  const summarize = c => ({ id: c.id, name: c.name, identityLast4: c.identityLast4, status: c.status,
    createdAt: c.createdAt, expiresAt: c.expiresAt, startedAt: c.startedAt, submittedAt: c.submittedAt,
    correctCount: c.correctCount, score: c.correctCount === null ? null : Math.round(c.correctCount / 30 * 100),
    decision: c.decision, decisionNotes: c.decisionNotes, reviewedAt: c.reviewedAt });
  const ownerRecord = async () => ({id:'demo-manager',staffNumber:'000001',display_name:'מנהל (DEMO)',role:'owner',is_active:true,createdAt:new Date().toISOString(),passwordDigest:await checksum('staff:000001:demo2026')});
  async function ensureStaff(data){
    if(!Array.isArray(data.staff)||!data.staff.length){
      data.staff=[await ownerRecord()];
      data.candidates.forEach(c=>{if(!c.assignedBy)c.assignedBy='demo-manager'});
      save(data);
    }
    return data;
  }
  async function init() {
    let data = load();
    if (data && data.version === 2 && Array.isArray(data.candidates)) {
      for (const c of data.candidates) {
        if(c.id==='sample-invited' && c.status==='assigned'){c.identityDigest=await checksum('000000123');c.identityLast4='0123';}
        if(c.id==='sample-reviewed-pending'){c.identityDigest=await checksum('000000456');c.identityLast4='0456';}
      }
      save(data);
      const sample=data.candidates.find(x=>x.id==='sample-reviewed-pending');
      if(sample && sample.status==='submitted' && !Object.keys(sample.answers||{}).length){
        sample.answers=Object.fromEntries(answerBank().map((q,i)=>[q.id,i<25?q.answer:(q.answer+1)%4]));
        save(data);
      }
      data.history ||= [];
      return ensureStaff(data);
    }
    const date = new Date().toISOString();
    const assignedDoc = '000000123', assignedCode = 'DEMO2026WORKER';
    const submittedDoc = '000000456';
    data = { version: 2, candidates: [
      { id: 'sample-reviewed-pending', name: 'נועה לוי (דוגמה)', identityLast4: submittedDoc.slice(-4),
        identityDigest: await checksum(submittedDoc), codeDigest: await checksum('DEMO-EXPIRED-SAMPLE'),
        status: 'submitted', createdAt: date, expiresAt: new Date(originNow()+7*864e5).toISOString(),
        startedAt: date, submittedAt: date, correctCount: 25, decision: null, decisionNotes: '', reviewedAt: null, answers: Object.fromEntries(answerBank().map((q,i)=>[q.id,i<25?q.answer:(q.answer+1)%4])) },
      { id: 'sample-invited', name: 'דניאל כהן (דוגמה)', identityLast4: assignedDoc.slice(-4),
        identityDigest: await checksum(assignedDoc), codeDigest: await checksum(assignedCode),
        status: 'assigned', createdAt: date, expiresAt: new Date(originNow()+7*864e5).toISOString(),
        startedAt: null, submittedAt: null, correctCount: null, decision: null, decisionNotes: '', reviewedAt: null, answers: {} }
    ], history: [] };
    await ensureStaff(data);save(data);return data;
  }
  const getAdmin = data => {const s=getSession();return s?.role==='admin'?data.staff.find(x=>x.id===s.id && x.is_active):null;};
  const isAdmin = data => Boolean(getAdmin(data));
  const isOwner = data => getAdmin(data)?.role==='owner';
  const canView = (data,c) => isOwner(data) || c.assignedBy===getAdmin(data)?.id;
  const adminSummary = (data,c) => ({...summarize(c),responsible:data.staff.find(x=>x.id===c.assignedBy)?.display_name||'בעלים'});
  const getWorker = data => {const s=getSession();return s?.role==='worker' ? data.candidates.find(x=>x.id===s.id) : null;};
  const answerBank = () => Array.isArray(window.EXAM_QUESTIONS) ? window.EXAM_QUESTIONS : [];
  window.AfikimDemoAPI = async (path, method='GET', body) => {
    await Promise.resolve();
    const b = body || {};
    const d = await init();
    const name = String(path || '');
    if (name === 'health') return { ok: true, ready: answerBank().length===30, questions: answerBank().length, demo: true };
    if (name === 'admin-login' && method==='POST') {
      const staffNumber=String(b.staffNumber||b.username||'').trim()==='demo'?'000001':String(b.staffNumber||b.username||'').trim();
      const staff=d.staff.find(x=>x.staffNumber===staffNumber && x.is_active);
      if(!staff || staff.passwordDigest!==await checksum('staff:'+staffNumber+':'+String(b.password||'')))err('אין הרשאה לבצע פעולה זו');
      setSession({role:'admin',id:staff.id});return {admin:safeStaff(staff)};
    }
    if (name === 'admin-me' && method==='GET') {
      const staff=getAdmin(d);if(!staff)err('אין הרשאה לבצע פעולה זו');return {admin:safeStaff(staff)};
    }
    if (name === 'admin-logout' && method==='POST') {setSession(null);return {ok:true};}

    if (name === 'admin-staff-list' && method==='GET') {
      if(!isOwner(d))err('אין הרשאה לבצע פעולה זו');
      return {items:d.staff.map(safeStaff).sort((a,b)=>a.staffNumber.localeCompare(b.staffNumber))};
    }
    if (name === 'admin-staff-create' && method==='POST') {
      if(!isOwner(d))err('אין הרשאה לבצע פעולה זו');
      const staffNumber=String(b.staffNumber||'').trim();
      const display_name=String(b.display_name||'').trim();
      const password=String(b.password||'');const role=String(b.role||'');
      if(!/^\d{4,10}$/.test(staffNumber))err('מספר אישי חייב להכיל 4 עד 10 ספרות');
      if(d.staff.some(x=>x.staffNumber===staffNumber))err('מספר אישי זה כבר קיים');
      if(display_name.length<2 || display_name.length>90)err('שם האחראי קצר מדי');
      if(password.length<8||password.length>128)err('סיסמה חייבת להכיל לפחות 8 תווים');
      if(!['manager','hr'].includes(role))err('ניתן לשייך רק מנהל או משאבי אנוש');
      const staff={id:crypto.randomUUID(),staffNumber,display_name,role,is_active:true,
        createdAt:new Date().toISOString(),passwordDigest:await checksum('staff:'+staffNumber+':'+password)};
      d.staff.push(staff);d.history.push({action:'staff_created',id:staff.id,actorId:getAdmin(d).id,time:staff.createdAt});save(d);
      return {staff:safeStaff(staff)};
    }
    if (name === 'admin-staff-toggle' && method==='POST') {
      if(!isOwner(d))err('אין הרשאה לבצע פעולה זו');
      const staff=d.staff.find(x=>x.id===b.id);
      if(!staff || staff.role==='owner')err('אין הרשאה לבצע פעולה זו');
      staff.is_active=Boolean(b.active);
      d.history.push({action:staff.is_active?'staff_enabled':'staff_disabled',id:staff.id,actorId:getAdmin(d).id,time:new Date().toISOString()});save(d);
      return {staff:safeStaff(staff)};
    }
    if (name === 'admin-list' && method==='GET') {
      if(!isAdmin(d)) err('הכניסה למערכת הניהול נדרשת');
      return {items:d.candidates.filter(c=>canView(d,c)).map(c=>adminSummary(d,c)).reverse()};
    }
    if (name === 'admin-assign' && method==='POST') {
      if(!isAdmin(d)) err('נדרשת כניסת מנהל');
      const workerName=String(b.name||'').trim(), doc=String(b.document||'').toUpperCase().trim();
      if(workerName.length<2||workerName.length>120)err('יש להזין שם מלא לדוגמה');
      if(!docValid(doc))err('בהדגמה יש להזין תעודת זהות פיקטיבית בת 9 ספרות המתחילה ב-000000');
      const code='DEMO-'+crypto.randomUUID().replace(/-/g,'').slice(0,18).toUpperCase();
      const c={ id:crypto.randomUUID(),name:workerName,assignedBy:getAdmin(d).id,identityLast4:doc.slice(-4),
        identityDigest:await checksum(doc),codeDigest:await checksum(code),status:'assigned',
        createdAt:new Date().toISOString(),expiresAt:new Date(originNow()+7*864e5).toISOString(),
        startedAt:null,submittedAt:null,correctCount:null,decision:null,decisionNotes:'',reviewedAt:null,answers:{} };
      d.candidates.push(c);d.history.push({action:'assigned',id:c.id,actorId:getAdmin(d).id,time:new Date().toISOString()});save(d);
      return {candidate:adminSummary(d,c),code};
    }
    if (name === 'admin-detail' && method==='GET') {
      if(!isAdmin(d))err('נדרשת כניסת מנהל');
      const c=d.candidates.find(x=>x.id===b.id);
      if(!c || !canView(d,c))err('אין הרשאה לבצע פעולה זו');
      const questions=c.status==='submitted'?answerBank().map(q=>{
        const selectedOption=Number.isInteger(c.answers?.[q.id])?c.answers[q.id]:null;
        return {id:q.id,section:q.section,question:q.question,options:q.options,
          selectedOption,correctOption:q.answer,correct:selectedOption===q.answer,explanation:q.explanation};
      }):[];
      return {candidate:adminSummary(d,c),questions};
    }
    if (name === 'admin-history' && method==='GET') {
      if(!isAdmin(d))err('נדרשת כניסת מנהל');
      return {items:d.history.filter(e=>isOwner(d)||e.actorId===getAdmin(d).id||d.candidates.some(c=>c.id===e.id&&canView(d,c))).slice(-10).reverse().map(e=>({...e,candidateName:d.candidates.find(c=>c.id===e.id)?.name||d.staff.find(a=>a.id===e.id)?.display_name||'DEMO'}))};
    }
    if (name === 'admin-review' && method==='POST') {
      if(!isAdmin(d))err('נדרשת כניסת מנהל');
      const c=d.candidates.find(x=>x.id===b.id);
      if(!c || !canView(d,c) || c.status!=='submitted' || c.decision)err('לא ניתן לקבל החלטה למבחן זה');
      if(!['accepted','rejected','follow_up'].includes(b.decision) || String(b.notes||'').trim().length<3)err('נדרשת החלטה עם נימוק בן 3 תווים לפחות');
      c.decision=b.decision;c.decisionNotes=String(b.notes).trim().slice(0,1000);c.reviewedAt=new Date().toISOString();
      d.history.push({action:'reviewed',id:c.id,actorId:getAdmin(d).id,time:c.reviewedAt,decision:c.decision});save(d);
      return {candidate:adminSummary(d,c)};
    }
    if (name === 'admin-password' && method==='POST') err('שינוי סיסמה זמין בגרסה השרתית בלבד');
    if (name === 'worker-login' && method==='POST') {
      const doc=String(b.document||'').toUpperCase().trim(); const code=String(b.code||'').toUpperCase().trim();
      if(!docValid(doc)||code.length<12)err('הזינו תעודת זהות פיקטיבית בת 9 ספרות המתחילה ב-000000 וקוד הזמנה');
      const documentDigest=await checksum(doc), codeDigest=await checksum(code);
      const c=d.candidates.find(x=>x.identityDigest===documentDigest&&x.codeDigest===codeDigest);
      if(!c || !['assigned','in_progress'].includes(c.status) || new Date(c.expiresAt).getTime()<originNow())err('פרטי כניסה אינם תקינים או שהמבחן אינו זמין');
      if(c.startedAt && originNow()-new Date(c.startedAt).getTime()>=40*60*1000)err('זמן הבחינה הסתיים');
      c.status='in_progress';c.startedAt ||= new Date().toISOString();save(d);setSession({role:'worker',id:c.id});
      return {ok:true,name:c.name};
    }
    if (name === 'worker-logout' && method==='POST') {setSession(null);return {ok:true};}
    if (name === 'worker-me' && method==='GET') {
      const c=getWorker(d);if(!c)err('נדרשת כניסה למבחן');
      return {candidate:{id:c.id,name:c.name,status:c.status,submittedAt:c.submittedAt,startedAt:c.startedAt},remainingSeconds:Math.max(0,Math.floor((new Date(c.startedAt).getTime()+40*60*1000-originNow())/1000))};
    }
    if (name === 'worker-questions' && method==='GET') {
      const c=getWorker(d);
      if(!c || c.status!=='in_progress')err('נדרשת כניסה למבחן');
      if(new Date(c.startedAt).getTime()+40*60*1000<=originNow())err('זמן המבחן הסתיים');
      return {questions:answerBank().map(q=>({id:q.id,section:q.section,question:q.question,options:q.options})),answers:c.answers||{}};
    }
    if (name === 'worker-answer' && method==='POST') {
      const c=getWorker(d);if(!c||c.status!=='in_progress')err('המבחן אינו פעיל');
      if(new Date(c.startedAt).getTime()+40*60*1000<=originNow())err('זמן המבחן הסתיים');
      const q=Number(b.questionId),choice=Number(b.selectedOption);
      if(!answerBank().some(x=>x.id===q)||![0,1,2,3].includes(choice))err('תשובה אינה תקינה');
      c.answers[q]=choice;save(d);return {ok:true};
    }
    if (name === 'worker-submit' && method==='POST') {
      const c=getWorker(d);if(!c)err('נדרשת כניסה למבחן');
      if(c.status!=='submitted'){
        if(c.status!=='in_progress')err('המבחן אינו פעיל');
        c.correctCount=answerBank().reduce((a,q)=>a+(c.answers?.[q.id]===q.answer?1:0),0);
        c.submittedAt=new Date().toISOString();c.status='submitted';d.history.push({action:'submitted',id:c.id,time:c.submittedAt});save(d);
      }
      return {submitted:true};
    }
    err('פעולה זו אינה זמינה בסביבת ההדגמה');
  };
  window.AfikimDemoInfo={manager:{staffNumber:'000001',username:'demo',password:'demo2026'},worker:{code:'DEMO2026WORKER',document:'000000123'},reset:()=>{localStorage.removeItem(STORE);sessionStorage.removeItem(SESSION);location.reload()}};
})();
