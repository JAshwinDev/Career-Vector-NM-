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
    <div
      className="animate-fade-up flex min-h-[140px] flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5 [transition:transform_0.2s_ease,box-shadow_0.2s_ease,border-color_0.2s_ease] hover:-translate-y-[3px] hover:border-[var(--border-dark)] hover:shadow-[var(--shadow-md)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-1 grid h-[46px] w-[46px] place-items-center rounded-[13px] text-[1.35rem]" style={{ background: `${accent}1a`, color: accent }}>{icon}</div>
      <div className="font-display text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-[var(--primary)]">{display}{suffix}</div>
      <div className="font-body text-[15px] font-semibold text-[var(--primary)]">{label}</div>
      <div className="mt-auto text-[14px] font-medium text-[var(--text-muted)]">{desc}</div>
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
    <section className="relative mx-auto w-full max-w-[1600px] px-4 py-[clamp(2rem,4vw,3rem)] pt-2 sm:px-6 lg:px-8 xl:px-10">
      <div
        className="pointer-events-none absolute left-1/2 top-[-120px] z-0 h-[min(320px,40vh)] w-[min(720px,90vw)] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(255,106,61,0.10),rgba(255,106,61,0))]"
        aria-hidden="true"
      />
      <div className="relative z-[1]">
        <header className="animate-fade-up pb-[clamp(16px,3vw,24px)] pt-1" style={{ animationDelay: "0ms" }}>
          <h1 className="m-0 mb-[8px] font-display text-2xl font-bold leading-[1.1] tracking-[-0.02em] text-[var(--primary)] sm:text-3xl lg:text-4xl xl:text-5xl">
            Dashboard Overview
          </h1>
          <p className="m-0 max-w-[620px] text-sm font-medium leading-[1.55] text-[#6B7280] md:text-base">
            Track your career progress, resume analyses, job matches, and skill insights in one place.
          </p>
        </header>

        {loading && (
          <div className="p-[2.5rem_0] text-base font-medium text-[var(--text-soft)]">Loading dashboard data...</div>
        )}

        {error && (
          <div className="mb-8 rounded-[18px] border border-[rgba(214,69,80,0.35)] bg-[rgba(214,69,80,0.1)] p-[1rem_1.25rem] text-base font-semibold text-[var(--red)]">
            {error}
          </div>
        )}

        {!loading && stats && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon="📊" value={stats.total} label="Total Records" desc="Jobs analysed" accent="#FF6A3D" delay={60} />
            <StatCard icon="🎯" value={stats.avgScore} suffix="%" label="Average Match" desc="Across all analysed jobs" accent="#2E8B7A" delay={120} />
            <StatCard icon="📄" value={stats.resumeAnalysisCount} label="Resume Analyses" desc="Completed analyses" accent="#FF6A3D" delay={180} />
            <StatCard icon="💼" value={stats.jobMatchCount} label="Job Matches" desc="Recommended opportunities" accent="#C58B2D" delay={240} />
          </div>
        )}

        {!loading && stats && (
          <div className="mb-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
            <section className="animate-fade-up rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5 lg:p-6" style={{ animationDelay: "260ms" }}>
              <h2 className="m-0 mb-4 font-display text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-[var(--primary)]">
                Recommendation Mix
              </h2>
              <div className="flex flex-col gap-[14px]">
                {recoItems.map((item) => {
                  const percent = recoTotal ? Math.round((item.value / recoTotal) * 100) : 0;
                  return (
                    <div
                      key={item.label}
                      className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[16px_18px] [transition:transform_0.2s_ease,box-shadow_0.2s_ease,border-color_0.2s_ease] hover:-translate-y-[2px] hover:border-[var(--border-dark)] hover:shadow-[var(--shadow-md)]"
                    >
                      <div className="mb-3 flex items-center gap-[10px]">
                        <span className="h-[10px] w-[10px] shrink-0 rounded-full" style={{ background: item.color }} />
                        <span className="flex-1 font-body text-[15px] font-semibold text-[var(--primary)]">{item.label}</span>
                        <span className="font-display text-[18px] font-bold tabular-nums text-[var(--primary)]">
                          {item.value} <span className="font-body text-[13px] font-medium text-[var(--text-muted)]">jobs</span>
                        </span>
                      </div>
                      <div className="mb-2 h-2 overflow-hidden rounded-full bg-[var(--bg-soft)]">
                        <AnimatedBar percent={percent} className="h-full rounded-full [transition:width_0.9s_cubic-bezier(0.2,0.7,0.3,1)]" style={{ background: item.color }} />
                      </div>
                      <div className="font-mono text-[0.78rem] font-semibold text-[var(--text-muted)]">{percent}% of mix</div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="animate-fade-up rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5 lg:p-6" style={{ animationDelay: "360ms" }}>
              <h2 className="m-0 mb-4 font-display text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-[var(--primary)]">
                Most Frequent Skill Gaps
              </h2>
              <div className="flex flex-col gap-[14px]">
                {gaps.length ? gaps.map((item) => {
                  const count = Number(item.count) || 0;
                  const percent = maxGapCount ? Math.round((count / maxGapCount) * 100) : 0;
                  return (
                    <div key={skillName(item) || String(item)} className="flex flex-col gap-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-body text-[15px] font-semibold text-[var(--primary)]">
                          {skillName(item)}
                        </span>
                        <span className="shrink-0 text-right font-mono text-[0.9rem] font-bold tabular-nums text-[var(--text-soft)]">
                          {count}
                        </span>
                      </div>
                      <div className="h-[10px] w-full overflow-hidden rounded-full bg-[var(--bg-soft)]">
                        <AnimatedBar
                          percent={percent}
                          className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-bright))] [transition:width_0.9s_cubic-bezier(0.2,0.7,0.3,1)]"
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-[1.5rem_0] text-[0.9375rem] font-medium text-[var(--text-soft)]">No gap data stored yet.</div>
                )}
              </div>
            </section>
          </div>
        )}

        {!loading && (
          <section className="animate-fade-up rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5 lg:p-6" style={{ animationDelay: "440ms" }}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="m-0 mb-4 font-display text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-[var(--primary)]" style={{ margin: 0 }}>
                Recent Activity
              </h2>
              <span className="font-semibold text-[0.8125rem] uppercase tracking-[0.05em] text-[var(--text-soft)]">
                Latest {history.length} records
              </span>
            </div>

            <div className="flex flex-col overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
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
                    className="grid cursor-pointer items-center gap-5 border-b border-[var(--border)] p-[14px_16px] [grid-template-columns:1fr_auto_auto_auto] [transition:background_0.2s_ease] last:border-none hover:bg-[var(--bg-soft)] max-[640px]:gap-[10px] max-[640px]:[grid-template-columns:1fr_auto]"
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
                    <div className="min-w-0">
                      <div className="mb-[2px] overflow-hidden text-ellipsis whitespace-nowrap font-display text-[16px] font-semibold text-[var(--primary)]">
                        {title}
                      </div>
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-medium text-[var(--text-muted)]">
                        {company}
                      </div>
                    </div>
                    <span className="whitespace-nowrap rounded-full p-[4px_12px] text-xs font-bold tracking-[0.02em] max-[640px]:col-start-1 max-[640px]:justify-self-start" style={status}>
                      {statusLabel} Match
                    </span>
                    <span className="whitespace-nowrap text-[13px] font-medium text-[var(--text-muted)] max-[640px]:col-start-2 max-[640px]:justify-self-end">
                      {formatDateTime(item.createdAt)}
                    </span>
                    <span
                      className="min-w-[48px] text-right font-display text-[18px] font-bold tabular-nums max-[640px]:col-start-2 max-[640px]:justify-self-end"
                      style={{ color: status.color }}
                    >
                      {score}%
                    </span>
                  </div>
                );
              }) : (
                <div className="p-[1.5rem_0] text-[0.9375rem] font-medium text-[var(--text-soft)]">
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
