import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePeriod,summarizeRows,csvFromReport,timeString} from '../timesheet.mjs';

test('period enforces valid Israel calendar dates and at most 93 days',()=>{
 assert.equal(validatePeriod('2026-11-01','2026-11-30'),true);
 assert.equal(validatePeriod('2026-02-29','2026-03-01'),false);
 assert.equal(validatePeriod('2026-12-01','2026-11-01'),false);
 assert.equal(validatePeriod('2026-01-01','2026-05-15'),false);
});
test('unfinished shifts never count as completed time',()=>{
 const rows=[
  {workerId:'w',workerName:'מבקר',finalized:true,workedMs:7200000,breakMs:900000},
  {workerId:'w',workerName:'מבקר',finalized:false,workedMs:null,breakMs:null},
 ];
 const summary=summarizeRows(rows);
 assert.equal(summary.totals.finished,1);
 assert.equal(summary.totals.open,1);
 assert.equal(summary.totals.workedMs,7200000);
 assert.equal(summary.totals.breakMs,900000);
 assert.equal(timeString(summary.totals.workedMs),'02:00');
});
test('CSV neutralizes spreadsheet formulas in employee names',()=>{
 const rows=[{workerId:'evil',workerName:'=2+2',workDay:'2026-11-04',
  startedAt:'2026-11-04T08:00:00.000Z',endedAt:'2026-11-04T09:00:00.000Z',
  workedMs:3600000,breakMs:0,finalized:true}];
 const report={rows,summary:summarizeRows(rows)};
 const csv=csvFromReport(report);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.ok(csv.includes("\"'=2+2\""));
 assert.ok(csv.includes('01:00'));
});
