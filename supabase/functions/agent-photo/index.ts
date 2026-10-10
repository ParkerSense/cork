import jpeg from 'npm:jpeg-js@0.4.4';
const headers={'Access-Control-Allow-Origin':'https://parkersense.github.io','Access-Control-Allow-Headers':'content-type, apikey, authorization','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const answer=(s:number,message:string)=>new Response(JSON.stringify({message}),{status:s,headers});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('',{headers});
 if(req.method!=='POST')return answer(405,'POST only');
 let db:any,path='',claim='',key='',finishAttempted=false,finishRejected=false;
 try {
  const raw=await req.text();if(raw.length>2900000)return answer(413,'Photo too large');
  const d=JSON.parse(raw);key=String(d.key||'');
  if(key.length<32||key.length>256||typeof d.jpeg!=='string'||d.jpeg.length>2796204)return answer(400,'Invalid upload');
  const bytes=Uint8Array.from(atob(d.jpeg),c=>c.charCodeAt(0));
  if(bytes.length>2097152||bytes[0]!==255||bytes[1]!==216)return answer(400,'JPEG required, up to 2 MB');
  // Decode and re-encode, not just trust MIME: removes all EXIF, GPS, comments and other metadata.
  const decoded=jpeg.decode(bytes,{useTArray:true,maxResolutionInMP:4,maxMemoryUsageInMB:64,tolerantDecoding:false});
  if(!decoded.width||!decoded.height||decoded.width>2000||decoded.height>2000)return answer(400,'Resize photo to 2000 pixels or less');
  const clean=jpeg.encode(decoded,82).data;
  if(clean.length>2097152)return answer(413,'Prepared photo too large');
  const base=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const request=async(route:string,body:any,type='application/json',method='POST')=>{const response=await fetch(base+route,{method,headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':type},body:type==='application/json'?JSON.stringify(body):body});const text=await response.text();const data=text?JSON.parse(text):null;return {data:response.ok?data:null,error:response.ok?null:true};};
  db={rpc:(name:string,args:any)=>request('/rest/v1/rpc/'+name,args),storage:{from:()=>({upload:(path:string,data:any)=>request('/storage/v1/object/wine-photos/'+path,data,'image/jpeg'),remove:(paths:string[])=>request('/storage/v1/object/wine-photos',{prefixes:paths},'application/json','DELETE')})}};
  const r=await db.rpc('agent_photo_reserve',{p_key:key,p_producer:String(d.producer||'').slice(0,120),p_name:String(d.name||'').slice(0,160),p_vintage:d.vintage==null?null:Number(d.vintage)});
  if(r.error||!r.data?.[0])return answer(403,'Not allowed or target unavailable');
  path=r.data[0].object_path;claim=r.data[0].claim;
  const up=await db.storage.from('wine-photos').upload(path,clean,{contentType:'image/jpeg',upsert:false});
  if(up.error)throw new Error('upload');
  finishAttempted=true;
  const f=await db.rpc('agent_photo_finish',{p_key:key,p_claim:claim});
  if(f.error){finishRejected=true;throw new Error('attach');}
  return answer(200,'Photo attached.');
 }catch{if(db&&path&&(!finishAttempted||finishRejected))await db.storage.from('wine-photos').remove([path]);return answer(finishAttempted&&!finishRejected?503:400,finishAttempted&&!finishRejected?'Attachment status uncertain. Check collection before retrying.':'Not attached. Check key, exact bottle details and JPEG size.');}
});
