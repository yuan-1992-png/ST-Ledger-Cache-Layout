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
          "ruleHash": "b36c63eb:e281ea89",
          "ruleChars": 2181
        },
        {
          "name": "重要角色表",
          "headers": "row_id|姓名|性别|生日|一句话介绍|外貌特征|身份|语言风格和口癖|对主角态度|过往经历",
          "ruleHash": "31a8f0f1:4998429",
          "ruleChars": 1111
        },
        {
          "name": "人物关系表",
          "headers": "row_id|人物A|人物B|关系类型|相互看法|起因备注|关系状态",
          "ruleHash": "658c4c50:4a2daa98",
          "ruleChars": 1363
        },
        {
          "name": "角色里程碑表",
          "headers": "row_id|姓名|里程碑事件",
          "ruleHash": "156e79b1:913f0269",
          "ruleChars": 1478
        },
        {
          "name": "NSFW信息表",
          "headers": "row_id|姓名|身高/体重|三围/罩杯|身材与特异性征|性爱接受度和XP倾向|性经验程度|下体状态|后庭状态|泌乳/体液状态|床上淫语风格|调教值|性爱次数|最近性行为|对主角的称呼",
          "ruleHash": "5f789c:1a4555e4",
          "ruleChars": 2196
        },
        {
          "name": "人物性格偏移表",
          "headers": "row_id|姓名|近期情绪状态|对主角的交互逻辑|被强化的性格侧面|被弱化的性格侧面|行为模式变化",
          "ruleHash": "35e9c546:579949fa",
          "ruleChars": 2014
        },
        {
          "name": "在场角色表",
          "headers": "row_id|姓名|当前状态|内心想法|下一步打算|当前穿搭|上装|下装|内衣/内裤|袜子|鞋子|饰品|情绪",
          "ruleHash": "11c7d272:b1e318aa",
          "ruleChars": 2279
        },
        {
          "name": "即时生理反应表",
          "headers": "row_id|姓名|胸部|下体|口穴|菊穴|其他部位",
          "ruleHash": "c731c858:a0179cc2",
          "ruleChars": 1049
        },
        {
          "name": "恋爱日记表",
          "headers": "row_id|写作角色|关联角色|日记内容|发生时间|事件类型",
          "ruleHash": "8c63924e:e5774358",
          "ruleChars": 1499
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
  "name": "角色组10表 · 跨表真名校验",
  "id": "character-10-name-sync-20261024"
};
