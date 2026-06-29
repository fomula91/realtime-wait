-- realtime-wait 데모 seed 데이터
-- 실제 개인정보는 포함하지 않으며 모두 가상의 데모 값이다.

DELETE FROM call_logs;
DELETE FROM queue_entries;
DELETE FROM admin_tokens;
DELETE FROM booths;
DELETE FROM events;

INSERT INTO events (id, name, description, status, starts_at, ends_at, created_at, updated_at)
VALUES
  ('evt_demo', '2026 테크 페어 데모', '포트폴리오 데모용 행사', 'active',
   '2026-06-23T00:00:00.000Z', '2026-06-23T10:00:00.000Z',
   '2026-06-23T00:00:00.000Z', '2026-06-23T00:00:00.000Z');

INSERT INTO booths (id, event_id, name, description, zone, status, current_number, created_at, updated_at)
VALUES
  ('booth_a', 'evt_demo', 'AI 상담 부스', '실시간 대기열 데모 A', 'A', 'open', 0,
   '2026-06-23T00:00:00.000Z', '2026-06-23T00:00:00.000Z'),
  ('booth_b', 'evt_demo', '채용 상담 부스', '실시간 대기열 데모 B', 'B', 'open', 0,
   '2026-06-23T00:00:00.000Z', '2026-06-23T00:00:00.000Z');

-- 데모 범위 토큰: 행사 어드민 1개 + 부스 어드민 2개(QR 로그인용)
INSERT INTO admin_tokens (token, role, event_id, booth_id, label, created_at, revoked_at)
VALUES
  ('evt-demo-token', 'event', 'evt_demo', NULL, '2026 테크 페어 데모', '2026-06-23T00:00:00.000Z', NULL),
  ('booth-a-token', 'booth', 'evt_demo', 'booth_a', 'AI 상담 부스', '2026-06-23T00:00:00.000Z', NULL),
  ('booth-b-token', 'booth', 'evt_demo', 'booth_b', '채용 상담 부스', '2026-06-23T00:00:00.000Z', NULL);

INSERT INTO queue_entries
  (id, event_id, booth_id, participant_name, participant_note, queue_number, status, created_at)
VALUES
  ('q_demo_1', 'evt_demo', 'booth_a', '데모참가자1', NULL, 1, 'waiting', '2026-06-23T00:01:00.000Z'),
  ('q_demo_2', 'evt_demo', 'booth_a', '데모참가자2', NULL, 2, 'waiting', '2026-06-23T00:02:00.000Z'),
  ('q_demo_3', 'evt_demo', 'booth_a', '데모참가자3', NULL, 3, 'waiting', '2026-06-23T00:03:00.000Z');
