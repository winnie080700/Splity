import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/react";
import { apiClient, setAccessTokenProvider, setApiClientOverride, type AuthUserDto } from "@api-client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { clearGuestWorkspace, guestApiClientOverride, initializeGuestWorkspace } from "@/shared/guest/guestWorkspace";
import { clearAuthSession } from "@/shared/utils/storage";

type AuthContextValue = {
  accessToken: string | null;
  user: AuthUserDto | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isClerkConfigured: boolean;
  hasWorkspaceAccess: boolean;
  isLoading: boolean;
  continueAsGuest: (defaultGroupName: string) => string;
  syncCurrentUser: () => Promise<AuthUserDto | null>;
  updateUser: (user: AuthUserDto) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  clerkEnabled = true
}: {
  children: ReactNode;
  clerkEnabled?: boolean;
}) {
  return clerkEnabled
    ? <ClerkEnabledAuthProvider>{children}</ClerkEnabledAuthProvider>
    : <ClerkDisabledAuthProvider>{children}</ClerkDisabledAuthProvider>;
}

function ClerkEnabledAuthProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useClerkAuth();
  const clerk = useClerk();
  const { isLoaded: isClerkUserLoaded, user: clerkUser } = useUser();
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isSyncingUser, setIsSyncingUser] = useState(false);

  const buildSyncPayload = useCallback(() => {
    const sourceUser = clerkUser ?? clerk.user;
    const primaryEmailAddress = sourceUser?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
    if (!sourceUser || !primaryEmailAddress) {
      return null;
    }

    return {
      email: primaryEmailAddress,
      username: sourceUser.username ?? null,
      name: sourceUser.fullName ?? sourceUser.firstName ?? sourceUser.username ?? primaryEmailAddress.split("@")[0],
      isEmailVerified: sourceUser.primaryEmailAddress?.verification?.status === "verified"
    };
  }, [clerk.user, clerkUser]);

  const syncCurrentUser = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setUser(null);
      setIsSyncingUser(false);
      return null;
    }

    setApiClientOverride(null);
    setAccessTokenProvider(async () => (await getToken()) ?? null);
    setIsSyncingUser(true);

    try {
      const syncPayload = buildSyncPayload();
      if (syncPayload) {
        const nextUser = await apiClient.syncCurrentUser(syncPayload);
        setUser(nextUser);
        return nextUser;
      }

      const nextUser = await apiClient.getCurrentUser();
      setUser(nextUser);
      return nextUser;
    }
    catch {
      if (isClerkUserLoaded) {
        const syncPayload = buildSyncPayload();
        if (syncPayload) {
          try {
            const nextUser = await apiClient.syncCurrentUser(syncPayload);
            setUser(nextUser);
            return nextUser;
          }
          catch {
          }
        }
      }

      try {
        const nextUser = await apiClient.getCurrentUser();
        setUser(nextUser);
        return nextUser;
      }
      catch {
        try {
          await clerk.user?.reload();
        }
        catch {
        }

        setUser(null);
        return null;
      }
    }
    finally {
      setIsSyncingUser(false);
    }
  }, [buildSyncPayload, clerk.user, getToken, isClerkUserLoaded, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    let disposed = false;

    if (!isSignedIn) {
      setAccessTokenProvider(null);
      clearAuthSession();
      setUser(null);
      setIsSyncingUser(false);
      return;
    }

    if (isGuest) {
      clearGuestWorkspace();
      setApiClientOverride(null);
      setIsGuest(false);
    }

    setApiClientOverride(null);
    void syncCurrentUser()
      .then((nextUser) => {
        if (!disposed && nextUser) {
          setUser(nextUser);
        }
      });

    return () => {
      disposed = true;
    };
  }, [isGuest, isLoaded, isSignedIn, syncCurrentUser]);

  const continueAsGuest = useCallback((defaultGroupName: string) => {
    clearAuthSession();
    setAccessTokenProvider(null);
    setUser(null);
    const group = initializeGuestWorkspace(defaultGroupName);
    setApiClientOverride(guestApiClientOverride);
    setIsGuest(true);
    return group.id;
  }, []);

  const updateUser = useCallback((nextUser: AuthUserDto) => {
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    setApiClientOverride(null);
    setAccessTokenProvider(null);
    clearGuestWorkspace();
    setIsGuest(false);
    clearAuthSession();
    setUser(null);

    if (isSignedIn) {
      await clerk.signOut({ redirectUrl: "/" });
    }
  }, [clerk, isSignedIn]);

  const isAuthenticated = Boolean(isSignedIn);
  const isLoading = !isLoaded || (isAuthenticated && !isGuest && isSyncingUser && !user);

  const value = useMemo<AuthContextValue>(() => ({
    accessToken: null,
    user,
    isAuthenticated,
    isGuest,
    isClerkConfigured: true,
    hasWorkspaceAccess: isAuthenticated || isGuest,
    isLoading,
    continueAsGuest,
    syncCurrentUser,
    updateUser,
    signOut
  }), [continueAsGuest, isAuthenticated, isGuest, isLoading, signOut, syncCurrentUser, updateUser, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ClerkDisabledAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const continueAsGuest = useCallback((defaultGroupName: string) => {
    clearAuthSession();
    setAccessTokenProvider(null);
    setUser(null);
    const group = initializeGuestWorkspace(defaultGroupName);
    setApiClientOverride(guestApiClientOverride);
    setIsGuest(true);
    return group.id;
  }, []);

  const updateUser = useCallback((nextUser: AuthUserDto) => {
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    setApiClientOverride(null);
    setAccessTokenProvider(null);
    clearGuestWorkspace();
    clearAuthSession();
    setUser(null);
    setIsGuest(false);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    accessToken: null,
    user,
    isAuthenticated: false,
    isGuest,
    isClerkConfigured: false,
    hasWorkspaceAccess: isGuest,
    isLoading: false,
    continueAsGuest,
    syncCurrentUser: async () => null,
    updateUser,
    signOut
  }), [continueAsGuest, isGuest, signOut, updateUser, user]);

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
  const { hasWorkspaceAccess, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen bg-[#f7f4ed]" />;
  }

  if (!hasWorkspaceAccess) {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }

  return <>{children}</>;
}
