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
  const [googleWidth, setGoogleWidth] = useState(320);
  const googleButtonRef = useRef(null);
  const googleInitialized = useRef(false);

  // Keep the rendered Google button from overflowing narrow viewports.
  useEffect(() => {
    const computeGoogleWidth = () => {
      if (typeof window === "undefined") return 320;
      return Math.min(320, Math.max(200, window.innerWidth - 96));
    };
    const update = () => setGoogleWidth(computeGoogleWidth());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Re-render the Google button whenever its computed width changes.
  useEffect(() => {
    if (!googleInitialized.current || !googleButtonRef.current) return;
    if (typeof window.google?.accounts?.id === "undefined") return;
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      width: googleWidth,
      text: "continue_with",
      shape: "rectangular"
    });
  }, [googleWidth]);

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
            width: googleWidth,
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
          width: googleWidth,
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
    <section className="grid min-h-screen place-items-center bg-[radial-gradient(60%_50%_at_0%_0%,rgba(255,106,61,0.08),transparent_70%),radial-gradient(50%_45%_at_100%_100%,rgba(46,139,122,0.08),transparent_70%),var(--bg)] p-6">
      <div className="grid w-full min-h-[640px] max-w-[1080px] grid-cols-[1.15fr_1fr] overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] max-[860px]:min-h-0 max-[860px]:max-w-[480px] max-[860px]:grid-cols-1">
        {/* Left showcase panel */}
        <aside className="relative flex flex-col gap-8 overflow-hidden bg-[radial-gradient(90%_70%_at_85%_-10%,rgba(255,106,61,0.22),transparent_60%),radial-gradient(70%_60%_at_-10%_110%,rgba(46,139,122,0.18),transparent_60%),linear-gradient(160deg,#2A2824,#1E1C19)] px-11 pb-9 pt-11 text-[#F5F3EE] max-[860px]:gap-6 max-[860px]:px-7 max-[860px]:py-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_30%_at_70%_15%,rgba(255,138,92,0.14),transparent_70%),radial-gradient(35%_30%_at_20%_85%,rgba(46,139,122,0.14),transparent_70%)]" aria-hidden="true" />

          <div className="relative z-[1] flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent)] font-display text-lg font-black text-white">CV</div>
            <span className="font-display text-2xl font-bold tracking-tight text-[#F5F3EE]">
              Career<span style={{ color: "var(--accent)" }}>Vector</span>
            </span>
          </div>

          <div className="relative z-[1]">
            <span className="mb-[14px] inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-soft)] before:h-[2px] before:w-[26px] before:rounded-[2px] before:bg-[var(--accent)] before:content-['']">For students &amp; job seekers</span>
            <h1 className="mb-4 font-display text-[clamp(2rem,3.4vw,2.75rem)] font-extrabold leading-[1.08] tracking-[-0.02em]">
              Your career path,
              <br />
              <span className="bg-[linear-gradient(120deg,var(--accent-soft),var(--accent-bright))] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]">mapped out.</span>
            </h1>
            <p className="m-0 max-w-[400px] text-[16px] font-normal leading-[1.6] text-[rgba(245,243,238,0.72)]">
              Go from &quot;where do I start?&quot; to a clear, personalized plan — resume analysis,
              skill gap detection, and job matching powered by AI.
            </p>
          </div>

          <div className="relative z-[1] flex flex-col gap-[14px] max-[860px]:hidden">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-[14px] rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] p-[14px_16px] backdrop-blur-[8px] transition-[transform,background,border-color] duration-[0.2s] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-[2px] hover:border-[rgba(255,138,92,0.4)] hover:bg-[rgba(255,255,255,0.09)]">
                <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] bg-[rgba(255,106,61,0.14)] text-[var(--accent-soft)] [&_svg]:h-[22px] [&_svg]:w-[22px]">{feature.icon}</span>
                <div>
                  <h3 className="m-0 mb-1 font-display text-[0.98rem] font-bold text-[#F5F3EE]">{feature.title}</h3>
                  <p className="m-0 text-[0.85rem] leading-[1.5] text-[rgba(245,243,238,0.62)]">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative z-[1] mt-auto grid grid-cols-3 gap-3 pt-2 max-[860px]:hidden">
            <div className="flex flex-col gap-[2px]">
              <strong className="font-display text-[1.35rem] font-extrabold text-[#F5F3EE]">200+</strong>
              <span className="text-[0.78rem] font-medium text-[rgba(245,243,238,0.55)]">Role profiles</span>
            </div>
            <div className="flex flex-col gap-[2px]">
              <strong className="font-display text-[1.35rem] font-extrabold text-[#F5F3EE]">AI</strong>
              <span className="text-[0.78rem] font-medium text-[rgba(245,243,238,0.55)]">Match scoring</span>
            </div>
            <div className="flex flex-col gap-[2px]">
              <strong className="font-display text-[1.35rem] font-extrabold text-[#F5F3EE]">100%</strong>
              <span className="text-[0.78rem] font-medium text-[rgba(245,243,238,0.55)]">Free for students</span>
            </div>
          </div>
        </aside>

        {/* Right login panel */}
        <div className="grid place-items-center bg-[var(--surface)] p-[40px_32px] max-[860px]:p-[36px_24px]">
          <div className="flex w-full max-w-[400px] flex-col items-center gap-4 text-center max-[480px]:p-[32px_24px]">
            <div className="grid h-[52px] w-[52px] place-items-center rounded-[16px] border border-[rgba(255,106,61,0.25)] bg-[var(--accent-tint)] text-[var(--accent)] [&_svg]:h-6 [&_svg]:w-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h1 className="mt-1 text-[length:var(--text-heading)] font-bold leading-[1.15]">Welcome back!</h1>
            <p className="m-0 max-w-[320px] text-[16px] font-medium text-[var(--text-soft)]">
              Sign in to continue your skill analysis, job matching, and career roadmap.
            </p>

            {error && (
              <div className="w-full rounded-[var(--radius-sm)] border border-[rgba(214,69,80,0.35)] bg-[rgba(214,69,80,0.08)] p-[0.75rem_1rem] text-left text-[0.875rem] font-semibold text-[var(--red)]">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-[10px] p-4 text-[0.9375rem] font-semibold text-[var(--text-soft)]">
                <span className="h-[18px] w-[18px] rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] [animation:spin_0.8s_linear_infinite]" aria-hidden="true" />
                Signing you in...
              </div>
            ) : (
              <div className="mt-2 flex w-full flex-col items-center gap-[14px]">
                <div ref={googleButtonRef} className="grid w-full place-items-center" />
                <div className="flex w-full items-center gap-3 text-[0.8rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)] before:h-px before:flex-1 before:bg-[var(--border)] before:content-[''] after:h-px after:flex-1 after:bg-[var(--border)] after:content-['']">
                  <span>or</span>
                </div>
                <p className="m-0 flex items-center justify-center gap-[6px] text-[0.8rem] font-medium text-[var(--text-muted)] before:h-2 before:w-2 before:rounded-full before:bg-[var(--success)] before:content-['']">
                  Your career data stays private and is never shared.
                </p>
              </div>
            )}

            {googleUnavailable && !loading && (
              <button
                type="button"
                className="flex w-full max-w-[320px] cursor-pointer items-center justify-center gap-[10px] rounded-[8px] border border-[var(--border-dark)] bg-[var(--surface)] p-[11px_16px] font-sans text-[0.9375rem] font-semibold text-[var(--primary)] transition-[background,border-color,box-shadow] duration-[0.15s] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:border-[var(--border-dark)] hover:bg-[var(--bg-soft)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                onClick={retryGoogleSignIn}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--bg)]">G</span>
                Continue with Google
              </button>
            )}

            <div className="mt-2 flex max-w-[340px] flex-wrap justify-center gap-2" aria-hidden="true">
              {floatingSkills.map((skill, idx) => (
                <span key={skill} className="rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-[5px] text-[0.78rem] font-semibold text-[var(--text-soft)] [animation:authFloat_6s_ease-in-out_infinite] [animation-delay:calc(var(--chip-i)*-0.6s)]" style={{ "--chip-i": idx }}>{skill}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
