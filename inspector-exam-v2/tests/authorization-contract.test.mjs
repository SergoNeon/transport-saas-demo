import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const api=readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
const checks=[
 ['manager list scoped',api.includes("assigned_by = $2")&&api.includes("[a.role,a.id]")],
 ['manual decision scoped',api.includes("assigned_by=$4")&&api.includes("[id,decision,notes,a.id,a.role]")],
 ['worker questions require active deadline',api.includes("w.status!=='in_progress'")&&api.includes("w.time_limit_seconds*1000<=Date.now()")],
 ['Israeli ID validation',api.includes("const validDoc=x=>/^\\d{9}$/.test(x)")],
 ['worker submit hides score',api.includes("return res.json({submitted:true})")],
 ['sessions stored server side',api.includes('exam_staff_sessions')&&api.includes('exam_candidate_sessions')],
];
for (const [label,passed] of checks) {assert.ok(passed,label);console.log('PASS',label);}
console.log('Static contract checks only: deployment and cross-device E2E still required');
