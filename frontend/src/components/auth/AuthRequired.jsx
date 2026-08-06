"use client";

import { useApp } from "../layout/SidebarProvider.jsx";

export default function AuthRequired() {
  const { navigate } = useApp();

  const goLogin = () => {
    const current = window.location.pathname + window.location.search;
    navigate(`/login?redirect=${encodeURIComponent(current)}`);
  };

  return (
    <section className="relative mx-auto max-w-[var(--container-max)] px-[clamp(1.25rem,4vw,3rem)] py-[var(--section-y)]" style={{ minHeight: "70vh", display: "grid", alignItems: "center" }}>
      <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-subtle)] transition-all duration-[0.25s] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-hover)] sm:p-6" style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-heading)", fontWeight: 700, lineHeight: 1.2, marginBottom: "1rem" }}>
          Student profile required.
        </div>
        <p style={{ fontWeight: 500, marginBottom: "1.25rem" }}>
          CareerVector stores your resume analysis, roadmap, job matches, and peer benchmarks under a student profile. Sign in first so every feature has the right context.
        </p>
        <button type="button" className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] border border-transparent bg-[var(--primary)] p-[10px_18px] font-body text-[0.9375rem] font-semibold leading-none text-[var(--surface)] no-underline transition-all duration-[0.25s] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-px hover:bg-[var(--primary-soft)] hover:shadow-[var(--shadow-md)]" onClick={goLogin}>
          Continue to Login
        </button>
      </div>
    </section>
  );
}