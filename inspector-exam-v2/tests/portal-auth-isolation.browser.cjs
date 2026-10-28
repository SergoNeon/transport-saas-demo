// Check an authorized manager session cannot turn the dedicated worker page into a manager screen.
// Uses synthetic credentials from root-only VPS file; never prints passwords.
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {chromium}=require('playwright');
const base=process.env.EXAM_BASE_URL||'https://afikim.77.42.93.209.sslip.io';
if(!base.includes('77.42.93.209.sslip.io'))throw Error('Staging target required');
if(!process.env.EXAM_TEST_CREDENTIALS_PATH)throw Error('Use root-only synthetic credentials on VPS');
const data=JSON.parse(readFileSync(process.env.EXAM_TEST_CREDENTIALS_PATH,'utf8'));
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const admin=await context.newPage();
  await admin.goto(base+'/admin.html',{waitUntil:'networkidle'});
  await admin.locator('#login-user').fill(data.manager.username);
  await admin.locator('#login-pass').fill(data.manager.password);
  await admin.locator('#entry button[type=submit]').click();
  await admin.locator('.secure-heading').waitFor({timeout:15000});
  assert.equal(admin.url().split('?')[0],base+'/admin.html');
  assert.equal(await admin.locator('#login-code').count(),0);
  assert.equal(await admin.locator('#login-user').count(),0);
  console.log('PASS manager authenticated on /admin.html without worker controls');
  const worker=await context.newPage();
  await worker.goto(base+'/',{waitUntil:'networkidle'});
  await worker.locator('#login-code').waitFor({timeout:15000});
  assert.equal(await worker.locator('#login-user').count(),0);
  assert.equal(await worker.locator('#login-pass').count(),0);
  console.log('PASS employee page remains employee-only with manager cookie present');
  await admin.reload({waitUntil:'networkidle'});
  await admin.locator('.secure-heading').waitFor({timeout:15000});
  assert.equal(await admin.locator('#login-code').count(),0);
  console.log('PASS supervisor session restores on dedicated page after reload');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
