"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CalendarDays, LayoutGrid, NotebookPen, Users } from "lucide-react";
import { canManageDepartments, canManageUsers } from "@/lib/office";
import { useOffice } from "@/components/office-provider";
import { cn } from "@/lib/utils";

const links = [
  { href: "/overview", group: "營運", label: "總覽", icon: LayoutGrid, testId: "nav-overview" },
  { href: "/calendar", group: "營運", label: "日曆", icon: CalendarDays, testId: "nav-calendar" },
  { href: "/records", group: "營運", label: "工作紀錄", icon: NotebookPen, testId: "nav-records" },
  { href: "/users", group: "管理", label: "使用者", icon: Users, testId: "nav-users", ceoOnly: true },
  { href: "/departments", group: "管理", label: "部門", icon: Building2, testId: "nav-departments", orgOnly: true },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session } = useOffice();
  if (!session) return null;

  const visible = links.filter((link) => {
    if ("ceoOnly" in link && link.ceoOnly) return canManageUsers(session.role);
    if ("orgOnly" in link && link.orgOnly) return canManageDepartments(session.role);
    return true;
  });
  return (
    <div className="flex min-h-svh flex-col bg-[#f4f5f7] md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-[#e6e8ee] bg-[#f7f8fa] px-3.5 py-4 md:min-h-svh md:w-[236px] md:border-r md:border-b-0">
        <div className="flex items-center gap-2.5 px-2 pb-3">
          <div className="grid size-9 place-items-center rounded-[10px] bg-linear-to-br from-[#2fbe6a] to-[#178a4a] text-sm font-bold text-white">
            辦
          </div>
          <div>
            <p className="text-[15px] font-bold">小型辦公</p>
            <p className="text-xs text-[#8b919d]">網頁版 · 第二版</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:block" aria-label="主框架導覽">
          {visible.map((link, index) => {
            const group = index === 0 || visible[index - 1].group !== link.group ? link.group : "";
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <div key={link.href} className="md:contents">
                {group ? (
                  <p className="hidden px-2.5 pt-2.5 pb-1.5 text-[11px] font-semibold text-[#9aa0ab] md:block">
                    {group}
                  </p>
                ) : null}
                <Link
                  href={link.href}
                  data-testid={link.testId}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm whitespace-nowrap text-[#3c4250] hover:bg-[#eef0f3]",
                    active && "bg-[#e8eaef] font-semibold text-[#1c1f26]",
                  )}
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              </div>
            );
          })}
        </nav>
        <div
          data-testid="current-user"
          className="mt-3 rounded-[14px] border border-[#e6e8ee] bg-white p-3 md:mt-auto"
        >
          <p className="text-xs text-muted-foreground">目前使用者</p>
          <p className="mt-0.5 text-sm font-semibold">{session.name}</p>
          <p className="mt-0.5 text-xs text-[#8b919d]">{session.account}</p>
          <span className="mt-2 inline-flex rounded-full bg-[#e7f6ee] px-2 py-0.5 text-xs font-semibold text-[#178a4a]">
            {session.role}
          </span>
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[52px] items-center justify-end px-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e8ee] bg-white px-2.5 py-1 text-xs">
            <span className="size-2 rounded-full bg-[#1fa85a] shadow-[0_0_0_3px_rgba(31,168,90,0.15)]" />
            已登入 · 主框架
          </span>
        </div>
        <div className="px-4 pb-8 md:px-7">{children}</div>
      </section>
    </div>
  );
}
