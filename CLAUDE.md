# 私人海岛庄园（three.js）——开发交接说明

本文件供 Claude Code 在每次会话开始时读取。项目在 claude.ai 聊天中开发了多轮，以下是必须遵守的约定与当前状态。

## 时间
所有时间一律使用新加坡时间（GMT+8），包括汇报、docs/NIGHTLY.md、ISSUES.md 和提交说明。书写格式为 2026-09-25 04:30（新加坡时间），不得出现 UTC 时间。

## 沟通与工作方式
- 全程使用纯中文（代码注释也用中文）；回复直接、专业，不要铺垫。
- 每轮修改后必须：`bun run build` → 跑相关测试 → 必要时截图核对画面，再汇报。
- 汇报时如实说明哪些已验证、哪些未验证。

## 不得改动的定稿约束
- 设施位置、数量、道路走向与坡度（`src/core/layout.ts` 与道路样条）。`tests/terrain.test.ts` 会校验关键点高程与各路最大坡度。
- 崖壁改造只在外海岸 12 米内，避开水道峡谷、风机、道路两侧 6 米。
- 画质保持“高”档不压缩，性能优化等用户确认成品后再做（高档当前约 400 万三角面）。

## 技术栈与工程结构
- **Bun 1.3**：包管理（`bun install`，锁文件 `bun.lock`）、打包（`Bun.build`，见 `build.ts`）、开发服务器、纯逻辑测试（`bun test`）。
- **TypeScript**（`tsconfig.json`，strict）：`bun run typecheck` 用 `tsc` 做类型检查。现有模块由拼接式全局脚本机械转换而来，文件头有 `// @ts-nocheck`，补齐类型后逐个去掉；**新写的文件不得加 `@ts-nocheck`**。
- **ES 模块**：每个文件显式 `import`/`export`，没有全局共享作用域；导入的绑定不能在模块外赋值，需要时由所属模块提供 setter（如 `setGh`、`setFpApi`）。
- **three.js r160**（npm 依赖，打包进页面，不再走 CDN）：统一从 `src/three.ts` 引入 `THREE`（已合并 OrbitControls、GLTFLoader、MeshoptDecoder、BufferGeometryUtils）。
- **Biome**（`biome.json`）：`bun run lint`，检查未声明变量、未使用导入等。格式化暂未启用（全量格式化会产生巨大 diff，单独安排）。
- **产物**：`dist/island.html`（单个 HTML，内联全部代码，含 three.js 与后台线程）+ `dist/assets/`（外置资源，源自 `public/assets/`）。`dist/` 不进 git。
- **资源外置**：页面必须经 http 打开（浏览器禁止 `file://` 页面读取旁边文件）；运行时用 `src/core/assets.ts` 的 `loadAsset()` 读取。新增模型、贴图、音频一律放 `public/assets/`，不得再内嵌 base64。

