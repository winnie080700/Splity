import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { HomePage } from "@/features/groups/HomePage";
import { ParticipantsPage } from "@/features/participants/ParticipantsPage";
import { BillsPage } from "@/features/bills/BillsPage";
import { SettlementsPage } from "@/features/settlements/SettlementsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "groups/:groupId/participants", element: <ParticipantsPage /> },
      { path: "groups/:groupId/bills", element: <BillsPage /> },
      { path: "groups/:groupId/settlements", element: <SettlementsPage /> },
      { path: "*", element: <Navigate to="/" replace /> }
    ]
  }
]);
