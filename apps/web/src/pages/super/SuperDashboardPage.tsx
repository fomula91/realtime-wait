import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ADMIN_POLL_INTERVAL_MS, type EventRecord } from "@realtime-wait/shared";
import { adminApi, ApiClientError } from "../../lib/api.js";
import { usePolling } from "../../lib/usePolling.js";
import { useAdminContext } from "../../components/RoleGuard.js";
import { ErrorRetry, SkeletonRows } from "../../components/States.js";

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "예정", cls: "waiting" },
  active: { label: "진행중", cls: "checked_in" },
  ended: { label: "종료", cls: "cancelled" },
};

/** 슈퍼 어드민 · 전체 행사 대시보드 (제안서 05) */
export function SuperDashboardPage() {
  const { adminKey } = useAdminContext();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [boothCounts, setBoothCounts] = useState<Record<string, number>>({});

  const fetcher = useCallback(() => adminApi.listEvents(adminKey), [adminKey]);
  const { data, error, loading, refetch } = usePolling(
    fetcher,
    ADMIN_POLL_INTERVAL_MS,
    [adminKey],
  );

  // 행사별 부스 수는 한 번씩만 가볍게 채운다(폴링 대상 아님)
  const events = data ?? [];
  const ids = events.map((e) => e.id).join(",");
  useEffect(() => {
    if (!ids) return;
    let active = true;
    Promise.all(
      ids.split(",").map((id) =>
        adminApi
          .listBooths(adminKey, id)
          .then((bs) => [id, bs.length] as const)
          .catch(() => [id, -1] as const),
      ),
    ).then((pairs) => {
      if (active) setBoothCounts(Object.fromEntries(pairs));
    });
    return () => {
      active = false;
    };
  }, [ids, adminKey]);

  const create = async () => {
    setFormError(null);
    try {
      await adminApi.createEvent(adminKey, { name: name.trim() });
      setName("");
      refetch();
    } catch (err) {
      setFormError(
        err instanceof ApiClientError ? err.message : "생성에 실패했습니다",
      );
    }
  };

  const stat = (s: string) => events.filter((e) => e.status === s).length;
  const totalBooths = Object.values(boothCounts)
    .filter((n) => n >= 0)
    .reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">슈퍼 어드민</div>
          <h1 style={{ margin: "4px 0 0" }}>전체 행사</h1>
        </div>
        <div className="row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && create()}
            placeholder="새 행사 이름"
            style={{ width: 200, minHeight: 44, padding: "11px 14px", fontSize: 14 }}
          />
          <button className="ink small" onClick={create} disabled={!name.trim()}>
            + 새 행사
          </button>
        </div>
      </div>
      {formError && <p className="error">{formError}</p>}

      <div className="stat-strip stat-strip-5" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="k">전체 행사</div>
          <div className="v">{events.length}</div>
        </div>
        <div className="stat">
          <div className="k">진행 중</div>
          <div className="v blue">{stat("active")}</div>
        </div>
        <div className="stat">
          <div className="k">예정</div>
          <div className="v amber">{stat("draft")}</div>
        </div>
        <div className="stat">
          <div className="k">종료</div>
          <div className="v">{stat("ended")}</div>
        </div>
        <div className="stat">
          <div className="k">총 부스</div>
          <div className="v green">{totalBooths}</div>
        </div>
      </div>

      {loading && !data && <SkeletonRows count={3} />}
      {error && <ErrorRetry message={error} onRetry={refetch} />}
      {data?.length === 0 && <p className="muted">행사가 없습니다. 새 행사를 만들어 보세요.</p>}

      <div className="list-table">
        {events.map((ev: EventRecord) => {
          const st = STATUS[ev.status] ?? { label: ev.status, cls: "waiting" };
          const count = boothCounts[ev.id];
          return (
            <div className="list-table-row" key={ev.id}>
              <div className="cell-main">
                <div className="title">{ev.name}</div>
                <div className="sub">{ev.id}</div>
              </div>
              <span className={`badge ${st.cls}`}>{st.label}</span>
              <div className="cell-num">
                부스 {count === undefined ? "…" : count < 0 ? "—" : count}
              </div>
              <Link to={`/admin/${ev.id}`}>
                <button className="outline small">관리 →</button>
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