## 构建与测试
```bash
bun install                      # 安装依赖（three、typescript、biome 等）
pip install -r requirements.txt  # playwright==1.56.0、pillow、numpy，见下方说明
bun run dev                      # 开发：构建并起本地服务，改动 src/ 后自动重新构建、页面自动刷新（默认 http://localhost:5173/island.html#fp）
bun run build                    # 生成 dist/island.html 与 dist/assets/
bun run preview                  # 本地打开 dist/（默认 http://localhost:4173/island.html）
bun run check                    # 合并前门禁：构建 + 类型检查 + lint + 以下全部检查，任一失败即不得合并
```
| 命令 | 作用 | 输出 |
|---|---|---|
| `bun run test:terrain` | 地形关键点高程、道路坡度（`bun test`，约 1 秒） | 终端 |
| `bun run test:shore` | 海岸坐标场（新海面用）：离岸距离、涌浪到达时间、迎浪程度、无 NaN（`bun test`） | 终端 |
| `bun run test:invariants` | 基线不变量：共享几何体未被原地变换、泳池/别墅关键高程、设施与碰撞数量、三角面数 | 终端 |
| `bun run test:baselines` | 跑 phys/drive/boat/cruise/heli 五个测试并断言基线数值 | 终端 |
| `bun run test:regression` | 已修复程序缺陷的回归用例（编号对应 ISSUES.md），问题复发即失败 | 终端 |
| `bun run test:ecology` | 水域生态：各水域物种数量、淡水/海水不混用、生物不离开所属水域、不钻底不出水、推进 30 秒无 NaN、生态绘制调用预算 | 终端 |
| `bun run test:visual` | 视觉回归：10 个固定机位与 `tests/baseline/visual/` 逐像素比对（阈值 1%，截图前固定动画时刻） | `reports/visual/` |
| `bun run patrol` | 巡逻机器人：自动漫游、游泳、开车、开船、开直升机，检测报错、NaN、穿地、越界、卡住、穿墙、掉帧（按日期取种子，约 2 分钟） | `reports/patrol/report.md` |
| `bun run patrol:quick` | 快速巡逻，固定种子 1，发现新问题即失败（门禁用；"掉帧"只报告不判失败） | 同上 |
| `bun run audit:scene` | 场景体检：悬空/埋地、碰撞体重叠、可行走面未登记、构件无碰撞、座位不可达、共面闪烁、误沉水下、植被悬空/埋地（加 `--strict` 发现新问题即失败） | `reports/audit/report.md` |
| `bun run shots` | 截图巡检：固定机位 + 随机机位 + 问题特写，自动初筛后拼成总览图，须人工按 `docs/VISUAL_CHECKLIST.md` 审阅 | `reports/shots/` |
- 复现巡逻问题：`python3 tests/patrol.py --seed=<种子> --repro=<计划编号>`（报告里每条问题都附有这条命令和人工步骤）。
- 更新基线：`python3 tests/visual_regression.py --update`、`python3 tests/invariants.py --update`。
- 测试框架在 `tests/lib/`：`harness.py`（启动页面、收集报错）、`sim.js`（复刻主循环单步推进与检测器）、`audit_scene.js`（体检检查项）、`views.py`（机位、图像比对）。
- 调试模式额外暴露 `window.__statics`（烘焙前的建筑构件分组与 THREE），供体检逐个检查构件。
- 旧的单项脚本仍可直接运行：`python3 tests/phys_test.py`、`drive_test.py`、`boat_test.py`、`cruise_test.py`、`heli_test.py`、`tests/shot.py`。它们只打印数据，通过与否以 `test:baselines` 为准。
- playwright 固定为 1.56.0：云端容器预装的是 chromium-1194（`/opt/pw-browsers`），正好对应 1.56.0；更新版本（如 1.63 需要 chromium-1243）会找不到浏览器。**不要运行 `playwright install`**，也不要升级 playwright。
- 无头浏览器参数：`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`；`tests/lib/harness.py` 在进程内起静态服务提供 `dist/`，页面经 http 打开（`harness.PAGE`）。
- 软件渲染下单次加载约 10–40 秒（旧记录 60–170 秒），测试脚本超时要给足；多个浏览器测试请串行运行。
- 调试地址参数：`#oldsea`（原海面）、`#seadbg`（海面泡沫通道）、`#fp`（直接漫游）、`#still`（渲染 3 帧后停止并暴露 `window.__island / __fp / __dbg / __statics`）、`#q=high|mid|low`、`#noworker`、`#clean`（隐藏界面）。

## 铁律
1. **定稿约束不动**：设施位置、数量、道路走向与坡度、崖壁改造范围、高档画质（见上一节）。改到这些的方案一律先问用户。
2. **共享几何体、共享材质不得原地修改**：`box()` 等构件函数共用 `BOXG` 这类全局几何体，对返回网格的 `geometry` 做 `translate/rotate/scale/applyMatrix4` 会波及全岛（BOXG 事故：尾桨一行代码让所有建筑构件上移、泳池冒出地面、别墅首层墙体浮空）。要偏移就套一层 Group，或先 `clone()` 再改。`test:invariants` 专门守这一条。
3. **合并前必须 `bun run check` 全绿**，并如实汇报哪些已验证、哪些未验证。不许为了变绿而跳过、删除、放宽测试。
4. **基线不随手改**：地形基线、视觉基线、数量基线、物理基线的任何改动，都必须单独一个提交，写明原因和前后对比；视觉基线变更附对比图。
5. **每个修复都要有复现和回归**：先用工具或脚本复现，再修；修完要有一条测试（体检检查项、不变量、基线断言或巡逻签名）能在问题复发时失败。
6. **问题只记一处**：所有问题记在 `docs/ISSUES.md`（程序缺陷 / 视觉缺陷 / 审美建议），工具签名登记在 `tests/known_issues.json` 并注明编号；修好后两处同步更新。
7. **审美建议只记录不改动**，除非用户明确要求。
8. **视觉改动必须截图核对**：改动前后在同一机位各截一张，放进 PR 描述。
9. **不引入新依赖、不升级 three/playwright**，除非用户同意。

