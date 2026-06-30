import { useEffect, useState } from "react";
import type { AdminPrincipal } from "@realtime-wait/shared";
import { adminApi, ApiClientError } from "./api.js";

/** 역할별 기본 착지 경로 — 로그인 직후·범위 위반 리다이렉트에 쓴다 */
export function landingPath(principal: AdminPrincipal): string {
  if (principal.role === "super") return "/super";
  if (principal.role === "event" && principal.event_id)
    return `/admin/${principal.event_id}`;
  if (principal.role === "booth" && principal.booth_id)
    return `/booth/${principal.booth_id}`;
  return "/login";
}

interface PrincipalState {
  principal: AdminPrincipal | null;
  loading: boolean;
  /** 인증 실패(키 없음·무효) 여부 — 가드가 /login 으로 보낼 판단에 쓴다 */
  unauthorized: boolean;
}

/**
 * 저장된 데모 키/토큰을 /api/admin/me 로 해석해 현재 역할·범위를 가져온다.
 * 키가 없거나 무효이면 unauthorized=true.
 */
export function usePrincipal(key: string): PrincipalState {
  const [principal, setPrincipal] = useState<AdminPrincipal | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    let active = true;
    if (!key) {
      setPrincipal(null);
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    adminApi
      .getMe(key)
      .then((p) => {
        if (!active) return;
        setPrincipal(p);
        setUnauthorized(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setPrincipal(null);
        // UNAUTHORIZED 만 로그인으로 보내고, 그 외(네트워크 등)는 화면에서 처리
        setUnauthorized(
          err instanceof ApiClientError ? err.code === "UNAUTHORIZED" : false,
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [key]);

  return { principal, loading, unauthorized };
}
