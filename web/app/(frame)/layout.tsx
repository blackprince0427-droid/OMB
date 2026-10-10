import type { ReactNode } from "react";
import { FrameGate } from "@/components/frame-gate";

export default function FrameLayout({ children }: { children: ReactNode }) {
  return <FrameGate>{children}</FrameGate>;
}
