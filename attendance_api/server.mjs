import http from 'node:http';
import {randomBytes,scryptSync,timingSafeEqual,createHmac} from 'node:crypto';
import pg from 'pg';
import {createAttendanceTables,attendanceRoute} from './attendance.mjs';
import {timesheetRoute} from './timesheet.mjs';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5});
const key=process.env.API_SIGNING_KEY;
if(!process.env.DATABASE_URL || !key || key.length<40)throw Error('DATABASE_URL and API_SIGNING_KEY required');
const port=+(process.env.PORT||19161);
const origin='https://sergoneon.github.io';
const listeners=new Map();
const failures=new Map();
const sql={
schema:"CREATE TABLE IF NOT EXISTS sync_users (id text PRIMARY KEY,email text UNIQUE NOT NULL,pass_hash text NOT NULL,role text NOT NULL CHECK(role IN ('manager','worker')),name text NOT NULL,active boolean NOT NULL DEFAULT true); CREATE TABLE IF NOT EXISTS sync_assignments (id text PRIMARY KEY,worker_id text REFERENCES sync_users(id),site text NOT NULL,lines text NOT NULL,instructions text NOT NULL,starts timestamptz NOT NULL,ends timestamptz NOT NULL,version int NOT NULL DEFAULT 1,confirmed_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),CHECK(ends>starts)); CREATE TABLE IF NOT EXISTS sync_audit (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor text NOT NULL,assignment text NOT NULL,kind text NOT NULL,at timestamptz NOT NULL DEFAULT now());",
list:"SELECT a.*,u.name AS worker_name FROM sync_assignments a JOIN sync_users u ON u.id=a.worker_id",
update:"UPDATE sync_assignments SET starts=$1,ends=$2,site=$3,lines=$4,instructions=$5,version=version+1,confirmed_at=NULL,updated_at=now() WHERE id=$6 AND version=$7 RETURNING *",
confirm:"UPDATE sync_assignments SET confirmed_at=now(),updated_at=now() WHERE id=$1 AND worker_id=$2 AND version=$3 AND confirmed_at IS NULL RETURNING *",
};
function respond(res,status,body){if(res.writableEnded||res.headersSent)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
function failure(res,status,msg){respond(res,status,{error:msg});}
function sign(s){return createHmac('sha256',key).update(s).digest('base64url');}
function token(id,role){const p=Buffer.from(JSON.stringify({id,role,exp:Math.floor(Date.now()/1000)+28800})).toString('base64url');return p+'.'+sign(p);}
function auth(req){try{const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return null;const [p,s]=h.slice(7).split('.');const signature=sign(p);if(!s||s.length!==signature.length||!timingSafeEqual(Buffer.from(s),Buffer.from(signature)))return null;const d=JSON.parse(Buffer.from(p,'base64url').toString());return d.exp>Math.floor(Date.now()/1000)&&['manager','worker'].includes(d.role)?d:null;}catch{return null;}}
function hash(password,salt=randomBytes(24).toString('hex')){return salt+':'+scryptSync(password,salt,64).toString('hex');}
function matches(password,stored){try{const [salt,hex]=stored.split(':');return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hex,'hex'));}catch{return false;}}
async function body(req){const items=[];let size=0;for await(const part of req){size+=part.length;if(size>8192)throw Error('Body too large');items.push(part);}try{return JSON.parse(Buffer.concat(items).toString()||'{}')}catch{throw Error('Invalid JSON')}}
function dto(a){return {id:a.id,workerId:a.worker_id,workerName:a.worker_name,site:a.site,lines:a.lines,instructions:a.instructions,start:a.starts,end:a.ends,version:a.version,confirmedAt:a.confirmed_at,updatedAt:a.updated_at};}
function announce(wid,event,record){for(const channel of ['manager','worker:'+wid])for(const client of listeners.get(channel)||[]){if(!client.writableEnded)client.write('event: '+event+'\ndata: '+JSON.stringify(record)+'\n\n');}}
async function handle(req,res){
if(req.headers.origin&&req.headers.origin!==origin)return failure(res,403,'Origin forbidden');
if(req.headers.origin===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');res.setHeader('Vary','Origin');}
if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
const url=new URL(req.url,'http://127.0.0.1:'+port);
if(req.method==='GET'&&url.pathname==='/health')return respond(res,200,{ok:true,service:'electra-attendance-sync'});
if(req.method==='POST'&&url.pathname==='/api/login'){
 const ip=(req.socket.remoteAddress||'').slice(0,64);const throttle=failures.get(ip)||{count:0,until:0};
 if(throttle.until>Date.now())return failure(res,429,'Try again later');
 const b=await body(req);if(typeof b.email!=='string'||typeof b.password!=='string'||b.password.length>160)return failure(res,400,'Invalid login');
 const found=await pool.query('SELECT * FROM sync_users WHERE email=$1 AND active=true',[b.email.trim().toLowerCase()]);
 if(!found.rowCount||!matches(b.password,found.rows[0].pass_hash)){throttle.count++;if(throttle.count>=6){throttle.count=0;throttle.until=Date.now()+120000;}failures.set(ip,throttle);return failure(res,401,'Invalid credentials');}
 failures.delete(ip);const u=found.rows[0];return respond(res,200,{token:token(u.id,u.role),id:u.id,role:u.role,name:u.name,expiresIn:28800});
}
const user=auth(req);if(!user)return failure(res,401,'Authentication required');
const check=await pool.query('SELECT role,active FROM sync_users WHERE id=$1',[user.id]);if(!check.rowCount||!check.rows[0].active||check.rows[0].role!==user.role)return failure(res,401,'Access revoked');
if(req.method==='GET'&&url.pathname==='/api/assignments'){
 const rows=await pool.query(sql.list+(user.role==='worker'?' WHERE a.worker_id=$1':'')+' ORDER BY a.starts',user.role==='worker'?[user.id]:[]);
 return respond(res,200,{role:user.role,assignments:rows.rows.map(dto),at:new Date().toISOString()});
}
if(req.method==='GET'&&url.pathname==='/api/events'){
 const channel=user.role==='manager'?'manager':'worker:'+user.id;
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
 res.write('event: ready\ndata: {"ok":true}\n\n');
 const subs=listeners.get(channel)||new Set();subs.add(res);listeners.set(channel,subs);
 const pulse=setInterval(()=>{if(!res.writableEnded)res.write(': heartbeat\n\n')},20000);
 req.on('close',()=>{clearInterval(pulse);subs.delete(res)});return;
}
if(url.pathname.startsWith('/api/attendance/timesheet')) {
 const out=await timesheetRoute(req,res,{pool,user,url,respond,failure});
 if(out!==false)return out;
}
if(url.pathname.startsWith('/api/attendance/')) {
 const result=await attendanceRoute(req,res,{
   pool,user,url,readBody:body,respond,failure,announce,
 });
 if(result!==false)return result;
}
const m=url.pathname.match(/^\/api\/assignments\/([a-zA-Z0-9_-]+)(\/confirm)?$/);
if(m&&req.method==='PUT'&&!m[2]){
 if(user.role!=='manager')return failure(res,403,'Manager only');
 const b=await body(req);
 if(!Number.isInteger(b.version)||typeof b.site!=='string'||typeof b.lines!=='string'||typeof b.instructions!=='string'||typeof b.start!=='string'||typeof b.end!=='string'||!b.site.trim()||!b.lines.trim()||!b.instructions.trim()||b.site.length>120||b.lines.length>80||b.instructions.length>260||!Number.isFinite(Date.parse(b.start))||!Number.isFinite(Date.parse(b.end))||Date.parse(b.end)<=Date.parse(b.start))return failure(res,400,'Invalid assignment');
 const client=await pool.connect();
 try{await client.query('BEGIN');const updated=await client.query(sql.update,[b.start,b.end,b.site.trim(),b.lines.trim(),b.instructions.trim(),m[1],b.version]);if(!updated.rowCount){await client.query('ROLLBACK');return failure(res,409,'Version conflict');}await client.query("INSERT INTO sync_audit(actor,assignment,kind) VALUES($1,$2,'updated')",[user.id,m[1]]);await client.query('COMMIT');announce(updated.rows[0].worker_id,'assignment-updated',{id:m[1],version:updated.rows[0].version});return respond(res,200,{ok:true,version:updated.rows[0].version});}catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
}
if(m&&req.method==='POST'&&m[2]){
 if(user.role!=='worker')return failure(res,403,'Worker only');
 const b=await body(req);if(!Number.isInteger(b.version))return failure(res,400,'Version required');
 const updated=await pool.query(sql.confirm,[m[1],user.id,b.version]);
 if(!updated.rowCount)return failure(res,409,'Already confirmed or outdated');
 await pool.query("INSERT INTO sync_audit(actor,assignment,kind) VALUES($1,$2,'confirmed')",[user.id,m[1]]);
 announce(user.id,'assignment-confirmed',{id:m[1],version:b.version});return respond(res,200,{ok:true});
}
return failure(res,404,'Not found');
}
async function setup(){
 await pool.query(sql.schema);
 await createAttendanceTables(pool);
 const manager=process.env.DEMO_MANAGER_PASSWORD,worker=process.env.DEMO_WORKER_PASSWORD;
 if(!manager||!worker||manager.length<12||worker.length<12)throw Error('Strong demo credentials required');
 for(const [id,email,role,name,password] of [
  ['m-demo','manager@afikim-demo.test','manager','מנהל הדגמה',manager],
  ['w-demo','worker@afikim-demo.test','worker','מבקר הדגמה',worker]
 ])await pool.query("INSERT INTO sync_users(id,email,role,name,pass_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING",[id,email,role,name,hash(password)]);
 await pool.query("INSERT INTO sync_assignments(id,worker_id,site,lines,instructions,starts,ends) VALUES('a-demo','w-demo','תחנה מרכזית, נתניה','1, 2','יש להתייצב בנקודת העבודה ולדווח על תחילת המשמרת.', now()::date + interval '7 hours',now()::date + interval '15 hours') ON CONFLICT(id) DO NOTHING");
}
setup().then(()=>{
 console.log('Electra sync ready');
 if(process.argv.includes('--seed')){pool.end();return;}
 http.createServer((req,res)=>handle(req,res).catch(e=>{console.error(e.message);if(!res.headersSent)failure(res,500,'Internal error');})).listen(port,'127.0.0.1');
}).catch(e=>{console.error('startup error:',e.message);process.exit(1)});
