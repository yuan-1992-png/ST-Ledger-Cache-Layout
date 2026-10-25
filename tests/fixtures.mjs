import {INTRO} from '../tools/build-profile.mjs';
export const names=['人物信息','联系人','同行者','人物关系','事件记录','能力档案','性格记录','在场人员','健康记录','交流记录'];
export const template={schemaVersion:2,name:'中性十表样例',groups:[{id:1,name:'角色组',frequency:1},{id:2,name:'其他组',frequency:1}],tables:names.map((name,i)=>({tableId:'sheet_test_'+i,name,groupId:1,orderNo:i,note:'只记录明确事实。更新前在本表核对姓名和 row_id。',triggerNotes:{insert:'出现新人物时。',update:'出现明确变化时。'},columns:[{header:'姓名',type:'text'},{header:'状态',type:'text'}],readMode:'all',worldbook:{enabled:false}}))};
export function request(round=0,format='text'){
 const dossier=INTRO+template.tables.map((t,i)=>{
  const name=`表 ${i+1}/10：${t.name}`,state=format==='mvu'?JSON.stringify({stat_data:{world:{time:`10:0${round}`},people:{example:{present:round%2===0,coins:round,skills:['维修','摄影'],memo:'a|b\n第二行 😀'}}}}):'待确认'+round;
  return `──────── ${name} ────────\n\n【表说明】\n${t.note}\n\n【操作规则】\n[增行时机] ${t.triggerNotes.insert}\n[更新时机] ${t.triggerNotes.update}\n\n【已有数据】（列顺序如下；无行=空表）\nrow_id|姓名|状态\n${i+7}|测试人物${i}|${state}\n\n──────── ${name} · 结束 ────────`;
 }).join('\n\n');
 return {model:'deepseek-flash',stream:false,temperature:0.5,messages:[...['填写角色组的十张表','更新前核对目标表姓名与行号','只使用本轮明确事实'].map(content=>({role:'system',content})),{role:'system',content:dossier},{role:'user',content:format==='mvu'?'<UpdateVariable><JSONPatch>[{"op":"replace","path":"/world/time","value":"10:01"}]</JSONPatch></UpdateVariable>':'测试人物在修理自行车。'}]};
}
