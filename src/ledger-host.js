'use strict';
// MIT. Ledger host adapter by yuan-1992-png; upstream interfaces remain unmodified.
function createLedgerHost(ledger, getContext) {
    const face = ledger?.__legacyFace;
    if (!face || !ledger.runtime || !face.__sese_ledger__) throw new Error('需要瑟瑟台账兼容接口');
    const clone = x => JSON.parse(JSON.stringify(x));
    let cacheText = '', cacheValue = null, queue = Promise.resolve();
    const keys = x => Object.keys(x || {}).filter(k => k.startsWith('sheet_'));
    const context = () => { const c = getContext(); return { chat: c.chat, key: c.chatId ?? c.getCurrentChatId?.() ?? c.characters?.[c.characterId]?.chat, avatar: c.characters?.[c.characterId]?.avatar, book: ledger.runtime.book(), storage: ledger.runtime.storageId() }; };
    function ready() {
        const recovery=ledger.recovery?.status?.();
        if (!ledger.runtime.isReady() || !ledger.runtime.book() || recovery?.needed || recovery?.required) throw new Error('台账仍在加载或等待恢复，拒绝读写');
        const c = getContext();
        if (!Array.isArray(c.chat) || !c.chat.length) throw new Error('当前聊天尚未就绪');
        const owner=ledger.runtime.owner?.(), current=context();
        if(owner?.chatKey && owner.chatKey!==current.key)throw new Error('台账仍属于上一聊天，等待加载完成');
        if(owner?.kind==='character' && current.avatar && owner.ownerKey!==current.avatar)throw new Error('台账角色归属尚未同步');
    }
    function same(c, compareBook=true) { const n = context(); return c.chat === n.chat && c.key === n.key && c.avatar === n.avatar && (!compareBook || c.book === n.book) && c.storage === n.storage; }
    function snapshot() {
        ready(); const value = face.exportTableAsJson(); const text = JSON.stringify(value);
        if (text !== cacheText) { cacheText = text; cacheValue = clone(value); }
        return cacheValue;
    }
    function validate(value, requireOwner = true) {
        if (!value || !keys(value).length || (requireOwner && value.mate?.mvuLedger?.version !== 1)) throw new Error('不是本扩展生成的台账模板');
        const names = new Set();
        for (const key of keys(value)) {
            const sheet = value[key]; const headers = sheet.content?.[0];
            if (!sheet.ledgerV2 || !Array.isArray(headers) || headers[0] !== 'row_id' || names.has(sheet.name)) throw new Error('表结构不合法或表名重复');
            names.add(sheet.name);
            if (new Set(headers).size !== headers.length || sheet.ledgerV2.columns.length !== headers.length - 1) throw new Error('列结构不匹配');
            const ids = new Set();
            for (const row of sheet.content.slice(1)) {
                if (!Array.isArray(row) || row.length !== headers.length || !Number.isSafeInteger(Number(row[0])) || Number(row[0]) < 1 || ids.has(Number(row[0]))) throw new Error('行号或行结构不合法');
                ids.add(Number(row[0]));
            }
        }
    }
    function owned(value) { validate(value); }
    async function flush(c) {
        const result = await face.flushPendingSaves();
        if (result === false || result?.ok === false) throw new Error('台账保存失败，请保留页面并检查存储');
        if (!same(c)) throw new Error('保存期间切换了聊天；已停止后续操作');
    }
    function serial(fn) {
        const c = context();
        const next = queue.then(async () => { ready(); if (!same(c)) throw new Error('聊天已切换，已取消旧任务'); return fn(c); });
        queue = next.catch(() => {}); return next;
    }
    function sameSchema(a,b) { return JSON.stringify(keys(a).sort().map(k=>[k,a[k].name,a[k].content[0]])) === JSON.stringify(keys(b).sort().map(k=>[k,b[k].name,b[k].content[0]])); }
    async function writeCandidate(value, c) {
        validate(value); const before = snapshot(); owned(before);
        if (!sameSchema(value, before)) throw new Error('运行时写入不得改表结构');
        if (JSON.stringify(before) === JSON.stringify(value)) return true;
        if (!same(c)) throw new Error('聊天已切换');
        if (!(await face.importTableAsJson(JSON.stringify(value)))) throw new Error('台账拒绝提交');
        if (!same(c,false)) throw new Error('提交期间聊天已切换');
        c.book=ledger.runtime.book();
        await flush(c); return true;
    }
    function mutate(table, edit) {
        return serial(async c => { const value = clone(snapshot()); owned(value); const key = keys(value).find(k=>k===table || value[k].name===table); if (!key) throw new Error('未找到表：'+table); const result = edit(value[key]); await writeCandidate(value,c); return result; });
    }
    const api = {
        __mvu_ledger__: true, version: 'MVU-Ledger/0.1.1',
        exportTableAsJson: snapshot,
        getTableTemplate: options => face.getTableTemplate(options),
        getTemplatePresetNames: () => face.getTemplatePresetNames(),
        registerTableUpdateCallback: fn => face.registerTableUpdateCallback(fn),
        unregisterTableUpdateCallback: fn => face.unregisterTableUpdateCallback(fn),
        registerTableFillStartCallback: fn => face.registerTableFillStartCallback(fn),
        getStoryContext: n => face.getStoryContext(n),
        hasPendingSaves: () => face.hasPendingSaves(),
        flushPendingSaves: () => face.flushPendingSaves(),
        queryTableRows: options => { ready(); return face.queryTableRows(options); },
        // Read capability only; author SQL mutation is intentionally not exposed.
        querySql: (sql,params) => { ready(); if (!/^\s*SELECT\b/i.test(sql) || /;\s*\S/.test(sql)) throw new Error('只允许单条 SELECT'); return face.querySql(sql,params); },
        readPersistedTableData: endIndex => {
            ready(); const chat = getContext().chat;
            if (endIndex != null && endIndex < chat.length-1) return null; // Historical reads use host replay API below.
            return snapshot();
        },
        async exportTableSnapshotsAtMessages(indices) {
            ready(); const c=context(); const snapshots=[];
            for (const index of indices) {
                if (!same(c) || !Number.isInteger(index) || index<0 || index>=c.chat.length) throw new Error('历史读取上下文无效');
                const result=await face.exportFullCheckpointAtMessageIndex(index);
                if (!same(c) || !result?.checkpoint?.data) throw new Error('历史快照不可用');
                snapshots.push({messageIndex:index,data:result.checkpoint.data});
            }
            return {success:true,snapshots};
        },
        importTemplateFromData: async (input,options={}) => {
            const value=typeof input==='string'?JSON.parse(input):clone(input); validate(value);
            if (options.scope==='global') {
                const name=String(options.presetName||'');
                if (!name.startsWith('MVU台账-')) throw new Error('模板名必须以 MVU台账- 开头，防止覆盖现有预设');
                const old=face.getTemplatePresetNames().includes(name)?face.getTableTemplate({scope:'global',presetName:name}):null;
                if(old) {
                    const ruleSignature=v=>JSON.stringify({groups:(v.mate?.ledgerGroups||[]).map(g=>[g.id,g.name,g.frequency]).sort((a,b)=>a[0]-b[0]),tables:keys(v).sort().map(k=>[k,v[k].name,v[k].content[0],v[k].ledgerV2?.groupId,v[k].ledgerV2?.note,v[k].ledgerV2?.triggerNotes])});
                    if(ruleSignature(old)!==ruleSignature(value))throw new Error('同名模板已存在且规则不同，请使用新名称');
                    return {success:true,scope:'global',message:'已有相同模板'};
                }
                return face.importTemplateFromData(value,{scope:'global',presetName:name});
            }
            return api.initGameSession({}, {templateData:value});
        },
        initGameSession: (_data,options={}) => serial(async c => {
            const value=clone(options.templateData || options.template || {}); validate(value);
            const before=snapshot();
            if(before.mate?.mvuLedger?.version===1) {
                if(!sameSchema(before,value)) throw new Error('已有转换台账结构不同，请新建聊天');
                return {success:true,runtimeReady:true,message:'已有台账已就绪，未重复初始化'};
            }
            const hasRows=keys(before).some(k=>(before[k].content?.length||0)>1);
            if(hasRows || c.chat.filter(m=>m && !m.is_user && !m.is_system).length>1 || (ledger.runtime.visibleEntries?.()||[]).length) throw new Error('当前聊天已有台账或历史，请在新聊天转换，未覆盖任何数据');
            const char=getContext().characters?.[getContext().characterId];
            const presetName='MVU台账-'+String(char?.name||char?.data?.name||c.avatar||'角色')+'模板';
            const saved=await api.importTemplateFromData(value,{scope:'global',presetName});
            if(!saved?.success || !same(c))throw new Error('专用模板保存失败或聊天已切换');
            const bound=await ledger.templateBinding?.set(presetName);
            if(!bound?.ok || !same(c))throw new Error('角色模板绑定失败，未初始化台账');
            if(!same(c))throw new Error('聊天已切换');
            if(!(await face.importTableAsJson(JSON.stringify(value))))throw new Error('初始化提交失败');
            if(!same(c,false))throw new Error('初始化期间聊天已切换');
            c.book=ledger.runtime.book();
            await flush(c);
            if(!sameSchema(snapshot(),value))throw new Error('初始化读回不一致');
            return {success:true,runtimeReady:true};
        }),
        importTableAsJson: input => serial(c=>writeCandidate(typeof input==='string'?JSON.parse(input):clone(input),c)),
        updateCell: (table,row,column,value) => mutate(table,s=>{ const r=s.content[row]; const col=typeof column==='number'?column:s.content[0].indexOf(column); if(!r||row<1||col<1||col>=r.length)throw new Error('单元格定位无效');r[col]=value;return true; }),
        updateRow: (table,row,data) => mutate(table,s=>{if(!s.content[row]||row<1)throw new Error('行定位无效');for(const [name,value]of Object.entries(data)){const col=s.content[0].indexOf(name);if(col<1)throw new Error('列定位无效');s.content[row][col]=value;}return true;}),
        insertRow: (table,data) => mutate(table,s=>{ for(const key of Object.keys(data))if(!s.content[0].slice(1).includes(key))throw new Error('未知列');const id=Math.max(0,...s.content.slice(1).map(r=>Number(r[0])))+1;s.content.push(s.content[0].map((h,i)=>i===0?id:(data[h]??'')));return s.content.length-1;}),
        deleteRow: (table,row) => mutate(table,s=>{if(!s.content[row]||row<1)throw new Error('行定位无效');s.content.splice(row,1);return true;}),
        refreshDataAndWorldbook: () => face.refreshDataAndWorldbook(),
        syncWorldbookEntries: () => face.syncWorldbookEntries(),
    };
    return api;
}
module.exports = createLedgerHost;
