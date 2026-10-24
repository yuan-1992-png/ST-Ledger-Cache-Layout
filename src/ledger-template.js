'use strict';
function createLedgerTemplate() {
    function adapt(template) {
        const keys=Object.keys(template).filter(k=>k.startsWith('sheet_'));
        if(!keys.length)throw new Error('没有可转换的变量表');
        template.mate={...template.mate,mvuLedger:{version:1},ledgerGroups:[{id:1,name:'MVU变量',frequency:1},{id:2,name:'只读变量',frequency:0}]};
        for(const key of keys){
            const sheet=template[key];
            if(sheet.sourceData?.hiddenPhysicalColumns?.length)throw new Error('当前台账适配版暂不支持隐藏物理列，请保留原卡');
            for(const field of ['note','initNode','insertNode','updateNode','deleteNode'])if(/<%/.test(sheet.sourceData?.[field]||''))throw new Error('当前台账适配版暂不支持填表规则中的动态 EJS');
            sheet.ledgerV2={tableId:key,name:sheet.name,orderNo:sheet.orderNo,groupId:sheet.updateConfig?.updateFrequency===0?2:1,
                note:[sheet.sourceData?.note,'【台账适配】按台账本次请求规定的操作格式更新；不要输出 SQL、MVU 更新块。JSON 单元格提交完整合法 JSON，保留未变化的键与原始类型。只记录已有依据的变化。'].filter(Boolean).join('\n'),
                triggerNotes:{init:sheet.sourceData?.initNode||'',insert:sheet.sourceData?.insertNode||'',update:sheet.sourceData?.updateNode||'',delete:sheet.sourceData?.deleteNode||''},
                columns:sheet.content[0].slice(1).map(header=>({header,type:'text',unique:false,notNull:false})),readMode:'all',worldbook:{enabled:false}};
            // No SQL-only row-window filters: every mapped variable is presented by the original MVU snapshot.
            sheet.updateConfig={skipFloors:-1,updateFrequency:sheet.ledgerV2.groupId===2?0:1};
        }
        return template;
    }
    return {adapt};
}
module.exports=createLedgerTemplate;
