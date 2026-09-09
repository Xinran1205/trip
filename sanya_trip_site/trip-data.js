
window.TRIP_DATA = {
  days: [
    {date:"10.03",weekday:"周六",title:"南京 → 三亚",mode:"固定交通日",events:[
      ["16:00","<strong>从南京家中出发</strong><br>前往南京禄口国际机场"],
      ["18:45","<strong>南京起飞</strong><br>不额外安排机场活动"],
      ["22:00","<strong>抵达三亚凤凰国际机场</strong><br>落地后取行李"],
      ["约22:30+","<strong>乘提前预约的接机车</strong><br>直接前往海棠湾万丽"],
      ["约23:20+","<strong>入住万丽</strong><br>洗澡、休息，当晚不安排其他项目"]
    ]},
    {date:"10.04",weekday:"周日",title:"海棠湾度假 No.1",mode:"高弹性",events:[
      ["上午","<strong>自然醒 + 早餐 + 酒店</strong><br>泳池、海边、健身或继续躺"],
      ["12:00–16:30","<strong>任意时间出门</strong><br>完全看当天状态，不规定必须下午才走"],
      ["下午/晚上","<strong>海棠湾内吃喝</strong><br>亚特兰蒂斯只是备选，不是任务"],
      ["晚上","<strong>随缘回酒店</strong><br>不设固定返程时间"]
    ]},
    {date:"10.05",weekday:"周一",title:"海棠湾度假 No.2",mode:"半日外出可选",events:[
      ["上午","<strong>继续享受酒店</strong><br>第二个完整白天，不安排景点"],
      ["11:30–16:00","<strong>想走就走</strong><br>如果中午已经待够了，可以直接出去"],
      ["下午","<strong>海棠湾吃喝半日</strong><br>餐厅后续按你们自己的清单补"],
      ["晚上","<strong>吃完回万丽</strong><br>保持轻松，不把两天复制成同一套"]
    ]},
    {date:"10.06",weekday:"周二",title:"海棠湾 → 三亚湾市区",mode:"换区日",events:[
      ["上午","<strong>万丽早餐 + 酒店最后半天</strong><br>不建议再跑远"],
      ["约12:00","<strong>退房离开海棠湾</strong><br>之后不再折返"],
      ["约13:00+","<strong>抵达三亚湾洛克铂金</strong><br>能入住就入住，否则先寄存行李"],
      ["下午","<strong>市区吃吃喝喝</strong><br>午饭、咖啡、甜品、散步、回酒店休息都可以"],
      ["傍晚","<strong>三亚湾海边</strong><br>天气好就顺路看看日落"],
      ["晚上","<strong>市区 / 夜市继续吃喝</strong><br>具体区域等餐厅清单出来再定"]
    ]},
    {date:"10.07",weekday:"周三",title:"三亚 → 南京",mode:"固定离岛日",events:[
      ["早上","<strong>自然醒 + 早餐 + 三亚湾散步</strong><br>不跑远、不打卡"],
      ["10:30–11:15","<strong>回酒店整理行李</strong><br>准备退房"],
      ["11:30","<strong>从洛克铂金出发去机场</strong><br>按你熟悉的节奏走"],
      ["14:00","<strong>航班起飞</strong><br>三亚行程结束"]
    ]}
  ],
  hotels:[
    {name:"三亚海棠湾万丽度假酒店",dates:"10.03 — 10.06",desc:"前三晚的度假基地。位置偏，但策略明确：白天享受 Resort，想吃东西时再打车去海棠湾餐饮区域。",chips:["海棠湾","Resort 模式","不依赖步行觅食"],mapPlaceId:"ren-sanya-haitang"},
    {name:"三亚湾洛克铂金海景酒店",dates:"10.06 — 10.07",desc:"最后一晚切换到市区与三亚湾生活圈。下午到晚上集中吃喝，第二天直接去机场。",chips:["三亚湾","市区吃喝","去机场方便"],mapPlaceId:"rock-platinum-sanya-bay"}
  ],
  zones:[
    {name:"海棠湾北段 / 万丽",desc:"酒店度假基地。核心是休息，不强求周边步行餐饮。",chips:["10/4","10/5","低强度"]},
    {name:"海棠湾中南段",desc:"想出门时的主要吃喝活动半径。林旺夜市、海棠 68 和糟粕醋都可以按当天胃口选择。",chips:["弹性出发","海鲜","糟粕醋"]},
    {name:"三亚湾 / 市区",desc:"10/6 下午正式切换。椰子鸡、抱罗粉、酸粉和小吃集中在这半天慢慢挑。",chips:["10/6","本地小吃","市区"]}
  ],
  places:[
    {id:"ren-sanya-haitang",name:"三亚海棠湾万丽度假酒店",type:"hotel",area:"haitang",category:"酒店 · 10/03–10/06",note:"前三晚基地",amap:"三亚海棠湾万丽度假酒店"},
    {id:"atlantis-sanya",name:"三亚亚特兰蒂斯",type:"food",area:"haitang",category:"海棠湾 · 备选区域",note:"可以吃饭，但不是必去",amap:"三亚亚特兰蒂斯"},
    {id:"haitang-68-food-street",name:"海棠68环球美食街",type:"food",area:"haitang",category:"海棠湾 · 美食街",note:"海棠湾集中吃喝坐标",amap:"海棠68环球美食街"},
    {id:"laolangjia-linwang",name:"老郎家海鲜大排档",type:"food",area:"haitang",category:"海棠湾 · 林旺夜市",note:"海鲜大排档备选",amap:"三亚 老郎家海鲜大排档 林旺夜市"},
    {id:"laopo-xiangcaoya",name:"唠婆香草鸭",type:"food",area:"haitang",category:"海棠湾 · 海棠68二楼",note:"香草鸭备选",amap:"三亚 唠婆香草鸭 海棠68环球美食街"},
    {id:"ajun-baoluofen",name:"阿俊糟粕醋抱罗粉",type:"food",area:"haitang",category:"海棠湾 · 粉面小吃",note:"糟粕醋抱罗粉备选",amap:"三亚 阿俊糟粕醋抱罗粉"},
    {id:"linjie-seafood",name:"林姐香味海鲜",type:"food",area:"haitang",category:"海棠湾 · 海鲜",note:"海鲜备选",amap:"三亚 林姐香味海鲜 海棠湾"},
    {id:"qiongxiaoqiong-hotpot",name:"琼小琼糟粕醋火锅",type:"food",area:"haitang",category:"海棠湾 · 糟粕醋",note:"糟粕醋火锅备选",amap:"三亚 琼小琼糟粕醋火锅 海棠湾"},
    {id:"rock-platinum-sanya-bay",name:"三亚湾洛克铂金海景酒店",type:"hotel",area:"sanyaBay",category:"酒店 · 10/06–10/07",note:"市区阶段基地",amap:"三亚湾洛克铂金海景酒店"},
    {id:"diadia-coconut-chicken",name:"嗲嗲的椰子鸡",type:"food",area:"sanyaBay",category:"三亚湾 · 椰子鸡",note:"椰子鸡备选",amap:"三亚 嗲嗲的椰子鸡 三亚湾"},
    {id:"xiangjie-baoluofen",name:"祥姐抱罗粉",type:"food",area:"sanyaBay",category:"第一市场 · 抱罗粉",note:"第一市场粉面备选",amap:"三亚 祥姐抱罗粉 第一市场"},
    {id:"xinmajia-milan",name:"馨妈家儋州米烂",type:"food",area:"sanyaBay",category:"三亚湾 · 本地小吃",note:"儋州米烂备选",amap:"三亚 馨妈家儋州米烂"},
    {id:"xiaogongzhu-baoji",name:"小公主包鸡烤鸡",type:"food",area:"sanyaBay",category:"三亚湾 · 烤鸡",note:"包鸡烤鸡备选",amap:"三亚 小公主包鸡烤鸡"},
    {id:"shengji-changfen",name:"晟记普宁肠粉王",type:"food",area:"sanyaBay",category:"三亚湾 · 肠粉",note:"肠粉备选",amap:"三亚 晟记普宁肠粉王"},
    {id:"junling-suanfen",name:"君陵陵水酸粉",type:"food",area:"sanyaBay",category:"三亚湾 · 酸粉",note:"陵水酸粉备选",amap:"三亚 君陵陵水酸粉"},
    {id:"sanya-airport",name:"三亚凤凰国际机场",type:"transport",area:"sanyaBay",category:"交通",note:"10/03 抵达 · 10/07 离开",amap:"三亚凤凰国际机场"}
  ]
};
