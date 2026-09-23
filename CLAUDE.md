# 私人海岛庄园（three.js）——开发交接说明

本文件供 Claude Code 在每次会话开始时读取。项目在 claude.ai 聊天中开发了多轮，以下是必须遵守的约定与当前状态。

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
npm install                 # 本地 three@0.160.0，仅供测试路由；页面本身从 jsdelivr CDN 加载 r160
npm run build               # 生成 dist/island.html（单文件）
npm run test:terrain        # 纯 node，约 1 秒
python3 tests/phys_test.py  # 漫游物理（需 playwright + chromium）
python3 tests/drive_test.py # 汽车/拖拉机驾驶
python3 tests/boat_test.py  # 游艇登船、舱内、航行
python3 tests/cruise_test.py# 游艇自动巡航全程（约 10 分钟模拟）
python3 tests/heli_test.py  # 直升机自动往返 + 手动飞行
python3 tests/shot.py "file://$PWD/dist/island.html" out.png 1920 1080 done 600 "still,clean"
```
- 无头浏览器参数：`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`；CDN 请求被路由到 `node_modules/three`。
- 单次加载在软件渲染下约 60–170 秒，测试脚本超时要给足；多个测试请串行运行。
- 调试地址参数：`#fp`（直接漫游）、`#still`（渲染 3 帧后停止并暴露 `window.__island / __fp / __dbg`）、`#q=high|mid|low`、`#noworker`。

## 架构速览（src/，按构建顺序拼接为一个 ES 模块）
| 文件 | 内容 |
|---|---|
| 00_gen | 画质分档、双后台线程调度（失败回退主线程） |
| 01_util / 02_layout | 工具函数；★全岛布局常量（米制，x 东、z 南、y 上，北为 -z） |
| 03_terrain | 地形：海岸、盆地、崖壁冲沟与岩架、水道、湖、瀑布（FALL）、水田（PADDY）、沙滩、泳池下沉池体 |
| 04_ground / 04b_detail | 地表颜色画布；细节纹理与材质权重图（后台线程执行，注意 if/else 链与变量初始化顺序） |
| 05_scene | 渲染器、天空云、地形着色器（含水下焦散）、海/湖水材质（浅水半透明）、瀑布与粒子 |
| 06_struct_a | 材质、批处理、碰撞登记（COLL / DYN / INTERACT / SEATS / POTS / HIBISCUS）、家具构件库、别墅（三层+屋顶、推拉门、座位）、泳池、住宅楼等 |
| 06_struct_b | 瞭望塔（塔内折返楼梯+观察室）、水闸（下沉式闸门，GATE 状态）、机库、风机、光伏、栈桥、沙滩小品 |
| 07_vehicles | 游艇（可进入的舱室、局部坐标碰撞 YL、座位）、H125、Cybertruck（1:1）、拖拉机 |
| 08b_foliage / 08_vegetation | 叶片贴图集（4×3）、椰子树、整株榕树、灌木、作物、水稻、盆栽花卉 |
| 09_animals | 牲畜禽类（着色器肢体动画 + 游走行为） |
| 10_main | 主流程、相机、阴影、水下状态、主循环 |
| 11_fp | 漫游：物理、碰撞（高度带）、游泳潜水、交互、坐卧、小地图、传送 |
| 12_grass | 近景草叶 |
| 13_drive | 地面车辆驾驶 |
| 14_boat | 游艇移动平台（DYN 每帧换算）、驾驶、自动巡航、登离船 |
| 15_marine | 鱼群（Boids）与两只可互动海豚 |
| 16_heli | 直升机手动飞行与停机坪⇄别墅屋顶超低空自动飞行 |

## 关键机制
- 碰撞体都带高度带 `bottom/top`（`inBand`）；可行走面有 `rect / ramp / poly` 三种，`cond` 可按状态开关（如闸门关闭时）。
- 游艇上的一切在船体局部坐标 `YL` 定义，`syncBoat()` 每帧换算到 `DYN`；只有 `st.onBoat` 为真时才使用船上可行走面（必须按 E 登船）。
- 座位 `SEATS`（世界坐标）与 `BOAT.seats`（随船的 getter）统一由 `sitDown/standUp` 处理。
- 交互 `INTERACT` 条目可用 getter 做动态位置，`label` 可为函数，`fn` 执行动作。

## 待办与已知问题
见 `docs/HANDOVER.md`。
