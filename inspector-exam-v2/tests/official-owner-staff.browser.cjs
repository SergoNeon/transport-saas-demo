const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {Pool}=require('pg');
const {chromium}=require('playwright');
const BASE='https://adm.brillteamp.com';
if(process.env.EXAM_TEST_ONLY!=='1'||!process.env.DATABASE_URL?.includes('127.0.0.1:15543/afikim_exam'))throw Error('Synthetic staging only');
const db=new Pool({connectionString:process.env.DATABASE_URL,ssl:false,max:1});
(async()=>{
 const username=String(91000000+crypto.randomInt(8999999));
 const password=String(100000+crypto.randomInt(899999));
 const salt=crypto.randomBytes(16).toString('hex'),digest=crypto.scryptSync(password,salt,64).toString('hex');
 let ownerId=null,browser=null;
 try{
  const row=await db.query("INSERT INTO exam_admins(username,display_name,role,password_salt,password_hash,must_change_password,is_active) VALUES($1,'מנהל מערכת ניסיוני','owner',$2,$3,false,true) RETURNING id",[username,salt,digest]);ownerId=row.rows[0].id;
  browser=await chromium.launch({headless:true});
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:844}});
   await page.goto(BASE+'/',{waitUntil:'networkidle'});
   await page.locator('#manager-username').fill(username);
   await page.locator('#manager-password').fill(password);
   await page.locator('#manager-login-form button[type=submit]').click();
   await page.locator('[data-panel="staff"]').waitFor({timeout:12000});
   await page.locator('[data-panel="staff"]').click();
   await page.locator('#manager-staff-create').waitFor({timeout:10000});
   assert.equal(await page.locator('#staff-number').count(),1);
   assert.equal(await page.locator('#staff-name').count(),1);
   assert.equal(await page.locator('#staff-password').count(),1);
   assert.equal(await page.locator('#staff-role option').count(),2);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   console.log('PASS owner authorized staff-management form on official domain '+width+'px');
   await page.close();
  }
 }finally{
  if(browser)await browser.close();
  if(ownerId){
   await db.query('DELETE FROM exam_staff_sessions WHERE staff_id=$1',[ownerId]);
   await db.query('DELETE FROM exam_admins WHERE id=$1',[ownerId]);
  }
  await db.end();
 }
})().catch(err=>{console.error('OWNER_TEST_FAILED',err.message);process.exitCode=1});
