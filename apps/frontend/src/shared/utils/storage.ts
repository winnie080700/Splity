type SavedGroup = {
  id: string;
  name: string;
};

const KEY = "splity.savedGroups";

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
}
