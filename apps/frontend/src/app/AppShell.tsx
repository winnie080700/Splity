import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@api-client";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useAuth } from "@/shared/auth/AuthProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ArrowsIcon, HomeIcon, PencilIcon, PlusIcon, ReceiptIcon, TrashIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";
import { AppFooter } from "@/shared/ui/AppFooter";
import { BrandLogo } from "@/shared/ui/BrandLogo";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EditNameDialog } from "@/shared/ui/EditNameDialog";
import { IconActionButton, IconActionLink } from "@/shared/ui/primitives";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/utils/format";
import { getGroupsChangedEventName, readSavedGroups, removeSavedGroup, syncSavedGroup } from "@/shared/utils/storage";

type GroupModuleKey = "participants" | "bills" | "settlements";

type GroupTab = {
  key: GroupModuleKey;
  label: string;
  icon: ReactNode;
};

const SIDEBAR_EXPANDED_WIDTH = 296;

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [groupsVersion, setGroupsVersion] = useState(0);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [editGroupError, setEditGroupError] = useState<string | null>(null);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);

  const routeGroupId = location.pathname.match(/^\/groups\/([^/]+)/)?.[1] ?? null;
  const currentModule = getCurrentModule(location.pathname);
  const savedGroups = useMemo(() => readSavedGroups(), [groupsVersion]);

  const currentGroupQuery = useQuery({
    queryKey: ["group", routeGroupId],
    queryFn: () => apiClient.getGroup(routeGroupId!),
    enabled: Boolean(routeGroupId)
  });

  useEffect(() => {
    const groupsChangedEvent = getGroupsChangedEventName();
    const syncGroups = () => setGroupsVersion((value) => value + 1);
    window.addEventListener(groupsChangedEvent, syncGroups);
    window.addEventListener("storage", syncGroups);
    return () => {
      window.removeEventListener(groupsChangedEvent, syncGroups);
      window.removeEventListener("storage", syncGroups);
    };
  }, []);

  useEffect(() => {
    if (!currentGroupQuery.data) {
      return;
    }

    syncSavedGroup({ id: currentGroupQuery.data.id, name: currentGroupQuery.data.name });
  }, [currentGroupQuery.data]);

  const updateGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!routeGroupId) {
        throw new Error(t("groups.editMissingGroup"));
      }

      return apiClient.updateGroup(routeGroupId, { name });
    },
    onSuccess: async (group) => {
      syncSavedGroup({ id: group.id, name: group.name });
      await queryClient.invalidateQueries({ queryKey: ["group", routeGroupId] });
      setEditGroupError(null);
      setIsEditGroupOpen(false);
      showToast({ title: t("groups.editTitle"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      setEditGroupError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      if (!routeGroupId) {
        throw new Error(t("groups.editMissingGroup"));
      }

      return apiClient.deleteGroup(routeGroupId);
    },
    onSuccess: async () => {
      if (!routeGroupId) {
        return;
      }

      const fallbackGroup = savedGroups.find((group) => group.id !== routeGroupId) ?? null;
      removeSavedGroup(routeGroupId);
      await Promise.all([
        queryClient.removeQueries({ queryKey: ["group", routeGroupId] }),
        queryClient.removeQueries({ queryKey: ["participants", routeGroupId] }),
        queryClient.removeQueries({ queryKey: ["bills", routeGroupId] }),
        queryClient.removeQueries({ queryKey: ["bill", routeGroupId] }),
        queryClient.removeQueries({ queryKey: ["settlements", routeGroupId] })
      ]);
      setDeleteGroupError(null);
      setIsDeleteGroupOpen(false);
      setIsEditGroupOpen(false);
      navigate(fallbackGroup ? buildGroupModulePath(fallbackGroup.id, currentModule ?? "participants") : "/");
      showToast({ title: t("groups.deleteTitle"), description: t("feedback.deleted"), tone: "success" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      setDeleteGroupError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const currentGroup = routeGroupId
    ? savedGroups.find((group) => group.id === routeGroupId) ?? (currentGroupQuery.data ? {
        id: currentGroupQuery.data.id,
        name: currentGroupQuery.data.name
      } : null)
    : null;

  const groupTabs: GroupTab[] = [
    { key: "participants", label: t("nav.participants"), icon: <UsersIcon className="h-4 w-4" /> },
    { key: "bills", label: t("nav.bills"), icon: <ReceiptIcon className="h-4 w-4" /> },
    { key: "settlements", label: t("nav.settlement"), icon: <ArrowsIcon className="h-4 w-4" /> }
  ];

  const sidebarOffset = SIDEBAR_EXPANDED_WIDTH + 36;
  const shellStyle = { "--shell-sidebar-offset": `${sidebarOffset}px` } as CSSProperties;

  return (
    <div className="relative overflow-hidden" style={shellStyle}>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(16,185,129,0.14),transparent_28%)]" />

      <aside className="hidden xl:block">
        <div
          className="fixed left-4 top-4 bottom-4 z-30 overflow-hidden transition-[width] duration-200"
          style={{ width: SIDEBAR_EXPANDED_WIDTH }}
        >
          <div className="card flex h-full flex-col p-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <Link to="/" className="min-w-0">
                <div className="flex items-center gap-3">
                  <BrandLogo className="h-10 w-10 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold tracking-tight text-ink">{t("app.title")}</div>
                    <div className="truncate text-xs font-medium uppercase tracking-[0.18em] text-muted">{t("app.kicker")}</div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="mt-3">
              <NavLink
                className={({ isActive }) => buildUtilityNavClass(isActive)}
                to="/"
                end
              >
                <span className={buildUtilityIconClass(location.pathname === "/")}>
                  <HomeIcon className="h-4 w-4" />
                </span>
                <span className="truncate">{t("nav.home")}</span>
              </NavLink>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {t("sidebar.groups")}
              </div>
              <IconActionLink
                className="ml-auto"
                icon={<PlusIcon className="h-4 w-4" />}
                label={t("sidebar.newGroup")}
                size="sm"
                to="/#create-group"
              />
            </div>

            <div className="mt-3 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {savedGroups.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-brand shadow-soft">
                      <WalletIcon className="h-4 w-4" />
                    </span>
                    {t("sidebar.noGroupsTitle")}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {t("sidebar.noGroupsBody")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedGroups.map((group) => {
                    const isActiveGroup = group.id === routeGroupId;
                    const targetModule = currentModule ?? "participants";
                    return (
                      <Link
                        key={group.id}
                        to={buildGroupModulePath(group.id, targetModule)}
                        className={buildGroupLinkClass(isActiveGroup)}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={buildGroupAvatarClass(isActiveGroup)}>
                            {getGroupInitial(group.name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold tracking-tight">
                              {group.name}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
                              <span className={isActiveGroup ? "text-white/72" : "text-muted"}>
                                {isActiveGroup ? t("sidebar.currentGroup") : t("sidebar.openGroup")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 border-t border-slate-200/80 pt-3">
              {user ? (
                <div className="mb-3 rounded-[20px] border border-slate-200/80 bg-white/90 px-4 py-3">
                  <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
                  <div className="mt-1 truncate text-xs text-muted">{user.email}</div>
                </div>
              ) : null}
              <button className="button-secondary min-h-[44px] w-full" onClick={signOut} type="button">
                {t("auth.logout")}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="xl:pl-[var(--shell-sidebar-offset)]">
        <div className="mx-auto flex min-h-screen max-w-[108rem] flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8 2xl:px-10">
          <header className="card mb-6 overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
            <div className="relative flex flex-col gap-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl space-y-3">
                  <span className="eyebrow">{routeGroupId ? t("sidebar.currentGroup") : t("app.kicker")}</span>
                  <div className="space-y-2">
                    <Link to="/" className="block text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                      {routeGroupId ? (currentGroup?.name ?? currentGroupQuery.data?.name ?? t("sidebar.loadingGroup")) : t("app.title")}
                    </Link>
                    <p className="max-w-2xl text-sm leading-6 text-muted">
                      {routeGroupId ? t("app.groupSummary") : t("app.workspaceSummary")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {routeGroupId ? (
                    <>
                      <IconActionButton
                        icon={<PencilIcon className="h-4 w-4" />}
                        label={t("groups.editAction")}
                        onClick={() => setIsEditGroupOpen(true)}
                      />
                      <IconActionButton
                        className="text-danger hover:border-rose-200 hover:bg-rose-50 hover:text-danger"
                        icon={<TrashIcon className="h-4 w-4" />}
                        label={t("groups.deleteAction")}
                        onClick={() => {
                          setDeleteGroupError(null);
                          setIsDeleteGroupOpen(true);
                        }}
                      />
                    </>
                  ) : null}
                  <IconActionLink
                    icon={<PlusIcon className="h-4 w-4" />}
                    label={t("sidebar.newGroup")}
                    to="/#create-group"
                  />
                </div>
              </div>

              <div className="xl:hidden">
                <MobileGroupsRail
                  currentModule={currentModule}
                  groups={savedGroups}
                  routeGroupId={routeGroupId}
                  t={t}
                />
              </div>

              {routeGroupId ? (
                <nav className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                  {groupTabs.map((tab) => (
                    <NavLink
                      key={tab.key}
                      to={buildGroupModulePath(routeGroupId, tab.key)}
                      className={({ isActive }) => buildTabClass(isActive)}
                    >
                      {tab.icon}
                      {tab.label}
                    </NavLink>
                  ))}
                </nav>
              ) : null}
            </div>
          </header>

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>

          <footer className="mt-8">
            <AppFooter />
          </footer>
        </div>
      </div>

      <EditNameDialog
        open={isEditGroupOpen}
        title={t("groups.editTitle")}
        description={t("groups.editBody")}
        initialValue={currentGroup?.name ?? currentGroupQuery.data?.name ?? ""}
        placeholder={t("home.groupPlaceholder")}
        cancelLabel={t("common.cancel")}
        submitLabel={t("common.saveChanges")}
        validationMessage={t("groups.nameRequired")}
        error={editGroupError}
        isBusy={updateGroupMutation.isPending}
        onClose={() => {
          setEditGroupError(null);
          setIsEditGroupOpen(false);
        }}
        onSubmit={(value) => updateGroupMutation.mutate(value)}
      />
      <ConfirmDialog
        open={isDeleteGroupOpen}
        title={t("groups.deleteTitle")}
        description={t("groups.deleteBody")}
        details={currentGroup?.name ?? currentGroupQuery.data?.name ?? ""}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.delete")}
        error={deleteGroupError}
        isBusy={deleteGroupMutation.isPending}
        onClose={() => {
          setDeleteGroupError(null);
          setIsDeleteGroupOpen(false);
        }}
        onConfirm={() => deleteGroupMutation.mutate()}
      />
    </div>
  );
}

function MobileGroupsRail({
  groups,
  routeGroupId,
  currentModule,
  t
}: {
  groups: Array<{ id: string; name: string }>;
  routeGroupId: string | null;
  currentModule: GroupModuleKey | null;
  t: (key: any) => string;
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-muted">
        {t("sidebar.noGroupsBody")}
      </div>
    );
  }

  const targetModule = currentModule ?? "participants";

  return (
    <div>
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        {t("sidebar.groups")}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group) => {
          const active = group.id === routeGroupId;
          return (
            <Link
              key={group.id}
              to={buildGroupModulePath(group.id, targetModule)}
              className={[
                "inline-flex min-w-0 max-w-[14rem] items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                active
                  ? "border-ink/10 bg-ink text-white shadow-soft"
                  : "border-slate-200 bg-white/90 text-ink hover:border-brand/20 hover:bg-white"
              ].join(" ")}
            >
              <span className={active ? "text-white/70" : "text-brand"}>{getGroupInitial(group.name)}</span>
              <span className="truncate">{group.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function buildGroupModulePath(groupId: string, module: GroupModuleKey) {
  return `/groups/${groupId}/${module}`;
}

function getCurrentModule(pathname: string): GroupModuleKey | null {
  if (pathname.includes("/participants")) {
    return "participants";
  }

  if (pathname.includes("/bills")) {
    return "bills";
  }

  if (pathname.includes("/settlements")) {
    return "settlements";
  }

  return null;
}

function buildUtilityNavClass(isActive: boolean) {
  return [
    "group flex min-h-[44px] items-center gap-3 rounded-2xl border px-3 py-2.5 text-[13px] font-medium transition",
    isActive
      ? "border-ink/10 bg-ink text-white shadow-lift ring-1 ring-ink/10"
      : "border-transparent bg-slate-50/70 text-muted hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:text-ink"
  ].filter(Boolean).join(" ");
}

function buildUtilityIconClass(isActive: boolean) {
  return [
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl transition",
    isActive ? "bg-white/12 text-white" : "bg-white text-brand shadow-sm"
  ].join(" ");
}

function buildGroupLinkClass(isActive: boolean) {
  return [
    "block rounded-[22px] border px-3 py-3 transition",
    isActive
      ? "border-ink/10 bg-ink text-white shadow-lift"
      : "border-slate-200/80 bg-white/88 text-ink hover:-translate-y-0.5 hover:border-brand/20 hover:bg-white"
  ].join(" ");
}

function buildGroupAvatarClass(isActive: boolean) {
  return [
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold",
    isActive ? "bg-white/12 text-white" : "bg-slate-100 text-brand"
  ].join(" ");
}

function buildTabClass(isActive: boolean) {
  return [
    "inline-flex min-h-[42px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
    isActive
      ? "border-ink/10 bg-ink text-white shadow-soft"
      : "border-slate-200 bg-white/88 text-muted hover:border-brand/20 hover:bg-white hover:text-ink"
  ].join(" ");
}

function getGroupInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "G";
}
