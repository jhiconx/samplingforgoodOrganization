// Vercel serverless intake. Never expose Supabase service-role credentials to browsers.
const ids=new Set(['celsius','alani','pibb','mighty','redbull','olipop','claude','dove','bumblebee','martie','poppi','elf','starface']);
const clean=(x,n=200)=>typeof x==='string'?x.trim().slice(0,n):'';
const fail=(res,code,error)=>res.status(code).json({error});
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return fail(res,405,'Method not allowed')}
 if(Number(req.headers['content-length']||0)>16000)return fail(res,413,'Request too large');
 const b=req.body||{},organization=clean(b.organization,160),contactName=clean(b.contactName,120),university=clean(b.university,160),email=clean(b.email,254).toLowerCase(),phone=clean(b.phone,25),notes=clean(b.note,2000),date=clean(b.requestedShippingDate,10),quantity=Number(b.quantityPerBrand),brands=Array.isArray(b.brands)?b.brands:[];
 if(!organization||!contactName||!/^\S+@\S+\.\S+$/.test(email))return fail(res,400,'Organization, contact name and valid email are required');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||date<new Date().toISOString().slice(0,10))return fail(res,400,'Enter a valid future shipping date');
 if(!Number.isInteger(quantity)||quantity<1||quantity>10000||!brands.length||brands.length>13||new Set(brands.map(x=>x?.id)).size!==brands.length||brands.some(x=>!ids.has(x?.id)))return fail(res,400,'Invalid brands or quantity');
 if(phone&&!/^[+()\d\s.-]{7,25}$/.test(phone))return fail(res,400,'Invalid phone number');
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return fail(res,503,'Submission service is not configured');
 const row={organization_name:organization,university,contact_name:contactName,email,phone,requested_shipping_date:date,quantity_per_brand:quantity,notes,sponsor:'Make-A-Wish Foundation',brands:brands.map(x=>({id:x.id,type:x.id==='claude'?'digital':'physical'})),status:'received',email_status:'not_configured'};
 let item;
 try{const response=await fetch(url.replace(/\/$/,'')+'/rest/v1/sampling_requests',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(row)});if(!response.ok)return fail(res,502,'Unable to save request');item=(await response.json())[0]}catch{return fail(res,502,'Submission service unavailable')}
 let emailStatus='not_configured';
 if(process.env.N8N_SFG_WEBHOOK_URL){try{const r=await fetch(process.env.N8N_SFG_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json','x-sfg-secret':process.env.N8N_SFG_SHARED_SECRET||''},body:JSON.stringify({id:item.id,organization,university,contactName,email,phone,requestedShippingDate:date,quantityPerBrand:quantity,brands:row.brands,notes}),signal:AbortSignal.timeout(8000)});emailStatus=r.ok?'queued':'failed'}catch{emailStatus='failed'}
 try{await fetch(url.replace(/\/$/,'')+'/rest/v1/sampling_requests?id=eq.'+encodeURIComponent(item.id),{method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({email_status:emailStatus})})}catch{}}
 return res.status(201).json({id:item.id,status:'received',emailStatus});
};