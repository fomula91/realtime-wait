import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ADMIN_POLL_INTERVAL_MS,
  type AdminTokenRecord,
} from "@realtime-wait/shared";
import { adminApi, ApiClientError } from "../../lib/api.js";
import { usePolling } from "../../lib/usePolling.js";
import { useAdminContext } from "../../components/RoleGuard.js";
import { QrCode, eventLoginUrl } from "../../components/QrCode.js";
import { ErrorRetry, SkeletonRows } from "../../components/States.js";

/**
 * 슈퍼 어드민 · 접근 토큰 & QR 관리 (제안서 05/10).
 * 행사·부스 토큰은 생성 시 자동 발급된다. 이 화면에서 행사 담당자에게 줄
 * 행사 어드민 로그인 링크를 조회·배포하고, 분실 시 회전한다.
 * 부스 로그인 QR은 행사별 QR 시트에서 출력한다.
 */
export function SuperAdminsPage() {
  const { adminKey } = useAdminContext();
  const fetcher = useCallback(() => adminApi.listEvents(adminKey), [adminKey]);
  const { data, error, loading, refetch } = usePolling(
    fetcher,
    ADMIN_POLL_INTERVAL_MS,
    [adminKey],
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">슈퍼 어드민</div>
          <h1 style={{ margin: "4px 0 0" }}>접근 권한 · QR</h1>
        </div>
      </div>

      <div className="card">
        <h2>역할 · 범위 모델</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          상위 역할은 하위 범위를 모두 포함합니다(슈퍼 ⊃ 행사 ⊃ 부스).
        </p>
        <ul className="scope-list">
          <li>
            <span className="role-chip super">슈퍼</span> 전체 플랫폼 · 행사 생성/삭제 ·
            어드민 배정
          </li>
          <li>
            <span className="role-chip event">행사</span> 한 행사 · 부스 생성 · QR 출력 ·
            호출/체크인/노쇼
          </li>
          <li>
            <span className="role-chip booth">부스</span> 내 부스 하나 · 호출/체크인/노쇼만
          </li>
        </ul>
        <p className="poll-hint">
          행사·부스 토큰은 생성 시 자동 발급됩니다. 아래 “행사 로그인 링크”를 담당자에게
          전달하고, 부스 담당자는 QR로 비밀번호 없이 입장합니다.
        </p>
      </div>

      {loading && !data && <SkeletonRows count={3} />}
      {error && <ErrorRetry message={error} onRetry={refetch} />}
      {data?.length === 0 && <p className="muted">행사가 없습니다.</p>}

      <div className="list-table">
        {(data ?? []).map((ev) => (
          <EventTokenRow
            key={ev.id}
            adminKey={adminKey}
            eventId={ev.id}
            eventName={ev.name}
          />
        ))}
      </div>
    </>
  );
}

/** 한 행사의 어드민 로그인 링크·QR 조회 + 회전 (배포용) */
function EventTokenRow({
  adminKey,
  eventId,
  eventName,
}: {
  adminKey: string;
  eventId: string;
  eventName: string;
}) {
  const [token, setToken] = useState<AdminTokenRecord | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    adminApi
      .getEventToken(adminKey, eventId)
      .then((t) => active && setToken(t))
      .catch((err: unknown) => {
        if (!active) return;
        setMsg(
          err instanceof ApiClientError ? err.message : "토큰 조회에 실패했습니다",
        );
      });
    return () => {
      active = false;
    };
  }, [adminKey, eventId]);

  const url = token ? eventLoginUrl(eventId, token.token) : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setMsg("복사에 실패했습니다. 링크를 직접 선택해 복사하세요.");
    }
  };

  const rotate = async () => {
    setMsg(null);
    if (!confirm(`${eventName} 행사 로그인 토큰을 재발급할까요? 기존 링크는 무효화됩니다.`))
      return;
    try {
      const next = await adminApi.rotateEventToken(adminKey, eventId);
      setToken(next);
      setMsg("새 로그인 토큰을 발급했습니다. 기존 링크는 무효화됩니다.");
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : "재발급에 실패했습니다");
    }
  };

  return (
    <div className="list-table-row" style={{ alignItems: "flex-start" }}>
      <div className="cell-main">
        <div className="title">{eventName}</div>
        <div className="sub">{eventId}</div>
        <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <span className="role-chip event">행사 로그인</span>
          {url ? (
            <code style={{ wordBreak: "break-all", fontSize: 12 }}>{url}</code>
          ) : (
            <span className="muted">{msg ? "—" : "불러오는 중…"}</span>
          )}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <button className="outline small" onClick={copy} disabled={!url}>
            {copied ? "복사됨 ✓" : "링크 복사"}
          </button>
          <button className="ghost small" onClick={rotate}>
            토큰 재발급
          </button>
          <Link to={`/admin/${eventId}/qr`}>
            <button className="outline small">부스 QR 시트 →</button>
          </Link>
        </div>
        {msg && (
          <p className="muted" style={{ margin: "8px 0 0" }}>
            {msg}
          </p>
        )}
      </div>
      {url && (
        <QrCode value={url} size={88} alt={`${eventName} 행사 로그인 QR`} />
      )}
    </div>
  );
}
