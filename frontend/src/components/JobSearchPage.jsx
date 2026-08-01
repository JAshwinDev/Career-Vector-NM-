import React, { useState, useEffect } from "react";
import { getJobsBySkills, logInteraction, searchJobs } from "../utils/api";

export default function JobSearchPage({ userSkills: initialUserSkills = [], onJobSelect }) {
  const [userSkills, setUserSkills] = useState(initialUserSkills);
  const [location, setLocation] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobMatches, setJobMatches] = useState({});

  const handleSearch = async (overrideParams = {}) => {
    setLoading(true);

    try {
      const data = await searchJobs({
        search: overrideParams.searchQuery !== undefined ? overrideParams.searchQuery : searchQuery,
        location: overrideParams.location !== undefined ? overrideParams.location : location,
        experience_level: overrideParams.experienceLevel !== undefined ? overrideParams.experienceLevel : experienceLevel,
        limit: 20
      });
      setJobs(data.jobs || []);

      if (userSkills.length > 0) {
        const matchData = await getJobsBySkills(userSkills, {
          experience_level: overrideParams.experienceLevel !== undefined ? overrideParams.experienceLevel : experienceLevel,
          location: overrideParams.location !== undefined ? overrideParams.location : location
        });
        const matchMap = {};
        (matchData.jobs || []).forEach((job) => {
          matchMap[job._id] = {
            matchScore: job.matchScore,
            matchedSkills: job.matchedSkills,
            missingSkills: job.missingSkills
          };
        });
        setJobMatches(matchMap);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUserSkills(Array.isArray(initialUserSkills) ? initialUserSkills : []);
    handleSearch({ searchQuery: "", location: "", experienceLevel: "mid" });
  }, [initialUserSkills]);

  const onSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="section container" style={{ minHeight: "100vh" }}>
      <h1 className="section-title">FIND YOUR NEXT OPPORTUNITY</h1>

      {/* Search & Filter Section */}
      <form onSubmit={onSubmit} className="brutalist-card brutalist-card-accent" style={{ padding: "2rem", marginBottom: "3rem" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem"
        }}>
          <input
            type="text"
            placeholder="JOB TITLE OR COMPANY..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg)",
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem", color: "var(--primary)"
            }}
          />

          <select
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value)}
            style={{
              padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg)",
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem", color: "var(--primary)"
            }}
          >
            <option value="">EXPERIENCE LEVEL</option>
            <option value="entry">ENTRY LEVEL</option>
            <option value="mid">MID LEVEL</option>
            <option value="senior">SENIOR</option>
            <option value="lead">LEAD</option>
          </select>

          <input
            type="text"
            placeholder="LOCATION..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg)",
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem", color: "var(--primary)"
            }}
          />

          <button type="submit" className="btn-primary" style={{ padding: "1rem", fontSize: "1.2rem" }}>
            {loading ? "SEARCHING..." : "SEARCH JOBS"}
          </button>
        </div>
      </form>

      {/* Jobs List */}
      <div style={{ display: "grid", gap: "2rem" }}>
        {jobs.length === 0 ? (
          <p style={{ textAlign: "center", padding: "4rem", color: "var(--text-soft)", fontSize: "1.5rem", fontWeight: 600 }}>
            NO JOBS FOUND. TRY A DIFFERENT SEARCH.
          </p>
        ) : (
          jobs.map((job) => {
            const match = jobMatches[job._id];
            return (
              <div
                key={job._id}
                className="brutalist-card"
                style={{ padding: "2rem", cursor: "pointer", marginBottom: 0 }}
                onClick={() => {
                  setSelectedJob(job);
                  onJobSelect?.(job);
                  logInteraction({
                    jobId: job._id,
                    interactionType: "job_view",
                    actionDetails: {
                      title: job.title,
                      company: job.company,
                      source: job.source || "platform"
                    }
                  }).catch(() => {});
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "2rem", fontWeight: "900", margin: "0 0 0.5rem 0", color: "var(--primary)", fontFamily: "var(--font-display)", textTransform: "uppercase" }}>{job.title}</h3>
                    <p style={{ fontSize: "1.2rem", color: "var(--primary)", margin: "0", fontWeight: 500 }}>{job.company}</p>
                  </div>
                  {match && (
                    <div style={{
                      padding: "0.5rem 1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                      backgroundColor: match.matchScore >= 65 ? "var(--primary)" : match.matchScore >= 35 ? "var(--surface)" : "var(--accent)",
                      color: match.matchScore >= 65 ? "var(--bg)" : "var(--primary)",
                      fontWeight: "900", fontSize: "1.2rem", fontFamily: "var(--font-display)"
                    }}>
                      {match.matchScore}% MATCH
                    </div>
                  )}
                </div>

                <p style={{ fontSize: "1.2rem", color: "var(--text-soft)", marginBottom: "1rem", fontWeight: 600, textTransform: "uppercase" }}>
                  📍 {job.location?.city}, {job.location?.state}
                  {job.location?.remote ? " (REMOTE)" : ""}
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                  {match && match.matchedSkills.slice(0, 3).map((skill) => (
                    <span key={skill} style={{
                      backgroundColor: "var(--primary)", color: "var(--primary)",
                      padding: "0.2rem 0.5rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                      fontSize: "1rem", fontFamily: "var(--font-display)", fontWeight: "900", textTransform: "uppercase"
                    }}>✓ {skill}</span>
                  ))}
                  {match && match.missingSkills.length > 0 && (
                    <span style={{
                      backgroundColor: "var(--accent)", color: "var(--primary)",
                      padding: "0.2rem 0.5rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                      fontSize: "1rem", fontFamily: "var(--font-display)", fontWeight: "900", textTransform: "uppercase"
                    }}>
                      +{match.missingSkills.length} MISSING
                    </span>
                  )}
                </div>

                {job.salary?.min && (
                  <p style={{ fontSize: "1.5rem", fontWeight: "900", color: "var(--primary)", margin: "0", fontFamily: "var(--font-display)" }}>
                    💰 ${job.salary.min.toLocaleString()} - ${job.salary.max?.toLocaleString() || ""}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(17,17,17,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }} onClick={() => setSelectedJob(null)}>
          <div className="brutalist-card" style={{
            padding: "3rem", maxWidth: "800px", width: "90%", maxHeight: "80vh", overflowY: "auto", position: "relative"
          }} onClick={(e) => e.stopPropagation()}>
            <button
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                fontSize: "2rem", background: "none", border: "none", cursor: "pointer",
                color: "var(--primary)", fontFamily: "var(--font-display)", fontWeight: 700
              }}
              onClick={() => setSelectedJob(null)}
            >
              ×
            </button>

            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "2.5rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>{selectedJob.title}</h2>
            <p style={{ fontSize: "1.5rem", fontWeight: 500, marginBottom: "2rem" }}>{selectedJob.company}</p>

            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem", textTransform: "uppercase", marginBottom: "1rem" }}>About the Role</h3>
            <p style={{ fontSize: "1.2rem", lineHeight: 1.6, marginBottom: "2rem" }}>{selectedJob.description}</p>

            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem", textTransform: "uppercase", marginBottom: "1rem" }}>Required Skills</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
              {selectedJob.skills?.map((skill) => (
                <span key={skill} style={{
                  backgroundColor: "var(--surface)", color: "var(--primary)", padding: "0.5rem 1rem",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "1.2rem", fontFamily: "var(--font-display)", fontWeight: "900", textTransform: "uppercase"
                }}>{skill}</span>
              ))}
            </div>

            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem", textTransform: "uppercase", marginBottom: "1rem" }}>Job Details</h3>
            <ul className="brutal-list" style={{ marginBottom: "2rem" }}>
              <li><span>EXPERIENCE LEVEL:</span> <span>{selectedJob.experience_level}</span></li>
              <li><span>JOB TYPE:</span> <span>{selectedJob.jobType}</span></li>
              {selectedJob.salary?.min && (
                <li><span>SALARY:</span> <span>${selectedJob.salary.min} - ${selectedJob.salary.max}</span></li>
              )}
            </ul>

            <a
              href={selectedJob.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ display: "block", textAlign: "center", marginTop: "2rem" }}
            >
              APPLY NOW
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
