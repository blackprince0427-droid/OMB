"use client";

import type { ReactNode } from "react";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CROSS_PERSON_COPY, crossPersonTodos, unfinishedRecords, type WorkRecord } from "@/lib/office";
import { LEVEL_LABEL, unfinishedTaskNodes } from "@/lib/tasks";
import { useFrameNav } from "@/components/frame-nav";
import { useOffice } from "@/components/office-provider";

function TodoItem({
  item,
  meta,
  action,
}: {
  item: WorkRecord;
  meta: string;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-[#f0f1f4] px-3 py-2">
      <div>
        <p className="text-sm font-semibold">{item.title}</p>
        {item.content ? <p className="mt-1 text-[13px] text-[#3c4250]">{item.content}</p> : null}
        <p className="mt-1 text-xs text-[#8b919d]">
          {item.workDate}
          <span className="ml-2">{meta}</span>
        </p>
      </div>
      {action}
    </li>
  );
}

export function PendingView() {
  const go = useFrameNav();
  const { session, users, records, tasks, invites, companyBase, assignments, positions, permissions, completeRecord, answerTaskInvite } = useOffice();
  if (!session) return null;
  const mine = unfinishedRecords(records, session.account).filter((item) => item.account === session.account && !item.taskNodeId);
  const cross = crossPersonTodos(records, session.account, assignments, positions, permissions);
  const assignedToMe = cross.assignedToMe.filter((item) => !item.taskNodeId);
  const visibleToMe = cross.visibleToMe.filter((item) => !item.taskNodeId);
  const incoming = invites.filter((item) => {
    if (item.to !== session.account || item.status !== "pending") return false;
    const project = tasks.find((node) => node.id === item.projectId && node.level === 0);
    return Boolean(project && !project.deleted);
  });
  const openTasks = unfinishedTaskNodes(tasks, session.account);

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#fff1e4] text-[#b86112]">
          <ListChecks className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">未完成工作</h1>
          <p className="text-[13px] text-muted-foreground">
            先列出自己建立、且仍歸屬自己的未完成項目。尚未完成的任務節點也列在這裡，點名稱會打開該節點。邀請要登出再換帳戶登入後才看得到。
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <ul className="space-y-2" data-testid="pending-list">
          {mine.length === 0 ? (
            <li data-testid="pending-empty" className="text-[13px] text-muted-foreground">
              目前沒有未完成的工作紀錄。
            </li>
          ) : (
            mine.map((item) => (
              <TodoItem
                key={item.id}
                item={item}
                meta="歸屬自己"
                action={
                  <Button type="button" size="sm" data-testid={`complete-${item.id}`} onClick={() => completeRecord(item.id)}>
                    標為已完成
                  </Button>
                }
              />
            ))
          )}
        </ul>
      </section>

      <section className="mt-3 rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <h2 className="mb-1 text-[15px] font-semibold">跨人待辦</h2>
        <p data-testid="cross-person-copy" className="mb-3 text-xs leading-relaxed text-[#667085]">
          {CROSS_PERSON_COPY} 下面依歸屬與權限列出別人指給我的，以及我可見的未完成項目。
        </p>
        <h3 className="mb-2 text-sm font-semibold">別人指給我的</h3>
        <ul className="space-y-2" data-testid="assigned-list">
          {assignedToMe.length === 0 ? (
            <li className="text-[13px] text-muted-foreground">目前沒有別人分交給你的未完成項目。</li>
          ) : (
            assignedToMe.map((item) => {
              const creator = users.find((user) => user.account === item.account);
              return (
                <TodoItem
                  key={item.id}
                  item={item}
                  meta={`由 ${creator?.name ?? item.account} 分交，可以修改`}
                  action={
                    <Button type="button" size="sm" data-testid={`complete-${item.id}`} onClick={() => completeRecord(item.id)}>
                      標為已完成
                    </Button>
                  }
                />
              );
            })
          )}
        </ul>
        <h3 className="mt-4 mb-2 text-sm font-semibold">我可見的</h3>
        <ul className="space-y-2" data-testid="visible-list">
          {visibleToMe.length === 0 ? (
            <li className="text-[13px] text-muted-foreground">目前沒有依權限可見、且未歸屬自己的未完成項目。</li>
          ) : (
            visibleToMe.map((item) => {
              const owner = users.find((user) => user.account === (item.assignee || item.account));
              return (
                <TodoItem
                  key={item.id}
                  item={item}
                  meta={`歸屬 ${owner?.name ?? item.assignee}，只可查看`}
                />
              );
            })
          )}
        </ul>
      </section>

      <section className="mt-3 rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <h2 className="mb-2 text-[15px] font-semibold">待處理邀請</h2>
        <ul className="space-y-2" data-testid="pending-invites">
          {incoming.length === 0 ? (
            <li className="text-[13px] text-muted-foreground">目前沒有要你同意的邀請。</li>
          ) : (
            incoming.map((item) => {
              const node = tasks.find((taskNode) => taskNode.id === item.nodeId);
              const from = users.find((user) => user.account === item.from);
              return (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#f0f1f4] px-3 py-2">
                  <p className="text-sm">
                    {from?.name ?? item.from} 請你{item.kind === "transfer" ? "接手" : "加入"}「{node?.name ?? "節點"}」
                    {node ? <span className="ml-2 text-xs text-[#8b919d]">{LEVEL_LABEL[node.level]}</span> : null}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" data-testid={`accept-${item.id}`} onClick={() => answerTaskInvite(item.id, true)}>
                      同意
                    </Button>
                    <Button type="button" size="sm" variant="outline" data-testid={`reject-${item.id}`} onClick={() => answerTaskInvite(item.id, false)}>
                      拒絕
                    </Button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="mt-3 rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <h2 className="mb-2 text-[15px] font-semibold">未完成的任務</h2>
        <ul className="space-y-2" data-testid="unfinished-tasks">
          {openTasks.length === 0 ? (
            <li className="text-[13px] text-muted-foreground">目前沒有未完成的任務節點。</li>
          ) : (
            openTasks.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  data-testid={`open-task-${node.id}`}
                  className="text-sm font-semibold text-[#2f6fed]"
                  onClick={() => go(`${companyBase}/projects?node=${node.id}`)}
                >
                  {node.name}
                </button>
                <span className="ml-2 text-xs text-[#8b919d]">
                  {LEVEL_LABEL[node.level]} · {node.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
