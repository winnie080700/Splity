import { en } from "@/lib/i18n/messages/en";
import { createServiceRoleClient } from "@/lib/supabase/service";

type Email = { email: string; name: string };

function fill(template: string, values: Record<string, string>, escape = false) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(
        `{${key}}`,
        escape
          ? value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
          : value,
      ),
    template,
  );
}

function appUrl(path: string) {
  return `${(process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "")}${path}`;
}

async function verifiedUser(userId: string): Promise<Email | null> {
  const service = createServiceRoleClient();
  const [{ data }, profile] = await Promise.all([
    service.auth.admin.getUserById(userId),
    service.from("app_users").select("name").eq("id", userId).maybeSingle(),
  ]);
  const user = data.user;
  return user?.email && user.email_confirmed_at
    ? { email: user.email, name: profile.data?.name ?? user.email }
    : null;
}

async function send(to: Email[], subject: string, html: string) {
  const apiKey = process.env.MAILERSEND_API_KEY;
  const fromEmail = process.env.MAIL_FROM_EMAIL;
  if (!apiKey || !fromEmail || !to.length) return;

  await Promise.all(
    to.map(async (recipient) => {
      const response = await fetch("https://api.mailersend.com/v1/email", {
        body: JSON.stringify({
          from: { email: fromEmail, name: process.env.MAIL_FROM_NAME ?? "Splity" },
          subject,
          to: [recipient],
          html,
        }),
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) console.error("MailerSend request failed", response.status);
    }),
  );
}

async function notify(label: string, userIds: (string | null | undefined)[], subject: string, html: string) {
  try {
    const recipients = (
      await Promise.all(Array.from(new Set(userIds.filter((id): id is string => Boolean(id)))).map(verifiedUser))
    ).filter((recipient): recipient is Email => Boolean(recipient));
    await send(recipients, subject, html);
  } catch (error) {
    console.error(`${label} email failed`, error instanceof Error ? error.message : "unknown");
  }
}

export async function sendGroupInvitationEmail(input: {
  actorName: string;
  groupId: string;
  groupName: string;
  userId: string;
}) {
  const values = {
    actor: input.actorName,
    group: input.groupName,
    url: appUrl("/invitations"),
  };
  await notify(
    "Group invitation",
    [input.userId],
    fill(en["email.invitation.subject"], values),
    fill(en["email.invitation.body"], values, true),
  );
}

export async function sendGroupStatusEmail(input: {
  actorName: string;
  groupId: string;
  groupName: string;
  status: string;
  userIds: string[];
}) {
  const values = {
    actor: input.actorName,
    group: input.groupName,
    status: input.status,
    url: appUrl(`/groups/${input.groupId}`),
  };
  await notify(
    "Group status",
    input.userIds,
    fill(en["email.status.subject"], values),
    fill(en["email.status.body"], values, true),
  );
}

export async function sendPaymentMarkedEmail(input: {
  actorName: string;
  amount: string;
  groupName: string;
  receiverUserId: string;
  shareToken: string;
}) {
  const values = {
    actor: input.actorName,
    amount: input.amount,
    group: input.groupName,
    url: appUrl(`/share/${input.shareToken}`),
  };
  await notify(
    "Payment marked",
    [input.receiverUserId],
    fill(en["email.payment.subject"], values),
    fill(en["email.payment.body"], values, true),
  );
}

export async function sendPaymentReceivedEmail(input: {
  actorName: string;
  amount: string;
  groupName: string;
  payerUserId: string;
  shareToken: string;
}) {
  const values = {
    actor: input.actorName,
    amount: input.amount,
    group: input.groupName,
    url: appUrl(`/share/${input.shareToken}`),
  };
  await notify(
    "Payment received",
    [input.payerUserId],
    fill(en["email.received.subject"], values),
    fill(en["email.received.body"], values, true),
  );
}

export async function sendAllPaymentsReceivedEmail(input: {
  groupId: string;
  groupName: string;
  organizerUserId: string;
}) {
  const values = { group: input.groupName, url: appUrl(`/groups/${input.groupId}`) };
  await notify(
    "All payments received",
    [input.organizerUserId],
    fill(en["email.allReceived.subject"], values),
    fill(en["email.allReceived.body"], values, true),
  );
}

export async function sendParticipantRemovedEmail(input: {
  groupName: string;
  userId: string;
}) {
  const values = { group: input.groupName };
  await notify(
    "Participant removed",
    [input.userId],
    fill(en["email.participantRemoved.subject"], values),
    fill(en["email.participantRemoved.body"], values, true),
  );
}

export async function sendGroupDeletedEmail(input: { groupName: string; userIds: string[] }) {
  const values = { group: input.groupName };
  await notify(
    "Group deleted",
    input.userIds,
    fill(en["email.groupDeleted.subject"], values),
    fill(en["email.groupDeleted.body"], values, true),
  );
}
