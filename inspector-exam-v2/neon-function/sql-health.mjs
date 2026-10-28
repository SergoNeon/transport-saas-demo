import { Pool } from "pg";
const pool = new Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:8000});
pool.on('error',()=>{});
export default {async fetch(request){
 if(new URL(request.url).pathname!=="/health"&&new URL(request.url).pathname!=="/")return new Response("Not found",{status:404});
 try{const result=await pool.query("SELECT count(*)::integer AS total FROM exam_question_bank");return Response.json({ok:true,questions:result.rows[0].total,sharedStorage:true},{headers:{"Cache-Control":"no-store"}})}
 catch(err){console.error("health_failed",err?.code||"error");return Response.json({ok:false},{status:503})}
}};
