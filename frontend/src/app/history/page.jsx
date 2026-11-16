"use client";

import { useApp } from "../../components/layout/SidebarProvider.jsx";
import JobHistoryPage from "../../components/dashboard/JobHistoryPage.jsx";
import AuthRequired from "../../components/auth/AuthRequired.jsx";

export default function HistoryPage() {
  const { user, handleOpenAnalysis } = useApp();

  if (!user) {
    return <AuthRequired />;
  }

  return <JobHistoryPage onOpenAnalysis={handleOpenAnalysis} user={user} />;
}
