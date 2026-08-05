"use client";

import { useApp } from "./SidebarProvider.jsx";
import LoginPage from "../auth/LoginPage.jsx";

export default function AuthScreen() {
  const { setUser, navigate } = useApp();

  const handleSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    window.dispatchEvent(
      new CustomEvent("cv-auth", {
        detail: {
          type: "login",
          token: localStorage.getItem("authToken"),
          user: loggedInUser
        }
      })
    );
    const redirectPath = new URLSearchParams(window.location.search).get("redirect");
    const target = redirectPath && redirectPath.startsWith("/") ? redirectPath : window.location.pathname;
    navigate(target === "/login" ? "/" : target);
  };

  return <LoginPage onLoginSuccess={handleSuccess} />;
}
