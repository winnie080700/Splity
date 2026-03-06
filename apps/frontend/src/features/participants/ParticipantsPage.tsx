import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { apiClient } from "@api-client";
import { useState } from "react";

export function ParticipantsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const participantsQuery = useQuery({
    queryKey: ["participants", groupId],
    queryFn: () => apiClient.listParticipants(groupId!),
    enabled: Boolean(groupId)
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.createParticipant(groupId!, name.trim()),
    onSuccess: async () => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["participants", groupId] });
    }
  });

  return (
    <section className="card p-5">
      <h2 className="text-lg font-semibold">Participants</h2>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || !groupId) {
            return;
          }
          createMutation.mutate();
        }}
      >
        <input
          className="w-full rounded-xl border border-ink/20 px-3 py-2"
          placeholder="Add participant"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button className="rounded-xl bg-ink px-4 py-2 text-white" type="submit">Add</button>
      </form>

      <ul className="mt-4 space-y-2">
        {participantsQuery.data?.map((participant) => (
          <li key={participant.id} className="rounded-xl border border-ink/10 bg-white px-3 py-2">
            {participant.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
