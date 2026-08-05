"use client";

import { useState } from "react";
import { useApp } from "../../components/layout/SidebarProvider.jsx";
import AuthRequired from "../../components/auth/AuthRequired.jsx";

export default function SettingsPage() {
  const { user, navigate } = useApp();
  const [saved, setSaved] = useState(false);

  if (!user) {
    return <AuthRequired />;
  }

  const preferences = [
    { label: "Email notifications", desc: "Receive job match alerts and roadmap reminders", value: "On" },
    { label: "Weekly report", desc: "Summary of new matches, skill gaps, and progress", value: "On" },
    { label: "Peer comparison", desc: "Include your anonymized results in benchmarks", value: "On" },
    { label: "Profile visibility", desc: "Let recruiters discover your public skill profile", value: "Off" }
  ];

  return (
    <section className="section container" style={{ minHeight: "80vh" }}>
      <div style={{ marginBottom: "2rem", maxWidth: 900 }}>
        <div style={{ fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "0.75rem", fontSize: "var(--text-caption)" }}>
          [ Settings ]
        </div>
        <h1 style={{ fontSize: "var(--text-heading)", lineHeight: 1.1, fontWeight: 700 }}>Preferences</h1>
        <p style={{ marginTop: "0.75rem", fontWeight: 500 }}>
          Tune how CareerVector communicates with you and uses your profile.
        </p>
      </div>

      <div className="grid-cards">
        {preferences.map((pref) => (
          <div key={pref.label} className="brutalist-card" style={{ margin: 0, padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-subheading)", fontWeight: 700, marginBottom: "0.35rem" }}>
                  {pref.label}
                </div>
                <div style={{ color: "var(--text-soft)", fontSize: "0.875rem", fontWeight: 500 }}>{pref.desc}</div>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "999px",
                  background: pref.value === "On" ? "rgba(232, 71, 42, 0.12)" : "var(--bg-soft)",
                  color: pref.value === "On" ? "var(--accent)" : "var(--text-muted)"
                }}
              >
                {pref.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "var(--space-6)" }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
        >
          {saved ? "Saved ✓" : "Save Preferences"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => navigate("/profile")}>
          Back to Profile
        </button>
      </div>
    </section>
  );
}