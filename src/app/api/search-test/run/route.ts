import type { NextRequest } from "next/server";
import type { Page, Response } from "playwright";
import { getActivePage } from "../browser";
import type { FormFieldInfo, TestCase, TestResult } from "@/app/pages/SearchTest/local";

// 在当前打开的日期面板中随机选择一个可用日期（antd DatePicker 交互：
// 输入框 readonly，只能通过点击面板单元格选择）。
// panelIndex：0=第一个面板（开始日期），1=第二个面板（结束日期，range 场景）
async function pickDateInPanel(
  page: Page,
  panelIndex: number,
): Promise<boolean> {
  const dropdown = page
    .locator(".ant-picker-dropdown:not(.ant-picker-dropdown-hidden)")
    .last();
  if ((await dropdown.count().catch(() => 0)) === 0) return false;
  const cells = dropdown
    .locator(".ant-picker-panel")
    .nth(panelIndex)
    .locator("td.ant-picker-cell:not(.ant-picker-cell-disabled)");
  const n = await cells.count().catch(() => 0);
  if (n === 0) return false;
  const idx = Math.floor(Math.random() * n);
  await cells.nth(idx).click();
  return true;
}

// 填充单个表单项
async function fillField(page: Page, field: FormFieldInfo, value: string) {
  const item = page
    .locator(".ant-form")
    .first()
    .locator(".ant-form-item")
    .nth(field.index);

  switch (field.type) {
    case "select": {
      if (!value) {
        // 清空：优先点清除按钮
        const clear = item.locator(".ant-select-clear");
        if ((await clear.count()) > 0) {
          await clear.first().click().catch(() => {});
        }
        return;
      }
      // 收起可能遗留展开的下拉（如 scan 阶段展开后未关闭），避免遮挡 select
      const openDD = page.locator(
        ".ant-select-dropdown:not(.ant-select-dropdown-hidden)",
      );
      if ((await openDD.count().catch(() => 0)) > 0) {
        await page.keyboard.press("Escape").catch(() => {});
        await page.mouse.click(8, 8).catch(() => {});
        await page.waitForTimeout(300);
      }
      await item.locator(".ant-select").first().click();
      await page.waitForTimeout(350);
      const opt = page
        .locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option")
        .filter({ hasText: value });
      await opt.first().click();
      await page.waitForTimeout(200);
      break;
    }
    case "date": {
      // antd 日期输入框 readonly 无法直接填入：
      // 点击打开日历面板，随机选择一个可用日期
      const input = item.locator(".ant-picker input").first();
      await input.click();
      await page.waitForTimeout(450);
      const ok = await pickDateInPanel(page, 0);
      if (!ok) throw new Error("未找到日期面板");
      await page.waitForTimeout(300);
      break;
    }
    case "date-range": {
      // 范围日期同样只能面板选择：先选开始日期，再选结束日期
      const inputs = item.locator(".ant-picker-range input");
      const count = await inputs.count();
      if (count > 0) {
        await inputs.nth(0).click();
        await page.waitForTimeout(450);
        const ok1 = await pickDateInPanel(page, 0);
        if (!ok1) throw new Error("未找到日期面板（开始）");
        await page.waitForTimeout(450);
        const ok2 = await pickDateInPanel(page, 1);
        if (!ok2) throw new Error("未找到日期面板（结束）");
        await page.waitForTimeout(300);
      }
      break;
    }
    case "number": {
      const input = item.locator(".ant-input-number input").first();
      await input.fill(value);
      break;
    }
    case "switch": {
      const sw = item.locator(".ant-switch").first();
      const checked = await sw
        .evaluate((el) => el.classList.contains("ant-switch-checked"))
        .catch(() => false);
      if ((value === "true") !== checked) await sw.click().catch(() => {});
      break;
    }
    case "radio": {
      await item
        .locator(".ant-radio-wrapper")
        .filter({ hasText: value })
        .first()
        .click();
      break;
    }
    case "checkbox": {
      const wanted = new Set(
        value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      const wrappers = item.locator(".ant-checkbox-wrapper");
      const count = await wrappers.count();
      for (let i = 0; i < count; i++) {
        const w = wrappers.nth(i);
        const text = ((await w.textContent().catch(() => "")) || "").trim();
        const isChecked =
          (await w
            .evaluate((el) =>
              el.classList.contains("ant-checkbox-wrapper-checked"),
            )
            .catch(() => false)) || false;
        if (wanted.has(text) !== isChecked) {
          await w.click().catch(() => {});
        }
      }
      break;
    }
    case "textarea": {
      const input = item.locator("textarea").first();
      await input.fill(value);
      break;
    }
    default: {
      // input / unknown
      const input = item.locator("input.ant-input").first();
      await input.fill(value);
      break;
    }
  }
}

// 点击查询按钮：多候选策略 + 诊断日志（记录尝试过的按钮与原因）
// 注意：多区域必须「每个区域各自拼接按钮选择器」再取并集，
// 直接逗号拼接会让前面的区域选择器单独成项（匹配容器本身）导致点错元素。
const ZONES = [
  ".ant-pro-table-search",
  ".ant-pro-form-query-filter",
  ".ant-pro-query-filter",
  ".ant-table-search-form",
  ".ant-form",
];
const inZones = (btnSel: string) =>
  ZONES.map((z) => `${z} ${btnSel}`).join(", ");
const CLICK_RE = /查\s*询|搜\s*索|确\s*定|Search|Submit/i;

async function clickSearch(page: Page): Promise<string[]> {
  const log: string[] = [];
  const zoneCount = await page.locator(ZONES.join(", ")).count().catch(() => 0);
  log.push(`搜索区域命中 ${zoneCount} 个`);

  // 在给定范围内遍历按钮，找到可见且未禁用的查询按钮并点击
  const tryRange = async (
    loc: ReturnType<Page["locator"]>,
    scope: string,
  ): Promise<boolean> => {
    const n = await loc.count().catch(() => 0);
    log.push(`${scope}按钮 ${n} 个`);
    for (let i = 0; i < n; i++) {
      const b = loc.nth(i);
      const txt = ((await b.textContent().catch(() => "")) || "").trim();
      if (!CLICK_RE.test(txt)) {
        log.push(`忽略[${txt || "(无文本)"}]（非查询文案）`);
        continue;
      }
      const visible = await b.isVisible().catch(() => false);
      const disabled = await b.isDisabled().catch(() => false);
      if (!visible) {
        log.push(`跳过[${txt}]：不可见`);
        continue;
      }
      if (disabled) {
        log.push(`跳过[${txt}]：按钮 disabled（表单校验可能未通过）`);
        continue;
      }
      await b.click();
      log.push(`✅ 已点击[${txt}]`);
      return true;
    }
    return false;
  };

  if (await tryRange(page.locator(inZones("button.ant-btn-primary")), "区域内primary")) return log;
  if (await tryRange(page.locator(inZones("button")), "区域内全部")) return log;
  // 折叠场景：搜索表单可能默认收起，先点「展开」再重试
  const expandBtn = page
    .locator(inZones("button"))
    .filter({ hasText: /展\s*开/ })
    .first();
  if (
    (await expandBtn.count().catch(() => 0)) > 0 &&
    (await expandBtn.isVisible().catch(() => false))
  ) {
    log.push("搜索表单可能折叠，点击「展开」后重试");
    await expandBtn.click().catch(() => {});
    await page.waitForTimeout(600);
    if (await tryRange(page.locator(inZones("button.ant-btn-primary")), "展开后区域内primary")) return log;
    if (await tryRange(page.locator(inZones("button")), "展开后区域内全部")) return log;
  }
  if (await tryRange(page.locator("button.ant-btn-primary"), "全局primary")) return log;
  if (await tryRange(page.locator("button"), "全局全部")) return log;
  log.push("❌ 未找到可点击的查询按钮");
  return log;
}

// 等待表格加载完成（loading 消失）
async function waitTableSettled(page: Page, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const loading = await page
      .locator(
        ".ant-pro-table .ant-spin-spinning, .ant-table-wrapper .ant-spin-spinning",
      )
      .count()
      .catch(() => 0);
    if (loading === 0) break;
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(600);
}

export async function POST(request: NextRequest) {
  const { fields, cases } = (await request.json()) as {
    fields?: FormFieldInfo[];
    cases?: TestCase[];
  };

  if (!Array.isArray(fields) || fields.length === 0) {
    return Response.json({
      success: false,
      status: "error",
      results: [],
      textList: ["缺少表单字段信息，请先扫描表单"],
    });
  }
  if (!Array.isArray(cases) || cases.length === 0) {
    return Response.json({
      success: false,
      status: "error",
      results: [],
      textList: ["没有可执行的测试用例"],
    });
  }

  const page = await getActivePage();
  const results: TestResult[] = [];

  for (const c of cases) {
    const errors: string[] = [];
    const onResponse = (res: Response) => {
      if (res.status() >= 400) {
        errors.push(`${res.status()} ${res.url()}`);
      }
    };
    page.on("response", onResponse);

    try {
      // 1. 填入该组搜索条件（单个字段填充失败不中断，记录后继续）
      for (const f of fields) {
        const v = c.values?.[f.index] ?? "";
        try {
          await fillField(page, f, v);
        } catch (e) {
          errors.push(
            `填充失败(${f.label})：${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      const summary = fields
        .map((f) => {
          const v = c.values?.[f.index] ?? "";
          if (!v) return "";
          // 日期/日期范围是面板随机选择，无法指定具体日期
          if (f.type === "date" || f.type === "date-range") {
            return `${f.label}=随机选择`;
          }
          return `${f.label}=${v}`;
        })
        .filter(Boolean)
        .join("；") || "（全部为空）";

      // 2. 点击查询（失败则记录异常结果，跳过读取）；日志写入 detail 供诊断
      let searchFailed = false;
      const detail: string[] = [];
      try {
        detail.push(...(await clickSearch(page)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        detail.push(`点击查询异常：${msg}`);
        errors.push(`点击查询失败：${msg}`);
        searchFailed = true;
      }

      if (searchFailed) {
        results.push({
          name: c.name || "用例",
          summary,
          rowCount: 0,
          empty: true,
          ok: false,
          errors,
          detail,
        });
        continue;
      }

      // 3. 等待表格稳定
      await waitTableSettled(page);
      // 4. 读取匹配结果
      const rowCount = await page
        .locator(".ant-table-tbody tr.ant-table-row")
        .count()
        .catch(() => 0);
      const empty =
        (await page
          .locator(".ant-table-wrapper .ant-empty, .ant-pro-table .ant-empty")
          .count()
          .catch(() => 0)) > 0;
      const pageErrors = await page
        .locator(".ant-message-error")
        .allTextContents()
        .catch(() => []);
      errors.push(...pageErrors.map((t) => `页面错误：${t.trim()}`));
      // 表单校验错误（点击查询被 antd 校验拦截）
      const formErrors = await page
        .locator(".ant-form-item-explain-error")
        .allTextContents()
        .catch(() => []);
      errors.push(...formErrors.map((t) => `表单校验：${t.trim()}`));

      results.push({
        name: c.name || "用例",
        summary,
        rowCount,
        empty,
        ok: errors.length === 0,
        errors,
        detail,
      });
    } catch (error) {
      results.push({
        name: c.name || "用例",
        summary: "执行异常",
        rowCount: 0,
        empty: true,
        ok: false,
        errors: [
          `执行异常：${error instanceof Error ? error.message : String(error)}`,
        ],
      });
    } finally {
      page.off("response", onResponse);
    }
  }

  return Response.json({ success: true, status: "success", results });
}
