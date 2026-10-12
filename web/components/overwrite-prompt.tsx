"use client";

import { Button } from "@/components/ui/button";

export function OverwritePrompt({
  error,
  pending,
  onConfirm,
  onCancel,
}: {
  error: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="overwrite-title"
        data-testid="overwrite-prompt"
        className="w-full max-w-[440px] rounded-2xl border border-[#e6e8ee] bg-white px-6 py-6 shadow-[0_8px_24px_rgba(22,28,45,0.08)]"
      >
        <h2 id="overwrite-title" className="text-[18px] font-bold">
          公司資料已在其他地方更新
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          你這台有尚未上傳的變更，伺服器上的公司資料也已經更新。覆蓋會用你這台的整份資料取代伺服器。保留遠端會捨棄你這台尚未上傳的變更，並改以伺服器上的內容為準。
        </p>
        {error ? (
          <p role="alert" className="mt-3 rounded-[10px] border border-[#f3c7c7] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9f1d1d]">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" data-testid="overwrite-confirm" disabled={pending} onClick={onConfirm}>
            覆蓋遠端
          </Button>
          <Button type="button" variant="outline" data-testid="overwrite-cancel" disabled={pending} onClick={onCancel}>
            保留遠端
          </Button>
        </div>
      </section>
    </div>
  );
}
