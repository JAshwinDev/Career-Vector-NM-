"use client";

import { useApp } from "../../components/layout/SidebarProvider.jsx";
import ResumeUploadForm from "../../components/resume/ResumeUploadForm.jsx";
import AuthRequired from "../../components/auth/AuthRequired.jsx";

export default function UploadPage() {
  const { user, setSessionResult, navigate } = useApp();

  if (!user) {
    return <AuthRequired />;
  }

  return (
    <ResumeUploadForm
      onUploadSuccess={(data) => {
        setSessionResult(data);
        navigate("/jobs");
      }}
    />
  );
}