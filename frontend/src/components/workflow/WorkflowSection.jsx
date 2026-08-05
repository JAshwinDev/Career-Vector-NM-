"use client";

import React, { useEffect, useState } from "react";
import { getWorkflowOverview } from "../../utils/api.js";

function StatusPill({ label, value, tone }) {
  const colorMap = {
    good: "var(--green)",
    warn: "var(--amber)",
    neutral: "var(--accent-bright)"
  };

  const color = colorMap[tone] || colorMap.neutral;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        border: `4px solid ${color}`,
        background: "var(--bg)",
        color: "var(--primary)",
        fontSize: 14,
        fontWeight: 500,
        textTransform: "uppercase"
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color
        }}
      />
      {label}: {value}
    </div>
  );
}

function WorkflowStep({ step, accent = "var(--accent)", onNavigate }) {
  const content = (
    <div
      style={{
        padding: "1rem",
        background: "var(--surface)",
        border: step.ready ? `4px solid ${accent}` : "4px solid var(--primary)",
        color: "var(--primary)",
        minHeight: 72,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: step.path ? "pointer" : "default"
      }}
      className="brutalist-card"
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "1px",
          color: step.ready ? accent : "var(--text-muted)",
          textTransform: "uppercase"
        }}
      >
        {step.ready ? "Ready" : "Pending"}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1.35
        }}
      >
        {step.label}
      </div>
    </div>
  );

  if (!step.path) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate?.(step.path)}
      style={{ background: "none", border: "none", padding: 0, textAlign: "left", width: "100%" }}
    >
      {content}
    </button>
  );
}

function WorkflowLane({ title, accent, steps, subtitle, onNavigate }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
        padding: "1.25rem",
        marginBottom: "1.25rem"
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: accent,
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginBottom: 6
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
            {subtitle}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10
        }}
      >
        {steps.map((step) => (
          <WorkflowStep key={step.id} step={step} accent={accent} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

export default function WorkflowSection({ standalone = false, onNavigate }) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getWorkflowOverview()
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Could not load workflow status.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const services = overview?.services || {};
  const counts = overview?.counts || {};
  const workflow = overview?.workflow || {};

  return (
    <section
      id="workflow"
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: standalone ? "48px 24px" : "32px 24px"
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--teal)",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginBottom: 8
          }}
        >
          [ End-to-End Workflow ]
        </div>
        <h2 className="section-title">
          Career Intelligence System Flow
        </h2>
        <p style={{ color: "var(--text-soft)", fontSize: "1rem", maxWidth: 760, margin: "0 auto", fontWeight: 500 }}>
          The website, Chrome extension, backend APIs, ML service, and MongoDB are now organized as one guided workflow:
          login, upload, match, search, quiz, roadmap, and dashboard.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "center",
          marginBottom: 24
        }}
      >
        <StatusPill label="Backend" value={services.backend || "checking"} tone={services.backend === "up" ? "good" : "warn"} />
        <StatusPill label="MongoDB" value={services.mongo || "checking"} tone={services.mongo === "connected" ? "good" : "warn"} />
        <StatusPill label="ML Service" value={services.ml || "checking"} tone={services.ml === "up" ? "good" : "warn"} />
        <StatusPill label="Users" value={String(counts.users ?? 0)} tone="neutral" />
        <StatusPill label="Jobs" value={String(counts.jobs ?? 0)} tone="neutral" />
        <StatusPill label="Interactions" value={String(counts.interactions ?? 0)} tone="neutral" />
      </div>

      {error && (
        <div
          style={{
            background: "rgba(255,77,109,0.1)",
            border: "1px solid rgba(255,77,109,0.35)",
            color: "var(--red)",
            borderRadius: 16,
            padding: 16,
            marginBottom: 24
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18,
          marginBottom: 18
        }}
      >
        <WorkflowLane
          title="User Interfaces"
          accent="var(--accent-bright)"
          subtitle="Website-first flow from authentication to resume upload and dashboard visibility."
          steps={workflow.website || []}
          onNavigate={onNavigate}
        />
        <WorkflowLane
          title="Chrome Extension"
          accent="var(--teal)"
          subtitle="LinkedIn job extraction, popup insights, and roadmap handoff from the browser."
          steps={workflow.extension || []}
          onNavigate={onNavigate}
        />
        <WorkflowLane
          title="Database Layer"
          accent="var(--amber)"
          subtitle={`MongoDB is tracking ${counts.resumeProfiles ?? 0} resume profiles, ${counts.analyses ?? 0} analyses, ${counts.completedQuizzes ?? 0} completed quizzes, and your workflow interactions.`}
          steps={[
            { id: "users", label: "Users Collection", ready: true, path: "/user-dashboard" },
            { id: "jobs-db", label: "Jobs Collection", ready: true, path: "/jobs" },
            { id: "interactions-db", label: "Interactions Collection", ready: true, path: "/dashboard" }
          ]}
          onNavigate={onNavigate}
        />
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
          padding: "1.25rem",
          marginBottom: "1.25rem"
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--accent-bright)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: 8
            }}
          >
            Backend API Layer
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 900 }}>
            Resume parsing, skill extraction, matching, job ingestion, and skill-gap analysis sit behind one API layer and
            feed the website and extension with consistent data.
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12
          }}
        >
          {[
            { id: "resume-parse", label: "Resume Parsing", ready: true, path: "/upload" },
            { id: "skill-extract", label: "Skill Extraction", ready: true, path: "/upload" },
            { id: "match-job", label: "Match User Skills With Job", ready: true, path: "/jobs" },
            { id: "score", label: "Calculate Match Score", ready: true, path: "/dashboard" },
            { id: "gaps", label: "Identify Missing Skills", ready: true, path: "/roadmap" },
            { id: "ingest", label: "Job Ingestion", ready: true, path: "/jobs" },
            { id: "gap-analysis", label: "Analyze Skill Gap", ready: true, path: "/roadmap" }
          ].map((step) => (
            <WorkflowStep key={step.id} step={step} accent="var(--accent-bright)" onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
        <WorkflowLane
          title="Job Search Flow"
          accent="var(--accent)"
          subtitle="User selects role or domain, filters results, and matches jobs against the saved profile."
          steps={workflow.jobSearch || []}
          onNavigate={onNavigate}
        />
        <WorkflowLane
          title="Roadmap Flow"
          accent="var(--teal)"
          subtitle={`The roadmap engine builds next-step learning plans from your saved skill gaps. Current average match score: ${counts.avgMatchScore ?? 0}%.`}
          steps={workflow.roadmap || []}
          onNavigate={onNavigate}
        />
        <WorkflowLane
          title="Quiz Flow"
          accent="var(--amber)"
          subtitle="Readiness checks generate MCQs, evaluate the score, and push improvement suggestions into the roadmap workflow."
          steps={workflow.quiz || []}
          onNavigate={onNavigate}
        />
      </div>
    </section>
  );
}
