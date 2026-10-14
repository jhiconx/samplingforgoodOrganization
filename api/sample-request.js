// Vercel serverless function: Resend transactional email. Requires RESEND_API_KEY and verified SAMPLE_FROM_EMAIL.
// Each warm serverless instance applies a fallback guard. For globally consistent
// limits, configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
const localHits=new Map();
async function submissionAllowed(req){
 const ip=String(req.headers['x-real-ip']||req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||'unknown').slice(0,100);
 const key='sfg:sample:'+ip;
 if(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN){
  const script="local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],60) end;return n";
  const reply=await fetch(process.env.UPSTASH_REDIS_REST_URL+'/eval',{method:'POST',headers:{Authorization:'Bearer '+process.env.UPSTASH_REDIS_REST_TOKEN,'Content-Type':'application/json'},body:JSON.stringify([script,1,key])});
  if(!reply.ok)throw new Error('Rate limit datastore unavailable');
  const data=await reply.json();if(data.error)throw new Error('Rate limit datastore error');
  return Number(data.result)<=5;
 }
 const now=Date.now();if(localHits.size>2000)for(const [k,v] of localHits)if(v.expires<=now)localHits.delete(k);
 const entry=localHits.get(key);if(!entry||entry.expires<=now){localHits.set(key,{count:1,expires:now+60000});return true}
 entry.count++;return entry.count<=5;
}
const ALLOWED = new Set(['celsius','alani','pibb','mighty','redbull','olipop','claude','dove','bumblebee','martie','poppi','elf','starface']);
function clean(value,limit=500){return String(value??'').trim().slice(0,limit)}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function validPhone(v){const digits=v.replace(/\D/g,'');return digits.length>=7&&digits.length<=15}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 if(!process.env.RESEND_API_KEY||!process.env.SAMPLE_FROM_EMAIL)return res.status(503).json({error:'Email service not configured'});\n try{if(!await submissionAllowed(req)){res.setHeader('Retry-After','60');return res.status(429).json({error:'Too many requests. Please wait a minute and try again.'})}}catch{return res.status(503).json({error:'Please try again shortly.'})}
 try{
  const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});if(raw.length>12000)return res.status(413).json({error:'Request too large'});const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const phone=clean(body.phone,40),email=clean(body.email,254),charity=clean(body.charity,160),note=clean(body.note,3000);
  const brands=Array.isArray(body.brands)?body.brands.filter(b=>b&&ALLOWED.has(b.id)).slice(0,13):[];
  const quantity=body.quantity===null||body.quantity===''?null:Number(body.quantity);
  const date=clean(body.date,20);
  if(!brands.length||!(validEmail(email)||validPhone(phone))||(email&&!validEmail(email))||(phone&&!validPhone(phone))||(quantity!==null&&(!Number.isInteger(quantity)||quantity<1||quantity>10000))||(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)))return res.status(400).json({error:'Invalid request'});
  const lines=['New Sampling For Good request','',...brands.map(b=>'Brand: '+clean(b.name,100)),'','Requested shipping date: '+(date||'Not specified'),'Samples per brand: '+(quantity??'Not specified'),'Charity: '+(charity||'Not specified'),'Phone: '+(phone||'Not provided'),'Email: '+(email||'Not provided'),'','Sample instructions:',note||'None supplied'];
  const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.SAMPLE_FROM_EMAIL,to:['samples@iconx.io'],subject:'New Sampling For Good sample request',text:lines.join('\n'),...(email?{reply_to:email}:{})})});
  if(!result.ok){console.error('Sample mail provider rejected request',result.status);return res.status(502).json({error:'Email could not be sent'})}
  return res.status(200).json({ok:true});
 }catch(error){console.error('Sample request email failure',error?.message);return res.status(500).json({error:'Email could not be sent'})}
}
