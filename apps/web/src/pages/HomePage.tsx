import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DEMO_EVENT_ID = "evt_demo";

export function HomePage() {
  const navigate = useNavigate();
  const [eventId, setEventId] = useState(DEMO_EVENT_ID);

  return (
    <div className="container narrow" style={{ padding: 0 }}>
      <div className="hero">
        <div className="pill">
          <span className="dot" />
          LIVE
        </div>
        <h1>
          어디서
          <br />
          기다리시나요?
        </h1>
        <p>
          행사 코드를 입력하면 부스 대기열에
          <br />
          바로 등록할 수 있어요.
        </p>
      </div>

      <label htmlFor="eventId">행사 코드</label>
      <input
        id="eventId"
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        placeholder="evt_demo"
      />
      <button
        className="block"
        style={{ marginTop: 14 }}
        onClick={() => navigate(`/e/${eventId.trim()}`)}
        disabled={!eventId.trim()}
      >
        부스 보러가기 →
      </button>

      <div
        style={{ height: 1, background: "var(--border-strong)", margin: "26px 0" }}
      />

      <div className="spread">
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>운영자세요?</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            대기열을 호출·관리합니다 · 데모 키 <code>demo-admin-key</code>
          </div>
        </div>
        <button className="outline small" onClick={() => navigate("/login")}>
          관리자 →
        </button>
      </div>
    </div>
  );
}
