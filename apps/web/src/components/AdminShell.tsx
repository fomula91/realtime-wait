import { NavLink, Outlet } from "react-router-dom";
import { ADMIN_POLL_INTERVAL_MS, type AdminRole } from "@realtime-wait/shared";
import { useAdminContext } from "./RoleGuard.js";

/** 역할 티어 점 — 슈퍼=검정3 · 행사=파랑2 · 부스=앰버1 (제안서 권한 티어 표기) */
export function RoleDots({ role }: { role: AdminRole }) {
  const conf = {
    super: { on: 3, color: "#15171c" },
    event: { on: 2, color: "#2b59ff" },
    booth: { on: 1, color: "#ff7a1a" },
  }[role];
  return (
    <span className="role-dots" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <i
          key={i}
          style={{ background: i < conf.on ? conf.color : "rgba(255,255,255,.28)" }}
        />
      ))}
    </span>
  );
}

const ROLE_LABEL: Record<AdminRole, string> = {
  super: "슈퍼 어드민",
  event: "행사 어드민",
  booth: "부스 어드민",
};

/**
 * 세 역할(super/event/booth) 공용 셸.
 * 다크 토픽바에 역할 칩·컨텍스트·라이브 표시를 그리고, 역할별 네비를 노출한다.
 * principal 은 RoleGuard 가 Outlet context 로 내려준 값을 쓴다.
 */
export function AdminShell() {
  const ctx = useAdminContext();
  const { principal, logout } = ctx;
  const eventId = principal.event_id;

  return (
    <>
      <div className="op-topbar" style={{ borderRadius: 0 }}>
        <div className="row" style={{ gap: 16 }}>
          <span className="brand">realtime-wait</span>
          <span className="sep" />
          <div>
            <div className="ctx-title">{principal.label}</div>
            {principal.role !== "super" && eventId && (
              <div className="ctx-sub">{eventId}</div>
            )}
            {principal.role === "super" && (
              <div className="ctx-sub">전체 플랫폼 · 모든 행사</div>
            )}
          </div>
          <span className={`role-chip ${principal.role}`}>
            <RoleDots role={principal.role} />
            {ROLE_LABEL[principal.role]}
          </span>
        </div>

        <div className="row" style={{ gap: 14 }}>
          <nav className="shell-nav">
            {principal.role === "super" && (
              <>
                <NavLink to="/super" end>
                  대시보드
                </NavLink>
                <NavLink to="/super/admins">어드민 · QR</NavLink>
              </>
            )}
            {principal.role === "event" && eventId && (
              <>
                <NavLink to={`/admin/${eventId}`} end>
                  부스
                </NavLink>
                <NavLink to={`/admin/${eventId}/qr`}>QR 출력</NavLink>
              </>
            )}
          </nav>
          <span className="live">
            <span className="dot" />
            {ADMIN_POLL_INTERVAL_MS / 1000}초 갱신
          </span>
          <button className="ghost small" onClick={logout}>
            로그아웃
          </button>
        </div>
      </div>

      <div className="container">
        <Outlet context={ctx} />
      </div>
    </>
  );
}
