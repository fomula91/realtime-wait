import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ADMIN_POLL_INTERVAL_MS } from "@realtime-wait/shared";
import { adminApi, ApiClientError } from "../../lib/api.js";
import { usePolling } from "../../lib/usePolling.js";
import { useAdminKey } from "../../lib/useAdminKey.js";
import { AdminKeyBar } from "../../components/AdminKeyBar.js";
import { ErrorRetry, SkeletonRows } from "../../components/States.js";

const STATUS_LABEL: Record<string, string> = {
  draft: "초안",
  active: "진행중",
  ended: "종료",
};

export function AdminEventsPage() {
  const { key, setKey } = useAdminKey();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const fetcher = useCallback(() => {
    if (!key) return Promise.resolve([]);
    return adminApi.listEvents(key);
  }, [key]);
  const { data, error, loading, refetch } = usePolling(
    fetcher,
    ADMIN_POLL_INTERVAL_MS,
    [key],
  );

  const create = async () => {
    setFormError(null);
    try {
      await adminApi.createEvent(key, {
        name: name.trim(),
        description: desc.trim() || undefined,
      });
      setName("");
      setDesc("");
      refetch();
    } catch (err) {
      setFormError(
        err instanceof ApiClientError ? err.message : "생성에 실패했습니다",
      );
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">관리자</div>
          <h1 style={{ margin: "4px 0 0" }}>이벤트</h1>
        </div>
      </div>

      <AdminKeyBar value={key} onChange={setKey} />

      <div className="card">
        <h2>새 이벤트</h2>
        <label htmlFor="evName">이름</label>
        <input id="evName" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="evDesc">설명 (선택)</label>
        <input id="evDesc" value={desc} onChange={(e) => setDesc(e.target.value)} />
        {formError && <p className="error" style={{ marginTop: 12 }}>{formError}</p>}
        <button
          className="ink"
          style={{ marginTop: 14 }}
          onClick={create}
          disabled={!key || !name.trim()}
        >
          + 이벤트 생성
        </button>
      </div>

      {!key && <p className="muted">관리자 키를 입력하세요.</p>}
      {key && loading && !data && <SkeletonRows count={3} />}
      {error && (
        <div style={{ marginBottom: 14 }}>
          <ErrorRetry message={error} onRetry={refetch} />
        </div>
      )}
      {data?.length === 0 && key && <p className="muted">이벤트가 없습니다.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data?.map((ev) => {
          const ended = ev.status === "ended";
          return (
            <div className={`list-card${ended ? " muted-card" : ""}`} key={ev.id}>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="title">{ev.name}</span>
                  <span className={`badge ${ev.status === "active" ? "checked_in" : ended ? "cancelled" : "waiting"}`}>
                    {STATUS_LABEL[ev.status] ?? ev.status}
                  </span>
                </div>
                <div className="sub">{ev.id}</div>
              </div>
              <Link to={`/admin/events/${ev.id}/booths`}>
                <button className="outline small">부스 관리 →</button>
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
