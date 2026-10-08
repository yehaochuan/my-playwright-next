"use client";

interface BuildLogProps {
  buildData: string[];
  loading: boolean;
  onEnd: () => void;
}

export default function BuildLog({ buildData, loading, onEnd }: BuildLogProps) {
  if (!buildData?.length) return null;

  return (
    <div
      className="shandowdown"
      style={{
        marginTop: 20,
        fontSize: 13,
        color: "#666",
        padding: "10px",
        position: "relative",
        paddingBottom: "24px",
        width: "360px",
      }}
    >
      {buildData.map((item) => (
        <div key={item}>{item}</div>
      ))}

      {loading && (
        <div className="loading" style={{ position: "absolute", right: 6 }} />
      )}
      <button
        style={{
          position: "absolute",
          left: "0px",
          height: "25px",
          padding: "0 20px",
          bottom: "-35px",
          border: "none",
        }}
        onClick={onEnd}
      >
        结束任务
      </button>
    </div>
  );
}
