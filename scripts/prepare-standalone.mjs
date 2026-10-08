// standalone 产物后处理：打包前跑一次。
//
// Next 的 output:standalone 只生成 server.js + 精简 node_modules + .next/server，
// 但 .next/static 和 public 需要手动拷到 standalone 目录旁边；
// 同时 Next 依赖追踪会把 electron（devDependency，~275M）也拷进
// standalone/node_modules，运行时用不到（electron 由 electron-builder 提供），删掉。

import fs from "fs";
import path from "path";

const root = process.cwd();
const standalone = path.join(root, ".next/standalone");

if (!fs.existsSync(standalone)) {
  console.error("[standalone] .next/standalone 不存在，请先用 output:standalone 构建");
  process.exit(1);
}

// 1) 拷贝 .next/static → .next/standalone/.next/static
const staticSrc = path.join(root, ".next/static");
const staticDest = path.join(standalone, ".next/static");
if (fs.existsSync(staticSrc)) {
  fs.rmSync(staticDest, { recursive: true, force: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true });
  console.log("[standalone] 已拷贝 .next/static");
}

// 2) 拷贝 public → .next/standalone/public（若存在）
const publicSrc = path.join(root, "public");
const publicDest = path.join(standalone, "public");
if (fs.existsSync(publicSrc)) {
  fs.rmSync(publicDest, { recursive: true, force: true });
  fs.cpSync(publicSrc, publicDest, { recursive: true });
  console.log("[standalone] 已拷贝 public");
}

// 3) 删掉被误追踪进来的 electron（运行时不需要，electron-builder 单独提供）
const tracedElectron = path.join(standalone, "node_modules/electron");
if (fs.existsSync(tracedElectron)) {
  fs.rmSync(tracedElectron, { recursive: true, force: true });
  console.log("[standalone] 已移除 standalone/node_modules/electron");
}

console.log("[standalone] 后处理完成");
