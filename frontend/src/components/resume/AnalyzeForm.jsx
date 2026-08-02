import React, { useState } from "react";
import {
  analyzeResume,
  buildResumeHistoryPayload,
  getMockResult,
  saveHistory
} from "../../utils/api.js";

const ROLES = [
  "Software Developer", "Data Analyst", "ML Engineer", "Frontend Developer",
  "Backend Developer", "Full Stack Developer", "DevOps Engineer", "Data Scientist",
  "Cybersecurity Analyst", "Cloud Engineer", "Android Developer", "iOS Developer",
  "Embedded Systems Engineer", "Business Analyst", "Network Engineer",
  "Game Developer", "UI/UX Designer", "Blockchain Developer", "Product Manager", "QA Engineer"
];

const ROLE_ICONS = {
  "Software Developer": "Laptop",
  "Data Analyst": "Data",
  "ML Engineer": "AI",
  "Frontend Developer": "UI",
  "Backend Developer": "API",
  "Full Stack Developer": "FS",
  "DevOps Engineer": "Ops",
  "Data Scientist": "Lab",
  "Cybersecurity Analyst": "Sec",
  "Cloud Engineer": "Cloud",
  "Android Developer": "Droid",
  "iOS Developer": "iOS",
  "Embedded Systems Engineer": "HW",
  "Business Analyst": "Biz",
  "Network Engineer": "Net",
  "Game Developer": "Game",
  "UI/UX Designer": "UX",
  "Blockchain Developer": "Chain",
  "Product Manager": "PM",
  "QA Engineer": "QA"
};

export default function AnalyzeForm({ onResult, onLoading, user, onLoginRequired }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [skills, setSkills] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [error, setError] = useState("");

  const canSubmit = Boolean(user) && selectedRole && (skills.trim() || resumeFile);

  const handleSubmit = async () => {
    if (!user) {
      onLoginRequired?.();
      return;
    }

    if (!canSubmit) {
      setError(!selectedRole ? "Please select a target role." : "Upload a resume or enter your skills.");
      return;
    }

    setError("");
    onLoading(true);

    try {
      let result;
      let historyId = "";

      try {
        console.log("[ANALYZE FORM] Starting analysis with:", {
          hasResumeFile: !!resumeFile,
          hasManualSkills: !!skills,
          role: selectedRole
        });

        result = await analyzeResume({
          resumeFile,
          skills,
          role: selectedRole
        });

        console.log("[ANALYZE FORM] Analysis successful, extracted skills:", result.student_skills);
      } catch (err) {
        console.error("[ANALYZE FORM] Analysis failed, using mock data:", err.message);
        result = getMockResult(skills || "Python, SQL, Statistics, Data Visualization, Excel", selectedRole);
        result.is_demo = true;
      }

      if (!result.is_demo) {
        try {
          const saved = await saveHistory(buildResumeHistoryPayload(result, {
            source: "platform",
            userId: user.id || user._id,
            resumeProfileId: result.resumeProfileId || result.profileId || "",
            resumeFileName: result.resumeFileName || resumeFile?.name || ""
          }));

          historyId = saved.id;
        } catch (err) {
          console.error("Failed to save analysis history:", err);
        }
      }

      onResult({
        ...result,
        historyId
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      onLoading(false);
    }
  };

  return (
    <section id="analyze" className="section container">
      <div style={{ textAlign: "center", marginBottom: "4rem" }}>
        <h2 className="section-title">Start Your Analysis</h2>
        <p>Upload your resume or enter your skills, then pick one target role. Your report is saved to your student profile.</p>
      </div>

      <div className="brutalist-card brutalist-card-accent" style={{ maxWidth: 900, margin: "0 auto", padding: "4rem" }}>
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{
              width: 40, height: 40, background: "var(--surface)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)"
            }}>1</div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "2rem" }}>Your Current Skills</span>
          </div>

          <div>
            <p style={{ marginBottom: "1rem" }}>
              Upload a PDF resume here for extraction, then add any extra skills you want included.
            </p>
            <label style={{
              display: "block",
              marginBottom: "1.5rem",
              padding: "2rem",
              background: "var(--surface)",
              border: "4px dashed var(--primary)",
              cursor: "pointer",
              transition: "background 0.3s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--surface)"}
            >
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                style={{ display: "none" }}
              />
              <div style={{ fontSize: "1.25rem", color: "var(--primary)", fontWeight: 500 }}>
                {resumeFile ? `Resume selected: ${resumeFile.name}` : "CHOOSE A PDF RESUME"}
              </div>
            </label>
            <input
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              placeholder="e.g. Python, React, AWS, SQL, Git"
              style={{
                width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                color: "var(--primary)", fontFamily: "var(--font-body)",
                fontSize: "1.25rem", padding: "1rem", outline: "none",
                marginBottom: "0.5rem"
              }}
            />
            <div style={{ fontSize: "1rem", color: "var(--text-soft)" }}>
              Add extra skills here if a tool or technology is missing from the resume.
            </div>
          </div>
        </div>

        <div style={{ height: 4, background: "var(--surface)", margin: "3rem 0" }} />

        <div style={{ marginBottom: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <div style={{
              width: 40, height: 40, background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)"
            }}>2</div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "2rem" }}>Target Role</span>
            {selectedRole && (
              <span style={{
                fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 500, color: "var(--accent)",
                border: "4px solid var(--accent)", padding: "0.25rem 1rem", textTransform: "uppercase"
              }}>{selectedRole}</span>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <input
              list="roles-datalist"
              type="text"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              placeholder="Start typing to select a role..."
              style={{
                width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                color: "var(--primary)", fontFamily: "var(--font-body)",
                fontSize: "1.25rem", padding: "1rem", outline: "none"
              }}
            />
            <datalist id="roles-datalist">
              {ROLES.map((role) => (
                <option key={role} value={role} />
              ))}
            </datalist>
          </div>
        </div>

        {error && (
          <div style={{
            background: "var(--accent)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
            padding: "1rem", marginBottom: "2rem",
            fontSize: "1.25rem", fontWeight: 600, color: "var(--primary)", textTransform: "uppercase"
          }}>
            ERROR: {error}
          </div>
        )}

        <button className={canSubmit ? "btn-brutal" : "btn-brutal-outline"} onClick={handleSubmit} style={{ width: "100%", fontSize: "1.5rem", padding: "1.5rem" }}>
          {!user ? "LOGIN TO ANALYZE" : canSubmit ? "GENERATE CAREER ANALYSIS" : "COMPLETE STEPS TO CONTINUE"}
        </button>
      </div>
    </section>
  );
}
