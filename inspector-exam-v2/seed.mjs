import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) throw Error('DATABASE_URL is required');
const root = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(root,'../inspector-exam-review-demo/assets/questions.js'),'utf8');
const sandbox = { window: {} };
runInNewContext(source,sandbox,{timeout:2000});
const questions = sandbox.window.EXAM_QUESTIONS;
if (!Array.isArray(questions) || questions.length !== 30) throw Error('Expected exactly 30 questions');
if (new Set(questions.map(q=>q.id)).size !== 30) throw Error('Duplicate question IDs');
const pool = new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='disable'?false:{rejectUnauthorized:true},max:1});
try {
 const client = await pool.connect();
 try {
  await client.query('BEGIN');
  for (const q of questions) {
   if (!Array.isArray(q.options)||q.options.length!==4||!Number.isInteger(q.answer)||q.answer<0||q.answer>3) throw Error('Invalid question: '+q.id);
   await client.query('INSERT INTO exam_question_bank(id,section,prompt,choices,answer_index,explanation) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',
    [q.id,q.section,q.question,JSON.stringify(q.options),q.answer,q.explanation]);
  }
  const res=await client.query('SELECT count(*)::int AS total FROM exam_question_bank');
  if(res.rows[0].total!==30)throw Error('Bank count does not equal 30');
  await client.query('COMMIT');
  process.stdout.write('Question bank ready: 30\n');
 } catch(err){await client.query('ROLLBACK');throw err}
 finally {client.release()}
} finally {await pool.end()}
