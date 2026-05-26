"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  Children,
  createContext,
  useActionState,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { T } from "@/components/i18n/t";
import { useTranslation, type MessageKey } from "@/lib/i18n";
import {
  createGroupFromGroupsAction,
  deleteGroupFromGroupsAction,
  renameGroupFromGroupsAction,
  type GroupsPageActionState,
} from "./actions";

type StatusFilter = "all" | "unresolved" | "settling" | "settled";

type SearchableGroup = {
  id: string;
  name: string;
  status: StatusFilter;
};

type GroupsSearchContextValue = {
  query: string;
  setQuery: (query: string) => void;
  status: StatusFilter;
  setStatus: (status: StatusFilter) => void;
};

type CardActionsProps = {
  groupId: string;
  groupName: string;
};

const PAGE_SIZE = 6;
const initialActionState: GroupsPageActionState = { error: null, success: null };
const GroupsSearchContext = createContext<GroupsSearchContextValue | null>(null);

function useGroupsSearch() {
  const context = useContext(GroupsSearchContext);

  if (!context) {
    throw new Error("useGroupsSearch must be used within GroupsSearchProvider.");
  }

  return context;
}

export function GroupsSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const value = useMemo(() => ({ query, setQuery, status, setStatus }), [query, status]);

  return <GroupsSearchContext.Provider value={value}>{children}</GroupsSearchContext.Provider>;
}

function SubmitButton({
  children,
  className,
  pendingToastKey = "common.saving",
}: {
  children: ReactNode;
  className?: string;
  pendingToastKey?: MessageKey;
}) {
  const { pending } = useFormStatus();
  const toastId = useRef<string | number | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (pending && toastId.current === null) {
      toastId.current = toast.loading(t(pendingToastKey));
    }
    if (!pending && toastId.current !== null) {
      toast.dismiss(toastId.current);
      toastId.current = null;
    }

    return () => {
      if (toastId.current !== null) {
        toast.dismiss(toastId.current);
        toastId.current = null;
      }
    };
  }, [pending, pendingToastKey, t]);

  return (
    <button
      className={[
        "inline-flex h-11 items-center justify-center rounded-xl bg-[var(--splity-navy)] px-4 text-sm font-bold text-white transition hover:bg-[#25377f] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={pending}
      type="submit"
    >
      {pending ? <T k="common.saving" /> : children}
    </button>
  );
}

function LiveGroupSearch() {
  const { query, setQuery } = useGroupsSearch();
  const { t } = useTranslation();

  return (
    <div className="flex h-12 min-w-0 items-center gap-2 rounded-2xl border border-[var(--splity-line)] bg-white px-4 shadow-[0_18px_44px_rgba(27,42,107,0.08)] transition">
      <Search className="h-4 w-4 shrink-0 text-[var(--splity-muted)]" />
      <input
        aria-label={t("groupsView.search")}
        className="w-48 min-w-0 bg-transparent text-sm font-medium text-[var(--splity-ink)] outline-none placeholder:text-[var(--splity-muted)] sm:w-64"
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("groupsView.search")}
        value={query}
      />
      {query ? (
        <button
          aria-label={t("groupsView.clearSearch")}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]"
          onClick={() => setQuery("")}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function NewGroupModal({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <ModalFrame onClose={onClose}>
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,rgba(27,42,107,0.10),rgba(233,177,66,0.18))] p-5">
        <span className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/45" />
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--splity-navy)] text-[var(--splity-gold)] shadow-lg">
          <Plus className="h-5 w-5" />
        </span>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--splity-gold-strong)]">
          <T k="groupsView.eyebrow" />
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--splity-ink)]">
          <T k="groupsView.startTitle" />
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--splity-muted)]">
          <T k="groupsView.startBody" />
        </p>
      </div>

      <form action={createGroupFromGroupsAction} className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-bold text-[var(--splity-ink)]">
          <T k="dashboard.groupName" />
          <input
            autoFocus
            className="h-12 rounded-xl border border-[var(--splity-line-strong)] bg-white px-3 text-base font-medium outline-none transition placeholder:text-[var(--splity-muted)] focus:border-[var(--splity-navy)] focus:ring-4 focus:ring-[rgba(27,42,107,0.08)]"
            maxLength={200}
            name="name"
            placeholder={t("dashboard.groupNamePlaceholder")}
            required
          />
        </label>
        <SubmitButton pendingToastKey="dashboard.creatingGroup">
          <T k="dashboard.newGroup" />
        </SubmitButton>
      </form>
    </ModalFrame>
  );
}

