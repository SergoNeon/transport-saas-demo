import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from './api/index.js';

const root=dirname(fileURLToPath(import.meta.url));
const host=process.env.HOST || '127.0.0.1';
const port=Number(process.env.PORT || 18439);
const assets=new Map([
 ['/', ['index.html','text/html; charset=utf-8']],
 ['/index.html', ['index.html','text/html; charset=utf-8']],
 ['/admin.html', ['admin.html','text/html; charset=utf-8']],
 ['/secure.js', ['secure.js','text/javascript; charset=utf-8']],
 ['/styles.css', ['styles.css','text/css; charset=utf-8']]
]);
const harden=(res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
};
const fail=(res,n,msg)=>{res.writeHead(n,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:msg}))};
async function api(req,res,url){
 const path=url.pathname.slice(5);
 if(!/^[a-z-]{1,48}$/.test(path))return fail(res,404,'Not found');
 let body={};
 if(!['GET','HEAD','OPTIONS'].includes(req.method)){
  let pieces=[],size=0;
  try{
   for await(const part of req){size+=part.length;if(size>32768)return fail(res,413,'Payload too large');pieces.push(part)}
   body=JSON.parse(Buffer.concat(pieces).toString('utf8')||'{}');
   if(typeof body!=='object'||body===null||Array.isArray(body))return fail(res,400,'Invalid payload');
  }catch{return fail(res,400,'Invalid JSON')}
 }
 const adapter={method:req.method,url:req.url,headers:req.headers,query:{path,...Object.fromEntries(url.searchParams.entries())},body};
 let ended=false;
 const writer={
  setHeader:(name,value)=>{if(!res.headersSent)res.setHeader(name,value);return writer},
  status:(code)=>{res.statusCode=code;return writer},
  json:(payload)=>{if(!ended){ended=true;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(payload))}return writer}
 };
 try{await handler(adapter,writer);if(!ended)fail(res,500,'Missing API response')}
 catch(e){console.error('api_critical_error',e?.code||'unknown');if(!res.headersSent)fail(res,500,'Server error');else res.end()}
}
const app=http.createServer(async(req,res)=>{
 harden(res);
 if(!['GET','HEAD','POST'].includes(req.method))return fail(res,405,'Method not allowed');
 let url;try{url=new URL(req.url,'http://localhost')}catch{return fail(res,400,'Invalid URL')}
 if(url.pathname.startsWith('/api/'))return api(req,res,url);
 if(req.method!=='GET'&&req.method!=='HEAD')return fail(res,405,'Method not allowed');
 const asset=assets.get(url.pathname);
 if(!asset)return fail(res,404,'Not found');
 try{
  const body=await readFile(join(root,asset[0]));
  res.writeHead(200,{'Content-Type':asset[1]});
  return res.end(req.method==='HEAD'?undefined:body);
 }catch(e){console.error('static_error',e?.code||'unknown');return fail(res,500,'Internal server error')}
});
app.requestTimeout=15000;
app.headersTimeout=10000;
app.listen(port,host,()=>console.log('Exam API listening on '+host+':'+port));
