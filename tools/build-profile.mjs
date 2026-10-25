import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fingerprint,splitDossier,plan} from '../core.mjs';
import {validateProfile} from '../config.mjs';

export const INTRO='【当前台账】\n下面为本轮需要填的表及已有内容：每张表由一行「表 N/M：表名」分隔线框出，只允许填写这里列出的表。\n\n';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function compileTemplate(template,groupId=1){
 check(template?.schemaVersion===2&&Array.isArray(template.tables),'需要台账原生 schemaVersion=2 模板');
 const group=template.groups?.find(g=>g.id===groupId);
 check(group&&Number(group.frequency)>0,'所选分组不存在或已停用');
 const tables=template.tables.filter(t=>t.groupId===groupId).sort((a,b)=>a.orderNo-b.orderNo);
 check(tables.length===10,'所选分组必须恰好包含 10 张表');
 const ids=new Set(),names=new Set(),orders=new Set();
 return {id:groupId,name:group.name||'十表分组',intro:INTRO,tables:tables.map((t,i)=>{
  check(typeof t.tableId==='string'&&t.tableId&&!ids.has(t.tableId),'表 ID 缺失或重复');ids.add(t.tableId);
  check(typeof t.name==='string'&&t.name.trim()&&!/[\r\n]/.test(t.name)&&!names.has(t.name),'表名缺失或重复');names.add(t.name);
  check(Number.isSafeInteger(t.orderNo)&&!orders.has(t.orderNo),'表顺序不明确');orders.add(t.orderNo);
  check(t.lensForm!=='summary','此版本不审核纪要表分组');
  check(Array.isArray(t.columns)&&t.columns.length>0,'缺少列定义');
  const headers=['row_id',...t.columns.map(c=>c.header)];
  check(headers.every(h=>typeof h==='string'&&h&&!/[|\r\n]/.test(h))&&new Set(headers).size===headers.length,'列名无效或重复');
  const pieces=[`──────── 表 ${i+1}/10：${t.name} ────────`];
  if(t.note)pieces.push('【表说明】\n'+t.note);
  const rules=[['insert','增行时机'],['update','更新时机'],['delete','删行时机']].filter(([k])=>t.triggerNotes?.[k]).map(([k,label])=>`[${label}] ${t.triggerNotes[k]}`);
  if(rules.length)pieces.push('【操作规则】\n'+rules.join('\n'));
  const head=pieces.join('\n\n')+'\n\n';
  check(!/\{\{|<%|^【已有数据】/m.test(head),'固定规则含动态宏或数据标记，需单独审核');
  return {name:t.name,headers:headers.join('|'),ruleHash:fingerprint(head),ruleChars:head.length};
 })};
}
export function buildProfile(template,samples,{groupId=1,name='通用十表 · 本地核对配置'}={}){
 check(Array.isArray(samples)&&samples.length>=2,'需要至少两份请求样例核对固定规则');
 const group=compileTemplate(template,groupId);let signature=null,previous=null,dataDiffers=false;
 for(const input of samples){
  const body=input?.generate||input;
  check(Array.isArray(body?.messages)&&body.messages.length>=4,'缺少 messages');
  const sig=body.messages.slice(0,3).map((m,index)=>{check(m.role==='system'&&typeof m.content==='string'&&m.content.trim(),'前三条任务消息必须是 system 文本');return {index,role:'system',hash:fingerprint(m.content)};});
  check(!signature||JSON.stringify(signature)===JSON.stringify(sig),'样例的任务签名不一致');signature=sig;
  const targets=body.messages.map((m,index)=>({m,index})).filter(({m})=>typeof m.content==='string'&&m.content.startsWith(INTRO));
  check(targets.length===1&&targets[0].index>=3&&targets[0].m.role==='system','需要唯一的独立 system 台账消息');
  const text=targets[0].m.content,parsed=splitDossier(text,group);
  check(parsed.ok,'模板与请求不一致：'+parsed.reason);
  if(previous!==null&&text!==previous)dataDiffers=true;previous=text;
  const profile={version:1,name,characterAvatar:'offline',groups:[{...group,signature}],skippedGroups:[]};
  check(plan(body,profile,{enabled:true,characterAvatar:'offline'}).ok,'请求包含不支持的协议、模型或消息属性');
 }
 check(dataDiffers,'请使用已有数据不同的两轮样例；重复请求不能验证跨轮结构');
 return validateProfile({version:1,name,ledgerVersion:'native-v2 request layout',groups:[{...group,signature}],skippedGroups:[]});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [templatePath,firstPath,secondPath,output,group='1']=process.argv.slice(2);
  check(templatePath&&firstPath&&secondPath&&output,'用法：node tools/build-profile.mjs 模板.json 请求1.json 请求2.json 输出配置.json [分组编号]');
  const inputs=[templatePath,firstPath,secondPath];check(!inputs.some(p=>path.resolve(p)===path.resolve(output)),'输出不可覆盖输入');
  const values=inputs.map(p=>{check(fs.statSync(p).size<=4194304,'输入文件超过 4 MB');return JSON.parse(fs.readFileSync(p,'utf8'));});
  const result=buildProfile(values[0],values.slice(1),{groupId:Number(group)});
  fs.writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx'});
  console.log('已输出结构与哈希配置；没有请求 AI、修改模板或安装到酒馆。');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
