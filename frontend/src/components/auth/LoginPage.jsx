"use client";

import React, { useEffect, useRef, useState } from "react";
import { getGoogleConfig, loginWithGoogle } from "../../utils/api.js";

const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";

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
    return new Promise((resolve, reject) => {
      if (typeof window.google?.accounts?.id !== "undefined") {
        return resolve();
      }
      const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Failed to load Google Sign-In script.")));
        return;
      }
      const script = document.createElement("script");
      script.src = GIS_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Sign-In script."));
      document.body.appendChild(script);
    });
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
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">CV</div>
          <span className="auth-brand">
            Career<span style={{ color: "var(--accent)" }}>Vector</span>
          </span>
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">
          Sign in to continue your skill analysis, job matching, and career roadmap.
        </p>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="auth-loading">Signing you in...</div>
        ) : (
          <div ref={googleButtonRef} className="auth-google" />
        )}

        {googleUnavailable && !loading && (
          <p className="auth-unavailable">
            Google Sign-In is not configured yet. Please contact the administrator.
          </p>
        )}
      </div>
    </section>
  );
}
