# D05 中国现行逐间入口核对

日期：2026-10-07。核对基线：`f46142eb42a6a4c1722f996aaf5498b05aa30ad5`。

## 有限范围与结论

覆盖当前全部50条室内用途记录（不是50个互不重叠的实体房间），并另列室外/楼梯/服务缺口。`archive`与`tea`为同一茶厅包络与功能区；各大楼梯厅/走廊记录也不代表独立围合房间。现行58个登记入口为38门、7完整帘、3固定半帘、10开放。所有私卧、浴间/净室、问诊及封闭库房入口已具备相应用途遮挡，没有发现需要新增门的中国缺口。

## 逐间记录

每行：现行用途、成品地面Y（米）、全部相关登记入口及对未登记敞口的源几何判定。保留全部现有房间ID/床位/住宿经营权限；不建立新锁或新房间。

| ID / 空间 | 地面Y | 实际登记入口（共享入口可能在两行出现） | 用途 / 决定 |
|---|---:|---|---|
| gatehouse / 承礼门门廊 | .215 | cn-gatehouse-court 开放 | 公共门廊；内侧通庭敞开，城墙8湾门另列。 保留。 |
| hall / 承礼正殿 | 1.415 | cn-hall-front 门；cn-hall-rear 门；cn-hall-west 门；cn-hall-east 门 | 仪式公共殿；四外门保留，传令案/御座不是新房间。 保留。 |
| archive / 雅集楼一层 · 茶叙会客 | 0.815 | cn-archive-front 门；cn-archive-rear 门；cn-archive-west 门；cn-archive-east 门 | 现为雅集楼一层茶叙厅的建筑包络；与tea是重叠登记，不计两间。 保留。 |
| hall-gallery / 正殿二层观景回廊 | 6.015 | 无独立登记门洞；见右侧几何说明 | 公共二层观景回廊；正殿内部楼梯直连，无独立门洞。 保留。 |
| tea / 雅集楼一层 · 茶叙会客 | 0.815 | 无独立登记门洞；见右侧几何说明 | 同archive茶厅内功能区域，经cn-archive-*四入口；不是缺少四扇cn-tea-*门。 保留。 |
| study / 雅集楼二层 · 书画室 | 4.215 | cn-study-front 门；cn-study-west 完整帘；cn-study-east 完整帘 | 二层安静书画工作间；一正门两侧完整帘，北侧为建筑栏墙/观景窗带，无可步行后门。 保留。 |
| culture-gallery / 雅集楼二层 · 公共回廊 | 4.215 | cn-study-front 门；cn-study-west 完整帘；cn-study-east 完整帘 | 二层公共梯厅/环廊；不把重叠的study区域算成另一个通行入口。 保留。 |
| archive-loft / 雅集楼三层 · 藏书观景 | 7.615 | 无独立登记门洞；见右侧几何说明 | 三层公共藏书观景整层；两段公共楼梯接入，非私库。 保留。 |
| residence-hall-1 / 后宫1层公共梯厅 | 0.215 | cn-guest-front 门；cn-guest-east 门 | 公共梯厅；东西地面拱口开放，楼梯/换向平台保持开放，私室入口单独封闭。 保留。 |
| residence-hall-2 / 后宫2层公共梯厅 | 4.015 | cn-bath-front 门；cn-bath-east 门 | 公共梯厅；楼梯/换向平台保持开放，私室入口单独封闭。 保留。 |
| residence-hall-3 / 后宫3层公共梯厅 | 7.815 | cn-bedroom-front 门 | 公共梯厅；楼梯/换向平台保持开放，私室入口单独封闭。 保留。 |
| guest / 后宫一层客卧 | 0.215 | cn-guest-front 门 | 月容既有客卧；公共入口cn-guest-front，东侧/南侧实墙分别与会客、南间分离。 保留。 |
| residence-living / 后宫一层公共会客前厅 | 0.215 | cn-guest-east 门 | 公共会客前厅；cn-guest-east是此处外门，内部向西1.7m走廊敞开。 保留。 |
| residence-suite-corridor / 后宫私室外走廊 | 0.215 | cn-consort-reserve-1-door 门；cn-consort-heng-door 门；cn-consort-ling-door 门 | 从会客前厅进入；沈蘅/令仪/南间各独立门，西侧客卧墙无旁路。 保留。 |
| consort-heng / 沈蘅 · 后宫私室 | 0.215 | cn-consort-heng-door 门 | 沈蘅私室；走廊唯一入口，不穿过令仪卧室。 保留。 |
| consort-ling / 令仪 · 后宫私室 | 0.215 | cn-consort-ling-door 门 | 令仪私室；走廊唯一入口，不穿过沈蘅卧室。 保留。 |
| consort-reserve-1 / 后宫南间 · 尚未分配 | 0.215 | cn-consort-reserve-1-door 门 | 未分配南间；实体床/门已存在，权限/分配状态原样保留。 保留。 |
| bath / 后宫二层浴间 | 4.015 | cn-bath-front 门；cn-bath-washroom 完整帘 | 二层私浴；公共梯厅门+浴间/净室完整屏帘，外墙只有有遮蔽窗。 保留。 |
| washroom / 后宫二层净室 | 4.015 | cn-bath-east 门；cn-bath-washroom 完整帘；cn-bath-west 门 | 私密净室；公共到达门、浴间全帘、布草更衣门均保留。 保留。 |
| residence-linen / 后宫二层布草与更衣 | 4.015 | cn-bath-west 门 | 二层布草更衣；从净室经cn-bath-west，非独立公共通道。 保留。 |
| bedroom / 静宜后宫三层寝殿 | 7.815 | cn-bedroom-front 门；cn-bedroom-west 门 | 私寝；公共梯厅仅cn-bedroom-front，南侧梳妆间有门，西南私厅内部敞口不绕过私寝入口。 保留。 |
| residence-dressing / 后宫三层梳妆间 | 7.815 | cn-bedroom-west 门 | 套内独立梳妆/更衣；唯一入口cn-bedroom-west，西侧实墙。 保留。 |
| residence-sitting / 后宫三层私厅 | 7.815 | 无独立登记门洞；见右侧几何说明 | 寝殿套内私厅；z=-3的3.6m敞口只接已由cn-bedroom-front封闭的寝殿，不通公共梯厅。 保留。 |
| dining / 御膳楼一层餐厅 | 0.215 | cn-kitchen-front 完整帘；cn-kitchen-rear 门；cn-kitchen-west 固定半帘；cn-kitchen-east 固定半帘；cn-kitchen-dining 固定半帘 | 御膳一层公共餐厅；前完整帘、侧半帘、后勤门；通楼上楼梯开放。 保留。 |
| kitchen / 御膳楼二层备膳间 | 4.015 | cn-kitchen-dining 固定半帘 | 御膳二层工作间；cn-kitchen-dining半帘在真实楼梯上口。 保留。 |
| tavern-hall-1 / 云来楼1层公共梯厅 | 0.215 | cn-tavern-public-entry 开放；cn-tavern-dining-hall 开放 | 公共梯厅/换向平台；店面和后厨服务连续开放。 保留。 |
| tavern-hall-2 / 云来楼2层公共梯厅 | 4.015 | cn-tavern-lan-door 门；cn-tavern-zhu-door 门；cn-tavern-washroom-curtain 完整帘 | 公共梯厅/换向平台；客房/净室有独立闭合，公共楼梯开放。 保留。 |
| tavern-hall-3 / 云来楼3层公共梯厅 | 7.815 | cn-tavern-performance-entry 开放；cn-tavern-banquet-entry 开放 | 公共梯厅/换向平台；琴歌/宴饮厅均为开放公共活动。 保留。 |
| tavern-dining / 云来一层酒楼 | 0.215 | cn-tavern-dining-entry 开放；cn-tavern-dining-hall 开放 | 公共经营敞厅，南街门/北梯厅通道开放，不添门。 保留。 |
| tavern-kitchen / 云来酒楼 · 后厨备餐间 | 0.215 | 无独立登记门洞；见右侧几何说明 | 一层公共梯厅北侧工作区；木屏风侧1.2m服务缺口和出餐口，不是住宿私室。 保留。 |
| tavern-guest-lan / 云来客栈 · 兰房 | 4.015 | cn-tavern-lan-door 门 | 兰房私卧；唯一梯厅门，隔墙完整，保原住宿/产权。 保留。 |
| tavern-guest-zhu / 云来客栈 · 竹房 | 4.015 | cn-tavern-zhu-door 门 | 竹房私卧；唯一梯厅门，隔墙完整，保原住宿/产权。 保留。 |
| tavern-public-washroom / 云来楼二层 · 公共净室 | 4.015 | cn-tavern-washroom-curtain 完整帘 | 独立公共净室；唯一完整帘，保原使用时私密机制。 保留。 |
| tavern-performance / 顶层青楼 · 琴歌雅集厅 | 7.815 | cn-tavern-performance-entry 开放；cn-tavern-salon-arch 开放 | 公共琴歌雅集厅；梯厅入口和宴饮拱口开放，舞台帷幕非房间门。 保留。 |
| tavern-banquet / 顶层青楼 · 宴饮雅间 | 7.815 | cn-tavern-banquet-entry 开放；cn-tavern-salon-arch 开放 | 公共宴饮雅间；梯厅入口和琴歌拱口开放，非住宿房。 保留。 |
| money-house-public / 钱庄 · 候坐与存取 | 0.215 | cn-money-house-front 门 | 公共候坐/存取；由正门进入，柜台东侧敞开接账房。 保留。 |
| money-house-staff / 钱庄 · 算盘账房 | 0.215 | cn-money-house-store 门 | 柜台后开放账房，非独立私寝；通过侧通道连公共区，钱库单独有门。 保留。 |
| money-house-aisle / 钱庄 · 柜台侧通道 | 0.215 | 无独立登记门洞；见右侧几何说明 | 柜台东侧3m服务通道，无墙洞；cn-money-house-store实际位于其北端（旧rooms字段称staff）。 保留。 |
| money-house-store / 钱庄 · 钱库 | 0.215 | cn-money-house-store 门 | 独立钱库唯一门；西墙、北/东外墙封闭，不补新锁。 保留。 |
| clinic-stair-hall / 一层药铺 · 公共梯厅 | 0.215 | cn-clinic-front 门 | 药铺公共梯厅，与交单领取区连续开放。 保留。 |
| clinic-pharmacy / 一层药铺 · 交单与领取 | 0.215 | cn-clinic-stock-door 门 | 药铺交单/领取服务区；非私房，备物间另有门。 保留。 |
| clinic-stock / 一层药铺 · 备物间 | 0.215 | cn-clinic-stock-door 门 | 独立备物；南门，西隔墙及北/东外墙无其他行人开口。 保留。 |
| clinic-waiting / 二层医馆 · 公共候诊与交单平台 | 4.015 | cn-clinic-consult-door 门 | 二层公共候诊平台，公共楼梯接入；问诊室唯一门在南隔墙。 保留。 |
| clinic-consult / 二层医馆 · 独立问诊室 | 4.015 | cn-clinic-consult-door 门 | 独立问诊；南门，西隔墙及北/东外墙无其他行人开口。 保留。 |
| cn-official-room-gu / 顾衡的值宿私室 | 0.215 | cn-official-room-gu-door 门 | 顾衡私室；唯一办公室侧门，无外部走廊旁路。 保留。 |
| cn-official-room-xu / 许知远的值宿私室 | 0.215 | cn-official-room-xu-door 门 | 许知远私室；唯一办公室侧门，无外部走廊旁路。 保留。 |
| cn-official-office / 承务官署 · 公共办公厅 | 0.215 | cn-official-bureau-entry 门；cn-official-room-gu-door 门；cn-official-room-xu-door 门 | 公共办公，入口门保留；后方顾衡/许知远各独立私室。 保留。 |
| cn-official-dorm-west / 西值宿室 · 两张独立卧榻 | 3.915 | cn-official-dorm-west-door 完整帘 | 两张独立床的共用值宿室；唯一完整帘，非两间缺门私室。 保留。 |
| cn-official-dorm-east / 东值宿室 · 两张独立卧榻 | 3.915 | cn-official-dorm-east-door 完整帘 | 两张独立床的共用值宿室；唯一完整帘，非两间缺门私室。 保留。 |
| cn-official-upper-office / 承务官舍二层 · 公共办公厅 | 3.915 | cn-official-upper-entry 开放；cn-official-dorm-west-door 完整帘；cn-official-dorm-east-door 完整帘 | 公共二层办公；外楼梯/阳台入口开放，两间值宿室各完整帘。 保留。 |

