'use strict';
function createLedgerTemplate() {
    const clone=value=>JSON.parse(JSON.stringify(value));
    const sheetKeys=value=>Object.keys(value||{}).filter(key=>key.startsWith('sheet_'));
    function merge(base,source,selected) {
        const result=clone(base), src=source||{}, added=[], skipped=[];
        const variableIds=result.mate?.mvuLedger?.variableTableIds||sheetKeys(base);
        const names=new Set(sheetKeys(result).map(k=>String(result[k].name||'').trim()));
        const imports=[];
        for(const uid of [...new Set(selected||[])]){
            const sheet=src[uid];if(!sheet)continue;
            const name=String(sheet.name||'').trim();
            if(names.has(name)){skipped.push(name);continue;}
            if(!sheet.ledgerV2)throw new Error('来源表缺少台账原生定义，不能保留其分组和注入设置：'+name);
            names.add(name);imports.push([uid,sheet]);
        }
        if(!imports.length)return{template:result,added,skipped};
        const sourceGroups=src.mate?.ledgerGroups||[];
        const required=new Set(imports.map(([,sheet])=>sheet.ledgerV2.groupId));
        for(const id of required)if(!sourceGroups.some(g=>g.id===id))throw new Error('来源模板缺少分组定义：'+id);
        const groups=clone(result.mate.ledgerGroups||[]);
        const used=new Set([...groups,...sourceGroups].map(g=>g.id));
        let next=Math.max(0,...used)+1;
        for(const group of sourceGroups.filter(g=>required.has(g.id))){
            const existing=groups.find(g=>g.id===group.id);
            if(existing && JSON.stringify(existing)!==JSON.stringify(group)){
                while(used.has(next))next++;
                const old=existing.id;existing.id=next;used.add(next++);
                for(const key of sheetKeys(result))if(result[key].ledgerV2?.groupId===old)result[key].ledgerV2.groupId=existing.id;
            }
            if(!groups.some(g=>g.id===group.id))groups.push(clone(group));
        }
        const importedKeys=[];
        for(const [uid,sheet]of imports){
            let key=uid,n=2;while(result[key])key=uid+'_'+n++;
            const copy=clone(sheet);copy.uid=key;copy.ledgerV2.tableId=key;
            // Only schema/rules are merged; never import records from another chat.
            copy.content=[clone(sheet.content[0])];
            result[key]=copy;importedKeys.push(key);added.push(sheet.name);
        }
        result.mate.mvuLedger={...result.mate.mvuLedger,variableTableIds:[...variableIds]};
        result.mate.ledgerGroups=groups;
        // Existing ecosystem tables are the foundation; MVU-only tables follow them.
        const oldKeys=sheetKeys(base), ecosystem=oldKeys.filter(k=>!variableIds.includes(k));
        const ordered=[...ecosystem,...importedKeys,...variableIds.filter(k=>result[k])];
        const output={...result};for(const key of sheetKeys(output))delete output[key];
        ordered.forEach((key,index)=>{const sheet=result[key];sheet.orderNo=index;sheet.ledgerV2.orderNo=index;output[key]=sheet;});
        return{template:output,added,skipped};
    }
    function adapt(template) {
        const keys=Object.keys(template).filter(k=>k.startsWith('sheet_'));
        if(!keys.length)throw new Error('没有可转换的变量表');
        const variableIds=template.mate?.mvuLedger?.variableTableIds||keys;
        template.mate={...template.mate,mvuLedger:{...template.mate?.mvuLedger,version:1,variableTableIds:[...variableIds]},ledgerGroups:template.mate?.ledgerGroups||[{id:1,name:'MVU变量',frequency:1},{id:2,name:'只读变量',frequency:0}]};
        for(const key of variableIds){
            const sheet=template[key];
            if(!sheet)throw new Error('MVU变量表缺失：'+key);
            if(sheet.sourceData?.hiddenPhysicalColumns?.length)throw new Error('当前台账适配版暂不支持隐藏物理列，请保留原卡');
            for(const field of ['note','initNode','insertNode','updateNode','deleteNode'])if(/<%/.test(sheet.sourceData?.[field]||''))throw new Error('当前台账适配版暂不支持填表规则中的动态 EJS');
            const groupId=sheet.ledgerV2?.groupId??(sheet.updateConfig?.updateFrequency===0?2:1);
            const group=template.mate.ledgerGroups.find(g=>g.id===groupId);
            if(!group)throw new Error('MVU变量表分组缺失：'+key);
            sheet.ledgerV2={tableId:key,name:sheet.name,orderNo:sheet.orderNo,groupId,
                note:[sheet.sourceData?.note,'【台账适配】按台账本次请求规定的操作格式更新；不要输出 SQL、MVU 更新块。JSON 单元格提交完整合法 JSON，保留未变化的键与原始类型。只记录已有依据的变化。'].filter(Boolean).join('\n'),
                triggerNotes:{init:sheet.sourceData?.initNode||'',insert:sheet.sourceData?.insertNode||'',update:sheet.sourceData?.updateNode||'',delete:sheet.sourceData?.deleteNode||''},
                columns:sheet.content[0].slice(1).map(header=>({header,type:'text',unique:false,notNull:false})),readMode:'all',worldbook:{enabled:false}};
            // No SQL-only row-window filters: every mapped variable is presented by the original MVU snapshot.
            sheet.updateConfig={skipFloors:-1,updateFrequency:group.frequency};
        }
        return template;
    }
    return {adapt,merge};
}
module.exports=createLedgerTemplate;
