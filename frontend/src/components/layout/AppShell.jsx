"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./SidebarProvider.jsx";
import Sidebar from "./Sidebar.jsx";
import AuthScreen from "./AuthScreen.jsx";

export default function AppShell({ children }) {
  const { user, pathname } = useApp();
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
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">{children}</main>
    </div>
  );
}
