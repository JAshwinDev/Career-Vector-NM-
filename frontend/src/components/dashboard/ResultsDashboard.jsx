"use client";

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

function skillName(item) {
  if (item && typeof item === "object") return item.skill || "";
  return item == null ? "" : String(item);
}

function ScoreRing({ score }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    let start = null;
    const duration = 1400;
    const target = score;
    const easeOut = t => 1 - Math.pow(1 - t, 3);

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setAnimated(Math.round(easeOut(progress) * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [score]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: "0.75rem" }}>
      <div style={{
        width: 120, height: 120, borderRadius: "50%",
        border: "1px solid var(--border-dark)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", background: "var(--surface)"
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: "2.5rem",
          color: "var(--primary)", lineHeight: 1, letterSpacing: "-0.05em"
        }}>{animated}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: "1rem", color: 'var(--text-soft)', fontWeight: 500 }}>%</span>
      </div>
      <div>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: "0.8125rem", fontWeight: 600,
          color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "1px"
        }}>Match Score</span>
      </div>
    </div>
  );
}

function SkillTag({ skill, matched }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: "0.5rem",
      padding: '0.4rem 0.8rem',
      background: matched ? "rgba(77, 124, 90, 0.08)" : "var(--overlay)",
      borderRadius: "100px",
      color: matched ? "var(--success)" : "var(--text-soft)",
      fontFamily: 'var(--font-body)', fontSize: "0.95rem", fontWeight: 500,
      transition: 'var(--transition)',
      cursor: 'default',
      border: "1px solid transparent"
    }}
    onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-subtle)';
        e.currentTarget.style.borderColor = 'var(--border)';
    }}
    onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'transparent';
    }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{matched ? '✓' : '✗'}</span> {skillName(skill)}
    </span>
  );
}

