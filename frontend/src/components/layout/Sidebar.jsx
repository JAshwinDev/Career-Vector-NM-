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
  width: 20,
  height: 20,
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
    { label: "Recommendations", icon: icons.recommend, path: "/jobs", active: pathname === "/jobs" }
  ];

  const handleToggle = () => {
    if (isMobile) {
      if (mobileOpen) closeMobile();
      else openMobile();
    } else {
      toggleCollapse();
    }
  };

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const handleNav = (path) => {
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
      className={[
        "group relative flex h-12 w-full cursor-pointer items-center gap-3 whitespace-nowrap rounded-[12px] border-none bg-transparent text-left font-body font-medium text-sm active:scale-[0.985]",
        "[transition:background_160ms_ease,color_160ms_ease,transform_160ms_ease]",
        sidebarCollapsed
          ? "justify-center px-[10px] max-md:justify-start max-md:px-3"
          : "px-[14px]",
        item.active
          ? "bg-[var(--accent-tint)] font-semibold text-[var(--accent)] hover:bg-[var(--accent-tint)] hover:text-[var(--accent)] before:absolute before:left-0 before:top-1/2 before:h-[22px] before:w-[3px] before:-translate-y-1/2 before:rounded-[0_3px_3px_0] before:bg-[var(--accent)] before:content-['']"
          : "text-[var(--text-soft)] hover:bg-[var(--hover-bg)] hover:text-[var(--primary)]",
        sidebarCollapsed &&
          "after:pointer-events-none after:absolute after:left-[calc(100%+12px)] after:top-1/2 after:z-[200] after:-translate-y-1/2 after:whitespace-nowrap after:rounded-[8px] after:bg-[var(--primary)] after:px-3 after:py-2 after:text-xs after:font-medium after:leading-none after:text-white after:shadow-[var(--shadow-md)] md:hover:after:content-[attr(data-tooltip)]"
      ]
        .filter(Boolean)
        .join(" ")}
      data-tooltip={item.label}
      onClick={() => handleNav(item.path)}
      aria-current={item.active ? "page" : undefined}
    >
      <span
        className={[
          "grid h-5 w-5 shrink-0 place-items-center [transition:color_160ms_ease]",
          item.active
            ? "text-[var(--accent)] group-hover:text-[var(--accent)]"
            : "text-[var(--text-muted)] group-hover:text-[var(--primary)]"
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {item.icon}
      </span>
      <span
        className={[
          "min-w-0 flex-1 overflow-hidden whitespace-nowrap text-ellipsis",
          "[transition:opacity_120ms_ease,max-width_250ms_ease]",
          sidebarCollapsed
            ? "max-w-0 opacity-0 max-md:max-w-[200px] max-md:opacity-100"
            : "max-w-[200px] opacity-100"
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {item.label}
      </span>
    </button>
  );

  const initial = (user?.name || "U").charAt(0).toUpperCase();
  const avatarContent = user?.profilePicture ? (
    <img src={user.profilePicture} alt="" className="h-full w-full object-cover" />
  ) : (
    initial
  );

  return (
    <>
      <button
        type="button"
        className="hidden max-md:fixed max-md:left-3 max-md:top-3 max-md:z-[90] max-md:grid max-md:h-[42px] max-md:w-[42px] max-md:cursor-pointer max-md:place-items-center max-md:rounded-[12px] max-md:border max-md:border-[var(--border)] max-md:bg-[var(--surface)] max-md:text-[var(--primary)] max-md:shadow-[var(--shadow-sm)]"
        onClick={openMobile}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
      >
        {icons.menu}
      </button>

      <div
        className={`fixed inset-0 z-[99] bg-[rgba(20,18,15,0.45)] opacity-0 invisible [transition:opacity_0.3s_ease,visibility_0s_linear_0.3s]${mobileOpen ? " opacity-100 visible [transition:opacity_0.3s_ease]" : ""}`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      <aside
        className={[
          "fixed inset-y-0 left-0 z-[100] flex h-screen flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--surface)]",
          "[transition:width_250ms_ease]",
          sidebarCollapsed ? "w-[var(--rail-w)]" : "w-[var(--sidebar-w)]",
          "max-md:w-[var(--sidebar-w)] max-md:-translate-x-full max-md:shadow-[var(--shadow-lg)] max-md:[transition:transform_0.3s_ease]",
          mobileOpen && "max-md:translate-x-0"
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Sidebar navigation"
      >
        <div className="flex h-[60px] shrink-0 items-center gap-[10px] px-3">
          <button
            type="button"
            className="grid h-[42px] w-[42px] shrink-0 cursor-pointer place-items-center rounded-[12px] border-none bg-transparent text-[var(--text-soft)] [transition:background_160ms_ease,color_160ms_ease,transform_160ms_ease] hover:bg-[var(--hover-bg)] hover:text-[var(--primary)] active:scale-[0.95]"
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
            className="flex min-w-0 cursor-pointer select-none items-center gap-3 overflow-hidden"
            role="button"
            tabIndex={0}
            onClick={handleLogo}
            onKeyDown={(e) => e.key === "Enter" && handleLogo()}
          >
            <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-[linear-gradient(135deg,var(--accent),var(--accent-bright))] font-display text-sm font-extrabold tracking-[0.02em] text-white shadow-[0_2px_8px_var(--accent-tint)]">
              CV
            </span>
            <span
              className={`whitespace-nowrap font-display text-base font-bold tracking-tight text-[var(--primary)]${sidebarCollapsed ? " hidden max-md:inline" : ""}`}
            >
              Career<em className="not-italic text-[var(--accent)]">Vector</em>
            </span>
          </div>
        </div>

        <nav
          className="flex flex-1 flex-col gap-[2px] overflow-x-hidden overflow-y-auto p-2 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--border)]"
          aria-label="Main navigation"
        >
          <span
            className={`shrink-0 whitespace-nowrap px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]${sidebarCollapsed ? " hidden max-md:block" : ""}`}
          >
            Main
          </span>
          {mainItems.map(renderItem)}
        </nav>

        <div className="shrink-0 border-t border-[var(--border)] p-3">
          <div
            className={`flex items-center gap-3 rounded-[12px] [transition:background_160ms_ease] hover:bg-[var(--hover-bg)]${sidebarCollapsed ? " justify-center px-0 py-2 max-md:justify-start max-md:p-2" : " p-[10px]"}`}
          >
            <span className="grid h-[38px] w-[38px] shrink-0 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-bright))] text-sm font-bold text-white">
              {avatarContent}
            </span>

            {user ? (
              <>
                <span
                  className={`flex min-w-0 flex-1 flex-col${sidebarCollapsed ? " hidden max-md:flex" : ""}`}
                >
                  <span className="overflow-hidden whitespace-nowrap text-[13px] font-semibold text-ellipsis text-[var(--primary)]">
                    {user.name || user.email}
                  </span>
                  {user.email && (
                    <span className="overflow-hidden whitespace-nowrap text-xs text-ellipsis text-[var(--text-muted)]">
                      {user.email}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className={`grid h-[34px] w-[34px] shrink-0 cursor-pointer place-items-center rounded-[8px] border-none bg-transparent text-[var(--text-muted)] [transition:background_160ms_ease,color_160ms_ease] hover:bg-[var(--bg-soft)] hover:text-[var(--danger)] [&_svg]:h-[18px] [&_svg]:w-[18px]${sidebarCollapsed ? " hidden max-md:flex" : ""}`}
                  onClick={() => setLogoutConfirmOpen(true)}
                  aria-label="Sign out"
                >
                  {icons.logout}
                </button>
              </>
            ) : (
              <>
                <span
                  className={`flex-1 text-[13px] font-medium text-[var(--text-soft)]${sidebarCollapsed ? " hidden max-md:flex" : ""}`}
                >
                  Not signed in
                </span>
                <button
                  type="button"
                  className={`cursor-pointer rounded-[8px] border-none bg-[var(--accent)] px-3 py-1.5 font-body text-xs font-semibold text-white [transition:background_160ms_ease] hover:bg-[var(--accent-bright)]${sidebarCollapsed ? " hidden max-md:flex" : ""}`}
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

      {logoutConfirmOpen && (
        <div
          className="fixed inset-0 z-[300] grid place-items-center bg-[rgba(20,18,15,0.6)] p-6 [animation:overlayFade_0.2s_ease]"
          onClick={() => setLogoutConfirmOpen(false)}
        >
          <div
            className="w-full max-w-[400px] rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)] [animation:modalPop_0.25s_cubic-bezier(0.2,0.8,0.3,1)]"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm logout"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 grid h-12 w-12 place-items-center rounded-[12px] bg-[var(--danger)] text-white [&_svg]:h-6 [&_svg]:w-6">
              {icons.logout}
            </div>
            <h3 className="m-0 mb-2 font-display text-[22px] font-bold text-[var(--primary)]">
              Log out?
            </h3>
            <p className="m-0 mb-6 text-[15px] font-medium leading-relaxed text-[var(--text-soft)]">
              Are you sure you want to log out of CareerVector? You can sign back in anytime.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="cursor-pointer rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-5 py-[11px] font-body text-[14px] font-semibold text-[var(--primary)] [transition:all_0.18s_ease] hover:bg-[var(--bg-soft)]"
                onClick={() => setLogoutConfirmOpen(false)}
              >
                No
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-[10px] border border-[var(--danger)] bg-[var(--danger)] px-5 py-[11px] font-body text-[14px] font-semibold text-white [transition:all_0.18s_ease] hover:brightness-110"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  handleLogout();
                }}
              >
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
