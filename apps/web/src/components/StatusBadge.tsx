import type { QueueEntryStatus } from "@realtime-wait/shared";

const LABELS: Record<QueueEntryStatus, string> = {
  waiting: "대기중",
  called: "호출됨",
  checked_in: "체크인",
  no_show: "노쇼",
  cancelled: "취소됨",
  expired: "만료",
};

export function StatusBadge({ status }: { status: QueueEntryStatus }) {
  return <span className={`badge ${status}`}>{LABELS[status]}</span>;
}
