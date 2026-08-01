import React, { useState } from "react";

export default function LoginPage({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isRegister ? "/auth/register" : "/auth/login";
    const payload = isRegister ? { email, password, name } : { email, password };

    try {
      const response = await fetch("http://localhost:5000" + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLoginSuccess?.(data.user);
    } catch (err) {
      setError(err.message || "Failed to authenticate. Start the backend and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Login failed.");
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLoginSuccess?.(data.user);
    } catch (err) {
      setError(err.message || "Login failed. Start the backend and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section container" style={{ minHeight: "100vh", display: "grid", alignItems: "center" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, 0.9fr)",
        gap: "4rem",
        alignItems: "center"
      }}>
        <div>
          <div style={{
            fontFamily: "var(--font-body)",
            fontSize: "1rem",
            color: "var(--primary)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "1.5rem",
            fontWeight: 700
          }}>
            [ Student Profile ]
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3rem, 7vw, 6rem)",
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
            marginBottom: "2rem",
            fontWeight: 900
          }}>
            Log in.<br />
            Measure readiness.<br />
            Compare clearly.
          </h1>
          <p style={{ fontSize: "1.25rem", maxWidth: 640, fontWeight: 500 }}>
            Save resume analyses, skill checks, job matches, and peer benchmarks under one student profile.
          </p>
        </div>

        <div className="brutalist-card" style={{ marginBottom: 0 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: "var(--radius-sm)",
            background: "var(--accent)",
            border: "1px solid var(--border)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "2rem",
            marginBottom: "2rem"
          }}>
            CV
          </div>
          <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{isRegister ? "Create Account" : "Welcome Back"}</h2>
          <p style={{ fontSize: "1.05rem", fontWeight: 500, marginBottom: "1.5rem" }}>
            {isRegister ? "Sign up to track your career journey." : "Log in to your student profile."}
          </p>

          {error && (
            <div style={{
              background: "rgba(184, 74, 58, 0.1)",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
              padding: "1rem",
              borderRadius: "var(--radius-sm)",
              marginBottom: "1.5rem",
              fontWeight: 700
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {isRegister && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: "100%", padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", 
                  background: "var(--bg)", color: "var(--primary)", fontFamily: "var(--font-body)", fontSize: "1rem"
                }}
              />
            )}
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%", padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", 
                background: "var(--bg)", color: "var(--primary)", fontFamily: "var(--font-body)", fontSize: "1rem"
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%", padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", 
                background: "var(--bg)", color: "var(--primary)", fontFamily: "var(--font-body)", fontSize: "1rem"
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", fontSize: "1.1rem", marginTop: "0.5rem" }}
            >
              {loading ? (isRegister ? "Signing up..." : "Logging in...") : (isRegister ? "Sign Up" : "Log In")}
            </button>
          </form>

          <div style={{ textAlign: "center", margin: "1.5rem 0", color: "var(--text-soft)" }}>
            - OR -
          </div>

          <button
            type="button"
            className="btn-brutal-outline"
            onClick={handleDemoLogin}
            disabled={loading}
            style={{ width: "100%", fontSize: "1.1rem" }}
          >
            {loading ? "Please wait..." : "Continue as Demo Student"}
          </button>
          
          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <button 
              type="button" 
              onClick={() => setIsRegister(!isRegister)}
              style={{ 
                background: "none", border: "none", color: "var(--text-soft)", 
                textDecoration: "underline", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "1rem" 
              }}
            >
              {isRegister ? "Already have an account? Log in" : "Need an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
