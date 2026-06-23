import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { PARTICIPANT_POLL_INTERVAL_MS } from "@realtime-wait/shared";
import { api, ApiClientError } from "../../lib/api.js";
import { usePolling } from "../../lib/usePolling.js";
import { StatusBadge } from "../../components/StatusBadge.js";

export function StatusPage() {
  const { queueEntryId = "" } = useParams();
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetcher = useCallback(
    () => api.getStatus(queueEntryId),
    [queueEntryId],
  );
  const { data, error, loading, refetch } = usePolling(
    fetcher,
    PARTICIPANT_POLL_INTERVAL_MS,
    [queueEntryId],
  );

  const cancel = async () => {
    setCancelError(null);
    try {
      await api.cancel(queueEntryId);
      refetch();
    } catch (err) {
      setCancelError(
        err instanceof ApiClientError ? err.message : "취소에 실패했습니다",
      );
    }
  };

  if (loading && !data) return <p className="muted">불러오는 중…</p>;
  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return null;

  const canCancel = data.status === "waiting" || data.status === "called";

  return (
    <>
      <h1>{data.booth_name}</h1>
      <div className="card">
        <div className="spread">
          <span className="muted">내 대기 번호</span>
          <StatusBadge status={data.status} />
        </div>
        <div className="big-number">{data.queue_number}번</div>

        {data.status === "waiting" && (
          <p className="muted">
            내 앞에 <strong style={{ color: "var(--text)" }}>{data.ahead_count}</strong>
            명 대기 중입니다.
          </p>
        )}
        {data.status === "called" && (
          <p style={{ color: "var(--accent)", fontWeight: 600 }}>
            🔔 호출되었습니다! 부스로 이동해 주세요.
          </p>
        )}
        {data.status === "checked_in" && (
          <p style={{ color: "var(--green)", fontWeight: 600 }}>
            ✅ 체크인이 완료되었습니다.
          </p>
        )}
        {data.status === "no_show" && (
          <p className="error">노쇼 처리되었습니다.</p>
        )}
        {data.status === "cancelled" && (
          <p className="error">취소된 대기입니다.</p>
        )}

        <p className="muted">현재 호출 번호: {data.booth_current_number}번</p>

        {canCancel && (
          <div className="row" style={{ marginTop: 16 }}>
            <button className="red small" onClick={cancel}>
              대기 취소
            </button>
          </div>
        )}
        {cancelError && <p className="error">{cancelError}</p>}

        <p className="poll-hint">
          {PARTICIPANT_POLL_INTERVAL_MS / 1000}초마다 자동 갱신됩니다.
        </p>
      </div>
    </>
  );
}
