"use client";

import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeletedView } from "@/components/deleted-view";
import { PendingView } from "@/components/pending-view";
import { ProjectsView } from "@/components/projects-view";
import { RecordsView } from "@/components/records-view";
import { useFrameNav, type FrameScreen } from "@/components/frame-nav";
import { useOffice } from "@/components/office-provider";
import { canViewNode } from "@/lib/tasks";

export const WORK_TABS: { screen: FrameScreen; href: string; label: string }[] = [
  { screen: "records", href: "/records", label: "工作紀錄" },
  { screen: "pending", href: "/pending", label: "未完成工作" },
  { screen: "projects", href: "/projects", label: "專案" },
  { screen: "deleted", href: "/deleted", label: "刪除紀錄" },
];

const PRIMARY_TABS = WORK_TABS.filter((item) => item.screen !== "deleted");
const DELETED_TAB = WORK_TABS.find((item) => item.screen === "deleted");

export function isWorkScreen(screen: FrameScreen): boolean {
  return WORK_TABS.some((tab) => tab.screen === screen);
}

export function WorkView({ tab }: { tab: FrameScreen }) {
  const go = useFrameNav();
  const { companyBase, session, tasks } = useOffice();
  const hasProject = Boolean(
    session &&
      tasks.some((node) => {
        if (node.level !== 0) return false;
        if (node.deleted) return node.creator === session.account;
        return canViewNode(tasks, node, session.account);
      }),
  );
  const showDeleted = tab === "deleted" || hasProject;

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#e7f6ee] text-[#178a4a]">
          <Briefcase className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">工作</h1>
          <p className="text-[13px] text-muted-foreground">工作紀錄、未完成工作、專案在上方。有專案時，刪除紀錄在下一行。</p>
        </div>
      </div>
      <div className="mb-4" data-testid="work-tabs">
        <div className="flex gap-1.5 overflow-x-auto">
          {PRIMARY_TABS.map((item) => (
            <Button
              key={item.screen}
              type="button"
              size="sm"
              variant={item.screen === tab ? "default" : "outline"}
              className="rounded-full"
              data-testid={`tab-${item.screen}`}
              onClick={() => go(`${companyBase}${item.href}`)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        {showDeleted && DELETED_TAB ? (
          <div className="mt-1.5 flex" data-testid="deleted-record-row">
            <Button
              type="button"
              size="sm"
              variant={tab === "deleted" ? "default" : "outline"}
              className="rounded-full"
              data-testid="tab-deleted"
              onClick={() => go(`${companyBase}${DELETED_TAB.href}`)}
            >
              {DELETED_TAB.label}
            </Button>
          </div>
        ) : null}
      </div>
      <div hidden={tab !== "pending"}>
        <PendingView />
      </div>
      <div hidden={tab !== "projects"}>
        <ProjectsView />
      </div>
      <div hidden={tab !== "records"}>
        <RecordsView />
      </div>
      <div hidden={tab !== "deleted"}>
        <DeletedView />
      </div>
    </div>
  );
}
