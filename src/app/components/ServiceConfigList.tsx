"use client";
import InputCheckBox from "@/app/components/InputCheckBox";
import type { ServiceConfig } from "@/app/consts";

interface ServiceConfigListProps {
  configList: ServiceConfig[];
  onUpdate: () => void;
  onAdd: () => void;
}

export default function ServiceConfigList({
  configList,
  onUpdate,
  onAdd,
}: ServiceConfigListProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <div className="flex-1" style={{ width: "700px" }}>
        <div>服务⬇️</div>
        <div>部署到⬇️</div>
      </div>
      {configList.map((res, index) => (
        <div
          className="shandowup inlineblock"
          style={{ marginTop: 8, position: "relative", width: "700px" }}
          key={index}
        >
          <div style={{ display: "flex" }}>
            <InputCheckBox
              config={res}
              checked={res.checked}
              onChange={(val) => {
                configList.forEach((item) => {
                  item.checked = false;
                });
                configList[index] = { ...configList[index], ...val };
                onUpdate();
              }}
            />
            <div
              className="shandowdown"
              style={{
                padding: "8px 20px",
                width: "58px",
                flexWrap: "wrap",
                display: "flex",
                alignItems: "center",
              }}
            >
              {"=>"}
              <button
                style={{ padding: "4px", height: "20px" }}
                onClick={() => {
                  configList[index].buildUrlList.push({
                    label: "",
                    value: "",
                  });
                  onUpdate();
                }}
              >
                +
              </button>
            </div>

            <div
              style={{
                marginLeft: 12,
                display: "flex",
                width: "290px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {configList[index]?.buildUrlList?.map((item, index2) => (
                <div
                  style={{
                    marginTop: index2 ? "6px" : "0px",
                    position: "relative",
                  }}
                  key={`${index}-${index2}`}
                >
                  <InputCheckBox
                    controlled={false}
                    config={item}
                    onChange={() => {
                      onUpdate();
                    }}
                  />
                  {index2 > 0 && (
                    <span
                      className="shandowdown"
                      style={{
                        position: "absolute",
                        right: "-12px",
                        top: "0px",
                        border: "none",
                        color: "red",
                        height: "20px",
                        fontSize: "16px",
                        padding: "0 8px",
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        configList[index]?.buildUrlList.splice(index2, 1);
                        onUpdate();
                      }}
                    >
                      -
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {index > 0 && (
            <div
              className="shandowdown"
              style={{
                position: "absolute",
                right: "0px",
                top: "0px",
                border: "none",
                color: "red",
                height: "100%",
                fontSize: "16px",
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => {
                configList.splice(index, 1);
                onUpdate();
              }}
            >
              -
            </div>
          )}
        </div>
      ))}

      <div
        className="shandowup"
        style={{
          marginTop: 6,
          width: "700px",
          padding: "0 12px",
          textAlign: "center",
          cursor: "pointer",
        }}
        onClick={onAdd}
      >
        + Add
      </div>
    </div>
  );
}