## 修复流程（每个问题都按此执行）
1. 在 `docs/ISSUES.md` 找到或新建条目，状态改为"修复中"。
2. **复现**：巡逻问题用 `--repro` 命令，体检问题用 `bun run audit:scene`，视觉问题用 `bun run shots` 或 `views.py` 里的机位截图。记下修复前的截图或数值。
3. **定位根因**，写进条目的"原因"一栏。不做只掩盖现象的修补（例如为了过测试而改检测阈值）。
4. **修改**：只改必要的代码，遵守上面的铁律。
5. **验证**：`bun run build` → 针对该问题的检查（复现命令应不再出现）→ `bun run check` 全绿 → 视觉相关的在同一机位截图对比。
6. **收尾**：从 `tests/known_issues.json` 删除对应签名；如果检测器原先没覆盖这个问题，补一条检查；在 ISSUES.md 标"已修复（提交号）"。
7. 修不了或不该修的：状态改为"暂缓"或"无需处理"，写明原因。

## 合并策略
- **分支**：每个主题一个分支、一个 PR；不直接向 `main` 推送未经门禁的改动。
- **程序缺陷**（逻辑、物理、碰撞、数据）：`bun run check` 全绿、视觉回归无差异后，可以合并到 `main`。PR 描述写明复现方式、根因、验证结果。
- **视觉修改**（任何会改变画面的改动，包括更新视觉基线）：开 PR 并附同机位的修改前后对比图，**等用户审阅**，不自行合并。
- **审美建议**：只写进 ISSUES.md，不改代码。
- **基线变更**：单独提交、写明原因；视觉基线变更按"视觉修改"处理。
- **叠加的 PR**：依赖另一个未合并的 PR 时，以它的分支为目标分支；等它合并后再把目标改回 `main`。
- **合并方式**：优先 squash 合并，提交说明用中文写清改了什么、为什么改。

