/* Verified browser contract for independent worker and management entry pages. */
/* NODE_PATH=/opt/balance-staging/app/node_modules node tests/separate-portals.browser.cjs */
const assert=require('node:assert/strict');
const { chromium }=require('playwright');
const base=process.env.EXAM_BASE_URL||'https://afikim.77.42.93.209.sslip.io';
if(!base.includes('77.42.93.209.sslip.io'))throw Error('Refusing non-staging target');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    for (const width of [390,1366]) {
      const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1});
      const worker=await context.newPage();
      await worker.goto(base+'/',{waitUntil:'networkidle'});
      await worker.locator('#login-code').waitFor();
      assert.equal(await worker.locator('body').getAttribute('data-portal'),'worker');
      assert.equal(await worker.locator('#login-doc').count(),1);
      assert.equal(await worker.locator('#login-user').count(),0);
      assert.equal(await worker.locator('#login-pass').count(),0);
      assert.equal(await worker.locator('.secure-tabs').count(),0);
      assert.equal(await worker.locator('a[href="/admin.html"]').count(),0);
      assert.equal(await worker.locator('h1').innerText(),'בחינה אישית לעובד');
      assert.equal(await worker.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
      const admin=await context.newPage();
      await admin.goto(base+'/admin.html',{waitUntil:'networkidle'});
      await admin.locator('#login-user').waitFor();
      assert.equal(await admin.locator('body').getAttribute('data-portal'),'admin');
      assert.equal(await admin.locator('#login-pass').count(),1);
      assert.equal(await admin.locator('#login-code').count(),0);
      assert.equal(await admin.locator('#login-doc').count(),0);
      assert.equal(await admin.locator('.secure-tabs').count(),0);
      assert.equal(await admin.locator('a[href="/#worker"]').count(),0);
      assert.equal(await admin.locator('h1').innerText(),'ניהול בחינות והסמכות');
      assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
      await admin.reload({waitUntil:'networkidle'});
      assert.equal(await admin.locator('#login-user').count(),1);
      const original=await worker.locator('h1').innerText();
      await admin.reload({waitUntil:'networkidle'});
      assert.equal(await worker.locator('h1').innerText(),original);
      await worker.screenshot({path:'/tmp/afikim-separated-worker-'+width+'.png',fullPage:true});
      await admin.screenshot({path:'/tmp/afikim-separated-admin-'+width+'.png',fullPage:true});
      console.log('PASS SEPARATE-PORTALS width='+width+' worker=/ admin=/admin.html no-tabs=true overflow=false');
      await context.close();
    }
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const legacy=await context.newPage();
    await legacy.goto(base+'/#admin',{waitUntil:'networkidle'});
    await legacy.waitForURL(url=>url.pathname==='/admin.html',{timeout:12000});
    assert.equal(await legacy.locator('#login-user').count(),1);
    console.log('PASS LEGACY-ADMIN-URL redirect=/admin.html');
    const res=await context.request.get(base+'/api/health');
    assert.equal(res.status(),200);
    assert.equal((await res.json()).questions,30);
    console.log('PASS POSTGRES-HEALTH questions=30');
    await context.close();
  }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
