import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { AuthResultDto } from "@api-client";
import { clearAuthSession, readAuthSession, saveAuthSession } from "@/shared/utils/storage";

type AuthContextValue = {
  accessToken: string | null;
  user: AuthResultDto["user"] | null;
  isAuthenticated: boolean;
  signIn: (session: AuthResultDto) => void;
  updateUser: (user: AuthResultDto["user"]) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => readAuthSession());

  const signIn = useCallback((nextSession: AuthResultDto) => {
    saveAuthSession(nextSession);
    setSession(nextSession);
  }, []);

  const updateUser = useCallback((user: AuthResultDto["user"]) => {
    setSession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      const nextSession = { ...currentSession, user };
      saveAuthSession(nextSession);
      return nextSession;
    });
  }, []);

  const signOut = useCallback(() => {
    clearAuthSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    accessToken: session?.accessToken ?? null,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.accessToken),
    signIn,
    updateUser,
    signOut
  }), [session, signIn, signOut, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }

  return <>{children}</>;
}
