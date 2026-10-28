import {Pool} from 'pg';
import crypto from 'node:crypto';
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='disable'?false:{rejectUnauthorized:true},max:4,connectionTimeoutMillis:8000});
const H=s=>crypto.createHmac('sha256',process.env.EXAM_HMAC_SECRET||'').update(String(s)).digest('hex');
const token=()=>crypto.randomBytes(32).toString('base64url');
// Production PIN hashes use a root-only pepper, separate from the encrypted database.
const passwordPepper=process.env.EXAM_PASSWORD_PEPPER||'';
const hashPassword=(p,s)=>passwordPepper.length>=32
 ? 'v2$'+crypto.scryptSync(String(p)+passwordPepper,s,64).toString('hex')
 : crypto.scryptSync(String(p),s,64).toString('hex');
const verifyPassword=(p,s,stored)=>typeof stored==='string'&&(
 stored.startsWith('v2$')
 ? passwordPepper.length>=32&&eq(crypto.scryptSync(String(p)+passwordPepper,s,64).toString('hex'),stored.slice(3))
 : eq(crypto.scryptSync(String(p),s,64).toString('hex'),stored)
);
// Numeric 6-24 digit PINs are enabled only on the isolated synthetic-data staging server.
// Personnel production must retain a stronger policy until a security/privacy review.
const passwordRule=()=>process.env.EXAM_TEST_ONLY==='1'||(process.env.EXAM_PIN_WITH_PEPPER==='1'&&passwordPepper.length>=32)
  ? {type:'digits',minLength:6,maxLength:24}
  : {type:'text',minLength:14,maxLength:128};
