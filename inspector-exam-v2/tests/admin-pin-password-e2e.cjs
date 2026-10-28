// Synthetic-only staging: verifies a real admin saves a six-digit PIN and can log in again.
// No real accounts or passwords are touched; test accounts are deleted afterwards.
// Run: set -a; . /etc/afikim-exam/app.env; set +a; NODE_PATH=/opt/balance-staging/app/node_modules node tests/admin-pin-password-e2e.cjs
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {Pool}=require('pg');
const {chromium}=require('playwright');
const BASE=process.env.EXAM_BASE_URL||'https://afikim.77.42.93.209.sslip.io';
if(new URL(BASE).hostname!=='afikim.77.42.93.209.sslip.io')throw Error('Staging host only');
if(process.env.EXAM_TEST_ONLY!=='1'||!process.env.DATABASE_URL?.includes('127.0.0.1:15543/afikim_exam'))throw Error('Synthetic-only database required');
const randomPin=()=>String(crypto.randomInt(100000,999999));
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:false,max:2});
async function api(path,method='GET',body,cookie=''){
 const headers={Origin:BASE,Accept:'application/json'};
 if(body)headers['Content-Type']='application/json';
 if(cookie)headers.Cookie=cookie;
 const r=await fetch(BASE+'/api/'+path,{method,headers,body:body?JSON.stringify(body):undefined});
 let json={};try{json=await r.json()}catch{}
 return {status:r.status,json,cookie:(r.headers.get('set-cookie')||'').split(';')[0]};
}
const check=(r,status,label)=>{assert.equal(r.status,status,label+' got '+r.status+': '+JSON.stringify(r.json));console.log('PASS',label,'HTTP',status);return r.json};
(async()=>{
 let ownerId=null,managerId=null,browser;
 try{
  const policy=check(await api('password-policy'),200,'Password rule published');
  assert.deepEqual(policy,{type:'digits',minLength:6,maxLength:24});
  const username=String(90000000+crypto.randomInt(10000000));
  const managerNumber=String(80000000+crypto.randomInt(10000000));
  const ownerPin=randomPin(),managerOldPin=randomPin();
  let managerNewPin=randomPin();while(managerNewPin===managerOldPin)managerNewPin=randomPin();
  const salt=crypto.randomBytes(16).toString('hex'),digest=crypto.scryptSync(ownerPin,salt,64).toString('hex');
  const created=await pool.query("INSERT INTO exam_admins(username,display_name,role,password_salt,password_hash,must_change_password,is_active) VALUES($1,'מנהל מבחן סינתטי בלבד','owner',$2,$3,false,true) RETURNING id",[username,salt,digest]);
  ownerId=created.rows[0].id;
  const ownerLogin=check(await api('admin-login','POST',{username,password:ownerPin}),200,'Synthetic owner authenticated');
  const ownerCookie=ownerLogin.cookie;
  assert.ok(ownerCookie.startsWith('afikim_admin='));
  check(await api('admin-staff-create','POST',{staffNumber:managerNumber,display_name:'מנהל בדיקת קוד',password:'12345',role:'manager'},ownerCookie),400,'Five-digit new staff PIN rejected');
  const staff=check(await api('admin-staff-create','POST',{staffNumber:managerNumber,display_name:'מנהל בדיקת קוד',password:managerOldPin,role:'manager'},ownerCookie),200,'Owner creates manager with exactly six digits');
  managerId=staff.staff.id;
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const page=await context.newPage();
  await page.goto(BASE+'/admin.html',{waitUntil:'networkidle'});
  await page.locator('#login-user').fill(managerNumber);
  await page.locator('#login-pass').fill(managerOldPin);
  await page.locator('#entry button[type=submit]').click();
  await page.locator('#change-pass').waitFor({timeout:20000});
  assert.match(await page.locator('#next').locator('xpath=..').innerText(),/6/);
  assert.equal(await page.locator('#next').getAttribute('minlength'),'6');
  assert.equal(await page.locator('#next').getAttribute('inputmode'),'numeric');
  assert.equal(await page.locator('#next').getAttribute('pattern'),'[0-9]{6,24}');
  assert.equal(await page.locator('#next').evaluate(el=>{el.value='12345';return el.checkValidity()}),false);
  console.log('PASS browser shows numeric six-digit minimum, rejects five');
  const login=check(await api('admin-login','POST',{username:managerNumber,password:managerOldPin}),200,'Independent API manager session for invalid PIN check');
  const cookie=login.cookie;
  check(await api('admin-password','POST',{current:managerOldPin,next:'12345'},cookie),400,'API rejects five-digit new PIN');
  check(await api('admin-password','POST',{current:managerOldPin,next:'abcd12'},cookie),400,'API rejects non-numeric new PIN');
  await page.locator('#current').fill(managerOldPin);
  await page.locator('#next').fill(managerNewPin);
  await page.locator('#change-pass button[type=submit]').click();
  await page.locator('#change-password-admin').waitFor({timeout:20000});
  console.log('PASS browser successfully saved a six-digit admin password and opened manager dashboard');
  let row=await pool.query('SELECT password_salt,password_hash,must_change_password FROM exam_admins WHERE id=$1',[managerId]);
  assert.equal(row.rows[0].must_change_password,false);
  assert.equal(crypto.scryptSync(managerNewPin,row.rows[0].password_salt,64).toString('hex'),row.rows[0].password_hash);
  console.log('PASS PostgreSQL persisted new password hash and cleared forced rotation flag');
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#change-password-admin').waitFor({timeout:20000});
  console.log('PASS manager session restored after reload');
  await page.locator('#logout-admin').click();
  await page.locator('#login-pass').waitFor({timeout:15000});
  await page.locator('#login-user').fill(managerNumber);
  await page.locator('#login-pass').fill(managerOldPin);
  await page.locator('#entry button[type=submit]').click();
  await page.locator('#notice').waitFor({timeout:15000});
  assert.equal(await page.locator('#change-password-admin').count(),0);
  console.log('PASS old manager password no longer accepted');
  await page.locator('#login-pass').fill(managerNewPin);
  await page.locator('#entry button[type=submit]').click();
  await page.locator('#change-password-admin').waitFor({timeout:20000});
  console.log('PASS new six-digit manager password works after logout and fresh login');
  console.log('PASS END_TO_END: manager account creation + six-digit numeric password save + PostgreSQL + re-login');
  await context.close();
 } finally {
  if(browser)await browser.close();
  if(managerId||ownerId){
   await pool.query('DELETE FROM exam_review_audit WHERE staff_id=ANY($1::uuid[])',[[managerId,ownerId].filter(Boolean)]);
   await pool.query('DELETE FROM exam_staff_sessions WHERE staff_id=ANY($1::uuid[])',[[managerId,ownerId].filter(Boolean)]);
   await pool.query('DELETE FROM exam_admins WHERE id=ANY($1::uuid[])',[[managerId,ownerId].filter(Boolean)]);
  }
  await pool.end();
 }
})().catch(e=>{console.error('PASSWORD_E2E_FAILED:',e.stack||e);process.exitCode=1});