## 额外开放空间与独立实际入口

| 空间 | 实际入口/边界 | 判定 |
|---|---|---|
| 四面城墙 | 南3湾、北3湾、西1湾、东1湾；cn-south/north-gate及west/east后缀、cn-west/east-gate | 8扇既有城门全保留；不重复计算门廊内通庭口 |
| 承礼广庭/正殿外台基与廊道 | 南北公共仪式轴、正殿四向阶口 | 敞开公共空间；正殿的4入口门另列 |
| 后苑荷庭、北庭、桥两端 | cn-lotus-bridge-south/north、桥阶、东西岸与北庭步道 | 户外通行开放，池水边界不是门 |
| 西南射圃 | 东侧后方2.9m开口，候位/弓架/射位/靶场同一院落 | 保持开放；围挡为安全背墙，不把靶场拆成房间 |
| 后宫地面东西拱口 | x=-26/-16，z=-15..-12.05；接residence-hall-1 | 公共梯厅两入口保持开放；卧室各自有门 |
| 后宫一层会客到私室外廊 | x=-20.9..-19.2，z=-7.8 | 1.7m公共内走廊保持开放；不进入任何私卧才能通过 |
| 后宫三层寝殿到私厅 | z=-3，x=-24.8..-21.2 | 私寝套内敞口，公共入口已经闭合，不额外加门 |
| 云来北侧备餐/出餐工作面 | 屏风侧1.2m服务口与餐台两侧 | 工作区，非私卧；保持原服务路线 |
| 钱庄柜台侧通道 | x=-19..-16，通候坐/账房/钱库门前 | 非独立围合房间；柜台不是承重墙门洞 |
| 药铺交单区到梯厅 | 一层连续公共地面；二层楼梯接候诊平台 | 公共流线开放；诊室和备物间各自有门 |
| 官舍室外公共楼梯/北阳台 | ground→3.915m，cn-official-upper-entry | 公共楼梯开放，不以卧室作过道 |
| 各楼公共楼梯和换向平台 | 正殿1组；雅集楼2组；后宫2组；云来2组；医馆1组；御膳1组；官舍外梯1组 | 保留所有原始上/下口、护栏及层高，不加门阻断 |
| 建筑门廊、围墙内外/侧向服务路、花木庭院 | 外部道路相互连通；原茶厅/书斋/浴房/客居旧址已分别合并或改用途 | 户外公共交通，不把已移走的建筑政策当作现存缺门 |

