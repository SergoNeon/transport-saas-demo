// Demo shift timekeeping, stored in PostgreSQL. No fake GPS or payroll claims.
export async function createAttendanceTables(pool) {
  await pool.query([
    "CREATE TABLE IF NOT EXISTS attendance_shifts (",
    "id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,",
    "worker_id text NOT NULL REFERENCES sync_users(id),",
    "started_at timestamptz NOT NULL DEFAULT now(),",
    "ended_at timestamptz,",
    "state text NOT NULL DEFAULT 'working' CHECK (state IN ('working','break','finished')),",
    "break_started_at timestamptz,",
    "break_ms bigint NOT NULL DEFAULT 0 CHECK (break_ms >= 0),",
    "version integer NOT NULL DEFAULT 1,",
    "CHECK(ended_at IS NULL OR ended_at >= started_at));",
    "CREATE UNIQUE INDEX IF NOT EXISTS attendance_one_active",
    "ON attendance_shifts(worker_id) WHERE ended_at IS NULL;",
    "CREATE INDEX IF NOT EXISTS attendance_shift_by_worker",
    "ON attendance_shifts(worker_id, started_at DESC);",
    "CREATE TABLE IF NOT EXISTS attendance_events (",
    "id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,",
    "worker_id text NOT NULL REFERENCES sync_users(id),",
    "shift_id bigint NOT NULL REFERENCES attendance_shifts(id),",
    "action text NOT NULL CHECK (action IN ('start','pause','resume','end')),",
    "at timestamptz NOT NULL DEFAULT now(),",
    "actor_id text NOT NULL REFERENCES sync_users(id));",
  ].join(" "));
}

function dto(row, now) {
  if (!row) return null;
  const begin = new Date(row.started_at).getTime();
  const end = row.ended_at ? new Date(row.ended_at).getTime() : now.getTime();
  const openBreak = row.break_started_at
    ? Math.max(0,end-new Date(row.break_started_at).getTime()) : 0;
  const totalBreak = Number(row.break_ms) + openBreak;
  return {
    id: String(row.id),workerId:row.worker_id,state:row.state,
    startedAt:row.started_at,endedAt:row.ended_at,
    breakStartedAt:row.break_started_at,
    completedBreakMs:Number(row.break_ms),
    breakMs:totalBreak,workedMs:Math.max(0,end-begin-totalBreak),
    version:row.version,
  };
}

export async function attendanceRoute(req,res,{pool,user,url,readBody,respond,failure,announce}) {
  if (url.pathname === '/api/attendance/current' && req.method === 'GET') {
    const time=new Date();
    if(user.role==='worker') {
      const data=await pool.query(
        'SELECT * FROM attendance_shifts WHERE worker_id=$1 ORDER BY started_at DESC LIMIT 1',
        [user.id]);
      return respond(res,200,{now:time.toISOString(),role:user.role,
        current:dto(data.rows[0],time)});
    }
    const data=await pool.query([
      "SELECT u.id AS employee_id,u.name,s.*",
      "FROM sync_users u LEFT JOIN LATERAL (",
      "SELECT * FROM attendance_shifts WHERE worker_id=u.id",
      "ORDER BY started_at DESC LIMIT 1) s ON true",
      "WHERE u.role='worker' AND u.active=true ORDER BY u.name",
    ].join(" "));
    return respond(res,200,{now:time.toISOString(),role:user.role,
      team:data.rows.map(row=>({
        id:row.employee_id,name:row.name,
        shift:row.id?dto(row,time):null,
      }))});
  }
  if(url.pathname === '/api/attendance/history' && req.method === 'GET') {
    const sql=[
      "SELECT a.*,u.name AS worker_name FROM attendance_shifts a",
      "JOIN sync_users u ON u.id=a.worker_id",
      user.role==='worker'?"WHERE a.worker_id=$1":"",
      "ORDER BY a.started_at DESC LIMIT 60",
    ].join(" ");
    const data=await pool.query(sql,user.role==='worker'?[user.id]:[]);
    const time=new Date();
    return respond(res,200,{now:time.toISOString(),
      history:data.rows.map(row=>({...dto(row,time),workerName:row.worker_name}))});
  }
  if(url.pathname === '/api/attendance/transition' && req.method==='POST') {
    if(user.role!=='worker')return failure(res,403,'Worker only');
    const body=await readBody(req);
    const action=body?.action;
    if(!['start','pause','resume','end'].includes(action))
      return failure(res,400,'Invalid clock action');
    const client=await pool.connect();
    let outcome;
    try {
      await client.query('BEGIN');
      // Lock the user row to serialize simultaneous taps from multiple devices.
      await client.query('SELECT id FROM sync_users WHERE id=$1 FOR UPDATE',[user.id]);
      const data=await client.query(
        'SELECT * FROM attendance_shifts WHERE worker_id=$1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1 FOR UPDATE',
        [user.id]);
      const old=data.rows[0];
      if(action==='start') {
        if(old){await client.query('ROLLBACK');return failure(res,409,'Shift already running');}
        const result=await client.query(
          "INSERT INTO attendance_shifts(worker_id,state) VALUES($1,'working') RETURNING *",
          [user.id]);
        outcome=result.rows[0];
      } else if(!old) {
        await client.query('ROLLBACK');return failure(res,409,'No active shift');
      } else if(action==='pause'&&old.state==='working') {
        const result=await client.query(
          "UPDATE attendance_shifts SET state='break',break_started_at=now(),version=version+1 WHERE id=$1 RETURNING *",
          [old.id]);
        outcome=result.rows[0];
      } else if(action==='resume'&&old.state==='break') {
        const result=await client.query(
          ["UPDATE attendance_shifts SET state='working',",
            "break_ms=break_ms+GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(now()-break_started_at))*1000)::bigint),",
            "break_started_at=NULL,version=version+1 WHERE id=$1 RETURNING *",
          ].join(" "),[old.id]);
        outcome=result.rows[0];
      } else if(action==='end'&&['working','break'].includes(old.state)) {
        const result=await client.query(
          ["UPDATE attendance_shifts SET state='finished',ended_at=now(),",
           "break_ms=break_ms+CASE WHEN break_started_at IS NULL THEN 0 ELSE",
           "GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(now()-break_started_at))*1000)::bigint) END,",
           "break_started_at=NULL,version=version+1 WHERE id=$1 RETURNING *",
          ].join(" "),[old.id]);
        outcome=result.rows[0];
      } else {
        await client.query('ROLLBACK');return failure(res,409,'Incorrect shift state');
      }
      await client.query(
        'INSERT INTO attendance_events(worker_id,shift_id,action,actor_id) VALUES($1,$2,$3,$4)',
        [user.id,outcome.id,action,user.id]);
      await client.query('COMMIT');
      const time=new Date();
      const shift=dto(outcome,time);
      announce(user.id,'attendance-updated',{workerId:user.id,action,shift});
      return respond(res,200,{ok:true,now:time.toISOString(),current:shift});
    } catch(e) {
      await client.query('ROLLBACK').catch(()=>{});
      throw e;
    } finally { client.release(); }
  }
  return false;
}
