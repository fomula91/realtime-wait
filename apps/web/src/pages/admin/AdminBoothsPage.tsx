import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ADMIN_POLL_INTERVAL_MS,
  type BoothRecord,
} from "@realtime-wait/shared";
import { adminApi, ApiClientError } from "../../lib/api.js";
import { usePolling } from "../../lib/usePolling.js";
import { useAdminKey } from "../../lib/useAdminKey.js";
import { AdminKeyBar } from "../../components/AdminKeyBar.js";
import { EmptyState, ErrorRetry, SkeletonRows } from "../../components/States.js";

const STATUS_LABEL: Record<string, string> = {
  draft: "초안",
  ready: "준비",
  open: "운영중",
  paused: "일시중지",
  closed: "마감",
};

/** 이 개수를 넘으면 카드 그리드 대신 밀도 리스트로 전환 (규모 적응 · section 06) */
const DENSITY_THRESHOLD = 12;

type SortKey = "name" | "current" | "status";

export function AdminBoothsPage() {
  const { eventId = "" } = useParams();
  const { key, setKey } = useAdminKey();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("name");

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

  // 상태별 개수 (실데이터 기준) — 필터 칩에 표시
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of data ?? []) m[b.status] = (m[b.status] ?? 0) + 1;
    return m;
  }, [data]);

  const visible = useMemo(() => {
    let list = data ?? [];
    if (statusFilter !== "all")
      list = list.filter((b) => b.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((b) => b.name.toLowerCase().includes(q));
    const sorted = [...list].sort((a, b) => {
      if (sort === "current") return b.current_number - a.current_number;
      if (sort === "status") return a.status.localeCompare(b.status);
      return a.name.localeCompare(b.name, "ko");
    });
    return sorted;
  }, [data, statusFilter, query, sort]);

  const total = data?.length ?? 0;
  const dense = total > DENSITY_THRESHOLD;

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
      {key && loading && !data && <SkeletonRows count={4} />}
      {error && (
        <div style={{ marginBottom: 14 }}>
          <ErrorRetry message={error} onRetry={refetch} />
        </div>
      )}

      {data && total > 0 && (
        <>
          {/* 규모 적응 도구 — 검색·상태 필터·정렬 (실데이터 기준) */}
          <div className="toolbar">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 부스명 검색…"
              aria-label="부스명 검색"
            />
            <div className="chips">
              <button
                className={`chip${statusFilter === "all" ? " active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                전체 {total}
              </button>
              {Object.keys(statusCounts).map((s) => (
                <button
                  key={s}
                  className={`chip${statusFilter === s ? " active" : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {STATUS_LABEL[s] ?? s} {statusCounts[s]}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="정렬"
              style={{ width: "auto", minHeight: 44 }}
            >
              <option value="name">정렬: 이름순</option>
              <option value="current">정렬: 현재 호출 높은순</option>
              <option value="status">정렬: 상태순</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <EmptyState emoji="🔍" title="조건에 맞는 부스가 없어요" sub="검색어나 필터를 바꿔보세요" />
          ) : dense ? (
            <DensityList booths={visible} />
          ) : (
            <CardGrid booths={visible} />
          )}
        </>
      )}
      {data && total === 0 && key && <p className="muted">부스가 없습니다.</p>}
    </>
  );
}

function CardGrid({ booths }: { booths: BoothRecord[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {booths.map((b) => {
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
                현재 호출 <b style={{ color: "var(--amber)" }}>{b.current_number}번</b>
              </div>
            </div>
            <Link to={`/admin/booths/${b.id}/queue`}>
              <button className="outline small">대기열 →</button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function DensityList({ booths }: { booths: BoothRecord[] }) {
  return (
    <div className="density-list">
      {booths.map((b) => {
        const open = b.status === "open";
        return (
          <div className="density-row" key={b.id}>
            <span className="bname">{b.name}</span>
            <span className={`badge ${open ? "checked_in" : "cancelled"}`}>
              {STATUS_LABEL[b.status] ?? b.status}
            </span>
            <span className="bcall">
              현재 호출 <b>{b.current_number}번</b>
            </span>
            <Link to={`/admin/booths/${b.id}/queue`}>
              <button className="outline small">대기열 →</button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
