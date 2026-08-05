"use client";

import React, { useState, useEffect } from "react";
import { getJobsBySkills, logInteraction, searchJobs } from "../../utils/api";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true
};

const icons = {
  search: (
    <svg {...iconProps}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  mapPin: (
    <svg {...iconProps}>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  briefcase: (
    <svg {...iconProps}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  ),
  globe: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </svg>
  ),
  bookmark: (
    <svg {...iconProps}>
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
    </svg>
  ),
  arrowUpRight: (
    <svg {...iconProps}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  ),
  clock: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  x: (
    <svg {...iconProps}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
};

// Parse and sanitize the raw job description before it touches the DOM so
// no raw HTML tags or unsafe attributes are ever displayed.
function sanitizeHtml(html) {
  if (!html) return "";
  if (typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const drop = new Set([
    "SCRIPT", "STYLE", "IFRAME", "NOSCRIPT", "OBJECT", "EMBED",
    "META", "LINK", "FORM", "INPUT", "BUTTON", "SELECT", "TEXTAREA",
    "IMG", "SVG", "VIDEO", "AUDIO", "SOURCE"
  ]);

  for (const el of Array.from(doc.body.querySelectorAll("*"))) {
    if (drop.has(el.tagName)) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const keep = el.tagName === "A" && name === "href";
      if (!keep) el.removeAttribute(attr.name);
    }
  }

  return doc.body.innerHTML.trim();
}

function companyInitials(name) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function formatLocation(job) {
  return [job.location?.city, job.location?.state].filter(Boolean).join(", ") || "Remote";
}

function formatSalary(job) {
  if (!job.salary?.min) return "";
  const min = job.salary.min.toLocaleString();
  const max = job.salary.max ? job.salary.max.toLocaleString() : "";
  return `$${min}${max ? ` – $${max}` : ""}`;
}

function capitalize(value) {
  if (!value) return "";
  return String(value)
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function skillName(item) {
  if (item && typeof item === "object") return item.skill || "";
  return item == null ? "" : String(item);
}

export default function JobSearchPage({ userSkills: initialUserSkills = [], onJobSelect }) {
  const [userSkills, setUserSkills] = useState(initialUserSkills);
  const [location, setLocation] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobMatches, setJobMatches] = useState({});

  // UI-only presentation state (no data flow / API changes).
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [mostRelevant, setMostRelevant] = useState(false);
  const [savedJobs, setSavedJobs] = useState(() => new Set());
  const [activeTab, setActiveTab] = useState("about");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserSkills]);

  const onSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const openJob = (job) => {
    setSelectedJob(job);
    setActiveTab("about");
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
  };

  const toggleSave = (id) => {
    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const displayJobs = (() => {
    let list = jobs;
    if (remoteOnly) list = list.filter((job) => job.location?.remote);
    if (mostRelevant) {
      list = [...list].sort(
        (a, b) => (jobMatches[b._id]?.matchScore ?? 0) - (jobMatches[a._id]?.matchScore ?? 0)
      );
    }
    return list;
  })();

  const matchClass = (score) => (score >= 65 ? "high" : score >= 35 ? "mid" : "low");

  const renderJobCard = (job) => {
    const match = jobMatches[job._id];
    const isSaved = savedJobs.has(job._id);
    const salary = formatSalary(job);
    const initials = companyInitials(job.company);

    return (
      <article
        key={job._id}
        className="job-card"
        onClick={() => openJob(job)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openJob(job);
          }
        }}
      >
        <div className="job-card-top">
          <div className="job-logo">
            {job.companyLogo ? (
              <img src={job.companyLogo} alt="" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="job-card-body">
            <h3 className="job-card-title">{job.title}</h3>
            <p className="job-card-company">{job.company}</p>

            <div className="job-card-meta">
              <span className="job-meta-item">
                {icons.mapPin}
                {formatLocation(job)}
              </span>
              {job.location?.remote && (
                <span className="remote-badge">{icons.globe} Remote</span>
              )}
            </div>

            <div className="job-card-chips">
              {match && match.matchedSkills.slice(0, 3).map((skill) => (
                <span key={skillName(skill) || String(skill)} className="skill-chip matched">
                  ✓ {skillName(skill)}
                </span>
              ))}
              {match && match.missingSkills.length > 0 && (
                <span className="skill-chip missing">+{match.missingSkills.length} missing</span>
              )}
              {!match && job.skills.slice(0, 4).map((skill) => (
                <span key={skillName(skill) || String(skill)} className="skill-chip">{skillName(skill)}</span>
              ))}
            </div>
          </div>

          <div className="job-card-side">
            {match && (
              <span className={`match-badge ${matchClass(match.matchScore)}`}>
                {match.matchScore}% Match
              </span>
            )}
            <button
              type="button"
              className={`bookmark-btn${isSaved ? " saved" : ""}`}
              aria-label={isSaved ? "Remove from saved jobs" : "Save job"}
              aria-pressed={isSaved}
              onClick={(e) => {
                e.stopPropagation();
                toggleSave(job._id);
              }}
            >
              {icons.bookmark}
            </button>
          </div>
        </div>

        <div className="job-card-footer">
          <p className="job-salary">{salary || <span className="job-salary-none">Salary not specified</span>}</p>
          <button
            type="button"
            className="view-job-btn"
            onClick={(e) => {
              e.stopPropagation();
              openJob(job);
            }}
          >
            View Job
            {icons.arrowUpRight}
          </button>
        </div>
      </article>
    );
  };

  const match = selectedJob && jobMatches[selectedJob._id];

  return (
    <div className="section container jobs-page">
      <header className="jobs-header">
        <h1>Find Your Next Opportunity</h1>
        <p>Discover jobs that match your skills and career goals.</p>
      </header>

      {/* Search & Filter Section */}
      <form onSubmit={onSubmit} className="jobs-search">
        <div className="jobs-search-bar">
          {icons.search}
          <input
            type="text"
            placeholder="Search job title, company or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="jobs-search-btn" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="jobs-filters">
          <label className="jobs-filter">
            {icons.mapPin}
            <input
              type="text"
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>

          <label className="jobs-filter">
            {icons.briefcase}
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
            >
              <option value="">Experience level</option>
              <option value="entry">Entry level</option>
              <option value="mid">Mid level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>
          </label>

          <button
            type="button"
            className={`jobs-toggle${remoteOnly ? " active" : ""}`}
            aria-pressed={remoteOnly}
            onClick={() => setRemoteOnly((v) => !v)}
          >
            {icons.globe}
            Remote
          </button>

          <button
            type="button"
            className={`jobs-toggle${mostRelevant ? " active" : ""}`}
            aria-pressed={mostRelevant}
            onClick={() => setMostRelevant((v) => !v)}
          >
            Most Relevant
          </button>
        </div>
      </form>

      {/* Jobs List */}
      <div className="jobs-list">
        {displayJobs.length === 0 && !loading ? (
          <div className="jobs-empty">
            <h3>No jobs found</h3>
            <p>Try a different search, or broaden your filters.</p>
          </div>
        ) : (
          displayJobs.map(renderJobCard)
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="job-modal-overlay" onClick={() => setSelectedJob(null)}>
          <div
            className="job-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selectedJob.title}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="job-modal-close"
              aria-label="Close"
              onClick={() => setSelectedJob(null)}
            >
              {icons.x}
            </button>

            <header className="job-modal-header">
              <div className="job-modal-logo">
                {selectedJob.companyLogo ? (
                  <img src={selectedJob.companyLogo} alt="" />
                ) : (
                  <span>{companyInitials(selectedJob.company)}</span>
                )}
              </div>
              <div className="job-modal-heading">
                <h2 className="job-modal-title">{selectedJob.title}</h2>
                <p className="job-modal-company">{selectedJob.company}</p>

                <div className="job-modal-meta">
                  {selectedJob.location?.remote && (
                    <span className="remote-badge">{icons.globe} Remote</span>
                  )}
                  <span className="job-meta-item">
                    {icons.mapPin}
                    {formatLocation(selectedJob)}
                  </span>
                  {selectedJob.experience_level && (
                    <span className="job-meta-item">
                      {icons.briefcase}
                      {capitalize(selectedJob.experience_level)}
                    </span>
                  )}
                  <span className="job-meta-item">
                    {icons.clock}
                    {selectedJob.postedDate
                      ? new Date(selectedJob.postedDate).toLocaleDateString()
                      : "Just posted"}
                  </span>
                </div>

                <div className="job-modal-actions">
                  {match && (
                    <span className={`match-badge ${matchClass(match.matchScore)}`}>
                      {match.matchScore}% Match
                    </span>
                  )}
                  <button
                    type="button"
                    className={`job-save-btn${savedJobs.has(selectedJob._id) ? " saved" : ""}`}
                    onClick={() => toggleSave(selectedJob._id)}
                  >
                    {icons.bookmark}
                    {savedJobs.has(selectedJob._id) ? "Saved" : "Save job"}
                  </button>
                </div>
              </div>
            </header>

            <nav className="job-modal-tabs" aria-label="Job details">
              {[
                { id: "about", label: "About" },
                { id: "requirements", label: "Requirements" },
                { id: "benefits", label: "Benefits" },
                { id: "company", label: "Company" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`job-tab${activeTab === tab.id ? " active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="job-modal-body">
              {activeTab === "about" && (
                <section>
                  <h3 className="job-section-title">About the Role</h3>
                  {selectedJob.description ? (
                    <div
                      className="job-description"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedJob.description) }}
                    />
                  ) : (
                    <p className="job-description">No description provided for this role.</p>
                  )}
                </section>
              )}

              {activeTab === "requirements" && (
                <section>
                  <h3 className="job-section-title">Required Skills</h3>
                  <div className="job-skill-list">
                    {(selectedJob.skills || []).map((skill) => (
                      <span key={skillName(skill) || String(skill)} className="skill-chip">{skillName(skill)}</span>
                    ))}
                    {(selectedJob.skills || []).length === 0 && (
                      <p className="job-description">No specific skills listed.</p>
                    )}
                  </div>

                  {match && match.missingSkills.length > 0 && (
                    <>
                      <h3 className="job-section-title">Skills You Can Grow</h3>
                      <div className="job-skill-list">
                        {match.missingSkills.map((skill) => (
                          <span key={skillName(skill) || String(skill)} className="skill-chip missing">{skillName(skill)}</span>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="job-detail-rows">
                    <div className="job-detail-row">
                      <span className="job-detail-label">Experience</span>
                      <span className="job-detail-value">
                        {capitalize(selectedJob.experience_level) || "Not specified"}
                      </span>
                    </div>
                    <div className="job-detail-row">
                      <span className="job-detail-label">Job type</span>
                      <span className="job-detail-value">
                        {capitalize(selectedJob.jobType) || "Not specified"}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "benefits" && (
                <section>
                  <h3 className="job-section-title">Compensation & Benefits</h3>
                  <div className="job-detail-rows">
                    <div className="job-detail-row">
                      <span className="job-detail-label">Salary</span>
                      <span className="job-detail-value">
                        {formatSalary(selectedJob) || "Not specified"}
                      </span>
                    </div>
                    <div className="job-detail-row">
                      <span className="job-detail-label">Work mode</span>
                      <span className="job-detail-value">
                        {selectedJob.location?.remote ? "Fully remote" : "On-site"}
                      </span>
                    </div>
                    <div className="job-detail-row">
                      <span className="job-detail-label">Location</span>
                      <span className="job-detail-value">{formatLocation(selectedJob)}</span>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "company" && (
                <section>
                  <h3 className="job-section-title">About {selectedJob.company}</h3>
                  <div className="job-detail-rows">
                    <div className="job-detail-row">
                      <span className="job-detail-label">Company</span>
                      <span className="job-detail-value">{selectedJob.company}</span>
                    </div>
                    <div className="job-detail-row">
                      <span className="job-detail-label">Location</span>
                      <span className="job-detail-value">{formatLocation(selectedJob)}</span>
                    </div>
                    <div className="job-detail-row">
                      <span className="job-detail-label">Source</span>
                      <span className="job-detail-value">
                        {capitalize(selectedJob.source) || "Platform"}
                      </span>
                    </div>
                  </div>
                  {selectedJob.url && (
                    <a
                      href={selectedJob.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="job-link"
                    >
                      Visit {selectedJob.company}
                      {icons.arrowUpRight}
                    </a>
                  )}
                </section>
              )}
            </div>

            <footer className="job-modal-footer">
              <a
                href={selectedJob.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="job-btn job-btn-primary"
              >
                Visit Job
                {icons.arrowUpRight}
              </a>
              <button
                type="button"
                className={`job-btn job-btn-outline${savedJobs.has(selectedJob._id) ? " saved" : ""}`}
                onClick={() => toggleSave(selectedJob._id)}
              >
                {icons.bookmark}
                {savedJobs.has(selectedJob._id) ? "Saved" : "Save Job"}
              </button>
              <button
                type="button"
                className="job-btn job-btn-ghost"
                onClick={() => setSelectedJob(null)}
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
