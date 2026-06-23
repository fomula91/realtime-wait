import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ADMIN_POLL_INTERVAL_MS } from "@realtime-wait/shared";
import { adminApi, ApiClientError } from "../../lib/api.js";
import { usePolling } from "../../lib/usePolling.js";
import { useAdminKey } from "../../lib/useAdminKey.js";
import { AdminKeyBar } from "../../components/AdminKeyBar.js";

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
      <h1>관리자 · 이벤트</h1>
      <AdminKeyBar value={key} onChange={setKey} />

      <div className="card">
        <h2>새 이벤트</h2>
        <label htmlFor="evName">이름</label>
        <input id="evName" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="evDesc">설명 (선택)</label>
        <input id="evDesc" value={desc} onChange={(e) => setDesc(e.target.value)} />
        {formError && <p className="error">{formError}</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={create} disabled={!key || !name.trim()}>
            이벤트 생성
          </button>
        </div>
      </div>

      <div className="card">
        <h2>이벤트 목록</h2>
        {!key && <p className="muted">관리자 키를 입력하세요.</p>}
        {key && loading && !data && <p className="muted">불러오는 중…</p>}
        {error && <p className="error">{error}</p>}
        {data?.length === 0 && key && <p className="muted">이벤트가 없습니다.</p>}
        {data?.map((ev) => (
          <div className="list-item" key={ev.id}>
            <div>
              <div>{ev.name}</div>
              <div className="muted">
                {ev.id} · {ev.status}
              </div>
            </div>
            <Link to={`/admin/events/${ev.id}/booths`}>
              <button className="ghost small">부스 관리</button>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
