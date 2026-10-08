import type { Browser } from "playwright";

// 缓存的浏览器实例：首次启动后复用，请求间不重复 launch。
// 挂在 globalThis 上：Next dev(Turbopack) 会把各 route 编译成独立模块，
// 模块级变量不跨路由共享，必须用全局对象保证预处理/扫描/测试共用同一个浏览器。
const G = globalThis as unknown as { __searchTestBrowser?: Browser | null };

export async function getBrowser(): Promise<Browser> {
  const inst = G.__searchTestBrowser;
  if (inst && inst.isConnected()) return inst;
  if (inst) {
    // 浏览器已断开，先关闭再重新启动
    await inst.close().catch(() => {});
  }
  const { chromium } = await import("playwright");
  G.__searchTestBrowser = await chromium.launch({
    headless: false,
  });
  return G.__searchTestBrowser;
}

// 关闭缓存的浏览器实例（结束会话）
export async function closeBrowser(): Promise<boolean> {
  const inst = G.__searchTestBrowser;
  G.__searchTestBrowser = null;
  if (inst) {
    await inst.close().catch(() => {});
    return true;
  }
  return false;
}

// 当前浏览器里第一个打开的页面；没有则新建
export async function getActivePage(): Promise<import("playwright").Page> {
  const browser = await getBrowser();
  const pages = browser.contexts().flatMap((c) => c.pages());
  return pages[0] || (await browser.newPage());
}

// 选择器归一化：支持 #id / .class / [attr] 及组合选择器；
// 不带前缀时默认按 id 处理。
export function toCssSelector(sel: string): string {
  const s = sel.trim();
  if (!s) throw new Error("选择器不能为空");
  if (
    s.startsWith("#") ||
    s.startsWith(".") ||
    s.startsWith("[") ||
    s.includes(" ") ||
    s.includes(">")
  ) {
    return s;
  }
  return `#${s}`;
}
