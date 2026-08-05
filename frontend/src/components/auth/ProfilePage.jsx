"use client";

export default function ProfilePage({ user, onNavigate }) {
  return (
    <section className="section container" style={{ minHeight: "80vh" }}>
      <div style={{ marginBottom: "2rem", maxWidth: 900 }}>
        <div style={{ fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "0.75rem", fontSize: "var(--text-caption)" }}>
          [ Student Profile ]
        </div>
        <h1 style={{ fontSize: "var(--text-heading)", lineHeight: 1.1, fontWeight: 700 }}>
          {user?.name || "CareerVector Student"}
        </h1>
        <p style={{ marginTop: "0.75rem", fontWeight: 500 }}>
          This profile is the source of truth for resume readiness, saved analyses, job matches, and peer comparison.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
        {[
          { label: "Email", value: user?.email || "Not set" },
          { label: "Account", value: "Active" },
          { label: "Storage", value: "Profile scoped" }
        ].map((item) => (
          <div key={item.label} className="brutalist-card" style={{ margin: 0, padding: "1.25rem" }}>
            <div style={{ color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "0.5rem", fontSize: "var(--text-caption)" }}>{item.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-subheading)", fontWeight: 700 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "var(--space-6)" }}>
        <button type="button" className="btn-primary" onClick={() => onNavigate("/")}>Run Analysis</button>
        <button type="button" className="btn-secondary" onClick={() => onNavigate("/dashboard?tab=history")}>View Dashboard</button>
      </div>
    </section>
  );
}