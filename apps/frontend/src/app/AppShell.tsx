import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type GroupSummaryDto } from "@api-client";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useAuth } from "@/shared/auth/AuthProvider";
import { splitGroupsByStatus, GroupStatusBadge, formatGroupCreatedAt } from "@/shared/groups/groupMeta";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ArrowsIcon, HomeIcon, PencilIcon, PlusIcon, ReceiptIcon, SettingsIcon, TrashIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";
import { AppFooter } from "@/shared/ui/AppFooter";
import { BrandLogo } from "@/shared/ui/BrandLogo";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EditNameDialog } from "@/shared/ui/EditNameDialog";
import { IconActionButton, LoadingState } from "@/shared/ui/primitives";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/utils/format";

type GroupModuleKey = "overview" | "participants" | "bills" | "settlements";

type GroupTab = {
  key: GroupModuleKey;
  label: string;
  icon: ReactNode;
};

const SIDEBAR_EXPANDED_WIDTH = 296;
const DASHBOARD_STEPS = [
  { icon: WalletIcon, titleKey: "dashboard.stepCreateGroupTitle", bodyKey: "dashboard.stepCreateGroupBody" },
  { icon: UsersIcon, titleKey: "dashboard.stepAddParticipantsTitle", bodyKey: "dashboard.stepAddParticipantsBody" },
  { icon: ReceiptIcon, titleKey: "dashboard.stepAddBillsTitle", bodyKey: "dashboard.stepAddBillsBody" },
  { icon: ArrowsIcon, titleKey: "dashboard.stepOpenSettlementTitle", bodyKey: "dashboard.stepOpenSettlementBody" },
  { icon: WalletIcon, titleKey: "dashboard.stepWaitPaymentsTitle", bodyKey: "dashboard.stepWaitPaymentsBody" }
] as const;

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [editGroupError, setEditGroupError] = useState<string | null>(null);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);

  const routeGroupId = location.pathname.match(/^\/groups\/([^/]+)/)?.[1] ?? null;
  const currentModule = getCurrentModule(location.pathname);
  const isSettingsRoute = location.pathname === "/settings";
  const isDashboardRoute = location.pathname === "/dashboard";

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiClient.listGroups()
  });

  const groups = groupsQuery.data ?? [];
  const { currentGroups, settledGroups } = splitGroupsByStatus(groups);

  const currentGroupQuery = useQuery({
    queryKey: ["group", routeGroupId],
    queryFn: () => apiClient.getGroup(routeGroupId!),
    enabled: Boolean(routeGroupId)
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => apiClient.createGroup(name),
    onSuccess: async (group) => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      setCreateGroupError(null);
      setIsCreateGroupOpen(false);
      navigate(buildGroupModulePath(group.id, "overview"));
      showToast({ title: t("sidebar.newGroup"), description: t("feedback.created"), tone: "success" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      setCreateGroupError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!routeGroupId) {
        throw new Error(t("groups.editMissingGroup"));
      }

      return apiClient.updateGroup(routeGroupId, { name });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["group", routeGroupId] }),
        queryClient.invalidateQueries({ queryKey: ["groups"] })
      ]);
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

      const fallbackGroup = groups.find((group) => group.id !== routeGroupId) ?? null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
        queryClient.removeQueries({ queryKey: ["group", routeGroupId] }),
        queryClient.removeQueries({ queryKey: ["participants", routeGroupId] }),
        queryClient.removeQueries({ queryKey: ["bills", routeGroupId] }),
        queryClient.removeQueries({ queryKey: ["bill", routeGroupId] }),
        queryClient.removeQueries({ queryKey: ["settlements", routeGroupId] })
      ]);
      setDeleteGroupError(null);
      setIsDeleteGroupOpen(false);
      setIsEditGroupOpen(false);
      navigate(fallbackGroup ? buildGroupModulePath(fallbackGroup.id, currentModule ?? "participants") : "/dashboard");
      showToast({ title: t("groups.deleteTitle"), description: t("feedback.deleted"), tone: "success" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      setDeleteGroupError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const currentGroupFallback = currentGroupQuery.data
    ? ({
        id: currentGroupQuery.data.id,
        name: currentGroupQuery.data.name,
        createdAtUtc: currentGroupQuery.data.createdAtUtc,
        status: currentGroupQuery.data.status
      } as GroupSummaryDto)
    : null;

  const currentGroup = routeGroupId
    ? groups.find((group) => group.id === routeGroupId) ?? currentGroupFallback
    : null;

  const groupTabs: GroupTab[] = [
    { key: "overview", label: t("nav.overview"), icon: <HomeIcon className="h-4 w-4" /> },
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
              <Link to="/dashboard" className="min-w-0">
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
                to="/dashboard"
                end
              >
                <span className={buildUtilityIconClass(location.pathname === "/dashboard")}>
                  <HomeIcon className="h-4 w-4" />
                </span>
                <span className="truncate">{t("nav.dashboard")}</span>
              </NavLink>
              <NavLink
                className={({ isActive }) => `${buildUtilityNavClass(isActive)} mt-2`}
                to="/settings"
                end
              >
                <span className={buildUtilityIconClass(isSettingsRoute)}>
                  <SettingsIcon className="h-4 w-4" />
                </span>
                <span className="truncate">{t("settings.title")}</span>
              </NavLink>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {t("sidebar.groups")}
              </div>
              <IconActionButton
                className="h-9 w-9 rounded-[14px] border border-slate-200/80 bg-white text-brand shadow-sm hover:border-brand/20 hover:bg-sky/60"
                icon={<PlusIcon className="h-4 w-4" />}
                label={t("sidebar.newGroup")}
                onClick={() => {
                  setCreateGroupError(null);
                  setIsCreateGroupOpen(true);
                }}
                size="sm"
              />
            </div>

            <div className="scroll-panel mt-3 flex-1 overflow-y-auto pr-1">
              {groupsQuery.isPending ? (
                <LoadingState lines={4} />
              ) : groupsQuery.isError ? (
                <InlineSidebarError
                  actionLabel={t("common.retry")}
                  message={getErrorMessage(groupsQuery.error)}
                  onRetry={() => groupsQuery.refetch()}
                  title={t("feedback.loadFailed")}
                />
              ) : groups.length === 0 ? (
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
                <div className="space-y-5">
                  <SidebarGroupSection
                    currentModule={currentModule}
                    emptyLabel={t("sidebar.currentGroupsEmpty")}
                    groups={currentGroups}
                    language={language}
                    routeGroupId={routeGroupId}
                    t={t}
                    title={t("sidebar.currentGroups")}
                  />
                  <SidebarGroupSection
                    currentModule={currentModule}
                    emptyLabel={t("sidebar.settledGroupsEmpty")}
                    groups={settledGroups}
                    language={language}
                    routeGroupId={routeGroupId}
                    t={t}
                    title={t("sidebar.settledGroups")}
                  />
                </div>
              )}
            </div>

            <div className="mt-3 border-t border-slate-200/80 pt-3">
              {user ? (
                <div className="rounded-[20px] border border-slate-200/80 bg-white/90 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
                      <div className="mt-1 truncate text-xs text-muted">{user.email}</div>
                    </div>
                    <IconActionButton
                      className="h-9 w-9 rounded-[14px]"
                      icon={<SettingsIcon className="h-4 w-4" />}
                      label={t("settings.title")}
                      onClick={() => navigate("/settings")}
                      size="sm"
                    />
                  </div>
                </div>
              ) : null}
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
                    {routeGroupId ? (
                      <div className="block text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                        {currentGroup?.name ?? currentGroupQuery.data?.name ?? t("sidebar.loadingGroup")}
                      </div>
                    ) : (
                      <Link to="/dashboard" className="block text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                        {isSettingsRoute ? t("settings.title") : t("app.title")}
                      </Link>
                    )}
                    {routeGroupId ? (
                      <p className="max-w-2xl text-sm leading-6 text-muted">
                        {t("app.groupSummary")}
                      </p>
                    ) : isSettingsRoute ? (
                      <p className="max-w-2xl text-sm leading-6 text-muted">
                        {t("settings.body")}
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        {DASHBOARD_STEPS.map((step, index) => {
                          const StepIcon = step.icon;

                          return (
                            <div key={step.titleKey} className="flex items-center gap-3">
                              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/92 px-3 py-2 shadow-soft">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-xs font-semibold text-white">
                                  {index + 1}
                                </span>

                                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky text-brand">
                                  <StepIcon className="h-4 w-4" />
                                </span>

                                <span className="whitespace-nowrap text-sm font-medium text-ink">
                                  {t(step.titleKey)}
                                </span>
                              </div>

                              {index < DASHBOARD_STEPS.length - 1 ? (
                                <span className="text-slate-400">{">"}</span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {routeGroupId ? (
                    <>
                      {currentGroup?.status === "unresolved" ? (
                        <IconActionButton
                          icon={<PencilIcon className="h-4 w-4" />}
                          label={t("groups.editAction")}
                          onClick={() => setIsEditGroupOpen(true)}
                        />
                      ) : null}
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
                </div>
              </div>

              <div className="xl:hidden">
                <MobileGroupsRail
                  currentModule={currentModule}
                  groups={groups}
                  language={language}
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
              ) : (
                <nav className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                  <NavLink to="/dashboard" className={({ isActive }) => buildTabClass(isActive || isDashboardRoute)}>
                    <HomeIcon className="h-4 w-4" />
                    {t("nav.dashboard")}
                  </NavLink>
                  <NavLink to="/settings" className={({ isActive }) => buildTabClass(isActive || isSettingsRoute)}>
                    <SettingsIcon className="h-4 w-4" />
                    {t("settings.title")}
                  </NavLink>
                </nav>
              )}
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
        open={isCreateGroupOpen}
        title={t("groups.createTitle")}
        description={t("groups.createBody")}
        initialValue=""
        placeholder={t("home.groupPlaceholder")}
        cancelLabel={t("common.cancel")}
        submitLabel={t("groups.createAction")}
        validationMessage={t("groups.nameRequired")}
        error={createGroupError}
        isBusy={createGroupMutation.isPending}
        onClose={() => {
          setCreateGroupError(null);
          setIsCreateGroupOpen(false);
        }}
        onSubmit={(value) => createGroupMutation.mutate(value)}
      />
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

function SidebarGroupSection({
  groups,
  routeGroupId,
  currentModule,
  t,
  language,
  title,
  emptyLabel
}: {
  groups: GroupSummaryDto[];
  routeGroupId: string | null;
  currentModule: GroupModuleKey | null;
  t: (key: any) => string;
  language: "en" | "zh";
  title: string;
  emptyLabel: string;
}) {
  const targetModule = currentModule ?? "overview";

  return (
    <section>
      <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        {title}
      </div>
      {groups.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/75 px-3 py-3 text-xs leading-5 text-muted">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const isActiveGroup = group.id === routeGroupId;
            return (
              <Link
                key={group.id}
                to={buildGroupModulePath(group.id, targetModule)}
                className={buildGroupLinkClass(isActiveGroup)}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className={buildGroupAvatarClass(isActiveGroup)}>
                    {getGroupInitial(group.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold tracking-tight">
                          {group.name}
                        </div>
                        <div className={["mt-1 text-xs", isActiveGroup ? "text-slate-600" : "text-muted"].join(" ")}>
                          {formatGroupCreatedAt(group.createdAtUtc, language)}
                        </div>
                      </div>
                      <GroupStatusBadge status={group.status} t={t} className="shrink-0" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MobileGroupsRail({
  groups,
  routeGroupId,
  currentModule,
  t,
  language
}: {
  groups: GroupSummaryDto[];
  routeGroupId: string | null;
  currentModule: GroupModuleKey | null;
  t: (key: any) => string;
  language: "en" | "zh";
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-muted">
        {t("sidebar.noGroupsBody")}
      </div>
    );
  }

  const { currentGroups, settledGroups } = splitGroupsByStatus(groups);
  const targetModule = currentModule ?? "overview";

  return (
    <div className="space-y-4">
      <MobileGroupSection
        emptyLabel={t("sidebar.currentGroupsEmpty")}
        groups={currentGroups}
        language={language}
        routeGroupId={routeGroupId}
        targetModule={targetModule}
        t={t}
        title={t("sidebar.currentGroups")}
      />
      <MobileGroupSection
        emptyLabel={t("sidebar.settledGroupsEmpty")}
        groups={settledGroups}
        language={language}
        routeGroupId={routeGroupId}
        targetModule={targetModule}
        t={t}
        title={t("sidebar.settledGroups")}
      />
    </div>
  );
}

function MobileGroupSection({
  groups,
  routeGroupId,
  targetModule,
  t,
  language,
  title,
  emptyLabel
}: {
  groups: GroupSummaryDto[];
  routeGroupId: string | null;
  targetModule: GroupModuleKey;
  t: (key: any) => string;
  language: "en" | "zh";
  title: string;
  emptyLabel: string;
}) {
  return (
    <section>
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        {title}
      </div>
      {groups.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/75 px-4 py-3 text-sm text-muted">
          {emptyLabel}
        </div>
      ) : (
        <div className="scroll-panel flex gap-3 overflow-x-auto pb-1">
          {groups.map((group) => {
            const active = group.id === routeGroupId;
            return (
              <Link
                key={group.id}
                to={buildGroupModulePath(group.id, targetModule)}
                className={[
                  "min-w-[16rem] max-w-[16rem] rounded-[22px] border px-4 py-3 shadow-soft transition",
                  active
                    ? "border-brand/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(255,255,255,0.98))] text-ink"
                    : "border-slate-200 bg-white/92 text-ink hover:border-brand/20 hover:bg-white"
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold tracking-tight">{group.name}</div>
                    <div className="mt-1 text-xs text-muted">{formatGroupCreatedAt(group.createdAtUtc, language)}</div>
                  </div>
                  <GroupStatusBadge status={group.status} t={t} className="shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function InlineSidebarError({
  title,
  message,
  actionLabel,
  onRetry
}: {
  title: string;
  message: string;
  actionLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-3 py-3">
      <div className="text-sm font-semibold text-danger">{title}</div>
      <div className="mt-1 text-sm leading-6 text-danger/90">{message}</div>
      <button className="button-secondary mt-3 min-h-[40px] px-3 py-2 text-sm" onClick={onRetry} type="button">
        {actionLabel}
      </button>
    </div>
  );
}

function buildGroupModulePath(groupId: string, module: GroupModuleKey) {
  return `/groups/${groupId}/${module}`;
}

function getCurrentModule(pathname: string): GroupModuleKey | null {
  if (pathname.includes("/overview")) {
    return "overview";
  }

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
      ? "border-brand/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(255,255,255,0.98))] text-ink shadow-soft ring-1 ring-brand/10"
      : "border-slate-200/80 bg-white/88 text-ink hover:-translate-y-0.5 hover:border-brand/20 hover:bg-white"
  ].join(" ");
}

function buildGroupAvatarClass(isActive: boolean) {
  return [
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold",
    isActive ? "bg-brand text-white" : "bg-slate-100 text-brand"
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