function EditGroupModal({
  groupId,
  groupName,
  onClose,
  open,
}: CardActionsProps & {
  onClose: () => void;
  open: boolean;
}) {
  const [state, formAction] = useActionState(renameGroupFromGroupsAction, initialActionState);
  const { t } = useTranslation();

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      onClose();
    }
    if (state.error) toast.error(state.error);
  }, [onClose, state.error, state.success]);

  if (!open) return null;

  return (
    <ModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--splity-gold-strong)]">
            <T k="groups.settings" />
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--splity-ink)]">
            <T k="groups.rename" />
          </h2>
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <form action={formAction} className="mt-5 grid gap-4">
        <input name="groupId" type="hidden" value={groupId} />
        <label className="grid gap-2 text-sm font-bold text-[var(--splity-ink)]">
          <T k="groups.name" />
          <input
            autoFocus
            className="h-12 rounded-xl border border-[var(--splity-line-strong)] bg-white px-3 text-base font-medium outline-none transition placeholder:text-[var(--splity-muted)] focus:border-[var(--splity-navy)] focus:ring-4 focus:ring-[rgba(27,42,107,0.08)]"
            defaultValue={groupName}
            maxLength={200}
            name="name"
            required
          />
        </label>
        {state.error ? <p className="text-sm font-semibold text-[var(--splity-rose)]">{state.error}</p> : null}
        {state.success ? <p className="text-sm font-semibold text-[var(--splity-mint)]">{state.success}</p> : null}
        <SubmitButton>
          <T k="groups.rename" />
        </SubmitButton>
      </form>
    </ModalFrame>
  );
}

function DeleteGroupModal({
  groupId,
  groupName,
  onClose,
  open,
}: CardActionsProps & {
  onClose: () => void;
  open: boolean;
}) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <ModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--splity-rose)]">
            <T k="groups.deleteGroup" />
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--splity-ink)]">
            <T k="groups.deleteTitle" />
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--splity-muted)]">
            {groupName}
          </p>
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <form action={deleteGroupFromGroupsAction} className="mt-5 grid gap-3" onSubmit={() => toast.loading(t("groups.deleting"))}>
        <input name="groupId" type="hidden" value={groupId} />
        <button
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--splity-rose)] px-4 text-sm font-bold text-white transition hover:bg-[#a83e3e]"
          type="submit"
        >
          <T k="groups.deleteGroup" />
        </button>
        <button
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-white px-4 text-sm font-bold text-[var(--splity-ink)] transition hover:bg-[var(--splity-bg)]"
          onClick={onClose}
          type="button"
        >
          <T k="common.cancel" />
        </button>
      </form>
    </ModalFrame>
  );
}

