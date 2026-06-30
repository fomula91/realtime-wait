import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { adminApi, ApiClientError } from "../lib/api.js";
import { useAdminKey } from "../lib/useAdminKey.js";
import { landingPath } from "../lib/auth.js";

/**
 * 관리자 로그인(데모). 키/토큰을 확인해 역할을 해석하고 역할별 홈으로 착지한다.
 * - super: 환경변수 데모 키(demo-admin-key)
 * - event/booth: DB 범위 토큰(부스는 보통 QR로 자동 진입)
 */
export function LoginPage() {
  const { key, setKey } = useAdminKey();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [value, setValue] = useState(key);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const provided = value.trim();
    if (!provided) return;
    setBusy(true);
    setError(null);
    try {
      const principal = await adminApi.getMe(provided);
      setKey(provided);
      const next = params.get("next");
      navigate(next ? decodeURIComponent(next) : landingPath(principal), {
        replace: true,
      });
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? "키/토큰을 확인할 수 없습니다"
          : "로그인에 실패했습니다",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow">
      <div className="hero">
        <div className="pill">
          <span className="dot" />
          ADMIN
        </div>
        <h1>운영자 로그인</h1>
        <p>
          데모 키 또는 범위 토큰을 입력하세요.
          <br />
          부스 담당자는 보통 QR 스캔으로 바로 입장합니다.
        </p>
      </div>

      <label htmlFor="cred">데모 키 / 범위 토큰</label>
      <input
        id="cred"
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="demo-admin-key"
        autoComplete="off"
      />
      {error && (
        <p className="error" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
      <button
        className="block"
        style={{ marginTop: 14 }}
        onClick={submit}
        disabled={!value.trim() || busy}
      >
        {busy ? "확인 중…" : "로그인 →"}
      </button>

      <div
        style={{ height: 1, background: "var(--border-strong)", margin: "24px 0" }}
      />
      <p className="poll-hint" style={{ marginTop: 0 }}>
        데모 자격증명 · 슈퍼 <code>demo-admin-key</code> · 행사{" "}
        <code>evt-demo-token</code> · 부스 <code>booth-a-token</code>
      </p>
    </div>
  );
}
