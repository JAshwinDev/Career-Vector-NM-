import React, { useEffect, useState } from "react";
import { getHistory, getHistoryStats } from "../utils/api.js";

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      padding: "2rem",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      minWidth: 150
    }}>
      <div style={{
        fontFamily: "var(--font-body)",
        fontSize: "1rem",
        color: "var(--text-soft)",
        marginBottom: "1rem",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontWeight: 500
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-display)",
        fontSize: "4rem",
        lineHeight: 1,
        color: "var(--primary)",
        fontWeight: 700
      }}>
        {value}
      </div>
    </div>
  );
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  } catch {
    return value;
  }
}

export default function HistoryDashboard({ onOpenAnalysis, user }) {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [statsData, historyData] = await Promise.all([
          getHistoryStats({ userId: user?.id || user?._id }),
          getHistory({ limit: 20, userId: user?.id || user?._id })
        ]);

        if (cancelled) return;

        setStats(statsData);
        setHistory(historyData);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to load dashboard.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?._id]);

  return (
    <section className="section container" style={{ minHeight: "100vh" }}>
      <div style={{ marginBottom: "5rem", maxWidth: "800px" }}>
        <div style={{
          fontFamily: "var(--font-body)",
          fontSize: "1rem",
          color: "var(--primary)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "1.5rem",
          fontWeight: 600
        }}>
          [ Dashboard Overview ]
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(3rem, 6vw, 5rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.04em",
          marginBottom: "2rem",
          fontWeight: 700
        }}>
          Activity & Analytics.
        </h1>
        <p style={{ color: "var(--text-soft)", fontSize: "1.25rem", lineHeight: 1.6, fontWeight: 500 }}>
          Your saved resume analyses, job matches, and courses progress for this student profile.
        </p>
      </div>



      {loading && (
        <div style={{ padding: "4rem 0", color: "var(--text-soft)", fontSize: "1.25rem" }}>
          Loading dashboard data...
        </div>
      )}

      {error && (
        <div style={{
          background: "var(--accent)",
          padding: "2rem",
          color: "var(--primary)",
          marginBottom: "3rem",
          fontSize: "1.25rem",
          fontWeight: 600
        }}>
          {error}
        </div>
      )}

      {!loading && stats && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          borderTop: "1px solid var(--primary)",
          borderBottom: "1px solid var(--primary)",
          marginBottom: "5rem"
        }}>
          <div style={{ borderRight: "1px solid var(--primary)" }}>
            <StatCard label="Total Records" value={stats.total} />
          </div>
          <div style={{ borderRight: "1px solid var(--primary)" }}>
            <StatCard label="Average Score" value={`${stats.avgScore}%`} />
          </div>
          <div style={{ borderRight: "1px solid var(--primary)" }}>
            <StatCard label="Resume Analyses" value={stats.resumeAnalysisCount} />
          </div>
          <div>
            <StatCard label="Job Matches" value={stats.jobMatchCount} />
          </div>
        </div>
      )}

      {!loading && stats && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "4rem",
          marginBottom: "6rem"
        }}>
          <div>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "2rem",
              marginBottom: "2rem",
              fontWeight: 500,
              letterSpacing: "-0.02em"
            }}>
              Recommendation Mix
            </h2>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr 1fr", 
              border: "1px solid var(--primary)"
            }}>
              {[
                { label: "Apply Now", value: stats.applyCount },
                { label: "Maybe Apply", value: stats.maybeCount },
                { label: "Skip", value: stats.skipCount }
              ].map((item, index) => (
                <div key={item.label} style={{
                  padding: "2rem 1.5rem",
                  borderRight: index < 2 ? "1px solid var(--primary)" : "none",
                  display: "flex", flexDirection: "column", justifyContent: "space-between"
                }}>
                  <div style={{ color: "var(--text-soft)", fontSize: "0.875rem", marginBottom: "1.5rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                    {item.label}
                  </div>
                  <div style={{
                    color: "var(--primary)",
                    fontSize: "3rem",
                    lineHeight: 1,
                    fontFamily: "var(--font-display)",
                    fontWeight: 700
                  }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "2rem",
              marginBottom: "2rem",
              fontWeight: 500,
              letterSpacing: "-0.02em"
            }}>
              Most Frequent Gaps
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              {(stats.topMissing || []).length ? stats.topMissing.map((item) => (
                <span key={item.skill} style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.25rem",
                  border: "1px solid var(--primary)",
                  color: "var(--primary)",
                  fontSize: "1rem",
                  fontFamily: "var(--font-body)",
                  fontWeight: 500
                }}>
                  <span style={{ textTransform: "uppercase" }}>{item.skill}</span>
                  <strong style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{item.count}</strong>
                </span>
              )) : (
                <div style={{ color: "var(--text-soft)", fontSize: "1.125rem" }}>No gap data stored yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "3rem",
            borderBottom: "1px solid var(--primary)",
            paddingBottom: "1rem"
          }}>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.5rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0
            }}>
              Activity Log
            </h2>
            <span style={{ color: "var(--text-soft)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
              Latest 20 Records
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {history.length ? history.map((item) => {
              const isAnalysis = item.entryType === "resume-analysis";
              const title = isAnalysis
                ? item.targetRole || "Resume analysis"
                : item.jobTitle || "LinkedIn job match";
              const subtitle = isAnalysis
                ? item.resumeFileName || "Career roadmap generated"
                : [item.company, item.jobUrl].filter(Boolean).join(" • ");
              const score = Number(item.compatibilityScore ?? item.score ?? 0);

              return (
                <div key={item._id} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "2rem",
                  alignItems: "center",
                  padding: "2rem 0",
                  borderBottom: "1px solid var(--primary)",
                  transition: "background 0.3s ease",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.paddingLeft = "1rem";
                  e.currentTarget.style.paddingRight = "1rem";
                  e.currentTarget.style.background = "var(--surface)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.paddingLeft = "0";
                  e.currentTarget.style.paddingRight = "0";
                  e.currentTarget.style.background = "transparent";
                }}
                >
                  <div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      marginBottom: "1rem"
                    }}>
                      <span style={{
                        fontSize: "0.75rem",
                        padding: "0.25rem 0.75rem",
                        border: "1px solid var(--primary)",
                        color: "var(--primary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontWeight: 600
                      }}>
                        {isAnalysis ? "Analysis" : "Job Match"}
                      </span>
                      <span style={{ color: "var(--text-soft)", fontSize: "0.875rem", fontWeight: 500, letterSpacing: "0.05em" }}>
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <div style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.75rem",
                      fontWeight: 500,
                      marginBottom: "0.5rem",
                      color: "var(--primary)"
                    }}>
                      {title}
                    </div>
                    <div style={{ color: "var(--text-soft)", fontSize: "1.125rem", marginBottom: "1rem", fontWeight: 500 }}>
                      {subtitle || item.summary || "Saved from CareerVector"}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "1rem" }}>
                    <div style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "3.5rem",
                      lineHeight: 0.9,
                      fontWeight: 700,
                      color: "var(--primary)"
                    }}>
                      {score}%
                    </div>
                    <button
                      onClick={() => onOpenAnalysis(item._id)}
                      className="btn-primary"
                      style={{
                        padding: "0.5rem 1rem",
                        fontSize: "0.875rem",
                        textTransform: "uppercase"
                      }}
                    >
                      Open Report
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div style={{ color: "var(--text-soft)", padding: "2rem 0", fontSize: "1.25rem", fontWeight: 500 }}>
                No saved records yet. Run your first resume analysis to build this dashboard.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

