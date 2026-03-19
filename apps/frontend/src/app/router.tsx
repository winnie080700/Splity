import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { RequireAuth } from "@/shared/auth/AuthProvider";
import { AuthPage } from "@/features/auth/AuthPage";
import { HomePage } from "@/features/groups/HomePage";
import { ParticipantsPage } from "@/features/participants/ParticipantsPage";
import { BillsPage } from "@/features/bills/BillsPage";
import { SettlementsPage } from "@/features/settlements/SettlementsPage";
import { SettlementSharePage } from "@/features/settlements/SettlementSharePage";

export const router = createBrowserRouter([
  {
    path: "/auth",
    element: <AuthPage />
  },
  {
    path: "/groups/:groupId/settlements/share",
    element: <SettlementSharePage />
  },
  {
    path: "/s/:shareToken",
    element: <SettlementSharePage />
  },
  {
    path: "/",
    element: <RequireAuth><AppShell /></RequireAuth>,
    children: [
      { index: true, element: <HomePage /> },
      { path: "groups/:groupId/participants", element: <ParticipantsPage /> },
      { path: "groups/:groupId/bills", element: <BillsPage /> },
      { path: "groups/:groupId/settlements", element: <SettlementsPage /> },
      { path: "*", element: <Navigate to="/" replace /> }
    ]
  }
]);
