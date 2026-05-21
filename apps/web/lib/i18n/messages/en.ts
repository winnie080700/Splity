export const en = {
  "common.back": "Back",
  "common.cancel": "Cancel",
  "common.loading": "Loading...",
  "common.saveChanges": "Save changes",
  "dashboard.groupsTitle": "Groups",
  "dashboard.noGroupsTitle": "No groups yet",
  "dashboard.noGroupsBody": "Create a group before adding participants and bills.",
  "settings.title": "Settings",
  "settings.body": "Manage your profile, payment defaults, password, and email verification.",
  "settings.profileTitle": "Profile",
  "settings.profileBody": "Update the name and username friends see when inviting you.",
  "settings.paymentTitle": "Payment profile",
  "settings.paymentBody": "These defaults prefill settlement share links.",
  "settings.passwordTitle": "Change password",
  "settings.passwordBody": "Confirm your current password before setting a new one.",
  "settings.emailTitle": "Email verification",
  "settings.emailVerified": "Verified",
  "settings.emailPending": "Pending",
  "settings.resendVerification": "Resend verification email",
} as const;

export type MessageKey = keyof typeof en;
