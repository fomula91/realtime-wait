import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  PARTICIPANT_POLL_INTERVAL_MS,
  type QueueEntryStatusView,
} from "@realtime-wait/shared";
import { api, ApiClientError } from "../../lib/api.js";
import { usePolling } from "../../lib/usePolling.js";
import { ErrorRetry, SkeletonRows } from "../../components/States.js";

/** 예상 대기 = 내 앞 인원 × 1인당 가정 처리 시간(추정값) */
const PER_PERSON_MIN = 2;
/** 진행 링/바 채움 비율을 추정하기 위한 기준 대기 인원 */
const PROGRESS_CAP_AHEAD = 15;
/** 링 둘레: 2π × r(120) */
const RING_CIRCUMFERENCE = 754;

export function StatusPage() {
  const { ticketId = "" } = useParams();
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetcher = useCallback(() => api.getStatus(ticketId), [ticketId]);
  const { data, error, loading, refetch } = usePolling(
    fetcher,
    PARTICIPANT_POLL_INTERVAL_MS,
    [ticketId],
  );

  const cancel = async () => {
    setCancelError(null);
    try {
      await api.cancel(ticketId);
      refetch();
    } catch (err) {
      setCancelError(
        err instanceof ApiClientError ? err.message : "취소에 실패했습니다",
      );
    }
  };

  if (loading && !data)
    return (
      <div className="container narrow" style={{ padding: 0 }}>
        <SkeletonRows count={3} />
      </div>
    );
  if (error && !data)
    return (
      <div className="container narrow" style={{ padding: 0 }}>
        <ErrorRetry message={error} onRetry={refetch} />
      </div>
    );
  if (!data) return null;

  if (data.status === "called") return <CalledScreen data={data} onCancel={cancel} cancelError={cancelError} />;
  if (data.status === "waiting")
    return (
      <WaitingScreen
        data={data}
        onCancel={cancel}
        cancelError={cancelError}
      />
    );
  return <ResultScreen data={data} />;
}

type ScreenProps = {
  data: QueueEntryStatusView;
  onCancel: () => void;
  cancelError: string | null;
};

function WaitingScreen({ data, onCancel, cancelError }: ScreenProps) {
  const est = data.ahead_count * PER_PERSON_MIN;
  const progress = Math.min(
    0.97,
    Math.max(0.05, 1 - data.ahead_count / PROGRESS_CAP_AHEAD),
  );
  const dashoffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="container narrow" style={{ padding: 0 }}>
      <div className="spread" style={{ marginBottom: 6 }}>
        <div>
          <div className="eyebrow">{data.booth_name}</div>
        </div>
        <span className="badge waiting">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--blue)",
              animation: "rw-live 1.4s ease-in-out infinite",
            }}
          />
          대기중
        </span>
      </div>

      <div className="ring-wrap">
        <svg width="240" height="240" viewBox="0 0 280 280">
          <circle className="track" cx="140" cy="140" r="120" fill="none" strokeWidth="20" />
          <circle
            className="fill"
            cx="140"
            cy="140"
            r="120"
            fill="none"
            strokeWidth="20"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
          />
        </svg>
        <div className="ring-center">
          <div className="eyebrow">예상 대기 (추정)</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
            <span className="num">{est}</span>
            <span style={{ fontWeight: 800, fontSize: 22 }}>분</span>
          </div>
          <div style={{ font: "600 12px Pretendard", color: "var(--blue)", marginTop: 6 }}>
            {data.ahead_count === 0 ? "곧 차례가 와요" : "차례를 기다리는 중"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div
          className="spread"
          style={{ font: "600 12px Pretendard", color: "var(--muted)", marginBottom: 8 }}
        >
          <span>대기 진행 (추정)</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="progress">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="stat-row" style={{ marginTop: 18 }}>
        <div className="stat">
          <div className="k">내 번호</div>
          <div className="v">{data.queue_number}</div>
        </div>
        <div className="stat">
          <div className="k">내 앞에</div>
          <div className="v">
            {data.ahead_count}
            <span style={{ font: "700 13px Pretendard", color: "var(--muted)" }}> 명</span>
          </div>
        </div>
        <div className="stat">
          <div className="k">호출 중</div>
          <div className="v" style={{ color: "var(--amber)" }}>
            {data.booth_current_number}
          </div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 20, justifyContent: "center" }}>
        <button className="outline-red small" onClick={onCancel}>
          대기 취소
        </button>
      </div>
      {cancelError && (
        <p className="error" style={{ textAlign: "center" }}>{cancelError}</p>
      )}
      <p className="poll-hint" style={{ textAlign: "center" }}>
        <span className="live">
          <span className="dot" />
          {PARTICIPANT_POLL_INTERVAL_MS / 1000}초마다 자동 갱신
        </span>
      </p>
    </div>
  );
}

