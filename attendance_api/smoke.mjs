// Run with the server's DEMO_MANAGER_PASSWORD and DEMO_WORKER_PASSWORD.
// Uses only local loopback; secrets never appear in output or source control.
import assert from 'node:assert/strict';

const base='http://127.0.0.1:'+String(process.env.PORT||19161);
async function call(path,method='GET',body=null,bearer=null){
  const headers={'Content-Type':'application/json'};
  if(bearer)headers.Authorization='Bearer '+bearer;
  const res=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined});
  const data=await res.json();
  return {status:res.status,data};
}
const manager=await call('/api/login','POST',{
  email:'manager@afikim-demo.test',
  password:process.env.DEMO_MANAGER_PASSWORD,
});
const worker=await call('/api/login','POST',{
  email:'worker@afikim-demo.test',
  password:process.env.DEMO_WORKER_PASSWORD,
});
assert.equal(manager.status,200,'manager login');
assert.equal(worker.status,200,'worker login');
const managerToken=manager.data.token,workerToken=worker.data.token;
assert.equal(manager.data.role,'manager');
assert.equal(worker.data.role,'worker');

let data=(await call('/api/assignments','GET',null,managerToken)).data.assignments;
assert.equal(data.length,1,'manager sees assignment');
const a=data[0];
const update={version:a.version,site:'תחנת נתניה - בדיקת סנכרון',lines:'9, 10',
  instructions:'יש לאשר את המשמרת המעודכנת',
  start:a.start,end:a.end};
assert.equal((await call('/api/assignments/'+a.id,'PUT',update,workerToken)).status,403,
  'worker may not edit');
assert.equal((await call('/api/assignments/'+a.id,'PUT',update,managerToken)).status,200,
  'manager edits');
assert.equal((await call('/api/assignments/'+a.id,'PUT',update,managerToken)).status,409,
  'stale version rejected');
data=(await call('/api/assignments','GET',null,workerToken)).data.assignments;
assert.equal(data.length,1);
assert.equal(data[0].site,update.site,'worker sees changed site');
assert.equal(data[0].confirmedAt,null,'editing invalidates confirmation');
assert.equal((await call('/api/assignments/'+a.id+'/confirm','POST',
  {version:data[0].version},managerToken)).status,403,'manager cannot confirm for worker');
assert.equal((await call('/api/assignments/'+a.id+'/confirm','POST',
  {version:data[0].version},workerToken)).status,200,'worker confirms');
assert.equal((await call('/api/assignments/'+a.id+'/confirm','POST',
  {version:data[0].version},workerToken)).status,409,'double confirmation rejected');
data=(await call('/api/assignments','GET',null,managerToken)).data.assignments;
assert.ok(data[0].confirmedAt,'manager sees worker confirmation');
console.log('PASS: two logins / manager update / worker visibility / ack / manager sees ack / role checks / conflicts');
