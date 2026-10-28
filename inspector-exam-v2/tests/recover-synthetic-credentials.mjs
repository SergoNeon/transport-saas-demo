// Controlled recovery of only known synthetic accounts on the isolated staging VPS.
// Never run against production or another database.
import {randomBytes,scryptSync} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {Pool} from 'pg';
if(process.env.EXAM_TEST_ONLY!=='1')throw Error('Refusing non-synthetic environment');
if(!/127\.0\.0\.1:15543\/afikim_exam$/.test(process.env.DATABASE_URL||''))throw Error('Refusing unknown database');
const path='/etc/afikim-exam/staging-credentials.json';
const pass=()=>randomBytes(24).toString('base64url');
const creds=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{
 owner:{username:'000001',password:pass()},
 manager:{username:'000002',password:pass()},
 outsider:{username:'000003',password:pass()}
};
if(!existsSync(path))writeFileSync(path,JSON.stringify(creds,null,2),{mode:0o600,flag:'wx'});
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:false,max:1});
try{
 let updated=0;
 for(const item of [creds.owner,creds.manager,creds.outsider]){
  const salt=randomBytes(16).toString('hex');
  const hash=scryptSync(item.password,salt,64).toString('hex');
  const r=await pool.query('UPDATE exam_admins SET password_salt=$2,password_hash=$3,must_change_password=false WHERE username=$1',
   [item.username,salt,hash]);
  updated+=r.rowCount;
 }
 console.log('Synthetic staging credentials restored for existing accounts:',updated);
}finally{await pool.end()}
