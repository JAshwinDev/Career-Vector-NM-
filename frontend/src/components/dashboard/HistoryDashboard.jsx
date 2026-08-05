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

function AnimatedBar({ percent, className, style }) {
  const [width, setWidth] = useState("0%");

  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(`${percent}%`));
    return () => cancelAnimationFrame(raf);
  }, [percent]);

  return <div className={className} style={{ ...style, width }} />;
}

function StatCard({ icon, value, suffix = "", label, desc, accent, delay }) {
  const animated = useCountUp(value, 1400);
  const display = Math.round(animated).toLocaleString();

  return (
    <div className="dash-stat animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="dash-stat-icon" style={{ background: `${accent}1a`, color: accent }}>{icon}</div>
      <div className="dash-stat-value">{display}{suffix}</div>
      <div className="dash-stat-label">{label}</div>
      <div className="dash-stat-desc">{desc}</div>
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

  // Derive most-frequent skill gaps from the already-fetched history so skill
  // names are always clean strings (backend topMissing can mangle objects).
  const gapFreq = {};
  (history || []).forEach((item) => {
    const sources = [
      ...(Array.isArray(item.missing) ? item.missing : []),
      ...(Array.isArray(item.missingDetails) ? item.missingDetails : [])
    ];
    sources.forEach((skill) => {
      const name = skillName(skill);
      if (name) gapFreq[name] = (gapFreq[name] || 0) + 1;
    });
  });

  const gaps = Object.entries(gapFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, count]) => ({ skill, count }));
  const maxGapCount = gaps.length ? Math.max(...gaps.map((g) => Number(g.count) || 0), 1) : 1;

  const recoTotal =
    (stats?.applyCount || 0) + (stats?.maybeCount || 0) + (stats?.skipCount || 0);

  const recoItems = [
    { label: "Apply Now", value: stats?.applyCount || 0, color: "var(--green)" },
    { label: "Maybe Apply", value: stats?.maybeCount || 0, color: "var(--amber)" },
    { label: "Skip", value: stats?.skipCount || 0, color: "var(--red)" }
  ];

  return (
    <section className="section dash-page">
      <div className="dash-glow" aria-hidden="true" />
      <div className="dash-content">
        <header className="dash-header animate-fade-up" style={{ animationDelay: "0ms" }}>
          <h1 className="dash-title">Dashboard Overview</h1>
          <p className="dash-subtitle">
            Track your career progress, resume analyses, job matches, and skill insights in one place.
          </p>
        </header>

        {loading && (
          <div className="dash-loading">Loading dashboard data...</div>
        )}

        {error && (
          <div className="dash-error">{error}</div>
        )}

        {!loading && stats && (
          <div className="dash-stats">
            <StatCard icon="📊" value={stats.total} label="Total Records" desc="Jobs analysed" accent="#FF6A3D" delay={60} />
            <StatCard icon="🎯" value={stats.avgScore} suffix="%" label="Average Match" desc="Across all analysed jobs" accent="#2E8B7A" delay={120} />
            <StatCard icon="📄" value={stats.resumeAnalysisCount} label="Resume Analyses" desc="Completed analyses" accent="#FF6A3D" delay={180} />
            <StatCard icon="💼" value={stats.jobMatchCount} label="Job Matches" desc="Recommended opportunities" accent="#C58B2D" delay={240} />
          </div>
        )}

        {!loading && stats && (
          <div className="dash-split">
            <section className="dash-section animate-fade-up" style={{ animationDelay: "260ms" }}>
              <h2 className="dash-section-title">Recommendation Mix</h2>
              <div className="reco-cards">
                {recoItems.map((item) => {
                  const percent = recoTotal ? Math.round((item.value / recoTotal) * 100) : 0;
                  return (
                    <div key={item.label} className="reco-card">
                      <div className="reco-card-top">
                        <span className="reco-dot" style={{ background: item.color }} />
                        <span className="reco-label">{item.label}</span>
                        <span className="reco-value">{item.value} <span className="reco-unit">jobs</span></span>
                      </div>
                      <div className="reco-track">
                        <AnimatedBar percent={percent} className="reco-fill" style={{ background: item.color }} />
                      </div>
                      <div className="reco-percent">{percent}% of mix</div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="dash-section animate-fade-up" style={{ animationDelay: "360ms" }}>
              <h2 className="dash-section-title">Most Frequent Skill Gaps</h2>
              <div className="gaps-list">
                {gaps.length ? gaps.map((item) => {
                  const count = Number(item.count) || 0;
                  const percent = maxGapCount ? Math.round((count / maxGapCount) * 100) : 0;
                  return (
                    <div key={skillName(item) || String(item)} className="gap-row">
                      <span className="gap-name">{skillName(item)}</span>
                      <div className="gap-track">
                        <AnimatedBar percent={percent} className="gap-fill" />
                      </div>
                      <span className="gap-count">{count}</span>
                    </div>
                  );
                }) : (
                  <div className="dash-empty">No gap data stored yet.</div>
                )}
              </div>
            </section>
          </div>
        )}

        {!loading && (
          <section className="dash-section animate-fade-up" style={{ animationDelay: "440ms" }}>
            <div className="dash-section-head">
              <h2 className="dash-section-title" style={{ margin: 0 }}>Recent Activity</h2>
              <span className="dash-section-meta">Latest {history.length} records</span>
            </div>

            <div className="activity-list">
              {history.length ? history.map((item) => {
                const isAnalysis = item.entryType === "resume-analysis";
                const title = isAnalysis
                  ? item.targetRole || "Resume analysis"
                  : item.jobTitle || "LinkedIn job match";
                const company = isAnalysis
                  ? item.resumeFileName || "Resume analysis"
                  : item.company || "—";
                const score = Number(item.compatibilityScore ?? item.score ?? 0);
                const status = scoreStyle(score);
                const statusLabel = score >= 80 ? "Great" : score >= 50 ? "Fair" : "Low";

                return (
                  <div
                    key={item._id}
                    className="activity-row"
                    onClick={() => onOpenAnalysis(item._id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenAnalysis(item._id);
                      }
                    }}
                  >
                    <div className="activity-main">
                      <div className="activity-title">{title}</div>
                      <div className="activity-company">{company}</div>
                    </div>
                    <span className="activity-status" style={status}>{statusLabel} Match</span>
                    <span className="activity-date">{formatDateTime(item.createdAt)}</span>
                    <span className="activity-score" style={{ color: status.color }}>{score}%</span>
                  </div>
                );
              }) : (
                <div className="dash-empty">
                  No saved records yet. Run your first resume analysis to build this dashboard.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
