import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ADMIN_POLL_INTERVAL_MS } from "@realtime-wait/shared";
import { adminApi, ApiClientError } from "../../lib/api.js";
import { usePolling } from "../../lib/usePolling.js";
import { useAdminKey } from "../../lib/useAdminKey.js";
import { AdminKeyBar } from "../../components/AdminKeyBar.js";

const STATUS_LABEL: Record<string, string> = {
  draft: "초안",
  ready: "준비",
  open: "운영중",
  paused: "일시중지",
  closed: "마감",
};

export function AdminBoothsPage() {
  const { eventId = "" } = useParams();
  const { key, setKey } = useAdminKey();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const fetcher = useCallback(() => {
    if (!key) return Promise.resolve([]);
    return adminApi.listBooths(key, eventId);
  }, [key, eventId]);
  const { data, error, loading, refetch } = usePolling(
    fetcher,
    ADMIN_POLL_INTERVAL_MS,
    [key, eventId],
  );

  const create = async () => {
    setFormError(null);
    try {
      await adminApi.createBooth(key, eventId, {
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
          <div className="eyebrow">{eventId}</div>
          <h1 style={{ margin: "4px 0 0" }}>부스</h1>
        </div>
      </div>

      <AdminKeyBar value={key} onChange={setKey} />

      <div className="card">
        <h2>새 부스</h2>
        <label htmlFor="bName">이름</label>
        <input id="bName" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="bDesc">설명 (선택)</label>
        <input id="bDesc" value={desc} onChange={(e) => setDesc(e.target.value)} />
        {formError && <p className="error" style={{ marginTop: 12 }}>{formError}</p>}
        <button
          className="ink"
          style={{ marginTop: 14 }}
          onClick={create}
          disabled={!key || !name.trim()}
        >
          + 부스 생성
        </button>
      </div>

      {!key && <p className="muted">관리자 키를 입력하세요.</p>}
      {key && loading && !data && <p className="muted">불러오는 중…</p>}
      {error && <p className="error">{error}</p>}
      {data?.length === 0 && key && <p className="muted">부스가 없습니다.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data?.map((b) => {
          const open = b.status === "open";
          return (
            <div className={`list-card${open ? "" : " muted-card"}`} key={b.id}>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="title">{b.name}</span>
                  <span className={`badge ${open ? "checked_in" : "cancelled"}`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>
                <div className="sub">
                  현재 호출{" "}
                  <b style={{ color: "var(--amber)" }}>{b.current_number}번</b>
                </div>
              </div>
              <Link to={`/admin/booths/${b.id}/queue`}>
                <button className="outline small">대기열 →</button>
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
