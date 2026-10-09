# 埃及纸莎草原单工案

CR01 / CR02 / CR06 / W03 子批；不关闭四国母项。角色/工资/有限库存边界见 `docs/PROJECT_CHECKLIST.md` 与 `docs/CAREER_COVERAGE.md`。

## 定向证据

- `tests/egypt-artisan-role-contracts.mjs`：当地申请/审核、固定16/半班8埃及券、原单艺术10XP/共享成长上限、保存失败与重复工资。
- `tests/egypt-artisan-duty.mjs`：7项实际服务控制器测试；定时领料/描绘/验收、同号纸/颜料、取消后NPC接原卷、持卷冷恢复、忙碌阿赫/萨米拉日需优先、8份耗尽后30模拟日不补货、损坏存档拒绝。人物位置/直线导航为明确组件夹具。
- `tests/egypt-kitchen-duty.mjs`：直接依赖原萨米拉餐需10项通过；未重跑无关日/中/法长链。
- `tests/egypt-artisan-main.cjs`：原生产main、16原NPC、真实连续导航与Three。初始艺术/文书1、可通过审核种子与下一日06:00窗口为明确测试前提；没有预置委托、耗料、完成标记或工资。原当地申请/审批→安全接班→记原单/领料/描样/绘制/携原卷/阿赫本人验收→交班链已过。首个44秒短班正确取整0券，测试不能据此要求赠1券；从原持卷完整冷恢复续走并真实候班后120.4秒有效工时一次结1埃及券通过（20.462秒/整树440.559MiB）。
- 主场景执行仅在 `/workspace/shared/worldwoven-heavy-scene.lock` 下串行；node heap768MiB，整树1152MiB，180秒守护。

## 原场景离线视觉

从 `qa/egypt-artisan/held-scroll-checkpoint.json` 恢复实际main持卷现场，使用原camera碰撞解析、FOV50/距离4.6m。`export.cjs` 导出真实已评估网格，复用 `development/yunlai-layout/render-main.py` 的离线Blender近似漫反射；裁剪局部场景，不改变原人物坐标/姿态或玩法。原云Mesa依赖目录缺失，非生产shader、浏览器或iOS验证。

- `qa/egypt-artisan/held-view/original-held-scroll.png`：已亲看。首图持卷低于原台面，双手统一提到1.25m后重看，原卷离案由双手托持、原书案/学习卷保留。只复验这一姿态，不重跑已过业务。
- 最终导出18.654秒/整树438.301MiB，渲染17.243秒/整树374.844MiB。截图/临时网格/Blend不入Git。

调用示例：先运行主场景产生检查点，再用 `EGYPT_ARTISAN_RESUME=qa/egypt-artisan/held-scroll-checkpoint.json EGYPT_ARTISAN_RENDER_ONLY=1` 同一受限主场景命令导出。主场景测试默认保留已有断点和完成证据；环境变量 `EGYPT_ARTISAN_STOP_HELD=1` 可只取得原持卷断点。

当前缺口：完整工坊采购/财政与补充需求、其他原工匠/接待/卷轴职业，浏览器/iOS和整体美术接受仍开放。现有两份旧摘段测试在本批路径之前缺 `chinaUsurpationActions` 夹具，不扩修或冒称通过。654入口登记仅核清单。
