import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { setApiClientOverride, type AuthResultDto } from "@api-client";
import { clearGuestWorkspace, guestApiClientOverride, initializeGuestWorkspace } from "@/shared/guest/guestWorkspace";
import { clearAuthSession, readAuthSession, saveAuthSession } from "@/shared/utils/storage";

type AuthContextValue = {
  accessToken: string | null;
  user: AuthResultDto["user"] | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasWorkspaceAccess: boolean;
  signIn: (session: AuthResultDto) => void;
  continueAsGuest: (defaultGroupName: string) => string;
  updateUser: (user: AuthResultDto["user"]) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => readAuthSession());
  const [isGuest, setIsGuest] = useState(false);

  const signIn = useCallback((nextSession: AuthResultDto) => {
    setApiClientOverride(null);
    clearGuestWorkspace();
    setIsGuest(false);
    saveAuthSession(nextSession);
    setSession(nextSession);
  }, []);

  const continueAsGuest = useCallback((defaultGroupName: string) => {
    clearAuthSession();
    setSession(null);
    const group = initializeGuestWorkspace(defaultGroupName);
    setApiClientOverride(guestApiClientOverride);
    setIsGuest(true);
    return group.id;
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
    setApiClientOverride(null);
    clearGuestWorkspace();
    setIsGuest(false);
    clearAuthSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    accessToken: session?.accessToken ?? null,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.accessToken),
    isGuest,
    hasWorkspaceAccess: Boolean(session?.accessToken) || isGuest,
    signIn,
    continueAsGuest,
    updateUser,
    signOut
  }), [continueAsGuest, isGuest, session, signIn, signOut, updateUser]);

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
  const { hasWorkspaceAccess } = useAuth();
  const location = useLocation();

  if (!hasWorkspaceAccess) {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }

  return <>{children}</>;
}
