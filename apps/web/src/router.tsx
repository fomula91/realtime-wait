import { createBrowserRouter, Navigate, useParams } from "react-router-dom";
import { Layout } from "./Layout.js";
import { HomePage } from "./pages/HomePage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { RegisterPage } from "./pages/participant/RegisterPage.js";
import { StatusPage } from "./pages/participant/StatusPage.js";
import { RoleGuard } from "./components/RoleGuard.js";
import { AdminShell } from "./components/AdminShell.js";
import { SuperDashboardPage } from "./pages/super/SuperDashboardPage.js";
import { SuperAdminsPage } from "./pages/super/SuperAdminsPage.js";
import { EventDashboardPage } from "./pages/admin/EventDashboardPage.js";
import { QrSheetPage } from "./pages/admin/QrSheetPage.js";
import { AdminBoothDetailPage } from "./pages/admin/AdminBoothDetailPage.js";
import { BoothQueuePage } from "./pages/booth/BoothQueuePage.js";

/** 구 라우트 → 신 네임스페이스 리다이렉트 (북마크·구 QR 호환) */
function RedirectEventRegister() {
  const { eventId = "" } = useParams();
  return <Navigate to={`/e/${eventId}`} replace />;
}
function RedirectQueue() {
  const { queueEntryId = "" } = useParams();
  return <Navigate to={`/t/${queueEntryId}`} replace />;
}
function RedirectAdminBooths() {
  const { eventId = "" } = useParams();
  return <Navigate to={`/admin/${eventId}`} replace />;
}
function RedirectAdminQueue() {
  const { boothId = "" } = useParams();
  return <Navigate to={`/booth/${boothId}`} replace />;
}

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  // ===== 참가자 (공개) =====
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "e/:eventCode", element: <RegisterPage /> },
      { path: "t/:ticketId", element: <StatusPage /> },
    ],
  },

  // ===== 로그인 =====
  { path: "/login", element: <LoginPage /> },

  // ===== 슈퍼 어드민 =====
  {
    path: "/super",
    element: <RoleGuard require="super" />,
    children: [
      {
        element: <AdminShell />,
        children: [
          { index: true, element: <SuperDashboardPage /> },
          { path: "admins", element: <SuperAdminsPage /> },
        ],
      },
    ],
  },

  // ===== 행사 어드민 =====
  {
    path: "/admin/:eventId",
    element: <RoleGuard require="event" />,
    children: [
      {
        element: <AdminShell />,
        children: [
          { index: true, element: <EventDashboardPage /> },
          { path: "qr", element: <QrSheetPage /> },
          { path: "booths/:boothId", element: <AdminBoothDetailPage /> },
        ],
      },
    ],
  },

  // ===== 부스 어드민 =====
  {
    path: "/booth/:boothId",
    element: <RoleGuard require="booth" />,
    children: [
      {
        element: <AdminShell />,
        children: [{ index: true, element: <BoothQueuePage /> }],
      },
    ],
  },

  // ===== 레거시 리다이렉트 =====
  { path: "/admin", element: <Navigate to="/login" replace /> },
  { path: "/events/:eventId/register", element: <RedirectEventRegister /> },
  { path: "/queue/:queueEntryId", element: <RedirectQueue /> },
  { path: "/admin/events/:eventId/booths", element: <RedirectAdminBooths /> },
  { path: "/admin/booths/:boothId/queue", element: <RedirectAdminQueue /> },
]);
