"use client";

import type { ReactNode } from "react";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CROSS_PERSON_COPY, crossPersonTodos, unfinishedRecords, type ProjectTag, type WorkRecord } from "@/lib/office";
import { useOffice } from "@/components/office-provider";

function tagName(tags: ProjectTag[], tagId: string): string {
  if (!tagId) return "";
  return tags.find((tag) => tag.id === tagId)?.name ?? "";
}

function TodoItem({
  item,
  tags,
  meta,
  action,
}: {
  item: WorkRecord;
  tags: ProjectTag[];
  meta: string;
  action?: ReactNode;
}) {
  const label = tagName(tags, item.tagId);
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-[#f0f1f4] px-3 py-2">
      <div>
        <p className="text-sm font-semibold">{item.title}</p>
        {item.content ? <p className="mt-1 text-[13px] text-[#3c4250]">{item.content}</p> : null}
        <p className="mt-1 text-xs text-[#8b919d]">
          {item.workDate}
          {label ? (
            <span data-testid="pending-tag" className="ml-2 rounded-full bg-[#e8f0fe] px-1.5 py-0.5 font-semibold text-[#2f6fed]">
              {label}
            </span>
          ) : null}
          <span className="ml-2">{meta}</span>
        </p>
      </div>
      {action}
    </li>
  );
}

export function PendingView() {
  const { session, users, records, tags, assignments, positions, permissions, completeRecord } = useOffice();
  if (!session) return null;
  const mine = unfinishedRecords(records, session.account).filter((item) => item.account === session.account);
  const cross = crossPersonTodos(records, session.account, assignments, positions, permissions);

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#fff1e4] text-[#b86112]">
          <ListChecks className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">未完成工作</h1>
          <p className="text-[13px] text-muted-foreground">
            先列出自己建立、且仍歸屬自己的未完成項目。標為已完成後，項目會離開這一頁，並仍保留在工作紀錄。
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
                tags={tags}
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
          {cross.assignedToMe.length === 0 ? (
            <li className="text-[13px] text-muted-foreground">目前沒有別人分交給你的未完成項目。</li>
          ) : (
            cross.assignedToMe.map((item) => {
              const creator = users.find((user) => user.account === item.account);
              return (
                <TodoItem
                  key={item.id}
                  item={item}
                  tags={tags}
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
          {cross.visibleToMe.length === 0 ? (
            <li className="text-[13px] text-muted-foreground">目前沒有依權限可見、且未歸屬自己的未完成項目。</li>
          ) : (
            cross.visibleToMe.map((item) => {
              const owner = users.find((user) => user.account === (item.assignee || item.account));
              return (
                <TodoItem
                  key={item.id}
                  item={item}
                  tags={tags}
                  meta={`歸屬 ${owner?.name ?? item.assignee}，只可查看`}
                />
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
