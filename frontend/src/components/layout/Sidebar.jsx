"use client";

import { useEffect, useState } from "react";
import { useApp } from "./SidebarProvider.jsx";
import { useIsMobile } from "../../hooks/useMediaQuery.js";

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true
};

const icons = {
  menu: (
    <svg {...svgProps}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  ),
  close: (
    <svg {...svgProps}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  dashboard: (
    <svg {...svgProps}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  analysis: (
    <svg {...svgProps}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="m7 14 4-4 4 4 5-5" />
    </svg>
  ),
  history: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  recommend: (
    <svg {...svgProps}>
      <path d="m12 3 2.36 4.79 5.27.77-3.81 3.71.9 5.25L12 15.1l-4.72 2.42.9-5.25-3.81-3.71 5.27-.77Z" />
    </svg>
  ),
  profile: (
    <svg {...svgProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  settings: (
    <svg {...svgProps}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  logout: (
    <svg {...svgProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
};

export default function Sidebar() {
  const {
    user,
    navigate,
    handleLogoClick,
    handleLogout,
    pathname,
    sidebarCollapsed,
    toggleCollapse,
    mobileOpen,
    openMobile,
    closeMobile
  } = useApp();

  const isMobile = useIsMobile();

  // Read the ?tab= param only after mount so SSR and client markup match on
  // the first render.
  const [tab, setTab] = useState(null);
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
    { label: "Settings", icon: icons.settings, path: "/settings", active: pathname === "/settings" },
    { label: "Logout", icon: icons.logout, path: "logout", active: false }
  ];

  const handleToggle = () => {
    if (isMobile) {
      if (mobileOpen) closeMobile();
      else openMobile();
    } else {
      toggleCollapse();
    }
  };

  const handleNav = (path) => {
    if (path === "logout") {
      handleLogout();
      return;
    }
    closeMobile();
    navigate(path);
  };

  const handleLogo = () => {
    closeMobile();
    handleLogoClick();
  };

  const renderItem = (item) => (
    <button
      key={item.label}
      type="button"
      className={`cv-sidebar-item${item.active ? " active" : ""}`}
      data-tooltip={item.label}
      onClick={() => handleNav(item.path)}
      aria-current={item.active ? "page" : undefined}
    >
      <span className="cv-sidebar-item-icon">{item.icon}</span>
      <span className="cv-sidebar-item-label">{item.label}</span>
    </button>
  );

  const initial = (user?.name || "U").charAt(0).toUpperCase();
  const avatarContent = user?.profilePicture ? (
    <img src={user.profilePicture} alt="" />
  ) : (
    initial
  );

  return (
    <>
      <button
        type="button"
        className="cv-mobile-toggle"
        onClick={openMobile}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
      >
        {icons.menu}
      </button>

      <div
        className={`cv-sidebar-backdrop${mobileOpen ? " open" : ""}`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      <aside
        className={`cv-sidebar${sidebarCollapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}
        aria-label="Sidebar navigation"
      >
        <div className="cv-sidebar-top">
          <button
            type="button"
            className="cv-toggle"
            onClick={handleToggle}
            aria-label={
              isMobile
                ? mobileOpen ? "Close navigation menu" : "Open navigation menu"
                : sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {isMobile && mobileOpen ? icons.close : icons.menu}
          </button>

          <div
            className="cv-brand"
            role="button"
            tabIndex={0}
            onClick={handleLogo}
            onKeyDown={(e) => e.key === "Enter" && handleLogo()}
          >
            <span className="cv-brand-mark">CV</span>
            <span className="cv-brand-text">
              Career<em>Vector</em>
            </span>
          </div>
        </div>

        <nav className="cv-sidebar-nav" aria-label="Main navigation">
          <span className="cv-sidebar-label">Main</span>
          {mainItems.map(renderItem)}
          <span className="cv-sidebar-label">Account</span>
          {accountItems.map(renderItem)}
        </nav>

        <div className="cv-sidebar-bottom">
          <div className="cv-user">
            <span className="cv-user-avatar">{avatarContent}</span>

            {user ? (
              <>
                <span className="cv-user-meta">
                  <span className="cv-user-name">{user.name || user.email}</span>
                  {user.email && <span className="cv-user-email">{user.email}</span>}
                </span>
                <button
                  type="button"
                  className="cv-user-logout"
                  onClick={handleLogout}
                  aria-label="Sign out"
                >
                  {icons.logout}
                </button>
              </>
            ) : (
              <>
                <span className="cv-user-login">Not signed in</span>
                <button
                  type="button"
                  className="cv-user-login-btn"
                  onClick={() => {
                    closeMobile();
                    navigate("/login");
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
