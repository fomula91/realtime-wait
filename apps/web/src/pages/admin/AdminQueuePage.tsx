import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ADMIN_POLL_INTERVAL_MS,
  type QueueEntryRecord,
} from "@realtime-wait/shared";
import { adminApi, ApiClientError } from "../../lib/api.js";
import { usePolling } from "../../lib/usePolling.js";
import { useAdminKey } from "../../lib/useAdminKey.js";
import { AdminKeyBar } from "../../components/AdminKeyBar.js";
import { StatusBadge } from "../../components/StatusBadge.js";

type Action = "call" | "check-in" | "no-show";

export function AdminQueuePage() {
  const { boothId = "" } = useParams();
  const { key, setKey } = useAdminKey();
  const [actionError, setActionError] = useState<string | null>(null);

  const fetcher = useCallback(() => {
    if (!key) return Promise.resolve([]);
    return adminApi.listQueue(key, boothId);
  }, [key, boothId]);
  const { data, error, loading, refetch } = usePolling(
    fetcher,
    ADMIN_POLL_INTERVAL_MS,
    [key, boothId],
  );

  const act = async (action: Action, entry: QueueEntryRecord) => {
    setActionError(null);
    try {
      if (action === "call") await adminApi.call(key, entry.id);
      else if (action === "check-in") await adminApi.checkIn(key, entry.id);
      else await adminApi.noShow(key, entry.id);
      refetch();
    } catch (err) {
      setActionError(
        err instanceof ApiClientError ? err.message : "처리에 실패했습니다",
      );
    }
  };

  const active = data?.filter(
    (e) => e.status === "waiting" || e.status === "called",
  );
  const done = data?.filter(
    (e) => !(e.status === "waiting" || e.status === "called"),
  );

  return (
    <>
      <h1>관리자 · 대기열</h1>
      <p className="muted">부스: {boothId}</p>
      <AdminKeyBar value={key} onChange={setKey} />

      {!key && <p className="muted">관리자 키를 입력하세요.</p>}
      {key && loading && !data && <p className="muted">불러오는 중…</p>}
      {error && <p className="error">{error}</p>}
      {actionError && <p className="error">{actionError}</p>}

      {data && (
        <>
          <div className="card">
            <h2>진행 중 ({active?.length ?? 0})</h2>
            {active?.length === 0 && <p className="muted">대기 인원이 없습니다.</p>}
            {active?.map((e) => (
              <div className="list-item" key={e.id}>
                <div className="row">
                  <span className="qnum">{e.queue_number}</span>
                  <div>
                    <div>{e.participant_name}</div>
                    <div className="muted">
                      <StatusBadge status={e.status} />
                      {e.participant_note ? ` · ${e.participant_note}` : ""}
                    </div>
                  </div>
                </div>
                <div className="row">
                  {e.status === "waiting" && (
                    <button className="small" onClick={() => act("call", e)}>
                      호출
                    </button>
                  )}
                  {e.status === "called" && (
                    <>
                      <button
                        className="green small"
                        onClick={() => act("check-in", e)}
                      >
                        체크인
                      </button>
                      <button
                        className="amber small"
                        onClick={() => act("no-show", e)}
                      >
                        노쇼
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>완료/종료 ({done?.length ?? 0})</h2>
            {done?.length === 0 && <p className="muted">없음</p>}
            {done?.map((e) => (
              <div className="list-item" key={e.id}>
                <div className="row">
                  <span className="qnum">{e.queue_number}</span>
                  <span>{e.participant_name}</span>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        </>
      )}

      <p className="poll-hint">
        {ADMIN_POLL_INTERVAL_MS / 1000}초마다 자동 갱신됩니다.
      </p>
    </>
  );
}
