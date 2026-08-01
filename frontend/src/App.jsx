import React, { useEffect, useState } from "react";
import HeroSection from "./components/HeroSection.jsx";
import WorkflowSection from "./components/WorkflowSection.jsx";
import AnalyzeForm from "./components/AnalyzeForm.jsx";
import ResultsDashboard from "./components/ResultsDashboard.jsx";
import HistoryDashboard from "./components/HistoryDashboard.jsx";
import Dashboard from "./components/Dashboard.jsx";
import JobSearchPage from "./components/JobSearchPage.jsx";
import QuizPage from "./components/QuizPage.jsx";
import RoadmapViewer from "./components/RoadmapViewer.jsx";
import LoginPage from "./components/LoginPage.jsx";
import ResumeUploadForm from "./components/ResumeUploadForm.jsx";
import { getHistoryItem, historyItemToResult, generateRoadmap, getStoredUser } from "./utils/api.js";
import CustomCursor from "./components/CustomCursor.jsx";

function readRoute() {
  const url = new URL(window.location.href);
  return {
    pathname: url.pathname,
    analysisId: url.searchParams.get("analysisId"),
    tab: url.searchParams.get("tab") || "overview",
    action: url.searchParams.get("action"),
    matchScore: url.searchParams.get("matchScore"),
    jobTitle: url.searchParams.get("jobTitle"),
    company: url.searchParams.get("company"),
    jobUrl: url.searchParams.get("jobUrl"),
    matchedSkills: url.searchParams.get("matchedSkills"),
    missingSkills: url.searchParams.get("missingSkills"),
    jobSkills: url.searchParams.get("jobSkills"),
    recommendation: url.searchParams.get("recommendation"),
    timestamp: url.searchParams.get("timestamp"),
    roadmap: url.searchParams.get("roadmap"),
    targetRole: url.searchParams.get("targetRole")
  };
}

function LoadingOverlay() {
  const messages = [
    "Parsing your resume...",
    "Extracting skills with NLP...",
    "Running TF-IDF vectorization...",
    "Computing cosine similarity...",
    "Building your roadmap..."
  ];
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setMsgIdx((index) => (index + 1) % messages.length), 1200);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(243, 240, 235, 0.92)", backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 24
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        border: "3px solid var(--border)",
        borderTopColor: "var(--accent)",
        animation: "spin 0.8s linear infinite"
      }} />
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--accent)"
      }}>
        {messages[msgIdx]}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: item === msgIdx % 5 ? "var(--accent)" : "var(--border)",
            transition: "background 0.3s"
          }} />
        ))}
      </div>
    </div>
  );
}

