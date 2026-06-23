import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { BoothRecord, EventRecord } from "@realtime-wait/shared";
import { api, ApiClientError } from "../../lib/api.js";

export function RegisterPage() {
  const { eventId = "" } = useParams();
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
      navigate(`/queue/${entry.id}`);
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
    <>
      <h1>{event?.name}</h1>
      {event?.description && <p className="muted">{event.description}</p>}

      <div className="card">
        <h2>대기 등록</h2>
        <label htmlFor="booth">부스 선택</label>
        <select
          id="booth"
          value={boothId}
          onChange={(e) => setBoothId(e.target.value)}
        >
          {booths.map((b) => (
            <option key={b.id} value={b.id} disabled={b.status !== "open"}>
              {b.name}
              {b.status !== "open" ? " (대기 불가)" : ""}
            </option>
          ))}
        </select>

        <label htmlFor="name">표시 이름</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 홍길동 (실명 아님)"
          maxLength={60}
        />

        <label htmlFor="note">메모 (선택)</label>
        <input
          id="note"
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

        <div className="row" style={{ marginTop: 16 }}>
          <button onClick={submit} disabled={!name.trim() || !boothId || submitting}>
            {submitting ? "등록 중…" : "대기열 등록"}
          </button>
        </div>
        <p className="poll-hint">
          실제 개인정보는 수집하지 않습니다. 표시용 이름만 사용됩니다.
        </p>
      </div>
    </>
  );
}
