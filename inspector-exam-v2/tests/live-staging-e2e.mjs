// Runs against the isolated VPS staging deployment only, with synthetic identity numbers.
// Explicitly verifies separate authenticated cookie jars and durable PostgreSQL state through HTTP.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASE = process.env.EXAM_BASE_URL || 'https://afikim.77.42.93.209.sslip.io';
if (!BASE.includes('77.42.93.209.sslip.io')) throw Error('Refusing non-staging target');
if (!process.env.EXAM_SETUP_SECRET) throw Error('EXAM_SETUP_SECRET required');
const output = process.env.EXAM_TEST_CREDENTIALS_PATH || '/etc/afikim-exam/staging-credentials.json';
const pass = () => randomBytes(24).toString('base64url');
const creds=existsSync(output)?JSON.parse(readFileSync(output,'utf8')):{
 owner:{username:'000001',password:pass()},
 manager:{username:'000002',password:pass()},
 outsider:{username:'000003',password:pass()}
};
class Client{
 constructor(name){this.name=name;this.cookies=new Map()}
 async call(path,method='GET',body){
  const headers={'Accept':'application/json','Origin':BASE};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(this.cookies.size)headers.Cookie=[...this.cookies].map(([k,v])=>k+'='+v).join('; ');
  const response=await fetch(BASE+'/api/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
  const raw=response.headers.get('set-cookie');
  if(raw){const cookie=raw.split(';')[0],pos=cookie.indexOf('=');if(pos>0){const key=cookie.slice(0,pos),value=cookie.slice(pos+1);if(value)this.cookies.set(key,value);else this.cookies.delete(key)}}
  let data={};try{data=await response.json()}catch{}
  return {status:response.status,data};
 }
}
function check(result,status,label){assert.equal(result.status,status,label+': '+JSON.stringify(result.data));console.log('PASS',label,'HTTP',status);return result.data}
const owner=new Client('owner'),manager=new Client('manager'),outsider=new Client('outsider'),worker=new Client('worker'),workerAgain=new Client('worker-again'),managerAgain=new Client('manager-again');
check(await owner.call('health'),200,'PostgreSQL health');
const setup=await owner.call('setup','POST',{setupSecret:process.env.EXAM_SETUP_SECRET,username:creds.owner.username,password:creds.owner.password,name:'בעל מערכת (בדיקות)'});
if(setup.status!==200&&setup.status!==409)check(setup,200,'Owner initialization');
if(setup.status===409&&!existsSync(output))throw Error('Owner already exists but staging credential file missing');
check(await owner.call('admin-login','POST',creds.owner),200,'Owner authenticated');
check(await owner.call('admin-me'),200,'Owner cookie persisted');
const staff=check(await owner.call('admin-staff-list'),200,'Owner lists authorized staff');
if(!staff.items.some(x=>x.staffNumber===creds.manager.username))check(await owner.call('admin-staff-create','POST',{staffNumber:creds.manager.username,display_name:'מנהל בדיקה א',password:creds.manager.password,role:'manager'}),200,'Create primary manager');
if(!staff.items.some(x=>x.staffNumber===creds.outsider.username))check(await owner.call('admin-staff-create','POST',{staffNumber:creds.outsider.username,display_name:'מנהל בדיקה ב',password:creds.outsider.password,role:'manager'}),200,'Create isolated second manager');
if(!existsSync(output))writeFileSync(output,JSON.stringify(creds,null,2),{mode:0o600,flag:'wx'});
const primaryLogin=check(await manager.call('admin-login','POST',creds.manager),200,'First manager session');
const otherLogin=check(await outsider.call('admin-login','POST',creds.outsider),200,'Independent second manager session');
for(const [client,login,account] of [[manager,primaryLogin,creds.manager],[outsider,otherLogin,creds.outsider]]){
 if(login.mustChangePassword){
  const next=pass();
  check(await client.call('admin-password','POST',{current:account.password,next}),200,'Required password change for '+client.name);
  account.password=next;
  writeFileSync(output,JSON.stringify(creds,null,2),{mode:0o600});
 }
}
const assignment=check(await manager.call('admin-assign','POST',{name:'עובד בדיקה פיקטיבי',document:'000000123'}),200,'Manager assigns exam');
const candidateId=assignment.candidate.id,code=assignment.code;
assert.ok(candidateId&&code);
const aList=check(await outsider.call('admin-list'),200,'Other manager list scope');
assert.ok(!aList.items.some(x=>x.id===candidateId),'Other manager must not see exam');
check(await outsider.call('admin-detail?id='+candidateId),404,'Other manager cannot read exam');
check(await worker.call('worker-login','POST',{code,document:'000000123'}),200,'Worker session separate from manager');
const questions=check(await worker.call('worker-questions'),200,'Read 30 questions without answer key');
assert.equal(questions.questions.length,30);
assert.ok(questions.questions.every(q=>!Object.hasOwn(q,'answer')&&!Object.hasOwn(q,'correctOption')&&!Object.hasOwn(q,'answer_index')));
for(const q of questions.questions.slice(0,15))check(await worker.call('worker-answer','POST',{questionId:q.id,selectedOption:0}),200,'Persist answer '+q.id);
check(await worker.call('worker-logout','POST'),200,'Worker logout');
check(await workerAgain.call('worker-login','POST',{code,document:'000000123'}),200,'Worker new session after logout');
const restored=check(await workerAgain.call('worker-questions'),200,'Worker answers reloaded from database');
assert.equal(Object.keys(restored.answers).length,15);
for(const q of questions.questions.slice(15))check(await workerAgain.call('worker-answer','POST',{questionId:q.id,selectedOption:1}),200,'Persist answer '+q.id);
const complete=check(await workerAgain.call('worker-questions'),200,'All 30 answers durable before submission');
assert.equal(Object.keys(complete.answers).length,30);
const submitted=check(await workerAgain.call('worker-submit','POST'),200,'Worker submits examination');
assert.equal(submitted.submitted,true);
assert.equal(Object.hasOwn(submitted,'score'),false,'Submission must hide score');
const workerMe=check(await workerAgain.call('worker-me'),200,'Worker submission receipt');
assert.equal(Object.hasOwn(workerMe.candidate,'score'),false);
assert.equal(Object.hasOwn(workerMe.candidate,'correctCount'),false);
check(await workerAgain.call('worker-questions'),409,'Submitted questions unavailable');
check(await manager.call('admin-logout','POST'),200,'Manager logout');
check(await managerAgain.call('admin-login','POST',creds.manager),200,'Manager re-login from new client');
const reviewList=check(await managerAgain.call('admin-list'),200,'Persisted result visible to manager after re-login');
const saved=reviewList.items.find(x=>x.id===candidateId);
assert.ok(saved&&saved.status==='submitted'&&Number.isInteger(saved.correctCount),'Exam result missing');
const detail=check(await managerAgain.call('admin-detail?id='+candidateId),200,'Manager can review all 30 answers');
assert.equal(detail.questions.length,30);
assert.ok(detail.questions.every(x=>Object.hasOwn(x,'selectedOption')));
check(await outsider.call('admin-detail?id='+candidateId),404,'Other manager denied after submit');
check(await outsider.call('admin-review','POST',{id:candidateId,decision:'accepted',notes:'בדיקה אסורה'}),409,'Other manager cannot approve');
check(await managerAgain.call('admin-review','POST',{id:candidateId,decision:'accepted',notes:'בדיקת מערכת מוצלחת - נתוני דמה'}),200,'Assigned manager approves examination');
const verified=check(await owner.call('admin-list'),200,'Owner sees reviewed examination');
assert.equal(verified.items.find(x=>x.id===candidateId).decision,'accepted');
console.log('PASS FULL SERVER E2E: independent sessions, 30 answers, reload, role isolation, review');
console.log('TEST_CANDIDATE_ID='+candidateId);
