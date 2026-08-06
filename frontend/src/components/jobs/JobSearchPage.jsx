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
  width: 20,
  height: 20,
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
  const currency = job.salary?.currency || "USD";
  return `${currency === "INR" ? "₹" : "$"}${min}${max ? ` – ${currency === "INR" ? "₹" : "$"}${max}` : ""}`;
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
  const [location, setLocation] = useState("Tamil Nadu, India");
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
    handleSearch({ searchQuery: "", location: "Tamil Nadu, India", experienceLevel: "mid" });
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

  const matchBadgeTone = (score) => {
    const tones = {
      high: "bg-[rgba(77,124,90,0.13)] text-[var(--green)]",
      mid: "bg-[rgba(197,139,45,0.14)] text-[var(--warning)]",
      low: "bg-[var(--accent-tint)] text-[var(--accent)]"
    };
    return tones[score >= 65 ? "high" : score >= 35 ? "mid" : "low"];
  };

  const renderJobCard = (job) => {
    const match = jobMatches[job._id];
    const isSaved = savedJobs.has(job._id);
    const salary = formatSalary(job);
    const initials = companyInitials(job.company);

    return (
      <article
        key={job._id}
        className="cursor-pointer rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[20px_22px] shadow-[var(--shadow-sm)] outline-none [transition:transform_0.2s_ease,box-shadow_0.2s_ease,border-color_0.2s_ease] hover:-translate-y-[3px] hover:border-[var(--border-dark)] hover:shadow-[var(--shadow-md)] focus-visible:-translate-y-[3px] focus-visible:border-[var(--border-dark)] focus-visible:shadow-[var(--shadow-md)]"
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
        <div className="flex gap-4 max-[640px]:flex-col">
          <div className="grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-soft)] font-display text-lg font-bold text-[var(--accent)]">
            {job.companyLogo ? (
              <img src={job.companyLogo} alt="" className="h-full w-full object-contain p-2" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="m-0 mb-[2px] font-display text-[20px] font-bold leading-[1.25] tracking-[-0.01em] text-[var(--primary)]">
              {job.title}
            </h3>
            <p className="m-0 mb-[10px] text-[15px] font-semibold text-[var(--text-soft)]">{job.company}</p>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] [&>svg]:h-[14px] [&>svg]:w-[14px]">
                {icons.mapPin}
                {formatLocation(job)}
              </span>
              {job.location?.remote && (
                <span className="inline-flex items-center gap-[5px] rounded-full bg-[rgba(77,124,90,0.12)] p-[3px_10px] text-xs font-semibold text-[var(--green)] [&>svg]:h-[13px] [&>svg]:w-[13px]">
                  {icons.globe} Remote
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {match && match.matchedSkills.slice(0, 3).map((skill) => (
                <span key={skillName(skill) || String(skill)} className="whitespace-nowrap rounded-full bg-[rgba(77,124,90,0.13)] p-[4px_11px] text-xs font-semibold text-[var(--green)]">
                  ✓ {skillName(skill)}
                </span>
              ))}
              {match && match.missingSkills.length > 0 && (
                <span className="whitespace-nowrap rounded-full bg-[var(--accent-tint)] p-[4px_11px] text-xs font-semibold text-[var(--accent)]">
                  +{match.missingSkills.length} missing
                </span>
              )}
              {!match && job.skills.slice(0, 4).map((skill) => (
                <span key={skillName(skill) || String(skill)} className="whitespace-nowrap rounded-full bg-[var(--bg-soft)] p-[4px_11px] text-xs font-semibold text-[var(--text-soft)]">
                  {skillName(skill)}
                </span>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-[10px] max-[640px]:flex-row max-[640px]:items-center max-[640px]:justify-between">
            {match && (
              <span className={`whitespace-nowrap rounded-full p-[6px_12px] font-display text-[13px] font-bold ${matchBadgeTone(match.matchScore)}`}>
                {match.matchScore}% Match
              </span>
            )}
            <button
              type="button"
              className={`grid h-9 w-9 cursor-pointer place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] [transition:all_0.18s_ease] hover:-translate-y-[1px] hover:bg-[var(--bg-soft)] hover:text-[var(--primary)] [&_svg]:h-[17px] [&_svg]:w-[17px]${isSaved ? " border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent)]" : ""}`}
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

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-[14px]">
          <p className="m-0 font-display text-[15px] font-bold text-[var(--primary)]">
            {salary || <span className="font-body text-[13px] font-medium text-[var(--text-muted)]">Salary not specified</span>}
          </p>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-[18px] py-[10px] font-body text-[13px] font-semibold text-[var(--primary)] [transition:all_0.18s_ease] hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--surface)] [&_svg]:h-[15px] [&_svg]:w-[15px]"
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
    <div className="relative mx-auto w-full max-w-[900px] px-[clamp(1.25rem,4vw,3rem)] py-[clamp(2rem,4vw,3rem)] pt-2">
      <header>
        <h1 className="m-0 mb-2 font-display text-[clamp(28px,2vw_+_1rem,36px)] font-bold leading-[1.15] tracking-tight text-[var(--primary)] max-[640px]:text-[28px]">
          Find Your Next Opportunity
        </h1>
        <p className="m-0 mb-8 max-w-[560px] text-[16px] font-medium text-[var(--text-muted)]">
          Discover jobs that match your skills and career goals.
        </p>
      </header>

      {/* Search & Filter Section */}
      <form
        onSubmit={onSubmit}
        className="mb-8 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
      >
        <div className="flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg)] p-[0_8px_0_16px] [transition:border-color_0.2s_ease,box-shadow_0.2s_ease] focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-tint)] max-[640px]:flex-wrap max-[640px]:p-[8px_8px_8px_16px] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 [&>svg]:text-[var(--text-muted)]">
          {icons.search}
          <input
            type="text"
            placeholder="Search job title, company or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-0 flex-1 border-none bg-transparent px-2 py-[14px] font-body text-[15px] text-[var(--primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-[10px] border-none bg-[var(--accent)] px-[22px] py-3 font-body text-sm font-semibold text-white [transition:background_0.2s_ease,transform_0.15s_ease] hover:bg-[var(--accent-bright)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 max-[640px]:mt-1 max-[640px]:flex-[1_1_100%]"
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="mt-[14px] flex flex-wrap items-center gap-[10px]">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-[14px] font-body text-[13px] font-semibold text-[var(--text-soft)] [transition:all_0.18s_ease] hover:border-[var(--border-dark)] hover:bg-[var(--bg-soft)] [&>svg]:h-[15px] [&>svg]:w-[15px] [&>svg]:shrink-0 [&>svg]:text-[var(--text-muted)]">
            {icons.mapPin}
            <input
              type="text"
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-[140px] border-none bg-transparent p-0 font-body text-[13px] font-semibold text-[var(--primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>

          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-[14px] font-body text-[13px] font-semibold text-[var(--text-soft)] [transition:all_0.18s_ease] hover:border-[var(--border-dark)] hover:bg-[var(--bg-soft)] [&>svg]:h-[15px] [&>svg]:w-[15px] [&>svg]:shrink-0 [&>svg]:text-[var(--text-muted)]">
            {icons.briefcase}
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="cursor-pointer appearance-none border-none bg-transparent p-[0_20px_0_0] font-body text-[13px] font-semibold text-[var(--primary)] outline-none"
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
            className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-[14px] font-body text-[13px] font-semibold text-[var(--text-soft)] [transition:all_0.18s_ease] hover:border-[var(--border-dark)] hover:bg-[var(--bg-soft)] [&>svg]:h-[15px] [&>svg]:w-[15px] [&>svg]:text-[var(--text-muted)]${remoteOnly ? " border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent)] [&>svg]:text-[var(--accent)]" : ""}`}
            aria-pressed={remoteOnly}
            onClick={() => setRemoteOnly((v) => !v)}
          >
            {icons.globe}
            Remote
          </button>

          <button
            type="button"
            className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-[14px] font-body text-[13px] font-semibold text-[var(--text-soft)] [transition:all_0.18s_ease] hover:border-[var(--border-dark)] hover:bg-[var(--bg-soft)] [&>svg]:h-[15px] [&>svg]:w-[15px] [&>svg]:text-[var(--text-muted)]${mostRelevant ? " border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent)] [&>svg]:text-[var(--accent)]" : ""}`}
            aria-pressed={mostRelevant}
            onClick={() => setMostRelevant((v) => !v)}
          >
            Most Relevant
          </button>
        </div>
      </form>

      {/* Jobs List */}
      <div className="flex flex-col gap-4">
        {displayJobs.length === 0 && !loading ? (
          <div className="p-[64px_24px] text-center">
            <h3 className="m-0 mb-2 font-display text-[22px] font-bold text-[var(--primary)]">No jobs found</h3>
            <p className="m-0 text-[16px] font-medium text-[var(--text-muted)]">Try a different search, or broaden your filters.</p>
          </div>
        ) : (
          displayJobs.map(renderJobCard)
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-[1000] grid place-items-center bg-[rgba(20,18,15,0.6)] p-6 max-[640px]:p-3 [animation:overlayFade_0.2s_ease]"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="relative max-h-[min(90vh,900px)] w-full max-w-5xl overflow-y-auto rounded-[20px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] [animation:modalPop_0.25s_cubic-bezier(0.2,0.8,0.3,1)]"
            role="dialog"
            aria-modal="true"
            aria-label={selectedJob.title}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-[18px] top-[18px] z-[3] grid h-9 w-9 cursor-pointer place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] [transition:all_0.18s_ease] hover:rotate-90 hover:bg-[var(--bg-soft)] hover:text-[var(--primary)] [&_svg]:h-[18px] [&_svg]:w-[18px]"
              aria-label="Close"
              onClick={() => setSelectedJob(null)}
            >
              {icons.x}
            </button>

            <header className="flex items-start gap-5 border-b border-[var(--border)] p-[28px_48px_20px_32px] max-[640px]:p-[24px_44px_16px_20px]">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--bg-soft)] font-display text-[22px] font-bold text-[var(--accent)]">
                {selectedJob.companyLogo ? (
                  <img src={selectedJob.companyLogo} alt="" className="h-full w-full object-contain p-[10px]" />
                ) : (
                  <span>{companyInitials(selectedJob.company)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="m-0 mb-1 font-display text-[clamp(28px,3.4vw,40px)] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--primary)]">
                  {selectedJob.title}
                </h2>
                <p className="m-0 mb-[14px] text-[20px] font-semibold text-[var(--text-soft)]">{selectedJob.company}</p>

                <div className="mb-4 flex flex-wrap items-center gap-[8px_14px]">
                  {selectedJob.location?.remote && (
                    <span className="inline-flex items-center gap-[5px] rounded-full bg-[rgba(77,124,90,0.12)] p-[3px_10px] text-xs font-semibold text-[var(--green)] [&>svg]:h-[13px] [&>svg]:w-[13px]">
                      {icons.globe} Remote
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] [&>svg]:h-[14px] [&>svg]:w-[14px]">
                    {icons.mapPin}
                    {formatLocation(selectedJob)}
                  </span>
                  {selectedJob.experience_level && (
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] [&>svg]:h-[14px] [&>svg]:w-[14px]">
                      {icons.briefcase}
                      {capitalize(selectedJob.experience_level)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] [&>svg]:h-[14px] [&>svg]:w-[14px]">
                    {icons.clock}
                    {selectedJob.postedDate
                      ? new Date(selectedJob.postedDate).toLocaleDateString()
                      : "Just posted"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-[10px]">
                  {match && (
                    <span className={`whitespace-nowrap rounded-full p-[6px_12px] font-display text-[13px] font-bold ${matchBadgeTone(match.matchScore)}`}>
                      {match.matchScore}% Match
                    </span>
                  )}
                  <button
                    type="button"
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-[9px] font-body text-[13px] font-semibold text-[var(--primary)] [transition:all_0.18s_ease] hover:bg-[var(--bg-soft)] [&_svg]:h-4 [&_svg]:w-4${savedJobs.has(selectedJob._id) ? " border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent)]" : ""}`}
                    onClick={() => toggleSave(selectedJob._id)}
                  >
                    {icons.bookmark}
                    {savedJobs.has(selectedJob._id) ? "Saved" : "Save job"}
                  </button>
                </div>
              </div>
            </header>

            <nav className="flex flex-wrap gap-1 border-b border-[var(--border)] bg-[var(--surface)] px-8 max-[640px]:px-5" aria-label="Job details">
              {[
                { id: "about", label: "About" },
                { id: "requirements", label: "Requirements" },
                { id: "benefits", label: "Benefits" },
                { id: "company", label: "Company" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`mr-6 cursor-pointer border-b-2 border-b-transparent bg-transparent p-[14px_4px] font-body text-[15px] font-semibold text-[var(--text-muted)] [transition:color_0.18s_ease,border-color_0.18s_ease] hover:text-[var(--primary)]${activeTab === tab.id ? " border-b-[var(--accent)] text-[var(--accent)]" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="mx-auto max-w-[720px] p-[28px_32px_24px] max-[640px]:px-5">
              {activeTab === "about" && (
                <section>
                  <h3 className="m-0 mb-[14px] font-display text-[22px] font-bold tracking-[-0.01em] text-[var(--primary)] [&:not(:first-child)]:mt-7">
                    About the Role
                  </h3>
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
                  <h3 className="m-0 mb-[14px] font-display text-[22px] font-bold tracking-[-0.01em] text-[var(--primary)] [&:not(:first-child)]:mt-7">
                    Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedJob.skills || []).map((skill) => (
                      <span key={skillName(skill) || String(skill)} className="whitespace-nowrap rounded-full bg-[var(--bg-soft)] p-[4px_11px] text-xs font-semibold text-[var(--text-soft)]">
                        {skillName(skill)}
                      </span>
                    ))}
                    {(selectedJob.skills || []).length === 0 && (
                      <p className="job-description">No specific skills listed.</p>
                    )}
                  </div>

                  {match && match.missingSkills.length > 0 && (
                    <>
                      <h3 className="m-0 mb-[14px] font-display text-[22px] font-bold tracking-[-0.01em] text-[var(--primary)] [&:not(:first-child)]:mt-7">
                        Skills You Can Grow
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {match.missingSkills.map((skill) => (
                          <span key={skillName(skill) || String(skill)} className="whitespace-nowrap rounded-full bg-[var(--accent-tint)] p-[4px_11px] text-xs font-semibold text-[var(--accent)]">
                            {skillName(skill)}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="mt-2 flex flex-col">
                    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-3 last:border-none">
                      <span className="shrink-0 text-[14px] font-medium text-[var(--text-muted)]">Experience</span>
                      <span className="text-right text-[14px] font-semibold text-[var(--primary)]">
                        {capitalize(selectedJob.experience_level) || "Not specified"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-3 last:border-none">
                      <span className="shrink-0 text-[14px] font-medium text-[var(--text-muted)]">Job type</span>
                      <span className="text-right text-[14px] font-semibold text-[var(--primary)]">
                        {capitalize(selectedJob.jobType) || "Not specified"}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "benefits" && (
                <section>
                  <h3 className="m-0 mb-[14px] font-display text-[22px] font-bold tracking-[-0.01em] text-[var(--primary)] [&:not(:first-child)]:mt-7">
                    Compensation & Benefits
                  </h3>
                  <div className="mt-2 flex flex-col">
                    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-3 last:border-none">
                      <span className="shrink-0 text-[14px] font-medium text-[var(--text-muted)]">Salary</span>
                      <span className="text-right text-[14px] font-semibold text-[var(--primary)]">
                        {formatSalary(selectedJob) || "Not specified"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-3 last:border-none">
                      <span className="shrink-0 text-[14px] font-medium text-[var(--text-muted)]">Work mode</span>
                      <span className="text-right text-[14px] font-semibold text-[var(--primary)]">
                        {selectedJob.location?.remote ? "Fully remote" : "On-site"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-3 last:border-none">
                      <span className="shrink-0 text-[14px] font-medium text-[var(--text-muted)]">Location</span>
                      <span className="text-right text-[14px] font-semibold text-[var(--primary)]">
                        {formatLocation(selectedJob)}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "company" && (
                <section>
                  <h3 className="m-0 mb-[14px] font-display text-[22px] font-bold tracking-[-0.01em] text-[var(--primary)] [&:not(:first-child)]:mt-7">
                    About {selectedJob.company}
                  </h3>
                  <div className="mt-2 flex flex-col">
                    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-3 last:border-none">
                      <span className="shrink-0 text-[14px] font-medium text-[var(--text-muted)]">Company</span>
                      <span className="text-right text-[14px] font-semibold text-[var(--primary)]">
                        {selectedJob.company}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-3 last:border-none">
                      <span className="shrink-0 text-[14px] font-medium text-[var(--text-muted)]">Location</span>
                      <span className="text-right text-[14px] font-semibold text-[var(--primary)]">
                        {formatLocation(selectedJob)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-3 last:border-none">
                      <span className="shrink-0 text-[14px] font-medium text-[var(--text-muted)]">Source</span>
                      <span className="text-right text-[14px] font-semibold text-[var(--primary)]">
                        {capitalize(selectedJob.source) || "Platform"}
                      </span>
                    </div>
                  </div>
                  {selectedJob.url && (
                    <a
                      href={selectedJob.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--accent)] [&_svg]:h-[15px] [&_svg]:w-[15px]"
                    >
                      Visit {selectedJob.company}
                      {icons.arrowUpRight}
                    </a>
                  )}
                </section>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-3 rounded-b-[20px] border-t border-[var(--border)] bg-[var(--surface)] p-[18px_32px_24px] max-[640px]:p-[16px_20px_20px]">
              <a
                href={selectedJob.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--accent)] bg-[var(--accent)] p-[11px_20px] font-body text-[14px] font-semibold text-white no-underline [transition:all_0.18s_ease] hover:-translate-y-[1px] hover:border-[var(--accent-bright)] hover:bg-[var(--accent-bright)] [&_svg]:h-4 [&_svg]:w-4"
              >
                Visit Job
                {icons.arrowUpRight}
              </a>
              <button
                type="button"
                className={`inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-[11px_20px] font-body text-[14px] font-semibold text-[var(--primary)] no-underline [transition:all_0.18s_ease] hover:bg-[var(--bg-soft)] [&_svg]:h-4 [&_svg]:w-4${savedJobs.has(selectedJob._id) ? " border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent)]" : ""}`}
                onClick={() => toggleSave(selectedJob._id)}
              >
                {icons.bookmark}
                {savedJobs.has(selectedJob._id) ? "Saved" : "Save Job"}
              </button>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-transparent bg-transparent p-[11px_20px] font-body text-[14px] font-semibold text-[var(--text-soft)] no-underline [transition:all_0.18s_ease] hover:bg-[var(--bg-soft)] hover:text-[var(--primary)] [&_svg]:h-4 [&_svg]:w-4"
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
