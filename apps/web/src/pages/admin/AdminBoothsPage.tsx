import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ADMIN_POLL_INTERVAL_MS } from "@realtime-wait/shared";
import { adminApi, ApiClientError } from "../../lib/api.js";
import { usePolling } from "../../lib/usePolling.js";
import { useAdminKey } from "../../lib/useAdminKey.js";
import { AdminKeyBar } from "../../components/AdminKeyBar.js";

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
      <h1>관리자 · 부스</h1>
      <p className="muted">행사: {eventId}</p>
      <AdminKeyBar value={key} onChange={setKey} />

      <div className="card">
        <h2>새 부스</h2>
        <label htmlFor="bName">이름</label>
        <input id="bName" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="bDesc">설명 (선택)</label>
        <input id="bDesc" value={desc} onChange={(e) => setDesc(e.target.value)} />
        {formError && <p className="error">{formError}</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={create} disabled={!key || !name.trim()}>
            부스 생성
          </button>
        </div>
      </div>

      <div className="card">
        <h2>부스 목록</h2>
        {!key && <p className="muted">관리자 키를 입력하세요.</p>}
        {key && loading && !data && <p className="muted">불러오는 중…</p>}
        {error && <p className="error">{error}</p>}
        {data?.length === 0 && key && <p className="muted">부스가 없습니다.</p>}
        {data?.map((b) => (
          <div className="list-item" key={b.id}>
            <div>
              <div>{b.name}</div>
              <div className="muted">
                {b.status} · 현재 호출 {b.current_number}번
              </div>
            </div>
            <Link to={`/admin/booths/${b.id}/queue`}>
              <button className="ghost small">대기열 관리</button>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
