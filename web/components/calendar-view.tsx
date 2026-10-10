"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSameDay, monthMatrix } from "@/lib/office";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function CalendarView() {
  const today = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = monthMatrix(year, month);

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#e7f6ee] text-[#178a4a]">
          <CalendarDays className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">日曆</h1>
          <p className="text-[13px] text-muted-foreground">
            只提供月視圖。今天可識別，可前往上一月與下一月。
          </p>
        </div>
      </div>
      <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold" data-testid="month-label">
            {year}年{month + 1}月
          </h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid="prev-month"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              上一月
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="this-month"
              onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            >
              今天
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="next-month"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              下一月
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7" data-testid="calendar-grid">
          {cells.map((cell) => {
            const todayCell = isSameDay(cell.year, cell.month, cell.day, today);
            return (
              <div
                key={`${cell.year}-${cell.month}-${cell.day}-${cell.outside ? "out" : "in"}`}
                className={`min-h-16 border border-[#eef0f3] p-2 sm:min-h-[92px] ${cell.outside ? "bg-[#fbfbfc] text-[#c0c4cc]" : "bg-white"} ${todayCell ? "bg-[#f4fbf7]" : ""}`}
                aria-current={todayCell ? "date" : undefined}
              >
                <span
                  className={`grid size-[26px] place-items-center rounded-full text-[13px] font-semibold ${todayCell ? "bg-[#178a4a] text-white" : ""}`}
                >
                  {cell.day}
                </span>
                {todayCell ? (
                  <p data-testid="today-mark" className="mt-2 text-[11px] font-semibold text-[#178a4a]">
                    今天
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
