"use client";

import React, { useEffect, useRef, useState } from "react";
import { getGoogleConfig, loginWithGoogle } from "../../utils/api.js";

const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    ),
    title: "AI Resume Analysis",
    desc: "Upload your resume and instantly see how you measure up against your target role."
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="0.8" fill="currentColor" />
      </svg>
    ),
    title: "Smart Job Matching",
    desc: "Get a match score for every opportunity so you apply where you actually fit."
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    ),
    title: "Personal Roadmap",
    desc: "A week-by-week learning plan to close your skill gaps and get hired faster."
  }
];

const floatingSkills = ["Python", "React", "SQL", "Data Viz", "AWS", "Figma", "Excel", "Node.js", "ML", "UI/UX"];

export default function LoginPage({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const googleButtonRef = useRef(null);
  const googleInitialized = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function setupGoogleSignIn() {
      try {
        const config = await getGoogleConfig();

        if (cancelled) return;

        if (!config.enabled || !config.clientId) {
          setGoogleUnavailable(true);
          return;
        }

        await loadGisScript();

        if (cancelled || typeof window.google?.accounts?.id === "undefined") {
          return;
        }

        if (googleInitialized.current) return;
        googleInitialized.current = true;

        window.google.accounts.id.initialize({
          client_id: config.clientId,
          auto_select: false,
          callback: handleGoogleCredential
        });

        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: "outline",
            size: "large",
            width: 320,
            text: "continue_with",
            shape: "rectangular"
          });
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Google Sign-In setup failed:", err.message);
        setGoogleUnavailable(true);
      }
    }

    setupGoogleSignIn();

    return () => {
      cancelled = true;
    };
  }, []);

  function loadGisScript() {
    if (typeof window.google?.accounts?.id !== "undefined") {
      return Promise.resolve();
    }

    if (window.__gisScriptPromise) {
      return window.__gisScriptPromise;
    }

    window.__gisScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);

      if (existing && (existing.complete || existing.readyState === "complete")) {
        return pollForGis(resolve, reject);
      }

      const script = existing || document.createElement("script");
      if (!existing) {
        script.src = GIS_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
      script.onload = () => pollForGis(resolve, reject);
      script.onerror = () => reject(new Error("Failed to load Google Sign-In script."));
    });

    return window.__gisScriptPromise;
  }

  async function retryGoogleSignIn() {
    setError("");
    try {
      const config = await getGoogleConfig();
      if (!config.enabled || !config.clientId) {
        setError("Google Sign-In is not configured on the server yet.");
        return;
      }
      await loadGisScript();
      if (typeof window.google?.accounts?.id === "undefined") {
        setError("Google Sign-In script did not load. Check your connection and retry.");
        return;
      }
      window.google.accounts.id.initialize({
        client_id: config.clientId,
        auto_select: false,
        callback: handleGoogleCredential
      });
      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "rectangular"
        });
        setGoogleUnavailable(false);
      }
    } catch (err) {
      console.warn("Google Sign-In retry failed:", err.message);
      setError(err.message || "Could not load Google Sign-In. Please try again.");
    }
  }

  function pollForGis(resolve, reject) {
    const start = Date.now();
    const poll = () => {
      if (typeof window.google?.accounts?.id !== "undefined") {
        return resolve();
      }
      if (Date.now() - start > 8000) {
        return reject(new Error("Google Sign-In script did not initialize in time."));
      }
      setTimeout(poll, 50);
    };
    poll();
  }

  async function handleGoogleCredential(response) {
    if (!response || !response.credential) {
      setError("Google Sign-In returned no credential. Please try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await loginWithGoogle({ idToken: response.credential });

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLoginSuccess?.(data.user);
    } catch (err) {
      setError(err.message || "Google login failed. Check the backend is running and the client ID matches.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-screen">
      <div className="auth-shell">
        {/* Left showcase panel */}
        <aside className="auth-showcase">
          <div className="auth-showcase-glow" aria-hidden="true" />

          <div className="auth-logo">
            <div className="auth-logo-mark">CV</div>
            <span className="auth-brand">
              Career<span style={{ color: "var(--accent)" }}>Vector</span>
            </span>
          </div>

          <div className="auth-showcase-copy">
            <span className="auth-kicker">For students & job seekers</span>
            <h1 className="auth-showcase-title">
              Your career path,
              <br />
              <span className="auth-showcase-accent">mapped out.</span>
            </h1>
            <p className="auth-showcase-sub">
              Go from "where do I start?" to a clear, personalized plan — resume analysis,
              skill gap detection, and job matching powered by AI.
            </p>
          </div>

          <div className="auth-features">
            {features.map((feature) => (
              <div key={feature.title} className="auth-feature">
                <span className="auth-feature-icon">{feature.icon}</span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-showcase-footer">
            <div className="auth-stat">
              <strong>200+</strong>
              <span>Role profiles</span>
            </div>
            <div className="auth-stat">
              <strong>AI</strong>
              <span>Match scoring</span>
            </div>
            <div className="auth-stat">
              <strong>100%</strong>
              <span>Free for students</span>
            </div>
          </div>
        </aside>

        {/* Right login panel */}
        <div className="auth-panel">
          <div className="auth-card">
            <div className="auth-card-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h1 className="auth-title">Welcome back!</h1>
            <p className="auth-subtitle">
              Sign in to continue your skill analysis, job matching, and career roadmap.
            </p>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            {loading ? (
              <div className="auth-loading">
                <span className="auth-spinner" aria-hidden="true" />
                Signing you in...
              </div>
            ) : (
              <div className="auth-google-wrap">
                <div ref={googleButtonRef} className="auth-google" />
                <div className="auth-google-divider">
                  <span>or</span>
                </div>
                <p className="auth-trust">
                  Your career data stays private and is never shared.
                </p>
              </div>
            )}

            {googleUnavailable && !loading && (
              <button
                type="button"
                className="auth-google-fallback"
                onClick={retryGoogleSignIn}
              >
                <span className="auth-google-fallback-icon">G</span>
                Continue with Google
              </button>
            )}

            <div className="auth-chips" aria-hidden="true">
              {floatingSkills.map((skill, idx) => (
                <span key={skill} className="auth-chip" style={{ "--chip-i": idx }}>{skill}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
