// Reviewed schema only. Bind a character in the UI before enabling.
export const PROFILE = {
  "version": 1,
  "characterAvatar": "",
  "ledgerVersion": "1.130 / 1.131",
  "groups": [
    {
      "id": 1,
      "name": "角色组",
      "intro": "【当前台账】\n下面为本轮需要填的表及已有内容：每张表由一行「表 N/M：表名」分隔线框出，只允许填写这里列出的表。\n\n",
      "signature": [
        {
          "index": 0,
          "role": "system",
          "hash": "ad66d21d:91404355"
        },
        {
          "index": 1,
          "role": "system",
          "hash": "75666fac:aa09c2ce"
        },
        {
          "index": 2,
          "role": "system",
          "hash": "ac9cd800:f1663a8"
        }
      ],
      "tables": [
        {
          "name": "主角信息表",
          "headers": "row_id|姓名|性别|生日|外貌特征|身份背景|近况|瑟瑟能量",
          "ruleHash": "eaf6e737:db48c58d",
          "ruleChars": 526
        },
        {
          "name": "恋爱对象表",
          "headers": "row_id|姓名|性别|生日|一句话介绍|外貌特征|身份|语言风格和口癖|对主角态度|过往经历|最近亲密互动",
          "ruleHash": "926cdd06:de512b76",
          "ruleChars": 2059
        },
        {
          "name": "重要角色表",
          "headers": "row_id|姓名|性别|生日|一句话介绍|外貌特征|身份|语言风格和口癖|对主角态度|过往经历",
          "ruleHash": "4a921a50:7a77b796",
          "ruleChars": 989
        },
        {
          "name": "人物关系表",
          "headers": "row_id|人物A|人物B|关系类型|相互看法|起因备注|关系状态",
          "ruleHash": "117951bb:bea9a10d",
          "ruleChars": 1093
        },
        {
          "name": "角色里程碑表",
          "headers": "row_id|姓名|里程碑事件",
          "ruleHash": "d811b7bd:8db53c91",
          "ruleChars": 1231
        },
        {
          "name": "NSFW信息表",
          "headers": "row_id|姓名|身高/体重|三围/罩杯|身材与特异性征|性爱接受度和XP倾向|性经验程度|下体状态|后庭状态|泌乳/体液状态|床上淫语风格|调教值|性爱次数|最近性行为|对主角的称呼",
          "ruleHash": "2d43b614:9bb3f810",
          "ruleChars": 1982
        },
        {
          "name": "人物性格偏移表",
          "headers": "row_id|姓名|近期情绪状态|对主角的交互逻辑|被强化的性格侧面|被弱化的性格侧面|行为模式变化",
          "ruleHash": "78c93a32:3c91894e",
          "ruleChars": 1800
        },
        {
          "name": "在场角色表",
          "headers": "row_id|姓名|当前状态|内心想法|下一步打算|当前穿搭|上装|下装|内衣/内裤|袜子|鞋子|饰品|情绪",
          "ruleHash": "7008be79:12ca4b55",
          "ruleChars": 2015
        },
        {
          "name": "即时生理反应表",
          "headers": "row_id|姓名|胸部|下体|口穴|菊穴|其他部位",
          "ruleHash": "12c9280b:9f2928bd",
          "ruleChars": 785
        },
        {
          "name": "恋爱日记表",
          "headers": "row_id|写作角色|关联角色|日记内容|发生时间|事件类型",
          "ruleHash": "3c62d767:75840895",
          "ruleChars": 1351
        }
      ]
    }
  ],
  "skippedGroups": [
    {
      "id": 2,
      "name": "基础组",
      "signature": [
        {
          "index": 0,
          "role": "system",
          "hash": "ad66d21d:91404355"
        },
        {
          "index": 1,
          "role": "system",
          "hash": "75666fac:aa09c2ce"
        },
        {
          "index": 2,
          "role": "system",
          "hash": "76c8a96b:d01bbe45"
        }
      ],
      "reason": "fixed-rules-vary",
      "tables": [
        "全局数据表"
      ]
    }
  ],
  "name": "角色组10表 · 真名归并规则",
  "id": "character-10-reviewed-20261023"
};
