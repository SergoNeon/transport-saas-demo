// Browser acceptance on official domains using synthetic credentials only.
// Tests manager list, 30 answer comparisons, percentages, and owner role controls.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const adminBase='https://adm.brillteamp.com';
const workerBase='https://test.brillteamp.com';
const creds=JSON.parse(fs.readFileSync('/etc/afikim-exam/staging-credentials.json','utf8'));
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const size of [{width:390,height:844},{width:1366,height:900}]){
   const context=await browser.newContext({viewport:size});
   const worker=await context.newPage();
   await worker.goto(workerBase+'/',{waitUntil:'networkidle'});
   await worker.locator('#exam-code').waitFor();
   assert.equal(await worker.locator('#manager-username').count(),0);
   assert.equal(await worker.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const admin=await context.newPage();
   await admin.goto(adminBase+'/admin.html',{waitUntil:'networkidle'});
   await admin.locator('#manager-username').fill(creds.manager.username);
   await admin.locator('#manager-password').fill(creds.manager.password);
   await admin.locator('#manager-login-form button[type=submit]').click();
   await admin.locator('#manager-table-body [data-open]').first().waitFor({timeout:20000});
   assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const buttons=admin.locator('[data-open]');
   assert.ok(await buttons.count()>0,'Manager should have submitted test records to review');
   await buttons.first().click();
   await admin.locator('.manager-review-list .manager-answer-card').first().waitFor({timeout:20000});
   assert.equal(await admin.locator('.manager-answer-card').count(),30);
   assert.equal(await admin.locator('.manager-answer-compare>div').count(),60);
   const score=await admin.locator('.manager-review-score strong').innerText();
   assert.match(score,/^\d+%$/);
   assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await admin.screenshot({path:'/tmp/afikim-official-review-'+size.width+'.png',fullPage:true});
   await worker.screenshot({path:'/tmp/afikim-official-worker-'+size.width+'.png',fullPage:true});
   console.log('PASS OFFICIAL worker/admin '+size.width+'px, 30 review questions, 60 answer panels, score='+score+', no overflow');
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  await page.goto(adminBase+'/admin.html',{waitUntil:'networkidle'});
  await page.locator('#manager-username').fill(creds.owner.username);
  await page.locator('#manager-password').fill(creds.owner.password);
  await page.locator('#manager-login-form button[type=submit]').click();
  const path=await Promise.race([page.locator('#manager-staff-form').waitFor({timeout:15000}).then(()=> 'staff'),page.locator('#manager-password-form').waitFor({timeout:15000}).then(()=> 'change')]);
  if(path==='staff')console.log('PASS Owner account can add other managers and HR staff');
  else console.log('OWNER FIRST LOGIN PASSWORD CHANGE REQUIRED; cannot access staff form before rotation');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error('OFFICIAL_BROWSER_TEST_FAILURE',e.message);process.exitCode=1});
