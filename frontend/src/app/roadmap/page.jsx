"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "../../components/layout/SidebarProvider.jsx";
import RoadmapViewer from "../../components/dashboard/RoadmapViewer.jsx";
import AuthRequired from "../../components/auth/AuthRequired.jsx";
import { getHistoryItem, historyItemToResult, generateRoadmap } from "../../utils/api.js";

function RoadmapContent() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("analysisId");
  const targetRole = searchParams.get("targetRole");
  const { user, sessionResult } = useApp();

  const [roadmapResult, setRoadmapResult] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState("");

  useEffect(() => {
    if (!analysisId || !user) {
      setRoadmapResult(null);
      setRoadmapLoading(false);
      setRoadmapError("");
      return;
    }

    let cancelled = false;
    setRoadmapLoading(true);
    setRoadmapError("");

    getHistoryItem(analysisId)
      .then(async (item) => {
        const result = historyItemToResult(item);
        let roadmapData = null;
        try {
          roadmapData = await generateRoadmap({
            userSkills: result.student_skills || [],
            jobSkills: result.matched_skills || [],
            targetRole: result.target_role || "",
            jobRequirements: result.missing_skills
              ? result.missing_skills.map((r) => (typeof r === "string" ? r : r.skill))
              : []
          });
        } catch (err) {
          console.warn("Failed to generate roadmap for saved analysis, using stored roadmap:", err.message);
        }
        if (cancelled) return;
        const roadmap = roadmapData?.roadmap || roadmapData?.learningPath || result.roadmap || [];
        setRoadmapResult({
          roadmap,
          learningPath: roadmap,
          targetRole: result.target_role || "",
          userSkills: result.student_skills || []
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setRoadmapResult(null);
        setRoadmapError(err.message || "Failed to load roadmap.");
      })
      .finally(() => {
        if (!cancelled) setRoadmapLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [analysisId, user]);

  if (!user) {
    return <AuthRequired />;
  }

  const roadmap =
    sessionResult?.roadmap ||
    sessionResult?.learningPath ||
    roadmapResult?.roadmap ||
    roadmapResult?.learningPath ||
    [];
  const role = sessionResult?.target_role || roadmapResult?.targetRole || targetRole || "Selected role";
  const userSkills = sessionResult?.student_skills || roadmapResult?.userSkills || [];

  return (
    <>
      {roadmapLoading ? (
        <section style={{ maxWidth: 860, margin: "0 auto", padding: "var(--space-6) 24px", color: "var(--text-secondary)" }}>
          Building your roadmap...
        </section>
      ) : roadmapError ? (
        <section style={{ maxWidth: 860, margin: "0 auto", padding: "var(--space-6) 24px" }}>
          <div style={{
            background: "rgba(255,77,109,0.1)",
            border: "1px solid rgba(255,77,109,0.35)",
            borderRadius: 18,
            padding: 22,
            color: "var(--red)"
          }}>
            {roadmapError}
          </div>
        </section>
      ) : (
        <RoadmapViewer roadmap={roadmap} targetRole={role} userSkills={userSkills} />
      )}
    </>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={null}>
      <RoadmapContent />
    </Suspense>
  );
}