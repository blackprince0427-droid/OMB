"use client";

import { createContext, useContext, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { companyBaseFromPath } from "@/lib/office";

export type FrameScreen = "overview" | "calendar" | "records" | "pending" | "account" | "users" | "departments" | "permissions";

const FrameNavContext = createContext<(href: string) => void>(() => {});

export function screenFromPath(path: string): FrameScreen {
  const base = companyBaseFromPath(path);
  const rest = base ? path.slice(base.length) || "/" : path;
  if (rest.startsWith("/calendar")) return "calendar";
  if (rest.startsWith("/records")) return "records";
  if (rest.startsWith("/pending")) return "pending";
  if (rest.startsWith("/account")) return "account";
  if (rest.startsWith("/users")) return "users";
  if (rest.startsWith("/departments")) return "departments";
  if (rest.startsWith("/permissions")) return "permissions";
  return "overview";
}

export function FrameNavProvider({
  initialPath,
  children,
}: {
  initialPath: string;
  children: (screen: FrameScreen) => ReactNode;
}) {
  const [screen, setScreen] = useState<FrameScreen>(screenFromPath(initialPath));

  useEffect(() => {
    const sync = () => setScreen(screenFromPath(window.location.pathname));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  function go(href: string) {
    setScreen(screenFromPath(href));
    if (window.location.pathname !== href) {
      window.history.pushState(null, "", href);
    }
  }

  return <FrameNavContext.Provider value={go}>{children(screen)}</FrameNavContext.Provider>;
}

export function useFrameNav(): (href: string) => void {
  return useContext(FrameNavContext);
}

export function FrameLink({ href, onClick, ...props }: ComponentProps<"a"> & { href: string }) {
  const go = useFrameNav();
  return (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        go(href);
      }}
      {...props}
    />
  );
}
