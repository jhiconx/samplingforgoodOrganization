// Vercel serverless function: Resend transactional email. Requires RESEND_API_KEY and verified SAMPLE_FROM_EMAIL.
// Each warm serverless instance applies a fallback guard. For globally consistent
// limits, configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
const localHits=new Map();
async function submissionAllowed(req){
 const ip=String(req.headers['x-real-ip']||req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||'unknown').slice(0,100);
 const key='sfg:sample:'+ip;
 if(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN){
  const script="local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],60) end;return n";
  const endpoint=process.env.UPSTASH_REDIS_REST_URL.trim();
  let redisUrl;try{redisUrl=new URL(endpoint)}catch{throw new Error('UPSTASH_INVALID_URL')}
  if(redisUrl.protocol!=='https:'||!redisUrl.hostname.endsWith('.upstash.io'))throw new Error('UPSTASH_INVALID_URL');
  let reply;try{reply=await fetch(redisUrl.toString(),{method:'POST',headers:{Authorization:'Bearer '+process.env.UPSTASH_REDIS_REST_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',script,1,key]),signal:AbortSignal.timeout(7000)});}catch(e){const cause=e?.cause?.code||'';if(e?.name==='TimeoutError')throw new Error('UPSTASH_TIMEOUT');if(cause==='ENOTFOUND'||cause==='EAI_AGAIN')throw new Error('UPSTASH_DNS_ERROR');if(cause==='ECONNREFUSED'||cause==='ETIMEDOUT'||cause==='ENETUNREACH')throw new Error('UPSTASH_NETWORK_ERROR');if(String(cause).includes('CERT'))throw new Error('UPSTASH_TLS_ERROR');throw new Error('UPSTASH_FETCH_ERROR')}
  if(!reply.ok)throw new Error('UPSTASH_HTTP_'+reply.status);
  const data=await reply.json();if(data.error)throw new Error('UPSTASH_COMMAND_ERROR');
  return Number(data.result)<=5;
 }
 const now=Date.now();if(localHits.size>2000)for(const [k,v] of localHits)if(v.expires<=now)localHits.delete(k);
 const entry=localHits.get(key);if(!entry||entry.expires<=now){localHits.set(key,{count:1,expires:now+60000});return true}
 entry.count++;return entry.count<=5;
}
const ALLOWED = new Set(['reeds-coffee','revive','brand-request','celsius','alani','pibb','mighty','redbull','olipop','claude','dove','bumblebee','martie','poppi','elf','starface']);
function clean(value,limit=500){return String(value??'').trim().slice(0,limit)}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function validPhone(v){const digits=v.replace(/\D/g,'');return digits.length>=7&&digits.length<=15}

async function supabaseRest(dbUrl,dbKey,resource,options={}){
 const target=new URL('/rest/v1/'+resource,dbUrl);
 if(target.protocol!=='https:')throw new Error('Bad database URL');
 return fetch(target,{...options,headers:{apikey:dbKey,Authorization:'Bearer '+dbKey,'Content-Type':'application/json',...(options.headers||{})},signal:AbortSignal.timeout(8000)});
}
async function notifySelectedBrands({dbUrl,dbKey,requestId,brands,organization,university,totalMembers,charity}){
 if(!dbUrl||!dbKey||!requestId)return;
 const ids=brands.filter(b=>b.id!=='brand-request').map(b=>b.id);
 if(!ids.length)return;
 const query='sfg_brand_contacts?select=brand_id,brand_name,notification_email,email_enabled,approved_for_outreach&brand_id=in.('+ids.map(encodeURIComponent).join(',')+')';
 const contactsResponse=await supabaseRest(dbUrl,dbKey,query);
 if(!contactsResponse.ok)throw new Error('Brand directory unavailable');
 const contacts=await contactsResponse.json();
 const byId=new Map(contacts.map(c=>[c.brand_id,c]));
 for(const brand of brands){
  if(brand.id==='brand-request')continue; // Unlisted brands have no approved recipient.
  const contact=byId.get(brand.id);
  if(!contact?.approved_for_outreach||!contact.email_enabled||!validEmail(contact.notification_email||''))continue;
  const record={request_id:requestId,brand_id:brand.id,brand_name:contact.brand_name||brand.name,channel:'email',state:'pending'};
  const inserted=await supabaseRest(dbUrl,dbKey,'sfg_brand_notifications?on_conflict=request_id,brand_id,channel',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(record)});
  if(!inserted.ok)throw new Error('Notification log write failed');
  const fresh=await inserted.json();
  if(!fresh.length)continue; // Idempotent: already sent or attempted.
  const notificationId=fresh[0].id;
  const safe=v=>String(v||'Not specified').replace(/[\r\n]+/g,' ').slice(0,180);
  const message='Hello, '+safe(organization)+' from '+safe(university)+' with a membership of '+(totalMembers??'not specified')+' wants to run a Sample For Good program with their non-profit partner '+safe(charity)+'. Please reach out to Reed Cramer at rcramer@iconx.io for next steps.';
  let state='failed',providerId=null,errorCode=null;
  try{
   const emailResult=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.SAMPLE_FROM_EMAIL,to:[contact.notification_email],subject:'Sample For Good program request — '+safe(contact.brand_name||brand.name),text:message})});
   if(emailResult.ok){state='sent';const data=await emailResult.json();providerId=data.id||null}
   else errorCode='RESEND_'+emailResult.status;
  }catch{errorCode='SEND_EXCEPTION'}
  const update=await supabaseRest(dbUrl,dbKey,'sfg_brand_notifications?id=eq.'+notificationId,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({state,provider_id:providerId,error_code:errorCode,sent_at:state==='sent'?new Date().toISOString():null})});
  if(!update.ok)console.error('Brand notification audit update failed');
 }
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 if(!process.env.RESEND_API_KEY||!process.env.SAMPLE_FROM_EMAIL)return res.status(503).json({error:'Email service not configured'}); 
 try{if(!await submissionAllowed(req)){res.setHeader('Retry-After','60');return res.status(429).json({error:'Too many requests. Please wait a minute and try again.'})}}catch(error){const code=/^UPSTASH_(?:HTTP_[0-9]{3}|COMMAND_ERROR|INVALID_URL|TIMEOUT|DNS_ERROR|NETWORK_ERROR|TLS_ERROR|FETCH_ERROR)$/.test(error?.message||'')?error.message:'UPSTASH_CONNECTION_ERROR';console.error('Rate limit check failed:',code);return res.status(503).json({error:'Rate limiting service unavailable',code})}
 try{
  const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});if(raw.length>12000)return res.status(413).json({error:'Request too large'});const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const phone=clean(body.phone,40),email=clean(body.email,254),charity=clean(body.charity,160),note=clean(body.note,3000);
  const organization=clean(body.organization,180),university=clean(body.university,180),contactName=clean(body.contactName,180);
  const brands=Array.isArray(body.brands)?body.brands.filter(b=>b&&ALLOWED.has(b.id)).slice(0,15):[];
  if(brands.some(b=>b.id==='brand-request'&&(!clean(b.name,120)||clean(b.name,120)==='Brand Request')))return res.status(400).json({error:'Requested brand name required'});
  const totalMembers=body.totalMembers===null||body.totalMembers===undefined||body.totalMembers===''?null:Number(body.totalMembers);
  if(organization.length<2||!brands.length||!(validEmail(email)||validPhone(phone))||(email&&!validEmail(email))||(phone&&!validPhone(phone))||(totalMembers!==null&&(!Number.isInteger(totalMembers)||totalMembers<1||totalMembers>100000)))return res.status(400).json({error:'Invalid request'});

  // Persist validated requests in Supabase when credentials are configured.
  // Service-role credentials remain exclusively in the server environment.
  let requestId=null;
  const dbUrl=process.env.SUPABASE_URL,dbKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(dbUrl&&dbKey){
   let endpoint;
   try{endpoint=new URL('/rest/v1/sfg_distribution_requests',dbUrl);if(endpoint.protocol!=='https:')throw new Error('invalid protocol')}catch{return res.status(503).json({error:'Database configuration invalid'})}
   let save;
   try{save=await fetch(endpoint,{method:'POST',headers:{apikey:dbKey,Authorization:'Bearer '+dbKey,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({organization_name:organization,university,contact_name:contactName,email,phone,brands:brands.map(b=>({id:b.id,name:clean(b.name,120)})),total_members:totalMembers,charity_name:charity||'Make-A-Wish Foundation',notes:note,status:'received'}) ,signal:AbortSignal.timeout(8000)})}catch{console.error('Supabase request write connection failed');return res.status(503).json({error:'Request storage unavailable'})}
   if(!save.ok){console.error('Supabase request write rejected',save.status);return res.status(503).json({error:'Request storage unavailable'})}
   const rows=await save.json();requestId=rows?.[0]?.id||null;
  }
  const lines=['New Sampling For Good request','',...brands.map(b=>(b.id==='brand-request'?'Requested brand: ':'Brand: ')+clean(b.name,120)),'','Organization: '+organization,'University: '+(university||'Not specified'),'Contact: '+(contactName||'Not specified'),'Total members: '+(totalMembers??'Not specified'),'Charity: '+(charity||'Not specified'),'Phone: '+(phone||'Not provided'),'Email: '+(email||'Not provided'),'','Sample instructions:',note||'None supplied'];
  const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.SAMPLE_FROM_EMAIL,to:['samples@iconx.io'],subject:'New Sampling For Good sample request',text:lines.join('\n'),...(email?{reply_to:email}:{})})});
  if(!result.ok){console.error('Sample mail provider rejected request',result.status);return res.status(502).json({error:'Email could not be sent'})}
  try{await notifySelectedBrands({dbUrl,dbKey,requestId,brands,organization,university,totalMembers,charity:charity||'Make-A-Wish Foundation'})}catch(error){console.error('Brand notification processing failed:',error?.message)}
  return res.status(200).json({ok:true,requestId,stored:!!requestId});
 }catch(error){console.error('Sample request email failure',error?.message);return res.status(500).json({error:'Email could not be sent'})}
}
