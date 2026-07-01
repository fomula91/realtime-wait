import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePolling } from "../src/lib/usePolling.js";

// Showcase 핵심: 주기 폴링 + 무음 갱신 + 에러 노출 + 탭 비활성 시 정지를 고정한다.
describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 각 테스트는 visible 에서 시작한다.
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });
  afterEach(() => vi.useRealTimers());

  it("첫 tick 성공 시 data 를 채우고 loading 을 내린다", async () => {
    const fetcher = vi.fn().mockResolvedValue("v1");
    const { result } = renderHook(() => usePolling(fetcher, 5000));

    expect(result.current.loading).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toBe("v1");
    expect(result.current.loading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("interval 마다 다시 fetch 하고, 무음 갱신(loading 재상승 없이 data 교체)한다", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");
    const { result } = renderHook(() => usePolling(fetcher, 5000));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toBe("v1");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current.data).toBe("v2");
    expect(result.current.loading).toBe(false); // 무음 갱신
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fetcher 실패 시 error 메시지를 노출한다", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => usePolling(fetcher, 5000));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.error).toBe("boom");
    expect(result.current.loading).toBe(false);
  });

  it("탭이 숨겨지면 polling 을 멈춰 추가 fetch 를 하지 않는다", async () => {
    const fetcher = vi.fn().mockResolvedValue("v");
    renderHook(() => usePolling(fetcher, 5000));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(fetcher).toHaveBeenCalledTimes(1); // 멈춰서 더 호출되지 않음
  });
});
