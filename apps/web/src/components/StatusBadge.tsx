import type { QueueEntryStatus } from "@realtime-wait/shared";

const LABELS: Record<QueueEntryStatus, string> = {
  waiting: "대기중",
  called: "호출됨",
  checked_in: "체크인",
  no_show: "노쇼",
  cancelled: "취소됨",
  expired: "만료",
};

/** 색에만 의존하지 않도록 아이콘 + 라벨을 함께 노출하고 aria-label 로 의미 전달 */
const ICONS: Record<QueueEntryStatus, string> = {
  waiting: "●",
  called: "🔔",
  checked_in: "✓",
  no_show: "✕",
  cancelled: "✕",
  expired: "⌛",
};

export function StatusBadge({ status }: { status: QueueEntryStatus }) {
  return (
    <span className={`badge ${status}`} aria-label={`상태: ${LABELS[status]}`}>
      <span aria-hidden="true">{ICONS[status]}</span>
      {LABELS[status]}
    </span>
  );
}
