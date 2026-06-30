import { useParams } from "react-router-dom";
import { useAdminContext } from "../../components/RoleGuard.js";
import { QueueBoard } from "../../components/QueueBoard.js";

/** 부스 어드민 · 내 부스 큐만 (제안서 09/10 · /booth/:boothId, QR로 진입) */
export function BoothQueuePage() {
  const { boothId = "" } = useParams();
  const { adminKey } = useAdminContext();

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{boothId}</div>
          <h1 style={{ margin: "4px 0 0" }}>대기열</h1>
        </div>
      </div>

      <QueueBoard adminKey={adminKey} boothId={boothId} />

      <div className="lock-note">
        🔒 다른 부스·행사 설정에는 접근할 수 없습니다. 호출·체크인·노쇼만 가능합니다.
      </div>
    </>
  );
}
