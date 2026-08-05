import "./globals.css";
import { SidebarProvider } from "../components/layout/SidebarProvider.jsx";
import AppShell from "../components/layout/AppShell.jsx";

export const metadata = {
  title: "CareerVector – Bridging the Employability Gap",
  description:
    "AI-powered career intelligence and job skill matching platform. Resume readiness, role fit, learning roadmaps, and honest peer benchmarks."
};

export const viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <AppShell>{children}</AppShell>
        </SidebarProvider>
      </body>
    </html>
  );
}
