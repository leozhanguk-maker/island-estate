# 私人海岛庄园（three.js）——开发交接说明

本文件供 Claude Code 在每次会话开始时读取。项目在 claude.ai 聊天中开发了多轮，以下是必须遵守的约定与当前状态。

## 时间
所有时间一律使用新加坡时间（GMT+8），包括汇报、docs/NIGHTLY.md、ISSUES.md 和提交说明。书写格式为 2026-09-25 04:30（新加坡时间），不得出现 UTC 时间。

## 沟通与工作方式
- 全程使用纯中文（代码注释也用中文）；回复直接、专业，不要铺垫。
- 每轮修改后必须：`npm run build` → 跑相关测试 → 必要时截图核对画面，再汇报。
- 汇报时如实说明哪些已验证、哪些未验证。

## 不得改动的定稿约束
- 设施位置、数量、道路走向与坡度（`src/02_layout.js` 与道路样条）。`tests/terrain_test.mjs` 会校验关键点高程与各路最大坡度。
- 崖壁改造只在外海岸 12 米内，避开水道峡谷、风机、道路两侧 6 米。
- 画质保持“高”档不压缩，性能优化等用户确认成品后再做（高档当前约 400 万三角面）。

## 构建与测试
```bash
npm install                      # 本地 three@0.160.0，仅供测试路由；页面本身从 jsdelivr CDN 加载 r160
pip install -r requirements.txt  # playwright==1.56.0、pillow、numpy，见下方说明
npm run build                    # 生成 dist/island.html（单文件）
npm run check                    # 合并前门禁：构建 + 以下全部快速检查，任一失败即不得合并（约 5 分钟）
```
| 命令 | 作用 | 输出 |
|---|---|---|
| `npm run test:terrain` | 地形关键点高程、道路坡度（纯 node，约 1 秒） | 终端 |
| `npm run test:invariants` | 基线不变量：共享几何体未被原地变换、泳池/别墅关键高程、设施与碰撞数量、三角面数 | 终端 |
| `npm run test:baselines` | 跑 phys/drive/boat/cruise/heli 五个测试并断言基线数值 | 终端 |
| `npm run test:regression` | 已修复程序缺陷的回归用例（编号对应 ISSUES.md），问题复发即失败 | 终端 |
| `npm run test:ecology` | 水域生态：各水域物种数量、淡水/海水不混用、生物不离开所属水域、不钻底不出水、推进 30 秒无 NaN、生态绘制调用预算 | 终端 |
| `npm run test:visual` | 视觉回归：10 个固定机位与 `tests/baseline/visual/` 逐像素比对（阈值 1%，截图前固定动画时刻） | `reports/visual/` |
| `npm run patrol` | 巡逻机器人：自动漫游、游泳、开车、开船、开直升机，检测报错、NaN、穿地、越界、卡住、穿墙、掉帧（按日期取种子，约 2 分钟） | `reports/patrol/report.md` |
| `npm run patrol:quick` | 快速巡逻，固定种子 1，发现新问题即失败（门禁用；"掉帧"只报告不判失败） | 同上 |
| `npm run audit:scene` | 场景体检：悬空/埋地、碰撞体重叠、可行走面未登记、构件无碰撞、座位不可达、共面闪烁、误沉水下、植被悬空/埋地（加 `--strict` 发现新问题即失败） | `reports/audit/report.md` |
| `npm run shots` | 截图巡检：固定机位 + 随机机位 + 问题特写，自动初筛后拼成总览图，须人工按 `docs/VISUAL_CHECKLIST.md` 审阅 | `reports/shots/` |
- 复现巡逻问题：`python3 tests/patrol.py --seed=<种子> --repro=<计划编号>`（报告里每条问题都附有这条命令和人工步骤）。
- 更新基线：`python3 tests/visual_regression.py --update`、`python3 tests/invariants.py --update`。
- 测试框架在 `tests/lib/`：`harness.py`（启动页面、收集报错）、`sim.js`（复刻主循环单步推进与检测器）、`audit_scene.js`（体检检查项）、`views.py`（机位、图像比对）。
- 调试模式额外暴露 `window.__statics`（烘焙前的建筑构件分组与 THREE），供体检逐个检查构件。
- 旧的单项脚本仍可直接运行：`python3 tests/phys_test.py`、`drive_test.py`、`boat_test.py`、`cruise_test.py`、`heli_test.py`、`tests/shot.py`。它们只打印数据，通过与否以 `test:baselines` 为准。
- playwright 固定为 1.56.0：云端容器预装的是 chromium-1194（`/opt/pw-browsers`），正好对应 1.56.0；更新版本（如 1.63 需要 chromium-1243）会找不到浏览器。**不要运行 `playwright install`**，也不要升级 playwright。
- 无头浏览器参数：`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`；CDN 请求被路由到 `node_modules/three`。
- 软件渲染下单次加载约 10–40 秒（旧记录 60–170 秒），测试脚本超时要给足；多个浏览器测试请串行运行。
- 调试地址参数：`#fp`（直接漫游）、`#still`（渲染 3 帧后停止并暴露 `window.__island / __fp / __dbg / __statics`）、`#q=high|mid|low`、`#noworker`、`#clean`（隐藏界面）。

