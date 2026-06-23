-- realtime-wait D1 schema
-- 모든 timestamp 는 ISO8601 문자열(UTC)로 저장한다.

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS booths (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  current_number INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE IF NOT EXISTS queue_entries (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  booth_id TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  participant_note TEXT,
  queue_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TEXT NOT NULL,
  called_at TEXT,
  checked_in_at TEXT,
  no_show_at TEXT,
  cancelled_at TEXT,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (booth_id) REFERENCES booths(id)
);

CREATE TABLE IF NOT EXISTS call_logs (
  id TEXT PRIMARY KEY,
  queue_entry_id TEXT NOT NULL,
  booth_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (queue_entry_id) REFERENCES queue_entries(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL
);

-- polling 쿼리 최적화를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_booths_event ON booths(event_id);
CREATE INDEX IF NOT EXISTS idx_queue_booth_status ON queue_entries(booth_id, status, queue_number);
CREATE INDEX IF NOT EXISTS idx_queue_event ON queue_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_entry ON call_logs(queue_entry_id);
