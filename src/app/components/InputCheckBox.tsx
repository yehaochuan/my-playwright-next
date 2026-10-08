"use client";
import type { BuildTarget, ServiceConfig } from "@/app/consts";

interface InputCheckBoxProps {
  config?: ServiceConfig | BuildTarget;
  onChange: (val: ServiceConfig | BuildTarget) => void;
  checked?: boolean;
  controlled?: boolean;
}

export default function InputCheckBox({
  config,
  onChange,
  checked,
  controlled = true,
}: InputCheckBoxProps) {
  if (!config) return null;

  // 原地更新 config 并回传，保持父组件基于引用/闭包同步的现有行为
  const update = (patch: Partial<ServiceConfig | BuildTarget>) => {
    Object.assign(config, patch);
    onChange(config);
  };

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <input
        type="checkbox"
        checked={controlled ? checked || false : config.checked || false}
        onChange={(e) => update({ checked: e.target.checked })}
      />
      <input
        type="text"
        value={config.label || ""}
        placeholder="名称"
        className="shandowdown"
        style={{ padding: "0 8px", height: "20px", width: "120px" }}
        onChange={(e) => update({ label: e.target.value })}
      />
      <input
        type="text"
        value={config.value || ""}
        placeholder="url"
        className="shandowdown"
        style={{ padding: "0 8px", height: "20px", width: "110px" }}
        onChange={(e) => update({ value: e.target.value })}
      />
    </div>
  );
}