## 验证依据

- `china-palace.js:140–208, 315–339, 412–550, 573–581`：当前建筑创建、迁移、正殿上廊、雅集三层、院落/全部子建筑。旧structures里已迁移茶/书/寝/浴/客只是家具源，不是额外旧房。
- `china-residence.js:33–57, 97–129`：所有外墙、遮蔽窗、两公共地面拱口、三层房间/实墙/门。`china-consort-rooms.js:38–88`：南间和两私室的封闭隔墙、独立门、公共走廊。
- `china-tavern.js:39–84, 124–173`、`china-tavern-kitchen.js:11–21`：三层外壳、兰/竹隔间、公共净室、顶层敞口与服务口；`china-tavern-layout.js`：当前迁移。
- `china-royal-kitchen-building.js:12–40, 51–55`：两层实际功能、半帘与内楼梯。
- `china-money-house.js:19–28, 57–60`：柜台侧开放通道与独立钱库。
- `china-clinic.js:25–60, 84–99`：公共梯厅/药铺和独立备物、问诊。
- `china-official-bureau.js:27–55, 65–118`：两私室、两双床共寝间和公共办公/外梯。
- `china-archery-court.js:15–29`：真实后方入口和围挡。
- 生产Three场景加载后遍历50条室内记录、58个实际入口，与源构造逐项对照。没有新增几何/门/帘/碰撞/感应/权限变化，复用旧各建筑定向验收；本轮不是新通行测试或新正常视角/iPhone实玩验收。
