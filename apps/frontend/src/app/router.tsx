import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { RequireAuth, useAuth } from "@/shared/auth/AuthProvider";
import { AuthPage } from "@/features/auth/AuthPage";
import { HomePage } from "@/features/home/HomePage";
import { DashboardPage } from "@/features/groups/HomePage";
import { GroupOverviewPage } from "@/features/groups/GroupOverviewPage";
import { ParticipantsPage } from "@/features/participants/ParticipantsPage";
import { BillsPage } from "@/features/bills/BillsPage";
import { SettlementsPage } from "@/features/settlements/SettlementsPage";
import { SettlementSharePage } from "@/features/settlements/SettlementSharePage";
import { SettingsPage } from "@/features/settings/SettingsPage";

function RootEntry() {
  const { hasWorkspaceAccess } = useAuth();
  return hasWorkspaceAccess ? <Navigate to="/dashboard" replace /> : <HomePage />;
}

function SettingsEntry() {
  const { isGuest } = useAuth();
  return isGuest ? <Navigate to="/dashboard" replace /> : <SettingsPage />;
}

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
    element: <RootEntry />
  },
  {
    path: "/",
    element: <RequireAuth><AppShell /></RequireAuth>,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "settings", element: <SettingsEntry /> },
      { path: "groups/:groupId", element: <Navigate to="overview" replace /> },
      { path: "groups/:groupId/overview", element: <GroupOverviewPage /> },
      { path: "groups/:groupId/participants", element: <ParticipantsPage /> },
      { path: "groups/:groupId/bills", element: <BillsPage /> },
      { path: "groups/:groupId/settlements", element: <SettlementsPage /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);
