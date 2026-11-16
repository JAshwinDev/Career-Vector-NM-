"use client";

import { useEffect, useState } from "react";
import { getHistory } from "../../utils/api.js";

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

const FILTERS = [
  { label: "All records", value: "" },
  { label: "Job Matches", value: "job-match" },
  { label: "Resume Analyses", value: "resume-analysis" }
];

export default function JobHistoryPage({ onOpenAnalysis, user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    getHistory({
      limit: 100,
      entryType: filter || undefined,
      userId: user?.id || user?._id
    })
      .then((data) => {
        if (!cancelled) setHistory(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load job history.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filter, user?.id, user?._id]);

  return (
    <section className="relative mx-auto w-full max-w-[1600px] px-4 py-[clamp(2rem,4vw,3rem)] pt-2 sm:px-6 lg:px-8 xl:px-10">
      <div
        className="pointer-events-none absolute left-1/2 top-[-120px] z-0 h-[min(320px,40vh)] w-[min(720px,90vw)] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(255,106,61,0.10),rgba(255,106,61,0))]"
        aria-hidden="true"
      />
      <div className="relative z-[1]">
        <header className="animate-fade-up pb-[clamp(16px,3vw,24px)] pt-1" style={{ animationDelay: "0ms" }}>
          <h1 className="m-0 mb-[8px] font-display text-2xl font-bold leading-[1.1] tracking-[-0.02em] text-[var(--primary)] sm:text-3xl lg:text-4xl xl:text-5xl">
            Job History
          </h1>
          <p className="m-0 max-w-[620px] text-sm font-medium leading-[1.55] text-[#6B7280] md:text-base">
            Every resume analysis and job match you have saved, in one place.
          </p>
        </header>

        <div className="animate-fade-up mb-6 flex flex-wrap items-center gap-2" style={{ animationDelay: "60ms" }}>
          {FILTERS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={[
                "cursor-pointer rounded-full border px-4 py-2 font-body text-[13px] font-semibold [transition:all_0.18s_ease]",
                filter === item.value
                  ? "border-transparent bg-[var(--accent)] text-white shadow-[0_2px_8px_var(--accent-tint)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--border-dark)] hover:text-[var(--primary)]"
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto text-[13px] font-medium text-[var(--text-muted)]">
            {loading ? "Loading..." : `${history.length} record${history.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {loading && (
          <div className="p-[2.5rem_0] text-base font-medium text-[var(--text-soft)]">Loading job history...</div>
        )}

        {error && (
          <div className="mb-8 rounded-[18px] border border-[rgba(214,69,80,0.35)] bg-[rgba(214,69,80,0.1)] p-[1rem_1.25rem] text-base font-semibold text-[var(--red)]">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="animate-fade-up flex flex-col overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]" style={{ animationDelay: "120ms" }}>
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
        )}
      </div>
    </section>
  );
}
