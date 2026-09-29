// 外置资源：模型等文件放在页面旁的 assets/ 目录，运行时按相对路径读取（构建时由 public/assets 原样复制）
export const assetUrl = (name: string): string => new URL(`assets/${name}`, document.baseURI).href;

export async function loadAsset(name: string): Promise<ArrayBuffer> {
  const res = await fetch(assetUrl(name));
  if (!res.ok) throw new Error(`资源加载失败：assets/${name}（HTTP ${res.status}）`);
  return res.arrayBuffer();
}
