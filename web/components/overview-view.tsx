"use client";

import { Building2, CalendarDays, KeyRound, LayoutGrid, ListChecks, NotebookPen, ShieldCheck, Users } from "lucide-react";
import { FrameLink } from "@/components/frame-nav";
import { buttonVariants } from "@/components/ui/button";
import { canManageDepartments, canManageUsers, daysInMonth } from "@/lib/office";
import { cn } from "@/lib/utils";
import { useOffice } from "@/components/office-provider";

export function OverviewView() {
  const { session, users, activity, companyBase } = useOffice();
  if (!session) return null;
  const now = new Date();
  const recent = activity.slice(0, 4);
  const shortcuts = [
    { href: "/pending", label: "未完成工作", icon: ListChecks, testId: "open-pending" },
    { href: "/records", label: "工作紀錄", icon: NotebookPen, testId: "open-records" },
    { href: "/calendar", label: "日曆", icon: CalendarDays, testId: "open-calendar" },
    { href: "/account", label: "帳戶", icon: KeyRound, testId: "open-account" },
    ...(canManageUsers(session.role)
      ? [{ href: "/users", label: "使用者", icon: Users, testId: "open-users" }]
      : []),
    ...(canManageDepartments(session.role)
      ? [
          { href: "/departments", label: "部門", icon: Building2, testId: "open-departments" },
          { href: "/permissions", label: "權限指派", icon: ShieldCheck, testId: "open-permissions" },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#e8f0fe] text-[#2f6fed]">
          <LayoutGrid className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">總覽</h1>
          <p className="text-[13px] text-muted-foreground">主框架狀態、今日與日曆捷徑</p>
        </div>
      </div>

      <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4 shadow-[0_8px_24px_rgba(22,28,45,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-[#e7f6ee] text-sm font-bold text-[#178a4a]">
              ✓
            </span>
            <div>
              <h2 className="text-base font-semibold">工作階段正常</h2>
              <p className="text-[13px] text-muted-foreground">
                已通過登入驗證。目前使用者 {session.name}（{session.role}）可使用主框架。
              </p>
            </div>
          </div>
          <FrameLink href={`${companyBase}/calendar`} className={cn(buttonVariants({ variant: "outline" }))}>
            打開日曆
          </FrameLink>
        </div>
        <ol className="mt-4 grid grid-cols-2 gap-2 border-t border-[#f0f1f4] pt-4 md:grid-cols-4">
          {[
            ["登入驗證", "已通過"],
            ["主框架", "導覽已顯示"],
            ["日曆入口", "可開啟"],
            ["目前使用者", session.role],
          ].map(([title, detail]) => (
            <li key={title} className="text-center">
              <p className="text-[13px] font-semibold">{title}</p>
              <p className="text-xs text-[#8b919d]">{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="my-3.5 grid gap-3 sm:grid-cols-3">
        <Stat label={`今天 · ${now.getFullYear()}年${now.getMonth() + 1}月`} value={String(now.getDate())} tone="blue" mark="日" />
        <Stat label="本月日數" value={String(daysInMonth(now.getFullYear(), now.getMonth()))} tone="green" mark="月" />
        <Stat label="已建立使用者" value={String(users.length)} tone="purple" mark="人" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-[#e6e8ee] bg-white px-4 py-3.5">
          <h2 className="text-[15px] font-semibold">最近活動</h2>
          {recent.length === 0 ? (
            <p className="py-4 text-[13px] text-muted-foreground">這次開啟後尚未有新的活動。</p>
          ) : (
            <ul>
              {recent.map((item, index) => (
                <li key={`${item.time}-${item.action}-${index}`} className="flex items-center justify-between gap-3 border-b border-[#f0f1f4] py-2.5 text-[13px] last:border-b-0">
                  <span>
                    {item.name}
                    <span className="ml-2 rounded-full bg-[#e7f6ee] px-1.5 py-0.5 text-[11px] font-semibold text-[#178a4a]">
                      {item.tag}
                    </span>
                  </span>
                  <span className="text-xs text-[#8b919d]">{item.time.slice(11)} · {item.action}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-[#e6e8ee] bg-white px-4 py-3.5">
          <h2 className="mb-3 text-[15px] font-semibold">常用功能</h2>
          <div className="grid grid-cols-2 gap-2">
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <FrameLink
                  key={item.href}
                  href={`${companyBase}${item.href}`}
                  data-testid={item.testId}
                  className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
                >
                  <Icon />
                  {item.label}
                </FrameLink>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  mark,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "purple";
  mark: string;
}) {
  const toneClass = {
    blue: "bg-[#e8f0fe] text-[#2f6fed]",
    green: "bg-[#e7f6ee] text-[#178a4a]",
    purple: "bg-[#f3edff] text-[#7a4dd6]",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e6e8ee] bg-white px-4 py-3.5">
      <span className={`grid size-9 place-items-center rounded-[10px] text-sm font-bold ${toneClass}`}>{mark}</span>
      <div>
        <p className="text-[22px] leading-none font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
