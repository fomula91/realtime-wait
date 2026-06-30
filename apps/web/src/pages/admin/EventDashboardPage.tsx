import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ADMIN_POLL_INTERVAL_MS,
  type BoothRecord,
} from "@realtime-wait/shared";
import { adminApi, ApiClientError } from "../../lib/api.js";
import { usePolling } from "../../lib/usePolling.js";
import { useAdminContext } from "../../components/RoleGuard.js";
import { EmptyState, ErrorRetry, SkeletonRows } from "../../components/States.js";

const STATUS_LABEL: Record<string, string> = {
  draft: "초안",
  ready: "준비",
  open: "운영중",
  paused: "일시중지",
  closed: "마감",
};

/** 상태별 배지 색상 클래스 (badge.* — waiting=파랑·called=주황·checked_in=초록·cancelled=빨강) */
const STATUS_BADGE: Record<string, string> = {
  draft: "",
  ready: "waiting",
  open: "checked_in",
  paused: "called",
  closed: "cancelled",
};

/** '상태순' 정렬용 라이프사이클 순서 (운영중 우선) */
const STATUS_ORDER = ["open", "paused", "ready", "draft", "closed"];
const statusRank = (s: string) => {
  const i = STATUS_ORDER.indexOf(s);
  return i === -1 ? STATUS_ORDER.length : i;
};

/** 이 개수를 넘으면 카드 대신 밀도 리스트로 전환 (규모 적응 · section 07) */
const DENSITY_THRESHOLD = 12;
type SortKey = "name" | "current" | "status";

/** 행사 어드민 · 한 행사의 부스 전체 (제안서 05) */
export function EventDashboardPage() {
  const { eventId = "" } = useParams();
  const { adminKey } = useAdminContext();
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("name");

  const fetcher = useCallback(
    () => adminApi.listBooths(adminKey, eventId),
    [adminKey, eventId],
  );
  const { data, error, loading, refetch } = usePolling(
    fetcher,
    ADMIN_POLL_INTERVAL_MS,
    [adminKey, eventId],
  );

  const create = async () => {
    setFormError(null);
    try {
      await adminApi.createBooth(adminKey, eventId, {
        name: name.trim(),
        zone: zone.trim() || undefined,
      });
      setName("");
      setZone("");
      refetch();
    } catch (err) {
      setFormError(
        err instanceof ApiClientError ? err.message : "생성에 실패했습니다",
      );
    }
  };

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of data ?? []) m[b.status] = (m[b.status] ?? 0) + 1;
    return m;
  }, [data]);

  // 폴링으로 필터 중인 상태의 부스가 모두 사라지면 칩도 사라지므로 '전체'로 복귀
  useEffect(() => {
    if (statusFilter !== "all" && !(statusFilter in statusCounts)) {
      setStatusFilter("all");
    }
  }, [statusFilter, statusCounts]);

  const visible = useMemo(() => {
    let list = data ?? [];
    if (statusFilter !== "all") list = list.filter((b) => b.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((b) => b.name.toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      if (sort === "current") return b.current_number - a.current_number;
      if (sort === "status") return statusRank(a.status) - statusRank(b.status);
      return a.name.localeCompare(b.name, "ko");
    });
  }, [data, statusFilter, query, sort]);

  const total = data?.length ?? 0;
  const open = (data ?? []).filter((b) => b.status === "open").length;
  const dense = visible.length > DENSITY_THRESHOLD;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{eventId}</div>
          <h1 style={{ margin: "4px 0 0" }}>부스</h1>
        </div>
        <Link to={`/admin/${eventId}/qr`}>
          <button className="outline small">🖨 QR 일괄 출력</button>
        </Link>
      </div>

      <div className="stat-strip" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="k">부스</div>
          <div className="v">{total}</div>
        </div>
        <div className="stat">
          <div className="k">운영 중</div>
          <div className="v green">{open}</div>
        </div>
        <div className="stat">
          <div className="k">마감 · 기타</div>
          <div className="v">{total - open}</div>
        </div>
        <div className="stat">
          <div className="k">구역</div>
          <div className="v blue">
            {new Set((data ?? []).map((b) => b.zone).filter(Boolean)).size}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>새 부스</h2>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <label htmlFor="bName">이름</label>
            <input id="bName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label htmlFor="bZone">구역 (선택)</label>
            <input
              id="bZone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="예: A"
            />
          </div>
        </div>
        {formError && <p className="error" style={{ marginTop: 12 }}>{formError}</p>}
        <button
          className="ink"
          style={{ marginTop: 14 }}
          onClick={create}
          disabled={!name.trim()}
        >
          + 부스 생성
        </button>
      </div>

      {loading && !data && <SkeletonRows count={4} />}
      {error && <ErrorRetry message={error} onRetry={refetch} />}

      {data && total > 0 && (
        <>
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
            <DensityList booths={visible} eventId={eventId} />
          ) : (
            <CardGrid booths={visible} eventId={eventId} />
          )}
        </>
      )}
      {data && total === 0 && <p className="muted">부스가 없습니다.</p>}
    </>
  );
}

function CardGrid({ booths, eventId }: { booths: BoothRecord[]; eventId: string }) {
  return (
    <div className="booth-grid">
      {booths.map((b) => {
        const open = b.status === "open";
        return (
          <div className={`list-card${open ? "" : " muted-card"}`} key={b.id}>
            <div>
              <div className="row" style={{ gap: 8 }}>
                <span className="title">{b.name}</span>
                {b.zone && <span className="zone-tag">{b.zone}구역</span>}
                <span className={`badge ${STATUS_BADGE[b.status] ?? ""}`}>
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
              </div>
              <div className="sub">
                현재 호출 <b style={{ color: "var(--amber)" }}>{b.current_number}번</b>
              </div>
            </div>
            <Link to={`/admin/${eventId}/booths/${b.id}`}>
              <button className="outline small">대기열 →</button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function DensityList({ booths, eventId }: { booths: BoothRecord[]; eventId: string }) {
  return (
    <div className="density-list">
      {booths.map((b) => (
          <div className="density-row" key={b.id}>
            <span className="bname">
              {b.name}
              {b.zone && <span className="zone-tag">{b.zone}구역</span>}
            </span>
            <span className={`badge ${STATUS_BADGE[b.status] ?? ""}`}>
              {STATUS_LABEL[b.status] ?? b.status}
            </span>
            <span className="bcall">
              현재 호출 <b>{b.current_number}번</b>
            </span>
            <Link to={`/admin/${eventId}/booths/${b.id}`}>
              <button className="outline small">대기열 →</button>
            </Link>
          </div>
      ))}
    </div>
  );
}
