import { useCallback, useEffect, useRef, useState } from "react";

interface PollingState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** 즉시 한 번 다시 가져오기 */
  refetch: () => void;
}

/**
 * 주어진 fetcher 를 interval(ms) 주기로 polling 한다.
 * - 첫 로딩과 에러 상태를 구분해 노출한다.
 * - 화면이 background(탭 비활성) 일 때는 polling 을 멈춰 불필요한 요청을 줄인다.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  deps: unknown[] = [],
): PollingState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const savedFetcher = useRef(fetcher);
  savedFetcher.current = fetcher;

  const tick = useCallback(async () => {
    try {
      const result = await savedFetcher.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    // 폴링 위상 지터: 여러 클라이언트가 같은 순간에 겹쳐 쏘는 "동기화 버스트"를 완화한다.
    // 평균 주기는 intervalMs 로 유지(±10%)해 "요청량 = 사용자수 × 1/주기" 예측을 깨지 않는다.
    const nextDelay = () =>
      intervalMs + (Math.random() * 2 - 1) * intervalMs * 0.1;
    const scheduleNext = () => {
      timer = setTimeout(() => {
        void tick();
        scheduleNext();
      }, nextDelay());
    };

    const start = () => {
      if (timer) return;
      void tick(); // 첫 조회는 즉시 — 첫 렌더 지연 없음
      scheduleNext(); // 이후는 주기±지터로 위상 분산
    };
    const stop = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    setLoading(true);
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return { data, error, loading, refetch: tick };
}
