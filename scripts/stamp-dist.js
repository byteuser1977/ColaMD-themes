/**
 * 构建后写入 dist/build-info.json 版本戳。
 *
 * 背景：dist/ 不入 git、但随 npm 包发布，且历史上没有 prepack 钩子，
 * 曾出现"发布了新版本号、打包的却是旧 dist"的事故（宿主提示 dist 内容陈旧）。
 * 版本戳让消费方可以校验 dist 是否与包版本一致：
 *   - dist/build-info.json 的 version 必须等于 package.json 的 version；
 *   - builtAt 记录构建时间，便于定位陈旧产物。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const distDir = path.join(root, "dist");

if (!fs.existsSync(distDir)) {
  console.error("[stamp-dist] dist/ 不存在，请先运行 tsc 构建");
  process.exit(1);
}

fs.writeFileSync(
  path.join(distDir, "build-info.json"),
  JSON.stringify({ name: pkg.name, version: pkg.version, builtAt: new Date().toISOString() }, null, 2) + "\n"
);

console.log(`[stamp-dist] dist/build-info.json → ${pkg.version}`);
