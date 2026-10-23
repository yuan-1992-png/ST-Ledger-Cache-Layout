// Import only the reviewed matcher schema; never accept executable code or task data.
export function validateProfile(input){
 const check=(ok,msg)=>{if(!ok)throw new Error(msg);};
 const str=(v,max=1000)=>typeof v==='string'&&v.length>0&&v.length<=max;
 const hash=v=>typeof v==='string'&&/^[0-9a-f]{1,8}:[0-9a-f]{1,8}$/.test(v);
 check(input&&input.version===1,'仅支持 version=1 的缓存适配配置');
 check(Array.isArray(input.groups)&&input.groups.length>0&&input.groups.length<=20,'适配分组为空或过多');
 const signature=a=>{check(Array.isArray(a)&&a.length===3,'必须保留三条填表任务签名');return a.map((s,i)=>{check(s?.index===i&&s.role==='system'&&hash(s.hash),'填表任务签名无效');return{index:i,role:'system',hash:s.hash};});};
 const ids=new Set();const groups=input.groups.map(g=>{
  check(Number.isSafeInteger(g.id)&&g.id>0&&!ids.has(g.id),'分组编号无效或重复');ids.add(g.id);
  check(str(g.name,80)&&str(g.intro,4000)&&g.intro.startsWith('【当前台账】'),'分组名称或台账开头无效');
  check(Array.isArray(g.tables)&&g.tables.length>0&&g.tables.length<=100,'表数量无效');const names=new Set();
  const tables=g.tables.map(t=>{check(str(t.name,100)&&!/[\r\n]/.test(t.name)&&!names.has(t.name),'表名无效或重复');names.add(t.name);check(str(t.headers,8000)&&!/[\r\n]/.test(t.headers)&&hash(t.ruleHash)&&Number.isSafeInteger(t.ruleChars)&&t.ruleChars>0&&t.ruleChars<=1500000,'表头或规则校验值无效');return{name:t.name,headers:t.headers,ruleHash:t.ruleHash,ruleChars:t.ruleChars};});
  return{id:g.id,name:g.name,intro:g.intro,signature:signature(g.signature),tables};
 });
 check(input.skippedGroups===undefined||Array.isArray(input.skippedGroups)&&input.skippedGroups.length<=20,'跳过分组无效');
 const skippedGroups=(input.skippedGroups||[]).map(g=>{check(Number.isSafeInteger(g.id)&&g.id>0&&!ids.has(g.id),'跳过分组编号无效');ids.add(g.id);return{id:g.id,name:str(g.name,80)?g.name:'未适配分组',signature:signature(g.signature),reason:'not-reviewed'};});
 return{version:1,characterAvatar:'',name:str(input.name,100)?input.name:'导入配置',ledgerVersion:typeof input.ledgerVersion==='string'?input.ledgerVersion.slice(0,100):'',groups,skippedGroups};
}
