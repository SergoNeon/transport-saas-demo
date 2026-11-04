// Read-only, role-scoped timesheets. Dates are calendar dates in Israel.
// Only finished shifts contribute to paid-hours-style totals. These numbers
// are raw attendance, not statutory overtime or approved payroll.
const israeliDate = new Intl.DateTimeFormat('en-CA',{
  timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'
});
const israeliTime = new Intl.DateTimeFormat('he-IL',{
  timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
});
const MAX_ROWS = 2000;
const MS_DAY = 24*60*60*1000;

function parseDate(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms=Date.parse(value+'T00:00:00.000Z');
  if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value) return null;
  return ms;
}
export function validatePeriod(from,to){
  const a=parseDate(from),b=parseDate(to);
  if(a===null||b===null||a>b||(b-a)/MS_DAY>92)return false;
  return true;
}
export function timeString(ms) {
  if(ms===null || ms===undefined) return '—';
  const minutes=Math.floor(Math.max(0,Number(ms))/60000);
  return String(Math.floor(minutes/60)).padStart(2,'0')+':'+
    String(minutes%60).padStart(2,'0');
}
function rowFromDb(row) {
  const finished=row.ended_at!==null;
  const elapsed=finished
    ?Math.max(0,new Date(row.ended_at).getTime()-new Date(row.started_at).getTime())
    :null;
  const completedBreak=Number(row.break_ms);
  return {
    id:String(row.id),workerId:row.worker_id,workerName:row.worker_name,
    workDay:row.work_day,startedAt:row.started_at,endedAt:row.ended_at,
    state:row.state,
    breakMs:finished?completedBreak:null,
    workedMs:finished?Math.max(0,elapsed-completedBreak):null,
    finalized:finished,
  };
}
export function summarizeRows(rows) {
  const totals={shifts:0,finished:0,open:0,workedMs:0,breakMs:0};
  const workers=new Map();
  for(const row of rows) {
    totals.shifts++;
    if(row.finalized){totals.finished++;totals.workedMs+=row.workedMs;totals.breakMs+=row.breakMs;}
    else totals.open++;
    let w=workers.get(row.workerId);
    if(!w){w={workerId:row.workerId,name:row.workerName,shifts:0,finished:0,open:0,workedMs:0,breakMs:0};workers.set(row.workerId,w);}
    w.shifts++;
    if(row.finalized){w.finished++;w.workedMs+=row.workedMs;w.breakMs+=row.breakMs;}
    else w.open++;
  }
  return {totals,workers:[...workers.values()].sort((a,b)=>a.name.localeCompare(b.name,'he'))};
}
function safeCsvCell(value) {
  let s=String(value??'');
  // Neutralize spreadsheet formula injection, including Unicode whitespace.
  if(/^[\s\uFEFF\u200B]*[=+\-@]/u.test(s))s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
function clock(iso) {
  return iso?israeliTime.format(new Date(iso)):'—';
}
export function csvFromReport(report) {
  const header=['תאריך','עובד','כניסה','יציאה','שעות עבודה','הפסקות','סטטוס'];
  const lines=[header.map(safeCsvCell).join(',')];
  for(const r of report.rows)lines.push([
    r.workDay,r.workerName,clock(r.startedAt),clock(r.endedAt),
    timeString(r.workedMs),timeString(r.breakMs),
    r.finalized?'הושלמה':'פתוחה',
  ].map(safeCsvCell).join(','));
  lines.push(['סה"כ','','','',timeString(report.summary.totals.workedMs),
    timeString(report.summary.totals.breakMs),'משמרות שהושלמו בלבד'].map(safeCsvCell).join(','));
  return '\uFEFF'+lines.join('\r\n')+'\r\n';
}
export async function timesheetRoute(req,res,{pool,user,url,respond,failure}) {
  if(!['/api/attendance/timesheet','/api/attendance/timesheet.csv'].includes(url.pathname))
    return false;
  if(req.method!=='GET')return failure(res,405,'Method not allowed');
  const from=url.searchParams.get('from'),to=url.searchParams.get('to');
  if(!validatePeriod(from,to))return failure(res,400,'Invalid date range (maximum 93 days)');
  const requestedWorker=url.searchParams.get('workerId');
  if(requestedWorker && (requestedWorker.length>80||!/^[a-zA-Z0-9_-]+$/.test(requestedWorker)))
    return failure(res,400,'Invalid worker id');
  if(user.role==='worker'&&requestedWorker&&requestedWorker!==user.id)
    return failure(res,403,'Worker can only access own report');

  const params=[from,to];
  const filters=[
    "(a.started_at AT TIME ZONE 'Asia/Jerusalem')::date BETWEEN $1::date AND $2::date"
  ];
  if(user.role==='worker'){params.push(user.id);filters.push('a.worker_id=$3');}
  else if(requestedWorker){params.push(requestedWorker);filters.push('a.worker_id=$3');}
  const sql=[
    "SELECT a.*,u.name AS worker_name,",
    "(a.started_at AT TIME ZONE 'Asia/Jerusalem')::date::text AS work_day",
    "FROM attendance_shifts a JOIN sync_users u ON u.id=a.worker_id",
    "WHERE "+filters.join(' AND '),
    "ORDER BY a.started_at DESC,a.id DESC LIMIT "+String(MAX_ROWS+1),
  ].join(' ');
  const data=await pool.query(sql,params);
  const truncated=data.rows.length>MAX_ROWS;
  const rows=data.rows.slice(0,MAX_ROWS).map(rowFromDb);
  const report={
    period:{from,to,timeZone:'Asia/Jerusalem'},
    role:user.role,truncated,rows,summary:summarizeRows(rows),
    notice:'Raw attendance only. Active shifts excluded from totals; not approved payroll.',
  };
  if(url.pathname.endsWith('.csv')) {
    if(truncated)return failure(res,413,'Too many records; narrow the report period');
    const csv=csvFromReport(report);
    res.writeHead(200,{
      'Content-Type':'text/csv; charset=utf-8',
      'Content-Disposition':'attachment; filename="electra-attendance-'+from+'_'+to+'.csv"',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
    });
    res.end(csv);
    return true;
  }
  return respond(res,200,report);
}
