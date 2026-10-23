import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PROFILE} from '../profile.mjs';
import {splitDossier,fingerprint,plan} from '../core.mjs';
import {validateProfile} from '../config.mjs';
export function calibrate(input){
 const body=input?.generate||input;
 if(!Array.isArray(body?.messages)||body.messages.length<4)throw Error('未找到有效的 messages');
 const group=PROFILE.groups[0],matches=body.messages.map((m,index)=>({m,index})).filter(({m})=>typeof m.content==='string'&&m.content.startsWith(group.intro));
 if(matches.length!==1||matches[0].index<3||matches[0].m.role!=='system')throw Error('需要唯一、位于前三条任务消息之后的 system 台账块');
 const parsed=splitDossier(matches[0].m.content,group);if(!parsed.ok)throw Error('角色组结构校验未通过：'+parsed.reason);
 const profile=validateProfile(PROFILE);profile.name='角色组10表 · 本地任务签名';profile.skippedGroups=[];
 profile.groups[0].signature=body.messages.slice(0,3).map((m,index)=>{if(m.role!=='system'||typeof m.content!=='string'||!m.content.trim())throw Error('前三条消息必须是非空 system 文本');return{index,role:'system',hash:fingerprint(m.content)};});
 const result=plan(body,{...profile,characterAvatar:'offline'},{enabled:true,characterAvatar:'offline'});if(!result.ok)throw Error('请求兼容校验未通过：'+result.reason);
 return profile;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('用法：node tools/calibrate.mjs 输入请求.json 输出配置.json');if(path.resolve(input)===path.resolve(output))throw Error('输出不能覆盖输入');if(fs.statSync(input).size>4194304)throw Error('请求文件超过 4 MB');const profile=calibrate(JSON.parse(fs.readFileSync(input,'utf8')));fs.writeFileSync(output,JSON.stringify(profile,null,2),{flag:'wx'});console.log('已生成适配配置，未发送网络请求。');}catch(e){console.error(e.message);process.exitCode=1;}
}
