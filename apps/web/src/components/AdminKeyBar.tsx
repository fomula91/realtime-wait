interface Props {
  value: string;
  onChange: (key: string) => void;
}

/** 관리자 데모 키 입력 바 (모든 관리자 화면 상단에 노출) */
export function AdminKeyBar({ value, onChange }: Props) {
  return (
    <div className="card">
      <label htmlFor="adminKey">관리자 데모 키</label>
      <input
        id="adminKey"
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="demo-admin-key"
        autoComplete="off"
      />
      <p className="poll-hint">
        MVP 단계의 단순 데모 보호입니다. 키는 브라우저에만 저장됩니다.
      </p>
    </div>
  );
}
