import { useCallback, useState } from "react";
import {
  ADMIN_POLL_INTERVAL_MS,
  type QueueEntryRecord,
} from "@realtime-wait/shared";
import { adminApi, ApiClientError } from "../lib/api.js";
import { usePolling } from "../lib/usePolling.js";
import { StatusBadge } from "./StatusBadge.js";
import { EmptyState, ErrorRetry, SkeletonRows } from "./States.js";

type Action = "call" | "check-in" | "no-show";

/**
 * 운영자 대기열 보드(통계·다음 호출·진행/완료 2열).
 * 토픽바는 셸이 그리므로 여기서는 본문만 그린다. 부스 어드민·행사 어드민 부스 상세 양쪽에서 재사용.
 */
export function QueueBoard({
  adminKey,
  boothId,
}: {
  adminKey: string;
  boothId: string;
}) {
  const [actionError, setActionError] = useState<string | null>(null);

  const fetcher = useCallback(
    () => adminApi.listQueue(adminKey, boothId),
    [adminKey, boothId],
  );
  const { data, error, loading, refetch } = usePolling(
    fetcher,
    ADMIN_POLL_INTERVAL_MS,
    [adminKey, boothId],
  );

  const act = async (action: Action, entry: QueueEntryRecord) => {
    setActionError(null);
    try {
      if (action === "call") await adminApi.call(adminKey, entry.id);
      else if (action === "check-in") await adminApi.checkIn(adminKey, entry.id);
      else await adminApi.noShow(adminKey, entry.id);
      refetch();
    } catch (err) {
      setActionError(
        err instanceof ApiClientError ? err.message : "처리에 실패했습니다",
      );
    }
  };

  const entries = data ?? [];
  const count = (s: QueueEntryRecord["status"]) =>
    entries.filter((e) => e.status === s).length;
  const active = entries.filter(
    (e) => e.status === "waiting" || e.status === "called",
  );
  const done = entries.filter(
    (e) => !(e.status === "waiting" || e.status === "called"),
  );
  const nextWaiting = active.find((e) => e.status === "waiting");

  if (loading && !data) return <SkeletonRows count={4} />;

  return (
    <>
      {error && (
        <div style={{ marginBottom: 14 }}>
          <ErrorRetry message={error} onRetry={refetch} />
        </div>
      )}
      {actionError && <p className="error">{actionError}</p>}

      {data && (
        <>
          <div
            style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}
          >
            <div className="stat-strip" style={{ flex: 1, minWidth: 280 }}>
              <div className="stat">
                <div className="k">대기</div>
                <div className="v blue">{count("waiting")}</div>
              </div>
              <div className="stat">
                <div className="k">호출 중</div>
                <div className="v amber">{count("called")}</div>
              </div>
              <div className="stat">
                <div className="k">체크인</div>
                <div className="v green">{count("checked_in")}</div>
              </div>
              <div className="stat">
                <div className="k">노쇼</div>
                <div className="v red">{count("no_show")}</div>
              </div>
            </div>

            {nextWaiting && (
              <div className="next-call" style={{ minWidth: 280, margin: 0 }}>
                <div>
                  <div className="k">다음 대기</div>
                  <div className="v">
                    {nextWaiting.queue_number} · {nextWaiting.participant_name}
                  </div>
                </div>
                <button className="small" onClick={() => act("call", nextWaiting)}>
                  다음 호출 →
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)",
              gap: 16,
              marginTop: 16,
            }}
          >
            <div className="card" style={{ margin: 0 }}>
              <div className="spread" style={{ marginBottom: 14 }}>
                <h2 style={{ margin: 0 }}>진행 중</h2>
                <span style={{ font: "700 13px Pretendard", color: "var(--dim)" }}>
                  {active.length}명
                </span>
              </div>
              <div className="queue-list">
                {active.length === 0 && (
                  <EmptyState
                    title="대기열이 비었어요"
                    sub="새 참가자를 기다리는 중"
                  />
                )}
                {active.map((e) => {
                  const called = e.status === "called";
                  return (
                    <div className={`qrow${called ? " called" : ""}`} key={e.id}>
                      <div className="tile">{e.queue_number}</div>
                      <div className="who">
                        <div className="name">{e.participant_name}</div>
                        <div className="meta">
                          {called ? "● 호출됨" : "대기중"}
                          {e.participant_note ? ` · ${e.participant_note}` : ""}
                        </div>
                      </div>
                      <div className="actions">
                        {e.status === "waiting" && (
                          <button className="small" onClick={() => act("call", e)}>
                            호출
                          </button>
                        )}
                        {called && (
                          <>
                            <button
                              className="green small"
                              onClick={() => act("check-in", e)}
                            >
                              체크인
                            </button>
                            <button
                              className="outline-red small"
                              onClick={() => act("no-show", e)}
                            >
                              노쇼
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ margin: 0 }}>
              <div className="spread" style={{ marginBottom: 14 }}>
                <h2 style={{ margin: 0 }}>완료 / 종료</h2>
                <span style={{ font: "700 13px Pretendard", color: "var(--dim)" }}>
                  {done.length}명
                </span>
              </div>
              <div className="queue-list">
                {done.length === 0 && <p className="muted">없음</p>}
                {done.map((e) => (
                  <div className="done-row" key={e.id}>
                    <span className="qnum">{e.queue_number}</span>
                    <span className="name">{e.participant_name}</span>
                    <StatusBadge status={e.status} />
                  </div>
                ))}
              </div>
              <p className="poll-hint">
                노쇼는 호출 후 무응답 시 처리되며, 재호출로 되돌릴 수 있습니다.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
