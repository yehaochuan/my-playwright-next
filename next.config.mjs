import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // 独立输出：只把运行时真正需要的依赖追踪进 .next/standalone，
  // 剔除 @next/swc、webpack 等构建期依赖，大幅减小打包体积。
  output: "standalone",
  // 同时为 webpack（build）与 turbopack（dev）配置 @ → src 别名
  // webpack: (config) => {
  //   config.resolve.alias["@"] = path.resolve(__dirname, "src");
  //   return config;
  // },
  turbopack: {
    resolveAlias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
};

export default nextConfig;
