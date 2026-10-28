// Browser acceptance for the dedicated Electra Afikim worker UX on official HTTPS hostname.
// Synthetic identities ONLY; requires root-only file containing test manager credentials.
const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
const BASE='https://test.brillteamp.com';
const ADMIN='https://adm.brillteamp.com';
const output='/tmp/afikim-worker-';
const creds=JSON.parse(readFileSync(process.env.EXAM_TEST_CREDENTIALS_PATH||'/etc/afikim-exam/staging-credentials.json','utf8'));
async function call(path,method,body,cookie=''){
 const r=await fetch(ADMIN+'/api/'+path,{method,headers:{Accept:'application/json',Origin:ADMIN,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
 let data;try{data=await r.json()}catch{data={}};
 assert.equal(r.status,200,path+' rejected: '+r.status+' '+JSON.stringify(data));
 return {data,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const errors=[];
  for(const width of [320,390,768,1440]){
   const p=await browser.newPage({viewport:{width,height:width>800?900:844},deviceScaleFactor:1});
   p.on('pageerror',e=>errors.push(e.message));
   await p.goto(BASE,{waitUntil:'networkidle'});
   await p.locator('#exam-code').waitFor({timeout:13000});
   assert.equal(await p.locator('#exam-id').count(),1);
   assert.equal(await p.locator('#login-user').count(),0);
   assert.equal(await p.locator('#login-pass').count(),0);
   const dimensions=await p.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
   assert.ok(dimensions.scroll<=dimensions.client,'worker horizontal scroll at '+width+' '+JSON.stringify(dimensions));
   const img=await p.locator('.afikim-logo').evaluate(el=>el.complete&&el.naturalWidth>0);
   assert.ok(img,'official logo failed to load');
   await p.screenshot({path:output+'login-'+width+'.png',fullPage:true});
   console.log('PASS worker login mobile/desktop viewport='+width+' no-scroll; logo; separate credentials');
   await p.close();
  }
  const login=await call('admin-login','POST',creds.manager);
  const cookie=login.cookie;
  const fakeId='000000'+String(800+Math.floor(Math.random()*140)).padStart(3,'0');
  const assign=await call('admin-assign','POST',{name:'נבחן בדיקה ממשק חדש',document:fakeId},cookie);
  const code=assign.data.code;
  assert.ok(code&&code.length>=12);
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const worker=await context.newPage();
  worker.on('pageerror',e=>errors.push(e.message));
  await worker.goto(BASE,{waitUntil:'networkidle'});
  await worker.locator('#exam-code').fill(code);
  await worker.locator('#exam-id').fill(fakeId);
  await worker.locator('#worker-enter').click();
  await worker.locator('#worker-next').waitFor({timeout:15000});
  assert.equal(await worker.locator('.worker-choice').count(),4);
  assert.equal(await worker.locator('.worker-nav-item').count(),30);
  assert.ok((await worker.locator('body').innerText()).includes('מבחן מבקרי תחבורה'));
  assert.ok(!(await worker.content()).includes('answer_index'));
  await worker.screenshot({path:output+'exam-390.png',fullPage:true});
  console.log('PASS exam renders 30 navigation controls + four answer options, no answer key in DOM');
  await worker.locator('[data-answer="1"]').click();
  await worker.locator('#worker-save-status').getByText('התשובה נשמרה בשרת').waitFor({timeout:10000});
  await worker.locator('#worker-next').click();
  assert.equal(await worker.locator('.worker-question-meta').innerText().then(x=>x.includes('2 / 30')),true);
  await worker.reload({waitUntil:'networkidle'});
  await worker.locator('#worker-next').waitFor({timeout:15000});
  assert.ok((await worker.locator('.worker-progress-info').innerText()).includes('1 תשובות'));
  console.log('PASS answer persists after browser reload');
  for(const width of [320,390,1440]){
   const page=await context.newPage({viewport:{width,height:844}});
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(BASE,{waitUntil:'networkidle'});
   await page.locator('.worker-question-card').waitFor({timeout:10000});
   const x=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
   assert.ok(x.scroll<=x.client,'exam overflow at '+width+' '+JSON.stringify(x));
   await page.screenshot({path:output+'exam-'+width+'.png',fullPage:true});
   console.log('PASS active exam viewport='+width+' no horizontal scroll');
   await page.close();
  }
  await worker.locator('[data-go="29"]').click();
  await worker.locator('#worker-next').click();
  await worker.locator('#worker-confirm-title').waitFor({timeout:10000});
  assert.ok((await worker.locator('#worker-confirm-description').innerText()).includes('29'));
  await worker.screenshot({path:output+'confirm-390.png',fullPage:true});
  await worker.locator('#worker-cancel-submit').click();
  await worker.locator('[data-go="0"]').click();
  await worker.locator('.worker-choice.is-selected').waitFor({timeout:10000});
  console.log('PASS submission modal cancel restores exam and saved answer');
  for(let i=1;i<30;i++){
   await worker.locator('[data-go="'+i+'"]').click();
   await worker.locator('[data-answer="'+(i%4)+'"]').click();
   await worker.locator('.worker-choice.is-selected').waitFor({timeout:10000});
  }
  await worker.locator('#worker-next').click();
  await worker.locator('#worker-confirm-submit').click();
  await worker.locator('#receipt-title').waitFor({timeout:15000});
  assert.equal(await worker.locator('[data-clock]').count(),0);
  assert.ok(!(await worker.locator('main').innerText()).includes('%'));
  await worker.screenshot({path:output+'receipt-390.png',fullPage:true});
  console.log('PASS submitted receipt hides scores and question bank');
  await worker.locator('#worker-exit').click();
  await worker.locator('#exam-code').waitFor({timeout:10000});
  await worker.locator('#exam-code').fill(code);
  await worker.locator('#exam-id').fill(fakeId);
  await worker.locator('#worker-enter').click();
  await worker.locator('[data-notice]').getByText('הקוד', {exact:false}).waitFor({timeout:10000});
  assert.equal(await worker.locator('#worker-next').count(),0);
  console.log('PASS submitted code cannot reopen exam');
  assert.equal(errors.length,0,'browser JS errors: '+errors.join(', '));
  console.log('PASS all worker visual and behavioral regressions; synthetic candidate '+assign.data.candidate.id);
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error('WORKER_UI_TEST_FAILED',e.stack||e);process.exitCode=1});
