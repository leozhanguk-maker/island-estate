# 外部模型资源

## assets/mac_desk.glb：别墅三层书房桌椅（用户提供）

- **来源**：2026-09-28（新加坡时间）用户上传的 `mac_desk_claude.rar` 中的 `mac_desk_claude.glb`（Blender glTF 导出，55 MB，约 79 万三角面、126 张贴图）。内容：白色长桌（2.4 × 0.75 m，高 0.72 m）、白色木椅、Studio Display、Mac Studio、MacBook、iPad、iPhone、Vision Pro、键盘、鼠标、桌垫、笔记本，以及摄影棚道具。
- **用途**：替换别墅三层书房原来的程序化书桌、iMac 与办公椅（`src/06d_desk.js`），位置与原书桌相同，背靠北面落地窗。
- **处理**（工具不进入项目依赖，在临时目录 `npm install @gltf-transform/cli@4` 后运行）：
  1. `node tools/asset_desk_clean.mjs 原文件.glb a.glb`：
     - 去掉摄影棚道具：墙地、反光板、书架、目标点；
     - 去掉悬空 1.5 m 的 USB-C 小件、原点处的键帽模板、两根重复桌腿；
     - 8 个脚垫原先都堆在原点，移到各自的桌腿、椅腿下；
     - 玻璃透射材质改为普通半透明，因为透射要把整个场景额外渲染一遍。
  2. `gltf-transform dedup a.glb b.glb`
  3. `gltf-transform weld b.glb c.glb`
  4. `gltf-transform simplify c.glb d.glb --ratio 0.12 --error 0.002`
  5. `gltf-transform resize d.glb e.glb --width 512 --height 512`
  6. `gltf-transform webp e.glb f.glb --quality 80`
  7. `gltf-transform meshopt f.glb mac_desk.glb --level high`
- **结果**：5.07 MB、约 23 万三角面。构建时以 base64 内嵌为 `ASSET_DESK_GLB`，页面约增大 6.6 MB。页面用 three.js r160 自带的 GLTFLoader 与 meshopt 解码器加载（同一 CDN 版本，不是新依赖）；加载失败时退回原程序化书桌。
- **回归**：`tests/invariants.py` 2n：模型已加载，桌脚落在三层楼板上，整套在书房内，桌椅碰撞与座位已登记。

## assets/cybertruck.glb：Cybertruck 外观（用户提供）

- **来源**：2026-09-28（新加坡时间）用户上传的 `cybertruck_cybertruck_googlepoly.glb`（约 1 MB，低多边形风格）。只有外壳：单面、没有座椅与内饰，所以只用作外观，不能从车内看。
- **用途**：替换停车场可驾驶 Cybertruck 的程序化车身（`src/07c_cybertruck.js`）。驾驶、碰撞、座位、喇叭都沿用原车；驾驶位视角仍用原程序化座舱。
- **处理**（工具同上，不进入项目依赖）：
  1. `gltf-transform weld 原文件.glb a.glb`
  2. `gltf-transform meshopt a.glb cybertruck.glb --level high`
- **结果**：约 340 KB，构建时以 base64 内嵌为 `ASSET_CT_GLB`。
- **摆放**（加载时换算，不改模型文件）：
  - 模型车头朝 -z、横向为 x。纵向与高度按实车长 5.683 m 等比缩放，保留模型原有造型，车高约 2.1 m；横向缩到 0.25，车身宽约 2.17 m。
  - 四个车轮（Sphere 节点）从车身拆出，烘焙为以轮心为原点的几何体，按半径 0.445 m 放大后挂进原有的转向与滚动节点，行驶时照常滚动、前轮转向。
  - 模型所有材质都是金属度 0.4、粗糙度约 0.2，黑色轮胎在场景里会反光发灰。加载时做了以下修正：
    - 轮胎改为橡胶；
    - 轮毂盖改为哑光金属；
    - 前灯带、尾灯改为自发光。
  - 加载失败时保留原程序化车身。
- **回归**：`tests/invariants.py` 2p：
  - 模型已加载，车身长约 5.683 m，离地；
  - 四个车轮都换成模型车轮，轮底贴地，高 0.89 m；
  - 车身里不再留有模型车轮。
