"use client";

import { useEffect, useRef, useState } from "react";
import {
  STEP_TYPE_OPTIONS,
  createStep,
  defaultValueFor,
  fieldTypeLabel,
  randomValue,
  type FormFieldInfo,
  type SearchStep,
  type TestCase,
  type TestResult,
} from "@/app/pages/SearchTest/local";

const TABS_KEY = "searchTestTabs";
// 旧版单套步骤的存储 key，首次加载时迁移到默认 Tab
const LEGACY_KEY = "searchTestSteps";

interface TabConfig {
  id: string;
  name: string;
  steps: SearchStep[];
}

interface RunResponse {
  success: boolean;
  status: string;
  textList: string[];
}

const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export default function SearchTestPage() {
  const [tabs, setTabs] = useState<TabConfig[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [phaseDone, setPhaseDone] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 表单扫描与测试
  const [fields, setFields] = useState<FormFieldInfo[]>([]);
  const [fieldValues, setFieldValues] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [caseCount, setCaseCount] = useState(3);
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  // 首次加载：读取 searchTestTabs；无则从旧 key 迁移（或建默认 Tab）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TABS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TabConfig[];
        if (parsed.length > 0) {
          setTabs(parsed);
          setActiveTabId(parsed[0].id);
          return;
        }
      }
      const legacy = localStorage.getItem(LEGACY_KEY);
      const legacySteps = legacy ? (JSON.parse(legacy) as SearchStep[]) : [];
      const initial: TabConfig[] = [
        { id: genId(), name: "默认", steps: legacySteps },
      ];
      setTabs(initial);
      setActiveTabId(initial[0].id);
      localStorage.setItem(TABS_KEY, JSON.stringify(initial));
    } catch {
      // 忽略脏数据
    }
  }, []);

  const persistTabs = (next: TabConfig[]) => {
    setTabs(next);
    localStorage.setItem(TABS_KEY, JSON.stringify(next));
  };

  // 新建 Tab：名称留空并进入编辑态，让用户手动输入
  const addTab = () => {
    const tab: TabConfig = { id: genId(), name: "", steps: [] };
    persistTabs([...tabs, tab]);
    setActiveTabId(tab.id);
    setEditingId(tab.id);
    setLogs([]);
    setPhaseDone(false);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const commitName = (id: string, raw: string) => {
    const name = raw.trim() || "未命名";
    persistTabs(tabs.map((t) => (t.id === id ? { ...t, name } : t)));
    setEditingId(null);
  };

  const removeTab = (id: string) => {
    const next = tabs.filter((t) => t.id !== id);
    persistTabs(next);
    if (activeTabId === id) {
      setActiveTabId(next[0]?.id || "");
      setLogs([]);
      setPhaseDone(false);
      setEditingId(null);
    }
  };

  const switchTab = (id: string) => {
    setActiveTabId(id);
    setLogs([]);
    setPhaseDone(false);
    setEditingId(null);
  };

  const updateActiveSteps = (steps: SearchStep[]) => {
    if (!activeTab) return;
    persistTabs(
      tabs.map((t) => (t.id === activeTab.id ? { ...t, steps } : t)),
    );
  };

  const addStep = () => {
    if (!activeTab) return;
    updateActiveSteps([...activeTab.steps, createStep()]);
  };

  const updateStep = (index: number, patch: Partial<SearchStep>) => {
    if (!activeTab) return;
    const steps = activeTab.steps.map((s, i) =>
      i === index ? ({ ...s, ...patch } as SearchStep) : s,
    );
    updateActiveSteps(steps);
  };

  const removeStep = (index: number) => {
    if (!activeTab) return;
    updateActiveSteps(activeTab.steps.filter((_, i) => i !== index));
  };

  // 切换某步骤的「跳过」标记
  const toggleSkip = (index: number) => {
    if (!activeTab) return;
    const steps = activeTab.steps.map((s, i) =>
      i === index ? ({ ...s, skip: !s.skip } as SearchStep) : s,
    );
    updateActiveSteps(steps);
  };

  const runSteps = async () => {
    if (!activeTab || activeTab.steps.length === 0 || running) return;
    setRunning(true);
    setPhaseDone(false);
    setLogs([]);
    // 重跑预处理时清空旧的扫描/测试状态
    setFields([]);
    setFieldValues([]);
    setScanMessage("");
    setTestResults([]);
    try {
      const res = await fetch("/api/search-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: activeTab.steps }),
      });
      const data: RunResponse = await res.json();
      setLogs(data.textList || []);
      if (data.status === "success") setPhaseDone(true);
    } catch (e) {
      setLogs([`请求失败：${e instanceof Error ? e.message : String(e)}`]);
    } finally {
      setRunning(false);
    }
  };

  // 扫描 ProTable 搜索表单字段
  const scanFields = async () => {
    if (scanning || testRunning) return;
    setScanning(true);
    setScanMessage("");
    try {
      const res = await fetch("/api/search-test/scan", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setScanMessage(
          (data.textList || []).join("\n") || "扫描失败，请确认已停留在目标页面",
        );
        setFields([]);
        setFieldValues([]);
        return;
      }
      const f: FormFieldInfo[] = data.fields || [];
      setFields(f);
      // 默认值：已有值优先 → 选项优先 → 随机
      setFieldValues(f.map((x) => defaultValueFor(x)));
      setTestResults([]);
    } catch (e) {
      setScanMessage(
        `请求失败：${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setScanning(false);
    }
  };

  const randomField = (index: number) => {
    if (index >= fields.length) return;
    const f = fields[index];
    setFieldValues((prev) =>
      prev.map((v, i) =>
        i === index ? randomValue(f.type, f.options) : v,
      ),
    );
  };

  const randomAll = () => {
    setFieldValues(fields.map((f) => randomValue(f.type, f.options)));
  };

  // 生成测试用例并执行：第 1 组用当前编辑的值，其余组随机
  const runTests = async () => {
    if (fields.length === 0 || testRunning) return;
    setTestRunning(true);
    setTestResults([]);
    const count = Math.max(1, Math.min(10, caseCount || 1));
    const cases: TestCase[] = [];
    for (let i = 0; i < count; i++) {
      cases.push({
        name: `用例${i + 1}`,
        values:
          i === 0
            ? fieldValues.slice()
            : fields.map((f) => randomValue(f.type, f.options)),
      });
    }
    try {
      const res = await fetch("/api/search-test/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, cases }),
      });
      const data = await res.json();
      setTestResults(data.results || []);
    } catch (e) {
      setTestResults([
        {
          name: "请求失败",
          summary: "",
          rowCount: 0,
          empty: true,
          ok: false,
          errors: [`请求失败：${e instanceof Error ? e.message : String(e)}`],
        },
      ]);
    } finally {
      setTestRunning(false);
    }
  };

  // 关闭浏览器（结束测试会话）
  const closeBrowser = async () => {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch("/api/search-test/close", { method: "POST" });
      const data = await res.json();
      setLogs(data.textList || []);
      // 会话结束，清空扫描/测试状态
      setPhaseDone(false);
      setFields([]);
      setFieldValues([]);
      setScanMessage("");
      setTestResults([]);
    } catch (e) {
      setLogs([`请求失败：${e instanceof Error ? e.message : String(e)}`]);
    } finally {
      setRunning(false);
    }
  };

  const stepSummary = (step: SearchStep) => {
    if (step.type === "goto") {
      return (
        <>
          跳转 <b>{step.url}</b>
        </>
      );
    }
    if (step.type === "input") {
      return (
        <>
          输入 <b>{step.selector}</b> = <b>{step.value}</b>
        </>
      );
    }
    return (
      <>
        点击 <b>{step.selector}</b>
      </>
    );
  };

  return (
    <div style={{ padding: "25px" }}>

      {/* 自定义 Tab 栏 */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          const editing = editingId === tab.id;
          return (
            <div
              key={tab.id}
              className={active ? "shandowdown" : "shandowup"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 6px 3px 12px",
                borderRadius: 5,
                fontSize: 14,
              }}
            >
              {editing ? (
                <input
                  ref={nameInputRef}
                  defaultValue={tab.name}
                  placeholder="输入Tab名称"
                  className="shandowdown"
                  style={{ width: 110, height: 24, fontSize: 13 }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      commitName(tab.id, (e.target as HTMLInputElement).value);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={(e) => commitName(tab.id, e.target.value)}
                />
              ) : (
                <span
                  style={{ cursor: "pointer" }}
                  onClick={() => switchTab(tab.id)}
                >
                  {tab.name || "未命名"}
                </span>
              )}
              <button
                style={{
                  height: 20,
                  padding: "0 4px",
                  border: "none",
                  fontSize: 13,
                  color: "#0496d5",
                  background: "transparent",
                  boxShadow: "none",
                  cursor: "pointer",
                }}
                title="重命名"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(editing ? null : tab.id);
                  if (!editing) {
                    setTimeout(() => nameInputRef.current?.focus(), 0);
                  }
                }}
              >
                ✎
              </button>
              <button
                style={{
                  height: 20,
                  padding: "0 4px",
                  border: "none",
                  fontSize: 13,
                  color: "red",
                  background: "transparent",
                  boxShadow: "none",
                  cursor: "pointer",
                }}
                title="删除 Tab"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tab.id);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
        <button style={{ height: 28, padding: "0 12px" }} onClick={addTab}>
          ＋ 新建 Tab
        </button>
      </div>

      {!activeTab ? (
        <div
          className="shandowdown"
          style={{ marginTop: 16, color: "#999", padding: "10px 12px", width: 480 }}
        >
          暂无 Tab，点击「＋ 新建 Tab」创建
        </div>
      ) : (
        <>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <span className="shandowup inlineblock" style={{ fontSize: 14 }}>
              {activeTab.name || "未命名"}
            </span>
            <button style={{ height: 36 }} onClick={() => setShowDialog(true)}>
              配置预处理
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 6, color: "#666", fontSize: 13 }}>
              预处理步骤（按顺序执行）：
              <span style={{ color: "#999" }}>
                （点击行尾「跳过」可标记该步骤执行时跳过）
              </span>
            </div>
            {activeTab.steps.length === 0 ? (
              <div
                className="shandowdown"
                style={{ color: "#999", padding: "10px 12px", width: 480 }}
              >
                暂无步骤，点击「配置预处理」添加
              </div>
            ) : (
              activeTab.steps.map((step, i) => (
                <div
                  key={i}
                  className="shandowdown"
                  style={{
                    marginBottom: 6,
                    padding: "6px 12px",
                    width: 480,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "#888" }}>{i + 1}.</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {stepSummary(step)}
                  </span>
                  <button
                    style={{
                      height: 24,
                      padding: "0 10px",
                      border: "none",
                      background: "transparent",
                      boxShadow: "none",
                      color: step.skip ? "#b25e00" : "#0496d5",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                    title={step.skip ? "取消跳过" : "执行时跳过该步骤"}
                    onClick={() => toggleSkip(i)}
                  >
                    {step.skip ? "已跳过" : "跳过"}
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <button
              style={{ height: 36, position: "relative" }}
              disabled={running || activeTab.steps.length === 0}
              onClick={runSteps}
            >
              {running ? "执行中..." : "开始执行"}
            </button>
            {running && <div className="loading" />}
            <button
              style={{ height: 36 }}
              disabled={running}
              onClick={closeBrowser}
              title="关闭 Playwright 浏览器实例，结束本次测试会话"
            >
              关闭浏览器
            </button>
          </div>

          {logs.length > 0 && (
            <div
              className="shandowdown"
              style={{
                marginTop: 20,
                padding: 10,
                width: 480,
                fontSize: 13,
                color: "#666",
              }}
            >
              {logs.map((item, i) => (
                <div key={i}>{item}</div>
              ))}
            </div>
          )}

          {phaseDone && (
            <div
              className="shandowup"
              style={{
                marginTop: 16,
                padding: 14,
                width: 640,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  marginBottom: 10,
                  color: "#1c7a3d",
                  fontSize: 13,
                }}
              >
                预处理执行完成，可扫描目标页面 ProTable 搜索表单并开始搜索测试
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                <button
                  style={{ height: 30 }}
                  disabled={scanning || testRunning}
                  onClick={scanFields}
                >
                  {scanning ? "扫描中..." : "扫描表单字段"}
                </button>
                {fields.length > 0 && (
                  <>
                    <button
                      style={{ height: 30 }}
                      disabled={testRunning}
                      onClick={randomAll}
                    >
                      随机全部
                    </button>
                    <span style={{ fontSize: 13, color: "#666" }}>
                      测试组数
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={caseCount}
                      onChange={(e) =>
                        setCaseCount(Number(e.target.value) || 1)
                      }
                      style={{ width: 60, height: 26, textAlign: "center" }}
                    />
                    <button
                      style={{ height: 30 }}
                      disabled={testRunning}
                      onClick={runTests}
                    >
                      {testRunning ? "测试中..." : "开始测试"}
                    </button>
                  </>
                )}
              </div>

              {scanMessage && (
                <div
                  style={{
                    color: "#b25e00",
                    fontSize: 13,
                    marginBottom: 8,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {scanMessage}
                </div>
              )}

              {fields.length > 0 && (
                <div>
                  <div
                    style={{
                      marginBottom: 6,
                      color: "#666",
                      fontSize: 13,
                    }}
                  >
                    搜索字段（默认值可修改，留空表示该条件不填）：
                  </div>
                  {fields.map((f, i) => (
                    <div
                      key={f.index}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 6,
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          width: 120,
                          color: "#333",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={f.label}
                      >
                        {f.label}
                      </span>
                      <span
                        style={{
                          width: 64,
                          color: "#888",
                          fontSize: 12,
                          flexShrink: 0,
                        }}
                      >
                        {fieldTypeLabel(f.type)}
                      </span>
                      <input
                        className="shandowdown"
                        value={fieldValues[i] ?? ""}
                        onChange={(e) =>
                          setFieldValues((prev) =>
                            prev.map((v, j) =>
                              j === i ? e.target.value : v,
                            ),
                          )
                        }
                        style={{ flex: 1, height: 26, minWidth: 160 }}
                      />
                      <button
                        style={{ height: 26, padding: "0 10px" }}
                        onClick={() => randomField(i)}
                        title="随机生成该字段值"
                      >
                        随机
                      </button>
                    </div>
                  ))}
                  {fields.some((f) => (f.options?.length || 0) > 0) && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#999",
                        marginTop: 6,
                      }}
                    >
                      选项参考：
                      {fields
                        .filter((f) => (f.options?.length || 0) > 0)
                        .map(
                          (f) =>
                            `${f.label}[${(f.options || []).join("/")}]`,
                        )
                        .join("，")}
                    </div>
                  )}
                </div>
              )}

              {testResults.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      marginBottom: 6,
                      color: "#666",
                      fontSize: 13,
                    }}
                  >
                    测试结果（接口异常 / 匹配情况）：
                  </div>
                  <table
                    style={{
                      borderCollapse: "collapse",
                      width: "100%",
                      fontSize: 13,
                      background: "#f6f8fa",
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#e4e9ee" }}>
                        <th
                          style={{
                            border: "1px solid #d5dce3",
                            padding: "5px 8px",
                            textAlign: "left",
                          }}
                        >
                          用例
                        </th>
                        <th
                          style={{
                            border: "1px solid #d5dce3",
                            padding: "5px 8px",
                            textAlign: "left",
                          }}
                        >
                          搜索条件
                        </th>
                        <th
                          style={{
                            border: "1px solid #d5dce3",
                            padding: "5px 8px",
                            textAlign: "left",
                          }}
                        >
                          匹配行数
                        </th>
                        <th
                          style={{
                            border: "1px solid #d5dce3",
                            padding: "5px 8px",
                            textAlign: "left",
                          }}
                        >
                          状态
                        </th>
                        <th
                          style={{
                            border: "1px solid #d5dce3",
                            padding: "5px 8px",
                            textAlign: "left",
                          }}
                        >
                          异常信息
                        </th>
                        <th
                          style={{
                            border: "1px solid #d5dce3",
                            padding: "5px 8px",
                            textAlign: "left",
                          }}
                        >
                          执行详情
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResults.map((r, i) => (
                        <tr key={i}>
                          <td
                            style={{
                              border: "1px solid #d5dce3",
                              padding: "5px 8px",
                            }}
                          >
                            {r.name}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d5dce3",
                              padding: "5px 8px",
                              maxWidth: 240,
                            }}
                            title={r.summary}
                          >
                            {r.summary}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d5dce3",
                              padding: "5px 8px",
                            }}
                          >
                            {r.empty ? "空" : r.rowCount}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d5dce3",
                              padding: "5px 8px",
                              color: r.ok
                                ? r.empty
                                  ? "#b25e00"
                                  : "#1c7a3d"
                                : "red",
                            }}
                          >
                            {!r.ok
                              ? "接口异常"
                              : r.empty
                                ? "无匹配"
                                : "正常"}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d5dce3",
                              padding: "5px 8px",
                              color: "red",
                              maxWidth: 220,
                              fontSize: 12,
                            }}
                          >
                            {r.errors.join("；")}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d5dce3",
                              padding: "5px 8px",
                              color: "#888",
                              maxWidth: 260,
                              fontSize: 12,
                            }}
                            title={(r.detail || []).join("\n")}
                          >
                            {(r.detail || []).join("；")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showDialog && activeTab && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowDialog(false)}
        >
          <div
            className="shandowup"
            style={{
              width: 620,
              maxHeight: "80vh",
              overflow: "auto",
              background: "#ecf0f3",
              borderRadius: 8,
              padding: 20,
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              预处理配置 - {activeTab.name || "未命名"}
            </div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
              步骤将按添加顺序执行：输入（id/class + 值）→ 点击（id/class）→
              跳转（URL）。选择器支持 #id 或 .class，不带前缀默认按 id。
            </div>

            {activeTab.steps.length === 0 && (
              <div style={{ color: "#999", marginBottom: 8, fontSize: 13 }}>
                暂无步骤，点击下方「添加步骤」
              </div>
            )}

            {activeTab.steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ width: 22, color: "#888", fontSize: 13 }}>
                  {i + 1}.
                </span>
                <select
                  className="shandowdown"
                  value={step.type}
                  onChange={(e) =>
                    updateStep(i, { type: e.target.value as SearchStep["type"] })
                  }
                  style={{ height: 28, width: 70 }}
                >
                  {STEP_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                {step.type === "goto" ? (
                  <input
                    className="shandowdown"
                    placeholder="URL 地址，如 https://..."
                    value={step.url}
                    onChange={(e) => updateStep(i, { url: e.target.value })}
                    style={{ flex: 1, height: 28, minWidth: 200 }}
                  />
                ) : (
                  <input
                    className="shandowdown"
                    placeholder="#id 或 .class"
                    value={step.selector}
                    onChange={(e) => updateStep(i, { selector: e.target.value })}
                    style={{ flex: 1, height: 28, minWidth: 160 }}
                  />
                )}

                {step.type === "input" && (
                  <input
                    className="shandowdown"
                    placeholder="输入值"
                    value={step.value}
                    onChange={(e) => updateStep(i, { value: e.target.value })}
                    style={{ width: 120, height: 28 }}
                  />
                )}

                <button
                  style={{
                    height: 28,
                    padding: "0 10px",
                    border: "none",
                    color: "red",
                  }}
                  onClick={() => removeStep(i)}
                >
                  删除
                </button>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 16,
                alignItems: "center",
              }}
            >
              <button style={{ height: 32 }} onClick={addStep}>
                + 添加步骤
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{ height: 32 }}
                  onClick={() => setShowDialog(false)}
                >
                  取消
                </button>
                <button
                  style={{ height: 32 }}
                  onClick={() => setShowDialog(false)}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
