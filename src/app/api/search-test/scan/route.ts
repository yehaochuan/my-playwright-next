import type { Page } from "playwright";
import { getActivePage } from "../browser";
import type { FormFieldInfo } from "@/app/pages/SearchTest/local";

// 收集表单内所有表单项的基础信息
async function collectItems(page: Page) {
  const result = await page.evaluate(() => {
    const pick = (sels: string[]) => {
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el) return el;
      }
      return null;
    };
    const form =
      pick([
        ".ant-pro-table-search .ant-form",
        ".ant-pro-form-query-filter .ant-form",
        ".ant-pro-query-filter .ant-form",
        ".ant-table-search-form .ant-form",
        ".ant-pro-search .ant-form",
        ".ant-form",
      ]) || null;
    if (!form) return null;

    const fields: Array<{
      index: number;
      label: string;
      type: FormFieldInfo["type"];
      currentValue: string;
      options: string[];
    }> = [];
    const items = Array.from(form.querySelectorAll(".ant-form-item"));
    items.forEach((item, index) => {
      const labelEl = item.querySelector(".ant-form-item-label");
      const label = (labelEl?.textContent || "").trim().replace(/[:：]\s*$/, "");
      const input = item.querySelector("input.ant-input");
      const numberInput = item.querySelector(".ant-input-number input");
      const select = item.querySelector(".ant-select");
      const picker = item.querySelector(".ant-picker");
      const radio = item.querySelector(".ant-radio-group");
      const checkbox = item.querySelector(".ant-checkbox-group");
      const sw = item.querySelector(".ant-switch");
      const textarea = item.querySelector("textarea");

      let type: FormFieldInfo["type"] = "unknown";
      let currentValue = "";
      let options: string[] = [];

      if (select) {
        type = "select";
        currentValue = (
          item.querySelector(".ant-select-selection-item")?.textContent || ""
        ).trim();
      } else if (picker) {
        // 兼容范围日期选择器 ant-picker-range（两个输入框：开始/结束）
        if (picker.classList.contains("ant-picker-range")) {
          type = "date-range";
          currentValue = Array.from(picker.querySelectorAll("input"))
            .map((i) => (i as HTMLInputElement).value || "")
            .filter(Boolean)
            .join(" ~ ");
        } else {
          type = "date";
          currentValue = (
            picker.querySelector("input") as HTMLInputElement | null
          )?.value || "";
        }
      } else if (numberInput) {
        type = "number";
        currentValue = (numberInput as HTMLInputElement).value || "";
      } else if (input) {
        type = "input";
        currentValue = (input as HTMLInputElement).value || "";
      } else if (radio) {
        type = "radio";
        options = Array.from(
          radio.querySelectorAll(".ant-radio-wrapper"),
        )
          .map((e) => (e.textContent || "").trim())
          .filter(Boolean);
        const checked = radio.querySelector(".ant-radio-wrapper-checked");
        currentValue = (checked?.textContent || "").trim();
      } else if (checkbox) {
        type = "checkbox";
        options = Array.from(
          checkbox.querySelectorAll(".ant-checkbox-wrapper"),
        )
          .map((e) => (e.textContent || "").trim())
          .filter(Boolean);
        currentValue = Array.from(
          checkbox.querySelectorAll(".ant-checkbox-wrapper-checked"),
        )
          .map((e) => (e.textContent || "").trim())
          .join(",");
      } else if (sw) {
        type = "switch";
        currentValue = sw.classList.contains("ant-switch-checked")
          ? "true"
          : "false";
      } else if (textarea) {
        type = "textarea";
        currentValue = (textarea as HTMLTextAreaElement).value || "";
      }

      if (type === "unknown") return; // 跳过无控件的行（如查询/重置按钮区）

      fields.push({
        index,
        label: label || `字段${index + 1}`,
        type,
        currentValue,
        options,
      });
    });
    return fields;
  });
  return result;
}

// 展开 select 抓取选项
async function collectSelectOptions(page: Page, index: number) {
  const sel = page
    .locator(".ant-form")
    .first()
    .locator(".ant-form-item")
    .nth(index)
    .locator(".ant-select")
    .first();
  try {
    await sel.click();
    await page.waitForTimeout(450);
    const options = await page.$$eval(
      ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option",
      (els) =>
        els
          .map((e) => e.getAttribute("title") || e.textContent || "")
          .map((s) => s.trim())
          .filter(Boolean),
    );
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(250);
    return options;
  } catch {
    await page.keyboard.press("Escape").catch(() => {});
    return [];
  }
}

export async function POST() {
  const page = await getActivePage();

  let items: Awaited<ReturnType<typeof collectItems>>;
  try {
    items = await collectItems(page);
  } catch (error) {
    return Response.json({
      success: false,
      status: "error",
      textList: [
        `扫描失败：${error instanceof Error ? error.message : String(error)}`,
      ],
    });
  }

  if (!items || items.length === 0) {
    return Response.json({
      success: false,
      status: "error",
      textList: [
        "当前页面未找到 ProTable 搜索表单（.ant-form）或没有表单项，请确认预处理已停留在目标页面",
      ],
    });
  }

  // select 选项需要展开下拉框抓取
  for (const f of items) {
    if (f.type === "select") {
      f.options = await collectSelectOptions(page, f.index);
    }
  }

  const fields: FormFieldInfo[] = items.map((f) => ({
    index: f.index,
    label: f.label,
    type: f.type,
    currentValue: f.currentValue,
    options: f.options,
  }));

  return Response.json({ success: true, status: "success", fields });
}
