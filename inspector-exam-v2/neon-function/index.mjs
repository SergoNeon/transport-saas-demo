// BRILL TEAM PROJECT — Electra Afikim server API (development connectivity check)
export default { async fetch(request) { return Response.json({ok:true,storage:process.env.DATABASE_URL?'connected':'unavailable',service:'afikim-exam-api',version:'connectivity-v1'}, {headers:{'Cache-Control':'no-store'}}); } };
