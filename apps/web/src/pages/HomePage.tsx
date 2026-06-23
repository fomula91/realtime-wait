import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DEMO_EVENT_ID = "evt_demo";

export function HomePage() {
  const navigate = useNavigate();
  const [eventId, setEventId] = useState(DEMO_EVENT_ID);

  return (
    <>
      <h1>실시간 대기열 데모</h1>
      <div className="card">
        <h2>참가자</h2>
        <p className="muted">
          행사 ID 로 부스 목록을 보고 대기열에 등록할 수 있습니다.
        </p>
        <label htmlFor="eventId">행사 ID</label>
        <input
          id="eventId"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder="evt_demo"
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button
            onClick={() => navigate(`/events/${eventId.trim()}/register`)}
            disabled={!eventId.trim()}
          >
            부스 보러가기
          </button>
        </div>
      </div>

      <div className="card">
        <h2>운영자</h2>
        <p className="muted">
          관리자 화면에서 이벤트/부스를 만들고 대기열을 운영합니다. 데모 키:{" "}
          <code>demo-admin-key</code>
        </p>
        <button className="ghost" onClick={() => navigate("/admin")}>
          관리자 화면으로
        </button>
      </div>
    </>
  );
}