function RoadmapCard({ item, index }) {
  const typeIcons = { video: '▶', course: '🎓', docs: '📖', article: '📝' };

  return (
    <div style={{
      display: 'flex', gap: "1.25rem",
      paddingBottom: "1.25rem", paddingTop: "1.25rem",
      borderBottom: "1px solid var(--border)",
    }}>
      {/* Timeline dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "var(--radius-sm)",
          background: "var(--surface)", border: "1px solid var(--border)",
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: "1.125rem", fontWeight: 700, color: "var(--primary)",
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>
        <div style={{
          width: 4, flex: 1, minHeight: 32,
          background: "var(--surface)",
          marginTop: "0.75rem",
        }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: "0.75rem", marginBottom: "0.75rem", flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: "1.125rem",
            color: 'var(--primary)', textTransform: "uppercase"
          }}>{item.skill}</span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: "0.875rem", fontWeight: 500,
            color: "var(--primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
            padding: '0.1rem 0.6rem',
          }}>⏱ {item.duration}</span>
          {item.start_week && (
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: "0.875rem", fontWeight: 500,
              color: 'var(--primary)', background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              padding: '0.1rem 0.6rem',
            }}>WK {item.start_week}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: "0.75rem", flexWrap: 'wrap' }}>
          {item.resources.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: "0.5rem",
                padding: '0.4rem 0.875rem',
                background: 'var(--surface)', border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                color: 'var(--primary)', textDecoration: 'none',
                fontFamily: 'var(--font-body)', fontSize: "0.875rem", fontWeight: 600,
                transition: 'all 0.2s ease', cursor: "pointer"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--primary)";
                e.currentTarget.style.color = "var(--bg)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "var(--surface)";
                e.currentTarget.style.color = "var(--primary)";
              }}
            >
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{typeIcons[r.type] || '→'}</span>
              <span>{r.title}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleBar({ role, score, isTarget }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    setTimeout(() => setWidth(score), 100);
  }, [score]);

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: "0.375rem" }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: "1rem",
          color: isTarget ? 'var(--accent)' : 'var(--primary)',
          fontWeight: 700, textTransform: "uppercase"
        }}>
          {isTarget && '★ '}{role}
        </span>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: "1rem", fontWeight: 700,
          color: 'var(--primary)',
        }}>{score}%</span>
      </div>
      <div style={{
        height: 8, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: 'var(--surface)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: isTarget ? 'var(--accent)' : 'var(--primary)',
          width: `${width}%`,
          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
    </div>
  );
}

export default function ResultsDashboard({ result, onReset }) {
  const {
    compatibility_score, matched_skills, missing_skills, roadmap,
    student_skills, target_role, all_role_scores, role_description, is_demo,
    recommendation, summary, source, skillGaps, estimatedTime, learningPath
  } = result;

  const isRoadmapOnly = source === 'extension-roadmap';
  const hasGeneratedRoadmap = source === 'analysis-with-roadmap';
  const displayRoadmap = isRoadmapOnly ? (learningPath || roadmap || []) : (hasGeneratedRoadmap ? (learningPath || roadmap || []) : roadmap);
  const displayTargetRole = isRoadmapOnly ? (target_role || 'Your Target Role') : target_role;
  const displayScore = isRoadmapOnly ? 0 : (compatibility_score || 0);

  const [activeTab, setActiveTab] = useState(isRoadmapOnly ? 'roadmap' : 'overview');
  const tabs = isRoadmapOnly ? ['roadmap'] : (hasGeneratedRoadmap ? ['overview', 'roadmap'] : ['overview', 'roadmap', 'alternatives']);

  const tabStyle = (active) => ({
    padding: '0.5rem 1.25rem',
    background: active ? 'var(--primary)' : 'var(--surface)',
    color: active ? 'var(--bg)' : 'var(--primary)',
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: "0.875rem",
    cursor: "pointer", transition: 'all 0.2s ease', textTransform: 'uppercase',
  });

  return (
    <section className="relative mx-auto max-w-[var(--container-max)] px-[clamp(1.25rem,4vw,3rem)] py-[var(--section-y)]" style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: "var(--space-5)", flexWrap: 'wrap', gap: "1rem",
      }}>
        <div>
          <h2 className="mb-5 font-display text-[length:var(--text-subheading)] font-bold text-[var(--primary)]" style={{ fontSize: "var(--text-subheading)", marginBottom: "0.75rem" }}>
            {isRoadmapOnly ? 'YOUR LEARNING ROADMAP' : (hasGeneratedRoadmap ? 'ANALYSIS & ROADMAP FOR' : 'YOUR ANALYSIS FOR')} <span style={{ color: 'var(--accent)' }}>{displayTargetRole}</span>
          </h2>
          {(recommendation || summary) && (
            <div style={{ marginTop: "0.75rem", display: 'flex', flexWrap: 'wrap', gap: "0.75rem", alignItems: 'center' }}>
              {recommendation && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.875rem',
                  background: 'var(--accent)', border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                  color: 'var(--primary)', fontSize: "0.875rem", fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: "uppercase"
                }}>
                  {recommendation}
                </span>
              )}
              {summary && (
                <span style={{ color: 'var(--text-soft)', fontSize: "0.9375rem", maxWidth: 600, fontWeight: 600 }}>
                  {summary}
                </span>
              )}
            </div>
          )}
          {(isRoadmapOnly || hasGeneratedRoadmap) && estimatedTime && (
            <div style={{ marginTop: "0.75rem" }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.875rem',
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                color: "var(--primary)", fontSize: "0.875rem", fontFamily: 'var(--font-display)', fontWeight: 700
              }}>
                ESTIMATED TIME: {estimatedTime}
              </span>
            </div>
          )}
        </div>
        <button onClick={onReset} className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] border border-transparent bg-[var(--primary)] p-[10px_18px] font-body text-[0.9375rem] font-semibold leading-none text-[var(--surface)] no-underline transition-all duration-[0.25s] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-px hover:bg-[var(--primary-soft)] hover:shadow-[var(--shadow-md)]">
          ← START OVER
        </button>
      </div>

      {!isRoadmapOnly && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border)] border-t-[3px] border-t-[var(--accent)] bg-[var(--surface)] p-4 shadow-[var(--shadow-subtle)] transition-all duration-[0.25s] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-hover)] sm:p-6" style={{
          display: 'flex', alignItems: 'center', gap: "var(--space-6)", flexWrap: 'wrap',
          marginBottom: "var(--space-5)"
        }}>
          <ScoreRing score={displayScore} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: "1.0625rem", color: 'var(--primary)',
              marginBottom: "0.75rem", textTransform: 'uppercase', fontWeight: 700
            }}>ROLE DESCRIPTION</div>
            <p style={{ color: 'var(--text-soft)', fontSize: "1rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              {role_description}
            </p>
            <div style={{ display: 'flex', gap: "0.75rem", flexWrap: 'wrap' }}>
              <div style={{
                border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)",
                padding: '0.75rem 1rem', textAlign: 'center', minWidth: 100
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: "1.75rem", color: 'var(--primary)', fontWeight: 700 }}>
                  {matched_skills?.length || 0}
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 500, color: 'var(--primary)', textTransform: "uppercase" }}>Matched</div>
              </div>
              <div style={{
                border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--accent)",
                padding: '0.75rem 1rem', textAlign: 'center', minWidth: 100
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: "1.75rem", color: 'var(--primary)', fontWeight: 700 }}>
                  {missing_skills?.length || 0}
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 500, color: 'var(--primary)', textTransform: "uppercase" }}>Gaps</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: "0.5rem", borderBottom: "1px solid var(--border)", marginBottom: "var(--space-5)" }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(activeTab === tab)}>
            {tab === 'roadmap' ? 'COURSES' : tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-subtle)] transition-all duration-[0.25s] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-hover)] sm:p-6" style={{ animation: 'fadeIn 0.3s ease' }}>
        {activeTab === 'overview' && (
          <div>
            <div style={{ marginBottom: "var(--space-5)" }}>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: "1.0625rem",
                textTransform: 'uppercase', color: 'var(--primary)',
                marginBottom: "1rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--border)"
              }}>SKILLS DETECTED</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: "0.75rem" }}>
                {student_skills.map(skill => (
                  <SkillTag key={skillName(skill) || String(skill)} skill={skill}
                    matched={matched_skills.map(s => skillName(s).toLowerCase()).includes(skillName(skill).toLowerCase())} />
                ))}
                {student_skills.length === 0 && (
                  <span style={{ color: 'var(--text-soft)', fontSize: "0.9375rem", fontWeight: 600 }}>NO SKILLS DETECTED</span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: "var(--space-5)" }}>
              <div style={{ background: "var(--bg-soft)", padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: "0.9375rem",
                  textTransform: 'uppercase', color: 'var(--success)', letterSpacing: "0.5px",
                  marginBottom: "1rem",
                }}>MATCHED SKILLS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: "0.5rem" }}>
                  {matched_skills.map(skill => (
                    <div key={skillName(skill) || String(skill)} style={{
                      display: 'flex', alignItems: 'center', gap: "0.75rem",
                      padding: '0.6rem 0.875rem', background: "var(--surface)", borderRadius: "var(--radius-sm)",
                      fontSize: "0.9375rem", color: "var(--primary)", fontWeight: 500, border: "1px solid var(--border)"
                    }}>
                      <span style={{ fontFamily: "var(--font-display)", color: "var(--success)" }}>✓</span> {skillName(skill)}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: "var(--bg-soft)", padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: "0.9375rem",
                  textTransform: 'uppercase', color: 'var(--danger)', letterSpacing: "0.5px",
                  marginBottom: "1rem",
                }}>MISSING SKILLS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: "0.5rem" }}>
                  {missing_skills.map(item => (
                    <div key={skillName(item) || String(item)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.6rem 0.875rem', background: 'var(--surface)', borderRadius: "var(--radius-sm)",
                      fontSize: "0.9375rem", color: 'var(--primary)', fontWeight: 500, border: "1px solid var(--border)"
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}><span style={{color: "var(--danger)"}}>✗</span> {skillName(item)}</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: "0.8125rem", fontWeight: 700,
                        color: 'var(--danger)', background: "var(--bg)", borderRadius: "100px", padding: "0.15rem 0.5rem"
                      }}>{Math.round((item.weight ?? 0.5) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roadmap' && (
          <div>
            <div style={{ marginBottom: "var(--space-5)" }}>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: "1.25rem",
                marginBottom: "0.75rem", textTransform: "uppercase", color: "var(--primary)"
              }}>RECOMMENDED COURSES</h3>
              <p style={{ color: 'var(--text-soft)', fontSize: "0.9375rem", fontWeight: 600 }}>
                {isRoadmapOnly
                  ? `MASTER ${skillGaps?.length || 0} SKILLS FOR ${displayTargetRole}. FOLLOW THESE COURSES TO BECOME JOB-READY.`
                  : 'CLOSE YOUR SKILL GAPS WITH FREE RESOURCES. FOLLOW THESE COURSES TO BECOME JOB-READY.'
                }
              </p>
            </div>
            {displayRoadmap.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {displayRoadmap.map((item, i) => (
                  <RoadmapCard key={item.skill || i} item={item} index={i} />
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: "var(--space-6)",
                color: 'var(--primary)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: "1.125rem",
                border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)"
              }}>
                YOU ALREADY MATCH ALL KEY SKILLS. APPLY WITH CONFIDENCE.
              </div>
            )}
          </div>
        )}

        {activeTab === 'alternatives' && (
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.75rem",
              textTransform: "uppercase"
            }}>BEST ROLE MATCHES</h3>
            <p style={{ color: 'var(--text-soft)', fontSize: "0.9375rem", fontWeight: 600, marginBottom: "var(--space-5)", textTransform: "uppercase" }}>
              BASED ON CURRENT SKILLS, ROLES YOU ARE CLOSEST TO.
            </p>
            {Object.entries(all_role_scores).map(([role, score]) => (
              <RoleBar key={role} role={role} score={score} isTarget={role === target_role} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