function CalledScreen({ data, onCancel, cancelError }: ScreenProps) {
  return (
    <div className="container narrow" style={{ padding: 0 }}>
      <div className="called-screen">
        <div className="ringer">
          <span className="bell">🔔</span>
        </div>
        <div className="headline">
          지금
          <br />
          입장하세요!
        </div>
        <div className="sub">
          내 번호 <b style={{ fontWeight: 900 }}>{data.queue_number}번</b>이 호출됐어요.
          <br />
          부스로 이동해 주세요.
        </div>
      </div>
      <div className="row" style={{ marginTop: 16, justifyContent: "center" }}>
        <button className="outline-red small" onClick={onCancel}>
          대기 취소
        </button>
      </div>
      {cancelError && (
        <p className="error" style={{ textAlign: "center" }}>{cancelError}</p>
      )}
      <p className="poll-hint" style={{ textAlign: "center" }}>
        {PARTICIPANT_POLL_INTERVAL_MS / 1000}초마다 자동 갱신됩니다.
      </p>
    </div>
  );
}

const RESULTS: Record<
  string,
  { emoji: string; title: string; desc: string; color: string }
> = {
  checked_in: { emoji: "✅", title: "체크인 완료", desc: "입장 처리되었습니다.", color: "var(--green-deep)" },
  no_show: { emoji: "⌛", title: "노쇼 처리됨", desc: "호출에 응답하지 않아 노쇼 처리되었습니다.", color: "var(--red-deep)" },
  cancelled: { emoji: "✖", title: "대기 취소됨", desc: "대기가 취소되었습니다.", color: "var(--red-deep)" },
  expired: { emoji: "⌛", title: "만료됨", desc: "대기 정보가 만료되었습니다.", color: "var(--red-deep)" },
};

function ResultScreen({ data }: { data: QueueEntryStatusView }) {
  const navigate = useNavigate();
  const r = RESULTS[data.status] ?? RESULTS.expired;
  // 체크인은 정상 완료, 나머지(취소·노쇼·만료)는 다시 등록할 수 있게 길을 열어 준다
  const canReRegister = data.status !== "checked_in";
  return (
    <div className="container narrow" style={{ padding: 0 }}>
      <div className="eyebrow">{data.booth_name}</div>
      <div className="result-screen" style={{ marginTop: 12 }}>
        <div className="emoji">{r.emoji}</div>
        <div className="headline" style={{ color: r.color }}>
          {r.title}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {r.desc}
        </p>
        <div className="stat-row" style={{ marginTop: 22 }}>
          <div className="stat">
            <div className="k">내 번호</div>
            <div className="v">{data.queue_number}</div>
          </div>
        </div>
      </div>
      {canReRegister && (
        <button
          className="block"
          style={{ marginTop: 14 }}
          onClick={() => navigate(`/e/${data.event_id}`)}
        >
          다시 등록하기 →
        </button>
      )}
    </div>
  );
}
