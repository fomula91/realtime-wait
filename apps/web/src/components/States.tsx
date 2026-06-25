/** 로딩·에러·빈 상태 공통 표현 (easy win 04) */

/** 목록 로딩 중 표시할 스켈레톤 행 */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="queue-list" aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-row" key={i}>
          <div className="skeleton skel-tile" />
          <div className="skel-lines">
            <div className="skeleton skel-line" style={{ width: "55%" }} />
            <div className="skeleton skel-line" style={{ width: "32%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 에러 + 다시 시도 버튼 */
export function ErrorRetry({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <span>{message}</span>
      <button className="red small" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  );
}

/** 친절한 빈 상태 */
export function EmptyState({
  emoji = "🎉",
  title,
  sub,
}: {
  emoji?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="state-box">
      <div className="emoji">{emoji}</div>
      <div className="title">{title}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
