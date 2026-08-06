"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "../../components/layout/SidebarProvider.jsx";
import HistoryDashboard from "../../components/dashboard/HistoryDashboard.jsx";
import ResultsDashboard from "../../components/dashboard/ResultsDashboard.jsx";
import AuthRequired from "../../components/auth/AuthRequired.jsx";
import { getHistoryItem, historyItemToResult } from "../../utils/api.js";

function DashboardContent() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("analysisId");
  const { user, sessionResult, handleOpenAnalysis, handleReset } = useApp();

  const [savedResult, setSavedResult] = useState(null);
  const [savedResultLoading, setSavedResultLoading] = useState(false);
  const [savedResultError, setSavedResultError] = useState("");

  useEffect(() => {
    if (analysisId && sessionResult?.historyId === analysisId) {
      setSavedResult(sessionResult);
      setSavedResultError("");
      setSavedResultLoading(false);
    }
  }, [analysisId, sessionResult]);

  useEffect(() => {
    if (!analysisId) {
      setSavedResult(null);
      setSavedResultError("");
      setSavedResultLoading(false);
      return;
    }
    if (sessionResult?.historyId === analysisId) {
      setSavedResult(sessionResult);
      setSavedResultError("");
      setSavedResultLoading(false);
      return;
    }
    if (!user) {
      setSavedResult(null);
      setSavedResultError("");
      setSavedResultLoading(false);
      return;
    }

    let cancelled = false;
    setSavedResultLoading(true);
    setSavedResultError("");

    getHistoryItem(analysisId)
      .then((item) => {
        const currentUserId = user?.id || user?._id || "";
        if (item.userId && currentUserId && item.userId !== currentUserId) {
          throw new Error("This report belongs to another student profile.");
        }
        if (cancelled) return;
        setSavedResult(historyItemToResult(item));
      })
      .catch((err) => {
        if (cancelled) return;
        setSavedResult(null);
        setSavedResultError(err.message || "Failed to load saved analysis.");
      })
      .finally(() => {
        if (!cancelled) setSavedResultLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [analysisId, sessionResult, user]);

  if (!user) {
    return <AuthRequired />;
  }

  if (!analysisId) {
    return <HistoryDashboard onOpenAnalysis={handleOpenAnalysis} user={user} />;
  }

  const activeResult = sessionResult?.historyId === analysisId ? sessionResult : savedResult;

  return (
    <>
      {savedResultLoading ? (
        <section style={{ maxWidth: 860, margin: "0 auto", padding: "var(--space-6) clamp(16px, 4vw, 24px)", color: "var(--text-secondary)" }}>
          Loading saved analysis...
        </section>
      ) : savedResultError ? (
        <section style={{ maxWidth: 860, margin: "0 auto", padding: "var(--space-6) clamp(16px, 4vw, 24px)" }}>
          <div style={{
            background: "rgba(255,77,109,0.1)",
            border: "1px solid rgba(255,77,109,0.35)",
            borderRadius: 18,
            padding: 22,
            color: "var(--red)"
          }}>
            {savedResultError}
          </div>
        </section>
      ) : activeResult ? (
        <div style={{ paddingTop: "var(--space-6)" }}>
          <ResultsDashboard result={activeResult} onReset={handleReset} />
        </div>
      ) : null}
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}