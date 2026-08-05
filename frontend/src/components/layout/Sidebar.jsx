"use client";

import { useEffect, useState } from "react";
import { useApp } from "./SidebarProvider.jsx";

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  analysis: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  recommend: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l2.35 4.76L20 8.5l-4 3.9.94 5.5L12 15.5l-4.94 2.4.94-5.5-4-3.9 5.65-.74Z" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
};

export default function Sidebar() {
  const { user, navigate, handleLogoClick, handleLogout, pathname } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tab, setTab] = useState(null);

  // Read the ?tab= param only after mount so SSR and client markup match on
  // the first render.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setTab(new URLSearchParams(window.location.search).get("tab"));
  }, [pathname]);

  const mainItems = [
    { label: "Dashboard", icon: icons.dashboard, path: "/dashboard", active: pathname === "/dashboard" && tab !== "history" },
    { label: "Skill Analysis", icon: icons.analysis, path: "/", active: pathname === "/" },
    { label: "Job History", icon: icons.history, path: "/dashboard?tab=history", active: pathname === "/dashboard" && tab === "history" },
    { label: "Recommendations", icon: icons.recommend, path: "/jobs", active: pathname === "/jobs" },
    { label: "Profile", icon: icons.profile, path: "/profile", active: pathname === "/profile" }
  ];

  const accountItems = [
    { label: "Settings", icon: icons.settings, path: "/settings", active: pathname === "/settings" }
  ];

  const handleNav = (path) => {
    setMobileOpen(false);
    navigate(path);
  };

  const handleLogo = () => {
    setMobileOpen(false);
    handleLogoClick();
  };

  const initial = (user?.name || "U").charAt(0).toUpperCase();

  const renderItem = (item) => (
    <button
      key={item.label}
      type="button"
      className={`cv-sidebar-item${item.active ? " active" : ""}`}
      onClick={() => handleNav(item.path)}
    >
      <span className="cv-sidebar-item-icon">{item.icon}</span>
      <span>{item.label}</span>
      {item.active && <span className="cv-sidebar-pulse" />}
    </button>
  );

  return (
    <>
      <button
        type="button"
        className="cv-sidebar-hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
      >
        ☰
      </button>

      <div
        className={`cv-sidebar-backdrop${mobileOpen ? " open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside className={`cv-sidebar${mobileOpen ? " mobile-open" : ""}`} aria-label="Sidebar navigation">
        <div className="cv-sidebar-scanline" />

        <div
          className="cv-sidebar-logo"
          role="button"
          tabIndex={0}
          onClick={handleLogo}
          onKeyDown={(e) => e.key === "Enter" && handleLogo()}
        >
          <div className="cv-sidebar-logo-icon">⚡</div>
          <div className="cv-sidebar-logo-text">
            Career<em>Vector</em>
          </div>
        </div>

        <div className="cv-sidebar-user">
          <div className="cv-sidebar-avatar">
            {initial}
            <span className="cv-sidebar-avatar-dot" />
          </div>
          <div className="cv-sidebar-user-meta">
            <span className="cv-sidebar-user-name">{user?.name || "Not signed in"}</span>
            {user?.email && <span className="cv-sidebar-user-email">{user.email}</span>}
          </div>
        </div>

        <nav className="cv-sidebar-nav" aria-label="Main navigation">
          <div className="cv-sidebar-label">Main</div>
          {mainItems.map(renderItem)}
          <div className="cv-sidebar-label">Account</div>
          {accountItems.map(renderItem)}
        </nav>

        <div className="cv-sidebar-footer">
          <button type="button" className="cv-sidebar-signout" onClick={handleLogout}>
            {icons.logout}
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
