"use client";

import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unfinishedRecords } from "@/lib/office";
import { useOffice } from "@/components/office-provider";

export function PendingView() {
  const { session, records, completeRecord } = useOffice();
  if (!session) return null;
  const items = unfinishedRecords(records, session.account);

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#fff1e4] text-[#b86112]">
          <ListChecks className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">未完成工作</h1>
          <p className="text-[13px] text-muted-foreground">
            只列出自己尚未完成的工作紀錄。標為已完成後，項目會離開這一頁，並仍保留在工作紀錄。
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <ul className="space-y-2" data-testid="pending-list">
          {items.length === 0 ? (
            <li data-testid="pending-empty" className="text-[13px] text-muted-foreground">
              目前沒有未完成的工作紀錄。
            </li>
          ) : (
            items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#f0f1f4] px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.content ? <p className="mt-1 text-[13px] text-[#3c4250]">{item.content}</p> : null}
                  <p className="mt-1 text-xs text-[#8b919d]">{item.workDate}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  data-testid={`complete-${item.id}`}
                  onClick={() => completeRecord(item.id)}
                >
                  標為已完成
                </Button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
