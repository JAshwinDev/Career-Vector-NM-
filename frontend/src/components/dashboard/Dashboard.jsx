import React, { useState, useEffect } from "react";
import { getUserProfile, getHistory } from "../../utils/api.js";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        
        if (!token) {
          setError("Please log in to view your dashboard");
          setLoading(false);
          return;
        }

        // Parse token to get userId
        try {
          const decoded = JSON.parse(atob(token));
          const userId = decoded.userId || decoded.id;

          // Load user profile
          const userProfile = await getUserProfile(userId);
          setUser(userProfile);

          // Load analysis history
          const history = await getHistory({ limit: 50 });
          setAnalyses(history || []);
        } catch (decodeErr) {
          setError("Invalid authentication token");
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const filteredAnalyses = analyses.filter(analysis => {
    const score = Number(analysis.compatibilityScore ?? analysis.score ?? analysis.match_score ?? 0);
    if (filterType === "all") return true;
    if (filterType === "high") return score >= 65;
    if (filterType === "medium") return score >= 35 && score < 65;
    if (filterType === "low") return score < 35;
    return true;
  });

  const stats = {
    totalAnalyses: analyses.length,
    avgScore: analyses.length > 0
      ? Math.round(analyses.reduce((sum, a) => sum + Number(a.compatibilityScore ?? a.score ?? a.match_score ?? 0), 0) / analyses.length)
      : 0,
    highMatches: analyses.filter(a => Number(a.compatibilityScore ?? a.score ?? a.match_score ?? 0) >= 65).length,
    skillsIdentified: new Set(analyses.flatMap(a => a.matched || a.matched_skills || [])).size
  };

  const getMatchBadgeColor = (score) => {
    if (score >= 65) return "var(--green)";
    if (score >= 35) return "var(--orange)";
    return "var(--red)";
  };

  const getMatchBadgeBackground = (score) => {
    if (score >= 65) return "rgba(34, 197, 94, 0.1)";
    if (score >= 35) return "rgba(245, 158, 11, 0.1)";
    return "rgba(255, 77, 109, 0.1)";
  };

  if (loading) {
    return (
      <section style={{ padding: "120px 24px 80px", textAlign: "center" }}>
        <div style={{ color: "var(--text-secondary)" }}>Loading your dashboard...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section style={{ padding: "120px 24px 80px", maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            background: "rgba(255,77,109,0.1)",
            border: "1px solid rgba(255,77,109,0.35)",
            borderRadius: 16,
            padding: 24,
            color: "var(--red)"
          }}
        >
          {error}
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "80px 24px",
        color: "var(--text-primary)"
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 700,
            marginBottom: 8,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}
        >
          Welcome, {user?.name || "User"}!
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
          Track your job search progress and analysis history
        </p>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 40
        }}
      >
        {[
          { label: "Total Analyses", value: stats.totalAnalyses, color: "#6366f1" },
          { label: "Average Match Score", value: `${stats.avgScore}%`, color: "#8b5cf6" },
          { label: "High Matches", value: stats.highMatches, color: "#22c55e" },
          { label: "Skills Identified", value: stats.skillsIdentified, color: "#f59e0b" }
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              padding: 20,
              background: `rgba(99, 102, 241, 0.05)`,
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: 12,
              textAlign: "center"
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: stat.color,
                marginBottom: 8
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Analyses List */}
      <div>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
            Analysis History
          </h2>

          {/* Filter Buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["all", "high", "medium", "low"].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  padding: "8px 16px",
                  background: filterType === type ? "rgba(99, 102, 241, 0.3)" : "transparent",
                  border: "1px solid rgba(99, 102, 241, 0.5)",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  color: filterType === type ? "var(--text-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textTransform: "capitalize"
                }}
              >
                {type === "all" && "All"}
                {type === "high" && "Good Matches (65%+)"}
                {type === "medium" && "Fair Matches (35-65%)"}
                {type === "low" && "Low Matches (<35%)"}
              </button>
            ))}
          </div>
        </div>

        {filteredAnalyses.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              background: "rgba(99, 102, 241, 0.05)",
              borderRadius: 12,
              border: "1px dashed rgba(99, 102, 241, 0.3)",
              color: "var(--text-secondary)"
            }}
          >
            {analyses.length === 0
              ? "No analyses yet. Upload a resume to get started!"
              : "No analyses match the selected filter."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredAnalyses.map((analysis, idx) => {
              const score = Number(analysis.compatibilityScore ?? analysis.score ?? analysis.match_score ?? 0);
              const matchDate = new Date(analysis.timestamp || analysis.createdAt || analysis.created_at).toLocaleDateString();

              return (
                <div
                  key={idx}
                  style={{
                    padding: 20,
                    background: "rgba(99, 102, 241, 0.05)",
                    border: "1px solid rgba(99, 102, 241, 0.2)",
                    borderRadius: 12,
                    transition: "all 0.2s ease",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
                    e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.2)";
                    e.currentTarget.style.background = "rgba(99, 102, 241, 0.05)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          marginBottom: 8,
                          color: "var(--text-primary)"
                        }}
                      >
                        {analysis.jobTitle || analysis.job_title || analysis.targetRole || "Job Analysis"}
                      </h3>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        <p>
                          <strong>Company:</strong> {analysis.company || "N/A"}
                        </p>
                        <p>
                          <strong>Date:</strong> {matchDate}
                        </p>
                        {(analysis.matched || analysis.matched_skills || []).length > 0 && (
                          <p>
                            <strong>Matched Skills:</strong> {(analysis.matched || analysis.matched_skills || []).slice(0, 3).join(", ")}
                            {(analysis.matched || analysis.matched_skills || []).length > 3 && ` +${(analysis.matched || analysis.matched_skills || []).length - 3} more`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Match Score Badge */}
                    <div
                      style={{
                        padding: "12px 20px",
                        background: getMatchBadgeBackground(score),
                        border: `2px solid ${getMatchBadgeColor(score)}`,
                        borderRadius: 8,
                        textAlign: "center",
                        minWidth: 100
                      }}
                    >
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          color: getMatchBadgeColor(score)
                        }}
                      >
                        {score}%
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: getMatchBadgeColor(score),
                          marginTop: 4
                        }}
                      >
                        {score >= 65 && "Great Match"}
                        {score >= 35 && score < 65 && "Fair Match"}
                        {score < 35 && "Low Match"}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div style={{ marginTop: 16 }}>
                    <button
                      onClick={() => {
                        // Navigate to view analysis with roadmap
                        const analysisId = analysis._id || analysis.id;
                        window.history.pushState({}, "", `/dashboard?analysisId=${analysisId}`);
                        window.location.reload();
                      }}
                      style={{
                        padding: "8px 16px",
                        background: "rgba(99, 102, 241, 0.2)",
                        border: "1px solid rgba(99, 102, 241, 0.4)",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "rgba(99, 102, 241, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "rgba(99, 102, 241, 0.2)";
                      }}
                    >
                      View Details & Roadmap →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Skills Section */}
      {user?.skills && user.skills.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            Your Skills
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {user.skills.map((skill, idx) => (
              <span
                key={idx}
                style={{
                  padding: "8px 14px",
                  background: "rgba(99, 102, 241, 0.2)",
                  border: "1px solid rgba(99, 102, 241, 0.4)",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-primary)"
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
