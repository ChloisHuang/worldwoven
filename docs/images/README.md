# 四国场景配图

这四张图片用于仓库首页的场景介绍，展示当前游戏的建筑与布局。

- 来源：源码提交 `66ef94b699e1cf705f194bf94d1e228ebc47344f` 中的生产场景构建器。
- 制作：从真实场景几何导出，以 Blender 4.3.2 离线渲染；保留源码中的模型、实例变换与颜色，采用示意日光和独立介绍机位。
- 范围：建筑场景预览，未运行居民行为与游戏界面。浏览器使用 Three.js 实时渲染，材质、光影和动态效果会有所不同。
- 格式：1280 × 800 WebP；README 中的图片可点击查看大图。

| 配图 | 场景 | 源码 |
| --- | --- | --- |
| [china.webp](china.webp) | 中国 · 承光宫苑 | [regions-east.js](../../source/game/regions-east.js) → [china-palace.js](../../source/game/china-palace.js) |
| [japan.webp](japan.webp) | 日本 · 云隐汤馆 | [japan-bathhouse.js](../../source/game/japan-bathhouse.js) |
| [egypt.webp](egypt.webp) | 埃及 · 沙海金字塔 | [egypt-temple.js](../../source/game/egypt-temple.js) |
| [france.webp](france.webp) | 法国 · 白鸢王宫 | [regions-west.js](../../source/game/regions-west.js) |

这些图片不是浏览器实机截图，也不是另行生成的概念美术。场景没有为配图重新设计；使用相机视锥裁剪减少离线渲染负担。

项目及第三方组件的许可说明见[仓库首页](../../README.md#致谢与许可)。
