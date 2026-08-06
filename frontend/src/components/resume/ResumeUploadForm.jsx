"use client";

import React, { useState, useRef } from "react";
import { getRoles, logInteraction, uploadResume } from "../../utils/api.js";

function skillName(item) {
  if (item && typeof item === "object") return item.skill || "";
  return item == null ? "" : String(item);
}

export default function ResumeUploadForm({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(null);
  const [extractedSkills, setExtractedSkills] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    // Validate file type
    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setFile(selectedFile);
    setError("");
    setSuccess("");
    setPreview(selectedFile.name);

    // Create preview of file name and size
    setPreview({
      name: selectedFile.name,
      size: (selectedFile.size / 1024).toFixed(2) + " KB"
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileData = e.target.result;

          const uploadResponse = await uploadResume({
            fileData,
            fileName: file.name
          });

          const availableRoles = await getRoles().catch(() => ({}));
          const roleRecommendations = Array.isArray(availableRoles.recommendations)
            ? availableRoles.recommendations
            : Object.keys(availableRoles).slice(0, 4).map((role) => ({ role }));

          setExtractedSkills(uploadResponse.skills || []);
          setRecommendations(roleRecommendations);
          setProfileData({
            fileName: file.name,
            uploadTime: new Date().toLocaleString(),
            profileId: uploadResponse.profileId || uploadResponse.resumeProfileId || "",
            summary: uploadResponse.message || "Resume parsed and skills stored successfully."
          });

          await logInteraction({
            resumeProfileId: uploadResponse.profileId || uploadResponse.resumeProfileId || undefined,
            interactionType: "resume_upload",
            actionDetails: {
              fileName: file.name,
              extractedSkillCount: (uploadResponse.skills || []).length
            }
          }).catch(() => {});

          setSuccess("Resume uploaded and analyzed successfully!");

          // Call onUploadSuccess after a brief delay
          setTimeout(() => {
            if (onUploadSuccess) {
              onUploadSuccess({
                student_skills: uploadResponse.skills || [],
                resumeProfileId: uploadResponse.profileId || uploadResponse.resumeProfileId || "",
                resume_name: file.name,
                upload_time: new Date().toISOString(),
                analysis_summary: uploadResponse.message || "",
                recommendedRoles: roleRecommendations
              });
            }
          }, 1500);
          setUploading(false);
        } catch (err) {
          setError(err.message || "Failed to analyze resume");
          setUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message || "Failed to upload resume");
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setError("");
    setSuccess("");
    setExtractedSkills([]);
    setProfileData(null);
    setRecommendations([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section
      style={{
        maxWidth: 800,
        margin: "clamp(24px, 5vw, 48px) auto",
        padding: "var(--space-6) clamp(16px, 4vw, 24px)",
        color: "var(--text-primary)"
      }}
    >
      <h2
        style={{
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 8,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}
      >
        Upload Your Resume
      </h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: 20, fontSize: 15 }}>
        Upload your resume in PDF format. We'll analyze it to extract your skills and provide personalized job matches.
      </p>

      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: "2px dashed rgba(99, 102, 241, 0.4)",
          borderRadius: 16,
          padding: "clamp(20px, 4vw, 32px)",
          textAlign: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          background: "rgba(99, 102, 241, 0.05)",
          transition: "all 0.3s ease",
          opacity: uploading ? 0.6 : 1
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ margin: "0 auto", color: "rgba(99, 102, 241, 0.7)" }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {file ? file.name : "Drop your PDF here or click to select"}
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          Maximum file size: 5MB | Format: PDF only
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
        style={{ display: "none" }}
      />

      {/* File Preview */}
      {preview && !profileData && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "rgba(99, 102, 241, 0.1)",
            borderRadius: 12,
            border: "1px solid rgba(99, 102, 241, 0.3)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{preview.name}</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{preview.size}</p>
            </div>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(99, 102, 241, 0.7)"
              strokeWidth="2"
            >
              <path d="M12 2v20M2 12h20"></path>
            </svg>
          </div>
        </div>
      )}

      {/* Extracted Skills Display */}
      {extractedSkills.length > 0 && (
        <div
          style={{
            marginTop: 24,
            padding: 20,
            background: "rgba(34, 197, 94, 0.1)",
            borderRadius: 12,
            border: "1px solid rgba(34, 197, 94, 0.3)"
          }}
        >
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--green)" }}>
            Extracted Skills ({extractedSkills.length})
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {extractedSkills.map((skill, idx) => (
              <span
                key={idx}
                style={{
                  padding: "6px 12px",
                  background: "rgba(34, 197, 94, 0.2)",
                  border: "1px solid rgba(34, 197, 94, 0.5)",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--green)"
                }}
              >
                {skillName(skill)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Profile Data Summary */}
      {profileData && (
        <div
          style={{
            marginTop: 24,
            padding: 20,
            background: "rgba(34, 197, 94, 0.1)",
            borderRadius: 12,
            border: "1px solid rgba(34, 197, 94, 0.3)"
          }}
        >
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--green)" }}>
            ✓ Resume Analysis Complete
          </h4>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <p><strong>File:</strong> {profileData.fileName}</p>
            <p><strong>Uploaded:</strong> {profileData.uploadTime}</p>
            <p><strong>Skills Found:</strong> {extractedSkills.length}</p>
            {profileData.profileId && <p><strong>Profile ID:</strong> {profileData.profileId}</p>}
            {profileData.summary && <p><strong>Summary:</strong> {profileData.summary}</p>}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div
          style={{
            marginTop: 24,
            padding: 20,
            background: "rgba(99, 102, 241, 0.1)",
            borderRadius: 12,
            border: "1px solid rgba(99, 102, 241, 0.25)"
          }}
        >
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--accent-bright)" }}>
            Suggested workflow next steps
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {recommendations.slice(0, 4).map((item) => (
              <span
                key={item.role}
                style={{
                  padding: "6px 12px",
                  background: "rgba(124, 92, 252, 0.16)",
                  border: "1px solid rgba(124, 92, 252, 0.35)",
                  borderRadius: 20,
                  fontSize: 12,
                  color: "var(--text-primary)"
                }}
              >
                {item.role}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "rgba(255, 77, 109, 0.1)",
            border: "1px solid rgba(255, 77, 109, 0.35)",
            borderRadius: 12,
            color: "var(--red)",
            fontSize: 13
          }}
        >
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.35)",
            borderRadius: 12,
            color: "var(--green)",
            fontSize: 13
          }}
        >
          {success}
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          marginTop: 32,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "center"
        }}
      >
        {!profileData ? (
          <>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{
                padding: "12px 32px",
                background: file && !uploading ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(99, 102, 241, 0.4)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: file && !uploading ? "pointer" : "not-allowed",
                transition: "all 0.3s ease"
              }}
            >
              {uploading ? "Uploading & Analyzing..." : "Upload & Analyze"}
            </button>
            {file && !uploading && (
              <button
                onClick={handleReset}
                style={{
                  padding: "12px 32px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--text-secondary)",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
              >
                Cancel
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => {
                onUploadSuccess && onUploadSuccess({
                  student_skills: extractedSkills,
                  resumeProfileId: profileData?.profileId || "",
                  recommendedRoles: recommendations
                });
              }}
              style={{
                padding: "12px 32px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
            >
              Continue to Workflow
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: "12px 32px",
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--text-secondary)",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
            >
              Upload Another Resume
            </button>
          </>
        )}
      </div>
    </section>
  );
}
