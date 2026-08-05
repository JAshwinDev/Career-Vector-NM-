"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../../components/layout/SidebarProvider.jsx";
import LoginPage from "../../components/auth/LoginPage.jsx";

export default function LoginRoute() {
  const { setUser, navigate } = useApp();
  const router = useRouter();

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
    navigate(redirectPath && redirectPath.startsWith("/") ? redirectPath : "/");
  };

  return <LoginPage onLoginSuccess={handleSuccess} />;
}