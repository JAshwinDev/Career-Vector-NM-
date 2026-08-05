"use client";

import { useApp } from "../../components/layout/SidebarProvider.jsx";
import UserDashboard from "../../components/dashboard/Dashboard.jsx";
import AuthRequired from "../../components/auth/AuthRequired.jsx";

export default function UserDashboardPage() {
  const { user } = useApp();

  if (!user) {
    return <AuthRequired />;
  }

  return <UserDashboard />;
}