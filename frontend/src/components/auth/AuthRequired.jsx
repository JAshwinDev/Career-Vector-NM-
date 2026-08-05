"use client";

import { useApp } from "../layout/SidebarProvider.jsx";

export default function AuthRequired() {
  const { navigate } = useApp();

  const goLogin = () => {
    const current = window.location.pathname + window.location.search;
    navigate(`/login?redirect=${encodeURIComponent(current)}`);
  };

  return (
    <section className="section container" style={{ minHeight: "70vh", display: "grid", alignItems: "center" }}>
      <div className="brutalist-card" style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-heading)", fontWeight: 700, lineHeight: 1.2, marginBottom: "1rem" }}>
          Student profile required.
        </div>
        <p style={{ fontWeight: 500, marginBottom: "1.25rem" }}>
          CareerVector stores your resume analysis, roadmap, job matches, and peer benchmarks under a student profile. Sign in first so every feature has the right context.
        </p>
        <button type="button" className="btn-primary" onClick={goLogin}>
          Continue to Login
        </button>
      </div>
    </section>
  );
}