import { closeBrowser } from "../browser";

// 关闭缓存的 Playwright 浏览器实例（结束测试会话）
export async function POST() {
  const closed = await closeBrowser();
  return Response.json({
    success: true,
    status: "success",
    textList: [closed ? "浏览器已关闭" : "没有正在运行的浏览器"],
  });
}
