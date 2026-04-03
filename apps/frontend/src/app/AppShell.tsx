import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type GroupSummaryDto } from "@api-client";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/auth/AuthProvider";
import { formatGroupCreatedAt, GroupStatusBadge } from "@/shared/groups/groupMeta";
import { useI18n } from "@/shared/i18n/I18nProvider";
import {
  ArrowsIcon,
  HomeIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  SettingsIcon,
  TrashIcon,
  UsersIcon
} from "@/shared/ui/icons";
import { AnimatedPillSwitch } from "@/shared/ui/AnimatedPillSwitch";
import { BrandLogo } from "@/shared/ui/BrandLogo";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { CustomSelect } from "@/shared/ui/CustomSelect";
import { EditNameDialog } from "@/shared/ui/EditNameDialog";
import { PublicSiteFooter } from "@/shared/ui/PublicSiteFooter";
import { LoadingState } from "@/shared/ui/primitives";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/utils/format";

type GroupModuleKey = "overview" | "participants" | "bills" | "settlements";

type GroupTab = {
  key: GroupModuleKey;
  label: string;
  icon: ReactNode;
};

type ShellTab = {
  key: string;
  label: string;
  icon: ReactNode;
  to: string;
  active: boolean;
};

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const { showToast } = useToast();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [editGroupError, setEditGroupError] = useState<string | null>(null);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const routeGroupId = location.pathname.match(/^\/groups\/([^/]+)/)?.[1] ?? null;
  const currentModule = getCurrentModule(location.pathname);
  const isSettingsRoute = location.pathname === "/settings";
  const isDashboardRoute = location.pathname === "/dashboard";

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiClient.listGroups()
  });

  const groups = groupsQuery.data ?? [];
  const latestGroup = groups[0] ?? null;

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
      navigate(fallbackGroup ? buildGroupModulePath(fallbackGroup.id, currentModule ?? "overview") : "/dashboard");
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

  const shellTabs: ShellTab[] = routeGroupId
    ? groupTabs.map((tab) => ({
        key: tab.key,
        label: tab.label,
        icon: tab.icon,
        to: buildGroupModulePath(routeGroupId, tab.key),
        active: currentModule === tab.key
      }))
    : [
        {
          key: "dashboard",
          label: t("nav.dashboard"),
          icon: <HomeIcon className="h-4 w-4" />,
          to: "/dashboard",
          active: isDashboardRoute
        }
      ];

  if (!routeGroupId && !isGuest) {
    shellTabs.push({
      key: "settings",
      label: t("settings.title"),
      icon: <SettingsIcon className="h-4 w-4" />,
      to: "/settings",
      active: isSettingsRoute
    });
  }

  const headerEyebrow = routeGroupId
    ? t("sidebar.currentGroup")
    : isSettingsRoute
      ? t("settings.eyebrow")
      : t("app.kicker");

  const headerTitle = routeGroupId
    ? (currentGroup?.name ?? currentGroupQuery.data?.name ?? t("sidebar.loadingGroup"))
    : isSettingsRoute
      ? t("settings.title")
      : t("nav.dashboard");

  const headerDescription = routeGroupId
    ? t("app.groupSummary")
    : isSettingsRoute
      ? t("settings.body")
      : t("dashboard.overviewBody");

  const overviewPath = routeGroupId ? buildGroupModulePath(routeGroupId, "overview") : "/dashboard";
  const isOverviewActive = routeGroupId ? currentModule === "overview" : isDashboardRoute;
  const groupsEntryPath = routeGroupId
    ? buildGroupModulePath(routeGroupId, currentModule ?? "overview")
    : latestGroup
      ? buildGroupModulePath(latestGroup.id, "overview")
      : null;
  const isGroupsNavActive = Boolean(routeGroupId);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-[#181612]">
      <div
        className="workspace-shell-layout w-full xl:grid xl:gap-8 xl:pr-6"
        style={{ gridTemplateColumns: isDesktopSidebarCollapsed ? "5.75rem minmax(0,1fr)" : "18.5rem minmax(0,1fr)" }}
      >
        <aside className="hidden xl:block xl:sticky xl:top-0 xl:self-start">
          <div className="workspace-shell-navbar flex h-screen flex-col overflow-hidden">
            <div className={["border-b border-[#ece4d4] py-5", isDesktopSidebarCollapsed ? "flex flex-col items-center gap-3 px-3" : "flex items-center justify-between gap-3 px-5"].join(" ")}>
              <Link to="/dashboard" className={["flex min-w-0 items-center gap-3", isDesktopSidebarCollapsed ? "justify-center" : ""].join(" ")}>
                <BrandLogo className="h-11 w-11 shrink-0" />
                {!isDesktopSidebarCollapsed ? (
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold tracking-tight text-[#1a1813]">{t("app.title")}</div>
                  </div>
                ) : null}
              </Link>

              <button
                type="button"
                className="workspace-shell-collapse shrink-0"
                aria-label={isDesktopSidebarCollapsed ? t("sidebar.expandNavigation") : t("sidebar.collapseNavigation")}
                onClick={() => setIsDesktopSidebarCollapsed((current) => !current)}
              >
                <DesktopRailToggleIcon collapsed={isDesktopSidebarCollapsed} />
              </button>
            </div>

            <div className="scroll-panel flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-7">
                <section>
                  {!isDesktopSidebarCollapsed ? (
                    <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b947f]">
                      {t("sidebar.general")}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <NavLink className={({ isActive }) => buildDesktopNavClass(isActive, isDesktopSidebarCollapsed)} to="/dashboard" end>
                      <HomeIcon className={buildDesktopNavIconClass(isDashboardRoute)} />
                      {!isDesktopSidebarCollapsed ? <span className="truncate">{t("nav.dashboard")}</span> : null}
                    </NavLink>

                    {groupsEntryPath ? (
                      <Link className={buildDesktopNavClass(isGroupsNavActive, isDesktopSidebarCollapsed)} to={groupsEntryPath}>
                        <UsersIcon className={buildDesktopNavIconClass(isGroupsNavActive)} />
                        {!isDesktopSidebarCollapsed ? <span className="truncate">{t("sidebar.groups")}</span> : null}
                      </Link>
                    ) : (
                      <button
                        className={buildDesktopNavClass(false, isDesktopSidebarCollapsed)}
                        onClick={() => {
                          setCreateGroupError(null);
                          setIsCreateGroupOpen(true);
                        }}
                        type="button"
                      >
                        <UsersIcon className={buildDesktopNavIconClass(false)} />
                        {!isDesktopSidebarCollapsed ? <span className="truncate">{t("sidebar.groups")}</span> : null}
                      </button>
                    )}
                  </div>
                </section>

                {!isGuest ? (
                  <section>
                    {!isDesktopSidebarCollapsed ? (
                      <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b947f]">
                        {t("sidebar.support")}
                      </div>
                    ) : null}

                    <NavLink className={({ isActive }) => buildDesktopNavClass(isActive, isDesktopSidebarCollapsed)} to="/settings" end>
                      <SettingsIcon className={buildDesktopNavIconClass(isSettingsRoute)} />
                      {!isDesktopSidebarCollapsed ? <span className="truncate">{t("settings.title")}</span> : null}
                    </NavLink>
                  </section>
                ) : null}
              </div>
            </div>

            <div className="border-t border-[#ece4d4] px-4 py-4">
              {isGuest ? (
                <div className={buildDesktopIdentityClass(isDesktopSidebarCollapsed)}>
                  <div className="workspace-shell-identity-mark">{t("guest.label").slice(0, 1)}</div>
                  {!isDesktopSidebarCollapsed ? (
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#1b1813]">{t("guest.label")}</div>
                      <div className="mt-1 truncate text-sm text-[#7c7567]">{t("guest.sessionHint")}</div>
                    </div>
                  ) : null}
                </div>
              ) : user ? (
                <div className={buildDesktopIdentityClass(isDesktopSidebarCollapsed)}>
                  <div className="workspace-shell-identity-mark">{user.name.slice(0, 1).toUpperCase()}</div>
                  {!isDesktopSidebarCollapsed ? (
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#1b1813]">{user.name}</div>
                      <div className="mt-1 truncate text-sm text-[#7c7567]">{user.email}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="min-w-0">

          <main className="mx-auto min-w-0 max-w-6xl px-4 pb-24 pt-4 sm:px-6 xl:max-w-none xl:px-0 xl:pb-10 xl:pt-7">
            <Outlet />
          </main>

          {isMobileNavOpen ? (
            <div className="fixed inset-x-0 bottom-[5.25rem] z-40 mx-4 rounded-[28px] border border-[#e6decd] bg-[rgba(255,253,248,0.98)] p-4 shadow-[0_28px_64px_rgba(34,29,20,0.14)] backdrop-blur xl:hidden">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a836f]">{headerEyebrow}</div>
                <div className="mt-2 text-lg font-semibold tracking-tight text-[#1a1813]">{headerTitle}</div>
                <p className="mt-2 text-sm leading-6 text-[#7c7567]">{headerDescription}</p>

                {routeGroupId && currentGroup ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <GroupStatusBadge status={currentGroup.status} t={t} />
                    <span className="text-sm text-[#7c7567]">
                      {formatGroupCreatedAt(currentGroup.createdAtUtc, language)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid gap-2">
                <AnimatedPillSwitch
                  ariaLabel={t("lang.language")}
                  className="w-full"
                  value={language}
                  onChange={(nextLanguage) => setLanguage(nextLanguage)}
                  options={[
                    { value: "en", label: "EN" },
                    { value: "zh", label: "CH" }
                  ]}
                />

                <button
                  className="landing-contact-button w-full min-w-0"
                  onClick={() => {
                    setCreateGroupError(null);
                    setIsCreateGroupOpen(true);
                  }}
                  type="button"
                >
                  <PlusIcon className="h-4 w-4" />
                  {t("sidebar.newGroup")}
                </button>

                {routeGroupId && currentGroup?.status === "unresolved" ? (
                  <button className="workspace-shell-trigger w-full" onClick={() => setIsEditGroupOpen(true)} type="button">
                    <PencilIcon className="h-4 w-4" />
                    {t("groups.editAction")}
                  </button>
                ) : null}

                {routeGroupId ? (
                  <button
                    className="workspace-shell-trigger w-full text-[#9f3b32] hover:border-[#efc9c2] hover:bg-[#fff3f1] hover:text-[#9f3b32]"
                    onClick={() => {
                      setDeleteGroupError(null);
                      setIsDeleteGroupOpen(true);
                    }}
                    type="button"
                  >
                    <TrashIcon className="h-4 w-4" />
                    {t("groups.deleteAction")}
                  </button>
                ) : null}
              </div>

              <div className="mt-4">
                <MobileGroupPicker
                  currentModule={currentModule}
                  groups={groups}
                  routeGroupId={routeGroupId}
                  t={t}
                />
              </div>

              {routeGroupId ? (
                <nav className="mt-4 grid grid-cols-2 gap-2">
                  {groupTabs.map((tab) => (
                    <NavLink key={tab.key} to={buildGroupModulePath(routeGroupId, tab.key)} className={({ isActive }) => buildMobileMenuTabClass(isActive || currentModule === tab.key)}>
                      {tab.icon}
                      {tab.label}
                    </NavLink>
                  ))}
                </nav>
              ) : null}
            </div>
          ) : null}

          <footer className="mx-auto max-w-6xl px-4 pb-[5.5rem] sm:px-6 xl:max-w-none xl:px-0 xl:pb-0">
            <PublicSiteFooter />
          </footer>

          <div className="xl:hidden">
            <MobileBottomNav
              isGroupsActive={isMobileNavOpen}
              isDashboardActive={isDashboardRoute}
              isSettingsActive={!isGuest && isSettingsRoute}
              isGuest={isGuest}
              labels={{
                dashboard: t("nav.dashboard"),
                groups: t("sidebar.groups"),
                settings: t("settings.title")
              }}
              onGroupsClick={() => setIsMobileNavOpen((current) => !current)}
            />
          </div>
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

function MobileGroupPicker({
  groups,
  routeGroupId,
  currentModule,
  t
}: {
  groups: GroupSummaryDto[];
  routeGroupId: string | null;
  currentModule: GroupModuleKey | null;
  t: (key: any) => string;
}) {
  const navigate = useNavigate();
  const targetModule = currentModule ?? "overview";

  if (groups.length === 0) {
      return (
        <div className="rounded-[18px] border border-dashed border-[#ddd5c4] bg-[#fbf8f1] px-4 py-3 text-sm text-[#7c7567]">
          {t("sidebar.noGroupsBody")}
        </div>
      );
  }

  return (
      <div className="rounded-[22px] border border-[#e6decd] bg-[#fbf8f1] p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#918970]">
          {t("sidebar.groups")}
        </div>
      <CustomSelect
        ariaLabel={t("sidebar.groups")}
        options={[
          { value: "", label: t("nav.dashboard") },
          ...groups.map((group) => ({
            value: group.id,
            label: group.name
          }))
        ]}
        value={routeGroupId ?? ""}
        onChange={(nextGroupId) => {
          if (!nextGroupId) {
            navigate("/dashboard");
            return;
          }

          navigate(buildGroupModulePath(nextGroupId, targetModule));
        }}
      />
    </div>
  );
}

function MobileBottomNav({
  isDashboardActive,
  isGroupsActive,
  isSettingsActive,
  isGuest,
  labels,
  onGroupsClick
}: {
  isDashboardActive: boolean;
  isGroupsActive: boolean;
  isSettingsActive: boolean;
  isGuest: boolean;
  labels: {
    dashboard: string;
    groups: string;
    settings: string;
  };
  onGroupsClick: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e6decd] bg-[rgba(251,248,241,0.96)] px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-stretch gap-2">
        <NavLink to="/dashboard" className={({ isActive }) => buildBottomNavClass(isActive || isDashboardActive)}>
          <span className="flex h-5 w-5 items-center justify-center">
            <HomeIcon className="h-4 w-4" />
          </span>
          <span>{labels.dashboard}</span>
        </NavLink>

        <button className={buildBottomNavClass(isGroupsActive)} onClick={onGroupsClick} type="button">
          <span className="flex h-5 w-5 items-center justify-center">
            <UsersIcon className="h-4 w-4" />
          </span>
          <span>{labels.groups}</span>
        </button>

        {!isGuest ? (
          <NavLink to="/settings" className={({ isActive }) => buildBottomNavClass(isActive || isSettingsActive)}>
            <span className="flex h-5 w-5 items-center justify-center">
              <SettingsIcon className="h-4 w-4" />
            </span>
            <span>{labels.settings}</span>
          </NavLink>
        ) : null}
      </div>
    </nav>
  );
}

function DesktopRailToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="4.5" y="5" width="15" height="14" rx="3" />
      <path d="M9 7.75v8.5" />
      {collapsed ? <path d="m12.5 12 3-2.75v5.5L12.5 12Z" fill="currentColor" stroke="none" /> : <path d="m15.5 12-3-2.75v5.5L15.5 12Z" fill="currentColor" stroke="none" />}
    </svg>
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
      <div className="rounded-[18px] border border-[#efc9c2] bg-[#fff3f1] px-3 py-3">
        <div className="text-sm font-semibold text-[#9f3b32]">{title}</div>
        <div className="mt-1 text-sm leading-6 text-[#9f3b32]">{message}</div>
        <button className="workspace-shell-trigger mt-3 min-h-[40px] px-3 py-2 text-sm" onClick={onRetry} type="button">
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

function buildDesktopNavClass(isActive: boolean, collapsed: boolean) {
  return [
    "group flex min-h-[48px] w-full items-center gap-3 rounded-[18px] border px-3 py-3 text-sm font-medium transition",
    collapsed ? "justify-center px-0" : "",
    isActive
      ? "border-[#5f7520] bg-[#5f7520] text-[#fffdf7] shadow-[0_12px_28px_rgba(95,117,32,0.18)]"
      : "border-transparent bg-[#fbf8f1] text-[#6f6859] hover:border-[#e4dccb] hover:bg-[#fffdf8] hover:text-[#1b1813]"
  ].join(" ");
}

function buildDesktopNavIconClass(isActive: boolean) {
  return [
    "h-4 w-4 shrink-0 transition",
    isActive ? "text-white" : "text-[#1b1813]"
  ].join(" ");
}

function buildDesktopIdentityClass(collapsed: boolean) {
  return [
    "flex items-center gap-3 rounded-[20px] border border-[#e9e1d1] bg-[#fbf8f1] px-3 py-3",
    collapsed ? "justify-center px-0" : ""
  ].join(" ");
}

function buildTabClass(isActive: boolean) {
  return [
    "inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
    isActive
      ? "border-[#5f7520] bg-[#5f7520] text-[#fffdf7] shadow-[0_12px_28px_rgba(95,117,32,0.16)]"
      : "border-[#e4dccb] bg-[#fffdf8] text-[#6f6859] hover:border-[#d7ceb9] hover:bg-[#ffffff] hover:text-[#1b1813]"
  ].join(" ");
}

function buildMobileMenuTabClass(isActive: boolean) {
  return [
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-medium transition",
    isActive
      ? "border-[#5f7520] bg-[#5f7520] text-[#fffdf7]"
      : "border-[#e4dccb] bg-[#fbf8f1] text-[#1b1813]"
  ].join(" ");
}

function buildBottomNavClass(isActive: boolean) {
  return [
    "flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[18px] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition",
    isActive
      ? "bg-[#5f7520] text-[#fffdf7] shadow-[0_12px_28px_rgba(95,117,32,0.18)]"
      : "bg-[#fbf8f1] text-[#6f6859]"
  ].join(" ");
}
