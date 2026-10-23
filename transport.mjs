import {transformEnvelope,commonPrefix,normalizeUsage,fingerprint} from './core.mjs';
const PATHS=new Set(['/api/backends/chat-completions/generate','/api/plugins/baibaoku/v1/chats/save-generate']);
async function usage(response,row,report){
 try{
  row.httpStatus=response.status;if(!response.ok){row.status='http-error';report(row);return;}
  const reader=response.clone().body?.getReader();if(!reader){row.status='usage-unavailable';report(row);return;}
  const decoder=new TextDecoder();let bytes=0,pending='',raw='',found=null;
  const streaming=(response.headers.get('content-type')||'').includes('text/event-stream');
  const accept=line=>{if(!line.startsWith('data:'))return;try{const j=JSON.parse(line.slice(5).trim());found=normalizeUsage(j.usage??j.data?.usage??j.response?.usage)||found;}catch{}};
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>4194304){void reader.cancel().catch(()=>{});break;}const text=decoder.decode(value,{stream:true});if(streaming){pending+=text;const lines=pending.split(/\r?\n/);pending=lines.pop();lines.forEach(accept);}else raw+=text;}
   if(streaming)accept(pending+decoder.decode());else try{const j=JSON.parse(raw+decoder.decode());found=normalizeUsage(j.usage??j.data?.usage??j.response?.usage);}catch{}
  }finally{reader.releaseLock();}
  row.usage=found;row.status=found?'usage-received':'usage-unavailable';report(row);
 }catch{row.status='usage-unavailable';report(row);}
}
export function createFetchAdapter(original,{profile,environment,report,baseUrl}){
 const previous=new Map();let serial=0;
 const safeReport=row=>{try{report(row);}catch{}};
 function wrapped(input,init){
  let args=arguments,row=null;
  try{
   const url=new URL(typeof input==='string'||input instanceof URL?String(input):input?.url,baseUrl);
   if(url.origin===new URL(baseUrl).origin&&PATHS.has(url.pathname)&&String(init?.method||input?.method||'GET').toUpperCase()==='POST'&&typeof init?.body==='string'&&init.body.length<=4194304){
    const env=environment();
    if(env.enabled){
     const envelope=JSON.parse(init.body),result=transformEnvelope(url.pathname,envelope,typeof profile==='function'?profile():profile,env);
     if(result.groupId!==undefined){
      row={id:`${Date.now()}-${++serial}`,timestamp:Date.now(),version:'0.2.0',groupId:result.groupId,applied:result.ok,reason:result.reason,status:result.ok?'sent':'unchanged',usage:null};
      if(result.ok){
       const body=url.pathname.includes('save-generate')?envelope.generate:envelope;
       const oldText=body.messages[result.index].content,key=fingerprint(String(env.scope||''))+':'+result.groupId;
       const prev=previous.get(key),text=JSON.stringify(result.envelope);
       // Change one JSON body only. Preserve request method, headers, abort signal, credentials and all other fields.
       args=[input,{...init,body:text}];
       Object.assign(row,{groupName:result.groupName,model:body.model,tableCount:result.tableCount,originalChars:result.originalChars,addedMappingChars:result.addedChars,fixedRuleChars:result.fixedChars,browserForwarded:true,
        dossierPrefixBefore:prev?commonPrefix(prev.before,oldText):null,dossierPrefixAfter:prev?commonPrefix(prev.after,result.text):null,prefixUnit:'UTF-16 characters inside the dossier only; not API cache tokens'});
       previous.set(key,{before:oldText,after:result.text});while(previous.size>4)previous.delete(previous.keys().next().value);
      }
      safeReport(row);
     }
    }
   }
  }catch{row=null;args=arguments;}
  const pending=Reflect.apply(original,this,args);
  if(row)Promise.resolve(pending).then(response=>usage(response,row,safeReport),()=>{row.status='network-error';safeReport(row);});
  return pending;
 }
 wrapped.__yuanLedgerCacheLayout=true;
 return wrapped;
}
