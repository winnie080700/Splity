import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getAppUser } from "@/lib/auth/server";

export async function listGroupActivity(groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_activity_logs")
    .select("id, actor_user_id, event_type, summary_data, created_at_utc")
    .eq("group_id", groupId)
    .order("created_at_utc", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export async function recordGroupActivity(input: {
  eventType: string;
  groupId: string;
  summary: Record<string, unknown>;
}) {
  try {
    const actor = await getAppUser();
    const service = createServiceRoleClient();
    const { data: duplicate } = await service
      .from("group_activity_logs")
      .select("id")
      .eq("group_id", input.groupId)
      .eq("event_type", input.eventType)
      .contains("summary_data", input.summary)
      .gte("created_at_utc", new Date(Date.now() - 5000).toISOString())
      .limit(1)
      .maybeSingle();
    if (duplicate) return;

    await service.from("group_activity_logs").insert({
      actor_user_id: actor?.id ?? null,
      event_type: input.eventType,
      group_id: input.groupId,
      summary_data: {
        ...input.summary,
        actorName: actor?.name ?? "Splity",
      },
    });
  } catch (error) {
    console.error("Failed to record group activity", error instanceof Error ? error.message : "unknown");
  }
}