function ModalFrame({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(12,21,56,0.30)] px-4 py-8 backdrop-blur-sm">
      <button
        aria-label={t("common.close")}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className="relative w-full max-w-md rounded-3xl border border-[var(--splity-line)] bg-white p-4 shadow-2xl sm:p-5">
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <button
      aria-label={t("common.close")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--splity-line)] text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]"
      onClick={onClose}
      type="button"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function NewGroupDialogTrigger({
  children,
}: {
  children: (open: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {children(() => setOpen(true))}
      <NewGroupModal onClose={() => setOpen(false)} open={open} />
    </>
  );
}

export function GroupsHeaderActions() {
  return (
    <div className="flex flex-wrap items-center gap-3 xl:justify-end">
      <LiveGroupSearch />
      <NewGroupDialogTrigger>
        {(open) => (
          <button
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[var(--splity-navy)] px-5 text-sm font-bold text-white shadow-[0_18px_36px_rgba(27,42,107,0.22)] transition hover:-translate-y-0.5 hover:bg-[#25377f]"
            onClick={open}
            type="button"
          >
            <Plus className="h-4 w-4" />
            <T k="dashboard.newGroup" />
          </button>
        )}
      </NewGroupDialogTrigger>
    </div>
  );
}

export function StatusFilterBar({
  counts,
}: {
  counts: Record<StatusFilter, number>;
}) {
  const { status, setStatus } = useGroupsSearch();

  return (
    <div className="flex flex-wrap gap-2">
      <StatusButton active={status === "all"} count={counts.all} onClick={() => setStatus("all")}>
        <T k="groupsView.tabAll" />
      </StatusButton>
      <StatusButton
        active={status === "unresolved"}
        count={counts.unresolved}
        dot="bg-[var(--splity-rose)]"
        onClick={() => setStatus("unresolved")}
      >
        <T k="groups.status.unresolved" />
      </StatusButton>
      <StatusButton
        active={status === "settling"}
        count={counts.settling}
        dot="bg-[var(--splity-gold-strong)]"
        onClick={() => setStatus("settling")}
      >
        <T k="groups.status.settling" />
      </StatusButton>
      <StatusButton
        active={status === "settled"}
        count={counts.settled}
        dot="bg-[var(--splity-mint)]"
        onClick={() => setStatus("settled")}
      >
        <T k="groups.status.settled" />
      </StatusButton>
    </div>
  );
}

function StatusButton({
  active,
  children,
  count,
  dot,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  count: number;
  dot?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition",
        active
          ? "border-[var(--splity-navy)] bg-[var(--splity-navy)] text-white shadow-[0_10px_22px_rgba(27,42,107,0.18)]"
          : "border-[var(--splity-line)] bg-white text-[var(--splity-ink)] hover:border-[var(--splity-line-strong)]",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {dot ? <span className={`h-2 w-2 rounded-full ${dot}`} /> : null}
      <span>{children}</span>
      <span className={active ? "text-white/80" : "text-[var(--splity-muted)]"}>{count}</span>
    </button>
  );
}

export function SearchableGroupsSection({
  children,
  groups,
}: {
  children: ReactNode;
  groups: SearchableGroup[];
}) {
  const { query, status } = useGroupsSearch();
  const [page, setPage] = useState(1);
  const normalized = query.trim().toLowerCase();
  const cards = Children.toArray(children);
  const visibleIndexes = groups
    .map((group, index) => ({ group, index }))
    .filter(({ group }) => {
      const matchesQuery = !normalized || group.name.toLowerCase().includes(normalized);
      const matchesStatus = status === "all" || group.status === status;
      return matchesQuery && matchesStatus;
    })
    .map(({ index }) => index);
  const totalPages = Math.max(Math.ceil(visibleIndexes.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const pageIndexes = visibleIndexes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const showStartCard = pageIndexes.length < PAGE_SIZE && visibleIndexes.length > 0;

  useEffect(() => {
    setPage(1);
  }, [query, status]);

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {pageIndexes.map((index) => (
          <div className="h-full" key={groups[index]?.id ?? index}>
            {cards[index]}
          </div>
        ))}
        {visibleIndexes.length === 0 ? <NoSearchResults /> : null}
        {showStartCard ? <StartGroupCard /> : null}
      </section>
      {visibleIndexes.length > PAGE_SIZE ? (
        <Pagination currentPage={currentPage} onPageChange={setPage} totalPages={totalPages} />
      ) : null}
    </div>
  );
}

function Pagination({
  currentPage,
  onPageChange,
  totalPages,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        aria-label={t("groupsView.previousPage")}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] disabled:opacity-40"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
        <button
          className={[
            "inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-bold transition",
            currentPage === page
              ? "bg-[var(--splity-navy)] text-white"
              : "border border-[var(--splity-line)] bg-white text-[var(--splity-ink)] hover:bg-[var(--splity-bg)]",
          ].join(" ")}
          key={page}
          onClick={() => onPageChange(page)}
          type="button"
        >
          {page}
        </button>
      ))}
      <button
        aria-label={t("groupsView.nextPage")}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] disabled:opacity-40"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function NoSearchResults() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--splity-line-strong)] bg-white/45 p-10 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--splity-navy)] text-[var(--splity-gold)]">
        <Search className="h-5 w-5" />
      </span>
      <h2 className="mt-5 text-2xl font-bold">
        <T k="groupsView.noResultsTitle" />
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--splity-muted)]">
        <T k="groupsView.noResultsBody" />
      </p>
    </div>
  );
}

export function StartGroupCard() {
  return (
    <NewGroupDialogTrigger>
      {(open) => (
        <button
          className="grid min-h-56 w-full place-items-center rounded-3xl border border-dashed border-[var(--splity-line-strong)] bg-white/35 p-8 text-center transition hover:-translate-y-0.5 hover:border-[var(--splity-navy)] hover:bg-white/70 hover:shadow-[0_18px_40px_rgba(12,21,56,0.08)]"
          onClick={open}
          type="button"
        >
          <span>
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--splity-navy)] text-[var(--splity-gold)]">
              <Plus className="h-5 w-5" />
            </span>
            <span className="mt-5 block text-xl font-bold text-[var(--splity-ink)]">
              <T k="groupsView.startTitle" />
            </span>
            <span className="mx-auto mt-2 block max-w-xs text-sm leading-6 text-[var(--splity-muted)]">
              <T k="groupsView.startBody" />
            </span>
          </span>
        </button>
      )}
    </NewGroupDialogTrigger>
  );
}

export function CardActions({ groupId, groupName }: CardActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="absolute bottom-5 right-5 z-20 flex translate-y-2 gap-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <Link
          aria-label={`View ${groupName}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] shadow-sm transition hover:border-[var(--splity-line-strong)] hover:text-[var(--splity-navy)]"
          href={`/groups/${groupId}`}
        >
          <Eye className="h-4 w-4" />
        </Link>
        <button
          aria-label={`Edit ${groupName}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] shadow-sm transition hover:border-[var(--splity-line-strong)] hover:text-[var(--splity-navy)]"
          onClick={() => setEditOpen(true)}
          type="button"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          aria-label={`Delete ${groupName}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] shadow-sm transition hover:border-red-200 hover:text-[var(--splity-rose)]"
          onClick={() => setDeleteOpen(true)}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <EditGroupModal
        groupId={groupId}
        groupName={groupName}
        onClose={() => setEditOpen(false)}
        open={editOpen}
      />
      <DeleteGroupModal
        groupId={groupId}
        groupName={groupName}
        onClose={() => setDeleteOpen(false)}
        open={deleteOpen}
      />
    </>
  );
}
