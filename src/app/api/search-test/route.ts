import type { NextRequest } from "next/server";
import type { Locator, Page } from "playwright";
import type { SearchStep } from "@/app/pages/SearchTest/local";
import { getBrowser, toCssSelector } from "./browser";

// 点击后等待页面更新完成（跳转加载 / 异步数据返回 / 渲染稳定期）
async function clickAndWaitPage(page: Page, selector: string) {
  const locator: Locator = page.locator(selector).first();
  const urlBefore = page.url();
  try {
    // 若点击触发页面跳转，等待新页面加载完成
    const navPromise = page
      .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 8000 })
      .catch(() => null);
    await locator.click();
    await navPromise;
  } catch (error) {
    // 点击可能因页面开始导航而被打断：发生了导航则继续等待加载，否则为真实失败
    if (page.url() === urlBefore) throw error;
    await page
      .waitForLoadState("domcontentloaded", { timeout: 10000 })
      .catch(() => {});
  }
  // 等待网络空闲（页面异步数据加载完成），带超时兜底
  await page
    .waitForLoadState("networkidle", { timeout: 10000 })
    .catch(() => {});
  // 渲染稳定期
  await page.waitForTimeout(800);
}

function describeStep(step: SearchStep): string {
  if (step.type === "goto") return `跳转地址：${step.url}`;
  if (step.type === "input") return `输入：${step.selector} = ${step.value}`;
  return `点击元素：${step.selector}`;
}

export async function POST(request: NextRequest) {
  const { steps } = (await request.json()) as { steps?: SearchStep[] };
  const textList: string[] = [];

  if (!Array.isArray(steps) || steps.length === 0) {
    return Response.json({
      success: true,
      status: "success",
      textList: ["没有可执行的预处理步骤"],
    });
  }

  const browser = await getBrowser();
  // 复用浏览器当前第一个页面（单页面工作流：预处理 → 扫描 → 测试）
  const pages = browser.contexts().flatMap((c) => c.pages());
  const page = pages[0] || (await browser.newPage());

  try {
    for (const step of steps) {
      if (step.skip) {
        textList.push(`跳过：${describeStep(step)}`);
        continue;
      }
      if (step.type === "goto") {
        textList.push(describeStep(step));
        await page.goto(step.url, { waitUntil: "domcontentloaded" });
      } else if (step.type === "input") {
        textList.push(describeStep(step));
        await page
          .locator(toCssSelector(step.selector))
          .first()
          .fill(step.value);
      } else if (step.type === "click") {
        textList.push(describeStep(step));
        // 点击后等待页面更新完成，再执行下一步
        await clickAndWaitPage(page, toCssSelector(step.selector));
      }
    }
    textList.push("预处理步骤执行完成，可开始正式功能");
  } catch (error) {
    textList.push(
      `执行失败：${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    // 保留页面供后续扫描/测试使用；浏览器实例缓存复用
  }

  return Response.json({ success: true, status: "success", textList });
}
