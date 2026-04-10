type SavedGroup = {
  id: string;
  name: string;
};

type AuthUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  paymentProfile: {
    payeeName: string;
    paymentMethod: string;
    accountName: string;
    accountNumber: string;
    notes: string;
    paymentQrDataUrl: string;
  };
  isEmailVerified: boolean;
  emailVerifiedAtUtc: string | null;
  emailVerificationPendingUntilUtc: string | null;
};

type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

const KEY = "splity.savedGroups";
const AUTH_KEY = "splity.auth";
const GROUPS_CHANGED_EVENT = "splity:groups-changed";

export function readSavedGroups(): SavedGroup[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SavedGroup[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGroup(group: SavedGroup) {
  const groups = readSavedGroups();
  const deduped = [group, ...groups.filter((x) => x.id !== group.id)].slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(deduped));
  window.dispatchEvent(new Event(GROUPS_CHANGED_EVENT));
}

export function syncSavedGroup(group: SavedGroup) {
  const groups = readSavedGroups();
  const existingIndex = groups.findIndex((entry) => entry.id === group.id);
  const nextGroups = existingIndex === -1
    ? [group, ...groups].slice(0, 10)
    : groups.map((entry) => entry.id === group.id ? group : entry);
  localStorage.setItem(KEY, JSON.stringify(nextGroups));
  window.dispatchEvent(new Event(GROUPS_CHANGED_EVENT));
}

export function removeSavedGroup(groupId: string) {
  const nextGroups = readSavedGroups().filter((group) => group.id !== groupId);
  localStorage.setItem(KEY, JSON.stringify(nextGroups));
  window.dispatchEvent(new Event(GROUPS_CHANGED_EVENT));
}

export function readAuthSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      accessToken?: string;
      user?: {
        id?: string;
        name?: string;
        username?: string | null;
        email?: string;
        paymentProfile?: {
          payeeName?: string;
          paymentMethod?: string;
          accountName?: string;
          accountNumber?: string;
          notes?: string;
          paymentQrDataUrl?: string;
        };
        isEmailVerified?: boolean;
        emailVerifiedAtUtc?: string | null;
        emailVerificationPendingUntilUtc?: string | null;
      };
    };
    if (!parsed?.accessToken || !parsed?.user?.id || !parsed.user.name || !parsed.user.email) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      user: {
        id: parsed.user.id,
        name: parsed.user.name,
        username: parsed.user.username?.trim() ?? null,
        email: parsed.user.email,
        paymentProfile: {
          payeeName: parsed.user.paymentProfile?.payeeName ?? "",
          paymentMethod: parsed.user.paymentProfile?.paymentMethod ?? "",
          accountName: parsed.user.paymentProfile?.accountName ?? "",
          accountNumber: parsed.user.paymentProfile?.accountNumber ?? "",
          notes: parsed.user.paymentProfile?.notes ?? "",
          paymentQrDataUrl: parsed.user.paymentProfile?.paymentQrDataUrl ?? ""
        },
        isEmailVerified: parsed.user.isEmailVerified ?? false,
        emailVerifiedAtUtc: parsed.user.emailVerifiedAtUtc ?? null,
        emailVerificationPendingUntilUtc: parsed.user.emailVerificationPendingUntilUtc ?? null
      }
    };
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_KEY);
}

export function getGroupsChangedEventName() {
  return GROUPS_CHANGED_EVENT;
}
