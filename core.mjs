export const VERSION='0.2.1';
export const MARKER='【台账请求分区 v1】';
const FIXED=MARKER+'\n【固定表规则区】以下各表的已有数据见后方同名、同编号的数据区；此处不列数据不表示空表。\n\n';
const DATA='\n【对应已有数据区】按表名及编号对应前方规则；保留原 row_id，空表及未提供数据的说明以各表原文为准。\n\n';
export function fingerprint(text){let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}return `${(a>>>0).toString(16)}:${(b>>>0).toString(16)}`;}
export function commonPrefix(a,b){let i=0;while(i<Math.min(a.length,b.length)&&a[i]===b[i])i++;return i;}
const fail=reason=>({ok:false,reason});
export function splitDossier(text,group){
 if(typeof text!=='string'||text.length>1500000)return fail('size-or-type');
 if(text.includes(MARKER))return fail('already-arranged');
 if(!text.startsWith(group.intro))return fail('intro-changed');
 const matches=[...text.matchAll(/^──────── 表 (\d+)\/(\d+)：([^\r\n]+) ────────$/gm)];
 if(matches.length!==group.tables.length*2)return fail('table-boundaries-changed');
 let cursor=group.intro.length;const parts=[];
 for(let i=0;i<group.tables.length;i++){
  const schema=group.tables[i],start=matches[i*2],end=matches[i*2+1];
  if(start.index!==cursor||Number(start[1])!==i+1||Number(start[2])!==group.tables.length||start[3]!==schema.name||end[1]!==start[1]||end[2]!==start[2]||end[3]!==schema.name+' · 结束')return fail('table-order-or-name-changed');
  const block=text.slice(start.index,end.index+end[0].length);
  const markers=[...block.matchAll(/^【已有数据】/gm)];
  if(markers.length!==1)return fail('data-boundary-ambiguous');
  const at=markers[0].index,head=block.slice(0,at),data=block.slice(at,block.length-end[0].length),tail=end[0];
  if(fingerprint(head)!==schema.ruleHash||head.length!==schema.ruleChars)return {...fail('table-rules-changed'),table:schema.name,actualRuleChars:head.length,expectedRuleChars:schema.ruleChars};
  if(!data.endsWith('\n\n'))return fail('data-separator-changed');
  const raw=data.slice(0,-2);
  if(raw!=='【已有数据】空'&&raw!=='【已有数据】纪要表无需参考已有数据'&&!raw.startsWith('【已有数据】（列顺序如下；无行=空表）\n'+schema.headers+'\n')&&raw!=='【已有数据】（列顺序如下；无行=空表）\n'+schema.headers)return fail('data-header-changed');
  const following=i===group.tables.length-1?'':'\n\n';
  cursor=end.index+end[0].length;
  if(text.slice(cursor,cursor+following.length)!==following)return fail('table-separator-changed');
  cursor+=following.length;parts.push({name:schema.name,index:i+1,head,data,tail,following});
 }
 if(cursor!==text.length)return fail('unexpected-dossier-suffix');
 if(group.intro+parts.map(p=>p.head+p.data+p.tail+p.following).join('')!==text)return fail('source-integrity');
 return {ok:true,parts};
}
export function arrangeDossier(text,group){
 const parsed=splitDossier(text,group);if(!parsed.ok)return parsed;
 const {parts}=parsed;
 const pieces=[group.intro,FIXED,...parts.flatMap(p=>[p.head,p.tail,p.following]),DATA,...parts.flatMap(p=>[`【表 ${p.index}/${parts.length}：${p.name} · 对应已有数据】\n`,p.data])];
 const result=pieces.join('');
 const originalChars=group.intro.length+parts.reduce((n,p)=>n+p.head.length+p.data.length+p.tail.length+p.following.length,0);
 if(originalChars!==text.length)return fail('source-integrity');
 return {ok:true,text:result,tableCount:parts.length,originalChars,addedChars:result.length-text.length,fixedChars:parts.reduce((n,p)=>n+p.head.length+p.tail.length+p.following.length,0),parts};
}
export function plan(body,profile,environment={}){
 if(!environment.enabled)return fail('disabled');
 if(environment.characterAvatar!==profile.characterAvatar)return fail('other-character');
 if(!/deepseek/i.test(body?.model||''))return fail('other-model');
 const messages=body?.messages;
 if(!Array.isArray(messages))return fail('not-messages');
 const group=profile.groups.find(g=>g.signature.every(s=>messages[s.index]?.role===s.role&&typeof messages[s.index]?.content==='string'&&fingerprint(messages[s.index].content)===s.hash));
 if(!group){const skipped=profile.skippedGroups?.find(g=>g.signature.every(s=>messages[s.index]?.role===s.role&&typeof messages[s.index]?.content==='string'&&fingerprint(messages[s.index].content)===s.hash));if(skipped)return {...fail('group-not-reviewed'),groupId:skipped.id};return messages.some(m=>m.role==='system'&&typeof m.content==='string'&&m.content.startsWith('【当前台账】'))?{...fail('fill-signature-changed'),groupId:'未识别'}:fail('not-reviewed-fill');}
 const reject=reason=>({...fail(reason),groupId:group.id});
 if(body.tools?.length||body.functions?.length||body.tool_choice||messages.some(m=>typeof m.content!=='string'||!['system','user','assistant'].includes(m.role)||m.tool_calls||m.tool_call_id))return reject('complex-request');
 const matches=messages.flatMap((m,i)=>m.content.startsWith(group.intro)||m.content.includes(MARKER)?[i]:[]);
 if(matches.length!==1)return reject('dossier-missing-or-ambiguous');
 const index=matches[0],m=messages[index];
 if(m.role!=='system'||Object.keys(m).some(k=>!['role','content'].includes(k)))return reject('dossier-role-or-metadata');
 const result=arrangeDossier(m.content,group);if(!result.ok)return reject(result.reason);
 const next=messages.slice();next[index]={...m,content:result.text};
 return {...result,messages:next,index,groupId:group.id,groupName:group.name,reason:'arranged'};
}
export function transformEnvelope(path,envelope,profile,environment){
 const body=path==='/api/backends/chat-completions/generate'?envelope:path==='/api/plugins/baibaoku/v1/chats/save-generate'?envelope?.generate:null;
 if(!body)return fail('not-target');
 const result=plan(body,profile,environment);if(!result.ok)return result;
 const changed={...body,messages:result.messages};
 return {...result,envelope:path==='/api/backends/chat-completions/generate'?changed:{...envelope,generate:changed}};
}
export function normalizeUsage(u){
 const input=Number(u?.prompt_tokens??u?.input_tokens),hit=Number(u?.prompt_cache_hit_tokens??u?.cache_hit_tokens??u?.prompt_tokens_details?.cached_tokens??u?.input_tokens_details?.cached_tokens);
 if(!Number.isFinite(input)||input<=0||!Number.isFinite(hit)||hit<0||hit>input)return null;
 return {inputTokens:input,cachedTokens:hit,uncachedTokens:input-hit,hitRate:hit/input};
}
