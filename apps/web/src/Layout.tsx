import { NavLink, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <>
      <nav className="nav">
        <strong>realtime-wait</strong>
        <NavLink to="/" end>
          홈
        </NavLink>
        <NavLink to="/admin">관리자</NavLink>
      </nav>
      <div className="container">
        <Outlet />
      </div>
    </>
  );
}
