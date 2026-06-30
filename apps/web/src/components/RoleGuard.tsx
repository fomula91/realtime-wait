import { useEffect } from "react";
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ADMIN_TOKEN_QUERY, type AdminPrincipal } from "@realtime-wait/shared";
import { useAdminKey } from "../lib/useAdminKey.js";
import { landingPath, usePrincipal } from "../lib/auth.js";

/** 셸·페이지가 Outlet context 로 공유받는 인증 컨텍스트 */
export interface AdminContext {
  principal: AdminPrincipal;
  adminKey: string;
  logout: () => void;
}

export function useAdminContext(): AdminContext {
  return useOutletContext<AdminContext>();
}

type Require = "super" | "event" | "booth";

/**
 * 역할별 네임스페이스 진입 가드.
 * - QR 딥링크(`?token=`)가 있으면 먼저 키로 저장하고 쿼리를 정리한다.
 * - 미인증이면 /login?next= 로, 권한 밖 범위면 자기 역할 홈으로 리다이렉트한다.
 * - 통과하면 principal·adminKey·logout 을 Outlet context 로 내려준다.
 */
export function RoleGuard({ require }: { require: Require }) {
  const { key, setKey } = useAdminKey();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeParams = useParams();
  const pendingToken = params.get(ADMIN_TOKEN_QUERY);

  // QR 딥링크 토큰을 키로 흡수하고 주소창에서 제거한다
  useEffect(() => {
    if (pendingToken) {
      setKey(pendingToken);
      params.delete(ADMIN_TOKEN_QUERY);
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingToken]);

  const { principal, loading, unauthorized } = usePrincipal(key);

  // 토큰 흡수 직전이거나 principal 확인 중에는 기다린다
  if (pendingToken || (loading && !principal)) {
    return <div className="container">불러오는 중…</div>;
  }

  if (unauthorized || !principal) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // 범위 검사 — 위반 시 자기 역할 홈으로
  const home = landingPath(principal);
  if (require === "super" && principal.role !== "super") {
    return <Navigate to={home} replace />;
  }
  if (require === "event") {
    const eventId = routeParams.eventId;
    const ok =
      principal.role === "super" ||
      (principal.role === "event" && principal.event_id === eventId);
    if (!ok) return <Navigate to={home} replace />;
  }
  if (require === "booth") {
    const boothId = routeParams.boothId;
    // 부스 어드민은 자기 부스만, 상위 역할(super/event)은 통과시켜 서버 가드에 맡긴다
    if (principal.role === "booth" && principal.booth_id !== boothId) {
      return <Navigate to={home} replace />;
    }
  }

  const ctx: AdminContext = {
    principal,
    adminKey: key,
    logout: () => {
      setKey("");
      navigate("/login", { replace: true });
    },
  };
  return <Outlet context={ctx} />;
}
