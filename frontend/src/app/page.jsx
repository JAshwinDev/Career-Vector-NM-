"use client";

import { useApp } from "../components/layout/SidebarProvider.jsx";
import AnalyzeForm from "../components/resume/AnalyzeForm.jsx";
import ResultsDashboard from "../components/dashboard/ResultsDashboard.jsx";
import LoadingOverlay from "../components/shared/LoadingOverlay.jsx";

export default function HomePage() {
  const {
    user,
    authBooting,
    loading,
    setLoading,
    sessionResult,
    handleResult,
    handleReset
  } = useApp();

  if (authBooting) {
    return (
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "var(--space-6) 24px", color: "var(--text-secondary)" }}>
        Signing you in from the extension...
      </section>
    );
  }

  return (
    <>
      {loading && <LoadingOverlay />}

      {sessionResult ? (
        <ResultsDashboard result={sessionResult} onReset={handleReset} />
      ) : (
        <AnalyzeForm
          onResult={handleResult}
          onLoading={setLoading}
          user={user}
          onLoginRequired={() => {}}
        />
      )}
    </>
  );
}
