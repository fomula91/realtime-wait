import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { BoothRecord, EventRecord } from "@realtime-wait/shared";
import { api, ApiClientError } from "../../lib/api.js";

export function RegisterPage() {
  const { eventCode = "" } = useParams();
  const eventId = eventCode;
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [booths, setBooths] = useState<BoothRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [boothId, setBoothId] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api.getEvent(eventId), api.listBooths(eventId)])
      .then(([ev, bs]) => {
        if (!active) return;
        setEvent(ev);
        setBooths(bs);
        const firstOpen = bs.find((b) => b.status === "open");
        if (firstOpen) setBoothId(firstOpen.id);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (active)
          setLoadError(
            err instanceof Error ? err.message : "행사를 불러올 수 없습니다",
          );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [eventId]);

  const submit = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      const entry = await api.register(eventId, boothId, {
        participant_name: name.trim(),
        participant_note: note.trim() || undefined,
      });
      navigate(`/t/${entry.id}`);
    } catch (err) {
      setFormError(
        err instanceof ApiClientError ? err.message : "등록에 실패했습니다",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="muted">불러오는 중…</p>;
  if (loadError) return <p className="error">{loadError}</p>;

  return (
    <div className="container narrow" style={{ padding: 0 }}>
      <div className="eyebrow" style={{ color: "var(--blue)" }}>
        {event?.name}
      </div>
      <h1 style={{ marginTop: 8 }}>
        어느 부스에서
        <br />
        기다릴까요?
      </h1>

      <label>부스 선택</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {booths.map((b) => {
          const open = b.status === "open";
          const selected = b.id === boothId;
          return (
            <div
              key={b.id}
              className={`select-card${selected ? " selected" : ""}${open ? "" : " disabled"}`}
              onClick={() => open && setBoothId(b.id)}
            >
              <div>
                <div className="title">{b.name}</div>
                <div
                  className="sub"
                  style={selected ? { color: "var(--blue)" } : undefined}
                >
                  {open
                    ? `운영중 · 현재 호출 ${b.current_number}번`
                    : "대기 마감"}
                </div>
              </div>
              {open ? (
                <div className="check">{selected ? "✓" : ""}</div>
              ) : (
                <span
                  style={{
                    font: "700 11px Pretendard",
                    color: "var(--muted)",
                    background: "#e0e0e3",
                    borderRadius: 999,
                    padding: "4px 10px",
                  }}
                >
                  마감
                </span>
              )}
            </div>
          );
        })}
      </div>

      <label>표시 이름</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예: 홍길동 (실명 아님)"
        maxLength={60}
      />

      <label>메모 (선택)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="요청 사항 등"
        maxLength={200}
      />

      {formError && (
        <p className="error" style={{ marginTop: 12 }}>
          {formError}
        </p>
      )}

      <button
        className="block"
        style={{ marginTop: 18 }}
        onClick={submit}
        disabled={!name.trim() || !boothId || submitting}
      >
        {submitting ? "등록 중…" : "대기열 등록하기"}
      </button>
      <p
        className="poll-hint"
        style={{ textAlign: "center", marginTop: 12 }}
      >
        표시용 이름만 사용 · 실제 개인정보 미수집
      </p>
    </div>
  );
}
