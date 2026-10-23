import {VERSION} from './core.mjs';
import {PROFILE} from './profile.mjs';
import {validateProfile} from './config.mjs';
import {createFetchAdapter} from './transport.mjs';
const KEY='yuanLedgerCacheLayoutPublic',records=[];
const context=()=>SillyTavern.getContext();
const config=()=>context().extensionSettings[KEY]||{};
const avatar=()=>{const c=context();return c.characters?.[c.characterId]?.avatar||'';};
const selected=()=>config().importedProfile||PROFILE;
const profile=()=>({...selected(),characterAvatar:config().characterAvatar||''});
const enabled=()=>config().enabled===true&&!!config().characterAvatar;
const labels={'fill-signature-changed':'填表任务说明不匹配，原样发送','dossier-missing-or-ambiguous':'台账块缺失或重复，原样发送','dossier-role-or-metadata':'消息属性不匹配，原样发送','table-separator-changed':'表分隔格式变化，原样发送','data-separator-changed':'数据分隔格式变化，原样发送','unexpected-dossier-suffix':'台账末尾有新增内容，原样发送','arranged':'已重排并转交请求','group-not-reviewed':'该分组未适配，原样发送','table-rules-changed':'表规则不匹配，原样发送','table-boundaries-changed':'表结构不匹配，原样发送','table-order-or-name-changed':'表顺序或名称不匹配，原样发送','data-boundary-ambiguous':'数据边界不明确，原样发送','already-arranged':'已处理，不重复重排','complex-request':'特殊请求，原样发送','data-header-changed':'表头不匹配，原样发送'};
function save(patch){context().extensionSettings[KEY]={...config(),...patch};context().saveSettingsDebounced();}
function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function render(){const out=document.getElementById('yuan-ledger-layout-records');if(!out)return;out.textContent=records.slice(-8).reverse().map(r=>`${new Date(r.timestamp).toLocaleTimeString()} ${r.groupName||'分组 '+r.groupId}：${labels[r.reason]||r.reason}\n`+(r.applied?`固定规则 ${r.fixedRuleChars} 字符；对应标记增加 ${r.addedMappingChars} 字符。\n`:'')+(r.dossierPrefixAfter!=null?`台账块相同前缀：${r.dossierPrefixBefore} → ${r.dossierPrefixAfter} 字符（不是 Token）。\n`:'')+(r.usage?`API 实报：输入 ${r.usage.inputTokens}，命中 ${r.usage.cachedTokens}，命中率 ${(100*r.usage.hitRate).toFixed(1)}%。`:`响应状态：${r.status}`)).join('\n\n')||'等待匹配的填表请求。绑定角色、启用适配后才会处理；不会额外调用 AI。';}
function record(row){const i=records.findIndex(r=>r.id===row.id);if(i<0)records.push(row);else records[i]=row;while(records.length>30)records.shift();render();}
function init(){
 const box=document.createElement('div');box.className='yuan-ledger-layout';
 box.innerHTML=`<div class="inline-drawer"><div class="inline-drawer-toggle inline-drawer-header"><b>台账填表缓存适配 ${VERSION}</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content"><p>测试版：在同一条填表消息内，把固定规则集中放前面，已有数据放后面。规则、表头或任务说明不匹配时原样发送。启用后请检查填表结果，不能保证命中率或准确率。</p><p data-profile></p><p data-binding></p><button type="button" class="menu_button" data-bind>绑定当前角色</button><button type="button" class="menu_button" data-unbind>解除绑定</button><label><input type="checkbox" data-enable> 启用适配</label><hr><button type="button" class="menu_button" data-import>导入缓存适配配置</button><button type="button" class="menu_button" data-default>恢复内置适配配置</button><button type="button" class="menu_button" data-profile-export>导出适配配置</button><input type="file" accept=".json,application/json" data-file hidden><p>台账模板请在台账自身的模板导入界面使用；这里仅导入 cache-profile.json。配置切换和重新绑定后默认关闭，确认后再启用。</p><p data-notice role="status"></p><button type="button" class="menu_button" data-export>导出诊断 JSON</button><button type="button" class="menu_button" data-clear>清除本页诊断</button><pre id="yuan-ledger-layout-records"></pre></div></div>`;
 const q=s=>box.querySelector(s),note=s=>{q('[data-notice]').textContent=s;};
 const refresh=()=>{q('[data-profile]').textContent='适配配置：'+selected().name+'；支持 '+selected().groups.map(g=>g.tables.length+' 张表').join(' / ');q('[data-binding]').textContent='绑定角色：'+(config().characterAvatar||'未绑定');q('[data-enable]').checked=enabled();};
 if(window.fetch.__yuanLedgerCacheLayout){document.querySelector('#extensions_settings2')?.append(box);box.querySelectorAll('button,input').forEach(n=>n.disabled=true);note('已存在旧版或另一份台账缓存适配扩展。请禁用重复副本并刷新后使用。');return;}
 q('[data-bind]').addEventListener('click',()=>{const a=avatar();if(!a){note('请先进入一个角色的聊天，再点击绑定。');return;}save({characterAvatar:a,enabled:false});refresh();note('已绑定当前角色，请核对适配配置后手动启用。');});
 q('[data-unbind]').addEventListener('click',()=>{save({characterAvatar:'',enabled:false});refresh();note('已解除绑定。');});
 q('[data-enable]').addEventListener('change',e=>{if(e.target.checked&&!config().characterAvatar){e.target.checked=false;note('请先绑定当前角色。');return;}save({enabled:e.target.checked});note(e.target.checked?'已启用；不匹配的请求仍原样发送。':'已关闭，后续请求恢复原排列。');});
 q('[data-import]').addEventListener('click',()=>q('[data-file]').click());
 q('[data-file]').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>262144)throw Error('适配配置超过 256 KB；请确认没有误选聊天或台账数据');const p=validateProfile(JSON.parse(await f.text()));save({importedProfile:p,enabled:false});refresh();note('配置已导入，请核对后启用。');}catch(err){note('未导入：'+err.message);}finally{e.target.value='';}});
 q('[data-default]').addEventListener('click',()=>{save({importedProfile:null,enabled:false});refresh();note('已恢复内置配置，请核对后启用。');});
 q('[data-profile-export]').addEventListener('click',()=>download('cache-profile.json',validateProfile(selected())));
 q('[data-export]').addEventListener('click',()=>download('台账填表缓存诊断-'+Date.now()+'.json',{version:VERSION,exportedAt:new Date().toISOString(),enabled:enabled(),records,notes:['不含提示词、聊天正文、人物数据、API 密钥或地址。','前缀字符相似度不等于 API 缓存 Token 命中率。']}));
 q('[data-clear]').addEventListener('click',()=>{records.length=0;render();});
 document.querySelector('#extensions_settings2')?.append(box);
 window.fetch=createFetchAdapter(window.fetch,{profile,baseUrl:location.href,report:record,environment:()=>({enabled:enabled(),characterAvatar:avatar(),scope:(context().getCurrentChatId?.()||'')+'|'+selected().name})});refresh();render();
}
jQuery(init);
