import assert from 'node:assert/strict';
const base='http://127.0.0.1:'+String(process.env.PORT||19161);
async function request(path, method='GET', body, token) {
  const headers={'Content-Type':'application/json'};
  if(token) headers.Authorization='Bearer '+token;
  const res=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined});
  const raw=await res.text();
  return {status:res.status,data:raw?JSON.parse(raw):{}};
}
const m=await request('/api/login','POST',{
  email:'manager@afikim-demo.test',
  password:process.env.DEMO_MANAGER_PASSWORD,
});
const w=await request('/api/login','POST',{
  email:'worker@afikim-demo.test',
  password:process.env.DEMO_WORKER_PASSWORD,
});
assert.equal(m.status,200,'manager login');
assert.equal(w.status,200,'worker login');
const manager=m.data.token,worker=w.data.token;
const managerCurrent=()=>request('/api/attendance/current','GET',null,manager);
const workerCurrent=()=>request('/api/attendance/current','GET',null,worker);
const action=what=>request('/api/attendance/transition','POST',{action:what},worker);
const forManager=await managerCurrent();
assert.equal(forManager.status,200);
assert.equal(forManager.data.team.length>=1,true);
const illegal=await request('/api/attendance/transition','POST',{action:'start'},manager);
assert.equal(illegal.status,403,'manager cannot clock worker');

const before=await workerCurrent();
if(before.data.current && before.data.current.endedAt===null) {
  // Close any old test shift to make reruns safe.
  const done=await action('end');
  assert.equal(done.status,200);
}
const started=await action('start');
assert.equal(started.status,200);
assert.equal(started.data.current.state,'working');
assert.equal((await action('start')).status,409,'reject duplicate clock in');
const seen=await managerCurrent();
assert.equal(seen.data.team.find(t=>t.id===w.data.id).shift.state,'working');

const paused=await action('pause');
assert.equal(paused.status,200);
assert.equal(paused.data.current.state,'break');
assert.equal((await action('pause')).status,409,'reject duplicate pause');
const managerSeesBreak=await managerCurrent();
assert.equal(managerSeesBreak.data.team.find(t=>t.id===w.data.id).shift.state,'break');
const resumed=await action('resume');
assert.equal(resumed.status,200);
assert.equal(resumed.data.current.state,'working');
const ended=await action('end');
assert.equal(ended.status,200);
assert.equal(ended.data.current.state,'finished');
assert.equal(ended.data.current.endedAt!==null,true);
assert.equal((await action('end')).status,409,'reject double clock out');
const history=await request('/api/attendance/history','GET',null,worker);
assert.equal(history.status,200);
assert.equal(history.data.history.some(h=>h.id===ended.data.current.id),true);
const managerFinal=await managerCurrent();
assert.equal(managerFinal.data.team.find(t=>t.id===w.data.id).shift.state,'finished');
console.log('PASS: two independent roles, clock in / break / resume / clock out, persistence, history, manager visibility, invalid-action rejection');
