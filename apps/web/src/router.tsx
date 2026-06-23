import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./Layout.js";
import { HomePage } from "./pages/HomePage.js";
import { RegisterPage } from "./pages/participant/RegisterPage.js";
import { StatusPage } from "./pages/participant/StatusPage.js";
import { AdminEventsPage } from "./pages/admin/AdminEventsPage.js";
import { AdminBoothsPage } from "./pages/admin/AdminBoothsPage.js";
import { AdminQueuePage } from "./pages/admin/AdminQueuePage.js";

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "events/:eventId/register", element: <RegisterPage /> },
      { path: "queue/:queueEntryId", element: <StatusPage /> },
      { path: "admin", element: <AdminEventsPage /> },
      { path: "admin/events/:eventId/booths", element: <AdminBoothsPage /> },
      { path: "admin/booths/:boothId/queue", element: <AdminQueuePage /> },
    ],
  },
]);
