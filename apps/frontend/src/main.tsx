import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "@/app/router";
import { AuthProvider } from "@/shared/auth/AuthProvider";
import { I18nProvider } from "@/shared/i18n/I18nProvider";
import { ToastProvider } from "@/shared/ui/toast";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
