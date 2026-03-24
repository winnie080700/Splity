import type { GroupStatus, GroupSummaryDto } from "@api-client";

export function formatGroupCreatedAt(value: string, language: "en" | "zh") {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function getGroupStatusLabel(status: GroupStatus, t: (key: any) => string) {
  return {
    unresolved: t("groups.statusUnresolved"),
    settling: t("groups.statusSettling"),
    settled: t("groups.statusSettled")
  }[status];
}

export function getGroupStatusClassName(status: GroupStatus) {
  return {
    unresolved: "border-slate-200 bg-slate-100 text-slate-700",
    settling: "border-sky-200 bg-sky-50 text-brand",
    settled: "border-emerald-200 bg-emerald-50 text-success"
  }[status];
}

export function GroupStatusBadge({
  status,
  t,
  className = ""
}: {
  status: GroupStatus;
  t: (key: any) => string;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex min-h-[26px] max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em]",
        getGroupStatusClassName(status),
        className
      ].join(" ")}
      title={getGroupStatusLabel(status, t)}
    >
      <span className="truncate">{getGroupStatusLabel(status, t)}</span>
    </span>
  );
}

export function splitGroupsByStatus(groups: GroupSummaryDto[]) {
  return {
    currentGroups: groups.filter((group) => group.status !== "settled"),
    settledGroups: groups.filter((group) => group.status === "settled")
  };
}

export function isGroupLocked(status: GroupStatus) {
  return status === "settling" || status === "settled";
}
