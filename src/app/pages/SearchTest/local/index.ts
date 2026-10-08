// SearchTest 本地内容配置：步骤类型、选项与默认步骤工厂

// 预处理步骤类型：skip 为 true 时执行阶段跳过该步骤
export type SearchStep =
  | { type: "input"; selector: string; value: string; skip?: boolean }
  | { type: "click"; selector: string; skip?: boolean }
  | { type: "goto"; url: string; skip?: boolean };

export interface SearchTestRequest {
  steps: SearchStep[];
}

// 步骤类型下拉选项（显示文案）
export const STEP_TYPE_OPTIONS: { value: SearchStep["type"]; label: string }[] =
  [
    { value: "input", label: "输入" },
    { value: "click", label: "点击" },
    { value: "goto", label: "跳转" },
  ];

// 新建指定类型的空步骤
export function createStep(type: SearchStep["type"] = "input"): SearchStep {
  if (type === "goto") return { type, url: "" };
  if (type === "click") return { type, selector: "" };
  return { type, selector: "", value: "" };
}

// ---- ProTable 搜索表单字段扫描与测试 ----

export type FormFieldType =
  | "input"
  | "number"
  | "select"
  | "date"
  | "date-range"
  | "radio"
  | "checkbox"
  | "switch"
  | "textarea"
  | "unknown";

// 扫描到的表单项信息
export interface FormFieldInfo {
  index: number; // 在 .ant-form 内 .ant-form-item 的序号
  label: string;
  type: FormFieldType;
  currentValue: string; // 表单当前已有值（可能为空）
  options?: string[]; // select/radio/checkbox 的选项
}

// 一组搜索条件（values 按下标对应字段 index）
export interface TestCase {
  name: string;
  values: string[];
}

// 单个用例的测试结果
export interface TestResult {
  name: string;
  summary: string;
  rowCount: number; // 表格匹配行数
  empty: boolean; // 是否空态（无匹配数据）
  ok: boolean; // 是否无接口异常
  errors: string[]; // 接口异常/页面错误信息
  detail?: string[]; // 诊断信息（点击了哪个查询按钮等）
}

const TYPE_LABEL: Record<FormFieldType, string> = {
  input: "输入框",
  number: "数字",
  select: "下拉",
  date: "日期",
  "date-range": "日期范围",
  radio: "单选",
  checkbox: "多选",
  switch: "开关",
  textarea: "多行文本",
  unknown: "未知",
};

export function fieldTypeLabel(type: FormFieldType): string {
  return TYPE_LABEL[type] || type;
}

// 随机日期（YYYY-MM-DD）
function randomDate(): string {
  const y = 2021 + Math.floor(Math.random() * 5);
  const m = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const d = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 随机生成一个测试值
export function randomValue(
  type: FormFieldType,
  options?: string[],
): string {
  if (type === "select" || type === "radio") {
    const opts = (options || []).filter(Boolean);
    if (opts.length > 0) {
      return opts[Math.floor(Math.random() * opts.length)];
    }
    return "";
  }
  if (type === "checkbox") {
    const opts = (options || []).filter(Boolean);
    if (opts.length === 0) return "";
    // 随机选 1~3 个组合
    const n = 1 + Math.floor(Math.random() * Math.min(3, opts.length));
    const picked: string[] = [];
    const pool = [...opts];
    for (let i = 0; i < n && pool.length > 0; i++) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return picked.join(",");
  }
  if (type === "number") return String(Math.floor(Math.random() * 900) + 100);
  if (type === "switch") return Math.random() > 0.5 ? "true" : "false";
  if (type === "date") return randomDate();
  if (type === "date-range") {
    // 开始日期在前，结束日期随机晚于开始
    let start = randomDate();
    let end = randomDate();
    if (end < start) [start, end] = [end, start];
    return `${start} ~ ${end}`;
  }
  // input / textarea / unknown
  return `测试${Math.floor(Math.random() * 9000 + 1000)}`;
}

// 计算字段默认值：表单已有值优先 → 选项优先 → 随机生成
export function defaultValueFor(field: FormFieldInfo): string {
  if (field.currentValue) return field.currentValue;
  if (
    (field.type === "select" ||
      field.type === "radio" ||
      field.type === "checkbox") &&
    field.options &&
    field.options.length > 0
  ) {
    return randomValue(field.type, field.options);
  }
  return randomValue(field.type, field.options);
}
