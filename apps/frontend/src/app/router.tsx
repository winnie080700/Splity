import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { RequireAuth, useAuth } from "@/shared/auth/AuthProvider";
import { AuthPage, AuthSsoCallbackPage } from "@/features/auth/AuthPage";
import { HomePage } from "@/features/home/HomePage";
import { DashboardPage } from "@/features/groups/HomePage";
import { GroupsListPage } from "@/features/groups/GroupsListPage";
import { GroupDetailPage } from "@/features/groups/GroupDetailPage";
import { GroupOverviewPage } from "@/features/groups/GroupOverviewPage";
import { ParticipantsPage } from "@/features/participants/ParticipantsPage";
import { BillsPage } from "@/features/bills/BillsPage";
import { SettlementsPage } from "@/features/settlements/SettlementsPage";
import { SettlementSharePage } from "@/features/settlements/SettlementSharePage";
import { SettingsPage } from "@/features/settings/SettingsPage";

function RootEntry() {
  const { hasWorkspaceAccess, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-[#f7f4ed]" />;
  }

  return hasWorkspaceAccess ? <Navigate to="/dashboard" replace /> : <HomePage />;
}

export const router = createBrowserRouter([
  {
    path: "/auth",
    element: <AuthPage />
  },
  {
    path: "/auth/sso-callback",
    element: <AuthSsoCallbackPage />
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
      { path: "settings", element: <SettingsPage /> },
      { path: "groups", element: <GroupsListPage /> },
      { path: "groups/:groupId", element: <GroupDetailPage /> },
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