## 架构速览（src/，ES 模块；入口 `main.ts` 按下表顺序引入，最后由 `app/main.ts` 执行主流程）
| 模块 | 内容 |
|---|---|
| `three.ts` | three.js 统一入口（核心 + 用到的附加模块） |
| `core/generate` | 画质分档、双后台线程调度（失败回退主线程） |
| `core/util` / `core/layout` | 工具函数；★全岛布局常量（米制，x 东、z 南、y 上，北为 -z） |
| `core/assets` | 外置资源路径与加载（`loadAsset`） |
| `terrain/terrain` | 地形：海岸、盆地、崖壁冲沟与岩架、水道、湖、瀑布（FALL）、水田（PADDY）、沙滩、泳池下沉池体 |
| `terrain/shore` | 海岸坐标场（后台线程）：离岸距离/方向、坡度、迎浪程度、涌浪到达时间，供新海面使用 |
| `terrain/ground` / `terrain/detail` | 地表颜色画布；细节纹理与材质权重图（后台线程执行，注意 if/else 链与变量初始化顺序） |
| `worker/entry` | 后台线程入口（单独打包，以文本内联进页面，由 `core/generate` 生成 Blob 启动） |
| `render/scene` | 渲染器、天空云、地形着色器（含水下焦散）、海/湖水材质（浅水半透明）、瀑布与粒子 |
| `render/sea` | 新海面：FFT 风浪、涌浪折射、碎浪、Beer–Lambert 水体（减配移植自 ShoreBreak，MIT，见 docs/SEA.md；泡沫已按用户要求取消）；`#oldsea` 回退原海面 |
| `structures/villa` | 材质、批处理、碰撞登记（COLL / DYN / INTERACT / SEATS / POTS / HIBISCUS）、家具构件库、别墅（三层+屋顶、推拉门、座位）、泳池、住宅楼等；地面高程函数 `gh`（`setGh` 设置） |
| `structures/desk` | 别墅三层书房桌椅：用户提供的 GLB（`public/assets/mac_desk.glb`）异步加载，失败退回程序化书桌 |
| `structures/kitchen` | 厨房馆（别墅西侧）与北侧公共卫生间 |
| `structures/bath` | 高端卫浴洁具库（马桶、蹲便、浴室柜、浴缸、淋浴湿区、小便斗、毛巾架） |
| `structures/facilities` | 瞭望塔、水闸（GATE 状态）、机库、风机、光伏、栈桥、沙滩小品 |
| `structures/dorm` | 宿舍楼（两梯四户、电梯、户门） |
| `vehicles/models` | 游艇（可进入的舱室、局部坐标碰撞 YL、座位）、H125、Cybertruck（1:1）、拖拉机 |
| `vehicles/cybertruck` | Cybertruck 外观：用户提供的 GLB（`public/assets/cybertruck.glb`） |
| `vehicles/drive` / `vehicles/horn` | 地面车辆驾驶；四种载具喇叭 |
| `vehicles/boat` | 游艇移动平台（DYN 每帧换算）、驾驶、自动巡航、登离船；漫游接口 `FP_API`（`setFpApi` 设置） |
| `vehicles/heli` | 直升机手动飞行与停机坪⇄别墅屋顶超低空自动飞行 |
| `nature/foliage` / `nature/vegetation` | 叶片贴图集（4×3）、椰子树、整株榕树、灌木与草莓、作物、葡萄园、水稻、盆栽花卉 |
| `nature/animals` / `nature/grass` | 牲畜禽类（着色器肢体动画 + 游走行为）；近景草叶 |
| `eco/core` … `eco/upper` | 三水域生态：分区与几何/材质/LOD/群集框架（core）、淡水湖（lake）、闸内港口与沙滩（lagoon）、外海鲸群鱼群（ocean）、水下雾色焦散丁达尔光（water）、鸣笛召唤跟船（show）、瀑布上方小水池（upper） |
| `eco/marine` / `eco/egret` | 两只可互动海豚；闸口沙滩小白鹭 |
| `app/main` | 主流程、相机、阴影、水下状态、主循环 |
| `app/walk` | 漫游：物理、碰撞（高度带）、游泳潜水、交互、坐卧、小地图、传送 |

## 关键机制
- 碰撞体都带高度带 `bottom/top`（`inBand`）；可行走面有 `rect / ramp / poly` 三种，`cond` 可按状态开关（如闸门关闭时）。
- 游艇上的一切在船体局部坐标 `YL` 定义，`syncBoat()` 每帧换算到 `DYN`；只有 `st.onBoat` 为真时才使用船上可行走面（必须按 E 登船）。
- 座位 `SEATS`（世界坐标）与 `BOAT.seats`（随船的 getter）统一由 `sitDown/standUp` 处理。
- 交互 `INTERACT` 条目可用 getter 做动态位置，`label` 可为函数，`fn` 执行动作。
- 漫游时小地图下方的坐标栏显示 `X Y Z 朝向`，与程序坐标一致：步行时 Y 为脚底高度，可直接用作 `teleport(x, z, yaw, y)` 的参数；驾驶时为载具坐标。朝向是罗盘方位（0° 正北、顺时针），对应 `yaw = -朝向（弧度）`。用户报告问题时可按这组数字定位。出生点在别墅南门外（`START`）。

## 待办与已知问题
- 问题清单：`docs/ISSUES.md`（唯一来源）；截图审阅清单：`docs/VISUAL_CHECKLIST.md`；每晚巡检报告：`docs/NIGHTLY.md`。
- 开发历程与交接：`docs/HANDOVER.md`。
