import { ClerkProvider } from "@clerk/react";
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
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
const isClerkConfigured = clerkPublishableKey.length > 0;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isClerkConfigured ? (
      <ClerkProvider
        afterSignOutUrl="/"
        publishableKey={clerkPublishableKey}
        signInUrl="/auth"
        signUpUrl="/auth?mode=register"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider clerkEnabled>
            <I18nProvider>
              <ToastProvider>
                <RouterProvider router={router} />
              </ToastProvider>
            </I18nProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ClerkProvider>
    ) : (
      <QueryClientProvider client={queryClient}>
        <AuthProvider clerkEnabled={false}>
          <I18nProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </I18nProvider>
        </AuthProvider>
      </QueryClientProvider>
    )}
  </React.StrictMode>
);
