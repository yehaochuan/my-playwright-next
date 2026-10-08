interface BaseUserProps {
  userData: { userName: string; passWord: string };
  onChange: (data: { userName: string; passWord: string }) => void;
}

export default function BaseUser({ userData, onChange }: BaseUserProps) {
  const handleChange = (field: "userName" | "passWord", value: string) => {
    const updated = { ...userData, [field]: value };
    onChange(updated);
    localStorage.setItem(field, value);
  };

  return (
    <div
      className="shandowup"
      style={{
        width: 268,
        marginTop: 12,
        padding: 12,
        boxSizing: "border-box",
      }}
    >
      <div>{"设置填充 ⬇️ 账户/密码 (Jenkins)"} </div>
      <div style={{ marginTop: 12 }}>
        <span>账 户：</span>
        <input
          value={userData.userName}
          onChange={(val) => handleChange("userName", val.target.value)}
          className="shandowdown"
          style={{ padding: "0px 8px" }}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <span>密 码：</span>
        <input
          type="password"
          value={userData.passWord}
          className="shandowdown"
          style={{ padding: "0px 8px" }}
          onChange={(val) => handleChange("passWord", val.target.value)}
        />
      </div>
    </div>
  );
}