function Navbar({ onLogoClick, onNavigate, onGetStarted, user, onLogout }) {
  return (
    <nav className="navbar">
      <button onClick={onLogoClick} style={{ background: "none", border: "none", cursor: "none", padding: 0 }}>
        <span className="navbar-brand">
          Career<span style={{ color: "var(--accent)" }}>Vector</span>
        </span>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button type="button" onClick={() => onNavigate("/jobs")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer" }}>Jobs</button>
        <button type="button" onClick={() => onNavigate("/dashboard?tab=history")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer" }}>Dashboard</button>
        {user ? (
          <>
            <button type="button" onClick={() => onNavigate("/profile")} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--primary)", fontWeight: 800, fontSize: "1rem", padding: "0.55rem 0.9rem", cursor: "pointer" }}>
              {user.name || "Profile"}
            </button>
            <button type="button" onClick={onLogout} style={{ background: "none", border: "none", color: "var(--text-soft)", fontWeight: 800, fontSize: "1rem", cursor: "pointer" }}>Logout</button>
          </>
        ) : (
          <button type="button" onClick={() => onNavigate("/login")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer" }}>Login</button>
        )}
        <button type="button" onClick={onGetStarted} className="btn-brutal" style={{ padding: "0.55rem 1.2rem", fontSize: "1rem", cursor: "pointer" }}>
          {user ? "Analyze" : "Start"}
        </button>
      </div>
    </nav>
  );
}

function AuthRequired({ onLogin }) {
  return (
    <section className="section container" style={{ minHeight: "70vh", display: "grid", alignItems: "center" }}>
      <div className="brutalist-card" style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.4rem, 6vw, 4.5rem)", fontWeight: 900, lineHeight: 1, marginBottom: "1.5rem" }}>
          Student profile required.
        </div>
        <p style={{ fontSize: "1.2rem", fontWeight: 500 }}>
          CareerVector stores your resume analysis, roadmap, job matches, and peer benchmarks under a student profile. Sign in first so every feature has the right context.
        </p>
        <button type="button" className="btn-primary" onClick={onLogin} style={{ marginTop: "1rem" }}>
          Continue to Login
        </button>
      </div>
    </section>
  );
}

function ProfilePage({ user, onNavigate }) {
  return (
    <section className="section container" style={{ minHeight: "80vh" }}>
      <div style={{ marginBottom: "4rem", maxWidth: 900 }}>
        <div style={{ fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "1rem" }}>
          [ Student Profile ]
        </div>
        <h1 style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)", lineHeight: 1, fontWeight: 900 }}>
          {user?.name || "CareerVector Student"}
        </h1>
        <p style={{ fontSize: "1.2rem", marginTop: "1.5rem", fontWeight: 500 }}>
          This profile is the source of truth for resume readiness, saved analyses, job matches, and peer comparison.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Email", value: user?.email || "Not set" },
          { label: "Account", value: "Active" },
          { label: "Storage", value: "Profile scoped" }
        ].map((item) => (
          <div key={item.label} className="brutalist-card" style={{ margin: 0, padding: "2rem" }}>
            <div style={{ color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "1rem" }}>{item.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 800 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "2rem" }}>
        <button type="button" className="btn-primary" onClick={() => onNavigate("/")}>Run Analysis</button>
        <button type="button" className="btn-secondary" onClick={() => onNavigate("/dashboard?tab=history")}>View Dashboard</button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer-brutal">
      <div className="footer-brand">
        Career<span style={{ color: "var(--accent)" }}>Vector</span>
      </div>
      <p style={{ marginTop: "1rem", fontSize: "1.2rem", fontWeight: 600 }}>
        ENGINEERING CLARITY.
      </p>
      <div style={{
        display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", marginTop: "2rem"
      }}>
        {["React.js", "Node.js", "Python", "TF-IDF", "GSAP"].map((tech) => (
          <span key={tech} style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            border: "4px solid var(--surface)", padding: "0.5rem 1rem",
            textTransform: "uppercase"
          }}>{tech}</span>
        ))}
      </div>
    </footer>
  );
}

