"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getStoredUser,
  fetchCurrentUser,
  logoutSession,
  getHistoryItem,
  historyItemToResult,
  generateRoadmap
} from "../../utils/api.js";

const AppContext = createContext(null);

export function SidebarProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  // Desktop: sidebar collapsed (narrow rail) vs expanded. Persisted locally.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mobile: overlay drawer open/closed.
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth + session shared across pages.
  const [user, setUser] = useState(null);
  const [authBooting, setAuthBooting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionResult, setSessionResult] = useState(null);

  // Hydrate user from localStorage after mount (SSR has no localStorage).
  useEffect(() => {
    if (typeof window !== "undefined") setUser(getStoredUser());
  }, []);

  // Hydrate the collapsed preference once, then keep it in sync.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSidebarCollapsed(localStorage.getItem("cv-sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("cv-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Accept a one-time login token delivered from the extension (?token=...).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return;

    let cancelled = false;
    setAuthBooting(true);

    fetchCurrentUser(token)
      .then((userData) => {
        if (cancelled) return;
        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
      })
      .catch((err) => console.warn("Ignoring invalid token:", err.message))
      .finally(() => {
        if (cancelled) return;
        const clean = new URL(window.location.href);
        clean.searchParams.delete("token");
        window.history.replaceState({}, "", clean.pathname + clean.search);
        setAuthBooting(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Validate the cached session once on boot; a 401 clears it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = getStoredUser();
    if (!cached || authBooting) return;

    let cancelled = false;
    fetchCurrentUser()
      .then((fresh) => {
        if (!cancelled) setUser(fresh);
      })
      .catch((err) => {
        if (cancelled || err.status !== 401) return;
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setUser(null);
        setSessionResult(null);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authBooting]);

  // Keep session in sync with the browser extension (cv-auth events).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAuth = (event) => {
      const detail = (event && event.detail) || {};
      if (detail.type === "logout") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setUser(null);
        setSessionResult(null);
        if (window.location.pathname !== "/login") router.push("/login");
      } else if (detail.type === "login") {
        if (detail.token) localStorage.setItem("authToken", detail.token);
        if (detail.user) {
          localStorage.setItem("user", JSON.stringify(detail.user));
          setUser(detail.user);
        } else {
          setUser(getStoredUser());
        }
      }
    };
    window.addEventListener("cv-auth", onAuth);
    return () => window.removeEventListener("cv-auth", onAuth);
  }, [router]);

  const navigate = useCallback(
    (path) => {
      setMobileOpen(false);
      if (path === window.location.pathname + window.location.search) return;
      router.push(path);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router]
  );

  const toggleCollapse = useCallback(() => setSidebarCollapsed((v) => !v), []);

  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);

  const handleLogout = useCallback(() => {
    logoutSession().catch(() => {});
    window.dispatchEvent(new CustomEvent("cv-auth", { detail: { type: "logout" } }));
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    setSessionResult(null);
    navigate("/login");
  }, [navigate]);

  const handleReset = useCallback(() => {
    setSessionResult(null);
    navigate("/");
  }, [navigate]);

  const handleLogoClick = useCallback(() => {
    setSessionResult(null);
    navigate("/");
  }, [navigate]);

  const handleResult = useCallback(
    (data) => {
      setSessionResult(data);
      if (data.historyId) navigate(`/dashboard?analysisId=${data.historyId}`);
      else window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [navigate]
  );

  const handleOpenAnalysis = useCallback(
    async (analysisId) => {
      setLoading(true);
      try {
        const item = await getHistoryItem(analysisId);
        const currentUserId = user?.id || user?._id || "";
        if (item.userId && currentUserId && item.userId !== currentUserId) {
          throw new Error("This report belongs to another student profile.");
        }
        const result = historyItemToResult(item);
        const roadmapData = await generateRoadmap({
          userSkills: result.student_skills || [],
          jobSkills: result.matched_skills || [],
          targetRole: result.target_role || "",
          jobRequirements: result.missing_skills
            ? result.missing_skills.map((i) => (typeof i === "string" ? i : i.skill))
            : []
        });
        const resultWithRoadmap = {
          ...result,
          roadmap: roadmapData.roadmap || [],
          learningPath: (roadmapData.learningPath || roadmapData.roadmap || []).map((i) => ({
            ...i,
            start_week: i.start_week || i.startWeek
          })),
          skillGaps: roadmapData.skillGaps || [],
          estimatedTime: roadmapData.estimatedTime || "",
          source: "analysis-with-roadmap",
          historyId: result.historyId || analysisId
        };
        setSessionResult(resultWithRoadmap);
        navigate(`/dashboard?analysisId=${analysisId}`);
      } catch (error) {
        console.error("Failed to open analysis:", error);
        navigate(`/dashboard?analysisId=${analysisId}`);
      } finally {
        setLoading(false);
      }
    },
    [user, navigate]
  );

  const value = {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleCollapse,
    mobileOpen,
    setMobileOpen,
    toggleMobile,
    openMobile: () => setMobileOpen(true),
    closeMobile: () => setMobileOpen(false),
    user,
    setUser,
    sessionResult,
    setSessionResult,
    loading,
    setLoading,
    authBooting,
    navigate,
    handleLogout,
    handleReset,
    handleLogoClick,
    handleResult,
    handleOpenAnalysis,
    pathname
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <SidebarProvider>");
  return ctx;
}