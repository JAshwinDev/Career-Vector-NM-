"use client";

import { useApp } from "../../components/layout/SidebarProvider.jsx";
import JobSearchPage from "../../components/jobs/JobSearchPage.jsx";
import AuthRequired from "../../components/auth/AuthRequired.jsx";

export default function JobsPage() {
  const { user, sessionResult } = useApp();

  if (!user) {
    return <AuthRequired />;
  }

  return (
    <JobSearchPage
      userSkills={sessionResult?.student_skills || []}
      onJobSelect={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    />
  );
}