function ProductJourney({ onNavigate, user }) {
  const steps = [
    {
      id: "profile",
      title: "Create Profile",
      body: "One student identity owns the resume, saved analyses, role target, and dashboard history.",
      action: user ? "View Profile" : "Login",
      path: user ? "/profile" : "/login"
    },
    {
      id: "readiness",
      title: "Check Readiness",
      body: "Upload a resume or enter skills, pick one target role, and get a scored readiness report.",
      action: user ? "Run Analysis" : "Login First",
      path: user ? "/" : "/login"
    },
    {
      id: "roadmap",
      title: "Close Skill Gaps",
      body: "Matched skills, missing skills, and roadmap resources are stored as one report.",
      action: "Dashboard",
      path: user ? "/dashboard?tab=history" : "/login"
    },
    {
      id: "peers",
      title: "Compare Honestly",
      body: "Peer benchmarks appear only when other students have saved analyses for the same role.",
      action: "View Reports",
      path: user ? "/dashboard?tab=history" : "/login"
    }
  ];

  return (
    <section className="section container">
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: "4rem", alignItems: "start" }}>
        <div>
          <div style={{ fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "1rem" }}>
            [ Product Flow ]
          </div>
          <h2 style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 1, fontWeight: 900, marginBottom: "1.5rem" }}>
            Built around one student, not random tools.
          </h2>
          <p style={{ fontSize: "1.2rem", fontWeight: 500 }}>
            The web app now follows a production-style flow: authenticate first, build a profile, save every analysis, then show history and peer comparison from real profile data.
          </p>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => onNavigate(step.path)}
              style={{
                display: "grid",
                gridTemplateColumns: "64px 1fr auto",
                gap: "1rem",
                alignItems: "center",
                textAlign: "left",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                cursor: "pointer"
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: "var(--radius-sm)",
                background: index === 0 ? "var(--accent)" : "var(--bg-soft)",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: "1.2rem"
              }}>
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.45rem", fontWeight: 800, marginBottom: "0.35rem" }}>
                  {step.title}
                </div>
                <div style={{ color: "var(--text-soft)", fontSize: "1rem", fontWeight: 500 }}>
                  {step.body}
                </div>
              </div>
              <span style={{ fontWeight: 800, textTransform: "uppercase", color: "var(--accent)", whiteSpace: "nowrap" }}>
                {step.action}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState(readRoute());
  const [sessionResult, setSessionResult] = useState(null);
  const [savedResult, setSavedResult] = useState(null);
  const [savedResultLoading, setSavedResultLoading] = useState(false);
  const [savedResultError, setSavedResultError] = useState("");
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedResult() {
      if (route.pathname !== "/dashboard" || !route.analysisId) {
        setSavedResult(null);
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

      if (sessionResult?.historyId === route.analysisId) {
        setSavedResult(sessionResult);
        setSavedResultError("");
        setSavedResultLoading(false);
        return;
      }

      setSavedResultLoading(true);
      setSavedResultError("");

      try {
        const item = await getHistoryItem(route.analysisId);
        const currentUserId = user?.id || user?._id || "";
        if (item.userId && currentUserId && item.userId !== currentUserId) {
          throw new Error("This report belongs to another student profile.");
        }
        if (cancelled) return;
        setSavedResult(historyItemToResult(item));
      } catch (err) {
        if (cancelled) return;
        setSavedResult(null);
        setSavedResultError(err.message || "Failed to load saved analysis.");
      } finally {
        if (!cancelled) {
          setSavedResultLoading(false);
        }
      }
    }

    loadSavedResult();
    return () => {
      cancelled = true;
    };
  }, [route.pathname, route.analysisId, sessionResult, user?.id, user?._id]);

  // Handle job-analysis action from extension
  useEffect(() => {
    if (route.action === "job-analysis" && route.matchScore) {
      const jobAnalysisData = {
        matchScore: parseInt(route.matchScore) || 0,
        jobTitle: route.jobTitle || "",
        company: route.company || "",
        jobUrl: route.jobUrl || "",
        matchedSkills: route.matchedSkills ? JSON.parse(route.matchedSkills) : [],
        missingSkills: route.missingSkills ? JSON.parse(route.missingSkills) : [],
        jobSkills: route.jobSkills ? JSON.parse(route.jobSkills) : [],
        recommendation: route.recommendation || "",
        timestamp: route.timestamp || new Date().toISOString(),
        source: "extension-linkedin"
      };

      setSessionResult(jobAnalysisData);
      // Clear the URL parameters after processing
      window.history.replaceState({}, "", "/");
      setRoute(readRoute());
    } else if (route.action === "view-roadmap" && route.roadmap) {
      const roadmapData = JSON.parse(route.roadmap);
      const roadmapResult = {
        roadmap: roadmapData.roadmap || [],
        targetRole: roadmapData.targetRole || "",
        skillGaps: roadmapData.skillGaps || [],
        estimatedTime: roadmapData.estimatedTime || "",
        learningPath: roadmapData.learningPath || [],
        source: "extension-roadmap",
        timestamp: route.timestamp || new Date().toISOString()
      };

      setSessionResult(roadmapResult);
      // Clear the URL parameters after processing
      window.history.replaceState({}, "", "/");
      setRoute(readRoute());
    }
  }, [route.action, route.matchScore, route.roadmap]);

  const navigate = (path) => {
    if (window.location.pathname + window.location.search === path) {
      setRoute(readRoute());
      return;
    }
    window.history.pushState({}, "", path);
    setRoute(readRoute());
  };

  const scrollToAnalyze = () => {
    document.getElementById("analyze")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGetStarted = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/");
    setTimeout(scrollToAnalyze, 50);
  };

  const handleResult = (data) => {
    setSessionResult(data);

    if (data.historyId) {
      navigate(`/dashboard?analysisId=${data.historyId}`);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    setSessionResult(null);
    setSavedResult(null);
    navigate("/login");
  };

  const handleReset = () => {
    setSessionResult(null);
    setSavedResult(null);
    navigate("/");
    setTimeout(() => {
      document.getElementById("analyze")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleLogoClick = () => {
    setSessionResult(null);
    setSavedResult(null);
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenAnalysis = async (analysisId) => {
    setLoading(true);
    try {
      const item = await getHistoryItem(analysisId);
      const currentUserId = user?.id || user?._id || "";
      if (item.userId && currentUserId && item.userId !== currentUserId) {
        throw new Error("This report belongs to another student profile.");
      }
      const result = historyItemToResult(item);

      // Generate roadmap for this analysis
      const roadmapData = await generateRoadmap({
        userSkills: result.student_skills || [],
        jobSkills: result.matched_skills || [],
        targetRole: result.target_role || "",
        jobRequirements: result.missing_skills ? result.missing_skills.map(item => typeof item === 'string' ? item : item.skill) : []
      });

      // Merge roadmap data into the result
      const resultWithRoadmap = {
        ...result,
        roadmap: roadmapData.roadmap || [],
        learningPath: (roadmapData.learningPath || roadmapData.roadmap || []).map(item => ({
          ...item,
          start_week: item.start_week || item.startWeek
        })),
        skillGaps: roadmapData.skillGaps || [],
        estimatedTime: roadmapData.estimatedTime || "",
        source: "analysis-with-roadmap",
        historyId: result.historyId || analysisId
      };

      setSessionResult(resultWithRoadmap);
      setSavedResult(resultWithRoadmap);
      navigate(`/dashboard?analysisId=${analysisId}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Failed to open analysis:", error);
      // Fallback to basic navigation if roadmap generation fails
      navigate(`/dashboard?analysisId=${analysisId}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const activeResult = route.pathname === "/dashboard" && route.analysisId
    ? (sessionResult?.historyId === route.analysisId ? sessionResult : savedResult)
    : sessionResult;

  const showDashboardHome = route.pathname === "/dashboard" && !route.analysisId;
  const showHome = route.pathname === "/" && !showDashboardHome && !activeResult && !savedResultLoading;

  // Determine which page to show based on pathname
  const showWorkflowPage = route.pathname === "/workflow";
  const showJobsPage = route.pathname === "/jobs";
  const showQuizPage = route.pathname === "/quiz";
  const showRoadmapPage = route.pathname === "/roadmap";
  const showLoginPage = route.pathname === "/login";
  const showUploadPage = route.pathname === "/upload";
  const showUserDashboardPage = route.pathname === "/user-dashboard";
  const showProfilePage = route.pathname === "/profile";
  const protectedRoute = showJobsPage || showQuizPage || showRoadmapPage || showUploadPage || showUserDashboardPage || showProfilePage || showDashboardHome || Boolean(activeResult);
  const knownRoute = showHome || showWorkflowPage || showJobsPage || showQuizPage || showRoadmapPage || showLoginPage || showUploadPage || showUserDashboardPage || showProfilePage || showDashboardHome || activeResult || savedResultLoading || savedResultError;

  return (
    <div className="bauhaus-app" style={{ minHeight: "100vh" }}>
      <CustomCursor />
      <Navbar onLogoClick={handleLogoClick} onNavigate={navigate} onGetStarted={handleGetStarted} user={user} onLogout={handleLogout} />

      {loading && <LoadingOverlay />}

      {!user && protectedRoute && !showLoginPage && (
        <>
          <AuthRequired onLogin={() => navigate("/login")} />
          <Footer />
        </>
      )}

      {showHome && !protectedRoute && (
        <>
          <HeroSection onGetStarted={handleGetStarted} isLoggedIn={Boolean(user)} />
          <ProductJourney onNavigate={navigate} user={user} />
          {user ? (
            <AnalyzeForm onResult={handleResult} onLoading={setLoading} user={user} onLoginRequired={() => navigate("/login")} />
          ) : (
            <AuthRequired onLogin={() => navigate("/login")} />
          )}
          <Footer />
        </>
      )}

      {showWorkflowPage && (
        <>
          <WorkflowSection standalone />
          <Footer />
        </>
      )}

      {showLoginPage && (
        <>
          <LoginPage onLoginSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            navigate("/");
          }} />
          <Footer />
        </>
      )}

      {showProfilePage && user && (
        <>
          <ProfilePage user={user} onNavigate={navigate} />
          <Footer />
        </>
      )}

      {showUploadPage && user && (
        <>
          <ResumeUploadForm onUploadSuccess={(data) => {
            setSessionResult(data);
            navigate("/jobs");
          }} />
          <Footer />
        </>
      )}

      {route.pathname === "/user-dashboard" && user && (
        <>
          <Dashboard />
          <Footer />
        </>
      )}

      {showJobsPage && user && (
        <>
          <JobSearchPage
            userSkills={sessionResult?.student_skills || []}
            onJobSelect={(job) => {
              // Store selected job in sessionResult if needed
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
          <Footer />
        </>
      )}

      {showQuizPage && user && (
        <>
          <QuizPage
            targetRole={route.targetRole || sessionResult?.target_role || ""}
            onQuizComplete={async (results) => {
              const effectiveRole =
                results?.targetRole ||
                route.targetRole ||
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
            }}
          />
          <Footer />
        </>
      )}

      {showRoadmapPage && user && (
        <>
          <RoadmapViewer
            roadmap={sessionResult?.roadmap || sessionResult?.learningPath || []}
            targetRole={sessionResult?.target_role || route.targetRole || "Selected role"}
            userSkills={sessionResult?.student_skills || []}
          />
          <Footer />
        </>
      )}

      {showDashboardHome && user && (
        <>
          <HistoryDashboard onOpenAnalysis={handleOpenAnalysis} user={user} />
          <Footer />
        </>
      )}

      {savedResultLoading && (
        <section style={{ maxWidth: 860, margin: "0 auto", padding: "110px 24px 80px", color: "var(--text-secondary)" }}>
          Loading saved analysis...
        </section>
      )}

      {savedResultError && !savedResultLoading && (
        <section style={{ maxWidth: 860, margin: "0 auto", padding: "110px 24px 80px" }}>
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
      )}

      {!knownRoute && (
        <section style={{ maxWidth: 860, margin: "0 auto", padding: "110px 24px 80px", color: "var(--text-secondary)" }}>
          <div style={{
            background: "rgba(243,240,235,0.95)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: 30,
            color: "var(--primary)"
          }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Page not found</h2>
            <p style={{ margin: "16px 0 0", lineHeight: 1.6 }}>The page you tried to open is not available right now. Click below to return to the main flow.</p>
            <button type="button" onClick={() => navigate("/")} style={{ marginTop: 18, padding: "0.8rem 1.4rem", border: "none", borderRadius: 12, background: "var(--accent)", color: "white", cursor: "pointer" }}>
              Go to Home
            </button>
          </div>
        </section>
      )}

      {activeResult && user && !savedResultLoading && (
        <>
          <div style={{ paddingTop: 60 }}>
            <ResultsDashboard result={activeResult} onReset={handleReset} />
          </div>
          <Footer />
        </>
      )}
    </div>
  );
}
