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
