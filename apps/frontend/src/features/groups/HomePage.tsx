import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "@api-client";
import { saveGroup, readSavedGroups } from "@/shared/utils/storage";
import { useMemo, useState } from "react";

export function HomePage() {
  const [name, setName] = useState("");
  const [savedVersion, setSavedVersion] = useState(0);

  const groups = useMemo(() => readSavedGroups(), [savedVersion]);

  const createGroup = useMutation({
    mutationFn: () => apiClient.createGroup(name.trim()),
    onSuccess: (group) => {
      saveGroup({ id: group.id, name: group.name });
      setSavedVersion((v) => v + 1);
      setName("");
    }
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card p-5">
        <h2 className="text-lg font-semibold">Create Group</h2>
        <p className="mt-1 text-sm text-ink/70">Local demo mode with no authentication.</p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) {
              return;
            }
            createGroup.mutate();
          }}
        >
          <input
            className="w-full rounded-xl border border-ink/20 px-3 py-2"
            placeholder="Weekend Trip"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            className="rounded-xl bg-ink px-4 py-2 text-white disabled:opacity-60"
            disabled={createGroup.isPending}
            type="submit"
          >
            Create
          </button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Recent Groups</h2>
        <ul className="mt-3 space-y-2">
          {groups.length === 0 && <li className="text-sm text-ink/70">No group saved yet.</li>}
          {groups.map((group) => (
            <li key={group.id} className="rounded-xl border border-ink/10 bg-white p-3">
              <div className="font-medium">{group.name}</div>
              <div className="mt-2 flex gap-2 text-sm">
                <Link className="rounded-full bg-sky px-3 py-1" to={`/groups/${group.id}/participants`}>Participants</Link>
                <Link className="rounded-full bg-mint px-3 py-1" to={`/groups/${group.id}/bills`}>Bills</Link>
                <Link className="rounded-full bg-amber px-3 py-1" to={`/groups/${group.id}/settlements`}>Settlement</Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
