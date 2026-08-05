"use client";

import { useEffect, useState } from "react";

export default function LoadingOverlay() {
  const messages = [
    "Parsing your resume...",
    "Extracting skills with NLP...",
    "Running TF-IDF vectorization...",
    "Computing cosine similarity...",
    "Building your roadmap..."
  ];
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setMsgIdx((index) => (index + 1) % messages.length), 1200);
    return () => clearInterval(iv);
  }, [messages.length]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      background: "rgba(250, 249, 246, 0.92)",
      backdropFilter: "blur(12px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 24
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: "3px solid var(--border)",
        borderTopColor: "var(--accent)",
        animation: "spin 0.8s linear infinite"
      }} />
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--accent)" }}>
        {messages[msgIdx]}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: item === msgIdx % 5 ? "var(--accent)" : "var(--border)",
            transition: "background 0.3s"
          }} />
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}