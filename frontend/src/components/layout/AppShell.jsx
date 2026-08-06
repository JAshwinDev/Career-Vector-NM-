"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./SidebarProvider.jsx";
import Sidebar from "./Sidebar.jsx";
import AuthScreen from "./AuthScreen.jsx";

export default function AppShell({ children }) {
  const { user, pathname, sidebarCollapsed } = useApp();
  const router = useRouter();

  // A signed-in user has no business on the login route.
  useEffect(() => {
    if (user && pathname === "/login") router.replace("/");
  }, [user, pathname, router]);

  // Pre-login: a clean, centered authentication card. No sidebar, no app
  // navigation, no marketing content — regardless of the requested route.
  if (!user) {
    if (pathname === "/login") {
      return <main>{children}</main>;
    }
    return <AuthScreen />;
  }

  // Post-login: the application shell — fixed left sidebar + content.
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <main
        className={`w-full flex-1 min-h-screen py-6 px-[clamp(16px,3vw,32px)] [transition:margin-left_250ms_ease] max-md:ml-0 max-md:pt-16 ${sidebarCollapsed ? "ml-[var(--rail-w)]" : "ml-[var(--sidebar-w)]"}`}
      >
        {children}
      </main>
    </div>
  );
}