const validAdminPassword=p=>typeof p==='string'&&(
  passwordRule().type==='digits'
    ? /^\d{6,24}$/.test(p)
    : p.length>=14&&p.length<=128
);
const eq=(a,b)=>{try{const x=Buffer.from(a,'hex'),y=Buffer.from(b,'hex');return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y)}catch{return false}};
const cookie=(name,value,maxAge)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const clean=(v,n=120)=>String(v||'').trim().slice(0,n);
const db=(sql,params)=>pool.query(sql,params);
const fail=(res,code,message)=>res.status(code).json({error:message});
const requestJSON=req=>typeof req.body==='object'&&req.body!==null?req.body:{};
const validIsraeliId=value=>{
 if(!/^\d{9}$/.test(value))return false;
 let sum=0;
 for(let i=0;i<9;i++){let n=Number(value[i])*(i%2===0?1:2);if(n>9)n-=9;sum+=n;}
 return sum%10===0;
};
const validDoc=x=>process.env.EXAM_TEST_ONLY==='1'?/^000000\d{3}$/.test(x):validIsraeliId(x);
const sameOrigin=req=>{const origin=req.headers.origin;if(!origin)return req.headers['sec-fetch-site']!=='cross-site';try{return new URL(origin).origin===new URL('https://'+req.headers.host).origin}catch{return false}};
const getCookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').slice(0,2)).filter(x=>x.length===2));
async function admin(req){const s=getCookies(req).afikim_admin;if(!s)return null;const r=await db(`SELECT a.id,a.username,a.display_name,a.role,a.must_change_password FROM exam_staff_sessions x JOIN exam_admins a ON a.id=x.staff_id WHERE x.session_digest=$1 AND x.expires_at>now() AND a.is_active=true`,[H(s)]);return r.rows[0]||null}
async function worker(req){const s=getCookies(req).afikim_worker;if(!s)return null;const r=await db(`SELECT c.* FROM exam_candidate_sessions s JOIN exam_candidates c ON c.id=s.candidate_id WHERE s.session_digest=$1 AND s.expires_at>now()`,[H(s)]);return r.rows[0]||null}
async function limit(kind,val,max=12){const subject=H(val);const x=await db(`INSERT INTO exam_rate_limits(kind,subject_digest,hits,since_at) VALUES($1,$2,1,now()) ON CONFLICT(kind,subject_digest) DO UPDATE SET hits=CASE WHEN exam_rate_limits.since_at<now()-interval '15 minutes' THEN 1 ELSE exam_rate_limits.hits+1 END,since_at=CASE WHEN exam_rate_limits.since_at<now()-interval '15 minutes' THEN now() ELSE exam_rate_limits.since_at END RETURNING hits`,[kind,subject]);return x.rows[0].hits<=max}
function summary(c){return {id:c.id,name:c.name,identityLast4:c.identity_last4,status:c.status,createdAt:c.created_at,expiresAt:c.expires_at,startedAt:c.started_at,submittedAt:c.submitted_at,correctCount:c.correct_count,score:c.correct_count===null?null:Math.round(c.correct_count/30*100),decision:c.reviewer_decision,decisionNotes:c.reviewer_notes,reviewedAt:c.reviewed_at}}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');if(!process.env.EXAM_HMAC_SECRET||process.env.EXAM_HMAC_SECRET.length<32||!process.env.DATABASE_URL||(process.env.EXAM_TEST_ONLY!=='1'&&passwordPepper.length<32))return fail(res,503,'המערכת עדיין אינה מוגדרת');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!sameOrigin(req))return fail(res,403,'בקשה נדחתה');
const path=String(req.query.path||'').replace(/^\/+|\/+$/g,'') || req.url.split('?')[0].replace(/^\/api\/?/,'');const method=req.method;const b=requestJSON(req);
try{
if(path==='health'&&method==='GET'){const r=await db('SELECT (SELECT count(*) FROM exam_question_bank) AS questions');return res.status(200).json({ok:true,questions:Number(r.rows[0].questions),ready:Number(r.rows[0].questions)===30})}
if(path==='password-policy'&&method==='GET')return res.json(passwordRule());
if(path==='setup'&&method==='POST'){
if(!process.env.EXAM_SETUP_SECRET||clean(b.setupSecret,200)!==process.env.EXAM_SETUP_SECRET)return fail(res,403,'גישה נדחתה');
const exists=await db('SELECT count(*)::integer n FROM exam_admins');if(exists.rows[0].n!==0)return fail(res,409,'המערכת כבר הוגדרה');
const username=clean(b.username,40).toLowerCase(),password=String(b.password||''),name=clean(b.name);
if(!/^[a-z0-9._-]{3,40}$/.test(username)||!validAdminPassword(password)||name.length<2)return fail(res,400,'פרטי הקמה אינם תקינים');
const salt=crypto.randomBytes(16).toString('hex');await db('INSERT INTO exam_admins(username,display_name,role,password_salt,password_hash,must_change_password) VALUES ($1,$2,$3,$4,$5,false)',[username,name,'owner',salt,hashPassword(password,salt)]);return res.json({ok:true})}
if(path==='admin-login'&&method==='POST'){
const username=clean(b.username,40).toLowerCase(),password=String(b.password||'');if(!(await limit('admin',username+':'+(req.headers['x-forwarded-for']||'').split(',')[0],8))||!(await limit('admin-account',username,8)))return fail(res,429,'יותר מדי ניסיונות. נסו שוב מאוחר יותר');
const r=await db('SELECT * FROM exam_admins WHERE username=$1 AND is_active=true',[username]);const a=r.rows[0];if(!a||!verifyPassword(password,a.password_salt,a.password_hash))return fail(res,401,'שם משתמש או סיסמה שגויים');
const t=token();await db(`INSERT INTO exam_staff_sessions(staff_id,session_digest,expires_at) VALUES($1,$2,now()+interval '8 hours')`,[a.id,H(t)]);res.setHeader('Set-Cookie',cookie('afikim_admin',t,28800));return res.json({ok:true,name:a.display_name,role:a.role,mustChangePassword:a.must_change_password})}
if(path==='admin-logout'&&method==='POST'){const s=getCookies(req).afikim_admin;if(s)await db('DELETE FROM exam_staff_sessions WHERE session_digest=$1',[H(s)]);res.setHeader('Set-Cookie',cookie('afikim_admin','',0));return res.json({ok:true})}
if(path==='worker-logout'&&method==='POST'){const s=getCookies(req).afikim_worker;if(s)await db('DELETE FROM exam_candidate_sessions WHERE session_digest=$1',[H(s)]);res.setHeader('Set-Cookie',cookie('afikim_worker','',0));return res.json({ok:true})}
if(path==='worker-login'&&method==='POST'){
const code=clean(b.code,100).toUpperCase(),doc=clean(b.document,30);if(!validDoc(doc)||code.length<12)return fail(res,400,'פרטי כניסה אינם תקינים');if(!(await limit('worker',code,10)))return fail(res,429,'יותר מדי ניסיונות');
// Bind every one-time invitation to exactly one identity and enforce the exam state atomically.
// Re-entry is allowed only while a previously started exam is still in progress.
// After 'submitted' the code is permanently rejected, even if the worker logged out.
const r=await db(`UPDATE exam_candidates SET status='in_progress',started_at=COALESCE(started_at,now())
 WHERE access_digest=$1 AND identity_digest=$2 AND expires_at>now()
 AND (status='assigned' OR (status='in_progress' AND started_at IS NOT NULL
 AND now()<started_at+(time_limit_seconds*interval '1 second')))
 RETURNING id,name`,[H(code),H(doc)]);const c=r.rows[0];
if(!c)return fail(res,401,'הקוד אינו תואם לתעודת הזהות, פג תוקפו או שהמבחן כבר הוגש');
const t=token();await db(`DELETE FROM exam_candidate_sessions WHERE candidate_id=$1`,[c.id]);await db(`INSERT INTO exam_candidate_sessions(candidate_id,session_digest,expires_at) VALUES($1,$2,now()+interval '2 hours')`,[c.id,H(t)]);res.setHeader('Set-Cookie',cookie('afikim_worker',t,7200));return res.json({ok:true,name:c.name})}
const a=await admin(req);if(path==='admin-me'&&method==='GET')return a?res.json({admin:a}):fail(res,401,'נדרשת כניסה של מנהל');
if(path==='admin-password'&&method==='POST'){
if(!a)return fail(res,401,'נדרשת כניסה');const r=await db('SELECT * FROM exam_admins WHERE id=$1',[a.id]);const user=r.rows[0];if(!verifyPassword(String(b.current||''),user.password_salt,user.password_hash))return fail(res,400,'הסיסמה הנוכחית שגויה');const nextPassword=String(b.next||'');if(!validAdminPassword(nextPassword))return fail(res,400,passwordRule().type==='digits'?'יש להזין סיסמה חדשה של 6 עד 24 ספרות':'הסיסמה חייבת להכיל לפחות 14 תווים');if(verifyPassword(nextPassword,user.password_salt,user.password_hash))return fail(res,400,'יש לבחור סיסמה שונה מהסיסמה הנוכחית');const salt=crypto.randomBytes(16).toString('hex');await db('UPDATE exam_admins SET password_salt=$2,password_hash=$3,must_change_password=false WHERE id=$1',[a.id,salt,hashPassword(b.next,salt)]);await db('DELETE FROM exam_staff_sessions WHERE staff_id=$1 AND session_digest<>$2',[a.id,H(getCookies(req).afikim_admin)]);return res.json({ok:true})}
if(path==='admin-staff-list'&&method==='GET'){
if(!a||a.role!=='owner'||a.must_change_password)return fail(res,403,'גישה למנהל המערכת בלבד');
const r=await db("SELECT id,username,display_name,role,is_active,created_at FROM exam_admins ORDER BY created_at");
return res.json({items:r.rows.map(x=>({id:x.id,staffNumber:x.username,display_name:x.display_name,role:x.role,is_active:x.is_active,createdAt:x.created_at}))})}
if(path==='admin-staff-create'&&method==='POST'){
if(!a||a.role!=='owner'||a.must_change_password)return fail(res,403,'גישה למנהל המערכת בלבד');
const username=clean(b.staffNumber||b.username,40),name=clean(b.display_name||b.name,90),password=String(b.password||''),role=clean(b.role,30);
if(!/^\d{4,10}$/.test(username)||name.length<2||!validAdminPassword(password)||!['manager','hr'].includes(role))return fail(res,400,passwordRule().type==='digits'?'הסיסמה הזמנית חייבת לכלול 6 עד 24 ספרות':'פרטי איש צוות אינם תקינים');
const salt=crypto.randomBytes(16).toString('hex');
try{
const r=await db("INSERT INTO exam_admins(username,display_name,role,password_salt,password_hash,must_change_password,is_active) VALUES($1,$2,$3,$4,$5,true,true) RETURNING id,username,display_name,role,is_active,created_at",[username,name,role,salt,hashPassword(password,salt)]);
await db("INSERT INTO exam_review_audit(staff_id,action,detail) VALUES($1,'staff_created',jsonb_build_object('created',$2::text))",[a.id,r.rows[0].id]);
return res.json({staff:{id:r.rows[0].id,staffNumber:r.rows[0].username,display_name:r.rows[0].display_name,role:r.rows[0].role,is_active:true}});
}catch(e){if(e.code==='23505')return fail(res,409,'המספר האישי כבר רשום');throw e}}
if(path==='admin-staff-toggle'&&method==='POST'){
if(!a||a.role!=='owner'||a.must_change_password)return fail(res,403,'גישה למנהל המערכת בלבד');
const id=clean(b.id,64),active=b.active===true;
if(!/^[a-f0-9-]{36}$/i.test(id))return fail(res,400,'מזהה לא תקין');
const r=await db("UPDATE exam_admins SET is_active=$2 WHERE id=$1 AND role<>'owner' RETURNING id,username,display_name,role,is_active",[id,active]);
if(!r.rowCount)return fail(res,404,'לא נמצא');
if(!active)await db('DELETE FROM exam_staff_sessions WHERE staff_id=$1',[id]);
await db("INSERT INTO exam_review_audit(staff_id,action,detail) VALUES($1,'staff_toggled',jsonb_build_object('target',$2::uuid,'active',$3::boolean))",[a.id,id,active]);
return res.json({staff:{id:r.rows[0].id,staffNumber:r.rows[0].username,display_name:r.rows[0].display_name,role:r.rows[0].role,is_active:r.rows[0].is_active}})}
if(path==='admin-list'&&method==='GET'){
if(!a||a.must_change_password)return fail(res,403,'נדרשת הרשאת מנהל');
const search=clean(req.query.search,100),state=clean(req.query.state,30)||'all';
if(!['all','assigned','in_progress','pending','accepted','rejected','follow_up'].includes(state))return fail(res,400,'מסנן אינו תקין');
const hasPaging=req.query.page!==undefined||req.query.size!==undefined;
const requestedSize=Number(req.query.size),requestedPage=Number(req.query.page);
const size=hasPaging?(Number.isInteger(requestedSize)&&requestedSize>=1?Math.min(requestedSize,50):20):200;
const page=hasPaging?(Number.isInteger(requestedPage)&&requestedPage>=1?Math.min(requestedPage,10000):1):1;
const condition="($1::text='owner' OR assigned_by=$2) AND ($3::text='' OR name ILIKE '%'||$3||'%') AND ($4::text='all' OR ($4::text='pending' AND status='submitted' AND reviewer_decision IS NULL) OR ($4::text IN ('assigned','in_progress') AND status=$4) OR ($4::text IN ('accepted','rejected','follow_up') AND reviewer_decision=$4))";
const args=[a.role,a.id,search,state];
const [records,count,stats]=await Promise.all([
 db("SELECT * FROM exam_candidates WHERE "+condition+" ORDER BY created_at DESC LIMIT $5 OFFSET $6",[...args,size,(page-1)*size]),
 db("SELECT count(*)::integer n FROM exam_candidates WHERE "+condition,args),
 db(`SELECT count(*)::integer AS total,
 count(*) FILTER(WHERE status IN ('assigned','in_progress'))::integer AS active,
 count(*) FILTER(WHERE status='submitted' AND reviewer_decision IS NULL)::integer AS pending,
 count(*) FILTER(WHERE reviewer_decision='accepted')::integer AS accepted
 FROM exam_candidates WHERE ($1::text='owner' OR assigned_by=$2)`,[a.role,a.id])
]);
return res.json({items:records.rows.map(summary),pagination:{page,size,total:count.rows[0].n,pages:Math.max(1,Math.ceil(count.rows[0].n/size))},stats:stats.rows[0]})}
if(path==='admin-assign'&&method==='POST'){
if(!a||a.must_change_password)return fail(res,403,'נדרשת הרשאת מנהל');const name=clean(b.name),doc=clean(b.document,30);if(name.length<2||!validDoc(doc))return fail(res,400,'נדרש שם מלא ומספר תעודה תקין');const code=crypto.randomBytes(18).toString('hex').toUpperCase();const r=await db(`INSERT INTO exam_candidates(name,identity_digest,identity_last4,access_digest,expires_at,assigned_by) VALUES($1,$2,$3,$4,now()+interval '7 days',$5) RETURNING *`,[name,H(doc),doc.slice(-4),H(code),a.id]);await db(`INSERT INTO exam_review_audit(staff_id,candidate_id,action) VALUES($1,$2,'assigned')`,[a.id,r.rows[0].id]);return res.json({candidate:summary(r.rows[0]),code})}
if(path==='admin-detail'&&method==='GET'){
if(!a||a.must_change_password)return fail(res,403,'נדרשת הרשאת מנהל');
const id=clean(req.query.id,64);
const row=await db("SELECT * FROM exam_candidates WHERE id=$1 AND ($2::text='owner' OR assigned_by=$3)",[id,a.role,a.id]);
if(!row.rowCount)return fail(res,404,'הרשומה אינה זמינה');
const c=row.rows[0];
const questions=c.status==='submitted'?await db(`SELECT q.id,q.section,q.prompt,q.choices,q.answer_index,q.explanation,x.selected_option FROM exam_question_bank q LEFT JOIN exam_candidate_answers x ON x.question_id=q.id AND x.candidate_id=$1 ORDER BY q.id`,[id]):{rows:[]};
return res.json({candidate:summary(c),questions:questions.rows.map(q=>({id:q.id,section:q.section,question:q.prompt,options:q.choices,correctOption:q.answer_index,selectedOption:q.selected_option,correct:q.selected_option===q.answer_index,explanation:q.explanation}))})}
if(path==='admin-review'&&method==='POST'){
if(!a||a.must_change_password||!['owner','manager'].includes(a.role))return fail(res,403,'נדרשת הרשאת מנהל');const id=clean(b.id,64),decision=clean(b.decision,30),notes=clean(b.notes,1000);if(!['accepted','rejected','follow_up'].includes(decision)||notes.length<3)return fail(res,400,'נדרשים החלטה ונימוק');
const r=await db(`UPDATE exam_candidates SET reviewer_decision=$2,reviewer_notes=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1 AND status='submitted' AND reviewer_decision IS NULL AND ($5::text='owner' OR assigned_by=$4) RETURNING *`,[id,decision,notes,a.id,a.role]);if(!r.rowCount)return fail(res,409,'הבדיקה טרם הוגשה או שכבר התקבלה החלטה');await db(`INSERT INTO exam_review_audit(staff_id,candidate_id,action,detail) VALUES($1,$2,'reviewed',jsonb_build_object('decision',$3::text))`,[a.id,id,decision]);return res.json({candidate:summary(r.rows[0])})}
const w=await worker(req);if(path==='worker-me'&&method==='GET')return w?res.json({candidate:{id:w.id,name:w.name,status:w.status,submittedAt:w.submitted_at,startedAt:w.started_at},remainingSeconds:w.started_at?Math.max(0,Math.floor((new Date(w.started_at).getTime()+w.time_limit_seconds*1000-Date.now())/1000)):w.time_limit_seconds}):fail(res,401,'נדרשת כניסה למבחן');
if(path==='worker-questions'&&method==='GET'){
if(!w)return fail(res,401,'נדרשת כניסה');if(w.status!=='in_progress'||!w.started_at||new Date(w.started_at).getTime()+w.time_limit_seconds*1000<=Date.now()||new Date(w.expires_at).getTime()<=Date.now())return fail(res,409,'המבחן אינו פעיל');const r=await db('SELECT id,section,prompt,choices FROM exam_question_bank ORDER BY id');const x=await db('SELECT question_id,selected_option FROM exam_candidate_answers WHERE candidate_id=$1',[w.id]);return res.json({questions:r.rows.map(q=>({id:q.id,section:q.section,question:q.prompt,options:q.choices})),answers:Object.fromEntries(x.rows.map(q=>[q.question_id,q.selected_option]))})}
if(path==='worker-answer'&&method==='POST'){
if(!w||w.status!=='in_progress')return fail(res,403,'המבחן אינו פעיל');const q=Number(b.questionId),choice=Number(b.selectedOption);if(!Number.isInteger(q)||q<1||q>30||!Number.isInteger(choice)||choice<0||choice>3)return fail(res,400,'תשובה אינה תקינה');const x=await db(`SELECT id FROM exam_candidates WHERE id=$1 AND status='in_progress' AND now()<started_at+(time_limit_seconds*interval '1 second') AND expires_at>now()`,[w.id]);if(!x.rowCount)return fail(res,409,'הזמן הסתיים');const saved=await db(`INSERT INTO exam_candidate_answers(candidate_id,question_id,selected_option) SELECT c.id,$2,$3 FROM exam_candidates c WHERE c.id=$1 AND c.status='in_progress' AND now()<c.started_at+(c.time_limit_seconds*interval '1 second') AND c.expires_at>now() ON CONFLICT(candidate_id,question_id) DO UPDATE SET selected_option=EXCLUDED.selected_option,updated_at=now() RETURNING question_id`,[w.id,q,choice]);if(!saved.rowCount)return fail(res,409,'המבחן אינו פעיל');return res.json({ok:true})}
if(path==='worker-submit'&&method==='POST'){
if(!w)return fail(res,401,'נדרשת כניסה');if(w.status==='submitted')return res.json({submitted:true});if(w.status!=='in_progress')return fail(res,409,'מבחן אינו פעיל');const r=await db(`UPDATE exam_candidates c SET status='submitted',submitted_at=now(),correct_count=(SELECT count(*)::integer FROM exam_candidate_answers x JOIN exam_question_bank q ON q.id=x.question_id WHERE x.candidate_id=c.id AND x.selected_option=q.answer_index),submitted_reason=CASE WHEN now()>c.started_at+(c.time_limit_seconds*interval '1 second') THEN 'timeout' ELSE 'submitted' END WHERE c.id=$1 AND c.status='in_progress' RETURNING c.id`,[w.id]);if(!r.rowCount)return fail(res,409,'המבחן כבר הוגש');return res.json({submitted:true})}
return fail(res,404,'נתיב לא נמצא');
}catch(err){console.error('exam_api_error',err?.code||'server_error');return fail(res,500,'שגיאת שרת. נסו שוב מאוחר יותר')}
}