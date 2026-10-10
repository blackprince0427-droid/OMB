"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOffice } from "@/components/office-provider";

export function DeletedView() {
  const { session, tasks, invites, restoreRemovedProject } = useOffice();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  if (!session) return null;
  const mine = tasks.filter((node) => node.level === 0 && node.deleted && node.creator === session.account);

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#fdecec] text-[#9f1d1d]">
          <Trash2 className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">刪除頁面</h1>
          <p className="text-[13px] text-muted-foreground">這裡存放你刪除的整棵專案樹。還原時，狀態和邀請會一起回來。</p>
        </div>
      </div>
      {error ? <p className="mb-3 text-[13px] text-[#9f1d1d]">{error}</p> : null}
      {ok ? (
        <p data-testid="restore-ok" className="mb-3 text-[13px] text-[#17693a]">
          {ok}
        </p>
      ) : null}
      <ul className="space-y-2" data-testid="deleted-projects">
        {mine.length === 0 ? <li className="text-[13px] text-muted-foreground">沒有可還原的專案。</li> : null}
        {mine.map((project) => {
          const count = tasks.filter((node) => node.projectId === project.id).length;
          const pending = invites.filter((item) => item.projectId === project.id && item.status === "pending").length;
          return (
            <li key={project.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e6e8ee] bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{project.name}</p>
                <p className="text-xs text-[#8b919d]">
                  {project.status} · {count} 個節點 · 未回覆邀請 {pending}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const message = restoreRemovedProject(project.id);
                  if (message) {
                    setOk("");
                    setError(message);
                    return;
                  }
                  setError("");
                  setOk(`已還原「${project.name}」。`);
                }}
              >
                還原
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
