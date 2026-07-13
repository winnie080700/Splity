export function transferActivitySummary(
  summary: Record<string, unknown>,
  participantNames: Map<string, string>
) {
  const participantId = String(summary.fromParticipantId ?? "");
  if (!participantId) return null;

  return {
    messageKey:
      Number(summary.status) === 2
        ? "groupDetail.activity.transfer_marked_received"
        : "groupDetail.activity.transfer_marked_paid",
    name: participantNames.get(participantId) ?? "",
  } as const;
}
