import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi, ApiClientError } from "../../lib/api.js";
import { useAdminContext } from "../../components/RoleGuard.js";
import { QueueBoard } from "../../components/QueueBoard.js";

/** 행사 어드민이 보는 단일 부스 대기열 상세 (제안서 09 · /admin/:eventId/booths/:boothId) */
export function AdminBoothDetailPage() {
  const { eventId = "", boothId = "" } = useParams();
  const { adminKey } = useAdminContext();
  const [rotateMsg, setRotateMsg] = useState<string | null>(null);

  const rotate = async () => {
    setRotateMsg(null);
    try {
      await adminApi.rotateBoothToken(adminKey, boothId);
      setRotateMsg("새 QR 토큰을 발급했습니다. 기존 QR은 무효화됩니다.");
    } catch (err) {
      setRotateMsg(
        err instanceof ApiClientError ? err.message : "재발급에 실패했습니다",
      );
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{boothId}</div>
          <h1 style={{ margin: "4px 0 0" }}>부스 대기열</h1>
        </div>
        <div className="row">
          <button className="outline small" onClick={rotate}>
            QR 토큰 재발급
          </button>
          <Link to={`/admin/${eventId}`}>
            <button className="ghost small">← 부스 목록</button>
          </Link>
        </div>
      </div>
      {rotateMsg && <p className="muted" style={{ marginTop: 0 }}>{rotateMsg}</p>}

      <QueueBoard adminKey={adminKey} boothId={boothId} />
    </>
  );
}
