"use client";

import { useApp } from "../../components/layout/SidebarProvider.jsx";
import ProfilePage from "../../components/auth/ProfilePage.jsx";
import AuthRequired from "../../components/auth/AuthRequired.jsx";

export default function ProfileRoute() {
  const { user, navigate } = useApp();

  if (!user) {
    return <AuthRequired />;
  }

  return <ProfilePage user={user} onNavigate={navigate} />;
}