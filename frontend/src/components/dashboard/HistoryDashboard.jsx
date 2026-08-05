"use client";

import React, { useEffect, useState } from "react";
import { getHistory, getHistoryStats } from "../../utils/api.js";

function skillName(item) {
  if (item && typeof item === "object") return item.skill || "";
  return item == null ? "" : String(item);
}

function useCountUp(target, duration = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === null || target === undefined) return;
    let raf;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function ScoreRing({ value, size = 92, stroke = 8, accent = "#E8472A" }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setProgress(Math.min(value, 100)), 120);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="cv-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(26,26,26,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * progress) / 100}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.2,0.7,0.3,1)" }}
        />
      </svg>
      <div className="cv-ring-value">{Math.round(value)}%</div>
    </div>
  );
}

function AnimatedBar({ percent, className, style }) {
  const [width, setWidth] = useState("0%");

  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(`${percent}%`));
    return () => cancelAnimationFrame(raf);
  }, [percent]);

  return <div className={className} style={{ ...style, width }} />;
}

function StatCard({ label, value, icon, accent, delay, ring }) {
  const animated = useCountUp(value, 1400);
  const display = Math.round(animated).toLocaleString();

  return (
    <div className="glass-card animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="glass-card-inner">
        <div className="stat-card-top">
          <div className="stat-icon" style={{ background: `${accent}1f`, color: accent }}>{icon}</div>
          <span className="stat-label">{label}</span>
        </div>
        <div className="stat-card-bottom">
          {ring ? (
            <ScoreRing value={animated} accent={accent} />
          ) : (
            <div className="stat-value">{display}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value) {
  try {
    const date = new Date(value);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

function scoreStyle(score) {
  if (score >= 80) return { background: "rgba(77,124,90,0.16)", color: "var(--green)" };
  if (score >= 50) return { background: "rgba(197,139,45,0.16)", color: "var(--amber)" };
  return { background: "rgba(214,69,80,0.13)", color: "var(--red)" };
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

  const gaps = stats?.topMissing || [];
  const maxGapCount = gaps.length ? Math.max(...gaps.map((g) => Number(g.count) || 0), 1) : 1;

  const recoTotal =
    (stats?.applyCount || 0) + (stats?.maybeCount || 0) + (stats?.skipCount || 0);

  const recoItems = [
    {
      label: "Apply Now",
      value: stats?.applyCount || 0,
      gradient: "linear-gradient(135deg, #4D7C5A, #6FA078)",
      shadow: "0 14px 30px rgba(77, 124, 90, 0.32)",
      tagGradient: "linear-gradient(135deg, #3E6A4E, #6FA078)"
    },
    {
      label: "Maybe Apply",
      value: stats?.maybeCount || 0,
      gradient: "linear-gradient(135deg, #C58B2D, #DDA93F)",
      shadow: "0 14px 30px rgba(197, 139, 45, 0.32)",
      tagGradient: "linear-gradient(135deg, #A8741F, #DDA93F)"
    },
    {
      label: "Skip",
      value: stats?.skipCount || 0,
      gradient: "linear-gradient(135deg, #D64550, #E26B74)",
      shadow: "0 14px 30px rgba(214, 69, 80, 0.32)",
      tagGradient: "linear-gradient(135deg, #C03A45, #E26B74)"
    }
  ];

  return (
    <section className="section dashboard-container">
      <div className="dashboard-backdrop">
        <div className="blob" style={{ top: "-80px", left: "-60px", width: 380, height: 380, background: "rgba(232,71,42,0.18)" }} />
        <div className="blob" style={{ top: "200px", right: "-90px", width: 440, height: 440, background: "rgba(46,139,122,0.15)" }} />
        <div className="blob" style={{ bottom: "-140px", left: "42%", width: 400, height: 400, background: "rgba(197,139,45,0.14)" }} />
      </div>

      <div className="dashboard-content">
        <div className="animate-fade-up" style={{ animationDelay: "0ms", marginBottom: "var(--space-6)", maxWidth: "820px" }}>
          <div style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.8125rem",
            color: "var(--accent)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "0.75rem",
            fontWeight: 600
          }}>
            [ Dashboard Overview ]
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.9rem, 3.5vw, 3rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            marginBottom: "0.75rem",
            fontWeight: 800
          }}>
            Activity &amp; Analytics.
          </h1>
          <p style={{ color: "var(--text-soft)", fontSize: "1rem", lineHeight: 1.6, fontWeight: 500 }}>
            Your saved resume analyses, job matches, and courses progress for this student profile.
          </p>
        </div>

        {loading && (
          <div style={{ padding: "2rem 0", color: "var(--text-soft)", fontSize: "1rem" }}>
            Loading dashboard data...
          </div>
        )}

        {error && (
          <div style={{
            background: "rgba(214,69,80,0.1)",
            border: "1px solid rgba(214,69,80,0.35)",
            borderRadius: 18,
            padding: "1rem 1.25rem",
            color: "var(--red)",
            marginBottom: "2rem",
            fontSize: "1rem",
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        {!loading && stats && (
          <div className="stats-grid">
            <StatCard label="Total Records" value={stats.total} accent="#E8472A" icon="📊" delay={80} />
            <StatCard label="Average Score" value={stats.avgScore} accent="#2E8B7A" icon="🎯" delay={160} ring />
            <StatCard label="Resume Analyses" value={stats.resumeAnalysisCount} accent="#E8472A" icon="📄" delay={240} />
            <StatCard label="Job Matches" value={stats.jobMatchCount} accent="#C58B2D" icon="💼" delay={320} />
          </div>
        )}

        {!loading && stats && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "var(--space-6)",
            marginBottom: "var(--space-7)"
          }}>
            <div className="animate-fade-up" style={{ animationDelay: "260ms" }}>
              <h2 className="section-title" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", marginBottom: "1rem" }}>
                Recommendation Mix
              </h2>
              <div className="reco-grid">
                {recoItems.map((item) => {
                  const percent = recoTotal ? Math.round((item.value / recoTotal) * 100) : 0;
                  return (
                    <div
                      key={item.label}
                      className="reco-pill"
                      style={{ background: item.gradient, boxShadow: item.shadow }}
                    >
                      <div className="reco-pill-inner">
                        <span className="reco-tag" style={{ background: item.tagGradient }}>{item.label}</span>
                        <div className="reco-count">{item.value}</div>
                        <div>
                          <div className="reco-bar">
                            <AnimatedBar percent={percent} className="reco-bar-fill" style={{ background: item.gradient }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                            <span className="reco-percent">{percent}% of mix</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="animate-fade-up" style={{ animationDelay: "360ms" }}>
              <h2 className="section-title" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", marginBottom: "1rem" }}>
                Most Frequent Gaps
              </h2>
              <div className="gaps-list">
                {gaps.length ? gaps.map((item) => {
                  const count = Number(item.count) || 0;
                  const weight = count / maxGapCount;
                  const alpha = 0.16 + 0.76 * weight;
                  const dark = weight > 0.45;
                  const isTop = count === maxGapCount;
                  return (
                    <div key={skillName(item) || String(item)} className="gap-item">
                      <span
                        className={`gap-bubble${isTop ? " pulse" : ""}`}
                        style={{
                          background: `linear-gradient(135deg, rgba(232,71,42,${alpha}), rgba(232,71,42,${Math.min(alpha + 0.1, 0.96)}))`,
                          color: dark ? "#fff" : "var(--primary)"
                        }}
                      >
                        {skillName(item)}
                        <span className="gap-bubble-count">{count}</span>
                      </span>
                      <div className="gap-bar">
                        <AnimatedBar percent={weight * 100} className="gap-bar-fill" />
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ color: "var(--text-soft)", fontSize: "0.9375rem" }}>No gap data stored yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <div className="animate-fade-up" style={{ animationDelay: "440ms" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: "var(--space-4)",
              paddingBottom: "0.5rem"
            }}>
              <h2 className="section-title" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", margin: 0 }}>
                Activity Log
              </h2>
              <span style={{ color: "var(--text-soft)", fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                Latest 20 Records
              </span>
            </div>

            <div className="cv-timeline">
              {history.length ? history.map((item) => {
                const isAnalysis = item.entryType === "resume-analysis";
                const title = isAnalysis
                  ? item.targetRole || "Resume analysis"
                  : item.jobTitle || "LinkedIn job match";
                const subtitle = isAnalysis
                  ? item.resumeFileName || "Career roadmap generated"
                  : [item.company, item.jobUrl].filter(Boolean).join(" • ");
                const score = Number(item.compatibilityScore ?? item.score ?? 0);
                const dotColor = isAnalysis ? "#E8472A" : "#2E8B7A";
                const matched = Array.isArray(item.matched) ? item.matched.slice(0, 4) : [];
                const missing = Array.isArray(item.missing) ? item.missing.slice(0, 4) : [];

                return (
                  <div key={item._id} className="cv-timeline-item">
                    <div className="cv-timeline-marker">
                      <span className="cv-timeline-dot" style={{ "--dot-color": dotColor }} />
                      <span className="cv-timeline-line" />
                    </div>
                    <div className="cv-timeline-body">
                      <div className="cv-timeline-card" onClick={() => onOpenAnalysis(item._id)}>
                        <div className="cv-timeline-meta">
                          <span
                            className="type-badge"
                            style={{
                              background: isAnalysis ? "rgba(232,71,42,0.12)" : "rgba(46,139,122,0.12)",
                              color: dotColor
                            }}
                          >
                            {isAnalysis ? "Analysis" : "Job Match"}
                          </span>
                          <span style={{ color: "var(--text-soft)", fontSize: "0.78rem", fontWeight: 500 }}>
                            {formatDateTime(item.createdAt)}
                          </span>
                          <span className="score-badge" style={scoreStyle(score)}>
                            {score}%
                          </span>
                        </div>
                        <div className="cv-timeline-title">{title}</div>
                        <div className="cv-timeline-sub">{subtitle || item.summary || "Saved from CareerVector"}</div>
                        {(matched.length > 0 || missing.length > 0) && (
                          <div className="cv-timeline-chips">
                            {matched.map((skill) => (
                              <span key={`m-${skillName(skill) || String(skill)}`} className="skill-chip matched">{skillName(skill)}</span>
                            ))}
                            {missing.map((skill) => (
                              <span key={`x-${skillName(skill) || String(skill)}`} className="skill-chip missing">{skillName(skill)}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ marginTop: "12px" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAnalysis(item._id);
                            }}
                            className="btn-primary"
                            style={{
                              padding: "0.45rem 0.9rem",
                              fontSize: "0.78rem",
                              textTransform: "uppercase"
                            }}
                          >
                            Open Report
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ color: "var(--text-soft)", padding: "1.5rem 0", fontSize: "0.9375rem", fontWeight: 500 }}>
                  No saved records yet. Run your first resume analysis to build this dashboard.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
