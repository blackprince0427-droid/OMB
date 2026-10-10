"use client";

import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeletedView } from "@/components/deleted-view";
import { PendingView } from "@/components/pending-view";
import { ProjectsView } from "@/components/projects-view";
import { RecordsView } from "@/components/records-view";
import { useFrameNav, type FrameScreen } from "@/components/frame-nav";
import { useOffice } from "@/components/office-provider";

export const WORK_TABS: { screen: FrameScreen; href: string; label: string }[] = [
  { screen: "pending", href: "/pending", label: "未完成工作" },
  { screen: "projects", href: "/projects", label: "專案" },
  { screen: "records", href: "/records", label: "工作紀錄" },
  { screen: "deleted", href: "/deleted", label: "刪除頁面" },
];

export function isWorkScreen(screen: FrameScreen): boolean {
  return WORK_TABS.some((tab) => tab.screen === screen);
}

export function WorkView({ tab }: { tab: FrameScreen }) {
  const go = useFrameNav();
  const { companyBase } = useOffice();

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#e7f6ee] text-[#178a4a]">
          <Briefcase className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">工作</h1>
          <p className="text-[13px] text-muted-foreground">未完成工作、專案、工作紀錄與刪除頁面在同一頁，用上方分頁切換。</p>
        </div>
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto" data-testid="work-tabs">
        {WORK_TABS.map((item) => (
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
