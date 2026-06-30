import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../../lib/api.js";
import { usePolling } from "../../lib/usePolling.js";
import { useAdminContext } from "../../components/RoleGuard.js";
import { QrCode, boothLoginUrl } from "../../components/QrCode.js";
import { ErrorRetry, SkeletonRows } from "../../components/States.js";

/** 부스 로그인 QR 일괄 출력 (제안서 10). 인쇄/PDF 저장용 A4 시트. */
export function QrSheetPage() {
  const { eventId = "" } = useParams();
  const { adminKey } = useAdminContext();
  const [cols, setCols] = useState(2);

  // QR 시트는 자주 바뀌지 않으므로 길게 폴링
  const fetcher = useCallback(
    () => adminApi.getQrSheet(adminKey, eventId),
    [adminKey, eventId],
  );
  const { data, error, loading, refetch } = usePolling(fetcher, 60000, [
    adminKey,
    eventId,
  ]);

  return (
    <>
      <div className="page-head no-print">
        <div>
          <div className="eyebrow">{eventId}</div>
          <h1 style={{ margin: "4px 0 0" }}>부스 로그인 QR · 일괄 출력</h1>
        </div>
        <div className="row">
          <div className="chips">
            <button
              className={`chip${cols === 2 ? " active" : ""}`}
              onClick={() => setCols(2)}
            >
              2열
            </button>
            <button
              className={`chip${cols === 3 ? " active" : ""}`}
              onClick={() => setCols(3)}
            >
              3열
            </button>
          </div>
          <button className="small" onClick={() => window.print()}>
            🖨 인쇄 / PDF
          </button>
          <Link to={`/admin/${eventId}`}>
            <button className="ghost small">← 부스</button>
          </Link>
        </div>
      </div>

      <p className="muted no-print" style={{ marginTop: 0 }}>
        각 QR은 해당 부스 전용입니다. 인쇄물을 부스에 비치하면 담당자가 스캔 후 비밀번호 없이 바로
        운영을 시작합니다. 분실 시 부스 화면에서 토큰을 재발급하면 기존 QR은 무효화됩니다.
      </p>

      {loading && !data && <SkeletonRows count={4} />}
      {error && <ErrorRetry message={error} onRetry={refetch} />}
      {data?.length === 0 && <p className="muted">부스가 없습니다.</p>}

      {data && data.length > 0 && (
        <div
          className="qr-sheet"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {data.map((b) => (
            <div className="qr-tile" key={b.booth_id}>
              <QrCode
                value={boothLoginUrl(b.booth_id, b.token)}
                size={cols === 3 ? 92 : 112}
                alt={`${b.name} 로그인 QR`}
              />
              <div className="qr-meta">
                <div className="qr-name">{b.name}</div>
                <div className="qr-zone">{b.zone ? `${b.zone}구역` : "구역 미지정"}</div>
                <div className="qr-code">{b.booth_id}</div>
                <div className="qr-hint">스캔하여 부스 로그인</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
