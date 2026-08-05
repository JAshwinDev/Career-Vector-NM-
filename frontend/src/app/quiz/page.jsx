"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "../../components/layout/SidebarProvider.jsx";
import QuizPage from "../../components/quiz/QuizPage.jsx";
import AuthRequired from "../../components/auth/AuthRequired.jsx";
import { generateRoadmap } from "../../utils/api.js";

function QuizContent() {
  const searchParams = useSearchParams();
  const routeTargetRole = searchParams.get("targetRole");
  const { user, sessionResult, setSessionResult, setLoading, navigate } = useApp();

  if (!user) {
    return <AuthRequired />;
  }

  const targetRole = routeTargetRole || sessionResult?.target_role || "";

  const handleQuizComplete = async (results) => {
    const effectiveRole =
      results?.targetRole ||
      routeTargetRole ||
      sessionResult?.target_role ||
      "Software Developer";
    const skillPerformance = results?.quizResults?.skillsPerformance || {};
    const weakSkills = Object.entries(skillPerformance)
      .filter(([, percentage]) => Number(percentage) < 80)
      .map(([skill]) => skill);

    setLoading(true);

    try {
      const roadmapData = await generateRoadmap({
        userSkills: sessionResult?.student_skills || [],
        jobSkills: weakSkills,
        targetRole: effectiveRole,
        jobRequirements: weakSkills
      });

      setSessionResult((prev) => ({
        ...prev,
        target_role: effectiveRole,
        roadmap: roadmapData.roadmap || [],
        learningPath: roadmapData.learningPath || roadmapData.roadmap || [],
        skillGaps: roadmapData.skillGaps || results?.skillGaps || weakSkills.map((skill) => ({ skill })),
        estimatedTime: roadmapData.estimatedTime || "",
        quizResults: results?.quizResults || results
      }));
    } catch (error) {
      console.error("Failed to generate roadmap after quiz:", error);
      setSessionResult((prev) => ({
        ...prev,
        target_role: effectiveRole,
        quizResults: results?.quizResults || results,
        skillGaps: results?.skillGaps || weakSkills.map((skill) => ({ skill }))
      }));
    } finally {
      setLoading(false);
      navigate("/roadmap");
    }
  };

  return (
    <QuizPage targetRole={targetRole} onQuizComplete={handleQuizComplete} />
  );
}

export default function QuizRoute() {
  return (
    <Suspense fallback={null}>
      <QuizContent />
    </Suspense>
  );
}