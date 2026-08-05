"use client";

import React, { useState, useEffect } from "react";
import { logInteraction } from "../../utils/api.js";

export default function RoadmapViewer({ roadmap = [], targetRole = "", userSkills = [] }) {
  const [expandedSkill, setExpandedSkill] = useState(null);
  const [completedSkills, setCompletedSkills] = useState({});

  useEffect(() => {
    if (!roadmap || !roadmap.length) {
      return;
    }

    logInteraction({
      interactionType: "roadmap_view",
      actionDetails: {
        targetRole,
        roadmapSize: roadmap.length,
        userSkillCount: userSkills.length
      }
    }).catch(() => {});
  }, [roadmap, targetRole, userSkills]);

  const handleToggleExpand = (skillIndex) => {
    setExpandedSkill(expandedSkill === skillIndex ? null : skillIndex);
  };

  const handleToggleComplete = (skillIndex) => {
    setCompletedSkills({
      ...completedSkills,
      [skillIndex]: !completedSkills[skillIndex]
    });
  };

  if (!roadmap || roadmap.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <h2>No Roadmap Available</h2>
        <p>Generate a roadmap by taking the readiness quiz first.</p>
      </div>
    );
  }

  // Calculate progress
  const totalSkills = roadmap.length;
  const completedCount = Object.values(completedSkills).filter(Boolean).length;
  const progressPercentage = Math.round((completedCount / totalSkills) * 100);

  // Calculate total weeks
  const totalWeeks = roadmap.reduce((sum, item) => {
    const durationValue = typeof item.duration === "number"
      ? item.duration
      : parseInt(String(item.duration || "2"), 10);

    return sum + (Number.isFinite(durationValue) ? durationValue : 2);
  }, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Learning Roadmap</h1>
          <p style={styles.subtitle}>for {targetRole}</p>
        </div>
        <div style={styles.statsBox}>
          <div style={styles.stat}>
            <div style={styles.statNumber}>{totalSkills}</div>
            <div style={styles.statLabel}>Skills to Learn</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statNumber}>{totalWeeks}</div>
            <div style={styles.statLabel}>Total Weeks</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statNumber}>{progressPercentage}%</div>
            <div style={styles.statLabel}>Progress</div>
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div style={styles.progressContainer}>
        <div style={styles.progressLabel}>Overall Progress</div>
        <div style={styles.progressBarOuter}>
          <div
            style={{
              ...styles.progressBarInner,
              width: `${progressPercentage}%`
            }}
          />
        </div>
        <div style={styles.progressText}>
          {completedCount} of {totalSkills} completed
        </div>
      </div>

      {/* Timeline/Roadmap */}
      <div style={styles.roadmapTimeline}>
        {roadmap.map((skill, index) => (
          <div
            key={index}
            style={{
              ...styles.roadmapItem,
              opacity: completedSkills[index] ? 0.6 : 1
            }}
          >
            {/* Timeline connector */}
            {index < roadmap.length - 1 && <div style={styles.timelineConnector} />}

            {/* Skill card */}
            <div style={styles.skillCard}>
              <div style={styles.skillCardHeader}>
                <div style={styles.skillCardTitleArea}>
                  <div
                    style={{
                      ...styles.skillNumber,
                      backgroundColor: completedSkills[index] ? "#10b981" : "#3b82f6"
                    }}
                  >
                    {completedSkills[index] ? "✓" : index + 1}
                  </div>
                  <div>
                    <h3 style={styles.skillCardTitle}>{skill.skill}</h3>
                    <p style={styles.skillCardMeta}>
                      Duration: {skill.duration || 2} weeks | Priority: {skill.priority}
                    </p>
                  </div>
                </div>
                <button
                  style={{
                    ...styles.completeBtn,
                    backgroundColor: completedSkills[index] ? "#10b981" : "#e5e7eb"
                  }}
                  onClick={() => handleToggleComplete(index)}
                >
                  {completedSkills[index] ? "✓ Done" : "Mark Done"}
                </button>
              </div>

              {/* Expandable resources */}
              <button
                style={styles.expandBtn}
                onClick={() => handleToggleExpand(index)}
              >
                {expandedSkill === index ? "Hide Resources ▲" : "View Resources ▼"}
              </button>

              {expandedSkill === index && (
                <div style={styles.resourcesContainer}>
                  {skill.resources && skill.resources.length > 0 ? (
                    skill.resources.map((resource, rIdx) => (
                      <div key={rIdx} style={styles.resourceItem}>
                        <div style={styles.resourceType}>{resource.type}</div>
                        <h4 style={styles.resourceTitle}>{resource.title}</h4>
                        <p style={styles.resourcePlatform}>📍 {resource.platform}</p>
                        {resource.url && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.resourceLink}
                          >
                            Learn → 
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <p style={styles.noResources}>
                      No specific resources found. Use the web to search for {skill.skill} tutorials.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={styles.actionButtons}>
        <button
          style={styles.downloadBtn}
          onClick={() => {
            // Download roadmap as PDF
            console.log("Downloading roadmap...");
          }}
        >
          📥 Download Roadmap
        </button>
        <button
          style={styles.shareBtn}
          onClick={() => {
            // Share roadmap
            console.log("Sharing roadmap...");
          }}
        >
          📤 Share Roadmap
        </button>
      </div>

      {/* Tips Section */}
      <div style={styles.tipsSection}>
        <h3 style={styles.tipsTitle}>💡 Tips for Success</h3>
        <ul style={styles.tipsList}>
          <li>Practice by building projects, not just watching tutorials</li>
          <li>Join communities and connect with other learners</li>
          <li>Take on challenges and solve real-world problems</li>
          <li>Review and practice regularly to reinforce concepts</li>
          <li>Set weekly milestones and track your progress</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "32px 20px",
    backgroundColor: "#f9fafb",
    minHeight: "100vh"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
    gap: "20px"
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0 0 5px 0",
    color: "#111827"
  },
  subtitle: {
    fontSize: "15px",
    color: "#6b7280",
    margin: "0"
  },
  statsBox: {
    display: "flex",
    gap: "12px"
  },
  stat: {
    backgroundColor: "white",
    padding: "10px 16px",
    borderRadius: "8px",
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  },
  statNumber: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#3b82f6"
  },
  statLabel: {
    fontSize: "11px",
    color: "#6b7280",
    marginTop: "4px"
  },
  progressContainer: {
    backgroundColor: "white",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  },
  progressLabel: {
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "8px",
    color: "#111827"
  },
  progressBarOuter: {
    width: "100%",
    height: "8px",
    backgroundColor: "#e5e7eb",
    borderRadius: "4px",
    overflow: "hidden",
    marginBottom: "6px"
  },
  progressBarInner: {
    height: "100%",
    backgroundColor: "#10b981",
    transition: "width 0.3s"
  },
  progressText: {
    fontSize: "12px",
    color: "#6b7280"
  },
  roadmapTimeline: {
    position: "relative"
  },
  roadmapItem: {
    marginBottom: "14px",
    transition: "opacity 0.2s"
  },
  timelineConnector: {
    position: "absolute",
    left: "28px",
    top: "52px",
    width: "2px",
    height: "52px",
    backgroundColor: "#e5e7eb"
  },
  skillCard: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  },
  skillCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px"
  },
  skillCardTitleArea: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start"
  },
  skillNumber: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: "bold",
    fontSize: "16px",
    flexShrink: 0
  },
  skillCardTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    margin: "0 0 4px 0",
    color: "#111827"
  },
  skillCardMeta: {
    fontSize: "12px",
    color: "#6b7280",
    margin: "0"
  },
  completeBtn: {
    padding: "6px 14px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "500",
    transition: "background-color 0.2s"
  },
  expandBtn: {
    width: "100%",
    padding: "8px",
    backgroundColor: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "8px"
  },
  resourcesContainer: {
    display: "grid",
    gap: "10px",
    paddingTop: "8px",
    borderTop: "1px solid #e5e7eb"
  },
  resourceItem: {
    backgroundColor: "#f9fafb",
    padding: "10px",
    borderRadius: "6px",
    borderLeft: "3px solid #3b82f6"
  },
  resourceType: {
    display: "inline-block",
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    padding: "2px 8px",
    borderRadius: "3px",
    fontSize: "11px",
    fontWeight: "600",
    marginBottom: "4px"
  },
  resourceTitle: {
    fontSize: "13px",
    fontWeight: "500",
    margin: "4px 0",
    color: "#111827"
  },
  resourcePlatform: {
    fontSize: "12px",
    color: "#6b7280",
    margin: "4px 0"
  },
  resourceLink: {
    display: "inline-block",
    marginTop: "6px",
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "12px"
  },
  noResources: {
    fontSize: "13px",
    color: "#6b7280",
    margin: "0"
  },
  actionButtons: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
    marginBottom: "20px"
  },
  downloadBtn: {
    flex: 1,
    padding: "10px 20px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500"
  },
  shareBtn: {
    flex: 1,
    padding: "10px 20px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500"
  },
  tipsSection: {
    backgroundColor: "white",
    padding: "16px",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  },
  tipsTitle: {
    fontSize: "15px",
    fontWeight: "bold",
    marginTop: "0",
    color: "#111827"
  },
  tipsList: {
    margin: "0",
    paddingLeft: "18px",
    color: "#374151",
    lineHeight: "1.7"
  },
  emptyContainer: {
    textAlign: "center",
    padding: "32px",
    backgroundColor: "#f3f4f6",
    borderRadius: "12px"
  }
};