## 铁律
1. **定稿约束不动**：设施位置、数量、道路走向与坡度、崖壁改造范围、高档画质（见上一节）。改到这些的方案一律先问用户。
2. **共享几何体、共享材质不得原地修改**：`box()` 等构件函数共用 `BOXG` 这类全局几何体，对返回网格的 `geometry` 做 `translate/rotate/scale/applyMatrix4` 会波及全岛（BOXG 事故：尾桨一行代码让所有建筑构件上移、泳池冒出地面、别墅首层墙体浮空）。要偏移就套一层 Group，或先 `clone()` 再改。`test:invariants` 专门守这一条。
3. **合并前必须 `npm run check` 全绿**，并如实汇报哪些已验证、哪些未验证。不许为了变绿而跳过、删除、放宽测试。
4. **基线不随手改**：地形基线、视觉基线、数量基线、物理基线的任何改动，都必须单独一个提交，写明原因和前后对比；视觉基线变更附对比图。
5. **每个修复都要有复现和回归**：先用工具或脚本复现，再修；修完要有一条测试（体检检查项、不变量、基线断言或巡逻签名）能在问题复发时失败。
6. **问题只记一处**：所有问题记在 `docs/ISSUES.md`（程序缺陷 / 视觉缺陷 / 审美建议），工具签名登记在 `tests/known_issues.json` 并注明编号；修好后两处同步更新。
7. **审美建议只记录不改动**，除非用户明确要求。
8. **视觉改动必须截图核对**：改动前后在同一机位各截一张，放进 PR 描述。
9. **不引入新依赖、不升级 three/playwright**，除非用户同意。

## 修复流程（每个问题都按此执行）
1. 在 `docs/ISSUES.md` 找到或新建条目，状态改为"修复中"。
2. **复现**：巡逻问题用 `--repro` 命令，体检问题用 `npm run audit:scene`，视觉问题用 `npm run shots` 或 `views.py` 里的机位截图。记下修复前的截图或数值。
3. **定位根因**，写进条目的"原因"一栏。不做只掩盖现象的修补（例如为了过测试而改检测阈值）。
4. **修改**：只改必要的代码，遵守上面的铁律。
5. **验证**：`npm run build` → 针对该问题的检查（复现命令应不再出现）→ `npm run check` 全绿 → 视觉相关的在同一机位截图对比。
6. **收尾**：从 `tests/known_issues.json` 删除对应签名；如果检测器原先没覆盖这个问题，补一条检查；在 ISSUES.md 标"已修复（提交号）"。
7. 修不了或不该修的：状态改为"暂缓"或"无需处理"，写明原因。

## 合并策略
- **分支**：每个主题一个分支、一个 PR；不直接向 `main` 推送未经门禁的改动。
- **程序缺陷**（逻辑、物理、碰撞、数据）：`npm run check` 全绿、视觉回归无差异后，可以合并到 `main`。PR 描述写明复现方式、根因、验证结果。
- **视觉修改**（任何会改变画面的改动，包括更新视觉基线）：开 PR 并附同机位的修改前后对比图，**等用户审阅**，不自行合并。
- **审美建议**：只写进 ISSUES.md，不改代码。
- **基线变更**：单独提交、写明原因；视觉基线变更按"视觉修改"处理。
- **叠加的 PR**：依赖另一个未合并的 PR 时，以它的分支为目标分支；等它合并后再把目标改回 `main`。
- **合并方式**：优先 squash 合并，提交说明用中文写清改了什么、为什么改。

