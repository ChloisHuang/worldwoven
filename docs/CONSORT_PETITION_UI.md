# 宫廷自荐与名位状态卡

`createChinaConsortPetitionUI` 位于 `source/game/china-consort-petition-ui.js`，沿用共享 `airy-panel` 和薄纸/平面动作样式。它只创建一张状态卡，不添加 HUD、职业大菜单或世界对象。

## 注入接口

- `service`: 真实 `statusCard()`、`interactionTarget()` 和 `respond('accept'|'decline')`
- `getLedger()`: 提供只读 `history()`；不向纯账本直接提交、授册或辞位
- `getPlayer()`: 玩家真实 root.position；用于接近/在场文案，不能替代现场控制器核验
- `titleBridge`: 可选，提供 `titleStatus()`、`releaseTitleAvailability()`、`resignTitle(appointmentId,{confirmed:true})`
- `getDetails()`: 实时住所、名额和御膳投影，形状如下

```js
{
  seat: { occupied: 3, capacity: 4 },
  residenceLabel: '实际寝房名称',
  residenceTarget: actualResidenceTarget,
  meal: {
    label: '当前真实主动作',       // 如前往膳点、享用青蔬膳
    statusLabel: '当前膳单状态',  // 可选，缺省只写库存御膳
    remaining: 97, capacity: 120,
    available: true, reason: '',
    target: actualRoyalMealIntent // 原餐服务生成的原样intent
  }
}
```

所有目标必须有真实 `id` 和有限三坐标 `position`。御膳无有效目标时只显示禁用动作及 `reason`，不造菜品、库存或吃完回执。

`onIntent({kind:'consort-petition',action,target})` 的 action 是 `submit / audience / investiture / read-charter / return / residence / meal`。状态卡先关闭，再由主控转换到原寻路入口。到达后必须重读现场服务状态并执行对应实体动作；`return`、`residence` 只寻路。`meal` 的 target 保留原餐服务 provider/kind 等字段，应交回原服务执行。回调返回 `false` 或 `{ok:false,message}` 会重开状态卡展示失败。

面板仅明确接受/婉拒调用 `service.respond`；未授册不显示已妃。履历默认折叠，其中辞去名位须先点开，再确认或取消；确认前再次读取 bridge 占用条件和同一 appointmentId。取消、关窗和 Escape 都不撤回自荐、退餐或结束现场流程。

返回 `open / close / isOpen / update / menuContext / dispose`，供原 career icon 或真实现场入口复用。主控更新可每帧调用 `update`：稳定数据直接返回，变化只 patch 已有 DOM；正文滚动、履历展开和焦点保留。保存的旧动作回调在语义变化或关窗后失效。

## 定向验证

`node --test tests/consort-petition-ui.mjs` 9 项通过：未授册身份、全部实体动作仅派发意图、原职接受阻塞与独立婉拒、到场沈序未就绪、旧按钮/关窗、滚动/焦点/展开保留、当日拒绝/次日开放、真实餐 intent 与零库存、辞名位二次确认和占用变化。

852×334 的待答复/旧职待薪样例使用实际组件 DOM 与完整 `game.css`，离线 WeasyPrint 布局检查和图片审查通过：身份、结果、待遇、具体阻塞、接受/婉拒同屏；接受禁用且保持44px触控尺寸。仅审图适配浏览器 viewport/env、原生 dialog 居中、打印引擎不支持的 grid 自动排列和 flex 自适应高度；未为渲染器修改产品布局。QA产物留本地 `qa/consort-status-panel/`，未进 Git。此证据不是浏览器、实际游戏链或 iOS 实测，主控接线/真实场景验收由集成批完成。
