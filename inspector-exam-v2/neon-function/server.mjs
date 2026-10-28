import handler from '../api/index.js';
import { Pool } from 'pg';

const healthPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 2,
  connectionTimeoutMillis: 8000
});
healthPool.on('error', () => {});

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const route = url.pathname.replace(/^\/+|\/+$/g, '') || 'health';

    if (request.method === 'GET' && route === 'health') {
      try {
        const result = await healthPool.query(
          'SELECT count(*)::integer AS questions FROM exam_question_bank'
        );
        return Response.json(
          { ok: true, storage: 'postgresql', questions: result.rows[0].questions, ready: result.rows[0].questions === 30 },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      } catch (error) {
        console.error('health_sql_error', error?.code || 'unknown');
        return Response.json({ ok: false, ready: false }, { status: 503 });
      }
    }

    let body = {};
    if (['POST', 'PATCH', 'PUT'].includes(request.method)) {
      try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
    }
    const req = {
      method: request.method,
      url: '/api/' + route,
      query: { path: route, ...Object.fromEntries(url.searchParams.entries()) },
      headers: Object.fromEntries(request.headers.entries()),
      body
    };
    let statusCode = 200;
    let responseBody = {};
    const responseHeaders = new Headers();
    const res = {
      setHeader(name, value) { responseHeaders.set(name, value); return this; },
      status(value) { statusCode = value; return this; },
      json(value) { responseBody = value; return this; }
    };
    try {
      await handler(req, res);
    } catch (error) {
      console.error('api_handler_failure', error?.code || 'unknown');
      statusCode = 500;
      responseBody = { error: 'Internal server error' };
    }
    responseHeaders.set('Cache-Control', 'no-store');
    return new Response(JSON.stringify(responseBody), {
      status: statusCode,
      headers: responseHeaders
    });
  }
};
