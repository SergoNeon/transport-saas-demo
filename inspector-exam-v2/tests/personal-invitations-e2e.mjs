// Real HTTPS API test with synthetic employees only. No real Teudat Zehut data.
// Verifies invitation uniqueness, identity binding, one-time completion and manual review.
// Staging credential file is root-owned and never printed or committed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const BASE = process.env.EXAM_BASE_URL || 'https://afikim.77.42.93.209.sslip.io';
if(new URL(BASE).hostname!=='afikim.77.42.93.209.sslip.io')throw Error('Refusing non-staging deployment');
const credentials=JSON.parse(readFileSync(process.env.EXAM_TEST_CREDENTIALS_PATH||'/etc/afikim-exam/staging-credentials.json','utf8'));
const employeeA='000000786',employeeB='000000787';
class Client{
 constructor(name){this.name=name;this.cookies=new Map()}
 async call(route,method='GET',body){
  const headers={Accept:'application/json',Origin:BASE};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(this.cookies.size)headers.Cookie=[...this.cookies].map(([k,v])=>k+'='+v).join('; ');
  const response=await fetch(BASE+'/api/'+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
  const raw=response.headers.get('set-cookie');
  if(raw){const pair=raw.split(';')[0];const split=pair.indexOf('=');if(split>0){const k=pair.slice(0,split),v=pair.slice(split+1);if(v)this.cookies.set(k,v);else this.cookies.delete(k)}}
  let data={};try{data=await response.json()}catch{}
  return{status:response.status,data};
 }
}
const expect=(result,status,label)=>{assert.equal(result.status,status,label+': HTTP '+result.status+' '+JSON.stringify(result.data));console.log('PASS',label,'HTTP',status);return result.data};
const supervisor=new Client('supervisor'),workerA=new Client('worker-A'),workerB=new Client('worker-B'),wrongIdentity=new Client('wrong-identity'),retry=new Client('re-entry');
const auth=expect(await supervisor.call('admin-login','POST',credentials.manager),200,'Authorized manager login');
assert.equal(auth.role,'manager');
const candidateA=expect(await supervisor.call('admin-assign','POST',{name:'נבחן פיקטיבי א 786',document:employeeA}),200,'Generate code for worker A');
const candidateB=expect(await supervisor.call('admin-assign','POST',{name:'נבחן פיקטיבי ב 787',document:employeeB}),200,'Generate different code for worker B');
assert.notEqual(candidateA.code,candidateB.code,'Different workers must have unique codes');
assert.notEqual(candidateA.candidate.id,candidateB.candidate.id,'Different invitations must have different records');
console.log('PASS two unique cryptographic invitation codes (values intentionally suppressed)');
expect(await wrongIdentity.call('worker-login','POST',{code:candidateA.code,document:employeeB}),401,'Worker B identity cannot use worker A code');
expect(await wrongIdentity.call('worker-login','POST',{code:candidateB.code,document:employeeA}),401,'Worker A identity cannot use worker B code');
const enteredA=expect(await workerA.call('worker-login','POST',{code:candidateA.code,document:employeeA}),200,'Correct code plus worker A Teudat Zehut');
const enteredB=expect(await workerB.call('worker-login','POST',{code:candidateB.code,document:employeeB}),200,'Correct code plus worker B Teudat Zehut');
assert.notEqual(enteredA.name,enteredB.name);
const qa=expect(await workerA.call('worker-questions'),200,'Worker A receives unique session with 30 questions');
const qb=expect(await workerB.call('worker-questions'),200,'Worker B receives separate session with 30 questions');
assert.equal(qa.questions.length,30);
assert.equal(qb.questions.length,30);
assert.deepEqual(Object.keys(qa.answers),[]);
assert.deepEqual(Object.keys(qb.answers),[]);
for(const q of qa.questions){expect(await workerA.call('worker-answer','POST',{questionId:q.id,selectedOption:q.id%4}),200,'Worker A answer '+q.id)}
const savedA=expect(await workerA.call('worker-questions'),200,'Verify all worker A answers saved');
assert.equal(Object.keys(savedA.answers).length,30);
const savedB=expect(await workerB.call('worker-questions'),200,'Worker B answers independently stored');
assert.equal(Object.keys(savedB.answers).length,0);
const submittedA=expect(await workerA.call('worker-submit','POST'),200,'Worker A completes exam');
assert.equal(submittedA.submitted,true);
assert.equal(Object.hasOwn(submittedA,'score'),false);
expect(await workerA.call('worker-questions'),409,'Worker A cannot reopen submitted exam with existing session');
expect(await retry.call('worker-login','POST',{code:candidateA.code,document:employeeA}),401,'Completed code rejected on independent new device');
expect(await workerA.call('worker-logout','POST'),200,'Worker A logout');
expect(await retry.call('worker-login','POST',{code:candidateA.code,document:employeeA}),401,'Completed code cannot be reused after logout');
const listBefore=expect(await supervisor.call('admin-list'),200,'Manager sees A submitted');
const a=listBefore.items.find(x=>x.id===candidateA.candidate.id);
assert.ok(a&&a.status==='submitted','A result was not persisted');
assert.equal(a.decision,null,'Submission must never auto-approve or reject');
console.log('PASS submitted exam awaits manual manager decision, no automatic approval');
for(const q of qb.questions){expect(await workerB.call('worker-answer','POST',{questionId:q.id,selectedOption:(q.id+1)%4}),200,'Worker B answer '+q.id)}
expect(await workerB.call('worker-submit','POST'),200,'Worker B completes independent exam');
expect(await retry.call('worker-login','POST',{code:candidateB.code,document:employeeB}),401,'Worker B code also invalid after submission');
const listAfter=expect(await supervisor.call('admin-list'),200,'Manager sees two submitted exams');
const b=listAfter.items.find(x=>x.id===candidateB.candidate.id);
assert.equal(b?.status,'submitted');
assert.equal(b?.decision,null,'Worker B must await human review');
const decision=expect(await supervisor.call('admin-review','POST',{id:candidateA.candidate.id,decision:'accepted',notes:'אישור ידני במבחן פיקטיבי'}),200,'Only manager decides result for worker A');
assert.equal(decision.candidate.decision,'accepted');
const afterDecision=expect(await supervisor.call('admin-list'),200,'Verify independent manual review decision');
assert.equal(afterDecision.items.find(x=>x.id===candidateA.candidate.id)?.decision,'accepted');
assert.equal(afterDecision.items.find(x=>x.id===candidateB.candidate.id)?.decision,null,'Worker B must remain awaiting manager');
console.log('PASS COMPLETE distinct worker codes + own ID + 30 answers each + post-submit block + no automatic decision');
console.log('TEST_CANDIDATES='+candidateA.candidate.id+','+candidateB.candidate.id);
