"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useOffice } from "@/components/office-provider";

export function FrameGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { ready, session, companyBase } = useOffice();
  void children;

  useEffect(() => {
    if (ready && !session) router.replace(companyBase || "/");
  }, [companyBase, ready, router, session]);

  if (!ready || !session) {
    return (
      <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
        正在確認登入狀態
      </main>
    );
  }

  return <AppShell />;
}