## 架构速览（src/，按构建顺序拼接为一个 ES 模块）
| 文件 | 内容 |
|---|---|
| 00_gen | 画质分档、双后台线程调度（失败回退主线程） |
| 01_util / 02_layout | 工具函数；★全岛布局常量（米制，x 东、z 南、y 上，北为 -z） |
| 03_terrain | 地形：海岸、盆地、崖壁冲沟与岩架、水道、湖、瀑布（FALL）、水田（PADDY）、沙滩、泳池下沉池体 |
| 04_ground / 04b_detail | 地表颜色画布；细节纹理与材质权重图（后台线程执行，注意 if/else 链与变量初始化顺序） |
| 05_scene | 渲染器、天空云、地形着色器（含水下焦散）、海/湖水材质（浅水半透明）、瀑布与粒子 |
| 06_struct_a | 材质、批处理、碰撞登记（COLL / DYN / INTERACT / SEATS / POTS / HIBISCUS）、家具构件库、别墅（三层+屋顶、推拉门、座位）、泳池、住宅楼等 |
| 06_struct_b | 瞭望塔（塔内折返楼梯+观察室）、水闸（下沉式通透栅栏闸门，GATE 状态）、机库、风机、光伏、栈桥、沙滩小品 |
| 07_vehicles | 游艇（可进入的舱室、局部坐标碰撞 YL、座位）、H125、Cybertruck（1:1）、拖拉机 |
| 08b_foliage / 08_vegetation | 叶片贴图集（4×3）、椰子树、整株榕树、灌木、作物、水稻、盆栽花卉 |
| 09_animals | 牲畜禽类（着色器肢体动画 + 游走行为） |
| 10_main | 主流程、相机、阴影、水下状态、主循环 |
| 11_fp | 漫游：物理、碰撞（高度带）、游泳潜水、交互、坐卧、小地图、传送 |
| 12_grass | 近景草叶 |
| 13_drive | 地面车辆驾驶 |
| 14_boat | 游艇移动平台（DYN 每帧换算）、驾驶、自动巡航、登离船 |
| 15_marine | 两只可互动海豚（鱼群已移到 17_eco） |
| 16_heli | 直升机手动飞行与停机坪⇄别墅屋顶超低空自动飞行 |
| 17a～17e_eco | 三水域生态：分区与几何/材质/LOD/群集框架（a）、淡水湖（b）、闸内港口与沙滩（c）、外海鲸群鱼群（d）、各水域水下雾色能见度焦散与丁达尔光（e） |

## 关键机制
- 碰撞体都带高度带 `bottom/top`（`inBand`）；可行走面有 `rect / ramp / poly` 三种，`cond` 可按状态开关（如闸门关闭时）。
- 游艇上的一切在船体局部坐标 `YL` 定义，`syncBoat()` 每帧换算到 `DYN`；只有 `st.onBoat` 为真时才使用船上可行走面（必须按 E 登船）。
- 座位 `SEATS`（世界坐标）与 `BOAT.seats`（随船的 getter）统一由 `sitDown/standUp` 处理。
- 交互 `INTERACT` 条目可用 getter 做动态位置，`label` 可为函数，`fn` 执行动作。
- 漫游时小地图下方的坐标栏显示 `X Y Z 朝向`，与程序坐标一致：步行时 Y 为脚底高度，可直接用作 `teleport(x, z, yaw, y)` 的参数；驾驶时为载具坐标。朝向是罗盘方位（0° 正北、顺时针），对应 `yaw = -朝向（弧度）`。用户报告问题时可按这组数字定位。出生点在别墅南门外（`START`）。

## 待办与已知问题
- 问题清单：`docs/ISSUES.md`（唯一来源）；截图审阅清单：`docs/VISUAL_CHECKLIST.md`；每晚巡检报告：`docs/NIGHTLY.md`。
- 开发历程与交接：`docs/HANDOVER.md`。
